/**
 * Golden: import_songsterr `project_plan` — the multi-project song layout.
 *
 * A real song never fits one Circuit project (8 pattern slots per track), so
 * `whole_song` chunks the play order into projects. Since 2026-07-29 the
 * DEFAULT chop is content-driven and scene-chain-aware (a project spans up to
 * 4 scene steps x 8 patterns; `maxPlays` explicitly passed keeps the old pure
 * play budget); see scripts/verify-patterns.ts for the default-change goldens.
 * These pin the properties that matter and the two defects a 2026-07-17 review
 * found:
 *
 *  - a project boundary is a FOOT-SWITCH point, so a cut inside a repeated run is
 *    a live-performance failure. Back off to the run start when it is CHEAP; a
 *    project slot is scarcer than a tidy boundary, so decline an expensive one.
 *  - `starts_silent` must be real. It was dead code (always false) and it is
 *    load-bearing: a stored read decodes only pattern 1, so a chain that opens on
 *    a rest bar reads back as "empty" and looks like a failed write.
 *  - `next_step` must point at project_plan. It used to steer the agent to the
 *    lossy fuzz-merge workaround in the exact case that computed the plan.
 *
 * Network: none. Import integration uses synthetic local response fixtures.
 * Real-song goldens live in verify-project-plan-live.ts (explicit opt-in).
 *
 * Run:  npx tsx scripts/verify-project-plan.ts
 */
import assert from 'node:assert/strict';
import type { SongsterrPart } from '../packages/core/src/protocol-generic/patterns/songsterr.js';
import { planProjects } from '@mcp-midi-control/core/protocol-generic/patterns/songStructure.js';
import { executeImportSongsterr } from '@mcp-midi-control/core/protocol-generic/dispatcher/songsterr.js';

let fail = 0;
const ck = (l: string, ok: boolean, d?: string) => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${l}${ok || !d ? '' : ' :: ' + d}`); if (!ok) fail++; };
const secs = (labels: string[], silent: string[] = []) =>
  labels.map((n) => ({ name: n, voices: silent.includes(n) ? { kick: '.'.repeat(32) } : { kick: 'x'.repeat(32) } }));

// 1. phrase back-off: a CHEAP cut inside a run (<= maxBackoff) backs off so the run
//    stays whole in the next project.
{
  const order = ['A', 'A', 'B', 'B', 'B', 'B', 'C', 'C', 'C', 'D'];
  const p = planProjects(secs(['A', 'B', 'C', 'D']), order);
  const flat = p.projects.flatMap((x) => x.order);
  ck('cheap back-off keeps the run whole', p.projects[0].order.join('') === 'AABBBB' && p.projects[1].order.join('') === 'CCCD',
    JSON.stringify(p.projects.map((x) => x.summary)));
  ck('back-off preserves the full order', flat.join(',') === order.join(','), flat.join(','));
}
// 1b. an EXPENSIVE back-off is declined: a project slot is scarcer than a tidy
//     boundary, so a long run at the limit is cut rather than giving up 4 plays.
{
  const order = ['A', 'A', 'B', 'B', 'C', 'C', 'C', 'C', 'C', 'D'];
  const p = planProjects(secs(['A', 'B', 'C', 'D']), order);
  const flat = p.projects.flatMap((x) => x.order);
  ck('expensive back-off declined (cuts at the limit)', p.projects[0].order.length === 8, JSON.stringify(p.projects.map((x) => x.summary)));
  ck('declined back-off still preserves the order', flat.join(',') === order.join(','), flat.join(','));
}
// 2. a vamp longer than maxPlays cannot be helped: cut at the limit, no infinite loop.
{
  const order = Array(9).fill('A');
  const p = planProjects(secs(['A']), order);
  ck('A x9 cuts at the limit (8 + 1)', p.projects.map((x) => x.order.length).join(',') === '8,1', JSON.stringify(p.projects.map((x) => x.summary)));
}
// 3. no back-off when the cut is already at a pattern change.
{
  const order = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const p = planProjects(secs(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']), order);
  ck('clean boundary is not backed off', p.projects[0].order.length === 8, JSON.stringify(p.projects.map((x) => x.summary)));
}
// 4. starts_silent is now real (was always false).
{
  const p = planProjects(secs(['S', 'B'], ['S']), ['S', 'B', 'B']);
  ck('starts_silent true when the chain opens on a rest bar', p.projects[0].starts_silent === true, JSON.stringify(p.projects[0]));
  const q = planProjects(secs(['B', 'S'], ['S']), ['B', 'S', 'B']);
  ck('starts_silent false when it opens on content', q.projects[0].starts_silent === false);
}

// 5. Exercise the real importer with local response bodies, not a mocked plan.
// Ten different two-bar drum patterns cannot fit eight slots in one project.
const DRUMS: SongsterrPart = {
  tuningFlat: true,
  measures: Array.from({ length: 20 }, (_, i) => {
    const offset = Math.floor(i / 2);
    return { signature: [4, 4], voices: [{ beats: [
      ...(offset ? [{ notes: [], duration: [offset, 16] as [number, number] }] : []),
      { notes: [{ fret: 36 }], duration: [1, 16] },
      { notes: [], duration: [15 - offset, 16] },
    ] }] };
  }),
};
// Two 16-bar sections, with a two-bar shared silent tail after the intro.
// The synth sounds only in the intro; drums only in the second section.
const multipart = (melodic: boolean): SongsterrPart => ({
  ...(melodic ? { tuning: [60] } : { tuningFlat: true }),
  measures: Array.from({ length: 34 }, (_, i) => ({
    signature: [4, 4],
    ...(i === 0 || i === 18 ? { marker: { text: i === 0 ? 'Intro' : 'Verse' } } : {}),
    voices: [{ beats: [{
      notes: (melodic ? i < 16 : i >= 18) ? [{ fret: melodic ? 0 : 36, string: 0 }] : [],
      duration: [1, 1],
    }] }],
  })),
});
const meta = (songId: number, tracks: object[], popularTrackDrum: number) => ({
  songId, revisionId: 1, image: 'fixture', title: 'Synthetic project plan', artist: 'Test',
  tracks, popularTrackDrum,
});
const responses = new Map<string, unknown>([
  ['/api/meta/900001', meta(900001, [{ instrumentId: 1024, instrument: 'Drums', hash: 'd' }], 0)],
  ['/900001/1/fixture/0.json', DRUMS],
  ['/api/meta/900002', meta(900002, [
    { instrumentId: 81, instrument: 'Lead 1 (square)', hash: 's' },
    { instrumentId: 1024, instrument: 'Drums', hash: 'd' },
  ], 1)],
  ['/900002/1/fixture/0.json', multipart(true)],
  ['/900002/1/fixture/1.json', multipart(false)],
]);
const realFetch = globalThis.fetch;
const unexpected: string[] = [];
const requested = new Set<string>();
let metadataStatus = 200;
globalThis.fetch = async (input) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  const body = responses.get(url.pathname);
  const hosts = url.pathname.startsWith('/api/meta/')
    ? ['www.songsterr.com']
    : ['dqsljvtekg760.cloudfront.net', 'd3d3l6a6rcgkaf.cloudfront.net'];
  if (url.protocol !== 'https:' || !hosts.includes(url.hostname) || body === undefined) {
    unexpected.push(url.href);
    throw new Error(`Unexpected request in offline project-plan test: ${url.href}`);
  }
  requested.add(url.pathname);
  return new Response(JSON.stringify(body), {
    status: url.pathname.startsWith('/api/meta/') ? metadataStatus : 200,
    headers: { 'content-type': 'application/json' },
  });
};
try {
  const r = await executeImportSongsterr({ url: '900001', whole_song: true, fuzz: 0 });
  assert.ok(!('mode' in r) && r.arrangement?.project_plan, 'oversized song needs a project plan');
  const { arrangement: a } = r;
  const pp = a.project_plan!;
  assert.equal(a.sections.length, 10, 'fixture must exercise more than eight distinct slots');
  assert.ok(pp.projects.length > 1, 'fixture must span multiple projects');
  assert.deepEqual(pp.projects.flatMap((p) => p.order), a.order, 'all plays retained in the same order');
  for (const p of pp.projects) {
    assert.ok(p.patterns.length <= 8, 'each project fits the pattern slots');
    // A longer play order must be a sequence of at most four ascending scenes.
    let runs = 0, previous = -2;
    const slots = new Map<string, number>();
    for (const name of p.order) {
      if (!slots.has(name)) slots.set(name, slots.size);
      const slot = slots.get(name)!;
      if (slot !== previous + 1) runs++;
      previous = slot;
    }
    assert.ok(p.order.length <= 8 || runs <= 4, 'each project fits a chain or four scenes');
  }
  assert.match(r.next_step, /project_plan/, 'oversized-song guidance points to the computed plan');
  console.log('OK   offline import: ten patterns split into fitting projects without losing/reordering plays');

  const multi = await executeImportSongsterr({ url: '900002', whole_song: true, parts: 'all' });
  assert.ok(!('mode' in multi) && multi.song_plan, 'multipart import needs a shared song plan');
  const p = multi.song_plan;
  assert.equal(p.measures, 34);
  assert.equal(p.parts.length, 2);
  assert.deepEqual(p.boundaries, [1, 19]);
  assert.deepEqual(p.projects.map((x) => [x.from_measure, x.to_measure]), [[1, 16], [19, 34]]);
  assert.ok(p.projects.every((x) => x.bars === 16 && x.steps === 256 && x.patterns === 8));
  assert.ok(p.projects.every((x) => x.parts.length + x.silent_parts.length === 2));
  assert.deepEqual(p.projects.map((x) => x.parts.map((part) => part.partId)), [[0], [1]]);
  assert.equal(p.trims.length, 1);
  assert.match(p.trims[0], /tail m17-18/);
  assert.match(multi.next_step, /READ THIS PLAN TO THE USER BEFORE AUTHORING/);
  console.log('OK   offline multipart import: shared boundaries, silent-tail trim, occupancy and review guidance');

  // A service failure must remain an error in the production importer. The CI
  // fix changes the test data source, not the meaning of a 403 response.
  metadataStatus = 403;
  await assert.rejects(executeImportSongsterr({ url: '900001', whole_song: true }), /meta fetch failed \(403\)/);
  assert.deepEqual(unexpected, [], 'no unrecognised endpoint may be hidden by importer retries');
  assert.deepEqual([...requested].sort(), [...responses.keys()].sort(), 'all fixture parts were exercised');
  console.log('OK   HTTP 403 remains a surfaced import error; no real network requests');
} finally {
  globalThis.fetch = realFetch;
}

console.log(fail ? `\n${fail} FAILED` : '\nall offline project-plan checks pass');
process.exitCode = fail ? 1 : 0;

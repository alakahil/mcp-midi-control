/**
 * Live Songsterr project-plan goldens. Requires the external API/CDNs.
 * Kept outside npm test: upstream HTTP errors and revision changes must fail
 * this explicit integration check, not the offline platform/release suites.
 * Run: npm run test:songsterr:live (or the manual Songsterr live workflow).
 */
import { executeImportSongsterr } from '@mcp-midi-control/core/protocol-generic/dispatcher/songsterr.js';

let fail = 0;
const ck = (l: string, ok: boolean, d?: string) => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${l}${ok || !d ? '' : ' :: ' + d}`); if (!ok) fail++; };

// 5. every project still fits, on the real songs. "Fits" is the realizer's own
//    layout test: a plain chain (<=8 plays, one slot per play) OR a scene chain
//    (<=8 distinct patterns whose order compresses into <=4 contiguous
//    ascending scene steps), the shapes apply_pattern `arrangement` accepts.
const sceneRuns = (order: string[]): number => {
  const slot = new Map<string, number>();
  let runs = 0, last = -2;
  for (const l of order) {
    let s = slot.get(l);
    if (s === undefined) { s = slot.size; slot.set(l, s); }
    if (s !== last + 1) runs++;
    last = s;
  }
  return runs;
};
for (const [name, url] of [
  ['Amber', 'https://www.songsterr.com/a/wsa/311-amber-drum-tab-s24430'],
  ['Caught a Glimpse', 'https://www.songsterr.com/a/wsa/blindside-caught-a-glimpse-drum-tab-s2323977'],
] as const) {
  const r = await executeImportSongsterr({ url, whole_song: true, fuzz: 0 } as never) as any;
  const pp = r.arrangement.project_plan;
  const bad = pp.projects.filter((x: any) =>
    !(x.order.length <= 8 || (x.patterns.length <= 8 && sceneRuns(x.order) <= 4)));
  let i = 0, ok = true;
  for (const l of pp.projects.flatMap((x: any) => x.order)) { const j = r.arrangement.order.indexOf(l, i); if (j < 0) { ok = false; break; } i = j + 1; }
  ck(`${name}: all fit + order preserved (${pp.projects.length} projects)`, bad.length === 0 && ok);
  ck(`${name}: next_step points at project_plan`, /project_plan/.test(r.next_step), r.next_step.slice(0, 90));
}
// 6. THE WORKED CASE. "After Dark" (Mr.Kitty, song 501859 revision 4102120) was
//    laid out onto eight Circuit projects BY HAND in July 2026, and that hand
//    layout is the reference this algorithm has to reproduce from the source
//    alone. Its markers fall at m1, 19, 35, 51, 67, 83, 99 and 115: every gap is
//    exactly 16 bars except the Intro (18) and the final Chorus (21), so a
//    16-bar project lands on a section boundary every time once the two silent
//    tails are dropped. If this ever disagrees with the hand answer, work out
//    which is right before assuming it is this one.
//
//    Network: 7 parts, one fetch each.
{
  const r = await executeImportSongsterr({ url: '501859', whole_song: true, parts: 'all' } as never) as any;
  const p = r.song_plan;
  ck('After Dark: the golden is about the revision it was built from',
    r.song.revisionId === 4102120, String(r.song.revisionId));
  ck('After Dark: the source is read as 135 measures over 7 parts',
    p.measures === 135 && p.parts.length === 7, JSON.stringify({ m: p.measures, parts: p.parts.length }));
  ck('After Dark: the source markers are found at m1/19/35/51/67/83/99/115',
    p.sections.map((s: any) => s.from_measure).join(',') === '1,19,35,51,67,83,99,115',
    JSON.stringify(p.sections.map((s: any) => `${s.name}@${s.from_measure}`)));
  const windows = p.projects.map((x: any) => `m${x.from_measure}-${x.to_measure}`).join(' ');
  ck('After Dark: the chop reproduces the hand-built EIGHT windows exactly',
    windows === 'm1-16 m19-34 m35-50 m51-66 m67-82 m83-98 m99-114 m115-130', windows);
  ck('After Dark: every project is exactly 16 bars = 256 steps = 8 patterns',
    p.projects.every((x: any) => x.bars === 16 && x.steps === 256 && x.patterns === 8)
    && p.ceiling.max_steps === 256 && p.ceiling.max_bars === 16,
    JSON.stringify(p.projects.map((x: any) => `${x.bars}b/${x.steps}s/${x.patterns}p`)));
  ck('After Dark: the two trims are the SILENT TAILS m17-18 and m131-135, nothing else',
    p.trims.length === 2 && /tail m17-18/.test(p.trims[0]) && /tail m131-135/.test(p.trims[1])
    && p.projects[0].trimmed?.head_bars === 0 && p.projects[7].trimmed?.head_bars === 0
    && p.projects[0].trimmed?.tail_bars === 2 && p.projects[7].trimmed?.tail_bars === 5,
    JSON.stringify(p.trims));
  ck('After Dark: no section had to be split, and nothing was dropped as silent-only',
    p.splits.length === 0 && p.dropped_silent.length === 0,
    JSON.stringify({ splits: p.splits, dropped: p.dropped_silent }));
  ck('After Dark: all 7 parts share ONE boundary set (each is placed in every project)',
    p.boundaries.join(',') === '1,19,35,51,67,83,99,115'
    && p.projects.every((x: any) => x.parts.length + x.silent_parts.length === 7),
    JSON.stringify(p.boundaries));
  // Spot-check the occupancy against the hand-built build sheet: P1 is the two
  // pianos alone, P6 (the Break) is bass + pad only, and the sawtooth lead sounds
  // in the three Choruses and nowhere else. Those are the facts that decide which
  // part goes on which track, so a wrong one is a wrong song.
  const sounding = (i: number): string => p.projects[i].parts.map((x: any) => x.partId).join(',');
  ck('After Dark: P1 (Intro) is the pianos alone', sounding(0) === '1,5', sounding(0));
  ck('After Dark: P6 (Break) is bass + pad only, no leads and no drums', sounding(5) === '0,2', sounding(5));
  ck('After Dark: the sawtooth (part 3) sounds in P3/P5/P8 and in no other project',
    [0, 1, 3, 5, 6].every((i) => !p.projects[i].parts.some((x: any) => x.partId === 3))
    && [2, 4, 7].every((i) => p.projects[i].parts.find((x: any) => x.partId === 3)?.onsets === 84),
    JSON.stringify(p.projects.map((x: any) => x.parts.find((y: any) => y.partId === 3)?.onsets ?? 0)));
  ck('After Dark: the per-project onset counts match the hand build (bass 125, drums 157)',
    p.projects[1].parts.find((x: any) => x.partId === 0)?.onsets === 125
    && p.projects[1].parts.find((x: any) => x.partId === 6)?.onsets === 157
    && p.projects[5].parts.find((x: any) => x.partId === 0)?.onsets === 64
    && p.projects[6].parts.find((x: any) => x.partId === 0)?.onsets === 121,
    JSON.stringify(p.projects.map((x: any) => x.parts.map((y: any) => `${y.partId}:${y.onsets}`).join(' '))));
  ck('After Dark: the plan is offered for review, not authored',
    /READ THIS PLAN TO THE USER BEFORE AUTHORING/.test(r.next_step) && /once the user confirms/.test(r.next_step),
    r.next_step.slice(0, 90));
}

console.log(fail ? `\n${fail} FAILED` : '\nall fix checks pass');
process.exit(fail ? 1 : 0);

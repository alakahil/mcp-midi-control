// Offline software conformance, separate from hardware evidence. Generates no user presets.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadDictionary, encodeValue, decodeValue, writeTableControls, DEFAULT_STATUSES, OPT_IN_STATUSES, FAMILY_BY_SLUG} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-table-encoder.mjs';
import {composerBases, layouts} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-composer-bases.mjs';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {typeApplicability,typePolicySummary} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-type-applicability.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const engine = 'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const out = 'docs/fm3/parameter-evidence/';
const read = path => fs.readFileSync(root + path);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const registry = JSON.parse(read(out + 'registry.json'));
const reconciliation = JSON.parse(read(out + 'metadata-reconciliation.json'));
const dictionary = loadDictionary().params;
const key = p => `${p.family ?? 'UNNAMED'}:${p.param}`;
const byKey = new Map(dictionary.map(p => [key(p), p]));
const supported = p => ['linear', 'log', 'knob', 'enum'].includes(p.kind) && [...DEFAULT_STATUSES, ...OPT_IN_STATUSES].includes(p.status);
const bindings = p => composerBases.flatMap(base => Object.entries(layouts[base.layout])
  .filter(([slug, layout]) => FAMILY_BY_SLUG[slug] === p.family && layout.eid === p.block && p.param >= 0 && p.param < layout.words)
  .map(([slug, layout]) => ({base, slug, layout})));
const eligible = dictionary.filter(p => supported(p) && bindings(p).length).sort((a, b) => key(a) < key(b) ? -1 : 1);
assert.deepEqual(eligible.map(key), registry.parameters.filter(p => p.tableEncoder?.available).map(p => p.id).sort(), 'Registry/encoder eligibility drift');
const options = p => DEFAULT_STATUSES.includes(p.status) ? {} : {allow: [p.status]};

// Independent normalized-position anchors: endpoints/quarters use fixed expected wire words.
function atPosition(p, n) {
  const mult = p.displayMultiplier || 1;
  if (p.kind === 'knob') return n * mult;
  if (p.kind === 'log') return Math.exp((1 - n) * Math.log(p.min) + n * Math.log(p.max)) * mult;
  return ((1 - n) * p.min + n * p.max) * mult;
}
const closeWord = (actual, expected, message) => {
  assert.ok(Number.isInteger(actual) && actual >= 0 && actual <= 65534, message + ': invalid uint16 word');
  assert.ok(Math.abs(actual - expected) <= 1, `${message}: expected ${expected}, got ${actual}`);
};
let numericChecks = 0, enumChecks = 0, rejectionChecks = 0, roundtripChecks = 0;
const parameterResults = [];
for (const p of eligible) {
  const opts = options(p), before = [numericChecks, enumChecks, rejectionChecks, roundtripChecks];
  const reject = value => {assert.throws(() => encodeValue(p, value, opts), Error, key(p)); rejectionChecks++;};
  if (p.kind === 'enum') {
    assert.ok(p.enum.length > 0 && p.enum.length <= 65535, 'Invalid option count');
    p.enum.forEach((label, i) => {
      assert.equal(encodeValue(p, i, opts), i, key(p) + ': numeric option');
      assert.equal(decodeValue(p, i), label, key(p) + ': option decode');
      const first = p.enum.findIndex(x => x.trim().toLowerCase() === label.trim().toLowerCase());
      assert.equal(encodeValue(p, ' ' + label.toUpperCase().trim() + ' ', opts), first, key(p) + ': label normalization');
      enumChecks += 3;
    });
    [-1, p.enum.length, 0.5, '__FM3_UNKNOWN_OPTION__'].forEach(reject);
  } else {
    assert.ok(Number.isFinite(p.min) && Number.isFinite(p.max) && p.max > p.min, key(p) + ': invalid curve domain');
    if (p.kind === 'log') assert.ok(p.min > 0, key(p) + ': nonpositive log domain');
    for (const [n, expected] of [[0, 0], [0.25, 16384], [0.5, 32767], [0.75, 49151], [1, 65534]]) {
      closeWord(encodeValue(p, atPosition(p, n), opts), expected, key(p) + ': independent position');
      numericChecks++;
    }
    // Clearly outside the accepted rounding tolerance, including very large display multipliers.
    const lo = atPosition(p, 0), hi = atPosition(p, 1), margin = Math.max(1, Math.abs(p.displayMultiplier || 1), Math.abs(lo), Math.abs(hi));
    [lo - margin, hi + margin, NaN, Infinity, -Infinity, null, true, '1'].forEach(reject);
    if (p.kind === 'log') [0, -Number.EPSILON].forEach(reject);
    for (const raw of [0, 1, 16384, 32767, 49151, 65533, 65534]) {
      closeWord(encodeValue(p, decodeValue(p, raw), opts), raw, key(p) + ': roundtrip');
      roundtripChecks++;
    }
  }
  if (OPT_IN_STATUSES.includes(p.status)) {
    assert.throws(() => encodeValue(p, p.kind === 'enum' ? 0 : atPosition(p, 0.5)), /not writable/);
    rejectionChecks++;
  }
  parameterResults.push({parameter: key(p), kind: p.kind, policy: DEFAULT_STATUSES.includes(p.status) ? 'default' : 'opt-in',
    bases: bindings(p).map(x => x.base.id),
    checks: {positions: numericChecks - before[0], options: enumChecks - before[1], rejections: rejectionChecks - before[2], roundtrips: roundtripChecks - before[3]}});
}

// Existing, already indexed measurements are a separate oracle. Nothing is promoted.
const observationResults = [];
let slopeLabelAdapters = 0;
for (const obs of registry.observations.filter(o => ['paired-point', 'syx-export-no-get'].includes(o.kind))) {
  const p = byKey.get(obs.parameter);
  assert.ok(p && supported(p), obs.id + ': observation has no accepted scalar encoder');
  let value = obs.scope.value;
  if (['PEQ:30', 'PEQ:31'].includes(obs.parameter) && obs.scope.unit === 'dB/oct') {
    value = `${value} dB/OCT`;
    assert.ok(p.enum.includes(value), obs.id + ': slope label is absent');
    slopeLabelAdapters++;
  }
  const encoded = encodeValue(p, value, options(p));
  closeWord(encoded, obs.scope.raw, obs.id + ': stored measurement');
  observationResults.push({observation: obs.id, parameter: obs.parameter, kind: obs.kind,
    input: value, measuredRaw: obs.scope.raw, encodedRaw: encoded, delta: encoded - obs.scope.raw});
}

// Batch by exact base and position to avoid tens of thousands of redundant compression runs.
// Every A-D slot has an independently computed offset; interior values vary by offset.
const writeRuns = [];
let controlWrites = 0, typeExcludedWrites = 0, typeRejectionChecks = 0;
for (const [bi, base] of composerBases.entries()) {
  const bytes = read(engine + base.file);
  assert.equal(sha(bytes), base.sha256, 'Wrong matrix base');
  const original = inspectStructure(bytes), before = Buffer.from(original.raw.body);
  const entries = eligible.flatMap(p => bindings(p).filter(b => b.base.id === base.id).map(b => ({p, ...b})));
  for (const phase of [0, 1, 2]) {
    const candidates = [], controls = [], expected = [], allowed = new Set(), excluded = [];
    for (const {p, slug, layout} of entries) for (let ch = 0; ch < 4; ch++) {
      const offset = layout.header + 46 + 2 * (ch * layout.words + p.param);
      assert.ok(!allowed.has(offset), 'Aliased control address');
      const raw = p.kind === 'enum' ? (phase === 0 ? 0 : phase === 2 ? p.enum.length - 1 : (p.param + ch) % p.enum.length)
        : phase === 0 ? 0 : phase === 2 ? 65534 : 1 + (offset * 31) % 65533;
      const value = p.kind === 'enum' ? raw : atPosition(p, raw / 65534);
      candidates.push({p, slug, ch, layout, offset, raw, value});
    }
    const planned = new Map(candidates.map(c => [c.offset, c.raw]));
    for (const {p, slug, ch, layout, offset, raw, value} of candidates) {
      const typeOffset = layout.header + 46 + 2 * ch * layout.words;
      const type = planned.get(typeOffset) ?? before.readUInt16LE(typeOffset);
      const a = typeApplicability(p, type), control = {block: slug, channel: 'ABCD'[ch], param: p.param, value};
      if (a.covered && !a.allowed) {excluded.push({control, type, parameter: key(p)}); continue;}
      controls.push(control);expected.push({parameter: key(p), offset, raw});
      allowed.add(offset);allowed.add(offset + 1);
    }
    const name = `FM3 MATRIX ${bi} ${phase}`;
    const result = writeTableControls(bytes, {name, controls}, {allow: [...OPT_IN_STATUSES]});
    if (excluded.length) {
      assert.throws(() => writeTableControls(bytes, {name, controls: [...controls, excluded[0].control]}, {allow: [...OPT_IN_STATUSES]}), /not applicable/);
      typeRejectionChecks++;
    }
    const decoded = inspectStructure(result.syx), actual = Buffer.from(decoded.raw.body);
    assert.equal(actual.length, before.length);
    assert.equal(decoded.decoded.preset_name, name);
    assert.deepEqual(Buffer.from(decoded.parsed.headerPayload), Buffer.from(original.parsed.headerPayload));
    for (const item of expected) closeWord(actual.readUInt16LE(item.offset), item.raw, `${base.id}/${phase}/${item.parameter}/${item.offset}`);
    let changedBytes = 0;
    for (let i = 0; i < before.length; i++) if (actual[i] !== before[i]) {
      assert.ok(allowed.has(i), `Matrix collateral change at ${i}`); changedBytes++;
    }
    controlWrites += controls.length;
    typeExcludedWrites += excluded.length;
    writeRuns.push({base: base.id, baseSha256: base.sha256, layout: base.layout, phase: ['minimum', 'varied-interior', 'maximum'][phase],
      channels: 'ABCD', scalarParameters: entries.length, candidateWrites: candidates.length, typeExcludedWrites: excluded.length,
      excluded: excluded.map(x => ({parameter: x.parameter, channel: x.control.channel, finalType: x.type})),
      controlWrites: controls.length, changedBytes, outputSha256: sha(result.syx)});
  }
}

const sourcePaths = [out + 'registry.json', out + 'metadata-reconciliation.json', 'tools/fm3/encoder-matrix.mjs',
  engine + 'references/fm3-param-dictionary.json', engine + 'scripts/fm3-table-encoder.mjs', engine + 'scripts/fm3-composer-bases.mjs',
  engine + 'references/fm3-type-applicability.json', engine + 'scripts/fm3-type-applicability.mjs',
  engine + 'scripts/drive-collector/fm3-prototype.mjs', engine + 'scripts/drive-collector/fm3-codec.mjs', engine + 'scripts/fm3-codec.mjs',
  ...composerBases.map(b => engine + b.file)];
const result = {schemaVersion: 1, scope: {
  softwareOnly: true, deviceIO: false, newHardwareEvidence: false, generatedPresetsDelivered: false,
  parameterEligibility: 'Accepted table policy, implemented scalar kind, and at least one bundled base layout. Other parameters remain outside this matrix.',
  curveOracle: 'Fixed normalized positions plus independent endpoint interpolation; one wire LSB tolerance for floating point/quantized historical displays.',
  limits: 'Only Chorus/Drive type applicability is enforced in batch writes; exclusions are counted separately. Scalar conformance is not type-independent write permission. No arbitrary preset, other-family visibility, DSP/audio/CPU, tempo, routing or modifier validation.'},
  sources: Object.fromEntries(sourcePaths.map(path => [path, sha(read(path))])),
  summary: {eligibleParameterKeys: eligible.length, numericPositionChecks: numericChecks, enumChecks, rejectionChecks, roundtripChecks,
    existingObservationsChecked: observationResults.length, existingObservationKeys: new Set(observationResults.map(x => x.parameter)).size,
    slopeLabelAdapters, bundledBases: composerBases.length, syxWriteRuns: writeRuns.length, controlWrites,typeExcludedWrites,typeRejectionChecks,
    typeApplicability:typePolicySummary(),
    openScaleConflicts: reconciliation.scaleConflicts.map(p => p.parameter), unnamedWritableKeys: reconciliation.summary.unnamedWritableKeys,
    softwareChecks: 'passed', hardwareValidationAdded: false, userPhysicalActions: 0},
  parameters: parameterResults, existingObservations: observationResults, writeRuns};
const compact = JSON.stringify;
const content = '{\n' + Object.entries(result).map(([k, v]) => compact(k) + ':' + (Array.isArray(v) ? '[\n' + v.map(x => compact(x)).join(',\n') + '\n]' : compact(v))).join(',\n') + '\n}\n';
if (process.argv.includes('--write')) fs.writeFileSync(root + out + 'encoder-matrix.json', content);
else assert.equal(read(out + 'encoder-matrix.json').toString(), content, 'Encoder matrix stale; review sources and regenerate');
console.log(JSON.stringify(result.summary));

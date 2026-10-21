// Research-only corpus inspection. No preset authoring and no device I/O.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {readModifiers} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-parameter-dependencies.mjs';
const sha = b => createHash('sha256').update(b).digest('hex');
const specimens = JSON.parse(fs.readFileSync(0, 'utf8'));
assert.ok(Array.isArray(specimens));
const profiles = {}, results = [];
for (const specimen of specimens) {
  const bytes = Buffer.from(specimen.base64, 'base64');
  assert.equal(sha(bytes), specimen.sha256, 'Input blob hash mismatch');
  let parsed;
  try { parsed = inspectStructure(bytes); }
  catch (error) {
    // Older goldens are retained as exclusions, never silently accepted as FW13.
    results.push({sha256: specimen.sha256, status: 'excluded', reason: error.message});
    continue;
  }
  const body = Buffer.from(parsed.raw.body), modifiers = readModifiers(body);
  const profile = sha(body.subarray(1538, 4610));
  const records = modifiers.map((m, index) => {
    // Explicit coordinates independently cross-check the production reader.
    const header = 1538 + 96 * index, offset = header + 46;
    assert.equal(body.readUInt16LE(header), 3 + index);
    assert.equal(body.readUInt16LE(header + 42), 25);
    assert.equal(body.readUInt16LE(header + 44), 1);
    assert.equal(m.offset, offset);
    const words = Array.from({length:25}, (_, pid) => body.readUInt16LE(offset + pid * 2));
    assert.deepEqual([m.source,m.effectId,m.pid,m.channel,m.secondarySource,m.operation],
      [words[0],words[8],words[9],words[17],words[20],words[23]]);
    return {index, offset, words};
  });
  profiles[profile] ??= records;
  assert.deepEqual(profiles[profile], records);
  results.push({sha256: specimen.sha256, status: 'inspected', format: '0x0146', profile});
  assert.equal(sha(bytes), specimen.sha256, 'Reader changed the input');
}
process.stdout.write(JSON.stringify({profiles, results}));

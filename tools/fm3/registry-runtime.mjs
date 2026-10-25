import {typePolicySummary} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-type-applicability.mjs';
// Read-only access to the shipped encoder policy and preset decoder. No MIDI I/O.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DEFAULT_STATUSES, OPT_IN_STATUSES, FAMILY_BY_SLUG, dictionaryHash, loadDictionary} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-table-encoder.mjs';
import {composerBases, layouts} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-composer-bases.mjs';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {compare} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-control-collector/control-check.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
const bodies = {};
const checkPath = path => {
  if (!path.startsWith(root) || path.includes('/../')) throw Error('Path outside repository');
  return path;
};
for (const path of request.files ?? []) {
  checkPath(path);
  const body = Buffer.from(inspectStructure(fs.readFileSync(path)).raw.body);
  bodies[path] = {base64: body.toString('base64'), sha256: createHash('sha256').update(body).digest('hex')};
}
const driveComparisons = (request.driveComparisons ?? []).map(job =>
  compare(fs.readFileSync(checkPath(job.previous)), fs.readFileSync(checkPath(job.current)), job.index));
console.log(JSON.stringify({defaultStatuses: DEFAULT_STATUSES, optInStatuses: OPT_IN_STATUSES,
  effectiveParameters:loadDictionary().params,typePolicies:typePolicySummary(),familyBySlug: FAMILY_BY_SLUG, dictionaryHash, loadDictionary, composerBases, layouts, bodies, driveComparisons}));

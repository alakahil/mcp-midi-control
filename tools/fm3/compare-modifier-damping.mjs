// Research-only, read-only comparison. A successful comparison is not a writer gate.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {auditModifiers} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-modifier-audit.mjs';

export const baselineUrl = new URL('../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/examples/FM3_MOD_AUTOENGAGE_OFF_export.syx', import.meta.url);
export const baselineSha256 = '7b6026539df41c36bf828dc35bf78510c0a3f30d77afe830eda5a2a7b71ea913';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const differences = (before, after, ignored = []) => Array.from({length:Math.max(before.length,after.length)}, (_,offset) =>
  ({offset,before:before[offset]??null,after:after[offset]??null}))
  .filter(d => d.before !== d.after && !ignored.includes(d.offset));

export function compareDampingCapture(before, after) {
  const result = {
    schemaVersion:1, mode:'read-only-damping-capture-comparison',
    baselineSha256:sha(before), candidateSha256:sha(after),
    field:{record:0,word:24,bodyOffset:1632,widthBytes:2,storage:'uint16-le',
      metadataName:'MOD_DAMPING',baselineDisplay:'Exponential',requestedDisplay:'Linear',
      expectedRawHypothesis:1},
    fileComparisonPassed:false, matchesHypothesis:false,
    evidence:{firmwareDetected:null,metadataFirmware:13,displayLabelVerified:false,
      changedFieldCaptureReviewed:false,deviceBehaviorVerified:false,audioVerified:false},
    reviewRequired:true,writeAuthorized:false,deviceIO:false,presetWritten:false,
  };
  if(result.baselineSha256 !== baselineSha256) return {...result,status:'wrong-baseline'};
  try {
    const a = inspectStructure(before), b = inspectStructure(after);
    const beforeAudit = auditModifiers(before), afterAudit = auditModifiers(after);
    const bodyBefore = Buffer.from(a.raw.body), bodyAfter = Buffer.from(b.raw.body);
    result.structuralChecks = {before:beforeAudit.checks,after:afterAudit.checks};
    result.bodyChanges = differences(bodyBefore,bodyAfter);
    // CRC (4..5) and compressed length (74..75) are derived. The decompressed
    // length, dump header, name and every other raw header byte must match.
    result.rawHeaderChanges = differences(a.raw.rawPatch.slice(0,76),b.raw.rawPatch.slice(0,76),[4,5,74,75]);
    result.dumpHeaderChanges = differences(a.parsed.headerPayload,b.parsed.headerPayload);
    const beforePadding=a.raw.rawPatch.slice(76+a.raw.compSize),afterPadding=b.raw.rawPatch.slice(76+b.raw.compSize);
    result.rawPadding = {beforeBytes:beforePadding.length,afterBytes:afterPadding.length,
      beforeAllZero:beforePadding.every(v=>v===0),afterAllZero:afterPadding.every(v=>v===0)};
    result.unrelatedBodyChanges = result.bodyChanges.filter(d => d.offset !== 1632 && d.offset !== 1633);
    result.beforeRaw = bodyBefore.readUInt16LE(1632);
    result.afterRaw = bodyAfter.readUInt16LE(1632);
    result.target = {source:beforeAudit.modifiers[0].source,effectId:beforeAudit.modifiers[0].effectId,
      pid:beforeAudit.modifiers[0].pid,channel:beforeAudit.modifiers[0].channel};
    result.targetContextPreserved = JSON.stringify(beforeAudit.modifiers[0].targetContext) === JSON.stringify(afterAudit.modifiers[0].targetContext);
    if(result.rawHeaderChanges.length || result.dumpHeaderChanges.length || !result.rawPadding.beforeAllZero || !result.rawPadding.afterAllZero || result.unrelatedBodyChanges.length || !result.targetContextPreserved)
      return {...result,status:'collateral-changes'};
    if(!result.bodyChanges.length) return {...result,status:'no-field-change'};
    result.fileComparisonPassed = true;
    result.matchesHypothesis = result.afterRaw === result.field.expectedRawHypothesis;
    result.status = result.matchesHypothesis ? 'isolated-change-awaiting-display-review' : 'isolated-unexpected-code-awaiting-review';
    return result;
  } catch(error) {
    return {...result,status:'invalid-preset',error:error.message};
  }
}

if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if(process.argv.length !== 3 || process.argv[2] === '--help') {
    process.stdout.write('Usage: node tools/fm3/compare-modifier-damping.mjs CAPTURE.syx\nRead-only; JSON to stdout. Exit 0: isolated hypothesis-matching change, 2: mismatch/invalid input. Neither authorizes writing.\n');
    process.exitCode = process.argv[2] === '--help' ? 0 : 2;
  } else {
    try {
      const result = compareDampingCapture(fs.readFileSync(baselineUrl),fs.readFileSync(process.argv[2]));
      process.stdout.write(JSON.stringify(result,null,2)+'\n');
      process.exitCode = result.fileComparisonPassed && result.matchesHypothesis ? 0 : 2;
    } catch(error) {
      process.stderr.write(error.message+'\n');
      process.exitCode = 2;
    }
  }
}

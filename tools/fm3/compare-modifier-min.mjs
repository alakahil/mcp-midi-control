// Research-only one-field comparison. No authoring, MIDI or display inference.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {auditModifiers} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-modifier-audit.mjs';

export const baselineUrl = new URL('../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/examples/FM3_MOD_DAMPING_LINEAR_export.syx', import.meta.url);
export const baselineSha256 = 'f2d59758cbe24ef1bd38453968d2b2f974e3da64424fae23cedb190f2162fc5d';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const differences = (before, after, ignored = []) => Array.from({length:Math.max(before.length,after.length)}, (_,offset) =>
  ({offset,before:before[offset]??null,after:after[offset]??null}))
  .filter(d => d.before !== d.after && !ignored.includes(d.offset));

export function compareMinCapture(before, after) {
  const result = {
    schemaVersion:1, mode:'read-only-wah-min-capture-comparison',
    baselineSha256:sha(before), candidateSha256:sha(after),
    field:{record:0,word:1,bodyOffset:1586,widthBytes:2,storage:'uint16-le',
      metadataName:'MOD_MIN',baselineDisplay:0,requestedDisplay:2.5,
      displayUnit:'Wah Control scale 0..10; not a universal percentage',
      candidateRawHypotheses:[16383,16384],encodingVerified:false},
    fileComparisonPassed:false, matchesHypothesis:false,
    evidence:{firmwareDetected:null,metadataFirmware:13,displayValueVerified:false,
      changedFieldCaptureReviewed:false,fullRangeCodecVerified:false,
      deviceBehaviorVerified:false,audioVerified:false},
    reviewRequired:true,writeAuthorized:false,deviceIO:false,presetWritten:false,
  };
  if(result.baselineSha256 !== baselineSha256) return {...result,status:'wrong-baseline'};
  try {
    const a = inspectStructure(before), b = inspectStructure(after);
    const beforeAudit = auditModifiers(before), afterAudit = auditModifiers(after);
    const bodyBefore = Buffer.from(a.raw.body), bodyAfter = Buffer.from(b.raw.body);
    result.structuralChecks = {before:beforeAudit.checks,after:afterAudit.checks};
    result.bodyChanges = differences(bodyBefore,bodyAfter);
    // CRC and compressed length are derived; all other header bytes must match.
    result.rawHeaderChanges = differences(a.raw.rawPatch.slice(0,76),b.raw.rawPatch.slice(0,76),[4,5,74,75]);
    result.dumpHeaderChanges = differences(a.parsed.headerPayload,b.parsed.headerPayload);
    const ap=a.raw.rawPatch.slice(76+a.raw.compSize),bp=b.raw.rawPatch.slice(76+b.raw.compSize);
    result.rawPadding = {beforeBytes:ap.length,afterBytes:bp.length,
      beforeAllZero:ap.every(v=>v===0),afterAllZero:bp.every(v=>v===0)};
    result.unrelatedBodyChanges = result.bodyChanges.filter(d => d.offset !== 1586 && d.offset !== 1587);
    result.beforeRaw = bodyBefore.readUInt16LE(1586);
    result.afterRaw = bodyAfter.readUInt16LE(1586);
    const m=beforeAudit.modifiers[0];
    result.target = {source:m.source,effectId:m.effectId,pid:m.pid,channel:m.channel};
    result.targetContextPreserved = JSON.stringify(m.targetContext) === JSON.stringify(afterAudit.modifiers[0].targetContext);
    if(bodyBefore.length!==bodyAfter.length || result.rawHeaderChanges.length || result.dumpHeaderChanges.length ||
       !result.rawPadding.beforeAllZero || !result.rawPadding.afterAllZero ||
       result.unrelatedBodyChanges.length || !result.targetContextPreserved)
      return {...result,status:'collateral-changes'};
    if(!result.bodyChanges.length) return {...result,status:'no-field-change'};
    result.fileComparisonPassed = true;
    result.matchesHypothesis = result.field.candidateRawHypotheses.includes(result.afterRaw);
    result.status = result.matchesHypothesis ? 'isolated-change-awaiting-display-review' : 'isolated-unexpected-code-awaiting-review';
    return result;
  } catch(error) {
    return {...result,status:'invalid-preset',error:error.message};
  }
}

if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if(process.argv.length !== 3 || process.argv[2] === '--help') {
    process.stdout.write('Usage: node tools/fm3/compare-modifier-min.mjs CAPTURE.syx\nRead-only; JSON to stdout. Exit 0: isolated candidate-code change, 2: mismatch/invalid input. Neither proves the display or authorizes writing.\n');
    process.exitCode = process.argv[2] === '--help' ? 0 : 2;
  } else {
    try {
      const result = compareMinCapture(fs.readFileSync(baselineUrl),fs.readFileSync(process.argv[2]));
      process.stdout.write(JSON.stringify(result,null,2)+'\n');
      process.exitCode = result.fileComparisonPassed && result.matchesHypothesis ? 0 : 2;
    } catch(error) {
      process.stderr.write(error.message+'\n');
      process.exitCode = 2;
    }
  }
}

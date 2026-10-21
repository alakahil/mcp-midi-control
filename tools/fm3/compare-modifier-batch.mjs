// Read-only research: field locations are independently mapped; codecs are not inferred.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {auditModifiers} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-modifier-audit.mjs';
export const plan=JSON.parse(fs.readFileSync(new URL('../../docs/fm3/parameter-evidence/modifier-batch-plan.json',import.meta.url)));
export const baselineUrl=new URL('../../'+plan.baseline.file,import.meta.url);
const sha=b=>createHash('sha256').update(b).digest('hex');
const diff=(a,b,skip=new Set())=>Array.from({length:Math.max(a.length,b.length)},(_,offset)=>({offset,before:a[offset]??null,after:b[offset]??null})).filter(d=>d.before!==d.after&&!skip.has(d.offset));
export function compareBatchCapture(before,after,capturePlan=plan){
 const r={schemaVersion:1,mode:'read-only-modifier-batch',baselineSha256:sha(before),candidateSha256:sha(after),fileComparisonPassed:false,
  reviewRequired:true,writeAuthorized:false,presetWritten:false,deviceIO:false,
  evidence:{displayValuesVerified:false,singleFieldIsolation:false,fieldIndependenceVerified:false,fullRangeCodecsVerified:false,deviceBehaviorVerified:false,audioVerified:false},
  note:'Requested display values are a plan, not observations. Changed words require actual screenshot/value review; never infer ten isolated experiments or a full-range codec.'};
 if(r.baselineSha256!==capturePlan.baseline.sha256)return {...r,status:'wrong-baseline'};
 try{
  const a=inspectStructure(before),b=inspectStructure(after),aa=auditModifiers(before),ba=auditModifiers(after);
  const ab=Buffer.from(a.raw.body),bb=Buffer.from(b.raw.body);
  if(sha(ab)!==capturePlan.baseline.bodySha256)return {...r,status:'wrong-baseline-body'};
  r.body={beforeSha256:sha(ab),afterSha256:sha(bb),beforeBytes:ab.length,afterBytes:bb.length};
  const t=aa.modifiers[0];r.target={record:0,source:t.source,effectId:t.effectId,pid:t.pid,channel:t.channel};
  if(JSON.stringify(r.target)!==JSON.stringify(capturePlan.target))return {...r,status:'wrong-target'};
  r.structuralChecks={before:aa.checks,after:ba.checks};
  r.fields=capturePlan.fields.map(f=>({...f,beforeRaw:ab.readUInt16LE(f.offset),afterRaw:bb.readUInt16LE(f.offset),changed:ab.readUInt16LE(f.offset)!==bb.readUInt16LE(f.offset),actualDisplay:null}));
  r.changedFields=r.fields.filter(f=>f.changed).map(f=>f.name);
  r.missingRequestedChanges=r.fields.filter(f=>!f.changed).map(f=>f.name);
  const allowed=new Set(capturePlan.fields.flatMap(f=>[f.offset,f.offset+1]));
  r.bodyChanges=diff(ab,bb);r.unrelatedBodyChanges=r.bodyChanges.filter(x=>!allowed.has(x.offset));
  r.rawHeaderChanges=diff(a.raw.rawPatch.slice(0,76),b.raw.rawPatch.slice(0,76),new Set([4,5,74,75]));
  r.rawTransportHeaderChanges=diff(a.raw.rawPatch.slice(0,76),b.raw.rawPatch.slice(0,76)).filter(d=>[4,5,74,75].includes(d.offset));
  r.compressedBytes={before:a.raw.compSize,after:b.raw.compSize};
  r.dumpHeaderChanges=diff(a.parsed.headerPayload,b.parsed.headerPayload);
  r.targetContextPreserved=JSON.stringify(t.targetContext)===JSON.stringify(ba.modifiers[0].targetContext);
  r.paddingAllZero=[a,b].every(v=>v.raw.rawPatch.slice(76+v.raw.compSize).every(x=>x===0));
  if(ab.length!==bb.length||r.unrelatedBodyChanges.length||r.rawHeaderChanges.length||r.dumpHeaderChanges.length||!r.targetContextPreserved||!r.paddingAllZero)return {...r,status:'collateral-changes'};
  if(!r.changedFields.length)return {...r,status:'no-field-change'};
  return {...r,fileComparisonPassed:true,status:r.missingRequestedChanges.length?'partial-batch-awaiting-display-review':'batch-awaiting-display-review'};
 }catch(error){return {...r,status:'invalid-preset',error:error.message};}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 if(!(args.length===1||args.length===3&&args[0]==='--plan')||args[0]==='--help'){
  console.log('Usage: node tools/fm3/compare-modifier-batch.mjs [--plan PLAN.json] CAPTURE.syx\nRead-only JSON report; exit 0 means changes confined to selected fields, not confirmed displays/codecs. Exit 2 means no change, invalid input or collateral changes.');
  process.exitCode=process.argv[2]==='--help'?0:2;
 }else try{
  const selectedPlan=args.length===3?JSON.parse(fs.readFileSync(args[1])):plan;
  const selectedBase=new URL('../../'+selectedPlan.baseline.file,import.meta.url);
  const r=compareBatchCapture(fs.readFileSync(selectedBase),fs.readFileSync(args.at(-1)),selectedPlan);console.log(JSON.stringify(r,null,2));process.exitCode=r.fileComparisonPassed?0:2;
 }catch(error){console.error(error.message);process.exitCode=2;}
}

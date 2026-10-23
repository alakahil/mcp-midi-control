// Read-only one-export donor comparison. No MIDI, no authored modifier writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const packed=fs.existsSync(path.join(here,'vendor/fm3-prototype.mjs'));
const source=path.resolve(here,'../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs');
const {inspectStructure}=await import(pathToFileURL(packed?path.join(here,'vendor/fm3-prototype.mjs'):source));
const sha=b=>createHash('sha256').update(b).digest('hex');
function records(body){
 return Array.from({length:32},(_,i)=>{
  const header=1538+i*96,at=header+46;
  assert.equal(body.readUInt16LE(header),3+i,'modifier ID');
  assert.ok(body.subarray(header+2,header+42).every(n=>n===0),'modifier reserved header');
  assert.equal(body.readUInt16LE(header+42),25,'modifier word count');
  assert.equal(body.readUInt16LE(header+44),1,'modifier channels');
  return {index:i,offset:at,words:Array.from({length:25},(_,pid)=>body.readUInt16LE(at+2*pid))};
 });
}
export function checkBinding(baseBytes,exportBytes){
 const result={schemaVersion:1,baselineSha256:sha(baseBytes),exportSha256:sha(exportBytes),passed:false,
  physicalScaleMeasurements:0,storeReloadProven:false,fullRangeEncodingProven:false,errors:[]};
 try{
  const base=inspectStructure(baseBytes),got=inspectStructure(exportBytes),a=Buffer.from(base.raw.body),b=Buffer.from(got.raw.body);
  assert.equal(base.decoded.preset_name,'FM3 VOL BIND CHECK','Wrong baseline name');
  assert.equal(a.length,b.length,'Body length changed');
  const before=records(a),after=records(b);
  assert.ok(before.every(r=>r.words[0]===0&&r.words[20]===0),'Baseline contains active binding');
  const active=after.filter(r=>r.words[0]!==0||r.words[20]!==0);
  assert.equal(active.length,1,'Expected exactly one active modifier');
  const r=active[0],w=r.words;
  assert.deepEqual([w[0],w[8],w[9],w[17],w[20],w[23]],[14,102,0,0,0,0],'Expected Ext1 -> Volume/Pan 1 Gain ALL, no secondary source');
  assert.ok(w[1]<=65534&&w[2]<=65534,'Unknown Min/Max sentinel');
  const expected=Buffer.from(a);b.copy(expected,r.offset,r.offset,r.offset+50);
  assert.deepEqual(b,expected,'Unrequested bytes changed outside the new 25-word record');
  const changes=[];for(let i=0;i<76;i++)if(base.raw.rawPatch[i]!==got.raw.rawPatch[i])changes.push(i);
  assert.ok(changes.every(i=>[4,5,74,75].includes(i)),'Unrelated raw-header change');
  assert.ok(got.raw.rawPatch.slice(76+got.raw.compSize).every(v=>v===0),'Nonzero padding');
  result.newModifier={record:r.index,wireEffect:3+r.index,offset:r.offset,words:w,
   previousWords:before[r.index].words,channelScope:'ALL',source:'External 1',target:'Volume/Pan 1 Gain'};
  result.rawHeaderChangedOffsets=changes;
  result.dumpHeaderEqual=Buffer.from(base.parsed.headerPayload).equals(Buffer.from(got.parsed.headerPayload));
  result.baselineDumpHeader=Array.from(base.parsed.headerPayload);result.exportDumpHeader=Array.from(got.parsed.headerPayload);
  result.checks={frameChecksums:true,presetCrc:true,footer:true,all32ModifierHeaders:true,
   exactlyOneNewBinding:true,allOtherBodyBytesPreserved:true};
  result.passed=true;
 }catch(e){result.errors.push(e.message.split('\n')[0]);}
 return result;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const [returned,output]=process.argv.slice(2);
 if(!returned||!output)throw Error('Usage: node check-binding.mjs RETURNED.syx RESULT.json');
 const base=fs.readFileSync(path.join(here,'FM3_VOL_BIND_CHECK.syx'));
 const plan=JSON.parse(fs.readFileSync(path.join(here,'plan.json')));
 assert.equal(sha(base),plan.baselineSha256,'Baseline hash changed');
 const result=checkBinding(base,fs.readFileSync(returned));
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({passed:result.passed,errors:result.errors,output}));if(!result.passed)process.exitCode=2;
}

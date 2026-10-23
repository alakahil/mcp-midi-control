// Read-only comparison of the requested active-buffer import/export experiment.
// A passing result is word preservation, not display scale/audio/STORE proof.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {scanRecords,readGrid} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-layout.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function compareInputVolume(source,returned){
 const result={schemaVersion:1,sourceSha256:sha(source),exportSha256:sha(returned),passed:false,errors:[],checks:{},newPhysicalScaleMeasurements:0,storeReloadProven:false};
 const check=(name,ok)=>{result.checks[name]=!!ok;if(!ok)result.errors.push(name);};
 try{
  const sa=inspectStructure(source),sb=inspectStructure(returned),a=Buffer.from(sa.raw.body),b=Buffer.from(sb.raw.body),ar=scanRecords(a),br=scanRecords(b);
  check('sourceAndExportCrc',sa.decoded.crc_valid&&sb.decoded.crc_valid);
  check('presetName',sa.decoded.preset_name===sb.decoded.preset_name);
  check('uniqueRecordIds',new Set(ar.records.map(r=>r.eid)).size===ar.records.length&&new Set(br.records.map(r=>r.eid)).size===br.records.length);
  check('sourceHasNoVolume',!ar.records.some(r=>r.eid===102));
  const extra=br.records.filter(r=>!ar.records.some(x=>x.eid===r.eid));
  check('oneCurrentVolumeRecord',extra.length===1&&extra[0].eid===102&&extra[0].words===15&&extra[0].channels===4&&br.records.length===ar.records.length+1);
  const before=readGrid(a),after=readGrid(b),cell=before.find(x=>x.row===2&&x.col===1);
  check('sourceRow3Column2Shunt',cell.id>=1024&&cell.mask===4);
  check('onlyExpectedGridCell',before.every((x,i)=>after[i].mask===x.mask&&after[i].id===(x===cell?102:x.id)));
  const cellOffset=260+16+8,prefixA=Buffer.from(a.subarray(0,4610)),prefixB=Buffer.from(b.subarray(0,4610));
  prefixA.writeUInt16LE(102,cellOffset);check('otherPrefixBytesPreserved',prefixA.equals(prefixB));
  const recordResults=[];
  for(const r of ar.records){const nr=br.records.find(x=>x.eid===r.eid);const equal=!!nr&&a.subarray(r.header,r.header+r.size).equals(b.subarray(nr.header,nr.header+nr.size));recordResults.push({effectId:r.eid,preserved:equal});check('record_'+r.eid,equal);}
  result.records=recordResults;check('systemTailPreserved',a.subarray(ar.tail).equals(b.subarray(br.tail)));
  const input=br.records.find(r=>r.eid===37),volume=extra.find(r=>r.eid===102);
  if(input)result.inputWords=Array.from({length:40},(_,i)=>b.readUInt16LE(input.start+2*i));
  if(volume)result.volume={...volume,recordSha256:sha(b.subarray(volume.header,volume.header+volume.size)),wordsByChannel:Array.from({length:4},(_,ch)=>Array.from({length:15},(_,pid)=>b.readUInt16LE(volume.start+ch*30+pid*2))),sceneBypass:Array.from({length:8},(_,i)=>b.readUInt16LE(volume.header+26+2*i))};
 }catch(e){result.errors.push(e.message);}
 result.passed=result.errors.length===0;return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [source,returned,out]=process.argv.slice(2);if(!source||!returned||!out)throw Error('Usage: node tools/fm3/compare-input-volume.mjs source.syx export.syx result.json');
 const r=compareInputVolume(fs.readFileSync(source),fs.readFileSync(returned));fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({passed:r.passed,errors:r.errors,report:out}));if(!r.passed)process.exitCode=1;
}

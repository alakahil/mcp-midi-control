// Isolated read-only legacy investigation. Never broadens the production parser.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parsePresetDump,decodeRawPatch,computeRawPatchXor} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-codec.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const need=(ok,msg)=>{if(!ok)throw Error(msg);};
const sha=b=>createHash('sha256').update(b).digest('hex');
export function inspectLegacy(bytes){
  need(bytes.length===24680,'Expected one complete FM3 dump');
  let at=0;const functions=[];
  while(at<bytes.length){
    need(bytes[at]===0xf0,'Invalid frame boundary');
    const end=bytes.indexOf(0xf7,at+1);need(end>at+6,'Incomplete frame');
    const f=bytes.subarray(at,end+1);
    need(f[1]===0&&f[2]===1&&f[3]===0x74&&f[4]===0x11,'Not an FM3 frame');
    need([...f.subarray(1,-1)].every(v=>v<128),'Non-7-bit data');
    need((f.subarray(0,-2).reduce((a,b)=>a^b,0)&127)===f[f.length-2],'Frame checksum mismatch');
    functions.push(f[5]);at=end+1;
  }
  need(functions.join(',')===[0x77,...Array(8).fill(0x78),0x79].join(','),'Unexpected frame sequence');
  const p=parsePresetDump(bytes,0,17),r=decodeRawPatch(p.chunkPayloads),raw=Buffer.from(r.rawPatch),body=Buffer.from(r.body);
  const format=raw.readUInt16LE(0);
  need([0x013e,0x0143].includes(format),'Not an investigated legacy format');
  need(r.crcValid,'Preset CRC mismatch');
  need((p.footerPayload[0]|p.footerPayload[1]<<7|p.footerPayload[2]<<14)===computeRawPatchXor(r.rawPatch),'Footer checksum mismatch');
  need(body.length>=4610,'Truncated modifier table');
  const records=[];
  for(let i=0;i<32;i++){
    const at=1538+i*96,start=at+46;
    need(body.readUInt16LE(at)===3+i&&body.subarray(at+2,at+42).every(x=>x===0)&&body.readUInt16LE(at+42)===25&&body.readUInt16LE(at+44)===1,'Modifier record header mismatch at '+i);
    const words=Array.from({length:25},(_,j)=>body.readUInt16LE(start+2*j));
    records.push({record:i,offset:start,words,source:words[0],effectId:words[8],pid:words[9],channel:words[17],secondarySource:words[20],operation:words[23],active:words[0]!==0||words[20]!==0});
  }
  return {format:'0x'+format.toString(16).padStart(4,'0'),bodyBytes:body.length,checks:{frameChecksums:true,presetCrc:true,footer:true,all32RecordHeaders:true},records};
}
export function auditLegacy(inventory){
  need(Array.isArray(inventory.unsupported)&&inventory.unsupported.length>0,'Missing unsupported inventory');
  const files=[];
  for(const entry of inventory.unsupported){
    const file=path.resolve(root,entry.file);need(file.startsWith(root),'Path outside repository');
    const bytes=fs.readFileSync(file);need(sha(bytes)===entry.sha256,'Input hash mismatch');
    const result=inspectLegacy(bytes);
    files.push({file:entry.file,sha256:entry.sha256,...result});
  }
  const volumeBindings=files.flatMap(f=>f.records.filter(r=>r.effectId===102).map(r=>({file:f.file,sha256:f.sha256,format:f.format,...r})));
  return {schemaVersion:1,sourceCommit:inventory.sourceCommit,engineGitTree:inventory.engineGitTree,mode:'new-local-read-only-legacy-scan',newREAAnalysis:false,newPhysicalExports:0,productionParserChanged:false,files,volumeBindings,ext1VolumeGainBindings:volumeBindings.filter(r=>r.source===14&&r.pid===0),limits:['Legacy target IDs are interpreted using current mapping; not a FW13 creation/defaults proof.','No legacy preset is generated, converted or imported.','The one observed Volume record is Balance PID1 / source3, not Ext1 / Gain PID0.']};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [input,output,...rest]=process.argv.slice(2);
  need(input&&output&&!rest.length,'Usage: node volume-pedal-legacy-audit.mjs CORPUS.json OUTPUT.json');
  need(!fs.existsSync(output),'Output already exists');
  const result=auditLegacy(JSON.parse(fs.readFileSync(input)));
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({files:result.files.length,volumeBindings:result.volumeBindings.length,ext1VolumeGainBindings:result.ext1VolumeGainBindings.length}));
}

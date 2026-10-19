// Read-only research adapter for four pinned factory specimens. No production format widening.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parsePresetDump,decodeRawPatch,computeRawPatchXor,decodeGen3PresetDump} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-codec.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const banks={'FM3-BANK-B-250604-113656.syx':'20e947ac4488488e9f877facb62d86b5091f797f9da9abec082df381041d8e02','FM3-BANK-C-250604-113656.syx':'3289d4274e696000c39031c31fe105131234668221e046b78a0a03a013e98cb2'};
const selected=new Map([[177,"Satan's Hollow FM3"],[225,'Arpeggiator M@ness FM3'],[247,'5-Octave Lead'],[280,'Virtual Capo']]);
export const pitchPids=[15,16,17,18,35,63,71,72,73,74,76,...Array.from({length:16},(_,i)=>77+i)];
export function extractFactory(directory){
 const specimens=[];
 for(const [bank,hash] of Object.entries(banks)){
  const bytes=fs.readFileSync(path.join(directory,bank));assert.equal(sha(bytes),hash);assert.equal(bytes.length,128*24680);
  for(let index=0;index<128;index++){
   const slot=index+(bank.includes('-B-')?128:256);if(!selected.has(slot))continue;
   const data=bytes.subarray(index*24680,(index+1)*24680),functions=[];
   for(let at=0;at<data.length;){
    const end=data.indexOf(247,at+1);assert.ok(end>at+6);const f=data.subarray(at,end+1);
    assert.deepEqual([...f.subarray(0,5)],[240,0,1,116,17]);assert.ok([...f.subarray(1,-1)].every(x=>x<128));
    assert.equal(f.subarray(0,-2).reduce((a,b)=>a^b,0)&127,f.at(-2));functions.push(f[5]);at=end+1;
   }
   assert.deepEqual(functions,[119,...Array(8).fill(120),121]);
   const p=parsePresetDump(data,0,17),raw=decodeRawPatch(p.chunkPayloads),body=Buffer.from(raw.body),v=decodeGen3PresetDump(data,17);
   assert.equal(Buffer.from(raw.rawPatch).readUInt16LE(0),318);assert.ok(raw.crcValid);assert.equal(p.footerPayload[0]|p.footerPayload[1]<<7|p.footerPayload[2]<<14,computeRawPatchXor(raw.rawPatch));
   assert.equal(v.preset_name,selected.get(slot));
   // Research-only sequential header traversal: old Amp/Cab word counts differ from FW13.
   let at=4610,record=null;
   while(at+46<body.length){
    const eid=body.readUInt16LE(at),words=body.readUInt16LE(at+42),channels=body.readUInt16LE(at+44);
    if(eid<37||eid>210||words<1||words>500||![1,4].includes(channels)||at+46+2*words*channels>body.length)break;
    if(eid===110){assert.equal(record,null);assert.equal(words,113);assert.equal(channels,4);record={header:at,start:at+46,words,channels};}
    at+=46+2*words*channels;
   }
   assert.ok(record);
   specimens.push({bank,slot,name:v.preset_name,presetSha256:sha(data),format:Buffer.from(raw.rawPatch).readUInt16LE(0),bodySha256:sha(body),record,
    channels:Object.fromEntries([...'ABCD'].map((ch,i)=>[ch,{type:body.readUInt16LE(record.start+2*i*record.words),words:Object.fromEntries(pitchPids.map(pid=>[pid,body.readUInt16LE(record.start+2*(i*record.words+pid))]))}]))});
  }
 }
 assert.equal(specimens.length,4);
 return {schemaVersion:1,source:{url:'https://www.fractalaudio.com/downloads/firmware-presets/fm3/10p0/FM3_Factory_Presets_10p0.zip',archiveSha256:'4da0ebf5f641e63c9cb900741fe34b001736116ac31f4eb51effc9d72ddb1f9f',banks},
  scope:'Factory file facts, not new hardware measurements. Only 27 Pitch words and structural coordinates retained. Labels/ranges come separately from FW13 cache. No factory preset redistribution or production support for old formats.',specimens};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=extractFactory(process.argv[2]);const out=new URL('../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-pitch-factory-evidence.json',import.meta.url);
 const content=JSON.stringify(result,null,2)+'\n';if(process.argv.includes('--write'))fs.writeFileSync(out,content);else assert.equal(fs.readFileSync(out,'utf8'),content);
 console.log(JSON.stringify({specimens:4,channels:16,words:432,checksums:true,deviceIO:false}));
}

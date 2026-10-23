import {fileURLToPath} from 'node:url';
// Offline Rotary A measured points; no device access or interpolation.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './rotary-collector/fm3-prototype.mjs';
import {pair,preflight} from './rotary-collector/rotary-check.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),check=(v,m)=>{if(!v)throw Error(m)};
const read=p=>fs.readFileSync(new URL(p,import.meta.url));
let verified;
function evidence(){
 if(verified)return verified;
 const bytes=read('../references/rotary-controls.json');
 check(sha(bytes)==='a395d4648515bb179d306af24a6a6a1eec0befe805f91f3c0d88088d7705bbe0','Rotary registry hash mismatch');
 const registry=JSON.parse(bytes),prefix='../references/'+registry.evidence+'/';
 for(const [file,hash] of Object.entries(registry.fileHashes))check(sha(read(prefix+file))===hash,'Evidence hash mismatch: '+file);
 let previous=preflight(read(prefix+'start.syx'));
 for(const s of registry.steps){
  const folder=fileURLToPath(new URL(prefix+s.capture+'/',import.meta.url));
  const p=pair(folder),current=preflight(read(prefix+s.capture+'/donor.syx'));
  check(p.syxSha256===s.proof.syxSha256,'Pair mismatch');
  const changes=current.words.flatMap((v,i)=>v===previous.words[i]?[]:[{pid:i,before:previous.words[i],after:v}]);
  check(JSON.stringify(changes)===JSON.stringify(s.changes),'Delta mismatch');previous=current;
 }
 const bases=new Set(Object.entries(registry.fileHashes).filter(([n])=>n.endsWith('.syx')).map(([,h])=>h));
 verified={registry,bases};return verified;
}
export function generateRotaryControls(base,spec){
 check(spec&&typeof spec==='object'&&!Array.isArray(spec),'Expected spec');
 check(Object.keys(spec).every(k=>['schemaVersion','firmware','baseProfile','rotaryA'].includes(k)),'Unknown spec field');
 check(spec.schemaVersion===1&&spec.firmware===13&&spec.baseProfile==='jb-rotary-controls','Unsupported profile');
 const values=spec.rotaryA;check(values&&typeof values==='object'&&!Array.isArray(values)&&Object.keys(values).length>0,'Expected rotaryA values');
 const {registry,bases}=evidence();check(bases.has(sha(base)),'Unsupported Rotary base');
 preflight(base);const before=inspectStructure(base),body=Buffer.from(before.raw.body),allowed=new Set(),controls=[];
 for(const [key,value] of Object.entries(values)){
  const control=registry.controls.find(x=>x.key===key);check(control,'Unsupported Rotary control');
  const point=control.points.find(x=>typeof value==='number'&&x.display===value);check(point,'Unmeasured Rotary value');
  const offset=9868+2*control.parameterId;allowed.add(offset);allowed.add(offset+1);body.writeUInt16LE(point.raw,offset);
  controls.push({key,value,parameterId:control.parameterId,raw:point.raw});
 }
 const syx=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(before.raw.rawPatch,body))),after=inspectStructure(syx);
 check(Buffer.from(after.raw.body).equals(body),'Output body mismatch');
 const changes=[];for(let i=0;i<body.length;i++)if(body[i]!==before.raw.body[i]){check(allowed.has(i),'Collateral change');changes.push(i);}
 check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
 for(let i=0;i<72;i++)if(i!==4&&i!==5)check(before.raw.rawPatch[i]===after.raw.rawPatch[i],'Raw header changed');
 const report={generator:'rotary-controls-0.1.0',spec,controls,baseSha256:sha(base),outputSha256:sha(syx),changedBodyOffsets:changes,checks:{pairedEvidence:true,frameChecksums:true,presetCrc:true,footer:true,exactBodyReadback:true,onlyRequestedAControlsChanged:true,headersPreserved:true},hardware:'Pending',audio:'Not evaluated',limitations:['Only measured points on channel A','Tempo None in pinned evidence bases','No interpolation or B-D control edits','Only pinned collected Rotary bases']};
 const txt=['FM3 ROTARY A KONTROLLKATSE — firmware 13',...controls.map(c=>c.key+': '+c.value),'Tempo: None. Kanalid B–D, kõik muud parameetrid ja stseenid säilivad.','Impordi SYX FM3-Editi tööpuhvrisse. Ava Rotary1 A ning kontrolli väärtusi.','Ära muuda väärtusi ega liiguta expression-pedaali enne eksporti.','Ekspordi terve preset nimega FM3_ROTARY_A_TEST_export.syx ja saada vestlusse.','Seadmeimport ja heli veel kontrollimata. Sisemine nimi säilib alusfailist.','SHA-256: '+report.outputSha256].join('\n')+'\n';
 return {syx,txt,report};
}

import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {compare} from './control-check.mjs';import {pair} from './drive-check.mjs';import {inspect} from './fm3-prototype.mjs';import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const base=fs.readFileSync(new URL('./baseline.syx',import.meta.url)),plan=JSON.parse(fs.readFileSync(new URL('./plan.json',import.meta.url)));
const mutate=(bytes,f)=>{const x=inspect(bytes),b=Buffer.from(x.raw.body);f(b);return Buffer.from(reencodeDumpFromRawPatch(bytes,reencodeRawPatch(x.raw.rawPatch,b)))};
assert.equal(plan.length,21);compare(base,base,0);
let prev=base;
for(let i=1;i<plan.length;i++){
 const s=plan[i],ch='ABCD'.indexOf(s.channel),offset=8460+88*ch;
 const next=mutate(prev,b=>{if(s.kind==='type'){b.writeUInt16LE(s.binaryId,offset);b.writeUInt16LE(ch,8424+b[0]*2);for(let p=1;p<=4;p++)b.writeUInt16LE(32767,offset+p*2)}else b.writeUInt16LE(Math.round(s.value/(s.field==='Mix'?100:10)*65534),offset+s.pid*2)});
 compare(prev,next,i);
 const bad=mutate(next,b=>{b[100]^=1});assert.throws(()=>compare(prev,bad,i));
 if(s.kind==='control')assert.throws(()=>compare(prev,prev,i));prev=next;
}
// Exercise the raw GET parser using an explicitly synthetic response.
const words=Array.from({length:176},(_,i)=>Buffer.from(inspect(prev).raw.body).readUInt16LE(8460+i*2));
const frame=(fn,data)=>{let a=[240,0,1,116,17,fn,...data];return [...a,a.reduce((x,y)=>x^y,0)&127,247]};
const frames=[frame(116,[118,0,48,1]),frame(117,[48,1,...words.flatMap(v=>[v&127,(v>>7)&127,v>>14])]),frame(118,[])];
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'drive-controls-test-'));
try{fs.writeFileSync(path.join(folder,'donor.syx'),prev);const capture={txHex:'f0000174111f76007df7',txCalls:1,txBytesWritten:10,rawRxHex:Buffer.from(frames.flat()).toString('hex')};fs.writeFileSync(path.join(folder,'capture.json'),JSON.stringify(capture));assert.equal(pair(folder).matchedWords,176);capture.txCalls=2;fs.writeFileSync(path.join(folder,'capture.json'),JSON.stringify(capture));assert.throws(()=>pair(folder));}finally{fs.rmSync(folder,{recursive:true,force:true})}
console.log('PASS: 21 steps; collateral/no-change rejection; synthetic 176-word GET pair; repeated GET rejected. No hardware accessed.');

const renamed=mutate(base,()=>{});
const original=inspect(base),raw=Buffer.from(original.raw.rawPatch);raw.fill(32,8,39);raw.write('00_BASELINE',8,'ascii');
const named=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(raw,Buffer.from(original.raw.body))));
assert.equal(compare(base,named,0).presetNameChange.after,'00_BASELINE');
raw[40]^=1;const badHeader=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(raw,Buffer.from(original.raw.body))));
assert.throws(()=>compare(base,badHeader,0));
console.log('PASS: preset name reported separately; other raw header mutations rejected.');

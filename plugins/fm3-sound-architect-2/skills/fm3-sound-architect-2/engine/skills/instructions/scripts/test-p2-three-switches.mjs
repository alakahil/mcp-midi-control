// Replay one completed hardware test. No MIDI, device access or fixture writes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';

const dir=fileURLToPath(new URL('../references/p2-three-switches-20261030/',import.meta.url));
const stem=path.join(dir,'FM3_P2_THREE_SWITCHES');
const read=suffix=>fs.readFileSync(stem+suffix);
const sha=b=>createHash('sha256').update(b).digest('hex');
const expected=read('.syx'),actual=read('_export.syx');
assert.equal(sha(expected),'fc9c2295540f3786c14b18cde08c572a1b8697f701395c45f5c058bb79d6806a');
assert.equal(sha(actual),'78eff4c0e6c87ee5105b853ae0d2cc8f48bdeaa0950cdec1d5bb020b3fe8afd0');
// Historical output keeps its original engine version; do not relabel it to
// pass the current engine's version-bound replay verifier. Check its hashes,
// then independently regenerate and verify a fresh current-version quartet.
const originalReport=JSON.parse(read('.validation.json'));
assert.equal(originalReport.generator,'fm3-sound-0.3.37');
assert.equal(originalReport.outputSha256,sha(expected));
assert.deepEqual(Object.keys(originalReport.artifacts).sort(),['.spec.json','.syx','.txt']);
for(const [ext,entry] of Object.entries(originalReport.artifacts))
 assert.deepEqual(entry,{sha256:sha(read(ext)),bytes:read(ext).length});
const spec=JSON.parse(read('.spec.json'));
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const generated=createPreset(base,spec);
assert.deepEqual(generated.syx,expected,'Current generator changed the tested preset');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-p2-'));
try {
 const output=path.join(tmp,'P2');
 writePresetOutputs(output,generated,spec);
 verifyPresetOutputs(output);
 assert.deepEqual(fs.readFileSync(output+'.syx'),expected);
} finally {fs.rmSync(tmp,{recursive:true,force:true});}

const decode=bytes=>{
 const p=inspectStructure(bytes);
 assert.equal(p.raw.crcValid,true);
 assert.equal(p.decoded.preset_name,'FM3 P2 THREE SWITCHES');
 const body=Buffer.from(p.raw.body);
 assert.equal(body.length,12804);
 return {p,body};
};
const e=decode(expected),a=decode(actual);
assert.equal(e.body[0],0);
const saved=Buffer.from(e.body);saved[0]=3;
// For this captured export there is no record reorder or parameter exception.
const checkExport=bytes=>assert.deepEqual(decode(bytes).body,saved,
 'P2 export differs beyond selected scene 1 -> 4');
checkExport(actual);
const diffs=[];
for(let i=0;i<e.body.length;i++)if(e.body[i]!==a.body[i])diffs.push({offset:i,expected:e.body[i],actual:a.body[i]});
assert.deepEqual(diffs,[{offset:0,expected:0,actual:3}]);

// Independent raw checks of all three definitions, all overrides and scene words.
const L=a.body.length,D=L-3052,u16=offset=>a.body.readUInt16LE(offset);
for(let k=0;k<3;k++){
 assert.equal(u16(D+2*k),7);
 assert.equal(u16(D+48+2*k),[1,0,1][k]);
 assert.deepEqual(Array.from({length:6},(_,n)=>u16(D+144+12*k+2*n)),[k+1,0,0,0,0,0]);
}
assert.equal(u16(D+2136),3);
for(let i=0;i<108;i++)assert.equal(u16(D+1920+2*i),i<3?i:65535);
for(let cs=1;cs<=6;cs++)for(let scene=1;scene<=8;scene++){
 const value=[2,4].includes(cs)&&scene===2?0:[2,4].includes(cs)&&scene===3?2:1;
 assert.equal(u16(L-482+(cs-1)*16+(scene-1)*2),value);
}

const receipt=JSON.parse(fs.readFileSync(path.join(dir,'receipt.json')));
assert.equal(receipt.generator.version,'0.3.37');
assert.equal(receipt.status,'completed_passed');
assert.equal(receipt.passed,true);
assert.equal(receipt.export.sha256,sha(actual));
assert.deepEqual(receipt.decodedBody.bodyDiff,diffs);
assert.deepEqual(receipt.userObservations.map(x=>x.confirmation),[
 'Imporditud, määrangud klapivad','algseis ja kõik kolm katset klapivad',
 'kõik viis sammu klapivad','Tegin, 4. stseen'
]);
assert.equal(receipt.storeReload.confirmed,true);
assert.equal(receipt.storeReload.sceneOnReturn,4);
assert.equal(receipt.firmwareReconfirmedThisSession,false);
assert.deepEqual(receipt.pendingUserConfirmation,[]);
assert.deepEqual(receipt.notProven,['all 24 assignments on hardware','other layouts','audio quality or CPU measurement']);

// Recompute valid envelopes/CRC after each mutation: semantic damage must fail too.
const rewrite=fn=>{const b=Buffer.from(saved);fn(b);return Buffer.from(
 reencodeDumpFromRawPatch(expected,reencodeRawPatch(e.p.raw.rawPatch,b)));};
const records=scanRecords(saved),amp=records.records.find(r=>r.family==='amp');
const cab=records.records.find(r=>r.family==='cab');
const offsets=[0,D,D+48,D+144,D+146,D+156,D+168,D+1920,D+1922,D+1924,D+2136,
 L-482,L-482+16,L-482+30,280,1584,1680,1714,amp.start+160,cab.start,records.tail+2,amp.start+82];
for(const offset of offsets)assert.throws(()=>checkExport(rewrite(b=>b.writeUInt16LE(b.readUInt16LE(offset)^1,offset))));
for(const broken of [Buffer.alloc(0),actual.subarray(0,100),Buffer.from(actual).fill(0,100,200)])
 assert.throws(()=>checkExport(broken));
console.log(JSON.stringify({passed:true,currentGeneratorReplay:true,historicalQuartetHashesVerified:true,
 exportBodyBytes:L,bodyDiff:diffs,negativeCases:offsets.length+3,hardwareIO:false,
 scope:'Offline replay of user-confirmed P2; Layout 1 switches 1–3 only. No new device, audio or CPU test.'}));

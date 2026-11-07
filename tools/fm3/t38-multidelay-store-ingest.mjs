// Receipt for the 2026-11-07 T38 Multi Delay Type STORE/reload check (multidelayTypes, 0.3.56). Offline.
// FM3_BIND_STORE.py --load sent "T38 MD STORE" (A Ya-Ya Delay + Mix 30 %, B Space Tape, C L-C-R-C, D Centaurus X-3)
// to the edit buffer (7F 00). Jan STOREd it on the FM3, selected another preset, came back and answered again;
// --verify read that location with the read-only stored dump (fn=0x03). Scripts never stored or set.
// Finding: every block's channel data (all four Multi Delay channels, 484 words) and every decoded field survive
// STORE/reload unchanged; the FM3 only re-orders the block records (the inserted Multi Delay record, appended last
// by the generator, is stored after Send), so the bodies are not byte-identical while their content is.
// Usage: node tools/fm3/t38-multidelay-store-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-07/t38/');
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const {scanRecords}=await import(path.join(ENG,'scripts/fm3-layout.mjs'));
const {multidelayType}=await import(path.join(ENG,'scripts/fm3-multidelay-types.mjs'));
const {createPreset}=await import(path.join(ENG,'scripts/fm3-preset.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const mf=path.join(RAW,'manifest.json'),lf=path.join(RAW,'bind-store-load.json'),rf=path.join(RAW,'bind-store-results.json');
const mb=fs.readFileSync(mf),m=JSON.parse(mb),ld=J(lf),res=J(rf);
assert.equal(m.kind,'fm3-bind-store');assert.equal(m.test,'T38');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t38-'));let syx,rebuilt,spec;
try{execFileSync('node',[path.join(ROOT,'tools/fm3/t38-multidelay-store-build.mjs'),tmp],{stdio:'ignore'});
  const d=path.join(tmp,'FM3_T38_MDSTORE');rebuilt=fs.readFileSync(path.join(d,'manifest.json'));syx=fs.readFileSync(path.join(d,m.preset.file));spec=J(path.join(d,'T38_MD_STORE.spec.json'));}
finally{fs.rmSync(tmp,{recursive:true,force:true});}
assert.ok(rebuilt.equals(mb),'pack rebuilt identically');assert.equal(sha(syx),m.preset.sha256);
assert.equal(ld.kind,'fm3-bind-store-load');assert.equal(ld.packSha256,sha(mb));assert.equal(ld.userConfirmedName,true);
assert.equal(res.kind,'fm3-bind-store-results');assert.equal(res.packSha256,sha(mb));
const SEEN={types:m.expect.types,sound:'ok'};
assert.deepEqual(res.beforeStore,SEEN,'readings before STORE');assert.deepEqual(res.afterReload,SEEN,'readings after reload');assert.equal(res.note,'');
assert.equal(res.shownLocation,427);assert.equal(res.index,426);assert.deepEqual(res.frameKinds,[0x77,...Array(8).fill(0x78),0x79]);

const dev=Buffer.concat(res.storedDumpFrames.map(h=>Buffer.from(h,'hex')));
const G=inspectStructure(syx),S=inspectStructure(dev);
assert.equal(S.raw.crcValid,true);assert.equal(String(S.decoded.preset_name).trim(),m.confirmName);
const gen=Buffer.from(G.raw.body),stored=Buffer.from(S.raw.body);
assert.equal(stored.length,gen.length);assert.equal(gen.equals(stored),false,'re-ordered, so not byte-identical (update this receipt if that changes)');
const rg=scanRecords(gen,{requireAmpCab:false}),rs=scanRecords(stored,{requireAmpCab:false});
const order=r=>r.records.map(x=>x.eid);
assert.deepEqual([...order(rg)].sort((a,b)=>a-b),[...order(rs)].sort((a,b)=>a-b),'same block records');
const firstRec=rg.records[0].start;assert.ok(gen.subarray(0,firstRec).equals(stored.subarray(0,rs.records[0].start)),'header (scenes, grid, names) identical');
for(const x of rg.records){const y=rs.records.find(z=>z.eid===x.eid),n=x.channels*x.words*2;
  assert.deepEqual([y.channels,y.words],[x.channels,x.words],'record '+x.eid);
  assert.ok(gen.subarray(x.start,x.start+n).equals(stored.subarray(y.start,y.start+n)),'channel data of record '+x.eid);}
const endOf=r=>{const l=r.records.at(-1);return l.start+l.size};
assert.ok(gen.subarray(endOf(rg)).equals(stored.subarray(endOf(rs))),'tail identical');
const norm=d=>Object.fromEntries(d.blocks.map(({offset,params_offset,...b})=>[b.block,JSON.stringify(b)]));
assert.deepEqual(norm(S.decoded),norm(G.decoded),'every decoded block identical apart from its offset');
for(const k of ['scene_names','grid','amp1','modifiers','scene_controllers'])assert.deepEqual(S.decoded[k],G.decoded[k],k);
const md=rs.records.find(x=>x.eid===74);
const mix=Number(m.expect.mixA.replace(/\D/g,''));
m.multidelayTypes.forEach(({channel,type,index},k)=>{const img=multidelayType(type).words,got=[...Array(121).keys()].map(i=>stored.readUInt16LE(md.start+2*(k*121+i)));
  assert.equal(got[114],index,channel+' Type word');const diff=img.map((w,i)=>w!==got[i]?i:-1).filter(i=>i>=0);
  assert.ok(channel==='A'?diff.length===1:diff.length===0,channel+' '+type+' image');});
// 0.3.58: the same spec with the device record order (fm3-record-order) reproduces the stored body byte for byte.
assert.equal(spec.recordOrder,'append','T38 pack was built with the pre-0.3.58 order');
const {recordOrder:_,...deviceSpec}=spec;
const NEWLOOK=fs.readFileSync(path.join(ENG,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'));
const devOrder=Buffer.from(createPreset(NEWLOOK,deviceSpec).syx),devBody=Buffer.from(inspectStructure(devOrder).raw.body);
assert.ok(devBody.equals(stored),'device record order reproduces the stored body');
const blocksStored=S.decoded.blocks.map(b=>b.block),blocksGen=G.decoded.blocks.map(b=>b.block);
const mt=S.decoded.blocks.find(b=>b.block==='MultiTap');assert.deepEqual(mt.scene_channels.slice(0,4),['A','B','C','D']);

const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-11-07',test:'T38',generator:'fm3-sound 0.3.56',
 method:m.method,builder:'tools/fm3/t38-multidelay-store-build.mjs',collector:'FM3_BIND_STORE.py --load / --verify',packSha256:sha(mb),presetSha256:m.preset.sha256,
 types:m.multidelayTypes,mixA:m.expect.mixA,
 storeLocation:{planned:'424..426',reported:427,index:426,note:'The user stored to 427 (outside the planned 424..426); 427 held the T34A CTRL SCENES test preset, which is regenerable from tools/fm3/t34-controllers-sources-build.mjs.'},
 result:{beforeStore:res.beforeStore,afterReload:res.afterReload,storedDumpFrames:res.frameKinds.length,
  multidelayWords:'484/484 equal after STORE',allChannelDataEqual:true,decodedBlocksEqual:true,bodyByteIdentical:false,bodyBytes:stored.length,
  deviceRecordOrderBodyByteIdentical:true,
  recordOrder:{generated:blocksGen,stored:blocksStored}},
 findings:{storeRoundTrip:'multidelayTypes channel templates (and the Mix control on A, and the scene channels) survive STORE and reload unchanged.',
  recordOrder:'On STORE the FM3 writes the block records in its own order: the inserted Multi Delay record (appended last by the generator) is stored after Send. Each record keeps its channel data; only the per-record link words (next record id, its scene channels and size) differ. Loading the generator order works (T36/T38 load), so this is cosmetic. Since 0.3.58 the generator uses the device order (fm3-record-order): the same spec now produces the stored body byte for byte.'},
 meaning:'multidelayTypes is device-confirmed for load + edit buffer (T36) and STORE/reload (T38).',
 files:[rel(mf),rel(lf),rel(rf)],
 notMeasured:['Types other than the eight in T36/T38 on the device through the generator (their images are the T35 reads)']};
const target=path.join(ENG,'references','fm3-t38-multidelay-store-20261107.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T38 receipt stale');
console.log(JSON.stringify({ok:true,words:484,location:427,order:blocksStored}));

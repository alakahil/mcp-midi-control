// Receipt for the 2026-11-06 T32 test (audit H1): one complete usage preset on the device. Offline.
// The packs are rebuilt (tools/fm3/t32-live-build.mjs) and must match the manifest SHA-256 values recorded by the
// collectors. Nothing was stored by a script; the user STOREd the preset to location 424 himself.
//   Part 1 (FM3_CPU_SCENES.py): the user selected scenes 1..8, listened and the CPU meter was read after each.
//   Part 2 (FM3_BIND_STORE.py): the user STOREd to 424, selected another preset, came back; the script read 424
//     with the read-only stored dump (fn=0x03). The stored body is compared with the generated one.
//   T32B (FM3_BIND_STORE.py --load): Amp C Level -14 -> -10 dB; the user listened and answered in the chat.
// Listening verdicts were given in the chat (the collectors' notes say "ok"); the exact texts are kept below.
// Usage: node tools/fm3/t32-live-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-06/');
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const {scanRecords}=await import(path.join(ENG,'scripts/fm3-layout.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex'),r1=x=>Math.round(x*10)/10;
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t32-'));execFileSync('node',[path.join(ROOT,'tools/fm3/t32-live-build.mjs'),tmp],{stdio:'ignore'});
const pack=d=>{const b=fs.readFileSync(path.join(tmp,d,'manifest.json'));return {bytes:b,m:JSON.parse(b)};};
const live=pack('FM3_T32_LIVE'),store=pack('FM3_T32_STORE'),level=pack('FM3_T32B_LEVEL');
const syx=fs.readFileSync(path.join(tmp,'FM3_T32_STORE','LIVE.syx'));
const finalSyx=fs.readFileSync(path.join(tmp,'FM3_T32C_FINAL','LIVE_KOOSLUS_V1.syx'));
fs.rmSync(tmp,{recursive:true,force:true});
assert.equal(sha(syx),live.m.preset.sha256);assert.equal(sha(syx),store.m.preset.sha256);

// ---- Part 1: CPU and listening per scene ----
const liveFile=path.join(RAW,'fm3-t32-live-20261106-results.json'),res=J(liveFile);
assert.equal(res.kind,'fm3-cpu-scenes-results');assert.equal(res.packSha256,sha(live.bytes),'LIVE pack rebuilt identically');
assert.equal(res.userConfirmedName,true);assert.equal(String(res.sceneAfterLoad).trim(),'1');
assert.deepEqual(res.steps.map(s=>s.scene),[1,2,3,4,5,6,7,8]);
for(const s of res.steps){assert.ok(/^ok$/i.test(s.userNote.trim()),'scene '+s.scene+' selected');assert.ok(s.raw!==null&&s.reads.slice(-3).every(v=>v===s.raw),'settled '+s.scene);}
const est=live.m.estimate.perScene;
const scenes=res.steps.map(s=>({scene:s.scene,name:live.m.sceneNames[s.scene-1],estimatePercent:est[s.scene-1],measuredPercent:s.cpuPercent,errorPoints:r1(est[s.scene-1]-s.cpuPercent)}));
assert.equal(res.afterLoad.cpuPercent,71,'after load (scene 1)');
for(const s of scenes)assert.ok(Math.abs(s.errorPoints)<=1.5,'estimate within 1.5 points, scene '+s.scene);
assert.ok(Math.max(...scenes.map(s=>s.measuredPercent))<live.m.estimate.limitPercent,'under the safe limit');

// ---- Part 2: STORE 424 -> another preset -> back ----
const loadFile=path.join(RAW,'fm3-t32-store-20261106-load.json'),storeFile=path.join(RAW,'fm3-t32-store-20261106-results.json');
const ld=J(loadFile),st=J(storeFile);
assert.equal(ld.packSha256,sha(store.bytes),'STORE pack rebuilt identically');assert.equal(ld.userConfirmedName,true);
assert.equal(st.kind,'fm3-bind-store-results');assert.equal(st.packSha256,sha(store.bytes));
assert.equal(st.shownLocation,424);assert.equal(st.index,423);assert.deepEqual(st.frameKinds,[0x77,...Array(8).fill(0x78),0x79]);
assert.deepEqual(st.beforeStore,{scenes:'ok',multidelay:'j'});assert.deepEqual(st.afterReload,{scenes:'j',multidelay:'j'});
const dev=Buffer.concat(st.storedDumpFrames.map(h=>Buffer.from(h,'hex'))),a=inspectStructure(syx),b=inspectStructure(dev);
assert.equal(String(b.decoded.preset_name).trim(),live.m.confirmName);
const A=Buffer.from(a.raw.body),B=Buffer.from(b.raw.body);assert.equal(A.length,B.length);
const ra=scanRecords(A),rb=scanRecords(B);assert.equal(ra.records.length,rb.records.length);
assert.ok(A.subarray(0,ra.records[0].header).equals(B.subarray(0,rb.records[0].header)),'prefix (selected scene, modifiers) identical');
assert.ok(A.subarray(ra.tail).equals(B.subarray(rb.tail)),'tail identical');
const order=[];
for(const x of ra.records){const y=rb.records.find(r=>r.eid===x.eid);assert.ok(y,'record kept '+x.family);
  assert.ok(A.subarray(x.header,x.header+x.size).equals(B.subarray(y.header,y.header+y.size)),'record bytes identical '+x.family);
  const gi=ra.records.indexOf(x),si=rb.records.indexOf(y);if(gi!==si)order.push({family:x.family,effectId:x.eid,generatedIndex:gi,storedIndex:si});}
assert.deepEqual(order.map(o=>o.family),['in1','out1','reverb','multidelay'],'only the Multi Delay record moved (7th) and the three after it shifted');

// ---- T32B level + the user's verdicts ----
const lvFile=path.join(RAW,'fm3-t32b-level-20261106-load.json'),lv=J(lvFile);
assert.equal(lv.packSha256,sha(level.bytes),'T32B pack rebuilt identically');assert.equal(lv.userConfirmedName,true);
const verdicts=[
 {after:'T32 part 1 and 2',at:'2026-11-06T13:03:24Z',text:'Lead stseenid 3 ja 7 olid võrreldes teistega liiga vaiksed, muus osas oli kõik hästi ja sound vastas kirjeldusele',ampCLevelDb:-14},
 {after:'T32B',at:'2026-11-06T13:11:10Z',text:'umbes 2 dB juurde veel, siis on sama helitugevus, mis teistel',ampCLevelDb:-10}];

const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-11-06',test:'T32',auditItem:'H1',
 method:'Jan in Terminal. Part 1: FM3_CPU_SCENES.py loaded the generated preset into the edit buffer (7F 00); Jan selected scenes 1..8, listened and the script read the CPU meter (fn=0x01 sub=0x2E). Part 2: FM3_BIND_STORE.py --load; Jan STOREd to 424 on the FM3, selected another preset and came back; --verify read 424 with the read-only stored dump (fn=0x03). T32B: --load only, Jan listened. Scripts never stored or set.',
 preset:{name:live.m.confirmName,sha256:sha(syx),builder:'tools/fm3/t32-live-build.mjs',scenes:live.m.sceneNames},
 cpu:{packSha256:sha(live.bytes),results:rel(liveFile),model:live.m.estimate.model,scenes,maxErrorPoints:Math.max(...scenes.map(s=>Math.abs(s.errorPoints))),
  meaning:'fm3-cpu 0.2.4 estimate for this composition agreed with the meter within 1.5 points in all 8 scenes (estimate slightly high); 71 % max (safe limit 80 %).'},
 store:{packSha256:sha(store.bytes),load:rel(loadFile),results:rel(storeFile),location:424,checks:{beforeStore:st.beforeStore,afterReload:st.afterReload},
  storedVsGenerated:{bodyBytes:A.length,bodyByteIdentical:A.equals(B),prefixIdentical:true,tailIdentical:true,allRecordBytesIdentical:true,reordered:order},
  meaning:'STORE/reload kept every byte of all 11 block records, the prefix and the tail; the FM3 only stored the Multi Delay record earlier in the record list.'},
 level:{packSha256:sha(level.bytes),load:rel(lvFile),verdicts,finalAmpCLevelDb:-8,finalPreset:{name:'LIVE KOOSLUS V1',sha256:sha(finalSyx)},
  meaning:'Amp C template level (-14 dB) was about 6 dB low against Amp A/B/D (-8..-9 dB) for this composition. The -8 dB final level follows the user\'s estimate and was not listened to separately.'},
 notMeasured:['audio of LIVE KOOSLUS V1 at -8 dB (set from the user\'s estimate)','loudness in dB (ears only)','Out 2','footswitches']};
const target=path.join(ENG,'references','fm3-t32-live-20261106.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T32 receipt stale');
console.log(JSON.stringify({cpu:scenes.map(s=>`S${s.scene} ${s.estimatePercent}/${s.measuredPercent}`),reordered:order.map(o=>o.family),final:out.level.finalPreset}));

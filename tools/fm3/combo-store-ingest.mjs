// Receipt for the 2026-10-29 combined bindings + Out 2 STORE/reload check (FM3_BIND_STORE.py, test T11). Offline.
// The pack is rebuilt (tools/fm3/combo-store-build.mjs) to the manifest the device run used. The user read the
// bindings and the Out 2 grid cell on the FM3 front panel, STOREd the preset himself to his test location,
// reloaded it and read them again; the script then read that location (fn=0x03, read only). The stored body is
// compared with the generated one: everything before and after the block records, and every block record word.
// Usage: node tools/fm3/combo-store-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-10-29/');
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const {readModifiers}=await import(path.join(ENG,'scripts/fm3-parameter-dependencies.mjs'));
const {scanRecords,readGrid}=await import(path.join(ENG,'scripts/fm3-layout.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=path.join(RAW,'fm3-combo-store-20261029-results.json'),loadFile=path.join(RAW,'fm3-combo-store-20261029-load.json');
const audioFile=path.join(RAW,'fm3-out2-audio-20261029.json');
const res=JSON.parse(fs.readFileSync(file,'utf8')),load=JSON.parse(fs.readFileSync(loadFile,'utf8')),audio=JSON.parse(fs.readFileSync(audioFile,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t11-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/combo-store-build.mjs'),tmp],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'manifest.json')),m=JSON.parse(mb),ref=fs.readFileSync(path.join(tmp,m.preset.file));
for(const r of [res,load])assert.equal(sha(mb),r.packSha256,'pack rebuilt identically');
assert.ok(load.userConfirmedName,'edit-buffer load confirmed');
// Front-panel readings, as typed (the FM3 list number is the source code + 1).
const expected={volumeRange:'2.50 7.50',brightInvert:'54 Control Switch 3, ON / OFF',fatChannel:'55 Control Switch 4, CHAN D',boostSource:'52 Control Switch 2',wahSource:'15 External 1',out2Layout:'Out 2',out2Audio:'-'};
for(const when of ['beforeStore','afterReload'])assert.deepEqual(Object.fromEntries(Object.keys(expected).map(k=>[k,String(res[when][k]).trim()])),expected,when);
assert.equal(res.index,res.shownLocation-1,'Display Offset 1');
assert.deepEqual(res.frameKinds,[0x77,...Array(8).fill(0x78),0x79]);
const dev=Buffer.concat(res.storedDumpFrames.map(h=>Buffer.from(h,'hex'))),a=inspectStructure(ref),b=inspectStructure(dev);
assert.ok(b.raw.crcValid&&b.decoded.preset_name===m.confirmName,'stored dump: CRC valid, same name');
const A=Buffer.from(a.raw.body),B=Buffer.from(b.raw.body);assert.equal(A.length,B.length);
const ra=scanRecords(A),rb=scanRecords(B);
assert.ok(A.subarray(0,ra.records[0].header).equals(B.subarray(0,rb.records[0].header)),'everything before the block records (grid, selected scene, 32 modifier records) identical');
assert.ok(A.subarray(ra.tail).equals(B.subarray(rb.tail)),'everything after the block records identical');
const records=ra.records.map((x,i)=>{const y=rb.records.find(r=>r.eid===x.eid);assert.ok(y&&y.size===x.size,x.family+' stored');
  let diffs=0;for(let o=0;o<x.size;o+=2)if(A.readUInt16LE(x.header+o)!==B.readUInt16LE(y.header+o))diffs++;
  return {family:x.family,eid:x.eid,generatedIndex:i,storedIndex:rb.records.indexOf(y),diffs};});
assert.deepEqual(records.filter(r=>r.diffs).map(r=>r.family),[],'every block record identical word for word');
const moved=records.filter(r=>r.generatedIndex!==r.storedIndex).map(({family,generatedIndex,storedIndex})=>({family,generatedIndex,storedIndex}));
assert.deepEqual(moved.map(r=>r.family),['wah','volpan'],'only Wah and Volume/Pan change places (as in T9)');
const mods=readModifiers(B).filter(x=>x.active).map(x=>({record:x.record,source:x.sourceName,effectId:x.effectId,pid:x.pid,channel:x.channelScope}));
assert.deepEqual(mods,m.bindings);
const out2=readGrid(B).filter(g=>g.id===43).map(g=>({row:g.row+1,column:g.col+1,mask:g.mask}));
assert.deepEqual(out2,[{row:m.out2.row,column:m.out2.column,mask:4}]);
assert.equal(audio.preset.shownLocation,res.shownLocation);assert.equal(audio.preset.name,m.confirmName);
assert.match(audio.readings.first,/Effektid on samad/);assert.match(audio.readings.afterRaisingOut2Knob,/sama valjusega/);
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-29',test:'T11',
  preset:{name:m.confirmName,generator:'0.3.33 (composer Wah + volumePedal {min,max} + controlSwitches incl. invert/channel + grid with Out 2 duplicate)',sha256:m.preset.sha256,bindings:mods,out2:{...m.out2,storedCell:out2[0]}},
  method:'Edit-buffer load (7F 00) by the script; the user read the bindings and the LAYOUT cell on the FM3 front panel, STOREd the preset himself, selected another preset and back, and read them again. The script then read the stored location with fn=0x03 (read-only). The script never stored or set anything.',
  readings:{beforeStore:expected,afterReload:expected,note:'out2Audio "-": nothing connected to Out 2 during the run; checked afterwards, see out2Audio',
    out2Audio:{...audio.readings,method:audio.method,result:'Out 2 carries the same processed signal as Out 1 and, with the Out 2 level knob raised, the same loudness. The first quieter reading was the Out 2 knob turned down, not the preset.'}},
  storedLocation:{shown:res.shownLocation,index:res.index},
  storedVsGenerated:{bodyBytes:A.length,beforeRecordsIdentical:true,afterRecordsIdentical:true,blockRecordWordDiffs:0,
    recordOrder:{moved,meaning:'the FM3 stores Volume/Pan 1 before Wah 1; the generated file has Wah first. Record contents are equal.'}},
  findings:['All five bindings survive STORE and reload unchanged: External 1 -> Wah (record 0), External 1 -> Volume with Min 2.50 / Max 7.50 (record 1), Control Switch 2 -> Input Boost, Control Switch 3 -> Bright inverted (Min ON / Max OFF), Control Switch 4 -> Fat on CHAN D only.',
    'Out 2 (effect ID 43) under Out 1 at row 4 column 12 is shown in LAYOUT and survives STORE; its grid cell and block record are stored as generated.',
    'Out 2 audio (follow-up, stored preset 425): the same effects as Out 1 and the same loudness once the Out 2 level knob was raised; the earlier quieter reading came from that knob being down.',
    'Apart from the Wah / Volume/Pan record order (the same reordering as T9) the stored body equals the generated body word for word. Unlike T9, the Wah Scene 1 bypass word was not changed, because the pedal was not moved before STORE.'],
  notMeasured:['Out 2 stereo (only Out 2 L connected)','Control Switch switching (no footswitch assigned to Control Switches 2-4; see T13)'],
  resultsSha256:sha(fs.readFileSync(file)),loadSha256:sha(fs.readFileSync(loadFile)),out2AudioSha256:sha(fs.readFileSync(audioFile))};
const target=path.join(ENG,'references/fm3-combo-store-20261029.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'combo store receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});console.log(JSON.stringify({bindings:mods.length,out2:out2[0],storedLocation:res.shownLocation,moved:moved.length}));

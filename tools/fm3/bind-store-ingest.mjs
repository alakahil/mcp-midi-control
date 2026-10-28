// Receipt for the 2026-10-28 modifier bindings STORE/reload check (FM3_BIND_STORE.py, test T9). Offline.
// The pack is rebuilt to the manifest the device run used. The user read Source 1 of the four bindings on
// the FM3 front panel and moved the pedal, STOREd the preset himself, reloaded it and checked again; the
// script then read the stored location (fn=0x03, read only). The stored body is compared with the
// generated one: modifier region and every block record word for word; record order and the per-scene
// bypass words are reported separately.
// Usage: node tools/fm3/bind-store-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-10-28/');
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const {readModifiers}=await import(path.join(ENG,'scripts/fm3-parameter-dependencies.mjs'));
const {scanRecords}=await import(path.join(ENG,'scripts/fm3-layout.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=path.join(RAW,'fm3-bind-store-20261028-results.json'),loadFile=path.join(RAW,'fm3-bind-store-20261028-load.json');
const res=JSON.parse(fs.readFileSync(file,'utf8')),load=JSON.parse(fs.readFileSync(loadFile,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-bst-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/bind-store-build.mjs'),tmp],{stdio:'ignore'});
const m=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8')),ref=fs.readFileSync(path.join(tmp,m.preset.file));
for(const r of [res,load])assert.equal(sha(fs.readFileSync(path.join(tmp,'manifest.json'))),r.packSha256,'pack rebuilt identically');
assert.ok(load.userConfirmedName,'edit-buffer load confirmed');
// Front-panel readings (the user typed the names; "Swich" is his spelling of Switch).
const norm=s=>String(s).trim().replace(/Swich/i,'Switch');
const expected={wahSource:'External 1',volumeSource:'External 1',boostSource:'Control Switch 2',brightSource:'Control Switch 3',pedal:'mõlemad'};
for(const when of ['beforeStore','afterReload'])for(const [k,v] of Object.entries(expected))assert.equal(norm(res[when][k]),v,when+' '+k);
assert.equal(res.beforeStore.switches.trim(),'-');assert.equal(res.afterReload.switches.trim(),'-');
assert.equal(res.index,res.shownLocation-1,'Display Offset 1');
const dev=Buffer.concat(res.storedDumpFrames.map(h=>Buffer.from(h,'hex'))),a=inspectStructure(ref),b=inspectStructure(dev);
assert.ok(b.raw.crcValid&&b.decoded.preset_name===m.confirmName,'stored dump: CRC valid, same name');
const A=Buffer.from(a.raw.body),B=Buffer.from(b.raw.body);assert.equal(A.length,B.length);
const ra=scanRecords(A),rb=scanRecords(B);
assert.ok(A.subarray(0,ra.records[0].header).equals(B.subarray(0,rb.records[0].header)),'everything before the block records (incl. selected scene and the 32 modifier records) identical');
assert.ok(A.subarray(ra.tail).equals(B.subarray(rb.tail)),'everything after the block records identical');
const records=ra.records.map(x=>{const y=rb.records.find(r=>r.eid===x.eid);assert.ok(y&&y.size===x.size,x.family+' stored');
  const diffs=[];for(let o=0;o<x.size;o+=2){const p=A.readUInt16LE(x.header+o),q=B.readUInt16LE(y.header+o);if(p!==q)diffs.push({headerByte:o,generated:p,stored:q});}
  return {family:x.family,generatedIndex:ra.records.indexOf(x),storedIndex:rb.records.indexOf(y),diffs};});
const changed=records.filter(r=>r.diffs.length);
assert.deepEqual(changed.map(r=>[r.family,r.diffs]),[['wah',[{headerByte:26,generated:1,stored:0}]]],'only the Wah Scene 1 bypass word differs');
const moved=records.filter(r=>r.generatedIndex!==r.storedIndex).map(r=>({family:r.family,generatedIndex:r.generatedIndex,storedIndex:r.storedIndex}));
assert.deepEqual(moved.map(r=>r.family),['wah','volpan'],'only Wah and Volume/Pan change places');
const mods=readModifiers(B).filter(x=>x.active).map(x=>({record:x.record,source:x.sourceName,effectId:x.effectId,pid:x.pid,channel:x.channelScope}));
assert.deepEqual(mods.map(x=>[x.record,x.source,x.effectId,x.pid]),m.bindings.map(x=>[x.record,x.source,x.effectId,x.pid]));
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-28',
  preset:{name:m.confirmName,generator:'0.3.30 (composer Wah + volumePedal + controlSwitches)',sha256:m.preset.sha256,bindings:mods},
  method:'Edit-buffer load (7F 00) by the script; the user read Source 1 of each bound parameter on the FM3 front panel and moved the expression pedal, STOREd the preset himself, selected another preset and back, and checked again. The script then read the stored location with fn=0x03 (read-only). The script never stored or set anything.',
  readings:{beforeStore:Object.fromEntries(Object.keys(expected).map(k=>[k,norm(res.beforeStore[k])])),afterReload:Object.fromEntries(Object.keys(expected).map(k=>[k,norm(res.afterReload[k])])),
    controlSwitchFootswitch:'not assigned; switching not checked'},
  storedLocation:{shown:res.shownLocation,index:res.index},
  storedVsGenerated:{bodyBytes:A.length,modifierRegionIdentical:true,beforeRecordsIdentical:true,afterRecordsIdentical:true,
    recordContentDiffs:changed.map(r=>({family:r.family,diffs:r.diffs.map(d=>({...d,meaning:'Scene 1 bypass word (header byte 26): 1 = bypassed in the file, 0 = engaged when stored'}))})),
    recordOrder:{moved,meaning:'the FM3 stores Volume/Pan 1 before Wah 1; the generated file has Wah first. Record contents are equal.'}},
  findings:['All four bindings survive STORE and reload: Wah and Volume on External 1 (records 0 and 1), Input Boost on Control Switch 2, Bright on Control Switch 3; the pedal moved both Wah Control and Volume before and after.',
    'The 32 modifier records of the stored preset equal the generated ones word for word.',
    'The Wah Scene 1 bypass word was stored as engaged (0) instead of the file value (1). The Wah binding has the base Auto-Engage word (2), so moving the pedal engaged the Wah before STORE; the FM3 stores the current state, like the selected scene in T2.',
    'The FM3 reorders the Wah and Volume/Pan block records when storing; their contents are unchanged.'],
  notMeasured:['Control Switch switching (no footswitch assigned to Control Switch 2/3)','audio','Auto-Engage behaviour itself (word 2 not displayed in this run)'],
  resultsSha256:sha(fs.readFileSync(file)),loadSha256:sha(fs.readFileSync(loadFile))};
const target=path.join(ENG,'references/fm3-bind-store-20261028.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'binding store receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});console.log(JSON.stringify({bindings:mods.length,storedLocation:res.shownLocation,recordDiffs:changed.length,moved:moved.length}));

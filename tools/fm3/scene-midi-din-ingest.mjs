// Receipt for the 2026-10-26 Scene MIDI check on the MIDI OUT jack (FM3_SCENE_MIDI_DIN.py, test T1). Offline.
// Usage: node tools/fm3/scene-midi-din-ingest.mjs [--write]
// The pack is rebuilt (channel 1) to the manifest the device run used. Receiver: the user's Line 6 Helix
// (MIDI base channel 1, PC receive on) on the FM3 MIDI OUT jack; the user read its screen after each step.
// A first run (aborted before step 1 because a scene was selected wrongly) is kept as a second
// observation of the load behaviour only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const REF=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=path.join(REF,'fm3-scene-midi-din-20261026-results.json'),res=JSON.parse(fs.readFileSync(file,'utf8'));
const abFile=path.join(REF,'fm3-scene-midi-din-20261026-aborted-results.json'),ab=JSON.parse(fs.readFileSync(abFile,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-smd-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/scene-midi-din-build.mjs'),tmp],{stdio:'ignore'});
const m=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8'));
for(const r of [res,ab])assert.equal(sha(fs.readFileSync(path.join(tmp,'manifest.json'))),r.packSha256,'pack rebuilt identically');
assert.equal(m.channel,1);
// Helix screen reading "02B snapshot 3" -> {preset, snapshot}
const read=s=>{const x=/^(\d\d[A-D])\s+snapshot\s+(\d)$/i.exec(String(s).trim());assert.ok(x,'unreadable receiver note: '+s);return {preset:x[1].toUpperCase(),snapshot:Number(x[2])};};
const before=read(res.receiverBefore),afterLoad=read(res.receiverAfterLoad);
assert.ok(res.userConfirmedName&&ab.userConfirmedName,'name confirmed');
assert.deepEqual(before,{preset:'03A',snapshot:1},'start state');
assert.equal(afterLoad.preset,m.onLoad.expectIfSentOnLoad.ifByteEqualsValue,'load sends scene 1 PC Value 2 as byte 2');
assert.deepEqual([read(ab.receiverBefore),read(ab.receiverAfterLoad)],[before,afterLoad],'aborted first run: same load behaviour');
assert.equal(ab.steps.length,0,'aborted run has no steps');
assert.deepEqual(res.steps.map(s=>s.scene),m.steps.map(s=>s.scene),'step order');
const steps=res.steps.map((s,i)=>({scene:s.scene,commands:m.steps[i].what,receiver:read(s.receiverShows),usbBytes:s.rawHex.length/2}));
assert.ok(steps.every(s=>s.usbBytes===0)&&res.afterLoad.messages.every(x=>x.type==='sysex'&&x.hex.startsWith('f00001741164')),'nothing but dump acks on USB');
const exp=[{preset:'02B',snapshot:1},{preset:'02B',snapshot:3},{preset:'01A',snapshot:2},{preset:'01C',snapshot:1}];
assert.deepEqual(steps.map(s=>s.receiver),exp,'receiver readings = program byte equals the shown Value');
assert.equal(m.steps[0].expect.ifByteEqualsValue,'02B');assert.equal(m.steps[3].expect.ifByteEqualsValue,'01C');
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-26',
  preset:{name:m.confirmName,sceneMidi:m.sceneMidi},receiver:'Line 6 Helix on the FM3 MIDI OUT jack, MIDI base channel 1, PC receive on; Helix PC byte p selects preset bank floor(p/4)+1, letter ABCD[p%4]; CC 69 value v selects snapshot v+1',
  method:'Edit-buffer load (7F 00) only; the script then sent nothing. The user selected scenes on the FM3 and typed what the Helix screen showed; every byte on the FM3 USB port was recorded.',
  receiverBefore:before,afterLoad,steps,
  findings:['The FM3 sends Scene MIDI commands on the MIDI OUT jack, both on scene change and when a preset is loaded into the edit buffer (Scene 1 commands; seen in two runs).',
    'The PC program byte equals the FM3 Value field (Value 2 -> byte 2, 5 -> 5, 0 -> 0); there is no display offset.',
    'Command slot 8 is sent; two commands in one scene (PC then CC) both arrive; a scene with a CC only leaves the receiver preset unchanged.',
    'CC 69 values 1 and 2 arrive unchanged (Helix snapshots 2 and 3).',
    'Nothing is sent on the USB port (as on 2026-10-24).'],
  notMeasured:['MIDI channels other than 1 (16 is built and offline-tested only)','CC numbers 0/127 and values 127','message types other than PC/CC','scenes 5..8 on this jack','a receiver other than the Helix'],
  resultsSha256:sha(fs.readFileSync(file)),abortedRunSha256:sha(fs.readFileSync(abFile))};
const target=path.join(REF,'fm3-scene-midi-din-20261026.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'DIN receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});console.log(JSON.stringify({steps:steps.length,programByteEqualsValue:true,sentOnLoad:true}));

// Receipt for the 2026-10-24 Scene MIDI send check over USB (FM3_SCENE_MIDI_LISTEN.py). Offline.
// Usage: node tools/fm3/scene-midi-listen-ingest.mjs [--write]
// The pack is rebuilt to the manifest the device run used. Finding: on scene changes the FM3 sent
// no byte at all on its USB port (only the 0x64 acknowledgements of the dump after loading).
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
const file=path.join(REF,'fm3-scene-midi-listen-20261024-results.json'),res=JSON.parse(fs.readFileSync(file,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-sml-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/scene-midi-listen-build.mjs'),tmp],{stdio:'ignore'});
const m=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8'));
assert.equal(sha(fs.readFileSync(path.join(tmp,'manifest.json'))),res.packSha256,'pack rebuilt identically');
assert.ok(res.userConfirmedName&&res.beforeLoad.rawHex===''&&res.idle.rawHex==='','quiet before the load and while idle');
const acks=res.afterLoad.messages;assert.ok(acks.length>0&&acks.every(x=>x.type==='sysex'&&x.hex.startsWith('f00001741164')),'after the load only fn=0x64 acknowledgements');
assert.deepEqual(res.steps.map(s=>s.scene),m.scenes);assert.ok(res.steps.every(s=>s.rawHex===''&&/^ok$/i.test(s.userNote.trim())),'no byte on any scene change');
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-24',
  preset:{name:m.confirmName,sceneMidi:'every scene N: PC channel 3 program N, CC 20 = 10*N on channel 3'},
  method:'Edit-buffer load (7F 00) only; the script then sent nothing and recorded every raw byte on the FM3 USB serial port while the user selected scenes 2, 3, 8, 1 on the FM3.',
  afterLoad:{frames:acks.length,kind:'fn=0x64 dump acknowledgements'},steps:res.steps.map(s=>({scene:s.scene,userNote:s.userNote,bytesReceived:s.rawHex.length/2})),
  finding:'The FM3 does not send Scene MIDI commands over its USB port. Whether they go out on the MIDI OUT jack, and with which program byte, needs a MIDI interface or a MIDI device on MIDI OUT.',
  resultsSha256:sha(fs.readFileSync(file))};
const target=path.join(REF,'fm3-scene-midi-listen-20261024.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'listen receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});console.log(JSON.stringify({steps:out.steps.length,bytesOnSceneChange:0}));

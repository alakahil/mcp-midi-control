// Build the Scene MIDI send-check pack (FM3_SCENE_MIDI_LISTEN.py). Offline.
// One generated preset (production path, grid mode): every scene N sends command 1 = PC channel 3,
// program N (FM3 Value field) and command 2 = CC channel 3, CC 20, value 10*N. The user selects
// scenes on the FM3 while the collector records every byte on the USB port.
// Usage: node tools/fm3/scene-midi-listen-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: scene-midi-listen-build.mjs OUT_DIR');
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const e=()=>Array(12).fill('');
const main=[['in1','-','compressor','drive','-','amp','-','cab','-','-','-','send'],['return','-','-','-','-','-','-','-','delay','reverb','-','out1']];
const sceneMidi=Array.from({length:8},(_,i)=>[{scene:i+1,command:1,type:'PC',channel:3,program:i+1},{scene:i+1,command:2,type:'CC',channel:3,number:20,value:10*(i+1)}]).flat();
const r=composeSound(BASE,{composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'SCENE MIDI SEND',compressorChannels:[{channel:'A',type:'Optical Compressor'}]},
  selectedScene:1,insert:['scenemidi'],grid:{rows:[e(),...main,['','','','','','','','','','','','scenemidi']]},sceneMidi});
assert.deepEqual([...parsePresetDump(r.syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'SEND.syx'),r.syx);
const manifest={kind:'fm3-scene-midi-listen',version:1,date:'2026-10-24',confirmName:'SCENE MIDI SEND',
  preset:{file:'SEND.syx',sha256:createHash('sha256').update(r.syx).digest('hex')},sceneMidi:r.report.stages.layout.sceneMidi.commands,
  scenes:[2,3,8,1],expect:'scene N: PC channel 3 (status 0xC2) with the program byte N or N-1, and CC 20 = 10*N on channel 3 (status 0xB2)',
  method:'Edit-buffer load (7F 00) only; afterwards the script sends nothing and records every byte the FM3 sends while the user selects scenes.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({commands:manifest.sceneMidi.length,scenes:manifest.scenes}));

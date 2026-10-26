// Build the Scene MIDI DIN check pack (FM3_SCENE_MIDI_DIN.py, test T1). Offline.
// One generated preset (production path, grid mode). Its Scene MIDI block sends to a receiving
// device on the FM3 MIDI OUT jack (written for a Line 6 Helix / HX: PC selects a preset, CC 69 value
// 0..7 selects snapshot 1..8). The program values are chosen so the receiver's screen tells apart
// "program byte = shown Value" from "program byte = Value - 1", and command slots 1 and 8 are both used.
//   Scene 1: command 1 PC Value 2                       byte 2 -> 01C, byte 1 -> 01B
//   Scene 2: command 8 PC Value 5 (commands 1..7 NONE)  byte 5 -> 02B, byte 4 -> 02A
//   Scene 3: command 1 CC 69 value 2                    snapshot 3, preset unchanged
//   Scene 4: command 1 PC Value 0, command 2 CC 69 value 1   byte 0 -> 01A + snapshot 2
// Usage: node tools/fm3/scene-midi-din-build.mjs OUT_DIR [--channel=1..16]
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const args=process.argv.slice(2),out=args.find(a=>!a.startsWith('--'));
assert.ok(out,'Usage: scene-midi-din-build.mjs OUT_DIR [--channel=1..16]');
const chArg=args.find(a=>a.startsWith('--channel='));const channel=chArg?Number(chArg.slice(10)):1;
assert.ok(Number.isInteger(channel)&&channel>=1&&channel<=16,'--channel must be 1..16');
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const e=()=>Array(12).fill('');
const main=[['in1','-','compressor','drive','-','amp','-','cab','-','-','-','send'],['return','-','-','-','-','-','-','-','delay','reverb','-','out1']];
const sceneMidi=[
  {scene:1,command:1,type:'PC',channel,program:2},
  ...Array.from({length:7},(_,i)=>({scene:2,command:i+1,type:'NONE'})),
  {scene:2,command:8,type:'PC',channel,program:5},
  {scene:3,command:1,type:'CC',channel,number:69,value:2},
  {scene:4,command:1,type:'PC',channel,program:0},
  {scene:4,command:2,type:'CC',channel,number:69,value:1}];
const name='SCENE MIDI DIN CH'+channel;
const r=composeSound(BASE,{composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name,compressorChannels:[{channel:'A',type:'Optical Compressor'}]},
  selectedScene:1,insert:['scenemidi'],grid:{rows:[e(),...main,['','','','','','','','','','','','scenemidi']]},sceneMidi});
assert.deepEqual([...parsePresetDump(r.syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const sent=r.report.stages.layout.sceneMidi.commands;
assert.equal(sent.filter(c=>c.type!=='NONE').length,5,'five commands set');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'DIN.syx'),r.syx);
// Helix preset numbering: program byte p -> bank floor(p/4)+1, letter ABCD[p%4] (byte 0 = 01A).
const helix=p=>String(Math.floor(p/4)+1).padStart(2,'0')+'ABCD'[p%4];
const steps=[
  {scene:2,expect:{ifByteEqualsValue:helix(5),ifByteIsValueMinus1:helix(4)},what:'command 8 PC Value 5'},
  {scene:3,expect:{snapshot:3,presetUnchanged:true},what:'command 1 CC 69 value 2'},
  {scene:4,expect:{ifByteEqualsValue:helix(0)+' snapshot 2',ifByteIsValueMinus1:'no preset change or another preset (Value 0 has no byte -1)'},what:'command 1 PC Value 0, command 2 CC 69 value 1'},
  {scene:1,expect:{ifByteEqualsValue:helix(2),ifByteIsValueMinus1:helix(1)},what:'command 1 PC Value 2'}];
const manifest={kind:'fm3-scene-midi-din',version:1,date:'2026-10-26',confirmName:name,channel,
  preset:{file:'DIN.syx',sha256:createHash('sha256').update(r.syx).digest('hex')},sceneMidi:sent.filter(c=>c.type!=='NONE'),
  receiver:'Line 6 Helix / HX on the FM3 MIDI OUT jack, MIDI base channel '+channel+', PC receive on',
  onLoad:{scene:1,expectIfSentOnLoad:{ifByteEqualsValue:helix(2),ifByteIsValueMinus1:helix(1)}},steps,
  method:'Edit-buffer load (7F 00) only; the script then sends nothing. The user selects scenes on the FM3 and types what the receiver screen shows; every byte on the FM3 USB port is also recorded.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({channel,commands:manifest.sceneMidi.length,scenes:steps.map(s=>s.scene)}));

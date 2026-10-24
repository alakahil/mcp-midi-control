// Build a value-check pack (FM3_VALUE_CHECK.py) for generated Scene MIDI presets. Offline.
// Two presets through the production path (grid mode, insert scenemidi, sceneMidi commands); the
// collector loads each into the edit buffer and reads every block back, so block 190 must hold
// exactly the words the generator wrote. Run with --skip-store. Usage: node tools/fm3/scene-midi-verify-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as R from './fm3-read-requests.mjs';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {scanRecords,readGrid}=await imp('scripts/fm3-layout.mjs');
const {estimateCpu}=await imp('scripts/fm3-cpu.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: scene-midi-verify-build.mjs OUT_DIR');
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const e=()=>Array(12).fill('');
const main=[['in1','-','compressor','drive','-','amp','-','cab','-','-','-','send'],['return','-','-','-','-','-','-','-','delay','reverb','-','out1']];
const composer=name=>({schemaVersion:1,firmware:13,baseProfile:'jb-composer',name,compressorChannels:[{channel:'A',type:'Optical Compressor'}]});
const CASES=[
  {id:'M1',name:'SCENE MIDI GEN 1',proves:'PC/CC in scenes 1, 2, 8; channel 1/2/16; numbers and values up to 127',
    spec:{insert:['scenemidi'],grid:{rows:[['scenemidi',...Array(11).fill('')],...main,e()]},
      sceneMidi:[{scene:1,command:1,type:'PC',channel:2,program:5},{scene:1,command:2,type:'CC',channel:2,number:7,value:100},
        {scene:2,command:1,type:'PC',channel:1,program:12},{scene:8,command:8,type:'CC',channel:16,number:127,value:127}]}},
  {id:'M2',name:'SCENE MIDI GEN 2',proves:'every scene sends one PC (program = scene number, FM3 Value field) on channel 3; block in row 4',
    spec:{insert:['scenemidi'],grid:{rows:[e(),...main,['','','','','','','','','','','','scenemidi']]},
      sceneMidi:Array.from({length:8},(_,i)=>({scene:i+1,command:1,type:'PC',channel:3,program:i+1}))}},
];
fs.mkdirSync(out,{recursive:true});
const items=CASES.map(c=>{
  const r=composeSound(BASE,{composer:composer(c.name),selectedScene:1,...c.spec}),syx=Buffer.from(r.syx);
  assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0]);
  const body=Buffer.from(inspectStructure(syx).raw.body),{records}=scanRecords(body);fs.writeFileSync(path.join(out,c.id+'.syx'),syx);
  return {id:c.id,file:c.id+'.syx',sha256:sha(syx),name:c.name,proves:c.proves,cpuEstimate:estimateCpu(syx).maxPercent,bodySha256:sha(body),
    sceneMidi:r.report.stages.layout.sceneMidi.commands,expectedGrid:readGrid(body).map(g=>[g.row,g.col,g.id,g.mask]),
    blocks:records.filter(x=>x.eid!==182&&x.eid!==186).map(x=>({family:x.family,effectId:x.eid,words:x.words,channels:x.channels,request:hex(R.bulkReadPoll(x.eid)),
      expected:Array.from({length:x.channels},(_,ch)=>Array.from({length:x.words},(_,p)=>body.readUInt16LE(x.start+2*(ch*x.words+p)))).flat()}))};});
const manifest={kind:'fm3-value-check',version:1,date:'2026-10-24',confirmName:items[0].name,gridRequest:hex(R.gridRequest()),
  store:{presetId:'M1',shownLocation:436,storedDumpRequest:hex(R.storedDumpRequest(435)),note:'Not used: run FM3_VALUE_CHECK.py with --skip-store.'},
  method:'Generated Scene MIDI presets sent to the edit buffer (7F 00) only; every block incl. Scene MIDI (190) read back with fn=0x1F and the grid with fn=0x01 sub=0x2E. No store, no SET.',items};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({items:items.map(i=>`${i.id}:${i.blocks.length} blocks:${i.cpuEstimate}%`)}));

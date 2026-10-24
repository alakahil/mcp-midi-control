// Build the front-panel step-diff packs (FM3_STEP_DIFF.py, audit point 4). Offline.
// Pack "input-volume" (test 4): the 0.3.17 Volume/Pan baseline preset (Input 1 at row 2 col 1,
// Volume/Pan 1 at row 3 col 3, engaged in scene 1); the user sets Input gate Threshold / Output
// Level and Volume / Level / Balance on the front panel one at a time and types the shown value.
// Usage: node tools/fm3/step-diff-build.mjs PACK OUT_DIR   (PACK: input-volume)
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as R from './fm3-read-requests.mjs';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {scanRecords,readGrid}=await imp('scripts/fm3-layout.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [pack,out]=process.argv.slice(2);assert.ok(pack==='input-volume'&&out,'Usage: step-diff-build.mjs input-volume OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const evidence=JSON.parse(read('references/fm3-volume-binding-evidence.json'));
const spec=JSON.parse(JSON.stringify(evidence.baseline.spec));spec.composer.name='STEP 4 IN VOL';spec.blockScenes={volpan:[{scene:1,channel:'A',bypass:false}]};spec.selectedScene=1;
const syx=Buffer.from(createPreset(read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec).syx);
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const body=Buffer.from(inspectStructure(syx).raw.body),{records}=scanRecords(body),grid=readGrid(body);
const at=eid=>{const g=grid.find(x=>x.id===eid);return {row:g.row+1,col:g.col+1}};
const blocks=[['in1',37],['volpan',102]].map(([slug,eid])=>{const r=records.find(x=>x.eid===eid);assert.ok(r,slug);
  return {slug,effectId:eid,words:r.words,channels:r.channels,cell:at(eid),bulkRequest:hex(R.bulkReadPoll(eid)),
    expectedWords:Array.from({length:r.words*r.channels},(_,i)=>body.readUInt16LE(r.start+2*i))};});
const IN=`LAYOUT, NAV-nuppudega rida ${blocks[0].cell.row} veerg ${blocks[0].cell.col} (IN 1), siis EDIT; vali lehel noise gate'i väljad`;
const VOL=`LAYOUT, NAV-nuppudega rida ${blocks[1].cell.row} veerg ${blocks[1].cell.col} (VOL), siis EDIT`;
const steps=[
  {id:'thr-40',where:IN,block:'in1',param:'INPUT_THRESH',text:'Input 1: sea Threshold väärtuseks -40.0 dB'},
  {id:'thr-off',where:IN,block:'in1',param:'INPUT_THRESH',text:'Input 1: keera Threshold päris lõpuni vasakule (miinimum, peaks näitama OFF)'},
  {id:'thr-80',where:IN,block:'in1',param:'INPUT_THRESH',text:'Input 1: sea Threshold väärtuseks -80.0 dB'},
  {id:'lvl+6',where:IN,block:'in1',param:'INPUT_LEVEL',text:'Input 1: sea Output Level (Level) väärtuseks +6.0 dB'},
  {id:'vol0',where:VOL,block:'volpan',param:'VOLUME_GAIN',text:'Volume: sea Volume väärtuseks 0.00 (päris vasakule)'},
  {id:'vol2.5',where:VOL,block:'volpan',param:'VOLUME_GAIN',text:'Volume: sea Volume väärtuseks 2.50'},
  {id:'vol7.5',where:VOL,block:'volpan',param:'VOLUME_GAIN',text:'Volume: sea Volume väärtuseks 7.50'},
  {id:'vlvl-10',where:VOL,block:'volpan',param:'VOLUME_LEVEL',text:'Volume: sea Level väärtuseks -10.0 dB'},
  {id:'bal',where:VOL,block:'volpan',param:'VOLUME_BAL',text:'Volume: keera Balance vasakule umbes poole peale (kirjuta täpselt, mida näitab)'},
];
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'STEP4.syx'),syx);
const manifest={kind:'fm3-step-diff',version:1,date:'2026-10-24',pack,confirmName:'STEP 4 IN VOL',preset:{file:'STEP4.syx',sha256:sha(syx)},blocks,steps,
  method:'Edit-buffer load (7F 00) only; the user changes one front-panel field per step and types the shown value; Input 1 and Volume/Pan 1 are read with fn=0x1F after each step. No store, no SET.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest)+'\n');
console.log(JSON.stringify({blocks:blocks.map(b=>b.slug+'@'+b.cell.row+','+b.cell.col),steps:steps.length}));

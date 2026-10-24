// Build the FM3 Volume pedal check pack (audit point 4, test 4a). Offline; writes two presets.
// P1 = the 0.3.17 volumePedal binding (External 1 -> Volume/Pan 1 Gain, Channels ALL), P0 = the same
// preset without the binding (negative control). The collector loads each into the edit buffer;
// the user moves the pedal to heel / toe / middle / heel and reads the Volume value on the FM3
// screen; the collector records the user's reading, any frames the FM3 sends while the pedal
// moves, the Volume block bulk read and the grid/meter frame. No store, no SET.
// Usage: node tools/fm3/pedal-check-build.mjs OUT_DIR
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
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: pedal-check-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const BASE=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const evidence=JSON.parse(read('references/fm3-volume-binding-evidence.json'));
const engage={volpan:[{scene:1,channel:'A',bypass:false}]};
const mk=(name,pedal)=>{const spec=JSON.parse(JSON.stringify(evidence.baseline.spec));spec.composer.name=name;spec.blockScenes=engage;spec.selectedScene=1;if(pedal)spec.volumePedal=true;return createPreset(BASE,spec).syx;};
const CASES=[{id:'P1',name:'PEDAL 4A BIND',binding:true,proves:'External 1 -> Volume/Pan 1 Gain (0.3.17 binding): Volume follows the pedal'},
  {id:'P0',name:'PEDAL 4A NO BIND',binding:false,proves:'negative control: same preset without the binding, Volume stays put'}];
const POSITIONS=[{id:'heel',text:'kand all (pedaal täiesti tagasi)'},{id:'toe',text:'varvas all (pedaal täiesti ette)'},
  {id:'middle',text:'umbes keskel'},{id:'heel2',text:'jälle kand all'}];
fs.mkdirSync(out,{recursive:true});
const items=CASES.map(c=>{const syx=Buffer.from(mk(c.name,c.binding));
  assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],c.id+' edit-buffer header');
  const st=inspectStructure(syx),body=Buffer.from(st.raw.body),vol=scanRecords(body).records.find(r=>r.eid===102);assert.ok(vol,'Volume/Pan 1');
  assert.equal(st.decoded.preset_name,c.name);fs.writeFileSync(path.join(out,c.id+'.syx'),syx);
  return {id:c.id,file:c.id+'.syx',sha256:sha(syx),name:c.name,binding:c.binding,proves:c.proves,
    volumeStoredGain:[0,1,2,3].map(ch=>body.readUInt16LE(vol.start+2*ch*vol.words)),volumeRequest:hex(R.bulkReadPoll(102))};});
const manifest={kind:'fm3-pedal-check',version:1,date:'2026-10-24',confirmName:items[0].name,gridRequest:hex(R.gridRequest()),positions:POSITIONS,items,
  method:'Edit-buffer loads (7F 00) and read-only requests only. The user reads the Volume value on the FM3 screen at each pedal position; the collector also records unsolicited frames and the Volume bulk read. No store, no SET.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({items:items.map(i=>i.id+':'+i.name+':'+i.volumeStoredGain.join('/'))}));

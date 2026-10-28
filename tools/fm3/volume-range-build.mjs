// Build the Volume pedal Min/Max check pack (FM3_BIND_STORE.py --load / --record, test T10). Offline.
// One generated preset: External 1 -> Volume/Pan 1 Volume with volumePedal {min:2.5, max:7.5}, so modifier
// words 1/2 hold the VOLUME_GAIN words 16384 / 49151. The collector loads it into the edit buffer and exits;
// the USER reads Source 1 / Min / Max on the FM3 Modify page and the Volume knob in FM3-Edit at heel, middle
// and toe, then --record saves the readings (no device I/O). Nothing is stored.
// Usage: node tools/fm3/volume-range-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {readModifiers}=await imp('scripts/fm3-parameter-dependencies.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: volume-range-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const BASE=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const evidence=JSON.parse(read('references/fm3-volume-binding-evidence.json'));
const NAME='VOL RANGE T10';
export const RANGE={min:2.5,max:7.5};
const spec=JSON.parse(JSON.stringify(evidence.baseline.spec));spec.composer.name=NAME;spec.blockScenes={volpan:[{scene:1,channel:'A',bypass:false}]};spec.selectedScene=1;spec.volumePedal=RANGE;
const result=createPreset(BASE,spec),syx=Buffer.from(result.syx);
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const st=inspectStructure(syx),body=Buffer.from(st.raw.body);assert.equal(st.decoded.preset_name,NAME);
const m=readModifiers(body).filter(x=>x.active);assert.deepEqual(m.map(x=>[x.record,x.sourceName,x.effectId,x.pid]),[[0,'External 1',102,0]]);
assert.deepEqual([body.readUInt16LE(1586),body.readUInt16LE(1588)],[16384,49151]);
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'RANGE.syx'),syx);
const manifest={kind:'fm3-bind-check',version:1,date:'2026-10-28',confirmName:NAME,preset:{file:'RANGE.syx',sha256:sha(syx)},
  binding:{record:0,source:'External 1',target:'Volume/Pan 1 VOLUME_GAIN',min:{display:RANGE.min,word:16384},max:{display:RANGE.max,word:49151}},
  checks:[
    {id:'source',text:'FM3 esipaneel: Volume/Pan plokk, Volume, ENTER: mis on Source 1?'},
    {id:'min',text:'PAGE RIGHT (Modify leht): mis on Min?'},
    {id:'max',text:'Modify leht: mis on Max?'},
    {id:'heel',text:'FM3-Edit, Volume nupp, pedaal kand all (täiesti tagasi): väärtus?'},
    {id:'mid',text:'FM3-Edit, pedaal umbes pooles: väärtus?'},
    {id:'toe',text:'FM3-Edit, pedaal varvas all (täiesti ette): väärtus?'}],
  method:'--load: edit-buffer dump (7F 00) only. The user reads the FM3 Modify page and the Volume knob in FM3-Edit. --record saves the typed readings without device I/O. Nothing is stored or set.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({name:NAME,sha256:manifest.preset.sha256,words:[16384,49151]}));

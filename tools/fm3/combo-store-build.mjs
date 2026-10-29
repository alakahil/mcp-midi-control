// Build the combined bindings + Out 2 STORE/reload pack (FM3_BIND_STORE.py, test T11). Offline.
// One generated preset (grid mode): External 1 -> Wah (record 0), External 1 -> Volume 2.5..7.5 (record 1),
// CS2 -> Input Boost (record 2), CS3 -> Bright inverted (record 3), CS4 -> Fat on channel D (record 4) and an
// Out 2 block under Out 1. The collector loads it (--load); the USER checks the front panel, STOREs it to a
// location HE chooses, reloads and checks again; --verify reads that location (fn=0x03, read only).
// Usage: node tools/fm3/combo-store-build.mjs OUT_DIR
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
const {readGrid}=await imp('scripts/fm3-layout.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: combo-store-build.mjs OUT_DIR');
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const NAME='COMBO T11 STORE',X=Array(12).fill('');
export const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:NAME,wahChannels:[{channel:'A',type:'FAS Wah'}],modifiers:{external1Wah:true}},
  volumePan:true,volumePedal:{min:2.5,max:7.5},selectedScene:1,
  grid:{rows:[X,['in1','wah','drive','-','amp','cab','-','-','-','-','-','send'],['return','volpan','delay','-','reverb','-','-','-','-','-','-','out1'],[...Array(11).fill(''),'out2']],links:[{row:4,col:12,from:[3]}]},
  duplicate:['out2'],blockScenes:{volpan:[{scene:1,channel:'A',bypass:false}],wah:[{scene:1,channel:'A',bypass:true}]},
  controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST'},{switch:3,block:'amp',param:'DISTORT_BRIGHT',invert:true},{switch:4,block:'amp',param:'DISTORT_FAT',channel:'D'}]};
const result=createPreset(BASE,spec),syx=Buffer.from(result.syx);
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const st=inspectStructure(syx),body=Buffer.from(st.raw.body);assert.equal(st.decoded.preset_name,NAME);
const active=readModifiers(body).filter(m=>m.active).map(m=>[m.record,m.sourceName,m.effectId,m.pid,m.channelScope]);
assert.deepEqual(active,[[0,'External 1',94,5,'ALL'],[1,'External 1',102,0,'ALL'],[2,'Control Switch 2',58,42,'ALL'],[3,'Control Switch 3',58,41,'ALL'],[4,'Control Switch 4',58,80,'CHAN D']]);
assert.deepEqual(readGrid(body).filter(g=>g.id===43).map(g=>[g.row,g.col,g.mask]),[[3,11,4]]);
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'COMBO.syx'),syx);
const manifest={kind:'fm3-bind-store',version:1,date:'2026-10-29',confirmName:NAME,preset:{file:'COMBO.syx',sha256:sha(syx)},
  bindings:active.map(([record,source,effectId,pid,channel])=>({record,source,effectId,pid,channel})),out2:{row:4,column:12,fedFromRow:3},
  checks:[
    {id:'volumeRange',text:'Volume/Pan plokk, Volume, ENTER, PAGE RIGHT: mis on Min ja Max? (näiteks "2.50 7.50")'},
    {id:'brightInvert',text:'Amp plokk, Bright, ENTER: Source 1? PAGE RIGHT: Min ja Max? (näiteks "54 Control Switch 3, ON OFF")'},
    {id:'fatChannel',text:'Amp plokk, Fat, ENTER: Source 1? PAGE RIGHT: Channel? (näiteks "55 Control Switch 4, CHAN D")'},
    {id:'boostSource',text:'Amp plokk, Input Boost, ENTER: mis on Source 1?'},
    {id:'wahSource',text:'Wah plokk, Control, ENTER: mis on Source 1?'},
    {id:'out2Layout',text:'LAYOUT: mis on rea 4 veerus 12? (näiteks "Out 2")'},
    {id:'out2Audio',text:'Kui Out 2 pesadesse on midagi ühendatud: kas heli tuleb ja kas tase on sama mis Out 1-s? ("-" kui pole ühendatud)'}],
  method:'--load: edit-buffer dump (7F 00) only. The user STOREs on the FM3 to a location he chooses. --verify: one read-only stored-dump request (fn=0x03 hi lo 00) for that location; bodies compared offline. The script never stores and never sets.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({name:NAME,sha256:manifest.preset.sha256,bindings:active.length,cpu:result.report.cpu.maxPercent}));

// Build the FM3 value-check pack (audit points 3/4/6 value read-back + STORE/reload). Offline.
// Six presets through the production path cover the composer families, every point-6 family,
// Mixer/Multiplexer, second instances, Volume/Pan with the 0.3.17 pedal binding and a real sound
// (Satriani V3). The collector loads each into the edit buffer, reads every block back with the
// fn=0x1F bulk read (all words, all channels; read-only, confirmed 2752/2752 by the 2026-10-23
// read probe) and the grid with fn=0x01 sub=0x2E, and compares with the words written here.
// One preset is then STORED BY THE USER on the front panel to location 436 (the collector never
// stores), read back with fn=0x03 and, after a reload, read back again.
// Usage: node tools/fm3/value-check-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {createPreset}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {scanRecords,readGrid}=await imp('scripts/fm3-layout.mjs');
const {estimateCpu}=await imp('scripts/fm3-cpu.mjs');
import * as R from './fm3-read-requests.mjs';
const FM3=0x11,sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: value-check-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const BASE=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const e=()=>Array(12).fill('');
const composer=(name,extra={})=>({schemaVersion:1,firmware:13,baseProfile:'jb-composer',name,compressorChannels:[{channel:'A',type:'Optical Compressor'}],...extra});
const on=(...b)=>Object.fromEntries(b.map(x=>[x,[{scene:1,bypass:false}]]));
const evidence=JSON.parse(read('references/fm3-volume-binding-evidence.json'));
const CASES=[
  {id:'V01',name:'VALUE V01 PROBE SET',proves:'composer blocks + Drive 2 + Mixer + Plex with distinct control values (same content as READ PROBE 1)',
    make:()=>composeSound(BASE,{composer:composer('VALUE V01 PROBE SET'),selectedScene:1,remove:['send','return'],duplicate:['drive2'],insert:['mixer','plex'],
      blockScenes:on('mixer','drive2','plex'),allow:['linear-by-structure','enum-labels'],
      grid:{rows:[e(),['in1','compressor','drive','drive2','amp','cab','delay','-','mixer','-','-','out1'],['','','','','','-','reverb','plex','','','',''],e()],links:[{row:3,col:6,from:[2]},{row:2,col:9,from:[2,3]}]},
      controls:[{block:'drive',channel:'A',param:'FUZZ_DRIVE',value:3.3},{block:'drive2',channel:'A',param:'FUZZ_DRIVE',value:6.6},{block:'mixer',channel:'A',param:'MIXER_GAIN1',value:50},
        {block:'compressor',channel:'A',param:'COMP_MIX',value:70},{block:'reverb',channel:'A',param:'REVERB_MIX',value:37},{block:'plex',channel:'A',param:'PLEX_MIX',value:25}]}).syx},
  {id:'V02',name:'VALUE V02 P6 FAMILIES A',proves:'Gate, Looper (1 ch), Ring Mod (2 ch), Formant, Volume/Pan',
    make:()=>composeSound(BASE,{composer:composer('VALUE V02 P6 FAMILIES A'),selectedScene:1,insert:['gate','looper','ringmod','formant'],volumePan:true,
      layout:{row2:['gate','compressor','drive','amp','cab'],row3:['volpan','formant','delay','ringmod','reverb','looper']}}).syx},
  {id:'V03',name:'VALUE V03 P6 FAMILIES B',proves:'Synth and Megatap (2 ch)',
    make:()=>composeSound(BASE,{composer:composer('VALUE V03 P6 FAMILIES B'),selectedScene:1,insert:['synth','megatap'],
      layout:{row2:['compressor','drive','amp','cab','synth'],row3:['delay','megatap','reverb']}}).syx},
  {id:'V07',name:'VALUE V07 P6 FAMILIES C',proves:'Ten-Tap, Resonator (2 ch) and Multiband',
    make:()=>composeSound(BASE,{composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'VALUE V07 P6 FAMILIES C',reverbChannels:[{channel:'A',type:'Room: Large Room'}]},selectedScene:1,insert:['tentap','resonator','multiband'],
      layout:{row2:['drive','amp','cab','resonator','multiband'],row3:['tentap','delay','reverb']}}).syx},
  {id:'V04',name:'VALUE V04 GRID INSTANCES',proves:'Multiplexer, Compressor 2 / Drive 2 / Delay 2, parallel rows; also the STORE/reload preset',
    make:()=>composeSound(BASE,{composer:composer('VALUE V04 GRID INSTANCES'),selectedScene:1,remove:['send','return'],duplicate:['compressor2','drive2','delay2'],insert:['multiplexer'],
      blockScenes:on('multiplexer','drive2','compressor2','delay2'),
      grid:{rows:[e(),['in1','compressor','compressor2','drive','-','multiplexer','amp','cab','delay','delay2','reverb','out1'],['','','','drive2','-','','','','','','',''],['','','','','','','','','','','','']],
        links:[{row:3,col:4,from:[2]},{row:2,col:6,from:[2,3]}]}}).syx},
  {id:'V05',name:null,proves:'a real generated sound: Satriani Soap On A Rope V3 (published example, byte-identical to the composer)',
    make:()=>read('examples/SATRIANI_SOAP_ON_A_ROPE_V3.syx')},
  {id:'V06',name:null,proves:'0.3.17 Volume/Pan with the captured External 1 -> Volume Gain binding (block words; the modifier itself is not a block record)',
    make:()=>createPreset(BASE,{...evidence.baseline.spec,volumePedal:true}).syx},
];
fs.mkdirSync(out,{recursive:true});
const items=[];
for(const c of CASES){
  const syx=Buffer.from(c.make());
  assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],c.id+' edit-buffer header');
  const st=inspectStructure(syx),body=Buffer.from(st.raw.body),{records}=scanRecords(body),cpu=estimateCpu(syx).maxPercent;
  assert.ok(cpu<75,c.id+' CPU estimate '+cpu);
  fs.writeFileSync(path.join(out,c.id+'.syx'),syx);
  items.push({id:c.id,file:c.id+'.syx',sha256:sha(syx),name:st.decoded.preset_name,proves:c.proves,cpuEstimate:cpu,bodySha256:sha(body),
    expectedGrid:readGrid(body).map(g=>[g.row,g.col,g.id,g.mask]),
    blocks:records.filter(r=>r.eid!==182&&r.eid!==186).map(r=>({family:r.family,effectId:r.eid,words:r.words,channels:r.channels,request:hex(R.bulkReadPoll(r.eid)),
      expected:Array.from({length:r.channels},(_,ch)=>Array.from({length:r.words},(_,p)=>body.readUInt16LE(r.start+2*(ch*r.words+p)))).flat()}))});
  fs.writeFileSync(path.join(out,c.id+'.body.hex'),body.toString('hex')+'\n');
}
const manifest={kind:'fm3-value-check',version:1,date:'2026-10-23',confirmName:items[0].name,
  gridRequest:hex(R.gridRequest()),
  store:{presetId:'V04',shownLocation:436,storedDumpRequest:hex(R.storedDumpRequest(435)),
    note:'The user stores the edit buffer to location 436 on the FM3 front panel; the collector never sends a store.'},
  method:'Each preset is sent to the edit buffer (7F 00) only; every block is read back with fn=0x1F (all words, all channels) and the grid with fn=0x01 sub=0x2E; values must equal the written words. No store, no SET.',
  items};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({items:items.map(i=>`${i.id}:${i.name}:${i.blocks.length} blocks:${i.cpuEstimate}%`),out}));

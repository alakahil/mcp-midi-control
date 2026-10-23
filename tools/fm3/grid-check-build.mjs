// Build the grid-check pack (audit point 5). Offline; writes test presets, never device I/O.
// Every preset goes through the production path (composeSound with spec.grid) on the pinned
// NewLook base, Scene 1 selected, dump header 7F 00 (edit buffer). The collector sends each one to
// the FM3 edit buffer, reads the live grid back (fn=0x01 sub=0x2E) and compares all 48 cells with
// the words written here. It also records the CPU meter. Nothing is ever stored on the device.
// Usage: node tools/fm3/grid-check-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {readGrid}=await imp('scripts/fm3-layout.mjs');
const {describeGrid}=await imp('scripts/fm3-grid.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const [out]=process.argv.slice(2);assert.ok(out,'Usage: grid-check-build.mjs OUT_DIR');
const e=()=>Array(12).fill('');
const comp={compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const on=(...b)=>Object.fromEntries(b.map(x=>[x,[{scene:1,bypass:false}]]));
// Each case: what it proves on the device. Cells are 1-based in links; '-' = shunt.
const CASES=[
  {id:'G01',name:'GRID G01 TWO ROWS',proves:'control: the composer two-row layout through the general planner (Send 182 / Return 186 > 127)',
    spec:{grid:{rows:[e(),['in1','-','compressor','drive','-','amp','-','cab','-','-','-','send'],['return','-','-','-','-','-','-','-','delay','reverb','-','out1'],e()]}}},
  {id:'G02',name:'GRID G02 PAR DLY REV',proves:'split after Cab, Delay || Reverb, merge in the Mixer (126), Drive 2 (119), Send/Return removed',
    spec:{remove:['send','return'],duplicate:['drive2'],insert:['mixer'],blockScenes:on('mixer','drive2'),
      grid:{rows:[e(),['in1','compressor','drive','drive2','amp','cab','delay','-','mixer','-','-','out1'],['','','','','','-','reverb','-','','','',''],e()],
        links:[{row:3,col:6,from:[2]},{row:2,col:9,from:[2,3]}]}},
    ask:'Vaata FM3 ekraanil Layout/Grid vaadet: kas rida 2 hargneb pärast Cab-i reale 3 (Reverb) ja read saavad Mixeris kokku? (j/e)'},
  {id:'G03',name:'GRID G03 FOUR ROWS',proves:'all four rows: one split into rows 1-4 and a four-input merge (mask 15) in the Mixer',
    spec:{remove:['send','return'],insert:['mixer','plex'],blockScenes:on('mixer'),
      grid:{rows:[['','','','','','-','delay','-','','','',''],['in1','compressor','drive','amp','cab','-','reverb','-','mixer','-','-','out1'],['','','','','','-','plex','-','','','',''],['','','','','','-','-','-','','','','']],
        links:[{row:1,col:6,from:[2]},{row:3,col:6,from:[2]},{row:4,col:6,from:[2]},{row:2,col:9,from:[1,2,3,4]}]}}},
  {id:'G04',name:'GRID G04 MULTIPLEXER',proves:'Multiplexer (191 > 127) merging Drive || Drive 2 rows; cross-row link (row 3 -> row 2)',
    spec:{remove:['send','return'],duplicate:['drive2'],insert:['multiplexer'],blockScenes:on('multiplexer','drive2'),
      grid:{rows:[e(),['in1','compressor','-','drive','-','multiplexer','amp','cab','delay','reverb','-','out1'],['','','-','drive2','-','','','','','','',''],e()],
        links:[{row:3,col:3,from:[2]},{row:2,col:6,from:[2,3]}]}}},
  {id:'G05',name:'GRID G05 SYNTH SOURCE',proves:'Synth (130 > 127) without input on row 4 feeding the Mixer; Send/Return kept',
    spec:{insert:['mixer','synth'],blockScenes:on('mixer'),
      grid:{rows:[e(),['in1','compressor','drive','amp','cab','-','-','mixer','-','-','-','send'],['return','-','-','-','-','-','-','-','delay','reverb','-','out1'],['','','','','','synth','-','','','','','']],
        links:[{row:2,col:8,from:[2,4]}]}}},
  {id:'G06',name:'GRID G06 ONE ROW',proves:'removal (Drive, Delay, Send/Return) and a single-row layout, as in 275 of 384 factory presets',
    spec:{remove:['drive','delay','send','return'],
      grid:{rows:[['in1','compressor','-','amp','-','cab','-','-','reverb','-','-','out1'],e(),e(),e()]}}},
  {id:'G07',name:'GRID G07 INSTANCES',proves:'second instances Compressor 2 (47), Drive 2 (119), Delay 2 (71) in series',
    spec:{remove:['send','return'],duplicate:['compressor2','drive2','delay2'],blockScenes:on('compressor2','drive2','delay2'),
      grid:{rows:[e(),['in1','compressor','compressor2','drive','drive2','amp','cab','delay','delay2','reverb','-','out1'],e(),e()]}}},
];
fs.mkdirSync(out,{recursive:true});
const items=[];
for(const c of CASES){
  const r=composeSound(BASE,{composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:c.name,...comp},selectedScene:1,...c.spec});
  assert.deepEqual([...parsePresetDump(r.syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
  const body=Buffer.from(inspectStructure(r.syx).raw.body),grid=readGrid(body);
  assert.equal(grid.length,48);assert.ok(grid.every(g=>g.mask<16));
  const file=c.id+'.syx';fs.writeFileSync(path.join(out,file),r.syx);
  items.push({id:c.id,file,sha256:sha(r.syx),name:c.name,proves:c.proves,...(c.ask?{ask:c.ask}:{}),rows:describeGrid(body),
    expectedGrid:grid.map(g=>[g.row,g.col,g.id,g.mask]),cpuEstimate:r.report.cpu.maxPercent,cpuUnknown:[...new Set(r.report.cpu.scenes.flatMap(s=>s.unknown))]});
  assert.ok(r.report.cpu.maxPercent<72,c.id+' CPU estimate too high');
}
const manifest={kind:'fm3-grid-check',version:1,date:'2026-10-23',confirmName:items[0].name,
  method:'Each preset is sent to the FM3 edit buffer (7F 00), then the live grid (fn=0x01 sub=0x2E, tail-anchored region, 16-bit id + 16-bit input mask per cell from bit 45, MSB-first) is read and compared with expectedGrid [row, col, id, mask] (zero-based). CPU from frame[37] (piecewise decode).',
  items};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({items:items.length,out,cpu:items.map(i=>i.id+':'+i.cpuEstimate)}));

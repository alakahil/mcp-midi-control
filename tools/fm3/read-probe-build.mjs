// Build the FM3 read probe pack. Offline; writes one test preset and pinned READ requests.
// The probe answers which read paths the FM3 (fw 13) serves, before the scale / value / dump tests
// are built: fn=0x01 sub=0x1F display read for type AND non-type parameters, fn=0x1F block bulk
// read (all values A-D), fn=0x43 edit-buffer dump, fn=0x03 stored-preset dump (shown 436).
// Every request is read-only (no value field, no store, no SET); the collector re-checks each
// frame's shape before sending. Usage: node tools/fm3/read-probe-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const {findParam,decodeValue,baseSlug}=await imp('scripts/fm3-table-encoder.mjs');
import * as R from './fm3-read-requests.mjs';
const FM3=0x11,sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: read-probe-build.mjs OUT_DIR');
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const e=()=>Array(12).fill('');
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'READ PROBE 1',compressorChannels:[{channel:'A',type:'Optical Compressor'}]},
  selectedScene:1,remove:['send','return'],duplicate:['drive2'],insert:['mixer','plex'],
  blockScenes:{mixer:[{scene:1,bypass:false}],drive2:[{scene:1,bypass:false}],plex:[{scene:1,bypass:false}]},
  grid:{rows:[e(),['in1','compressor','drive','drive2','amp','cab','delay','-','mixer','-','-','out1'],['','','','','','-','reverb','plex','','','',''],e()],
    links:[{row:3,col:6,from:[2]},{row:2,col:9,from:[2,3]}]},
  allow:['linear-by-structure','enum-labels'],
  controls:[{block:'drive',channel:'A',param:'FUZZ_DRIVE',value:3.3},{block:'drive2',channel:'A',param:'FUZZ_DRIVE',value:6.6},
    {block:'mixer',channel:'A',param:'MIXER_GAIN1',value:50},{block:'compressor',channel:'A',param:'COMP_MIX',value:70},
    {block:'reverb',channel:'A',param:'REVERB_MIX',value:37},{block:'plex',channel:'A',param:'PLEX_MIX',value:25}]};
const r=composeSound(BASE,spec);
assert.deepEqual([...parsePresetDump(r.syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
assert.ok(r.report.cpu.maxPercent<72,'CPU estimate');
const body=Buffer.from(inspectStructure(r.syx).raw.body),{records}=scanRecords(body);
// Display reads: type selectors and ordinary knobs, incl. an instance (Drive 2 = 119) and point-5/6 blocks.
const READS=[['amp','DISTORT_TYPE'],['amp','DISTORT_DRIVE'],['amp','DISTORT_LEVEL'],['drive','FUZZ_TYPE'],['drive','FUZZ_DRIVE'],['drive2','FUZZ_DRIVE'],
  ['reverb','REVERB_TYPE'],['reverb','REVERB_MIX'],['reverb','REVERB_LEVEL'],['delay','DELAY_MODEL'],['delay','DELAY_TIME'],['compressor','COMP_TYPE'],
  ['compressor','COMP_MIX'],['cab','CABINET_LEVEL'],['mixer','MIXER_GAIN1'],['plex','PLEX_MIX'],['in1','INPUT_THRESH'],['in1','INPUT_TYPE'],['out1','OUTPUT_LEVEL']];
const word=(rec,pid,ch=0)=>body.readUInt16LE(rec.start+2*(ch*rec.words+pid));
const display=READS.map(([block,name])=>{
  const rec=records.find(x=>x.family===block);assert.ok(rec,block);const p=findParam(baseSlug(block),name);
  const ch=body.readUInt16LE(rec.header+10),raw=word(rec,p.param,ch);
  return {label:`${block}.${name}`,effectId:rec.eid,paramId:p.param,channel:'ABCD'[ch],raw,expected:String(decodeValue(p,raw)),
    request:hex(R.displayRequest(rec.eid,p.param))};
});
const bulk=records.map(rec=>({label:rec.family,effectId:rec.eid,words:rec.words,channels:rec.channels,request:hex(R.bulkReadPoll(rec.eid)),
  storedWords:Array.from({length:rec.channels},(_,c)=>Array.from({length:rec.words},(_,p)=>word(rec,p,c)))}));
const requests=[
  {kind:'grid',label:'grid + CPU (fn=0x01 sub=0x2E)',request:hex(R.gridRequest())},
  {kind:'editBufferDump',label:'edit-buffer dump (fn=0x43)',request:hex(R.editBufferDumpRequest())},
  {kind:'storedDump',label:'stored preset shown 436 = index 435 (fn=0x03), read only',request:hex(R.storedDumpRequest(435))},
  ...display.map(d=>({kind:'display',...d})),
  ...bulk.map(b=>({kind:'bulk',...b})),
];
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'PROBE.syx'),r.syx);
fs.writeFileSync(path.join(out,'expected-body.hex'),body.toString('hex')+'\n');
const manifest={kind:'fm3-read-probe',version:1,date:'2026-10-23',confirmName:'READ PROBE 1',
  preset:{file:'PROBE.syx',sha256:sha(r.syx),bodySha256:sha(body),bodyBytes:body.length,rows:r.report.stages.layout.rows},
  method:'Load PROBE.syx into the edit buffer (7F 00) only, then send each read request once and record every reply frame until 0.4 s of silence (max 4 s). No store, no SET, no preset change.',
  requests};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({requests:requests.length,display:display.length,bulk:bulk.length,cpu:r.report.cpu.maxPercent,out}));

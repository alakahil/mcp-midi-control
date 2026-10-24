// Build the list-label sweep pack (FM3_LABEL_SWEEP.py, audit point 3). Offline.
// One measurement preset (the READ PROBE 1 layout: 11 blocks, CPU estimate < 72 %) for the edit
// buffer, and every list parameter of every generator family with its dictionary length. The
// collector asks the FM3 for labels 0 .. count+extra-1 of each (integer value field, decoded by the
// 2026-10-24 label probe); the pilot must return the dictionary label of amp type 1; blocks not in the preset are tried
// with two requests first and swept only if the FM3 answers them with text.
// Usage: node tools/fm3/label-sweep-build.mjs OUT_DIR
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
const {loadDictionary,FAMILY_BY_SLUG,dictionaryHash,findParam}=await imp('scripts/fm3-table-encoder.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: label-sweep-build.mjs OUT_DIR');
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const e=()=>Array(12).fill('');
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'LABEL SWEEP 3',compressorChannels:[{channel:'A',type:'Optical Compressor'}]},
  selectedScene:1,remove:['send','return'],duplicate:['drive2'],insert:['mixer','plex'],
  blockScenes:{mixer:[{scene:1,bypass:false}],drive2:[{scene:1,bypass:false}],plex:[{scene:1,bypass:false}]},
  grid:{rows:[e(),['in1','compressor','drive','drive2','amp','cab','delay','-','mixer','-','-','out1'],['','','','','','-','reverb','plex','','','',''],e()],
    links:[{row:3,col:6,from:[2]},{row:2,col:9,from:[2,3]}]}};
const r=composeSound(BASE,spec);
assert.deepEqual([...parsePresetDump(r.syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
assert.ok(r.report.cpu.maxPercent<72,'CPU estimate');
const body=Buffer.from(inspectStructure(r.syx).raw.body),{records}=scanRecords(body),d=loadDictionary();
const EXTRA=0;  // no out-of-range indexes: the 2026-10-24 run lost the FM3 during the first block with extra=2
const families=Object.entries(FAMILY_BY_SLUG).map(([slug,family])=>{
  const params=d.params.filter(p=>p.family===family&&Array.isArray(p.enum)&&p.enum.length).sort((a,b)=>a.param-b.param);
  assert.ok(params.length,family);const eid=params[0].block;assert.ok(params.every(p=>p.block===eid),family+' effect id');
  const rec=records.find(x=>x.eid===eid);
  return {family,slug,effectId:eid,present:!!rec,
    ...(rec?{bulkRequest:hex(R.bulkReadPoll(eid)),expectedWords:Array.from({length:rec.channels*rec.words},(_,i)=>body.readUInt16LE(rec.start+2*i))}:{}),
    params:params.map(p=>({paramId:p.param,name:p.name,count:p.enum.length}))};
});
for(const f of families)for(const p of f.params)assert.ok(p.count+EXTRA<=4096);
const requests=families.reduce((n,f)=>n+f.params.reduce((a,p)=>a+p.count+EXTRA,0),0);
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'SWEEP.syx'),r.syx);
const manifest={kind:'fm3-label-sweep',version:1,date:'2026-10-24',confirmName:'LABEL SWEEP 3',
  preset:{file:'SWEEP.syx',sha256:sha(r.syx),bodySha256:sha(body)},dictionarySha256:dictionaryHash,gridRequest:hex(R.gridRequest()),
  expectedGrid:readGrid(body).map(g=>[g.row,g.col,g.id,g.mask]),pilot:{effectId:58,paramId:6,index:1,label:findParam('amp','DISTORT_TYPE').enum[1]},extra:EXTRA,
  method:'Edit-buffer load (7F 00) only; fn=0x01 sub=0x1F display reads with the list index n as a 14-bit integer in the value field, n = 0..count+extra-1 per list parameter; grid + block bulk reads before, after the first request and after every block. No store, no SET.',
  requests,families};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest)+'\n');
console.log(JSON.stringify({families:families.length,present:families.filter(f=>f.present).map(f=>f.slug),params:families.reduce((n,f)=>n+f.params.length,0),requests}));

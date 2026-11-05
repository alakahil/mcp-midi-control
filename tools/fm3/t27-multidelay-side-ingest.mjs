// Receipt for the 2026-11-05 T27 Multi Delay side-effect test (FM3_SHOT_LOAD.py --load + FM3_SHOT_READ.py; one FM3-Edit
// edit on the default preset). Offline. The pack is rebuilt (tools/fm3/t27-multidelay-side-build.mjs) and must match the
// manifest SHA-256 recorded by the loader and the reader. Nothing was stored or set.
//   MDB_A..D (Base Type only, Scene 1 on A..D) and MDS (Presets word only, inconsistent and consistent pairs): the device
//     keeps all 484 words on load and when the channel becomes active, so it applies no fill from a stored word.
//   MDF + FM3-Edit: "Algorithm" on channel A changed pid 0 only; choosing "Pealing Bells" in "Type" on channel B (pid 114)
//     rewrote 39 words of that channel (the editor/device preset fill). Channels C and D unchanged.
// Usage: node tools/fm3/t27-multidelay-side-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-05/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t27-'));execFileSync('node',[path.join(ROOT,'tools/fm3/t27-multidelay-side-build.mjs'),tmp],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'FM3_T27_MDSIDE','manifest.json')),man=JSON.parse(mb);
fs.rmSync(tmp,{recursive:true,force:true});
const packSha256=sha(mb),WORDS=121,CH='ABCD';
const itemOf=id=>man.items.find(i=>i.id===id);

const kept=[];
for(const id of ['MDB_A','MDB_B','MDB_C','MDB_D','MDS']){
  const lf=path.join(RAW,`fm3-t27-shot-load-${id}.json`),rf=path.join(RAW,`fm3-t27-shot-read-${id}-after-load.json`),l=J(lf),r=J(rf),it=itemOf(id);
  assert.equal(l.kind,'fm3-shot-load');assert.equal(l.packSha256,packSha256,'pack rebuilt identically '+id);assert.equal(l.preset,id);assert.equal(l.name,it.name);
  assert.equal(l.allMatch,true,id);const lb=l.blocks[0];assert.equal(lb.effectId,74);assert.equal(lb.values,WORDS*4);assert.equal(lb.matches,true);
  for(const w of lb.testWords)assert.equal(w.device,w.raw,id+' '+w.param+' '+w.channel);
  assert.equal(r.kind,'fm3-shot-read');assert.equal(r.packSha256,packSha256);assert.equal(r.preset,id);
  const rb=r.blocks[0];assert.deepEqual(rb.device,it.blocks[0].expected,'re-read = generated preset '+id);
  kept.push({id,scene1Channel:it.scene1Channel,writes:it.blocks[0].writes.map(w=>({param:w.param,channel:w.channel,raw:w.raw,label:w.label})),
    load:{...rel(lf),time:l.time},read:{...rel(rf),time:r.time},wordsKept:rb.device.length});
}

const bf=path.join(RAW,'fm3-t27-shot-load-MDF.json'),basef=path.join(RAW,'fm3-t27-shot-read-MDF-base.json'),edf=path.join(RAW,'fm3-t27-shot-read-MDF-editor-algo-a-pealing.json');
const base=J(basef),ed=J(edf),mdf=itemOf('MDF').blocks[0].expected;
assert.equal(J(bf).allMatch,true);assert.equal(base.packSha256,packSha256);assert.equal(ed.packSha256,packSha256);
assert.deepEqual(base.blocks[0].device,mdf,'MDF baseline = device default');
const after=ed.blocks[0].device,diff=after.map((v,i)=>v!==mdf[i]?{channel:CH[Math.floor(i/WORDS)],pid:i%WORDS,from:mdf[i],to:v}:null).filter(Boolean);
const by=c=>diff.filter(d=>d.channel===c);
assert.deepEqual(by('A'),[{channel:'A',pid:0,from:0,to:1}],'Algorithm on A changes pid 0 only');
assert.equal(by('C').length+by('D').length,0,'C and D untouched');
const fill=by('B');assert.equal(fill.length,39);
assert.deepEqual(fill.find(d=>d.pid===114),{channel:'B',pid:114,from:0,to:12},'Type = preset 12 Pealing Bells');
assert.deepEqual(fill.find(d=>d.pid===0),{channel:'B',pid:0,from:0,to:2},'Pealing Bells sets Base Type 2');

const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,editor:'FM3-Edit 1.07.17',date:'2026-11-05',test:'T27',
 method:'FM3_SHOT_LOAD.py --load (Remote Control) sent each preset to the edit buffer (7F 00) and read the Multi Delay block back with fn=0x1F; FM3_SHOT_READ.py re-read it and saved all 484 words. For MDF, Claude changed Algorithm (channel A) and Type (channel B, Pealing Bells) in FM3-Edit without saving, closed FM3-Edit and re-read the block. Nothing stored or set.',
 packSha256,
 storedWordsKept:kept,
 editor:{baseline:{...rel(basef),time:base.time},after:{...rel(edf),time:ed.time},
  algorithm:{control:'Algorithm',param:'MULTITAP_BASETYPE',pid:0,channel:'A',changed:by('A')},
  preset:{control:'Type',param:'MULTITAP_PRESETS',pid:114,channel:'B',value:12,label:'Pealing Bells',wordsChanged:fill.length,fill:fill.map(({pid,from,to})=>({pid,from,to}))}},
 notMeasured:['audio','STORE/reload','fill tables of the other 38 Multi Delay presets','Multi Delay parameter display scales'],
 summary:{presetsWithAllWordsKept:kept.length,wordsPerPreset:WORDS*4,algorithmWordsChanged:1,presetFillWords:fill.length,
  meaning:'The FM3 applies no side effect from stored Base Type or Presets words; Base Type is a plain selector. Choosing a Multi Delay preset fills about 39 words, so Multi Delay parameters and Base Type become writable (0.3.49) while MULTITAP_PRESETS (Type) stays refused until each preset fill table is measured.'}};
const target=path.join(ENG,'references','fm3-shot-t27-multidelay-side-20261105.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T27 receipt stale');
console.log(JSON.stringify({kept:kept.map(k=>k.id+' '+k.wordsKept),algorithm:by('A').length,presetFill:fill.length}));

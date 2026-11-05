// Receipt for the 2026-11-05 T30 option-selector test (FM3_SHOT_LOAD.py --load + FM3_SHOT_READ.py; FM3-Edit readings
// taken by Claude from background screenshots, Jan clicked the block and Controllers tabs). Offline. The pack is rebuilt
// (tools/fm3/t30-enum-build.mjs) and must match the manifest SHA-256 recorded by the loader and the reader.
// Nothing was stored or set; FM3-Edit was quit without saving.
//   EN1: PEQ (132 words), Phaser (140), Multi Delay (484) and Controllers (520) read back unchanged; FM3-Edit showed
//        PEQ Type 1-5 Blocking / Shelving 2 / Peaking 2 / Shelving / Peaking 2, Phaser Quantize 3 (the list starts
//        OFF, OFF, 2, 3: stored 3 shows 3), Multi Delay EQ Type Bandpass and Comb Filters Filter Type Feedforward.
//   EN2: all records unchanged, the 17 Controllers selectors read back as written and FM3-Edit showed every expected
//        option on the Tempo/Pitch, LFO 1+2, ADSR 1, ADSR 2, Sequencer and Envelope/Manual pages.
// Promotion: the 25 selectors read here plus the 3 Controllers selectors T28 read (LFO 1/2 Type, ADSR 1 Mode) become
// default-writable ('enum-labels-crosschecked', evidence hardware-t30 / hardware-t28).
// Usage: node tools/fm3/t30-enum-ingest.mjs [--write]
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
const {loadDictionary,decodeValue}=await import(path.join(ENG,'scripts/fm3-table-encoder.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t30-'));execFileSync('node',[path.join(ROOT,'tools/fm3/t30-enum-build.mjs'),tmp],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'FM3_T30_ENUM','manifest.json')),man=JSON.parse(mb);
fs.rmSync(tmp,{recursive:true,force:true});
const packSha256=sha(mb),dict=loadDictionary().params,byName=n=>dict.find(p=>p.name===n);

// FM3-Edit 1.07.17 readings (screenshots 2026-11-05 13:18-13:27 UTC, presets unsaved in the edit buffer).
const SHOWN={EN1:{PEQ_TYPE1:'Blocking',PEQ_TYPE2:'Shelving 2',PEQ_TYPE3:'Peaking 2',PEQ_TYPE4:'Shelving',PEQ_TYPE5:'Peaking 2',
  PHASER_LFOQUANTIZE:'3',MULTITAP_FILTER_TYPE:'Bandpass',MULTITAP_COMBTYPE:'Feedforward'},
 EN2:{CONTROLLERS_PITCH_SOURCE:'Input 2',CONTROLLERS_LFO1RUN:'Stop',CONTROLLERS_LFO1TEMPO:'1/8',CONTROLLERS_LFO1QUANTIZE:'4',
  CONTROLLERS_LFO2RUN:'Stop',CONTROLLERS_LFO2TEMPO:'1/4 Dot',CONTROLLERS_LFO2QUANTIZE:'2',
  CONTROLLERS_ADSR1SOURCE:'Input 2',CONTROLLERS_ADSR1_TYPE:'Linear',CONTROLLERS_ADSR1RETRIG:'ON',
  CONTROLLERS_ADSR2SOURCE:'Input 2',CONTROLLERS_ADSR2_TYPE:'Linear',CONTROLLERS_ADSR2MODE:'Sust',CONTROLLERS_ADSR2RETRIG:'ON',
  CONTROLLERS_SEQTEMPO:'1/16',CONTROLLERS_SEQRUN:'Pause',CONTROLLERS_ENVSOURCE:'Input 2'}};
const PAGE={PEQ:'PEQ',PHASER:'Phaser Expert 1',MULTITAP_FILTER_TYPE:'Multi Delay EQ',MULTITAP_COMBTYPE:'Multi Delay Comb Filters',
  PITCH:'Tempo/Pitch',LFO:'LFO 1 + 2',ADSR1:'ADSR 1',ADSR2:'ADSR 2',SEQ:'Sequencer',ENV:'Envelope/Manual'};
const page=n=>PAGE[n]??PAGE[n.split('_')[0]]??PAGE[(/^CONTROLLERS_(PITCH|LFO|ADSR1|ADSR2|SEQ|ENV)/.exec(n)??[])[1]];
const norm=s=>String(s).trim().toLowerCase();
const runs={},readings=[];
for(const id of ['EN1','EN2']){
  const it=man.items.find(i=>i.id===id);
  const lf=path.join(RAW,`fm3-t30-shot-load-${id}.json`),rf=path.join(RAW,`fm3-t30-shot-read-${id}-after-load.json`),l=J(lf),r=J(rf);
  assert.equal(l.kind,'fm3-shot-load');assert.equal(l.packSha256,packSha256,'pack rebuilt identically');assert.equal(l.preset,id);assert.equal(l.name,it.name);assert.equal(l.allMatch,true,id);
  assert.equal(r.kind,'fm3-shot-read');assert.equal(r.packSha256,packSha256);assert.equal(r.preset,id);
  assert.deepEqual(r.blocks.map(b=>b.effectId),it.blocks.map(b=>b.effectId));
  it.blocks.forEach((b,k)=>{assert.equal(l.blocks[k].matches,true,id+' '+b.family);assert.deepEqual(r.blocks[k].device,b.expected,id+' re-read '+b.family);
    for(const w of b.writes){const tw=l.blocks[k].testWords.find(x=>x.param===w.param);assert.equal(tw.device,w.raw,w.param);
      const p=byName(w.param),stored=r.blocks[k].device[w.pid],shown=SHOWN[id][w.param];assert.ok(shown,w.param);
      assert.equal(norm(decodeValue(p,stored)),norm(shown),id+' '+w.param);
      readings.push({preset:id,param:w.param,pid:w.pid,label:p.label,page:page(w.param),before:w.before,raw:stored,decoded:decodeValue(p,stored).trim(),shown});}});
  assert.equal(readings.filter(x=>x.preset===id).length,Object.keys(SHOWN[id]).length);
  runs[id]={load:{...rel(lf),time:l.time,allMatch:l.allMatch},read:{...rel(rf),time:r.time},records:it.blocks.map((b,k)=>({family:b.family,effectId:b.effectId,words:r.blocks[k].device.length}))};
}
assert.equal(readings.length,25);
// T28 already read LFO 1/2 Type and ADSR 1 Mode on Controllers channel A (references/fm3-shot-t28-controllers-20261105.json).
const t28File='fm3-shot-t28-controllers-20261105.json',t28=J(path.join(ENG,'references',t28File));
const t28Read=t28.editorReadings.filter(x=>x.channel==='A'&&byName(x.param).kind==='enum');
assert.deepEqual(t28Read.map(x=>x.param).sort(),['CONTROLLERS_ADSR1MODE','CONTROLLERS_LFO1TYPE','CONTROLLERS_LFO2TYPE']);
const promote=[...readings.map(x=>({name:x.param,evidence:'hardware-t30'})),...t28Read.map(x=>({name:x.param,evidence:'hardware-t28'}))].map(x=>{
  const p=byName(x.name);assert.equal(p.status,'enum-labels',x.name);
  return {family:p.family,param:p.param,name:p.name,options:p.enum.length,enumBase:p.enumBase??0,evidence:x.evidence};});
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,editor:'FM3-Edit 1.07.17',date:'2026-11-05',test:'T30',
 method:'FM3_SHOT_LOAD.py --load (Remote Control) sent EN1 and then EN2 to the edit buffer (7F 00) and read the PEQ, Phaser, Multi Delay and Controllers records back with fn=0x1F; FM3_SHOT_READ.py re-read them. After each load Claude opened FM3-Edit in the background, selected the blocks and read the pages from screenshots (Jan clicked the page tabs), then quit FM3-Edit without saving. Nothing stored or set.',
 packSha256,runs,editorReadings:readings,t28Receipt:{file:t28File,sha256:sha(fs.readFileSync(path.join(ENG,'references',t28File))),readings:t28Read.map(x=>({param:x.param,shown:x.shown}))},
 promote,
 keptOptIn:{GLOBAL:'global settings are never written',MOD:'modifier settings go through modifiers',routing:'Mixer, Multiplexer, Feedback Return, Output, Input and Volume/Pan bypass, mode and routing words',
  typeSelectors:'channel type/model selectors need full channel templates',pickers:'learn buttons, layout presets and IR bank pickers',CONTROLLERS_TEMPOTOUSE:'refused by the Controllers writer'},
 notMeasured:['audio','STORE/reload','options other than the ones read'],
 summary:{deviceWordsMatched:2*(132+140+484+520),editorReadingsMatched:readings.length,promoted:promote.length,
  meaning:'Every selector read here shows the label the dictionary decodes (no index shift; Phaser/Controllers Quantize: stored n shows n). These 25 selectors and the 3 T28-read Controllers selectors become default-writable.'}};
const target=path.join(ENG,'references','fm3-shot-t30-enum-20261105.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T30 receipt stale');
console.log(JSON.stringify({readings:readings.length,promoted:promote.length}));

// O4 (audit 2026-11-06, device-free): Multi Delay presets (FM3-Edit "Type", MULTITAP_PRESETS pid 114).
// Offline analysis of the only measured preset fill (T27 2026-11-05: FM3-Edit chose Pealing Bells on channel B of the
// device-default Multi Delay block; the FM3 block was read back with fn=0x1F). It separates Algorithm (pid 0) from the
// preset word, decodes the 39 filled words with the FW13 dictionary, checks which of them FM3-Edit shows for the
// resulting Algorithm, and records what a device sweep must measure for the other presets. Nothing is written to a preset.
// Usage: node tools/fm3/o4-multidelay-presets.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-05/');
const {typeApplicability}=await import(path.join(ENG,'scripts/fm3-type-applicability.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const t27f=path.join(ENG,'references/fm3-shot-t27-multidelay-side-20261105.json'),t27=J(t27f);
const basef=path.join(RAW,'fm3-t27-shot-read-MDF-base.json'),aftf=path.join(RAW,'fm3-t27-shot-read-MDF-editor-algo-a-pealing.json');
assert.equal(t27.editor.baseline.sha256,sha(fs.readFileSync(basef)));assert.equal(t27.editor.after.sha256,sha(fs.readFileSync(aftf)));
const dict=J(path.join(ENG,'references/fm3-param-dictionary.json'));
const P=new Map(dict.params.filter(p=>p.family==='MULTITAP').map(p=>[p.param,p]));
const W=121,base=J(basef).blocks[0].device,after=J(aftf).blocks[0].device;
assert.equal(P.size,W);assert.equal(base.length,4*W);assert.equal(after.length,4*W);
const ch=(a,c)=>a.slice(c*W,(c+1)*W);
for(let c=1;c<4;c++)assert.deepEqual(ch(base,c),ch(base,0),'default channels identical');
const def=ch(base,0),pb=ch(after,1);
const PRESETS=P.get(114).enum,ALGOS=P.get(0).enum;
assert.equal(PRESETS.length,39);assert.equal(PRESETS[12],'Pealing Bells');assert.equal(def[114],0);assert.equal(def[0],0);
const round=x=>Number(x.toPrecision(6));
function display(p,w){
  const m=p.displayMultiplier||1;
  if(p.kind==='enum')return p.enum[w-(p.enumBase??0)]??null;
  if(p.kind==='integer')return w*(p.integerScale??1)+(p.displayOffset??0);
  if(p.kind==='log')return round(p.min*Math.pow(p.max/p.min,w/65534)*m);
  if(p.kind==='linear')return round((p.min+w/65534*(p.max-p.min))*m);
  return null;
}
const algo=pb[0];assert.equal(ALGOS[algo],'Quad Series Delay');
const fill=[];
for(let pid=0;pid<W;pid++){
  if(pb[pid]===def[pid])continue;const p=P.get(pid),vis=typeApplicability(p,{type:algo});
  fill.push({pid,name:p.name,label:p.label,kind:p.kind,status:p.status,from:def[pid],to:pb[pid],fromDisplay:display(p,def[pid]),toDisplay:display(p,pb[pid]),
    shownForAlgorithm:vis.covered&&vis.stateValid?vis.allowed:null});
}
assert.equal(fill.length,39);assert.deepEqual(fill.map(f=>f.pid),t27.editor.preset.fill.map(f=>f.pid));
const shown=fill.filter(f=>f.shownForAlgorithm===true).map(f=>f.pid),hidden=fill.filter(f=>f.shownForAlgorithm===false).map(f=>f.pid);
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-11-07',audit:'O4',
 sources:{t27Receipt:rel(t27f),baseline:rel(basef),after:rel(aftf)},
 words:{perChannel:W,algorithm:{pid:0,name:'MULTITAP_BASETYPE',editorLabel:'Algorithm',options:ALGOS},preset:{pid:114,name:'MULTITAP_PRESETS',editorLabel:'Type',options:PRESETS}},
 algorithmVsPreset:'Algorithm (pid 0) is a plain selector: T27 changed it alone and only pid 0 moved. The preset word (pid 114) is a label: stored alone it fills nothing (T27 MDS), while choosing a preset in FM3-Edit set the Algorithm and filled other words. A preset is therefore a full channel image, not a selector write.',
 defaultChannel:{presetWord:0,presetLabel:PRESETS[0],algorithm:ALGOS[0],words:def,
  status:'device default of a freshly inserted block (T26/T27); it carries preset word 0 "Quad-Tap Delay". Whether choosing "Quad-Tap Delay" in FM3-Edit fills exactly this image is not measured.'},
 pealingBells:{presetWord:12,algorithm:ALGOS[algo],channelMeasured:'B',fillWords:fill.length,shownWords:shown,hiddenWords:hidden,fill,words:pb,
  status:'measured once: FM3-Edit preset choice on the device-default channel, FM3 block read back (fn=0x1F). The 121-word image is exact for that start state; audio, STORE/reload and the fill from a non-default start are not measured.'},
 otherPresets:{count:PRESETS.length-2,labels:PRESETS.filter((_,i)=>i!==0&&i!==12),status:'fill tables not measured; the editor/device fill is not in the repository (the FM3-Edit table was not extracted)'},
 deviceSweep:{method:'T27 MDF method: FM3_SHOT_LOAD.py --load sends the device-default preset to the edit buffer (7F 00); in FM3-Edit choose one Type on channel A, do not save, close FM3-Edit; FM3_SHOT_READ.py reads the block (fn=0x1F, read only). One preset per read, 37 reads plus a "Quad-Tap Delay" control read. Nothing stored or set.',
  acceptance:'per preset: only channel A changes, pid 114 = preset index, the full 121-word image is recorded; a repeat of Pealing Bells must equal this image',
  thenWritable:'a preset becomes a full-channel template (all 121 words replaced) on the chosen channel; other controls apply on top and keep the normal visibility policy'}};
const target=path.join(ENG,'references','fm3-o4-multidelay-presets-20261107.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'O4 analysis stale');
console.log(JSON.stringify({algorithm:ALGOS[algo],fill:fill.length,shown:shown.length,hidden:hidden.length,unknownVisibility:fill.length-shown.length-hidden.length}));

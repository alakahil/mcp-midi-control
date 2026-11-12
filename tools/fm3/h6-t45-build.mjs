// H6/T45/T46 preparation only (11.11.2026, for the 12.11 device session). Offline; writes the packs, never device I/O.
//   H6   = LIVE KOOSLUS V1.2: H5 (V1.1) with Amp C Level -5 dB (lead +2 dB more; user's H5/H5B verdict).
//   T45  = generator-written Per-Preset switches (0.3.66): Layout 1 switch 1 = Effect Bypass Drive 1, switch 2 = Delay 1,
//          switch 3 = Scene 3, switch 4 = Reverb 1. Import, FM3-Edit display, footswitch behaviour and STORE are unmeasured.
//   T46A..D = Effect-index sweep: 24 Per-Preset definitions each (Effect, Bypass, index 0..92, no overrides), written
//          low-level into the T44 base. Load only, no STORE: Claude reads each PP card's effect name in FM3-Edit.
// The run script loads, reads blocks back and (H6/T45) waits for the user's playing/STORE round, then reads the stored
// location with the read-only stored-dump request. It never stores, sets or switches.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {bulkReadPoll} from './fm3-read-requests.mjs';
import {specs as h5Specs,H5_LEVELS} from './h5-t43-build.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {createPreset,writePresetOutputs,verifyPresetOutputs}=await import(path.join(E,'scripts/fm3-preset.mjs'));
const {inspectStructure}=await import(path.join(E,'scripts/drive-collector/fm3-prototype.mjs'));
const {scanRecords}=await import(path.join(E,'scripts/fm3-layout.mjs'));
const {readCsPreset}=await import(path.join(E,'scripts/fm3-cs-preset.mjs'));
const {parsePresetDump,decodeRawPatch,reencodeRawPatch,reencodeDumpFromRawPatch}=await import(path.join(E,'scripts/fm3-codec.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
export const KIND='fm3-h6-t45-preparation',CASES=['H6','T45','T46A','T46B','T46C','T46D'];
const BASE=path.join(E,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
export const H6_LEVELS={...H5_LEVELS,C:-5};
export const T45_SWITCHES=[{layout:1,switch:1,effect:'drive1'},{layout:1,switch:2,effect:'delay1',function:'bypass'},
 {layout:1,switch:3,scene:3},{layout:1,switch:4,effect:'reverb1'}];
// T46: Effect-parameter indices 0..92 (FM3-Edit FW13 list length), 24 definitions per preset.
export const T46_INDEX={T46A:[0,23],T46B:[24,47],T46C:[48,71],T46D:[72,92]};
// Per-preset definition k words, counted from the body end (T16/T44): category, function, first param word.
export const ppWords=k=>({category:3052-2*k,function:3052-48-2*k,param:3052-144-12*k});
export function writeIndexSweep(syx,[lo,hi]){
 const raw=decodeRawPatch(parsePresetDump(syx,0,17).chunkPayloads),body=Buffer.from(raw.body);
 for(let i=lo,k=0;i<=hi;i++,k++){const w=ppWords(k);
  for(const [at,v] of [[w.category,4],[w.function,0],[w.param,i]]){assert.equal(body.readUInt16LE(body.length-at),0,'unused PP word');body.writeUInt16LE(v,body.length-at);}}
 return Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(raw.rawPatch,body)));
}
export function specs(tmp){
 const h5=h5Specs(tmp),byId=Object.fromEntries(h5.cases.map(c=>[c.id,c.spec]));
 const ctl=byId.H5.controls.filter(c=>!(c.block==='amp'&&c.param==='DISTORT_LEVEL'));
 const h6={...structuredClone(byId.H5),composer:{...structuredClone(byId.H5.composer),name:'LIVE KOOSLUS V1.2'},
  purpose:'LIVE KOOSLUS V1.2 (H6): V1.1 + H5/H5B kuulamise järgi lead (Amp C) veel +2 dB (-5). Amp A ja D -10,16, Amp B -9. Muu nagu V1.',
  controls:[...ctl,...Object.entries(H6_LEVELS).map(([channel,value])=>({block:'amp',channel,param:'DISTORT_LEVEL',value}))]};
 const t44=byId.T44,named=(name,s)=>({...structuredClone(t44),composer:{...structuredClone(t44.composer),name,
  scenes:Array.from({length:8},(_,i)=>({scene:i+1,name:i<4?`${name.split(' ')[0]} S${i+1}`:'TEST DEFAULT'}))},...s});
 const t45=named('T45 PP GEN',{footswitches:T45_SWITCHES,
  purpose:'T45: generaatori kirjutatud Per-Preset lülitid (0.3.66). Layout 1: lüliti 1 Drive 1 Bypass, 2 Delay 1 Bypass, 3 Scene 3, 4 Reverb 1 Bypass. Import, kuva, käitumine ja STORE on mõõtmata.'});
 const sweep=Object.entries(T46_INDEX).map(([id,r])=>({id,name:id+' PP INDEX',spec:named(id+' PP INDEX',
  {purpose:`${id}: Effect-indeksi kaardistus. Alus nagu T44; build kirjutab 24 PP definitsiooni (Effect, Bypass, indeks ${r[0]}..${r[1]}), asendusi pole.`}),
  scenes:1,range:r,loadOnly:true,
  expected:`${id}: FM3-Editi FC Per-Prst lehel on PP#1..PP#${r[1]-r[0]+1} kõik Effect, Bypass; igal kaardil mingi efekti nimi (indeks ${r[0]}..${r[1]}). Claude loeb nimed. STORE-i pole vaja.`,
  history:'T44 (11.11): Drive 1 = 9, Delay 1 = 7, Reverb 1 = 51. Ülejäänud indeksite tähendus on teadmata.'}));
 return {v1Syx:h5.v1Syx,cases:[
  {id:'H6',name:'LIVE KOOSLUS V1.2',spec:h6,scenes:8,
   expected:'LIVE KOOSLUS V1.2: nagu V1.1, aga lead (stseenid 3 ja 7) 2 dB valjem. Kõik 8 stseeni on umbes sama valjud; lead võib olla pisut esil; ükski ei klipi.',
   history:'H5/H5B (11.11): A/D sobivad, Clean/Ambient ok, lead võiks veel valjem olla. H6 tasemed on pakutud, kuulamata.'},
  {id:'T45',name:'T45 PP GEN',spec:t45,scenes:4,
   expected:'T45: FC Per-Prst lehel PP#1 Effect Bypass Drive 1, PP#2 Effect Bypass Delay 1, PP#3 Scene Select Scene 3, PP#4 Effect Bypass Reverb 1. FM3 lüliti 1 lülitab Drive 1, lüliti 2 Delay 1 sisse/välja, lüliti 3 valib stseeni 3.',
   history:'T44 (11.11): FM3-Editis tehtud samad määrangud salvestati ja loeti tagasi; generaatori kirjutatud faili import ja jalglülitite käitumine on kontrollimata.'},
  ...sweep]};
}
export function build(out){
 assert.equal(process.versions.node.split('.')[0],'22','Use Node 22');
 fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Use an empty output directory');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-h6-')),packs=[],base=fs.readFileSync(BASE);
 try{
  const {cases,v1Syx}=specs(tmp);
  for(const k of cases){
   const d=path.join(out,k.id);fs.mkdirSync(d);const stem=path.join(d,k.id),r=createPreset(base,k.spec);
   writePresetOutputs(stem,r,k.spec);verifyPresetOutputs(stem);
   if(k.range){ // T46: replace the 4-file set by the low-level sweep file (the spec/TXT would no longer describe it)
    const swept=writeIndexSweep(fs.readFileSync(stem+'.syx'),k.range);
    for(const x of ['.txt','.spec.json'])fs.rmSync(stem+x);fs.writeFileSync(stem+'.syx',swept);
   }
   const syx=fs.readFileSync(stem+'.syx'),st=inspectStructure(syx),body=Buffer.from(st.raw.body),{records}=scanRecords(body);
   assert.deepEqual([...st.parsed.headerPayload],[127,0,0,64,0],'edit-buffer header');
   assert.equal(String(st.decoded.preset_name).trim(),k.name);
   let pp=null;
   if(k.id==='H6'){
    const v1=Buffer.from(inspectStructure(v1Syx).raw.body);assert.equal(v1.length,body.length);
    let diff=0;for(let i=0;i<body.length;i+=2)if(body.readUInt16LE(i)!==v1.readUInt16LE(i))diff++;
    assert.ok(diff>=1&&diff<=20,'H6 differs from V1 only in name + levels: '+diff);
    const txt=fs.readFileSync(stem+'.txt','utf8');
    for(const [ch,v] of Object.entries(H6_LEVELS)){
     const m=txt.match(new RegExp(`amp ${ch}: [^\\n]*Level (-?[\\d.]+) dB`));assert.ok(m&&Math.abs(Number(m[1])-v)<0.01,`Amp ${ch} Level ${v}: ${m&&m[1]}`);}
   }else if(k.id==='T45'){
    pp=readCsPreset(body,k.spec).footswitches;
    assert.deepEqual(pp.map(f=>[f.switch,f.kind,f.effect??null,f.scene??null]),
     [[1,'effect','drive1',null],[2,'effect','delay1',null],[3,'scene',null,3],[4,'effect','reverb1',null]]);
   }else{
    const n=k.range[1]-k.range[0]+1;pp=[];
    for(let j=0;j<24;j++){const w=ppWords(j);pp.push([body.readUInt16LE(body.length-w.category),body.readUInt16LE(body.length-w.param)]);}
    assert.deepEqual(pp.slice(0,n),Array.from({length:n},(_,j)=>[4,k.range[0]+j]));
    assert.ok(pp.slice(n).every(([c,p])=>c===0&&p===0));pp=pp.slice(0,n).map(([,p],j)=>({pp:j+1,index:p}));
   }
   const validation=JSON.parse(fs.readFileSync(stem+'.validation.json')),cpu=validation.cpu??validation.report?.cpu;
   assert.ok(cpu&&cpu.maxPercent<cpu.limitPercent,'CPU estimate under the safe limit');
   if(k.range)fs.rmSync(stem+'.validation.json'); // describes the pre-sweep file only
   const blocks=records.filter(x=>x.family!=='send').map(x=>({family:x.family,effectId:x.eid,words:x.words,channels:x.channels,
    request:Buffer.from(bulkReadPoll(x.eid)).toString('hex'),
    expected:Array.from({length:x.words*x.channels},(_,i)=>body.readUInt16LE(x.start+2*i)),writes:[]}));
   const preset={file:'../'+k.id+'.syx',sha256:sha(syx)};
   const checks=k.loadOnly?[]:[{id:'name_grid_scenes',text:`Kas nimi ${k.name}, TXT ruudustik ning stseenide nimed/kanalid/bypass on õiged? jah/ei/mõõtmata.`},
    ...(k.id==='T45'?[
     {id:'pp_display',text:'Claude loeb FM3-Editi FC Per-Prst lehelt PP#1..PP#4 määrangud. Oodatud: PP#1 Effect Bypass Drive 1, PP#2 Effect Bypass Delay 1, PP#3 Scene Select Scene 3, PP#4 Effect Bypass Reverb 1. Kirjuta "Claude" või oma näidud.'},
     {id:'pp_switch',text:'Vajuta FM3 lülitit 1 (Drive 1), siis 2 (Delay 1) mitu korda ja kuula; vajuta lülitit 3 (stseen 3). Kas Drive ja Delay lülitusid sisse-välja ning lüliti 3 valis stseeni 3? Kirjelda erinevust.'}]:
    [{id:'scenes1_4',text:'Mängi stseenid 1–4 päris kitarriga. Kas heli on õige, valjus sobib teistega ja Out 1 näidik ei lähe punaseks? Kirjelda, mis stseenis mis erines.'},
     {id:'scenes5_8',text:'Mängi stseenid 5–8. Sama küsimus: heli, valjus teiste suhtes, klippimine.'},
     {id:'balance',text:'Kas lead (stseen 3 ja 7) on nüüd sobiva valjusega? Kui ei, siis ligikaudu mitu dB veel juurde või maha.'},
     {id:'cpu',text:'CPU: Claude loeb FM3-Editist stseenide 1–8 protsendid. Kirjuta "Claude" või oma näidud.'}]),
    {id:'behavior',text:k.expected+' Kas vastab? jah/ei; kirjelda erinevust.'}];
   for(const dir of ['shot','store'])fs.mkdirSync(path.join(d,dir));
   const shot={kind:'fm3-shot-check',version:1,test:k.id,items:[{id:k.id,name:k.name,...preset,blocks}],
    scope:'Listed effect-block parameter words only. Controllers, modifiers, grid, scenes, per-preset switches, Send and system tail require the later whole-preset STORE comparison.'};
   const bind={kind:'fm3-bind-store',version:1,test:k.id,confirmName:k.name,preset,
    checks:k.loadOnly?[{id:'pp_names',text:'Claude loeb FM3-Editist PP-kaartide efektinimed. Kirjuta "Claude".'}]:checks,expect:k.expected,
    storeLocationPolicy:'User chooses a backed-up/expendable slot. No automatic STORE, preset/scene selection, SET or global writes.'};
   for(const [dir,value] of [['shot',shot],['store',bind]])fs.writeFileSync(path.join(d,dir,'manifest.json'),JSON.stringify(value,null,2)+'\n');
   fs.writeFileSync(path.join(d,'VAATLUSED.txt'),k.name+'\n\nVarasem tõend: '+k.history+'\n\n'+
    (k.loadOnly?'Ainult laadimine. Ava FM3-Edit → FC Per-Prst; Claude pildistab PP-kaardid (vajadusel klõpsab kaartidel). STORE-i ei tehta.\n'+
     k.expected+'\n':checks.map(x=>x.text).join('\n\n')+
     '\n\nCPU tarkvarahinnang (mitte mõõtmine, '+cpu.model+'): '+cpu.scenes.slice(0,k.scenes).map(s=>`S${s.scene} ${s.percent}%`).join(', ')+'\n'));
   packs.push({id:k.id,name:k.name,stem:k.id+'/'+k.id,presetSha256:preset.sha256,expected:k.expected,history:k.history,
    scenesUsed:k.scenes,loadOnly:k.loadOnly===true,perPreset:pp,
    cpuEstimate:{model:cpu.model,scenes:cpu.scenes.map(s=>s.percent)},blockRecords:records.length,
    shotManifestSha256:sha(fs.readFileSync(path.join(d,'shot/manifest.json'))),
    storeManifestSha256:sha(fs.readFileSync(path.join(d,'store/manifest.json'))),
    fourFilesVerified:!k.loadOnly,hardwareTested:false});
  }
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 for(const f of ['FM3_CPU_SWEEP.py','FM3_READ_PROBE.py','FM3_BIND_STORE.py','FM3_SHOT_LOAD.py','FM3_SHOT_READ.py'])
  fs.copyFileSync(path.join(E,'scripts/cpu-sweep-collector',f),path.join(out,f));
 fs.copyFileSync(path.join(ROOT,'tools/fm3/h6-t45-run.py'),path.join(out,'ALUSTA.py'));
 fs.writeFileSync(path.join(out,'ALUSTA.command'),'#!/bin/bash\nset -euo pipefail\ncd -- "$(dirname -- "$0")"\nexec python3 -B ALUSTA.py "$@"\n',{mode:0o755});
 fs.copyFileSync(path.join(ROOT,'docs/fm3/FM3_H6_T45_GUIDE.txt'),path.join(out,'LOE_MIND.txt'));
 const files=[];function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const p=path.join(d,f.name);if(f.isDirectory())walk(p);else files.push({path:path.relative(out,p),sha256:sha(fs.readFileSync(p))});}}walk(out);
 const version=JSON.parse(fs.readFileSync(path.join(ROOT,'plugins/fm3-sound-architect-2/plugin.json'))).version;
 fs.writeFileSync(path.join(out,'pack.json'),JSON.stringify({kind:KIND,schemaVersion:1,version,date:'2026-11-12',packs,files,
  deviceIO:false,newHardwareMeasurements:false,
  allowedStoredDifferences:['selected-scene byte 0','whole-record ordering','SysEx destination header'],
  evidenceBoundary:'H6 is a level variant of V1.1; T45 tests generator-written per-preset switches; T46A-D map Effect indices by FM3-Edit display only (no STORE). Bytes, display, sound and switches are judged separately; preparation increments no hardware counters.'},null,2)+'\n');
 execFileSync('python3',['-B',path.join(out,'ALUSTA.py'),'--preflight'],{stdio:'pipe'});
 return {passed:true,presets:packs.length,preflight:true,deviceIO:false,
  sha256:Object.fromEntries(packs.map(p=>[p.id,p.presetSha256]))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'Usage: h6-t45-build.mjs EMPTY_OUT_DIR');console.log(JSON.stringify(build(path.resolve(process.argv[2]))));
}

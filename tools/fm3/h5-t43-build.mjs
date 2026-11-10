// H5/H5B/T43 preparation only (11.11.2026). Offline; writes the packs, never device I/O.
//   H5  = LIVE KOOSLUS V1.1: V1 (T32C) with Amp A/D Level -2 dB and Amp C +1 dB (user's H3 level verdict).
//   H5B = LIVE KOOSLUS V1.1B: V1 amp levels unchanged; the same balance through Out 1 Scene Levels (OUTPUT_SCENE1..8).
//   T43 = modifier targets, second round: seven bindings on six block families from four Scene Controllers and Manual 1.
//   T44 = per-preset footswitch capture: a plain base preset; the USER adds four Per-Preset Switch definitions in FM3-Edit
//         (Effect Bypass Drive 1 / Delay 1 / Reverb 1, Scene 3) and STOREs; the stored dump shows the category, function
//         and effect-index words. FM3-Edit FW13 (Ghidra) and the FW10 factory banks give category 3 = Scene, 4 = Effect,
//         7 = Control Switch, but the Effect parameter is an index whose block mapping is unknown.
// The run script loads, reads blocks back, waits for the user's playing/STORE round and reads the stored location
// with the read-only stored-dump request. It never stores, sets or switches.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {bulkReadPoll} from './fm3-read-requests.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {createPreset,writePresetOutputs,verifyPresetOutputs}=await import(path.join(E,'scripts/fm3-preset.mjs'));
const {inspectStructure}=await import(path.join(E,'scripts/drive-collector/fm3-prototype.mjs'));
const {scanRecords}=await import(path.join(E,'scripts/fm3-layout.mjs'));
const {readModifiers}=await import(path.join(E,'scripts/fm3-parameter-dependencies.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
export const KIND='fm3-h5-t43-preparation',CASES=['H5','H5B','T43','T44'];
const BASE=path.join(E,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
// H5: amp levels (dB). V1 = A -8.1594 (template), B -9, C -8, D -8.1594 (template).
export const H5_LEVELS={A:-10.16,B:-9,C:-7,D:-10.16};
// H5B: Out 1 scene levels (dB), scenes 1..8: clean/Plexi -2, crunch 0, lead +1.
export const H5B_SCENES=[-2,0,1,-2,-2,0,1,-2];
// T43: Scene Controller values per scene 1..4 (scenes 5..8 = 0) and the expected targets.
export const T43_SC={1:[0,100,50,0],2:[0,0,100,50],3:[0,50,100,0],4:[0,100,50,0]};
export const T43_TARGETS=[
 {source:'Scene Controller 1',block:'amp',param:'DISTORT_LEVEL',min:-12,max:-6,label:'Amp Level',unit:'dB'},
 {source:'Scene Controller 2',block:'drive',param:'FUZZ_DRIVE',min:2,max:8,label:'Drive Drive',unit:''},
 {source:'Scene Controller 3',block:'delay',param:'DELAY_FEED',min:10,max:60,label:'Delay Feedback',unit:'%'},
 {source:'Scene Controller 4',block:'reverb',param:'REVERB_TIME',min:1,max:6,label:'Reverb Time',unit:'s'},
 {source:'Manual 1',block:'chorus',param:'CHORUS_DEPTH',min:20,max:80,label:'Chorus Depth',unit:'%'},
 {source:'Scene Controller 4',block:'out1',param:'OUTPUT_LEVEL',min:-4,max:0,label:'Out 1 Level',unit:'dB'},
 {source:'Scene Controller 2',block:'chorus',param:'CHORUS_BYPASS',label:'Chorus Bypass (lüliti)',unit:''}];
const T43_MANUAL1=50;
const scVal=(t,s)=>t.source==='Manual 1'?T43_MANUAL1:(T43_SC[Number(t.source.at(-1))][s-1]);
const expectAt=(t,s)=>t.min===undefined?(scVal(t,s)>=50?'SC2 '+scVal(t,s)+'%':'SC2 '+scVal(t,s)+'%'):
 Math.round((t.min+(t.max-t.min)*scVal(t,s)/100)*100)/100;
function v1Spec(tmp){
 execFileSync('node',[path.join(ROOT,'tools/fm3/t32-live-build.mjs'),path.join(tmp,'t32')],{stdio:'ignore'});
 const stem=path.join(tmp,'t32','FM3_T32C_FINAL','LIVE_KOOSLUS_V1');verifyPresetOutputs(stem);
 return {spec:JSON.parse(fs.readFileSync(stem+'.spec.json')),syx:fs.readFileSync(stem+'.syx')};
}
export function specs(tmp){
 const v1=v1Spec(tmp),base=v1.spec,ctl=(base.controls??[]).filter(c=>!(c.block==='amp'&&c.param==='DISTORT_LEVEL'));
 const h5={...structuredClone(base),composer:{...structuredClone(base.composer),name:'LIVE KOOSLUS V1.1'},
  purpose:'LIVE KOOSLUS V1.1 (H5): V1 + H3 kuulamise järgi Amp A ja D Level -2 dB (-10,16), Amp C +1 dB (-7), Amp B -9 dB muutmata. Muu nagu V1.',
  controls:[...ctl,...Object.entries(H5_LEVELS).map(([channel,value])=>({block:'amp',channel,param:'DISTORT_LEVEL',value}))]};
 const h5b={...structuredClone(base),composer:{...structuredClone(base.composer),name:'LIVE KOOSLUS V1.1B'},
  purpose:'LIVE KOOSLUS V1.1B (H5B): V1 amp-tasemed muutmata; sama tasakaal Out 1 Scene Level kaudu (S1/4/5/8 -2 dB, S2/6 0, S3/7 +1 dB).',
  controls:[...(base.controls??[]),...H5B_SCENES.map((value,i)=>({block:'out1',channel:'A',param:'OUTPUT_SCENE'+(i+1),value}))]};
 const names=['T43 S1 BASE','T43 S2','T43 S3','T43 S4'];
 const t43={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'T43 MOD TARGETS 2',
   modifiers:{external1Wah:false},reverbChannels:[{channel:'A',type:'Room: Recording Studio A'}],
   chorusChannels:[{channel:'A',type:'Analog Stereo'}],driveChannels:[{channel:'A',type:'T808 OD'}],delayChannels:[{channel:'A',type:'Digital Stereo'}],
   scenes:Array.from({length:8},(_,i)=>({scene:i+1,name:names[i]??'TEST DEFAULT'}))},
  layout:{row2:['drive','chorus','amp','cab'],row3:['delay','reverb']},selectedScene:1,
  blockScenes:Object.fromEntries(['drive','chorus','amp','cab','delay','reverb'].map(b=>[b,Array.from({length:8},(_,i)=>({scene:i+1,channel:'A',bypass:false}))])),
  modifierTargets:T43_TARGETS.map(({label,unit,...t})=>t),
  controllers:[...[1,2,3,4].flatMap(n=>T43_SC[n].concat([0,0,0,0]).map((value,i)=>({channel:'A',param:`SCENE${n}_VAL${i+1}`,value}))),
   {channel:'A',param:'MANUAL1',value:T43_MANUAL1}],
  context:{guitar:'Ibanez AS-120',pickups:'humbucker',output:'OUT1 stereo FOH'},
  purpose:'T43: modifikaatori sihid, teine ring. 7 seost kuues plokiperekonnas (Amp, Drive, Delay, Reverb, Chorus, Out 1), allikad SC1-SC4 ja Manual 1, sh üks lüliti-tüüpi siht (Chorus Bypass). Import, kuva, heli ja STORE on mõõtmata.'};
 const t44={...structuredClone(t43),composer:{...structuredClone(t43.composer),name:'T44 PP SWITCHES',
   scenes:Array.from({length:8},(_,i)=>({scene:i+1,name:['T44 S1','T44 S2','T44 S3','T44 S4'][i]??'TEST DEFAULT'}))},
  purpose:'T44: per-preset jalglüliti salvestuskoha katse. Fail ise on lihtne alus (Drive, Chorus, Amp, Cab, Delay, Reverb); kasutaja lisab FM3-Editis 4 Per-Preset Switchi ja teeb STORE-i.'};
 delete t44.modifierTargets;delete t44.controllers;
 return {v1Syx:v1.syx,cases:[
  {id:'H5',name:'LIVE KOOSLUS V1.1',spec:h5,scenes:8,
   expected:'LIVE KOOSLUS V1.1: nagu V1, aga clean ja Plexi (stseenid 1, 4, 5, 8) 2 dB vaiksemad ning lead (3, 7) 1 dB valjem. Kõik 8 stseeni on umbes sama valjud; ükski ei klipi.',
   history:'H3 (10.11): V1 andmed säilisid STORE järel, kuid valjus ebaühtlane: clean ja Plexi kõige valjemad, crunch veidi vaiksem, lead kõige vaiksem. V1.1 tasemed on pakutud, kuulamata.'},
  {id:'H5B',name:'LIVE KOOSLUS V1.1B',spec:h5b,scenes:8,
   expected:'LIVE KOOSLUS V1.1B: amp-tasemed nagu V1; Out 1 Scene Level S1/S4/S5/S8 -2 dB, S2/S6 0 dB, S3/S7 +1 dB. Kõlab nagu H5: stseenid umbes sama valjud, ükski ei klipi.',
   history:'Out 1 Scene Level 1..8 on plugina kirjutatav (taper-class-verified), kuid seadmel pole seda kunagi kontrollitud. H5 ja H5B peaksid kõlama sama valjult.'},
  {id:'T43',name:'T43 MOD TARGETS 2',spec:t43,scenes:4,
   expected:'T43: 7 modifikaatori seost. Stseenid 1-4 muudavad SC1-SC4 väärtusi; FM3-Editis näidatud sihtväärtused vastavad tabelile VAATLUSED.txt-s ja heli muutub vastavalt.',
   history:'T42/B1/B2/H1 kinnitasid Delay Mix, Filter Freq, Amp Gain ja Reverb Mix sihi. Need 7 sihti on lubatud ainult lipureegli järgi (mõõtmata).'},
  {id:'T44',name:'T44 PP SWITCHES',spec:t44,scenes:4,userEdits:true,
   expected:'T44: pärast kasutaja muudatusi on presetis 4 Per-Preset Switchi: PP#1 Effect Bypass Drive 1, PP#2 Effect Bypass Delay 1, PP#3 Effect Bypass Reverb 1, PP#4 Scene 3. Salvestatud keha erineb failist ainult per-preset määrangute piirkonnas.',
   history:'T14/T16 kinnitasid ainult kategooria 7 (Control Switch). FM3-Edit FW13 (Ghidra) ja FW10 factory presetid: kategooria 3 = Scene, 4 = Effect; Effecti ploki indeksi tähendus on teadmata.'}]};
}
function t43Table(){
 return [1,2,3,4].map(s=>`Stseen ${s} (SC1 ${T43_SC[1][s-1]}, SC2 ${T43_SC[2][s-1]}, SC3 ${T43_SC[3][s-1]}, SC4 ${T43_SC[4][s-1]}): `+
  T43_TARGETS.map(t=>t.min===undefined?`${t.label} SC2=${scVal(t,s)}%`:`${t.label} ${expectAt(t,s)}${t.unit}`).join('; ')).join('\n');
}
export function build(out){
 assert.equal(process.versions.node.split('.')[0],'22','Use Node 22');
 fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Use an empty output directory');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-h5-')),packs=[],base=fs.readFileSync(BASE);
 try{
  const {cases,v1Syx}=specs(tmp);
  for(const k of cases){
   const d=path.join(out,k.id);fs.mkdirSync(d);const stem=path.join(d,k.id),r=createPreset(base,k.spec);
   writePresetOutputs(stem,r,k.spec);verifyPresetOutputs(stem);
   const syx=fs.readFileSync(stem+'.syx'),st=inspectStructure(syx),body=Buffer.from(st.raw.body),{records}=scanRecords(body);
   assert.deepEqual([...st.parsed.headerPayload],[127,0,0,64,0],'edit-buffer header');
   assert.equal(String(st.decoded.preset_name).trim(),k.name);
   const active=readModifiers(body).filter(m=>m.active).length;
   if(k.id==='T43')assert.equal(active,T43_TARGETS.length,'T43 active modifier records');
   else if(k.id==='T44')assert.equal(active,0,'T44 has no modifier bindings');
   else{
    // H5/H5B differ from V1 only in the name and the level words.
    const v1=Buffer.from(inspectStructure(v1Syx).raw.body);assert.equal(v1.length,body.length);
    let diff=0;for(let i=0;i<body.length;i+=2)if(body.readUInt16LE(i)!==v1.readUInt16LE(i))diff++;
    assert.ok(diff>=1&&diff<=(k.id==='H5'?20:24),k.id+' differs from V1 only in name + levels: '+diff);
    const txt=fs.readFileSync(stem+'.txt','utf8');
    if(k.id==='H5')for(const [ch,v] of Object.entries(H5_LEVELS)){
     const m=txt.match(new RegExp(`amp ${ch}: [^\\n]*Level (-?[\\d.]+) dB`));assert.ok(m&&Math.abs(Number(m[1])-v)<0.01,`Amp ${ch} Level ${v}: ${m&&m[1]}`);}
   }
   const validation=JSON.parse(fs.readFileSync(stem+'.validation.json')),cpu=validation.cpu??validation.report?.cpu;
   assert.ok(cpu&&cpu.maxPercent<cpu.limitPercent,'CPU estimate under the safe limit');
   const blocks=records.filter(x=>x.family!=='send').map(x=>({family:x.family,effectId:x.eid,words:x.words,channels:x.channels,
    request:Buffer.from(bulkReadPoll(x.eid)).toString('hex'),
    expected:Array.from({length:x.words*x.channels},(_,i)=>body.readUInt16LE(x.start+2*i)),writes:[]}));
   const preset={file:'../'+k.id+'.syx',sha256:sha(syx)};
   const scene8=[{id:'scenes1_4',text:'Mängi stseenid 1–4 päris kitarriga. Kas heli on õige, valjus sobib teistega ja Out 1 näidik ei lähe punaseks? Kirjelda, mis stseenis mis erines.'},
    {id:'scenes5_8',text:'Mängi stseenid 5–8. Sama küsimus: heli, valjus teiste suhtes, klippimine.'},
    {id:'balance',text:'Kas kõik 8 stseeni on nüüd umbes sama valjud? Kui ei, siis mis stseen on valjem/vaiksem ja ligikaudu mitu dB.'}];
   const checks=[{id:'name_grid_scenes',text:`Kas nimi ${k.name}, TXT ruudustik ning stseenide nimed/kanalid/bypass on õiged? jah/ei/mõõtmata.`},
    ...(k.id==='T44'?[
     {id:'pp_edits',text:'Enne STORE-i lisa FM3-Editis (Per-Preset / Performance Controls) neli Per-Preset Switchi, igaüks täpselt nii: PP#1 = Effect, Bypass, Drive 1; PP#2 = Effect, Bypass, Delay 1; PP#3 = Effect, Bypass, Reverb 1; PP#4 = Scene, Scene 3. Muud ei muuda. Kirjuta, mis valikunimed FM3-Editis olid (Claude pildistab).'},
     {id:'pp_switch',text:'Kui määrad mõne PP-lüliti ka FM3 jalglülitile ja proovid: kas Drive/Delay/Reverb lülitus sisse-välja ja PP#4 valis stseeni 3? Kui ei proovinud, kirjuta "ei proovinud".'}]:
    k.id==='T43'?[
     {id:'sources',text:'Claude loeb FM3-Editist iga seose Source, Min, Max ja Channel. Oodatud: '+T43_TARGETS.map(t=>`${t.label} ← ${t.source}`+(t.min===undefined?'':` ${t.min}..${t.max}${t.unit}`)+', ALL').join('; ')+'. Kirjuta "Claude" või oma näidud.'},
     ...[1,2,3,4].map(s=>({id:'scene'+s,text:`Stseen ${s}: kuula heli ja vaata Chorus'e olekut. Claude loeb sihtväärtused FM3-Editist. Kirjuta heli muljet (nt "rohkem kaja", "chorus väljas").`})),
     {id:'cpu',text:'CPU: Claude loeb FM3-Editist stseenide 1–4 protsendid. Kirjuta "Claude" või oma näidud.'}]
    :[...scene8,{id:'transitions',text:'Vaheta stseene mängu ajal. Kas vahetus on ilma augu, plõksu või hilinemiseta?'},
     {id:'cpu',text:'CPU: Claude loeb FM3-Editist stseenide 1–8 protsendid. Kirjuta "Claude" või oma näidud.'}]),
    {id:'behavior',text:k.expected+' Kas vastab? jah/ei; kirjelda erinevust.'}];
   for(const dir of ['shot','store'])fs.mkdirSync(path.join(d,dir));
   const shot={kind:'fm3-shot-check',version:1,test:k.id,items:[{id:k.id,name:k.name,...preset,blocks}],
    scope:'Listed effect-block parameter words only. Controllers, modifiers, grid, scenes, Send and system tail require the later whole-preset STORE comparison.'};
   const bind={kind:'fm3-bind-store',version:1,test:k.id,confirmName:k.name,preset,checks,expect:k.expected,
    storeLocationPolicy:'User chooses a backed-up/expendable slot. No automatic STORE, preset/scene selection, SET or global writes.'};
   for(const [dir,value] of [['shot',shot],['store',bind]])fs.writeFileSync(path.join(d,dir,'manifest.json'),JSON.stringify(value,null,2)+'\n');
   fs.writeFileSync(path.join(d,'VAATLUSED.txt'),k.name+'\n\nVarasem tõend: '+k.history+'\n\n'+
    (k.id==='T43'?'OODATUD SIHTVÄÄRTUSED (vaikekõver, lineaarne):\n'+t43Table()+'\nChorus Bypass: oodatud on, et SC2 väärtusega 0 ja 100 on chorus erinevas olekus; mis olek vastab kummale, ongi küsimus.\nManual 1 = 50% kõigis stseenides.\n\n':'')+
    checks.map(x=>x.text).join('\n\n')+
    '\n\nCPU tarkvarahinnang (mitte mõõtmine, '+cpu.model+'): '+cpu.scenes.slice(0,k.scenes).map(s=>`S${s.scene} ${s.percent}%`).join(', ')+'\n');
   packs.push({id:k.id,name:k.name,stem:k.id+'/'+k.id,presetSha256:preset.sha256,expected:k.expected,history:k.history,
    scenesUsed:k.scenes,userEdits:k.userEdits===true,modifierTargets:k.spec.modifierTargets??[],activeModifiers:active,
    cpuEstimate:{model:cpu.model,scenes:cpu.scenes.map(s=>s.percent)},blockRecords:records.length,
    shotManifestSha256:sha(fs.readFileSync(path.join(d,'shot/manifest.json'))),
    storeManifestSha256:sha(fs.readFileSync(path.join(d,'store/manifest.json'))),fourFilesVerified:true,hardwareTested:false});
  }
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 for(const f of ['FM3_CPU_SWEEP.py','FM3_READ_PROBE.py','FM3_BIND_STORE.py','FM3_SHOT_LOAD.py','FM3_SHOT_READ.py'])
  fs.copyFileSync(path.join(E,'scripts/cpu-sweep-collector',f),path.join(out,f));
 fs.copyFileSync(path.join(ROOT,'tools/fm3/h5-t43-run.py'),path.join(out,'ALUSTA.py'));
 fs.writeFileSync(path.join(out,'ALUSTA.command'),'#!/bin/bash\nset -euo pipefail\ncd -- "$(dirname -- "$0")"\nexec python3 -B ALUSTA.py "$@"\n',{mode:0o755});
 fs.copyFileSync(path.join(ROOT,'docs/fm3/FM3_H5_T43_GUIDE.txt'),path.join(out,'LOE_MIND.txt'));
 const files=[];function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const p=path.join(d,f.name);if(f.isDirectory())walk(p);else files.push({path:path.relative(out,p),sha256:sha(fs.readFileSync(p))});}}walk(out);
 const version=JSON.parse(fs.readFileSync(path.join(ROOT,'plugins/fm3-sound-architect-2/plugin.json'))).version;
 fs.writeFileSync(path.join(out,'pack.json'),JSON.stringify({kind:KIND,schemaVersion:1,version,date:'2026-11-11',packs,files,
  deviceIO:false,newHardwareMeasurements:false,
  allowedStoredDifferences:['selected-scene byte 0','whole-record ordering','SysEx destination header'],
  evidenceBoundary:'H5/H5B are level variants of V1; T43 is a new modifier-target preset. Bytes, display, sound, CPU and switches are judged separately; preparation increments no hardware counters.'},null,2)+'\n');
 execFileSync('python3',['-B',path.join(out,'ALUSTA.py'),'--preflight'],{stdio:'pipe'});
 return {passed:true,presets:packs.length,verifiedFiles:4*packs.length,preflight:true,deviceIO:false,
  sha256:Object.fromEntries(packs.map(p=>[p.id,p.presetSha256]))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'Usage: h5-t43-build.mjs EMPTY_OUT_DIR');console.log(JSON.stringify(build(path.resolve(process.argv[2]))));
}

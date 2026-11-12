// T50 preparation only (12.11.2026). Offline; writes the pack, never device I/O.
// Device check for modifierTargets[].curve (0.3.69): curve / timing words on targets other than Volume.
//   T50A = Envelope Follower -> Filter Frequency 300..3000 Hz (Low-Pass), Attack 20 ms, Release 250 ms, Scale 2 (auto-wah).
//   T50B = LFO 1A (2 Hz) -> Amp Level -12..-6 dB with Start 20 / End 80 / Slope 75 %, and Scene Controller 1 -> Delay Mix
//          0..50 % with Mid 25 % / Offset 10 % (scenes 1..4: SC1 = 0 / 50 / 100 / 0 %).
// Questions: does FM3-Edit's modifier dialog show the written curve values, does it sound as expected, and is the stored
// body byte-identical after STORE/reload? The run script loads, reads blocks back and waits for the user's STORE round.
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
const {modifierCurveFields}=await import(path.join(E,'scripts/fm3-modifier-curve.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
export const KIND='fm3-t50-preparation',CASES=['T50A','T50B'];
const BASE=path.join(E,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const SC1=[0,50,100,0];
export const T50={
 T50A:{row2:['filter','drive','amp','cab'],row3:['delay','reverb'],composer:{filterChannels:[{channel:'A',type:'Low-Pass'}]},
  targets:[{source:'Envelope Follower',block:'filter',param:'FILTER_FREQ',min:300,max:3000,curve:{attackMs:20,releaseMs:250,scale:2}}],controllers:[],
  hear:'Auto-wah: tugev löök avab filtri (heledam), vaikne mäng ja noodi kustumine sulgevad selle (tumedam). Kõigis stseenides 1–4 sama.'},
 T50B:{row2:['drive','amp','cab'],row3:['delay','reverb'],composer:{},
  targets:[{source:'LFO 1A',block:'amp',param:'DISTORT_LEVEL',min:-12,max:-6,curve:{startPercent:20,endPercent:80,slopePercent:75}},
   {source:'Scene Controller 1',block:'delay',param:'DELAY_MIX',min:0,max:50,curve:{midPercent:25,offsetPercent:10}}],
  controllers:[{channel:'A',param:'LFO1FREQ',value:2},...SC1.concat([0,0,0,0]).map((value,i)=>({channel:'A',param:`SCENE1_VAL${i+1}`,value}))],
  hear:'Tremolo: valjus kõigub umbes 2 korda sekundis (Amp Level −12…−6 dB). Delay Mix muutub stseeniti: stseen 1 ja 4 kõige kuivem, stseen 3 kõige märjem (SC1 0/50/100/0 %).'}};
const LABEL=Object.fromEntries(modifierCurveFields.map(f=>[f.key,f]));
const curveText=c=>Object.entries(c).map(([k,v])=>`${LABEL[k].label} ${v}${LABEL[k].unit==='%'?' %':LABEL[k].unit==='ms'?' ms':''}`).join(', ');
export function specs(){
 return CASES.map(id=>{const t=T50[id],name=id+' MOD CURVE',blocks=[...t.row2,...t.row3];
  const s={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name,modifiers:{external1Wah:false},
    reverbChannels:[{channel:'A',type:'Room: Recording Studio A'}],driveChannels:[{channel:'A',type:'T808 OD'}],delayChannels:[{channel:'A',type:'Digital Stereo'}],
    ...structuredClone(t.composer),scenes:Array.from({length:8},(_,i)=>({scene:i+1,name:i<4?`${id} S${i+1}`:'TEST DEFAULT'}))},
   layout:{row2:t.row2,row3:t.row3},selectedScene:1,
   blockScenes:Object.fromEntries(blocks.map(b=>[b,Array.from({length:8},(_,i)=>({scene:i+1,channel:'A',bypass:b==='drive'}))])),
   modifierTargets:structuredClone(t.targets),...(t.controllers.length?{controllers:structuredClone(t.controllers)}:{}),
   context:{guitar:'Ibanez AS-120',pickups:'humbucker',output:'OUT1 stereo FOH'},
   purpose:`${id}: modifikaatori kõver ja ajad muul sihil kui Volume (modifierTargets[].curve, 0.3.69). Kuva, heli ja STORE on mõõtmata.`};
  const lines=t.targets.map(x=>`${x.source} → ${x.block} ${x.param}: Min ${x.min}, Max ${x.max}; ${curveText(x.curve)}; muud kõvera väljad vaikimisi (Start 0, Mid 50, End 100, Slope 50 %, Scale 1, Offset 0 %, Attack/Release 10.1 ms)`);
  return {id,name,spec:s,targets:t.targets,scenes:4,lines,hear:t.hear,
   expected:`${id}: FM3-Editi modifikaatoriaknas ${lines.join(' | ')}. ${t.hear}`,
   history:'Kõvera ja aegade kodeering on seadmel sammhaaval kinnitatud ainult Volume/Pan Volume kirjel (T12, 29.10.2026); neil sihtidel on sõnad valemi järgi, seadmel kontrollimata.'};
 });
}
export function build(out){
 assert.equal(process.versions.node.split('.')[0],'22','Use Node 22');
 fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Use an empty output directory');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t50-')),packs=[],base=fs.readFileSync(BASE);
 try{
  for(const k of specs()){
   const d=path.join(out,k.id);fs.mkdirSync(d);const stem=path.join(d,k.id),r=createPreset(base,k.spec);
   writePresetOutputs(stem,r,k.spec);verifyPresetOutputs(stem);
   const syx=fs.readFileSync(stem+'.syx'),st=inspectStructure(syx),body=Buffer.from(st.raw.body),{records}=scanRecords(body);
   assert.deepEqual([...st.parsed.headerPayload],[127,0,0,64,0],'edit-buffer header');
   assert.equal(String(st.decoded.preset_name).trim(),k.name);
   const mt=r.report.modifierTargets;assert.equal(mt.length,k.targets.length);
   mt.forEach((m,i)=>{assert.equal(m.curveCustom,true,k.id+' curve '+i);for(const [key,v] of Object.entries(k.targets[i].curve))assert.ok(Math.abs(m.curve[key].display-v)<=0.11,key);});
   const txt=fs.readFileSync(stem+'.txt','utf8');assert.equal(txt.split('Kõver ja ajad (').length-1,k.targets.length,'curve lines in TXT');
   const validation=JSON.parse(fs.readFileSync(stem+'.validation.json')),cpu=validation.cpu??validation.report?.cpu;
   assert.ok(cpu&&cpu.maxPercent<cpu.limitPercent,'CPU estimate under the safe limit');
   const blocks=records.filter(x=>x.family!=='send').map(x=>({family:x.family,effectId:x.eid,words:x.words,channels:x.channels,
    request:Buffer.from(bulkReadPoll(x.eid)).toString('hex'),
    expected:Array.from({length:x.words*x.channels},(_,i)=>body.readUInt16LE(x.start+2*i)),writes:[]}));
   const preset={file:'../'+k.id+'.syx',sha256:sha(syx)};
   const checks=[{id:'name_grid_scenes',text:`Kas nimi ${k.name}, TXT ruudustik ning stseenide nimed on õiged? jah/ei/mõõtmata.`},
    {id:'curve_display',text:`Ava FM3-Editis iga seotud nupu modifikaatoriaken (paremklõps nupul -> Edit Modifier); Claude pildistab. Oodatud: ${k.lines.join(' | ')}. Kirjuta "Claude" või oma näidud.`},
    {id:'behavior',text:k.hear+' Kas vastab? jah/ei; kirjelda erinevust.'}];
   for(const dir of ['shot','store'])fs.mkdirSync(path.join(d,dir));
   const shot={kind:'fm3-shot-check',version:1,test:k.id,items:[{id:k.id,name:k.name,...preset,blocks}],
    scope:'Listed effect-block parameter words only. Grid, scenes, per-preset switches, Send and system tail require the later whole-preset STORE comparison.'};
   const bind={kind:'fm3-bind-store',version:1,test:k.id,confirmName:k.name,preset,checks,expect:k.expected,
    storeLocationPolicy:'User chooses a backed-up/expendable slot. No automatic STORE, preset/scene selection, SET or global writes.'};
   for(const [dir,value] of [['shot',shot],['store',bind]])fs.writeFileSync(path.join(d,dir,'manifest.json'),JSON.stringify(value,null,2)+'\n');
   fs.writeFileSync(path.join(d,'VAATLUSED.txt'),k.name+'\n\nVarasem tõend: '+k.history+'\n\n'+checks.map(x=>x.text).join('\n\n')+
    '\n\nCPU tarkvarahinnang (mitte mõõtmine, '+cpu.model+'): '+cpu.scenes.slice(0,k.scenes).map(s=>`S${s.scene} ${s.percent}%`).join(', ')+'\n');
   packs.push({id:k.id,name:k.name,stem:k.id+'/'+k.id,presetSha256:preset.sha256,expected:k.expected,history:k.history,
    scenesUsed:k.scenes,loadOnly:false,modifierTargets:mt.map(m=>({record:m.record,source:m.source,block:m.block,param:m.param,min:m.min,max:m.max,curve:m.curve})),
    cpuEstimate:{model:cpu.model,scenes:cpu.scenes.map(s=>s.percent)},blockRecords:records.length,
    shotManifestSha256:sha(fs.readFileSync(path.join(d,'shot/manifest.json'))),
    storeManifestSha256:sha(fs.readFileSync(path.join(d,'store/manifest.json'))),
    fourFilesVerified:true,hardwareTested:false});
  }
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 for(const f of ['FM3_CPU_SWEEP.py','FM3_READ_PROBE.py','FM3_BIND_STORE.py','FM3_SHOT_LOAD.py','FM3_SHOT_READ.py'])
  fs.copyFileSync(path.join(E,'scripts/cpu-sweep-collector',f),path.join(out,f));
 fs.copyFileSync(path.join(ROOT,'tools/fm3/t50-run.py'),path.join(out,'ALUSTA.py'));
 fs.writeFileSync(path.join(out,'ALUSTA.command'),'#!/bin/bash\nset -euo pipefail\ncd -- "$(dirname -- "$0")"\nexec python3 -B ALUSTA.py "$@"\n',{mode:0o755});
 fs.copyFileSync(path.join(ROOT,'docs/fm3/FM3_T50_GUIDE.txt'),path.join(out,'LOE_MIND.txt'));
 const files=[];function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const p=path.join(d,f.name);if(f.isDirectory())walk(p);else files.push({path:path.relative(out,p),sha256:sha(fs.readFileSync(p))});}}walk(out);
 const version=JSON.parse(fs.readFileSync(path.join(ROOT,'plugins/fm3-sound-architect-2/plugin.json'))).version;
 fs.writeFileSync(path.join(out,'pack.json'),JSON.stringify({kind:KIND,schemaVersion:1,version,date:'2026-11-12',packs,files,
  deviceIO:false,newHardwareMeasurements:false,
  allowedStoredDifferences:['selected-scene byte 0','whole-record ordering','SysEx destination header'],
  evidenceBoundary:'T50 tests generator-written modifier curve / timing words on targets other than Volume. Bytes, display and audible behaviour are judged separately; preparation increments no hardware counters.'},null,2)+'\n');
 execFileSync('python3',['-B',path.join(out,'ALUSTA.py'),'--preflight'],{stdio:'pipe'});
 return {passed:true,presets:packs.length,preflight:true,deviceIO:false,sha256:Object.fromEntries(packs.map(p=>[p.id,p.presetSha256]))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'Usage: t50-build.mjs EMPTY_OUT_DIR');console.log(JSON.stringify(build(path.resolve(process.argv[2]))));
}

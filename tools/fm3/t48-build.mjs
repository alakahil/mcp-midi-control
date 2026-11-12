// T48 preparation only (12.11.2026). Offline; writes the pack, never device I/O.
// Footswitch confirmation for per-preset Effect Bypass on the remaining blocks mapped only from the FM3-Edit display (T46):
// six presets T48A-F, 17 blocks, each on FM3 switch 1-3 (Layout 1). Reso 2 needs a second instance and stays out.
// T48A also carries the Hold probe: after the normal round the user assigns a Hold function to switch 1 in FM3-Edit,
// stores again and the stored location is read once more (see docs/fm3/FM3_T48_GUIDE.txt); that read is analysed at ingest.
// Every block is on in scenes 1-4. The run script loads, reads blocks back and waits for the user's switch/STORE round.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {bulkReadPoll} from './fm3-read-requests.mjs';
import {specs as h5Specs} from './h5-t43-build.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {createPreset,writePresetOutputs,verifyPresetOutputs}=await import(path.join(E,'scripts/fm3-preset.mjs'));
const {inspectStructure}=await import(path.join(E,'scripts/drive-collector/fm3-prototype.mjs'));
const {scanRecords}=await import(path.join(E,'scripts/fm3-layout.mjs'));
const {readCsPreset,PP_EFFECTS}=await import(path.join(E,'scripts/fm3-cs-preset.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
export const KIND='fm3-t48-preparation',CASES=['T48A','T48B','T48C','T48D','T48E','T48F'];
const BASE=path.join(E,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
// Per case: the footswitch effects (switch 1..n), the two layout rows and the composer additions.
export const T48={
 T48A:{"effects":["cab1","phaser1","wah1"],"row2":["wah","drive","phaser","amp","cab"],"row3":["delay","reverb"],"drop":["chorus"],"composer":{"phaserChannels":[{"channel":"A","type":"Script 90"}],"wahChannels":[{"channel":"A","type":"Cry Babe"}]}},
 T48B:{"effects":["filter1","geq1","peq1"],"row2":["drive","filter","amp","cab"],"row3":["geq","peq","delay","reverb"],"drop":["chorus"],"composer":{"filterChannels":[{"channel":"A","type":"High-Pass","frequencyHz":750}],"geqChannels":[{"channel":"A","type":"10 Band Variable Q","bands":[{"band":1,"gainDb":-12},{"band":2,"gainDb":-12},{"band":3,"gainDb":-12},{"band":4,"gainDb":-12},{"band":5,"gainDb":-12},{"band":6,"gainDb":6},{"band":7,"gainDb":6},{"band":8,"gainDb":6},{"band":9,"gainDb":6},{"band":10,"gainDb":6}],"masterQ":1,"levelDb":0,"balance":0,"bypassMode":"Thru","sceneIgnore":false}],"peqChannels":[{"channel":"A","bands":[{"band":1,"type":"Blocking","frequencyHz":85,"solo":false,"slopeDbPerOct":12},{"band":2,"type":"Peaking","frequencyHz":350,"q":0.8,"solo":false,"gainDb":-12},{"band":3,"type":"Peaking","frequencyHz":900,"q":1.1,"solo":false,"gainDb":12},{"band":4,"type":"Peaking","frequencyHz":2800,"q":0.9,"solo":false,"gainDb":-12},{"band":5,"type":"Blocking","frequencyHz":6500,"solo":false,"slopeDbPerOct":12}],"levelDb":0,"balance":0,"bypassMode":"Thru","sceneIgnore":false}]}},
 T48C:{"effects":["enhancer1","volpan1","gate1"],"row2":["gate","drive","amp","cab"],"row3":["volpan","enhancer","delay","reverb"],"drop":["chorus"],"insert":["gate"],"extra":{"volumePan":true},"composer":{"enhancerChannels":[{"channel":"A","type":"Modern","width":100,"depth":100,"lowCutHz":100,"highCutHz":2000,"levelDb":0,"sceneIgnore":false}]}},
 T48D:{"effects":["multidelay1","megatap1","tentap1"],"row2":["drive","amp","cab"],"row3":["multidelay","megatap","tentap","delay","reverb"],"drop":["chorus"],"insert":["multidelay","megatap","tentap"]},
 T48E:{"effects":["plex1","ringmod1","resonator1"],"row2":["drive","ringmod","amp","cab"],"row3":["resonator","plex","delay","reverb"],"drop":["chorus"],"insert":["plex","ringmod","resonator"]},
 T48F:{"effects":["multiband1","looper1"],"row2":["multiband","drive","amp","cab"],"row3":["delay","reverb","looper"],"drop":["chorus"],"insert":["multiband","looper"]}};
export function specs(tmp){
 const t44=h5Specs(tmp).cases.find(c=>c.id==='T44').spec;
 return CASES.map(id=>{const t=T48[id],name=id+' PP SWITCH',labels=t.effects.map(e=>PP_EFFECTS[e].label);
  const s={...structuredClone(t44),composer:{...structuredClone(t44.composer),...structuredClone(t.composer),name,
   scenes:Array.from({length:8},(_,i)=>({scene:i+1,name:i<4?`${id} S${i+1}`:'TEST DEFAULT'}))},
   layout:{row2:t.row2,row3:t.row3},
   blockScenes:Object.fromEntries([...t.row2,...t.row3].map(b=>[b,Array.from({length:8},(_,i)=>({scene:i+1,channel:'A',bypass:false}))])),
   footswitches:t.effects.map((effect,i)=>({layout:1,switch:i+1,effect})),
   purpose:`${id}: per-preset Effect Bypass jalglülitid ${labels.map((l,i)=>`lüliti ${i+1} = ${l}`).join(', ')}. Kõik plokid on stseenides 1–4 sees. Jalglüliti käitumine on mõõtmata.`};
  for(const d of t.drop??[])delete s.composer[d+'Channels'];
  if(t.insert)s.insert=t.insert;
  Object.assign(s,structuredClone(t.extra??{}));
  const pp=labels.map((l,i)=>`PP#${i+1} Effect Bypass ${l}`).join(', ');
  return {id,name,spec:s,effects:t.effects,labels,scenes:4,
   expected:`${id}: FC Per-Prst lehel ${pp}. FM3 ${labels.map((l,i)=>`lüliti ${i+1} lülitab ${l} sisse/välja`).join(', ')}; teised plokid ei muutu.`,
   history:t.effects.map(e=>`${PP_EFFECTS[e].label}: indeks FM3-Editi kuvalt (T46), import ja lüliti kontrollimata`).join('; ')+'.'};
 });
}
export function build(out){
 assert.equal(process.versions.node.split('.')[0],'22','Use Node 22');
 fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Use an empty output directory');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t48-')),packs=[],base=fs.readFileSync(BASE);
 try{
  for(const k of specs(tmp)){
   const d=path.join(out,k.id);fs.mkdirSync(d);const stem=path.join(d,k.id),r=createPreset(base,k.spec);
   writePresetOutputs(stem,r,k.spec);verifyPresetOutputs(stem);
   const syx=fs.readFileSync(stem+'.syx'),st=inspectStructure(syx),body=Buffer.from(st.raw.body),{records}=scanRecords(body);
   assert.deepEqual([...st.parsed.headerPayload],[127,0,0,64,0],'edit-buffer header');
   assert.equal(String(st.decoded.preset_name).trim(),k.name);
   const pp=readCsPreset(body,k.spec).footswitches;
   assert.deepEqual(pp.map(f=>[f.switch,f.kind,f.effect]),k.effects.map((e,i)=>[i+1,'effect',e]));
   for(const e of k.effects)assert.ok(records.some(x=>x.eid===PP_EFFECTS[e].effectId),e+' placed');
   const txt=fs.readFileSync(stem+'.txt','utf8');for(const l of k.labels)assert.ok(txt.includes('Effect, Bypass, '+l),l+' in TXT');
   const validation=JSON.parse(fs.readFileSync(stem+'.validation.json')),cpu=validation.cpu??validation.report?.cpu;
   assert.ok(cpu&&cpu.maxPercent<cpu.limitPercent,'CPU estimate under the safe limit');
   const blocks=records.filter(x=>x.family!=='send').map(x=>({family:x.family,effectId:x.eid,words:x.words,channels:x.channels,
    request:Buffer.from(bulkReadPoll(x.eid)).toString('hex'),
    expected:Array.from({length:x.words*x.channels},(_,i)=>body.readUInt16LE(x.start+2*i)),writes:[]}));
   const preset={file:'../'+k.id+'.syx',sha256:sha(syx)};
   const checks=[{id:'name_grid_scenes',text:`Kas nimi ${k.name}, TXT ruudustik ning stseenide nimed on õiged? jah/ei/mõõtmata.`},
    {id:'pp_display',text:`Claude loeb FM3-Editi FC Per-Prst lehelt määrangud. Oodatud: ${k.labels.map((l,i)=>`PP#${i+1} Effect Bypass ${l}`).join(', ')}. Kirjuta "Claude" või oma näidud.`},
    {id:'pp_switch',text:`Vajuta FM3 lüliteid ${k.labels.map((l,i)=>`${i+1} (${l})`).join(', ')} mitu korda ja kuula. Kas iga lüliti lülitas just oma ploki sisse/välja (ekraan ja heli)? Kirjelda iga lüliti kohta.`},
    {id:'behavior',text:k.expected+' Kas vastab? jah/ei; kirjelda erinevust.'}];
   for(const dir of ['shot','store'])fs.mkdirSync(path.join(d,dir));
   const shot={kind:'fm3-shot-check',version:1,test:k.id,items:[{id:k.id,name:k.name,...preset,blocks}],
    scope:'Listed effect-block parameter words only. Grid, scenes, per-preset switches, Send and system tail require the later whole-preset STORE comparison.'};
   const bind={kind:'fm3-bind-store',version:1,test:k.id,confirmName:k.name,preset,checks,expect:k.expected,
    storeLocationPolicy:'User chooses a backed-up/expendable slot. No automatic STORE, preset/scene selection, SET or global writes.'};
   for(const [dir,value] of [['shot',shot],['store',bind]])fs.writeFileSync(path.join(d,dir,'manifest.json'),JSON.stringify(value,null,2)+'\n');
   fs.writeFileSync(path.join(d,'VAATLUSED.txt'),k.name+'\n\nVarasem tõend: '+k.history+'\n\n'+checks.map(x=>x.text).join('\n\n')+
    '\n\nCPU tarkvarahinnang (mitte mõõtmine, '+cpu.model+'): '+cpu.scenes.slice(0,k.scenes).map(s=>`S${s.scene} ${s.percent}%`).join(', ')+'\n');
   packs.push({id:k.id,name:k.name,stem:k.id+'/'+k.id,presetSha256:preset.sha256,expected:k.expected,history:k.history,
    scenesUsed:k.scenes,loadOnly:false,perPreset:pp,switches:k.effects.map((e,i)=>({switch:i+1,effect:e,label:k.labels[i],index:PP_EFFECTS[e].index})),
    cpuEstimate:{model:cpu.model,scenes:cpu.scenes.map(s=>s.percent)},blockRecords:records.length,
    shotManifestSha256:sha(fs.readFileSync(path.join(d,'shot/manifest.json'))),
    storeManifestSha256:sha(fs.readFileSync(path.join(d,'store/manifest.json'))),
    fourFilesVerified:true,hardwareTested:false});
  }
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 for(const f of ['FM3_CPU_SWEEP.py','FM3_READ_PROBE.py','FM3_BIND_STORE.py','FM3_SHOT_LOAD.py','FM3_SHOT_READ.py'])
  fs.copyFileSync(path.join(E,'scripts/cpu-sweep-collector',f),path.join(out,f));
 fs.copyFileSync(path.join(ROOT,'tools/fm3/t48-run.py'),path.join(out,'ALUSTA.py'));
 fs.writeFileSync(path.join(out,'ALUSTA.command'),'#!/bin/bash\nset -euo pipefail\ncd -- "$(dirname -- "$0")"\nexec python3 -B ALUSTA.py "$@"\n',{mode:0o755});
 fs.copyFileSync(path.join(ROOT,'docs/fm3/FM3_T48_GUIDE.txt'),path.join(out,'LOE_MIND.txt'));
 const files=[];function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const p=path.join(d,f.name);if(f.isDirectory())walk(p);else files.push({path:path.relative(out,p),sha256:sha(fs.readFileSync(p))});}}walk(out);
 const version=JSON.parse(fs.readFileSync(path.join(ROOT,'plugins/fm3-sound-architect-2/plugin.json'))).version;
 fs.writeFileSync(path.join(out,'pack.json'),JSON.stringify({kind:KIND,schemaVersion:1,version,date:'2026-11-12',packs,files,
  deviceIO:false,newHardwareMeasurements:false,
  allowedStoredDifferences:['selected-scene byte 0','whole-record ordering','SysEx destination header'],
  evidenceBoundary:'T48 tests generator-written per-preset Effect Bypass switches for the remaining blocks mapped from the FM3-Edit display (T46). Bytes, display and switch behaviour are judged separately; preparation increments no hardware counters.'},null,2)+'\n');
 execFileSync('python3',['-B',path.join(out,'ALUSTA.py'),'--preflight'],{stdio:'pipe'});
 return {passed:true,presets:packs.length,preflight:true,deviceIO:false,sha256:Object.fromEntries(packs.map(p=>[p.id,p.presetSha256]))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'Usage: t48-build.mjs EMPTY_OUT_DIR');console.log(JSON.stringify(build(path.resolve(process.argv[2]))));
}

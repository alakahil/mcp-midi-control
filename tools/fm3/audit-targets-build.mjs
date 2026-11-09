// Audit A4/B1/B2: ordinary public-generator quartets, guarded LOAD/GET, manual STORE.
import fs from 'node:fs';
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
const cc=(param,value)=>({channel:'A',param,value});
const ctl=(block,param,value,channel='A')=>({block,channel,param,value});
const SC=[0,33,67,100];
const cases=[
 {id:'B1A',name:'AUDIT SC1 DELAY MIX',target:{source:'Scene Controller 1',block:'delay',param:'DELAY_MIX',min:0,max:100},tempo:97,
  controllers:SC.map((v,i)=>cc(`SCENE1_VAL${i+1}`,v)),
  controls:[ctl('delay','DELAY_TEMPO','1/4'),ctl('delay','DELAY_FEED',30)],
  names:SC.map(v=>`SC1 MIX ${v}`),
  expect:'Stseenides 1–4 on SC1 0/33/67/100 %. Delay Mix järgib seda. 0 % on kuiv ja 100 % ainult efekt; otsene heli võib kaduda. Tempo 97 BPM, 1/4 korduste vahe umbes 619 ms.'},
 {id:'B1B',name:'AUDIT LFO FILTER FREQ',target:{source:'LFO 1A',block:'filter',param:'FILTER_FREQ',min:300,max:3000},
  controllers:[cc('LFO1TYPE','SINE'),cc('LFO1RUN','RUN'),cc('LFO1DEPTH',100),cc('LFO1TEMPO','NONE'),cc('LFO1FREQ',0.5)],
  controls:[],names:['LFO LP 300-3000'],filter:true,
  expect:'Low-Pass Filter 300–3000 Hz liigub tumedast heledaks ja tagasi umbes 2-sekundilise tsükliga. LFO 1A, SINE, Depth 100 %, Rate 0,5 Hz.'},
 {id:'B1C',name:'AUDIT EXT1 AMP GAIN',target:{source:'External 1',block:'amp',param:'DISTORT_DRIVE',min:2,max:8},
  controllers:[],controls:[],names:['PEDAL GAIN 2-8'],
  expect:'Olemasoleva External 1 pedaali kand/varvas muudab Amp Gaini 2→8. Moonutus peaks suurenema; ka valjus võib muutuda. Pakk ei muuda pedaali globaalset vastendust.'},
 {id:'B2',name:'AUDIT COMBO D TEMPO',target:{source:'Scene Controller 1',block:'delay',param:'DELAY_MIX',min:10,max:60,channel:'D'},tempo:143,
  controllers:[0,0,100,100].map((v,i)=>cc(`SCENE1_VAL${i+1}`,v)),
  controls:[ctl('delay','DELAY_MIX',30),...['A','D'].flatMap(ch=>[ctl('delay','DELAY_TEMPO','1/4',ch),ctl('delay','DELAY_FEED',30,ch)]),ctl('amp','DISTORT_CUT','OFF')],
  names:['A CS2 OFF MIX30','D CS2 OFF MIX10','D CS2 ON MIX60','A CS2 ON MIX30'],combo:true,
  expect:'Stseen 1: Amp/Delay A, CS2 OFF, Cut OFF, Mix 30 %. Stseen 2: D, OFF, Cut OFF, Mix 10 %. Stseen 3: D, ON, Cut ON, Mix 60 %. Stseen 4: A, ON, Cut OFF, Mix 30 %. Mõlemad seosed on ainult D-kanalil. 143 BPM, 1/4 umbes 420 ms.'}
];
export function specs(){return cases.map(k=>{
 const blocks=['drive','amp','cab','delay','reverb',...(k.filter?['filter']:[])];
 const blockScenes=Object.fromEntries(blocks.map(b=>[b,Array.from({length:8},(_,i)=>({scene:i+1,
  channel:k.combo&&['amp','delay'].includes(b)&&[1,2].includes(i)?'D':'A',
  bypass:!(['amp','cab'].includes(b)||(b==='filter'&&k.filter)||(b==='delay'&&(k.tempo!==undefined)))}))]));
 return {k,spec:{composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:k.name,
  modifiers:{external1Wah:false},...(k.filter?{filterChannels:[{channel:'A',type:'Low-Pass'}]}:{}),
  scenes:Array.from({length:8},(_,i)=>({scene:i+1,name:k.names[i]??'TEST DEFAULT'}))},
  layout:{row2:['drive','amp','cab',...(k.filter?['filter']:[])],row3:['delay','reverb']},selectedScene:1,
  blockScenes,modifierTargets:[k.target],...(k.tempo?{tempo:k.tempo}:{}),
  ...(k.controllers.length?{controllers:k.controllers}:{}),...(k.controls.length?{controls:k.controls}:{}),
  ...(k.combo?{controlSwitches:[{switch:2,block:'amp',param:'DISTORT_CUT',channel:'D'}],
   controlSwitchScenes:[1,2,3,4].map(scene=>({switch:2,scene,state:scene>=3?'ON':'OFF'}))}:{}),
  purpose:'Auditi B1/B2 seadmekatse ettevalmistus. Import, heli, CPU ja STORE on mõõtmata.'}};
});}
export function build(out){
 assert.equal(process.versions.node.split('.')[0],'22','Use Node 22');
 fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Use an empty output directory');
 const base=fs.readFileSync(path.join(E,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx')),packs=[];
 for(const {k,spec} of specs()){
  const d=path.join(out,k.id);fs.mkdirSync(d);const stem=path.join(d,k.id),r=createPreset(base,spec);
  writePresetOutputs(stem,r,spec);verifyPresetOutputs(stem);
  const st=inspectStructure(r.syx),body=Buffer.from(st.raw.body),{records}=scanRecords(body);
  assert.deepEqual([...st.parsed.headerPayload],[127,0,0,64,0]);
  const mods=readModifiers(body).filter(m=>m.active);assert.equal(mods.length,k.combo?2:1);
  // Send has no reliable writable words (the device normalizes it); omit it explicitly.
  const blocks=records.filter(x=>x.family!=='send').map(x=>({family:x.family,effectId:x.eid,words:x.words,channels:x.channels,
   request:Buffer.from(bulkReadPoll(x.eid)).toString('hex'),
   expected:Array.from({length:x.words*x.channels},(_,i)=>body.readUInt16LE(x.start+2*i)),writes:[]}));
  const preset={file:'../'+k.id+'.syx',sha256:sha(r.syx)};
  fs.mkdirSync(path.join(d,'shot'));fs.mkdirSync(path.join(d,'store'));
  const shot={kind:'fm3-shot-check',version:1,test:k.id,items:[{id:k.id,name:k.name,...preset,blocks}],
   scope:'Listed effect-block parameter words only. Send, controllers, modifiers, grid, scene headers and system tail are checked by the later stored full-preset comparison.'};
  const checks=[{id:'name_grid_scenes',text:`Kas nimi ${k.name}, TXT ruudustik ja stseenide kanal/bypass on õiged? jah/ei/mõõtmata.`},
   {id:'source',text:`${k.target.block} / ${k.target.param}: kirjuta nähtud Source (oodatud ${k.target.source}).`},
   {id:'minmax_channel',text:`Kirjuta nähtud Min, Max ja Channel: oodatud ${k.target.min}, ${k.target.max}, ${k.target.channel??'ALL'}.`},
   {id:'behavior',text:k.expect+' Kas vastab? jah/ei/mõõtmata ja vajadusel täpsustus.'},
   ...(k.combo?[{id:'cs2',text:'Kas CS2 → Amp Cut Channel D seos ning kõik neli kirjeldatud stseeni vastavad? jah/ei/mõõtmata.'}]:[]),
   ...(k.tempo?[{id:'tempo',text:`Mis BPM on nähtav? Oodatud ${k.tempo}; Tempo To Use PRESET. Ära kasuta tap-tempot selle katse ajal.`}]:[]),
   {id:'cpu',text:'Kirjuta kontrollitud stseeni number ja nähtud CPU protsent; mõõtmata korral -.'}];
  const bind={kind:'fm3-bind-store',version:1,test:k.id,confirmName:k.name,preset,checks,
   expect:k.expect,expectedModifier:k.target,tempoBpm:k.tempo??120,
   storeLocationPolicy:'User chooses a backed-up/expendable slot; no script stores or changes presets/scenes.'};
  for(const [dir,value] of [['shot',shot],['store',bind]])fs.writeFileSync(path.join(d,dir,'manifest.json'),JSON.stringify(value,null,2)+'\n');
  fs.writeFileSync(path.join(d,'VAATLUSED.txt'),k.name+'\n\n'+checks.map(c=>c.text).join('\n\n')+'\n');
  packs.push({id:k.id,name:k.name,stem:k.id+'/'+k.id,presetSha256:sha(r.syx),expected:k.expect,
   modifierTargets:spec.modifierTargets,controlSwitches:spec.controlSwitches??[],tempo:k.tempo??120,
   shotManifestSha256:sha(fs.readFileSync(path.join(d,'shot/manifest.json'))),
   storeManifestSha256:sha(fs.readFileSync(path.join(d,'store/manifest.json'))),
   fourFilesVerified:true,hardwareTested:false});
 }
 for(const f of ['FM3_CPU_SWEEP.py','FM3_READ_PROBE.py','FM3_BIND_STORE.py','FM3_SHOT_LOAD.py','FM3_SHOT_READ.py'])
  fs.copyFileSync(path.join(E,'scripts/cpu-sweep-collector',f),path.join(out,f));
 fs.copyFileSync(path.join(ROOT,'tools/fm3/audit-targets-run.py'),path.join(out,'ALUSTA.py'));
 fs.writeFileSync(path.join(out,'ALUSTA.command'),'#!/bin/bash\nset -euo pipefail\ncd -- "$(dirname -- "$0")"\nexec python3 -B ALUSTA.py "$@"\n',{mode:0o755});
 fs.copyFileSync(path.join(ROOT,'docs/fm3/FM3_AUDIT_TARGETS_GUIDE.txt'),path.join(out,'LOE_MIND.txt'));
 const files=[];function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const p=path.join(d,f.name);if(f.isDirectory())walk(p);else files.push({path:path.relative(out,p),sha256:sha(fs.readFileSync(p))});}}walk(out);
 const version=JSON.parse(fs.readFileSync(path.join(ROOT,'plugins/fm3-sound-architect-2/plugin.json'))).version;
 fs.writeFileSync(path.join(out,'pack.json'),JSON.stringify({kind:'fm3-audit-targets-preparation',schemaVersion:1,version,
  date:'2026-11-09',packs,files,deviceIO:false,newHardwareMeasurements:false},null,2)+'\n');
 execFileSync('python3',['-B',path.join(out,'ALUSTA.py'),'--preflight'],{stdio:'pipe'});
 return {passed:true,presets:4,verifiedFiles:16,preflight:true,deviceIO:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'Usage: audit-targets-build.mjs EMPTY_OUT_DIR');console.log(JSON.stringify(build(path.resolve(process.argv[2]))));
}

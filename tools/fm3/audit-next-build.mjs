// H1/H2 preparation only. Historical B1/B2 and T36 evidence stays immutable.
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
const {multidelayType}=await import(path.join(E,'scripts/fm3-multidelay-types.mjs'));
const {estimateCpu}=await import(path.join(E,'scripts/fm3-cpu.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const TYPES=['Pealing Bells','Dub Echo','Mono Diffuser','Aurora Delay'];
const REVERB='Room: Recording Studio A';
export function specs(){
 return [
  {id:'H1',name:'AUDIT SC1 REVERB MIX',names:['SC1 0 MIX10','SC1 50 MIX25','SC1 100 MIX40'],
   expected:'Reverb A: Room: Recording Studio A. Scene Controller 1 → Reverb Mix, ALL, Min 10%, Max 40%. Stseenid 1/2/3: SC1 0/50/100%, Mix 10/25/40%; reverb suureneb ja otsene heli säilib.',
   extra:{modifierTargets:[{source:'Scene Controller 1',block:'reverb',param:'REVERB_MIX',min:10,max:40}],
    controllers:[0,50,100,0,0,0,0,0].map((value,i)=>({channel:'A',param:`SCENE1_VAL${i+1}`,value}))}},
  {id:'H2',name:'AUDIT T36 MD STORE',names:TYPES.map((t,i)=>'ABCD'[i]+' '+t),
   expected:'Multi Delay A Pealing Bells (Mix 30%), B Dub Echo, C Mono Diffuser, D Aurora Delay. Stseenid 1–4 valivad A–D. Kontrolli nimesid ja heli; pärast käsitsi STORE/reload peab terve preset säilima.',
   extra:{insert:['multidelay'],multidelayTypes:TYPES.map((type,i)=>({channel:'ABCD'[i],type})),
    controls:[{block:'multidelay',channel:'A',param:'MULTITAP_MIX',value:30}]}}
 ].map(k=>{
  const md=k.id==='H2',families=['drive','amp','cab','delay','reverb',...(md?['multidelay']:[])];
  const blockScenes=Object.fromEntries(families.map(b=>[b,Array.from({length:8},(_,i)=>({scene:i+1,
   channel:md&&b==='multidelay'?'ABCD'[i<4?i:0]:'A',
   bypass:!(['amp','cab'].includes(b)||b===(md?'multidelay':'reverb'))}))]));
  return {k,spec:{composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:k.name,
   modifiers:{external1Wah:false},reverbChannels:[{channel:'A',type:REVERB}],
   scenes:Array.from({length:8},(_,i)=>({scene:i+1,name:k.names[i]??'TEST DEFAULT'}))},
   layout:{row2:['drive','amp','cab'],row3:['delay',...(md?['multidelay']:[]),'reverb']},
   selectedScene:1,blockScenes,...k.extra,
   context:{guitar:'Ibanez AS-120',pickups:'humbucker',output:'OUT1 → aktiivkõlarid'},
   purpose:'Auditi 10.11.2026 järgmine seadmekatse. Ettevalmistatud; selle lõppfaili import, heli, CPU ja STORE on mõõtmata.'}};
 });
}
export function build(out){
 assert.equal(process.versions.node.split('.')[0],'22','Use Node 22');
 fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Use an empty output directory');
 const base=fs.readFileSync(path.join(E,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx')),packs=[];
 for(const {k,spec} of specs()){
  const d=path.join(out,k.id);fs.mkdirSync(d);const stem=path.join(d,k.id),r=createPreset(base,spec);
  writePresetOutputs(stem,r,spec);verifyPresetOutputs(stem);
  const st=inspectStructure(r.syx),body=Buffer.from(st.raw.body),{records}=scanRecords(body);
  assert.deepEqual([...st.parsed.headerPayload],[127,0,0,64,0]);
  assert.equal(readModifiers(body).filter(m=>m.active).length,k.id==='H1'?1:0);
  if(k.id==='H2'){
   const rec=records.find(x=>x.family==='multidelay');assert.equal(rec.words,121);assert.equal(rec.channels,4);
   const mix=r.report.controls.find(c=>c.block==='multidelay'&&c.name==='MULTITAP_MIX');assert.ok(mix);
   TYPES.forEach((type,ch)=>{
    const expected=multidelayType(type).words,actual=expected.map((_,i)=>body.readUInt16LE(rec.start+2*(ch*121+i)));
    assert.deepEqual(expected.flatMap((w,i)=>w===actual[i]?[]:[i]),ch===0?[mix.pid]:[],'Whole template '+type);
   });
  }
  // Send is normalized by the device. All other effect-block words are checked at LOAD.
  const blocks=records.filter(x=>x.family!=='send').map(x=>({family:x.family,effectId:x.eid,words:x.words,channels:x.channels,
   request:Buffer.from(bulkReadPoll(x.eid)).toString('hex'),
   expected:Array.from({length:x.words*x.channels},(_,i)=>body.readUInt16LE(x.start+2*i)),writes:[]}));
  const preset={file:'../'+k.id+'.syx',sha256:sha(r.syx)};
  for(const dir of ['shot','store'])fs.mkdirSync(path.join(d,dir));
  const shot={kind:'fm3-shot-check',version:1,test:k.id,items:[{id:k.id,name:k.name,...preset,blocks}],
   scope:'Listed effect-block parameter words only. Controllers, modifiers, grid, scenes, Send and system tail require the later whole-preset STORE comparison.'};
  const checks=[{id:'name_grid_scenes',text:`Kas nimi ${k.name}, TXT ruudustik ning stseenide kanal/bypass on õiged? jah/ei/mõõtmata.`},
   ...(k.id==='H1'?[
    {id:'source',text:'Reverb Mix: nähtud Source? Oodatud Scene Controller 1.'},
    {id:'minmax_channel',text:'Nähtud Min, Max, Channel? Oodatud 10%, 40%, ALL.'},
    {id:'type',text:'Reverb A Type? Oodatud Room: Recording Studio A.'},
    ...[10,25,40].map((mix,i)=>({id:'scene'+(i+1),text:`Stseen ${i+1}: kirjuta SC1 väärtus, Reverb Mixi näit, heli ning CPU protsent. Oodatud SC1 ${[0,50,100][i]}%, Mix ${mix}%; CPU on mõõtmata.`}))
   ]:TYPES.map((type,i)=>({id:'scene'+(i+1),text:`Stseen ${i+1}, kanal ${'ABCD'[i]}: nähtud Multi Delay Type (oodatud ${type}), heli ja CPU protsent. CPU on mõõtmata.`}))),
   {id:'behavior',text:k.expected+' Kas vastab? jah/ei/mõõtmata; kirjelda erinevust.'}];
  const bind={kind:'fm3-bind-store',version:1,test:k.id,confirmName:k.name,preset,checks,expect:k.expected,
   storeLocationPolicy:'User chooses a backed-up/expendable slot. No automatic STORE, preset/scene selection, SET or global writes.'};
  for(const [dir,value] of [['shot',shot],['store',bind]])fs.writeFileSync(path.join(d,dir,'manifest.json'),JSON.stringify(value,null,2)+'\n');
  const cpu=estimateCpu(r.syx,{model:'fm3-cpu 0.2.5'});assert.ok(cpu.maxPercent<cpu.limitPercent); // pinned: packs sent before 0.2.6
  fs.writeFileSync(path.join(d,'VAATLUSED.txt'),k.name+'\n\n'+checks.map(c=>c.text).join('\n\n')+
   '\n\nCPU tarkvarahinnang (mitte mõõtmine): '+cpu.scenes.map(s=>`S${s.scene} ${s.percent}%`).join(', ')+
   '\nHinnang ei taga presetipõhist veapiiri; mõõda kasutatud stseenid enne STORE-i ja pärast tagasitulekut.\n');
  packs.push({id:k.id,name:k.name,stem:k.id+'/'+k.id,presetSha256:preset.sha256,expected:k.expected,
   scenePlan:spec.composer.scenes,modifierTargets:spec.modifierTargets??[],multidelayTypes:spec.multidelayTypes??[],
   reverbType:REVERB,cpuEstimate:cpu,shotManifestSha256:sha(fs.readFileSync(path.join(d,'shot/manifest.json'))),
   storeManifestSha256:sha(fs.readFileSync(path.join(d,'store/manifest.json'))),fourFilesVerified:true,hardwareTested:false});
 }
 for(const f of ['FM3_CPU_SWEEP.py','FM3_READ_PROBE.py','FM3_BIND_STORE.py','FM3_SHOT_LOAD.py','FM3_SHOT_READ.py'])
  fs.copyFileSync(path.join(E,'scripts/cpu-sweep-collector',f),path.join(out,f));
 fs.copyFileSync(path.join(ROOT,'tools/fm3/audit-next-run.py'),path.join(out,'ALUSTA.py'));
 fs.writeFileSync(path.join(out,'ALUSTA.command'),'#!/bin/bash\nset -euo pipefail\ncd -- "$(dirname -- "$0")"\nexec python3 -B ALUSTA.py "$@"\n',{mode:0o755});
 fs.copyFileSync(path.join(ROOT,'docs/fm3/FM3_AUDIT_NEXT_GUIDE.txt'),path.join(out,'LOE_MIND.txt'));
 const files=[];function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const p=path.join(d,f.name);if(f.isDirectory())walk(p);else files.push({path:path.relative(out,p),sha256:sha(fs.readFileSync(p))});}}walk(out);
 const version=JSON.parse(fs.readFileSync(path.join(ROOT,'plugins/fm3-sound-architect-2/plugin.json'))).version;
 fs.writeFileSync(path.join(out,'pack.json'),JSON.stringify({kind:'fm3-audit-next-preparation',schemaVersion:1,version,
  date:'2026-11-10',packs,files,deviceIO:false,newHardwareMeasurements:false,
  allowedStoredDifferences:['selected-scene byte 0','whole-record ordering','SysEx destination header'],
  evidenceBoundary:'H1 is a new target preset. H2 prepares STORE for four already imported T36 Types; no hardware counters are incremented.'},null,2)+'\n');
 execFileSync('python3',['-B',path.join(out,'ALUSTA.py'),'--preflight'],{stdio:'pipe'});
 return {passed:true,presets:2,verifiedFiles:8,preflight:true,deviceIO:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'Usage: audit-next-build.mjs EMPTY_OUT_DIR');console.log(JSON.stringify(build(path.resolve(process.argv[2]))));
}

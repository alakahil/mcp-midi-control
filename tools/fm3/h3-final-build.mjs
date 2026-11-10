// H3 preparation only: the final performance preset check (audit 0.3.63, 10.11.2026).
// Two candidate final files are prepared; the user picks which one to run (--case V1|V4) or runs both.
// Both are rebuilt byte for byte from their own sources and pinned by SHA-256:
//   V1 = LIVE KOOSLUS V1 (T32C, Amp C -8 dB), built by tools/fm3/t32-live-build.mjs.
//   V4 = SATCH SOAP ON A ROPE V4 (examples/SATRIANI_SOAP_ON_A_ROPE_V4.spec.json on the JB base).
// Offline; no device I/O. The run script loads, reads blocks back, waits for the user's playing/STORE round and
// then reads the stored location with the read-only stored-dump request. It never stores, sets or switches.
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
const sha=b=>createHash('sha256').update(b).digest('hex');
export const KIND='fm3-h3-final-preparation',CASES=['V1','V4'];
export const PINNED={V1:'b180d2baf4014fc472ddcd93560041c858dc1ffee8ae81a29fe8f88a5cd189a9',
 V4:'cc24d3f7cfcb5a6537a07a12fc6246a9de94c49bcf84301a8a632916c1437037'};
const CASE={
 V1:{name:'LIVE KOOSLUS V1',stem:'LIVE_KOOSLUS_V1',
  history:'T32: 8 stseeni CPU mõõdetud 55–71% ja 11 plokikirjet säilisid STORE järel (Amp C −14 dB). T34E: −8 dB Lead kõlas teistega umbes sama valjult. Selle lõppfaili CPU ja STORE on mõõtmata.',
  expected:'LIVE KOOSLUS V1: CLEAN, CRUNCH, LEAD, AMBIENT ning nende variandid; Multi Delay ainult stseenis 4. Lead (stseenid 3 ja 7, Amp C −8 dB) on teistega umbes sama vali; ükski stseen ei klipi.'},
 V4:{name:'SATCH SOAP ON A ROPE V4',stem:'SATRIANI_SOAP_ON_A_ROPE_V4',
  history:'T8: kõigi 8 stseeni CPU hinnang klappis näiduga 0,4 punkti piires. V3 kuulatud 26.10; V4 muudab ainult Amp C (stseen 5 CRUNCH FULL). V4 lõppfaili kuulamine, tervikkontroll ja STORE on mõõtmata.',
  expected:'SATCH SOAP ON A ROPE V4: riff stseenides 1, 2 ja 6, soolod 3, 4, 7 ja 8, täidlasem crunch stseenis 5. Stseenide valjus sobib kokku; ükski stseen ei klipi.'}};
function rebuild(id,tmp){
 const c=CASE[id];
 if(id==='V1'){
  execFileSync('node',[path.join(ROOT,'tools/fm3/t32-live-build.mjs'),path.join(tmp,'t32')],{stdio:'ignore'});
  const src=path.join(tmp,'t32','FM3_T32C_FINAL',c.stem);verifyPresetOutputs(src);return src;
 }
 const base=fs.readFileSync(path.join(E,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'));
 const spec=JSON.parse(fs.readFileSync(path.join(E,'examples',c.stem+'.spec.json')));
 const src=path.join(tmp,c.stem),r=createPreset(base,spec);writePresetOutputs(src,r,spec);verifyPresetOutputs(src);
 assert.ok(fs.readFileSync(path.join(E,'examples',c.stem+'.syx')).equals(fs.readFileSync(src+'.syx')),'V4 example SYX = rebuild');
 return src;
}
const sceneNames=txt=>{const m=[...txt.matchAll(/^Scene (\d): (.+)$/gm)].map(x=>[Number(x[1]),x[2].trim()]);
 assert.deepEqual(m.map(x=>x[0]),[1,2,3,4,5,6,7,8],'TXT lists scenes 1-8');return m.map(x=>x[1]);};
export function build(out){
 assert.equal(process.versions.node.split('.')[0],'22','Use Node 22');
 fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Use an empty output directory');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-h3-')),packs=[];
 try{
  for(const id of CASES){
   const c=CASE[id],src=rebuild(id,tmp),d=path.join(out,id);fs.mkdirSync(d);
   for(const ext of ['.syx','.txt','.spec.json','.validation.json'])fs.copyFileSync(src+ext,path.join(d,id+ext));
   const stem=path.join(d,id);verifyPresetOutputs(stem);const syx=fs.readFileSync(stem+'.syx');
   assert.equal(sha(syx),PINNED[id],id+' final file changed');
   const st=inspectStructure(syx),body=Buffer.from(st.raw.body),{records}=scanRecords(body);
   assert.deepEqual([...st.parsed.headerPayload],[127,0,0,64,0],'edit-buffer header');
   assert.equal(String(st.decoded.preset_name).trim(),c.name);
   const txt=fs.readFileSync(stem+'.txt','utf8'),names=sceneNames(txt);
   const validation=JSON.parse(fs.readFileSync(stem+'.validation.json')),cpu=validation.cpu??validation.report?.cpu;
   assert.ok(cpu&&cpu.maxPercent<cpu.limitPercent,'CPU estimate under the safe limit');
   // Send is normalized by the device. All other block words are checked at LOAD.
   const blocks=records.filter(x=>x.family!=='send').map(x=>({family:x.family,effectId:x.eid,words:x.words,channels:x.channels,
    request:Buffer.from(bulkReadPoll(x.eid)).toString('hex'),
    expected:Array.from({length:x.words*x.channels},(_,i)=>body.readUInt16LE(x.start+2*i)),writes:[]}));
   const preset={file:'../'+id+'.syx',sha256:PINNED[id]},list=(a,b)=>names.slice(a,b).map((n,i)=>`${a+i+1} ${n}`).join(', ');
   const scene=(a,b)=>`Mängi stseenid ${list(a,b)} päris kitarriga. Kas heli on õige, valjus sobib teistega ja Out 1 näidik ei lähe punaseks? Kirjelda, mis stseenis mis erines.`;
   const checks=[{id:'name_grid_scenes',text:`Kas nimi ${c.name}, TXT ruudustik ning stseenide nimed/kanalid/bypass on õiged? jah/ei/mõõtmata.`},
    {id:'scenes1_4',text:scene(0,4)},{id:'scenes5_8',text:scene(4,8)},
    {id:'transitions',text:'Vaheta stseene mängu ajal (nt 1→2→3→1 ja 4→8). Kas vahetus on ilma augu, plõksu või hilinemiseta ja kaja/reverbi sabad käituvad ootuspäraselt?'},
    {id:'switches',text:'Vali stseene oma jalalülititega (Ampero: ainult B lühike vajutus, A-d mitte). Kas tuleb õige stseen? Kui lüliteid ei kasutanud, kirjuta "ei kasutanud".'},
    {id:'cpu',text:'CPU: Claude loeb FM3-Editist stseenide 1–8 protsendid. Kirjuta "Claude" või oma näidud.'},
    {id:'behavior',text:c.expected+' Kas vastab ja kas see fail sobib lõppesituseks? jah/ei; kirjelda erinevust.'}];
   const shotItem={id,name:c.name,...preset,blocks};
   for(const dir of ['shot','store'])fs.mkdirSync(path.join(d,dir));
   const shot={kind:'fm3-shot-check',version:1,test:'H3-'+id,items:[shotItem],
    scope:'Listed effect-block parameter words only. Controllers, modifiers, grid, scenes, Send and system tail require the later whole-preset STORE comparison.'};
   const bind={kind:'fm3-bind-store',version:1,test:'H3-'+id,confirmName:c.name,preset,checks,expect:c.expected,
    storeLocationPolicy:'User chooses a backed-up/expendable slot. No automatic STORE, preset/scene selection, SET or global writes.'};
   for(const [dir,value] of [['shot',shot],['store',bind]])fs.writeFileSync(path.join(d,dir,'manifest.json'),JSON.stringify(value,null,2)+'\n');
   fs.writeFileSync(path.join(d,'VAATLUSED.txt'),c.name+'\n\nVarasem tõend: '+c.history+'\n\n'+checks.map(x=>x.text).join('\n\n')+
    '\n\nCPU tarkvarahinnang (mitte mõõtmine, '+cpu.model+'): '+cpu.scenes.map(s=>`S${s.scene} ${s.percent}%`).join(', ')+
    '\nHinnang ei taga presetipõhist veapiiri; mõõda kõik 8 stseeni enne STORE-i ja pärast tagasitulekut.\n');
   packs.push({id,name:c.name,stem:id+'/'+id,presetSha256:PINNED[id],expected:c.expected,history:c.history,scenes:names,
    cpuEstimate:{model:cpu.model,scenes:cpu.scenes.map(s=>s.percent)},blockRecords:records.length,
    shotManifestSha256:sha(fs.readFileSync(path.join(d,'shot/manifest.json'))),
    storeManifestSha256:sha(fs.readFileSync(path.join(d,'store/manifest.json'))),fourFilesVerified:true,hardwareTested:false});
  }
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 for(const f of ['FM3_CPU_SWEEP.py','FM3_READ_PROBE.py','FM3_BIND_STORE.py','FM3_SHOT_LOAD.py','FM3_SHOT_READ.py'])
  fs.copyFileSync(path.join(E,'scripts/cpu-sweep-collector',f),path.join(out,f));
 fs.copyFileSync(path.join(ROOT,'tools/fm3/h3-final-run.py'),path.join(out,'ALUSTA.py'));
 fs.writeFileSync(path.join(out,'ALUSTA.command'),'#!/bin/bash\nset -euo pipefail\ncd -- "$(dirname -- "$0")"\nexec python3 -B ALUSTA.py "$@"\n',{mode:0o755});
 fs.copyFileSync(path.join(ROOT,'docs/fm3/FM3_H3_FINAL_GUIDE.txt'),path.join(out,'LOE_MIND.txt'));
 const files=[];function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const p=path.join(d,f.name);if(f.isDirectory())walk(p);else files.push({path:path.relative(out,p),sha256:sha(fs.readFileSync(p))});}}walk(out);
 const version=JSON.parse(fs.readFileSync(path.join(ROOT,'plugins/fm3-sound-architect-2/plugin.json'))).version;
 fs.writeFileSync(path.join(out,'pack.json'),JSON.stringify({kind:KIND,schemaVersion:1,version,date:'2026-11-10',packs,files,
  deviceIO:false,newHardwareMeasurements:false,
  allowedStoredDifferences:['selected-scene byte 0','whole-record ordering','SysEx destination header'],
  evidenceBoundary:'H3 prepares two candidate final files; the user picks one or both. Bytes, display, sound, CPU and switches are judged separately; no hardware counters are incremented by preparation.'},null,2)+'\n');
 execFileSync('python3',['-B',path.join(out,'ALUSTA.py'),'--preflight'],{stdio:'pipe'});
 return {passed:true,presets:packs.length,verifiedFiles:4*packs.length,preflight:true,deviceIO:false,
  sha256:Object.fromEntries(packs.map(p=>[p.id,p.presetSha256]))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'Usage: h3-final-build.mjs EMPTY_OUT_DIR');console.log(JSON.stringify(build(path.resolve(process.argv[2]))));
}

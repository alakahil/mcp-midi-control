// T51 preparation only (13.11.2026). Offline; writes the pack, never device I/O.
// Device check for recordOrder:"device" in grid mode (0.3.70): parallel rows, added records placed by the device
// record-order evidence. Question: is the stored body byte-identical after STORE, record order included?
//   T51A = Delay || Reverb in two rows, merged by an inserted Mixer (Mixer placed by evidence).
//   T51B = Delay || Reverb || Plex in three rows plus a dry shunt row, merged by a Mixer (Plex is placed between kept records).
//   T51C = Drive || Drive 2 selected by a Multiplexer. Drive 2 has no order evidence, so it is appended: the stored dump
//          shows where the FM3 itself puts a second instance (a record-order difference here is a finding, not a failure).
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
export const KIND='fm3-t51-preparation',CASES=['T51A','T51B','T51C'];
const BASE=path.join(E,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const e=()=>Array(12).fill('');
export const T51={
 T51A:{remove:['send','return'],insert:['mixer'],
  rows:[e(),['in1','compressor','drive','amp','cab','delay','-','mixer','-','-','-','out1'],['','','','','','-','reverb','','','','',''],e()],
  links:[{row:3,col:6,from:[2]},{row:2,col:8,from:[2,3]}],on:['compressor','amp','cab','delay','reverb','mixer'],
  shape:'Rida 2: In 1, Comp, Drive, Amp, Cab, Delay, shunt, Mixer, 3 shunti, Out 1. Rida 3: shunt (veerg 6) ja Reverb (veerg 7). Cab hargneb Delaysse ja 3. reale; Mixer liidab read 2 ja 3.',
  hear:'Delay ja Reverb on paralleelselt: kuulda on nii kordused kui ka ruum, kumbki ei lähe teisest läbi.'},
 T51B:{remove:['send','return'],insert:['mixer','plex'],
  rows:[['','','','','','-','delay','-','','','',''],['in1','compressor','drive','amp','cab','-','reverb','-','mixer','-','-','out1'],['','','','','','-','plex','-','','','',''],['','','','','','-','-','-','','','','']],
  links:[{row:1,col:6,from:[2]},{row:3,col:6,from:[2]},{row:4,col:6,from:[2]},{row:2,col:9,from:[1,2,3,4]}],on:['compressor','amp','cab','delay','reverb','plex','mixer'],
  shape:'Neli rida veergudes 6–8: rida 1 Delay, rida 2 Reverb, rida 3 Plex, rida 4 ainult shundid (kuiv). Kõik hargnevad Cabist ja liituvad Mixeris (rida 2, veerg 9).',
  hear:'Kuiv heli pluss Delay, Reverb ja Plex paralleelselt. Heli on selgelt ruumilisem kui T51A.'},
 T51C:{remove:['send','return'],insert:['multiplexer'],duplicate:['drive2'],
  rows:[e(),['in1','compressor','-','drive','-','multiplexer','amp','cab','delay','reverb','-','out1'],['','','-','drive2','-','','','','','','',''],e()],
  links:[{row:3,col:3,from:[2]},{row:2,col:6,from:[2,3]}],on:['compressor','drive','amp','cab','delay','reverb','multiplexer'],
  controls:[{block:'multiplexer',channel:'A',param:'MULTIPLEXER_INPUTSEL',value:'ROW 2'}],
  shape:'Rida 2: In 1, Comp, shunt, Drive, shunt, Multiplexer, Amp, Cab, Delay, Reverb, shunt, Out 1. Rida 3 veergudes 3–5: shunt, Drive 2, shunt. Comp hargneb mõlemale reale; Multiplexeri Input Select = ROW 2 (Drive 1).',
  hear:'Heli läbib Drive 1 haru (Drive 2 on välja lülitatud). Tavaline ülevõimendatud rütmiheli.'}};
export function specs(){
 return CASES.map(id=>{const t=T51[id],name=id+' GRID ORDER',blocks=t.rows.flat().filter(v=>v&&v!=='-'&&v!=='in1'&&v!=='out1');
  const s={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name,modifiers:{external1Wah:false},
    reverbChannels:[{channel:'A',type:'Room: Recording Studio A'}],driveChannels:[{channel:'A',type:'T808 OD'}],delayChannels:[{channel:'A',type:'Digital Stereo'}],compressorChannels:[{channel:'A',type:'Optical Compressor'}],
    scenes:Array.from({length:8},(_,i)=>({scene:i+1,name:i<2?`${id} S${i+1}`:'TEST DEFAULT'}))},
   grid:{rows:structuredClone(t.rows),links:structuredClone(t.links)},remove:[...t.remove],insert:[...t.insert],...(t.duplicate?{duplicate:[...t.duplicate]}:{}),...(t.controls?{controls:structuredClone(t.controls),allow:['enum-labels']}:{}),recordOrder:'device',selectedScene:1,
   blockScenes:Object.fromEntries(blocks.map(b=>[b,Array.from({length:8},(_,i)=>({scene:i+1,channel:'A',bypass:!t.on.includes(b)}))])),
   context:{guitar:'Ibanez AS-120',pickups:'humbucker',output:'OUT1 stereo FOH'},
   purpose:`${id}: ruudustikurežiimi paralleelread ja recordOrder "device" (0.3.70). Kuva, heli ja STORE on mõõtmata.`};
  return {id,name,spec:s,scenes:2,shape:t.shape,hear:t.hear,
   expected:`${id}: ${t.shape} ${t.hear}`,
   history:'Ruudustiku lahtrid on seadmel kinnitatud (7 ruudustikku, 23.10.2026). Lisatud kirjete seadme järjekord ruudustikurežiimis on tõendite järgi, STORE-iga kontrollimata.'};
 });
}
export function build(out){
 assert.equal(process.versions.node.split('.')[0],'22','Use Node 22');
 fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Use an empty output directory');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t51-')),packs=[],base=fs.readFileSync(BASE);
 try{
  for(const k of specs()){
   const d=path.join(out,k.id);fs.mkdirSync(d);const stem=path.join(d,k.id),r=createPreset(base,k.spec);
   writePresetOutputs(stem,r,k.spec);verifyPresetOutputs(stem);
   const syx=fs.readFileSync(stem+'.syx'),st=inspectStructure(syx),body=Buffer.from(st.raw.body),{records}=scanRecords(body);
   assert.deepEqual([...st.parsed.headerPayload],[127,0,0,64,0],'edit-buffer header');
   assert.equal(String(st.decoded.preset_name).trim(),k.name);
   const ro=r.report.stages.records.recordOrder;assert.equal(ro.mode,'device');
   const order=records.map(x=>x.eid);
   if(k.id==='T51C'){const mux=records.find(x=>x.family==='multiplexer');assert.ok(mux,'T51C Multiplexer record');
    assert.equal(body.readUInt16LE(mux.start),1,'T51C Multiplexer Input Select = ROW 2 (Drive 1 row), not the donor ROW 1');}
   const validation=JSON.parse(fs.readFileSync(stem+'.validation.json')),cpu=validation.cpu??validation.report?.cpu;
   assert.ok(cpu&&cpu.maxPercent<cpu.limitPercent,'CPU estimate under the safe limit');
   const blocks=records.filter(x=>x.family!=='send').map(x=>({family:x.family,effectId:x.eid,words:x.words,channels:x.channels,
    request:Buffer.from(bulkReadPoll(x.eid)).toString('hex'),
    expected:Array.from({length:x.words*x.channels},(_,i)=>body.readUInt16LE(x.start+2*i)),writes:[]}));
   const preset={file:'../'+k.id+'.syx',sha256:sha(syx)};
   const checks=[{id:'name_grid_scenes',text:`Kas nimi ${k.name}, TXT ruudustik ning stseenide nimed on õiged? jah/ei/mõõtmata.`},
    {id:'grid_display',text:`Ava FM3-Edit; Claude pildistab ruudustiku. Oodatud: ${k.shape} Kirjuta "Claude" või kirjelda erinevust.`},
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
    scenesUsed:k.scenes,loadOnly:false,recordOrder:{mode:ro.mode,placed:ro.placed,generated:order,receiptSha256:ro.receiptSha256},
    cpuEstimate:{model:cpu.model,scenes:cpu.scenes.map(s=>s.percent)},blockRecords:records.length,
    shotManifestSha256:sha(fs.readFileSync(path.join(d,'shot/manifest.json'))),
    storeManifestSha256:sha(fs.readFileSync(path.join(d,'store/manifest.json'))),
    fourFilesVerified:true,hardwareTested:false});
  }
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 for(const f of ['FM3_CPU_SWEEP.py','FM3_READ_PROBE.py','FM3_BIND_STORE.py','FM3_SHOT_LOAD.py','FM3_SHOT_READ.py'])
  fs.copyFileSync(path.join(E,'scripts/cpu-sweep-collector',f),path.join(out,f));
 fs.copyFileSync(path.join(ROOT,'tools/fm3/t51-run.py'),path.join(out,'ALUSTA.py'));
 fs.writeFileSync(path.join(out,'ALUSTA.command'),'#!/bin/bash\nset -euo pipefail\ncd -- "$(dirname -- "$0")"\nexec python3 -B ALUSTA.py "$@"\n',{mode:0o755});
 fs.copyFileSync(path.join(ROOT,'docs/fm3/FM3_T51_GUIDE.txt'),path.join(out,'LOE_MIND.txt'));
 const files=[];function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const p=path.join(d,f.name);if(f.isDirectory())walk(p);else files.push({path:path.relative(out,p),sha256:sha(fs.readFileSync(p))});}}walk(out);
 const version=JSON.parse(fs.readFileSync(path.join(ROOT,'plugins/fm3-sound-architect-2/plugin.json'))).version;
 fs.writeFileSync(path.join(out,'pack.json'),JSON.stringify({kind:KIND,schemaVersion:1,version,date:'2026-11-13',packs,files,
  deviceIO:false,newHardwareMeasurements:false,
  allowedStoredDifferences:['selected-scene byte 0','SysEx destination header','whole-record ordering (reported separately per case: T51A/T51B expect none; T51C records where the FM3 puts Drive 2)'],
  evidenceBoundary:'T51 tests generator-written parallel grids with added records placed by the device record-order evidence. Bytes, display and audible behaviour are judged separately; preparation increments no hardware counters.'},null,2)+'\n');
 execFileSync('python3',['-B',path.join(out,'ALUSTA.py'),'--preflight'],{stdio:'pipe'});
 return {passed:true,presets:packs.length,preflight:true,deviceIO:false,sha256:Object.fromEntries(packs.map(p=>[p.id,p.presetSha256]))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'Usage: t51-build.mjs EMPTY_OUT_DIR');console.log(JSON.stringify(build(path.resolve(process.argv[2]))));
}

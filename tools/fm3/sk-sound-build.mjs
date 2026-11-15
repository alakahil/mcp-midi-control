// SK1-SK4 preparation (audit 0.3.74 / offline work 0.3.75, 14.11.2026): one device session for the V1.3 Cab-filter comparison.
// Three candidates from fm3-sound-candidates.mjs (BASELINE_V13 unchanged, CAB_LOW80, CAB_HIGH6500), each pinned by SHA-256.
// The run script loads one candidate into the edit buffer, reads its blocks back, then records the FM3 USB audio per scene
// (USB 1-2 processed, USB 3-4 dry; FM3 default routing, no global change) while polling the read-only CPU meter.
// SK4 (--store ID) reads the user's own STORE location back. Offline here; no device I/O.
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
const {build:buildCandidates}=await import(path.join(E,'scripts/fm3-sound-candidates.mjs'));
const {verifyPresetOutputs}=await import(path.join(E,'scripts/fm3-preset.mjs'));
const {inspectStructure}=await import(path.join(E,'scripts/drive-collector/fm3-prototype.mjs'));
const {scanRecords}=await import(path.join(E,'scripts/fm3-layout.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
export const KIND='fm3-sk-sound-preparation',CASES=['BASELINE_V13','CAB_LOW80','CAB_HIGH6500'];
// BASELINE_V13 = the LIVE KOOSLUS V1.3 file the user approved by ear on 13.11.2026.
export const PINNED={BASELINE_V13:'b7bd043ce9602293be7d3be830aa8655b0c92cf3309d20b47913571ca1d06668',
 CAB_LOW80:'725e8279c93bbaea10d137ade35731831c95b7e91bcbc92752b506dc639c39f1',
 CAB_HIGH6500:'501f0ddbb1564952f13a4855e6b90770afe7ba5e389ea31cdc4d1ffb16263012'};
const NAME={BASELINE_V13:'LIVE KOOSLUS V1.3',CAB_LOW80:'LIVE V13 LOW80',CAB_HIGH6500:'LIVE V13 HIGH6500'};
export function build(out){
 assert.equal(process.versions.node.split('.')[0],'22','Use Node 22');
 fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Use an empty output directory');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-sk-')),packs=[];
 try{
  const cand=buildCandidates(path.join(tmp,'c'));
  assert.deepEqual(cand.candidates.map(c=>c.id),CASES);
  for(const c of cand.candidates){
   const id=c.id,d=path.join(out,id);fs.mkdirSync(d);
   for(const ext of ['.syx','.txt','.spec.json','.validation.json','.review.json','.acceptance-pending.json'])
    fs.copyFileSync(path.join(tmp,'c',id+ext),path.join(d,id+ext));
   const stem=path.join(d,id);verifyPresetOutputs(stem);const syx=fs.readFileSync(stem+'.syx');
   assert.equal(sha(syx),PINNED[id],id+' candidate file changed');
   const st=inspectStructure(syx),body=Buffer.from(st.raw.body),{records}=scanRecords(body);
   assert.deepEqual([...st.parsed.headerPayload],[127,0,0,64,0],'edit-buffer header');
   assert.equal(String(st.decoded.preset_name).trim(),NAME[id]);
   const review=JSON.parse(fs.readFileSync(stem+'.review.json')),scenes=review.decoded.scenes.map(s=>s.name);
   assert.equal(scenes.length,8);
   const cpu=review.cpuEstimate.scenes.map(s=>s.estimatedPercent);
   const blocks=records.filter(x=>x.family!=='send').map(x=>({family:x.family,effectId:x.eid,words:x.words,channels:x.channels,
    request:Buffer.from(bulkReadPoll(x.eid)).toString('hex'),
    expected:Array.from({length:x.words*x.channels},(_,i)=>body.readUInt16LE(x.start+2*i)),writes:[]}));
   const preset={file:'../'+id+'.syx',sha256:PINNED[id]};
   const checks=[{id:'scenes',text:'Kas kõik 8 stseeni kõlasid nagu enne STORE-i (sama heli, sama valjus, Out 1 ei klipi)? jah/ei; kirjelda erinevust.'},
    {id:'transitions',text:'Vaheta stseene mängu ajal (1→2→3→1 ja 4→8). Kas vahetus on ilma augu/plõksuta ja sabad käituvad ootuspäraselt?'},
    {id:'switches',text:'Vali stseene M-Wave lülitiga. Kas tuleb õige stseen? (Ampero: ainult B lühike vajutus.)'},
    {id:'accepted',text:'Kas see fail sobib esinemiseks (lõppfail)? jah/ei ja põhjus.'}];
   for(const dir of ['shot','store'])fs.mkdirSync(path.join(d,dir));
   const shot={kind:'fm3-shot-check',version:1,test:'SK-'+id,items:[{id,name:NAME[id],...preset,blocks}],
    scope:'Effect-block parameter words only. Controllers, modifiers, grid, scenes, Send and system tail require the SK4 STORE comparison.'};
   const bind={kind:'fm3-bind-store',version:1,test:'SK4-'+id,confirmName:NAME[id],preset,checks,expect:c.expectedAudibleChange,
    storeLocationPolicy:'User chooses a backed-up/expendable slot (424-427). No automatic STORE, preset/scene selection, SET or global writes.'};
   for(const [dir,value] of [['shot',shot],['store',bind]])fs.writeFileSync(path.join(d,dir,'manifest.json'),JSON.stringify(value,null,2)+'\n');
   packs.push({id,name:NAME[id],stem:id+'/'+id,presetSha256:PINNED[id],group:c.group,expected:c.expectedAudibleChange,scenes,
    cpuEstimate:{model:review.cpuEstimate.model,scenes:cpu},blockRecords:records.length,
    shotManifestSha256:sha(fs.readFileSync(path.join(d,'shot/manifest.json'))),
    storeManifestSha256:sha(fs.readFileSync(path.join(d,'store/manifest.json'))),fourFilesVerified:true,hardwareTested:false});
  }
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 for(const f of ['FM3_CPU_SWEEP.py','FM3_READ_PROBE.py','FM3_BIND_STORE.py','FM3_SHOT_LOAD.py'])
  fs.copyFileSync(path.join(E,'scripts/cpu-sweep-collector',f),path.join(out,f));
 fs.copyFileSync(path.join(ROOT,'tools/fm3/l1-loudness.py'),path.join(out,'FM3_L1_LOUDNESS.py'));
 fs.copyFileSync(path.join(ROOT,'tools/fm3/sk-sound-run.py'),path.join(out,'ALUSTA.py'));
 fs.writeFileSync(path.join(out,'ALUSTA.command'),'#!/bin/bash\nset -euo pipefail\ncd -- "$(dirname -- "$0")"\nexec python3 -B ALUSTA.py "$@"\n',{mode:0o755});
 fs.copyFileSync(path.join(ROOT,'docs/fm3/FM3_SK_SOUND_GUIDE.txt'),path.join(out,'LOE_MIND.txt'));
 const files=[];function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const p=path.join(d,f.name);if(f.isDirectory())walk(p);else files.push({path:path.relative(out,p),sha256:sha(fs.readFileSync(p))});}}walk(out);
 const version=JSON.parse(fs.readFileSync(path.join(ROOT,'plugins/fm3-sound-architect-2/plugin.json'))).version;
 fs.writeFileSync(path.join(out,'pack.json'),JSON.stringify({kind:KIND,schemaVersion:1,version,date:'2026-11-15',packs,files,
  deviceIO:false,newHardwareMeasurements:false,
  audio:{channels:{wet:'USB 1-2',dry:'USB 3-4'},routing:'FM3 default USB routing; no Input 1 Source / global change'},
  allowedStoredDifferences:['selected-scene byte 0','whole-record ordering','SysEx destination header'],
  evidenceBoundary:'SK1-SK3 load each candidate, read blocks back, record per-scene audio and poll the read-only CPU meter. SK4 reads back only the file the user chose and stored. Sound choice stays the user\'s judgement.'},null,2)+'\n');
 execFileSync('python3',['-B',path.join(out,'ALUSTA.py'),'--preflight'],{stdio:'pipe'});
 return {passed:true,presets:packs.length,verifiedFiles:4*packs.length,preflight:true,deviceIO:false,
  sha256:Object.fromEntries(packs.map(p=>[p.id,p.presetSha256]))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'Usage: sk-sound-build.mjs EMPTY_OUT_DIR');console.log(JSON.stringify(build(path.resolve(process.argv[2]))));
}

// "Dust and Bone" live-preset preparation (17.11.2026): two song presets (DAB_A_PLEXI, DAB_B_DIRTY) generated from
// docs/fm3/sounds/dust-and-bone/*.input.json on the jb-newlook base, plus the approved LIVE KOOSLUS V1.3 file as the
// loudness reference. Same device flow as SK1-SK4: load into the edit buffer, read blocks back, record USB audio per scene
// while polling the read-only CPU meter; DAB-STORE reads the user's own STORE location back. Offline here; no device I/O.
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
const SPECS=path.join(ROOT,'docs/fm3/sounds/dust-and-bone');
const {build:buildCandidates}=await import(path.join(E,'scripts/fm3-sound-candidates.mjs'));
const {createPreset,writePresetOutputs,verifyPresetOutputs}=await import(path.join(E,'scripts/fm3-preset.mjs'));
const {reviewPreset}=await import(path.join(E,'scripts/fm3-preset-review.mjs'));
const {inspectStructure}=await import(path.join(E,'scripts/drive-collector/fm3-prototype.mjs'));
const {scanRecords}=await import(path.join(E,'scripts/fm3-layout.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
export const KIND='fm3-dab-sound-preparation',CASES=['BASELINE_V13','DAB_A_PLEXI','DAB_B_DIRTY'];
export const PINNED={BASELINE_V13:'b7bd043ce9602293be7d3be830aa8655b0c92cf3309d20b47913571ca1d06668',
 DAB_A_PLEXI:'665d9630dad25e0d4410d7d21631745f24f3b8856c5f0d90d9c778a87734cd26',DAB_B_DIRTY:'8de0802cfbf7b912f4a1c57a629b295574de6cc2a840f1da6999a8807b69d1eb'};
const NAME={BASELINE_V13:'LIVE KOOSLUS V1.3',DAB_A_PLEXI:'DUST BONE A PLEXI',DAB_B_DIRTY:'DUST BONE B DIRTY'};
export const SONG_SCENES=['INTRO RIFF','VERSE','CHORUS','SOLO','BREAKDOWN','BUILD','OUTRO','FILLS'];
const EXPECT={BASELINE_V13:'Võrdlusalus: 13.11 heaks kiidetud V1.3 tasakaal (sama riff kõigis kolmes).',
 DAB_A_PLEXI:'Plexi crunch (intro/salm), JCM800 refrään, JVM OD1 + T808 soolo, Deluxe Verb breakdown; tumedam ülaots (Cab High Cut 6 kHz); Stratocaster single coil.',
 DAB_B_DIRTY:'Paksem ja tumedam: JM45 crunch, Dirty Shirley refrään, Friedman BE + T808 soolo, V30 kõlarid; Stratocaster single coil.'};
function generate(dir,id){
 const BASE=path.join(E,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
 const spec=JSON.parse(fs.readFileSync(path.join(SPECS,id+'.input.json')));
 assert.equal(spec.composer.name,NAME[id]);assert.deepEqual(spec.composer.scenes.map(s=>s.name),SONG_SCENES);
 const stem=path.join(dir,id);writePresetOutputs(stem,createPreset(fs.readFileSync(BASE),spec),spec);
 fs.writeFileSync(stem+'.review.json',JSON.stringify(reviewPreset(stem),null,2)+'\n');
}
export function build(out){
 assert.equal(process.versions.node.split('.')[0],'22','Use Node 22');
 fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Use an empty output directory');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-dab-')),packs=[];
 try{
  const cand=buildCandidates(path.join(tmp,'c'));
  assert.ok(cand.candidates.some(c=>c.id==='BASELINE_V13'));
  for(const id of ['DAB_A_PLEXI','DAB_B_DIRTY'])generate(path.join(tmp,'c'),id);
  for(const id of CASES){
   const d=path.join(out,id);fs.mkdirSync(d);
   for(const ext of ['.syx','.txt','.spec.json','.validation.json','.review.json'])
    fs.copyFileSync(path.join(tmp,'c',id+ext),path.join(d,id+ext));
   const stem=path.join(d,id);verifyPresetOutputs(stem);const syx=fs.readFileSync(stem+'.syx');
   assert.equal(sha(syx),PINNED[id],id+' preset file changed');
   const st=inspectStructure(syx),body=Buffer.from(st.raw.body),{records}=scanRecords(body);
   assert.deepEqual([...st.parsed.headerPayload],[127,0,0,64,0],'edit-buffer header');
   assert.equal(String(st.decoded.preset_name).trim(),NAME[id]);
   const review=JSON.parse(fs.readFileSync(stem+'.review.json')),scenes=review.decoded.scenes.map(s=>s.name);
   assert.equal(scenes.length,8);if(id!=='BASELINE_V13')assert.deepEqual(scenes,SONG_SCENES);
   assert.deepEqual(review.risks??[],[],id+' review risks');
   const cpu=review.cpuEstimate.scenes.map(s=>s.estimatedPercent);
   const blocks=records.filter(x=>x.family!=='send').map(x=>({family:x.family,effectId:x.eid,words:x.words,channels:x.channels,
    request:Buffer.from(bulkReadPoll(x.eid)).toString('hex'),
    expected:Array.from({length:x.words*x.channels},(_,i)=>body.readUInt16LE(x.start+2*i)),writes:[]}));
   const preset={file:'../'+id+'.syx',sha256:PINNED[id]};
   const checks=[{id:'scenes',text:'Kas kõik 8 stseeni kõlasid nagu enne STORE-i (sama heli, sama valjus, Out 1 ei klipi)? jah/ei; kirjelda erinevust.'},
    {id:'transitions',text:'Mängi loo kaasa ja vaheta stseene loo järjekorras (1→2→3→2→3→5→6→4→3→7). Kas vahetus on ilma augu/plõksuta ja sabad käituvad ootuspäraselt?'},
    {id:'switches',text:'Vali stseene M-Wave lülitiga. Kas tuleb õige stseen? (Ampero: ainult B lühike vajutus.)'},
    {id:'accepted',text:'Kas see fail sobib Dust and Bone esinemiseks? jah/ei ja põhjus.'}];
   for(const dir of ['shot','store'])fs.mkdirSync(path.join(d,dir));
   const shot={kind:'fm3-shot-check',version:1,test:'DAB-'+id,items:[{id,name:NAME[id],...preset,blocks}],
    scope:'Effect-block parameter words only. Controllers, modifiers, grid, scenes, Send and system tail require the DAB-STORE comparison.'};
   const bind={kind:'fm3-bind-store',version:1,test:'DAB-STORE-'+id,confirmName:NAME[id],preset,checks,expect:EXPECT[id],
    storeLocationPolicy:'User chooses a backed-up/expendable slot (424-427). No automatic STORE, preset/scene selection, SET or global writes.'};
   for(const [dir,value] of [['shot',shot],['store',bind]])fs.writeFileSync(path.join(d,dir,'manifest.json'),JSON.stringify(value,null,2)+'\n');
   packs.push({id,name:NAME[id],stem:id+'/'+id,presetSha256:PINNED[id],expected:EXPECT[id],scenes,
    cpuEstimate:{model:review.cpuEstimate.model,scenes:cpu},blockRecords:records.length,
    shotManifestSha256:sha(fs.readFileSync(path.join(d,'shot/manifest.json'))),
    storeManifestSha256:sha(fs.readFileSync(path.join(d,'store/manifest.json'))),fourFilesVerified:true,hardwareTested:false});
  }
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 for(const f of ['FM3_CPU_SWEEP.py','FM3_READ_PROBE.py','FM3_BIND_STORE.py','FM3_SHOT_LOAD.py'])
  fs.copyFileSync(path.join(E,'scripts/cpu-sweep-collector',f),path.join(out,f));
 fs.copyFileSync(path.join(ROOT,'tools/fm3/l1-loudness.py'),path.join(out,'FM3_L1_LOUDNESS.py'));
 fs.copyFileSync(path.join(ROOT,'tools/fm3/dab-sound-run.py'),path.join(out,'ALUSTA.py'));
 fs.writeFileSync(path.join(out,'ALUSTA.command'),'#!/bin/bash\nset -euo pipefail\ncd -- "$(dirname -- "$0")"\nexec python3 -B ALUSTA.py "$@"\n',{mode:0o755});
 fs.copyFileSync(path.join(ROOT,'docs/fm3/FM3_DAB_SOUND_GUIDE.txt'),path.join(out,'LOE_MIND.txt'));
 const files=[];function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const p=path.join(d,f.name);if(f.isDirectory())walk(p);else files.push({path:path.relative(out,p),sha256:sha(fs.readFileSync(p))});}}walk(out);
 const version=JSON.parse(fs.readFileSync(path.join(ROOT,'plugins/fm3-sound-architect-2/plugin.json'))).version;
 fs.writeFileSync(path.join(out,'pack.json'),JSON.stringify({kind:KIND,schemaVersion:1,version,date:'2026-11-17',packs,files,
  deviceIO:false,newHardwareMeasurements:false,song:{title:'Dust and Bone - AI Blues Rock Anthem',key:'G minor',tempoBpm:92,analysis:'docs/fm3/sounds/dust-and-bone/ANALYSIS.md'},
  audio:{channels:{wet:'USB 1-2',dry:'USB 3-4'},routing:'FM3 default USB routing; no Input 1 Source / global change'},
  allowedStoredDifferences:['selected-scene byte 0','whole-record ordering','SysEx destination header'],
  evidenceBoundary:'Load each preset, read blocks back, record per-scene audio and poll the read-only CPU meter. DAB-STORE reads back only the file the user chose and stored. Sound choice stays the user\'s judgement.'},null,2)+'\n');
 execFileSync('python3',['-B',path.join(out,'ALUSTA.py'),'--preflight'],{stdio:'pipe'});
 return {passed:true,presets:packs.length,verifiedFiles:4*packs.length,preflight:true,deviceIO:false,
  sha256:Object.fromEntries(packs.map(p=>[p.id,p.presetSha256]))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'Usage: dab-sound-build.mjs EMPTY_OUT_DIR');console.log(JSON.stringify(build(path.resolve(process.argv[2]))));
}

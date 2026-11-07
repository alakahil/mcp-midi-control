// Receipt for the 2026-11-07 T34 test: Controllers channel in scenes 5..8 (STORE), Scene Controller 1 / Sequencer /
// ADSR 1 as Volume modifier sources, the final LIVE KOOSLUS V1 listen and the T20 CAB_A (Preamp Type NONE) pack.
// Offline. The packs are rebuilt (tools/fm3/t34-controllers-sources-build.mjs) and every manifest must match the
// SHA-256 the collector recorded. Parts B..F were edit-buffer loads (7F 00) with answers only; part A was STOREd by
// the user and read back with FM3_BIND_STORE.py --verify (fn=0x03, read only). Scripts never stored or set.
// Usage: node tools/fm3/t34-controllers-sources-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-07/');
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const {readModifiers}=await import(path.join(ENG,'scripts/fm3-parameter-dependencies.mjs'));
const {readControllersScenes}=await import(path.join(ENG,'scripts/fm3-controllers.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t34-'));
const packs={};
try{
  execFileSync('node',[path.join(ROOT,'tools/fm3/t34-controllers-sources-build.mjs'),tmp],{stdio:'ignore'});
  for(const [part,dir] of [['a','FM3_T34A_SCENES'],['b','FM3_T34B_SCENECTRL'],['c','FM3_T34C_SEQ'],['d','FM3_T34D_ADSR'],['e','FM3_T34E_LIVE'],['f','FM3_T34F_CABNONE']]){
    const mb=fs.readFileSync(path.join(tmp,dir,'manifest.json')),m=JSON.parse(mb),syx=fs.readFileSync(path.join(tmp,dir,m.preset.file));
    assert.equal(sha(syx),m.preset.sha256,dir+' preset');packs[part]={dir,m,mb,syx};
  }
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

const files={},parts={};
for(const [part,p] of Object.entries(packs)){
  const loadFile=path.join(RAW,`fm3-t34${part}-20261107-load.json`),resFile=path.join(RAW,`fm3-t34${part}-20261107-results.json`);
  const ld=J(loadFile),res=J(resFile);
  assert.equal(ld.kind,'fm3-bind-store-load');assert.equal(ld.packSha256,sha(p.mb),p.dir+' pack rebuilt identically');assert.equal(ld.userConfirmedName,true);
  assert.equal(res.packSha256,sha(p.mb),p.dir+' results pack');
  assert.equal(res.kind,part==='a'?'fm3-bind-store-results':'fm3-bind-check-results');
  files[part]={load:rel(loadFile),results:rel(resFile),packSha256:sha(p.mb),preset:{name:p.m.confirmName,sha256:p.m.preset.sha256}};
  parts[part]={p,res};
}
const body=syx=>Buffer.from(inspectStructure(syx).raw.body);
const volume=b=>readModifiers(b).filter(m=>m.active&&m.effectId===102&&m.pid===0);

// ---- A: scenes 5..8 on Controllers channels D,C,B,D; STOREd and read back ----
const A=parts.a,ra=A.res;
const EXPECT_A={tremolo:'S5 kõige kiirem; S6 poole aeglasem; S7 veel aeglasem; S8 sama kiirus, mis S5 umbes',channel:'5-D 6-C 7-B 8-D',source:'LFO 1A'};
assert.deepEqual(ra.beforeStore,EXPECT_A,'T34A readings before STORE');assert.deepEqual(ra.afterReload,EXPECT_A,'T34A readings after reload');
assert.equal(ra.shownLocation,427);assert.equal(ra.index,426);assert.deepEqual(ra.frameKinds,[0x77,...Array(8).fill(0x78),0x79]);
const dev=Buffer.concat(ra.storedDumpFrames.map(h=>Buffer.from(h,'hex')));
const gen=body(A.p.syx),stored=body(dev);
assert.equal(String(inspectStructure(dev).decoded.preset_name).trim(),A.p.m.confirmName);
assert.ok(gen.equals(stored),'T34A stored body byte-identical to the generated one');
assert.deepEqual(readControllersScenes(stored),['A','B','C','D','D','C','B','D']);
[0,1,2,3,3,2,1,3].forEach((v,i)=>assert.equal(stored.readUInt16LE(462+2*i),v,'scene word '+(i+1)));
assert.deepEqual(volume(stored).map(m=>[m.record,m.source,m.sourceName]),[[0,1,'LFO 1A']]);

// ---- B, C, D: Controllers sources -> Volume (edit buffer) ----
const EXPECT_SRC={
  b:{readings:{level:'kasvab ühtlaselt',source:'Scene Controller 1'},code:30,audible:'level rose evenly from scene 1 to scene 4 (Scene Controller 1 values 10/40/70/100 %)'},
  c:{readings:{chop:'tükeldab, umbes 2 korda sekundis',source:'Sequencer'},code:7,audible:'volume chopped on/off about twice a second (Sequencer 4 stages 0/100/0/100 %, Rate 4 Hz: one stage per 1/4 s, so one on/off cycle per 1/2 s)'},
  d:{readings:{swell:'paisub iga noodiga',source:'ADSR 1'},code:5,audible:'every picked note swelled in (ADSR 1 Once, Retrigger On, Attack 800 ms, Threshold -40 dB)'}};
const sources={};
for(const [part,e] of Object.entries(EXPECT_SRC)){
  const {p,res}=parts[part];assert.deepEqual(res.readings,e.readings,p.dir+' readings');assert.equal(res.note,'');
  const v=volume(body(p.syx));assert.deepEqual(v.map(m=>[m.record,m.source,m.sourceName]),[[0,e.code,e.readings.source]],p.dir+' Volume binding');
  sources[e.readings.source]={test:'T34'+part.toUpperCase(),code:e.code,record:0,shownInFm3Edit:e.readings.source,audible:e.audible,stored:false};
}

// ---- E: LIVE KOOSLUS V1 listen ----
const E=parts.e.res;
assert.deepEqual(E.readings,{leadLevel:'Umbes sama vali, dB ei oska öelda punasesse ei läinud',overall:'kõik tundub ok'});

// ---- F: T20 CAB_A, Cab B with Preamp Type NONE ----
const F=parts.f.res,cuts='Mode: DynaCab - Cabs - Cab 1: LowCut 33.0 Hz, HighCut 12499 Hz; Cab 2: LowCut 20.0 Hz, HighCut 20000 Hz; Mode: DynaCab - Preamp: LowCut 87.0 Hz, HighCut 7300 Hz';
assert.deepEqual(F.readings,{cuts,preamp:'',type:cuts.replace('Mode: DynaCab - Cabs','Mode: Legacy - Cabs')+'Scene 2, Chan B, DYNA-CAB'});
const fx=parts.f.p.m.expected,shown={CABINET_LOCUT:[87,'87.0 Hz','Preamp'],CABINET_HICUT:[7300,'7300 Hz','Preamp'],CABINET_LOCUT1:[33,'33.0 Hz','Cabs (Cab 1)'],CABINET_HICUT1:[12499,'12499 Hz','Cabs (Cab 1)']};
assert.deepEqual(fx.map(x=>x.param).sort(),Object.keys(shown).sort());
const cabControls=fx.map(x=>{const [v,s,page]=shown[x.param];assert.ok(Math.abs(x.codecDisplay-v)<1,x.param);
  return {param:x.param,requested:x.requested,raw:x.raw,codecDisplay:Number(x.codecDisplay.toFixed(6)),shown:s,page,withinOneDisplayStep:true};});

const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-11-07',test:'T34',auditItems:['O3/H2 follow-up','H1','H7'],
 method:'Jan in Terminal, six parts from tools/fm3/t34-controllers-sources-build.mjs. Every part: FM3_BIND_STORE.py --load sent the preset to the edit buffer (7F 00), he listened/read, answered. Part A: he STOREd on the FM3, selected another preset, came back, answered again; --verify read that location with the read-only stored dump (fn=0x03). Scripts never stored or set.',
 builder:'tools/fm3/t34-controllers-sources-build.mjs',files,
 storeLocation:{planned:426,reported:427,index:426,note:'The instructions said 426; the user typed 427 as the stored location and the stored dump read from 427 (index 426) holds T34A CTRL SCENES byte-identically. The user confirmed (2026-11-07): he stored to 427, it was empty before, nothing to restore.'},
 findings:{
  scenes5to8:{rule:'Controllers header word 5+(scene-1) (body 462+2*(scene-1)) is the Controllers channel for scenes 5..8 too (T33 measured 1..4).',
   written:['A','B','C','D','D','C','B','D'],shown:EXPECT_A.channel,audible:EXPECT_A.tremolo,storedAndReloaded:true,bodyByteIdentical:true,bodyBytes:stored.length},
  sources:{rule:'Modifier record word 0 = FM3-Edit MOD_CTRLID index; device-confirmed now: External 1 = 14, LFO 1A = 1, ADSR 1 = 5, Sequencer = 7, Scene Controller 1 = 30. Same 25-word template.',confirmed:sources},
  liveKooslusV1:{preset:files.e.preset,leadLevel:E.readings.leadLevel,overall:E.readings.overall,as:'Lead scenes about as loud as the others after Amp C -8 dB; no clipping; the user found nothing to change'},
  cabPreampNone:{preset:files.f.preset,channel:'B',mode:'DynaCab (screen header "Scene 2, Chan B, DYNA-CAB")',controls:cabControls,
   as:'With Preamp Type NONE the block-level Low/High Cut (pid 38/39) are still shown on the Preamp page with the written values; Cab 1 cuts on the Cabs page; Cab 2 shows its unwritten base values 20.0 Hz / 20000 Hz.',
   answerInterpretations:[{field:'type',as:'Cab B mode DynaCab','reason':'the answer repeats the cut list (first page label "Legacy") and ends with the screen header "Scene 2, Chan B, DYNA-CAB"'},
    {field:'preamp',as:'not answered','reason':'empty answer; Preamp Type NONE is the pack value, not read back'}]}},
 notMeasured:['Scene Controllers 2..4, LFO 1B/2A/2B, ADSR 2, Envelope/Pitch Follower, Manual 1..5 as sources','STORE/reload of the B/C/D source presets','Sequencer Rate unit (per stage) beyond the one 4 Hz reading','Preamp Type value read back on the device (NONE)']};
const target=path.join(ENG,'references','fm3-t34-controllers-sources-20261107.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T34 receipt stale');
console.log(JSON.stringify({scenes:out.findings.scenes5to8.written,sources:Object.keys(sources),identical:true}));

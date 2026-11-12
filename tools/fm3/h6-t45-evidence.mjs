// Replay the 2026-11-12 H6/T45/T46 hardware results; no device or MIDI access.
// H6 = LIVE KOOSLUS V1.2, T45 = generator-written per-preset switches, T46A-C = Effect-index display map.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from './h6-t45-build.mjs';
import {compareH6Session} from './h6-t45-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const D=path.join(E,'references/h6-t45-20261112');
const {PP_EFFECTS}=await import(path.join(E,'scripts/fm3-cs-preset.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const display=JSON.parse(fs.readFileSync(path.join(D,'display-confirmation.json')));
// An index maps to a block only when its name differs from the previous index (a repeat = no FM3 block at that index).
export function mapIndices(names){
 const out=[];names.forEach((n,i)=>{if(n&&(i===0||n!==names[i-1]))out.push({index:i,name:n});});return out;
}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-h6-t45-'));
try {
 build(path.join(tmp,'pack'));
 const rs=compareH6Session(path.join(tmp,'pack'),D);
 assert.deepEqual(rs.map(r=>[r.case,r.completed]),[['H6',true],['T45',true],['T46A',true],['T46B',true],['T46C',true],['T46D',false]]);
 const done=rs.filter(r=>r.completed);
 for(const r of done)assert.ok(r.dataPassed&&!r.syntheticFixture,r.case);
 const [h6,t45]=rs;
 assert.ok(h6.reordered&&!h6.bodyByteIdentical,'H6: FM3 reorders records on STORE (known since T38)');
 assert.ok(t45.bodyByteIdentical&&!t45.reordered,'T45 stored body is byte-identical');
 assert.ok(rs.slice(2,5).every(r=>r.loadOnly&&r.nameConfirmed));
 for(const c of ['H6','T45','T46'])for(const [f,h] of Object.entries(display[c].screenshots))assert.equal(sha(fs.readFileSync(path.join(D,f))),h,f);
 assert.deepEqual(display.H6.ampLevelDb,{A:-10.2,B:-9,C:-5});
 // T46: the plugin's PP_EFFECTS must be exactly the unambiguous map entries it uses.
 const names=display.T46.indexNames;assert.equal(names.length,72);
 const map=mapIndices(names),byName=Object.fromEntries(map.map(m=>[m.name,m.index]));
 assert.deepEqual([byName['Delay 1'],byName['Drive 1'],byName['Reverb 1']],[7,9,51],'T44 indices');
 assert.equal(names.slice(63).filter(Boolean).length,0,'indices 63..71 empty');
 for(const [k,v] of Object.entries(PP_EFFECTS)){
  assert.equal(byName[v.label],v.index,k);assert.ok(v.index>0&&v.index!==23&&v.index!==24,k+' ambiguous index');
  // T45 confirmed Drive 1 / Delay 1 on the switch; later tests (T47) may promote others from display-mapped.
  assert.ok(['drive1','delay1'].includes(k)?v.status==='switch-confirmed':['display-mapped','store-confirmed','switch-confirmed'].includes(v.status),k);
 }
 const sources={};
 function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else sources[path.relative(D,p)]=sha(fs.readFileSync(p));}}
 walk(D);
 const report={schemaVersion:1,date:'2026-11-12',generatedPresetVersion:'0.3.66',
  scope:'H6 (LIVE KOOSLUS V1.2), T45 (generator-written per-preset switches) and T46A-C (Effect-index display sweep, load only) from tools/fm3/h6-t45-build.mjs. Actual user LOAD/GET and STORE/reload captures at location 427, user answers and FM3-Edit display; this replay performs no device I/O.',
  cases:rs.map(r=>({case:r.case,completed:r.completed,dataPassed:r.dataPassed,loadOnly:r.loadOnly===true,storedBodyByteIdentical:r.bodyByteIdentical??null,
   reordered:r.reordered??null,resultSha256:r.resultSha256??null,observations:r.observations??null})),
  display,
  effectIndexMap:map,
  pluginEffects:Object.fromEntries(Object.entries(PP_EFFECTS).map(([k,v])=>[k,{index:v.index,label:v.label,status:v.status}])),
  findings:{
   h6:'Amp C (lead) -5 dB, A/D -10.16, B -9 survive STORE. User: leads slightly louder, others even. CPU S1 71.2, S2 55.3, S3 55.9, S4 71.8 % (FM3-Edit).',
   t45:'Generator-written Effect Bypass Drive 1 / Delay 1 / Reverb 1 and Scene Select 3 import, display correctly in FM3-Edit, store byte-identically and switch on FM3 footswitches 1-3 (Drive 1, Delay 1, Scene 3) before and after STORE; Reverb 1 on switch 4 is display/STORE-confirmed only.',
   t46:'The Effect parameter is an index into FM3-Edit\'s alphabetical block list with gaps (a gap repeats the previous name); 0..62 cover Amp 1 .. Wah 2, 63..71 are empty.'},
  sources,
  limitations:['Sound is a user listening judgement.','T46 names were typed by the user from FM3-Edit; only the T46A cards/list were screenshotted.','Index 0 (Amp 1) equals the field default; 23 and 24 both read Formant 1; both stay unmapped.','Footswitch behavior is confirmed only for Drive 1, Delay 1 and Scene 3 ; Reverb 1 is display- and STORE-confirmed only; other mapped blocks are display-only.','Second block instances: index known for some, effect ID not measured; only Resonator 2 (163) is mapped.','T46D (72..92) not run; 63..71 already empty.'],
  deviceIO:false,newHardwareMeasurements:false};
 const out=path.join(E,'references/fm3-h6-t45-20261112.json'),text=JSON.stringify(report,null,2)+'\n';
 assert.ok(process.argv.slice(2).every(a=>a==='--write'));
 if(process.argv.includes('--write'))fs.writeFileSync(out,text);else assert.equal(fs.readFileSync(out,'utf8'),text,'H6/T45 evidence is stale');
 console.log(JSON.stringify({passed:true,acceptedHardwareCases:2,loadOnlyCases:3,mappedIndices:map.length,pluginEffects:Object.keys(PP_EFFECTS).length,deviceIO:false}));
} finally {fs.rmSync(tmp,{recursive:true,force:true});}

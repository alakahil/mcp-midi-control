// Receipt for the 2026-10-29 CS Per Scene / per-preset switch word check (FM3_MOD_STEPS.py, test T14b). Offline.
// The pack is rebuilt (tools/fm3/cs-steps-build.mjs OUT B) to the manifest the device run used. One front-panel change
// per stored step (FC PER-PRESET: CS Per Scene, Per-Preset FC, Overrides), STORE to the user's test location, then a
// read-only fn=0x03 read; observation steps record scene changes and a held Momentary switch. No global setting.
// Usage: node tools/fm3/cs-steps-b-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-10-29/');
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const {readModifiers}=await import(path.join(ENG,'scripts/fm3-parameter-dependencies.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=path.join(RAW,'fm3-cs-steps-b-20261029-results.json'),res=JSON.parse(fs.readFileSync(file,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t14b-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/cs-steps-build.mjs'),tmp,'B'],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'manifest.json')),m=JSON.parse(mb),ref=fs.readFileSync(path.join(tmp,m.preset.file));
assert.equal(sha(mb),res.packSha256,'pack rebuilt identically');assert.equal(m.test,'T14b');assert.ok(res.userConfirmedName);assert.equal(res.index,res.shownLocation-1,'Display Offset 1');
assert.deepEqual(res.steps.map(s=>s.id),m.steps.map(s=>s.id),'every step done, none skipped');
const step=id=>res.steps.find(s=>s.id===id);
const bodyOf=id=>{const s=inspectStructure(Buffer.concat(step(id).storedDumpFrames.map(h=>Buffer.from(h,'hex'))));assert.ok(s.raw.crcValid,'CRC '+id);assert.equal(s.decoded.preset_name,m.confirmName);return Buffer.from(s.raw.body);};
const gen=Buffer.from(inspectStructure(ref).raw.body),L=gen.length;
const diff=(a,b)=>{assert.equal(a.length,b.length);const d=[];for(let o=0;o<a.length;o+=2)if(a.readUInt16LE(o)!==b.readUInt16LE(o))d.push([o,a.readUInt16LE(o),b.readUInt16LE(o)]);return d;};
// Tail-relative layout (bytes before the end of the body): definitions 3052, overrides 3052-1920, CS Per Scene 482.
const DEF=L-3052,OV=DEF+1920,CSPS=L-482,cs=(n,scene)=>CSPS+16*(n-1)+2*(scene-1);
const seq=['base','cs2scene1','cs2scene2','cs3scene1','ppDefine','ppNumber','ppMomentary','ppOverride'];
const want={base:[],cs2scene1:[[cs(2,1),1,0]],cs2scene2:[[cs(2,2),1,2]],cs3scene1:[[cs(3,1),1,0]],
  ppDefine:[[DEF,0,7],[DEF+48,0,1],[DEF+144,0,1]],ppNumber:[[DEF+144,1,2]],ppMomentary:[[DEF+48,1,0]],ppOverride:[[OV,65535,0]]};
let prev=gen;for(const id of seq){const b=bodyOf(id);assert.deepEqual(diff(prev,b),want[id],id+': only the expected word changes');prev=b;}
assert.equal(readModifiers(prev).filter(x=>x.active).length,4,'bindings kept');
for(let n=1;n<=6;n++)for(let s=1;s<=8;s++)assert.equal(gen.readUInt16LE(cs(n,s)),1,'generated base: every CS Per Scene state OFF (1)');
assert.equal(step('cs2scene1').shown,'ON');assert.equal(step('cs2scene2').shown,'LAST');assert.equal(step('cs3scene1').shown,'ON');
assert.match(step('csLook').shown,/Kõik CS väärtused hetkel OFF/);
assert.equal(step('scene1').shown,'Scene 2:OFF  / ON / OFF; Scene 1: ON  / OFF / OFF');assert.equal(step('scene2').shown,'ON / ON /OFF');
assert.equal(step('hold').shown,'ON/OFF/OFF. vajutades; ON/ON/OFF vabastades');
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-29',test:'T14b',
  preset:{name:m.confirmName,sha256:m.preset.sha256,bindings:m.bindings,scenes:m.scenes},
  method:'Edit-buffer load (7F 00) once; one FC PER-PRESET change per stored step, STORE by the user to his test location, read with fn=0x03 (read-only) after each STORE; observation steps without STORE. No global setting changed.',
  storedLocation:{shown:res.shownLocation,index:res.index},
  steps:res.steps.map(s=>({id:s.id,shown:s.shown,...(s.observationOnly?{observationOnly:true}:{}),...(want[s.id]?{words:want[s.id].map(([o,before,after])=>({fromEnd:L-o,before,after}))}:{})})),
  decoded:{
    csPerScene:{position:'482 bytes before the end of the body; 6 Control Switches x 8 scenes, one word each; CS n scene s at -482 + 16(n-1) + 2(s-1)',codes:{ON:0,OFF:1,LAST:2},
      generatedDefault:'all 48 OFF (1)',page:'FC PER-PRESET -> CS Per Scene (columns Scene 1-8, rows CS1-CS6)'},
    perPresetDefinition:{position:'3052 bytes before the end; 24 definitions as 8 arrays of 24 words (array k at +48k)',
      words:{array0:'Tap category (7 = Control Switch)',array1:'Tap function within the category (Control Switch: 1 = Latching, 0 = Momentary)',array3:'Tap parameter: Control Switch number - 1 (1 = CS 2, 2 = CS 3)'},
      holdUnassigned:'arrays 2 and 4-7 stay 0'},
    overrides:{position:'1920 bytes after the definitions; one word per footswitch, 65535 = none, n = definition n+1; Layout 1 switch 1 = first word'}},
  behaviour:['CS Per Scene applies when a scene is selected: Scene 1 (CS 2 ON, CS 3 ON) shows Input Boost ON, Bright OFF (inverted record at Max); Scene 2 (CS 2 LAST) keeps CS 2 ON from Scene 1 and CS 3 OFF, showing ON / ON / OFF.',
    'Control Switch: Momentary on CS 3 drives CS 3 while the switch is held and sets it OFF on release, replacing the scene state: held ON / OFF / OFF, released ON / ON / OFF.',
    'With T14 (Latching toggles, LED follows) both per-preset Control Switch functions behave as written, without any global setting.'],
  notMeasured:['Hold functions on per-preset definitions','Layouts other than 1 and override words beyond the first','audio'],
  resultsSha256:sha(fs.readFileSync(file))};
const target=path.join(ENG,'references/fm3-cs-steps-b-20261029.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'cs steps b receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});console.log(JSON.stringify({steps:res.steps.length,storedSteps:seq.length,csPerSceneCodes:out.decoded.csPerScene.codes}));

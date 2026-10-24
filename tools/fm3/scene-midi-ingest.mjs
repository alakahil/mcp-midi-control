// Receipts for the 2026-10-24 Scene MIDI decode (test 6b) and its PC follow-up. Offline.
// Usage: node tools/fm3/scene-midi-ingest.mjs [--write]
// Layout: the pack is rebuilt to the manifest the device used, every step changed exactly one word of
// block 190, and the generator's encoder (fm3-scene-midi.mjs) reproduces every observed change and the
// final 257 words exactly. PC follow-up: on a generated PC command the front panel shows Number "--",
// refuses Number edits, and its Value field is word 192 + k; the encoder reproduces those steps.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const {applySceneMidi,describeSceneMidi}=await import(path.join(ENG,'scripts/fm3-scene-midi.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=path.join(ENG,'references/fm3-scene-midi-20261024-results.json'),res=JSON.parse(fs.readFileSync(file,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-sm-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/scene-midi-check-build.mjs'),tmp],{stdio:'ignore'});
assert.equal(sha(fs.readFileSync(path.join(tmp,'manifest.json'))),res.packSha256,'Scene MIDI pack rebuilt identically');
assert.ok(res.baseline.words.length===257&&res.baseline.words.every(v=>v===0),'baseline: all 257 words zero');
// What the user did at each step (their own notes, chat 2026-10-24), as the encoder's spec. Each step's
// commands are applied in order to the words left by the previous step. The user did steps 1-7 on scene 2.
// Step 3 changed the number word while the type showed PC; the front panel refuses Number for PC (PC
// follow-up, step 2), so it is modelled as a CC detour back to PC: net effect the one observed word.
const STATE=[
  [{scene:2,command:1,type:'PC',channel:1,program:0}],
  [{scene:2,command:1,type:'PC',channel:2,program:0}],
  [{scene:2,command:1,type:'CC',channel:2,number:5,value:0},{scene:2,command:1,type:'PC',channel:2,program:0}],
  [{scene:2,command:1,type:'CC',channel:2,number:5,value:0}],
  [{scene:2,command:1,type:'CC',channel:2,number:20,value:0}],
  [{scene:2,command:1,type:'CC',channel:2,number:20,value:64}],
  [{scene:2,command:1,type:'PC',channel:2,program:64}],
  [{scene:2,command:2,type:'PC',channel:1,program:0}],
  [{scene:8,command:1,type:'PC',channel:1,program:0}],
  [{scene:8,command:7,type:'CC',channel:1,number:0,value:0}],
  [{scene:1,command:1,type:'PC',channel:1,program:0}],
];
const REC={eid:190,words:257,channels:1,start:0};
const toBody=w=>{const b=Buffer.alloc(514);w.forEach((v,k)=>b.writeUInt16LE(v,2*k));return b};
const fromBody=b=>Array.from({length:257},(_,k)=>b.readUInt16LE(2*k));
const changes=(a,b)=>b.map((v,k)=>[k,a[k],v]).filter(([,x,y])=>x!==y).map(([word,before,after])=>({word,before,after}));
// Apply spec commands one by one to words; return the new words.
const play=(w,cmds)=>{const b=toBody(w);for(const c of cmds)applySceneMidi(b,REC,[c]);return fromBody(b)};
assert.equal(res.steps.length,STATE.length);
let words=new Array(257).fill(0);
const steps=res.steps.map((s,i)=>{
  assert.ok(s.changed.length===1,'step '+(i+1)+' changed exactly one word');
  const next=play(words,STATE[i]);
  assert.deepEqual(changes(words,next),s.changed,'encoder reproduces step '+(i+1));
  assert.deepEqual(next,s.words,'device words after step '+(i+1));words=next;
  return {step:i+1,userNote:s.userNote,changed:s.changed[0]};});
// PC follow-up: generated preset SCENE MIDI GEN 2 (S1C1 PC channel 3), front-panel steps on S1C1.
const pcFile=path.join(ENG,'references/fm3-scene-midi-pc-20261024-results.json'),pcRes=JSON.parse(fs.readFileSync(pcFile,'utf8'));
const pcPack=fs.readFileSync(path.join(ENG,'references/fm3-scene-midi-pc-20261024-pack.json'));
assert.equal(sha(pcPack),pcRes.packSha256,'PC follow-up pack manifest pinned');
assert.equal(JSON.parse(pcPack).confirmName,'SCENE MIDI GEN 2');
let pw=pcRes.baseline.words;assert.equal(pw.length,257);
const s1=w=>describeSceneMidi(toBody(w),REC).find(c=>c.scene===1&&c.command===1);
assert.deepEqual(s1(pw),{scene:1,command:1,type:'PC',channel:3,program:0},'baseline S1C1: PC channel 3, Value 0 (user: "Number --, Value 0")');
assert.equal(pw[128],1,'baseline number word 1 (written by the earlier encoder), not shown for PC');
const PC_STEPS=[
  {model:[],shown:'Number --, Value 0'},
  {model:[],shown:'Number cannot be edited for PC'},
  {model:[{scene:1,command:1,type:'PC',channel:3,program:10}],shown:'Value 10',expect:{type:'PC',channel:3,program:10}},
  {model:[{scene:1,command:1,type:'CC',channel:3,number:1,value:10}],shown:'Number 1, Value 10',expect:{type:'CC',channel:3,number:1,value:10}},
  {model:[{scene:1,command:1,type:'PC',channel:3,program:10}],shown:'Number --, Value 10',expect:{type:'PC',channel:3,program:10}},
];
assert.equal(pcRes.steps.length,PC_STEPS.length);
const pcSteps=pcRes.steps.map((s,i)=>{const m=PC_STEPS[i],next=play(pw,m.model);
  assert.deepEqual(changes(pw,next),s.changed,'encoder reproduces PC step '+(i+1));assert.deepEqual(next,s.words,'device words after PC step '+(i+1));
  if(m.expect)assert.deepEqual(s1(next),{scene:1,command:1,...m.expect},'decode PC step '+(i+1));pw=next;
  return {step:i+1,asked:s.asked,userNote:s.userNote,changed:s.changed};});
const pcOut={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-24',block:{effectId:190,words:257},
  method:'FM3_SCENE_MIDI_CHECK.py on the generated preset SCENE MIDI GEN 2 (edit buffer only); the user changed S1C1 on the front panel one field per step; block 190 read with fn=0x1F after each step.',
  finding:'For type PC the FM3 shows Number "--", refuses edits to Number, and keeps the program in the Value field (word 192 + k). Switching the type to CC shows the kept number word again. A type change touches only the type word.',
  consequence:'The generator writes a PC program to the value word and does not write the number word for PC (fixes the earlier encoder, which put the program in the number word).',
  steps:pcSteps,checks:{encoderReproducesEveryStep:true,decodeMatchesFrontPanel:true},
  notMeasured:['whether the PC sent on a scene change equals the shown value or one less (display offset)','MIDI actually transmitted on scene change'],
  resultsSha256:sha(fs.readFileSync(pcFile))};
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-24',block:{effectId:190,name:'Scene MIDI (FM3 menu "MIDI")',words:257,channels:1},
  method:'FM3_SCENE_MIDI_CHECK.py: the measurement preset (device-default Scene MIDI record) loaded to the edit buffer only; the user changed one field per step on the front panel; block 190 read with the read-only fn=0x1F bulk read after each step.',
  layout:{commandIndex:'(scene-1)*8 + (command-1), 8 scenes x 8 commands',type:{words:'0..63',values:{0:'none',1:'CC',2:'PC'}},channel:{words:'64..127',encoding:'MIDI channel - 1'},
    number:{words:'128..191',encoding:'CC number as shown; unused for PC (shown --)'},value:{words:'192..255',encoding:'CC value or PC program, as shown in the Value field'},word256:'never changed'},
  measuredPoints:{commands:['S1C1','S2C1','S2C2','S8C1','S8C7'],types:['none','CC','PC'],channels:[1,2],numbers:[0,5,20],values:[0,64]},pcFollowUp:'references/fm3-scene-midi-pc-20261024.json',
  steps,checks:{everyStepOneWord:true,encoderReproducesEveryStep:true,finalWordsEqual:true},
  notMeasured:['other message types','range ends (channel 16, number/value 127)','MIDI actually transmitted on scene change'],
  resultsSha256:sha(fs.readFileSync(file))};

for(const [name,obj] of [['fm3-scene-midi-20261024.json',out],['fm3-scene-midi-pc-20261024.json',pcOut]]){
  const target=path.join(ENG,'references',name),content=JSON.stringify(obj,null,1)+'\n';
  if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'Scene MIDI receipt stale: '+name);}
fs.rmSync(tmp,{recursive:true,force:true});
console.log(JSON.stringify({steps:steps.length,pcSteps:pcSteps.length,encoderReproduces:true}));

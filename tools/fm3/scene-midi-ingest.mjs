// Receipt for the 2026-10-24 Scene MIDI decode (test 6b). Offline.
// Usage: node tools/fm3/scene-midi-ingest.mjs [--write]
// Checks the pinned collector results: the pack is rebuilt to the manifest the device used, every
// step changed at most one word of block 190, and the generator's encoder (fm3-scene-midi.mjs)
// reproduces every observed change and the final 257 words exactly.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const {applySceneMidi}=await import(path.join(ENG,'scripts/fm3-scene-midi.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=path.join(ENG,'references/fm3-scene-midi-20261024-results.json'),res=JSON.parse(fs.readFileSync(file,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-sm-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/scene-midi-check-build.mjs'),tmp],{stdio:'ignore'});
assert.equal(sha(fs.readFileSync(path.join(tmp,'manifest.json'))),res.packSha256,'Scene MIDI pack rebuilt identically');
assert.ok(res.baseline.words.length===257&&res.baseline.words.every(v=>v===0),'baseline: all 257 words zero');
// What the user did at each step (their own notes, chat 2026-10-24), as the encoder's spec state.
const STATE=[
  [{scene:2,command:1,type:'PC',channel:1,number:0}],
  [{scene:2,command:1,type:'PC',channel:2,number:0}],
  [{scene:2,command:1,type:'PC',channel:2,number:5}],
  [{scene:2,command:1,type:'CC',channel:2,number:5,value:0}],
  [{scene:2,command:1,type:'CC',channel:2,number:20,value:0}],
  [{scene:2,command:1,type:'CC',channel:2,number:20,value:64}],
  [{scene:2,command:1,type:'PC',channel:2,number:20}],
  [{scene:2,command:2,type:'PC',channel:1,number:0}],
  [{scene:8,command:1,type:'PC',channel:1,number:0}],
  [{scene:8,command:7,type:'CC',channel:1,number:0,value:0}],
  [{scene:1,command:1,type:'PC',channel:1,number:0}],
];
assert.equal(res.steps.length,STATE.length);
// The encoder has no "PC keeps a stale CC value" input, so build the cumulative state by words.
const words=new Array(257).fill(0),rec={eid:190,words:257,channels:1,start:0};
const steps=res.steps.map((s,i)=>{
  assert.ok(s.changed.length===1,'step '+(i+1)+' changed exactly one word');
  const body=Buffer.alloc(514);words.forEach((v,k)=>body.writeUInt16LE(v,2*k));
  const before=[...words];
  for(const c of STATE[i]){const keep=c.type==='PC'?body.readUInt16LE(2*(192+(c.scene-1)*8+(c.command-1))):null;applySceneMidi(body,rec,[c]);
    if(keep!==null)body.writeUInt16LE(keep,2*(192+(c.scene-1)*8+(c.command-1)));}
  for(let k=0;k<257;k++)words[k]=body.readUInt16LE(2*k);
  const predicted=words.map((v,k)=>[k,before[k],v]).filter(([,a,b])=>a!==b).map(([k,a,b])=>({word:k,before:a,after:b}));
  assert.deepEqual(predicted,s.changed,'encoder reproduces step '+(i+1));
  assert.deepEqual(words,s.words,'device words after step '+(i+1));
  return {step:i+1,userNote:s.userNote,changed:s.changed[0]};});
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-24',block:{effectId:190,name:'Scene MIDI (FM3 menu "MIDI")',words:257,channels:1},
  method:'FM3_SCENE_MIDI_CHECK.py: the measurement preset (device-default Scene MIDI record) loaded to the edit buffer only; the user changed one field per step on the front panel; block 190 read with the read-only fn=0x1F bulk read after each step.',
  layout:{commandIndex:'(scene-1)*8 + (command-1), 8 scenes x 8 commands',type:{words:'0..63',values:{0:'none',1:'CC',2:'PC'}},channel:{words:'64..127',encoding:'MIDI channel - 1'},
    number:{words:'128..191',encoding:'as shown (PC program / CC number)'},value:{words:'192..255',encoding:'as shown; kept when the type is changed to PC'},word256:'never changed'},
  measuredPoints:{commands:['S1C1','S2C1','S2C2','S8C1','S8C7'],types:['none','CC','PC'],channels:[1,2],numbers:[0,5,20],values:[0,64]},
  steps,checks:{everyStepOneWord:true,encoderReproducesEveryStep:true,finalWordsEqual:true},
  notMeasured:['other message types','range ends (channel 16, number/value 127)','MIDI actually transmitted on scene change'],
  resultsSha256:sha(fs.readFileSync(file))};
const target=path.join(ENG,'references/fm3-scene-midi-20261024.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'Scene MIDI receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});
console.log(JSON.stringify({steps:steps.length,encoderReproduces:true}));

// Device replay for the Control Switch preset writer (fm3-cs-preset.mjs). Offline. The T14 / T14b packs are
// rebuilt and the same CS Per Scene states and per-preset footswitch the user set on the FM3 front panel are now
// requested from the generator; the generated body must equal the body the FM3 itself stored (fn=0x03 read after
// STORE) word for word.
// Usage: node tools/fm3/test-cs-preset-replay.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-10-29/');
const {createPreset}=await import(path.join(ENG,'scripts/fm3-preset.mjs'));
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const BASE=fs.readFileSync(path.join(ENG,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'));
const stored=(file,id)=>{const r=JSON.parse(fs.readFileSync(path.join(RAW,file),'utf8'));const s=r.steps.find(x=>x.id===id);
  return Buffer.from(inspectStructure(Buffer.concat(s.storedDumpFrames.map(h=>Buffer.from(h,'hex')))).raw.body);};
const packSpec=variant=>{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-csr-'));
  execFileSync('node',[path.join(ROOT,'tools/fm3/cs-steps-build.mjs'),tmp,...(variant?[variant]:[])],{stdio:'ignore'});
  const m=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8'));const b=fs.readFileSync(path.join(tmp,m.preset.file));fs.rmSync(tmp,{recursive:true,force:true});return {m,b};};
// The builder's spec, reproduced here and checked against the pack it builds.
const spec=name=>({composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name,wahChannels:[{channel:'A',type:'FAS Wah'}],modifiers:{external1Wah:true,wahControls:{offValuePercent:95}}},
  layout:{row2:['wah','drive','amp','cab'],row3:['delay','reverb']},selectedScene:1,
  blockScenes:{wah:[{scene:1,channel:'A',bypass:true},{scene:2,channel:'A',bypass:true}],amp:[{scene:1,channel:'A',bypass:false},{scene:2,channel:'D',bypass:false}]},
  controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST'},{switch:3,block:'amp',param:'DISTORT_BRIGHT',invert:true},{switch:4,block:'amp',param:'DISTORT_FAT',channel:'D'}]});
const cases=[
  {variant:'B',name:'CS STEPS T14B',file:'fm3-cs-steps-b-20261029-results.json',
   steps:{cs2scene1:{controlSwitchScenes:[{switch:2,scene:1,state:'ON'}]},
     cs3scene1:{controlSwitchScenes:[{switch:2,scene:1,state:'ON'},{switch:2,scene:2,state:'LAST'},{switch:3,scene:1,state:'ON'}]},
     ppOverride:{controlSwitchScenes:[{switch:2,scene:1,state:'ON'},{switch:2,scene:2,state:'LAST'},{switch:3,scene:1,state:'ON'}],footswitches:[{layout:1,switch:1,function:'momentary',controlSwitch:3}]}}},
  {variant:undefined,name:'CS STEPS T14',file:'fm3-cs-steps-20261029-results.json',
   steps:{ppOverride:{footswitches:[{layout:1,switch:1,function:'latching',controlSwitch:2}]}}}];
let replays=0;
for(const c of cases){const {b}=packSpec(c.variant);
  assert.deepEqual(Buffer.from(inspectStructure(Buffer.from(createPreset(BASE,spec(c.name)).syx)).raw.body),Buffer.from(inspectStructure(b).raw.body),'spec reproduces the '+c.name+' pack');
  for(const [id,extra] of Object.entries(c.steps)){
    const gen=Buffer.from(inspectStructure(Buffer.from(createPreset(BASE,{...spec(c.name),...extra}).syx)).raw.body),dev=stored(c.file,id);
    assert.equal(gen.length,dev.length);
    const diff=[];for(let o=0;o<gen.length;o+=2)if(gen.readUInt16LE(o)!==dev.readUInt16LE(o))diff.push(o);
    assert.deepEqual(diff,[],`${c.name} ${id}: generated body equals the FM3-stored body`);replays++;}}
// T16: generator PP#1 plus the FM3's own PP#2 / PP#3 and overrides on Layout 1 switches 2 and 12.
{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-csr16-'));execFileSync('node',[path.join(ROOT,'tools/fm3/pp-steps-build.mjs'),tmp],{stdio:'ignore'});
 const m=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8')),b=fs.readFileSync(path.join(tmp,m.preset.file));fs.rmSync(tmp,{recursive:true,force:true});
 const s16={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'PP STEPS T16',modifiers:{external1Wah:false}},layout:{row2:['drive','amp','cab'],row3:['delay','reverb']},selectedScene:1,
  controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST'},{switch:3,block:'amp',param:'DISTORT_BRIGHT',invert:true}],footswitches:[{layout:1,switch:1,function:'latching',controlSwitch:2}]};
 assert.deepEqual(Buffer.from(inspectStructure(Buffer.from(createPreset(BASE,s16).syx)).raw.body),Buffer.from(inspectStructure(b).raw.body),'spec reproduces the T16 pack');
 const full={...s16,footswitches:[...s16.footswitches,{layout:1,switch:2,function:'latching',controlSwitch:3},{layout:1,switch:12,function:'momentary',controlSwitch:3}]};
 const gen=Buffer.from(inspectStructure(Buffer.from(createPreset(BASE,full).syx)).raw.body),dev=stored('fm3-pp-steps-20261029-results.json','ov12');
 const diff=[];for(let o=0;o<gen.length;o+=2)if(gen.readUInt16LE(o)!==dev.readUInt16LE(o))diff.push(o);
 assert.deepEqual(diff,[],'T16 ov12: generated body equals the FM3-stored body');replays++;}
console.log(JSON.stringify({passed:true,deviceReplays:replays}));

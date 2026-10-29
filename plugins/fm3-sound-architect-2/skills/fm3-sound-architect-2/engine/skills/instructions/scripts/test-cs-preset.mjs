// Control Switch state per scene and per-preset Control Switch footswitches (fm3-cs-preset.mjs): declared words
// only, final readback, fail-closed input, final-artifact tamper checks and the TXT section. Offline.
// The word-for-word replay against the FM3-stored T14 / T14b bodies is tools/fm3/test-cs-preset-replay.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPreset,writePresetOutputs,verifyPresetOutputs,getPresetCapabilities} from './fm3-preset.mjs';
import {applyCsPreset,readCsPreset,CS_STATES,OVERRIDE_POSITIONS} from './fm3-cs-preset.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const bodyOf=syx=>Buffer.from(inspectStructure(Buffer.from(syx)).raw.body);
const rewrite=(input,mutate)=>{const p=inspectStructure(Buffer.from(input)),b=Buffer.from(p.raw.body);mutate(b);return Buffer.from(reencodeDumpFromRawPatch(Buffer.from(input),reencodeRawPatch(p.raw.rawPatch,b)));};
const composer={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'CS PRESET CHECK',modifiers:{external1Wah:false}};
const switches=[{switch:2,block:'amp',param:'DISTORT_BOOST'},{switch:3,block:'amp',param:'DISTORT_BRIGHT',invert:true}];
const plainSpec={composer,layout:{row2:['drive','amp','cab'],row3:['delay','reverb']},controlSwitches:switches};
const spec={...plainSpec,controlSwitchScenes:[{switch:2,scene:1,state:'OFF'},{switch:2,scene:2,state:'ON'},{switch:3,scene:3,state:'LAST'}],
  footswitches:[{layout:1,switch:1,function:'latching',controlSwitch:2}]};
const plain=createPreset(base,plainSpec),good=createPreset(base,spec),pb=bodyOf(plain.syx),gb=bodyOf(good.syx),L=gb.length;
// Only the declared words differ from the same spec without the two fields (CS 2 scene 1 OFF is the default: no write).
const changed=[];for(let o=0;o<L;o+=2)if(gb.readUInt16LE(o)!==pb.readUInt16LE(o))changed.push([L-o,pb.readUInt16LE(o),gb.readUInt16LE(o)]);
assert.deepEqual(changed,[[3052,0,7],[3052-48,0,1],[3052-144,0,1],[3052-1920,65535,0],[482-16*1-2*1,1,0],[482-16*2-2*2,1,2]].sort((a,b)=>b[0]-a[0]));
assert.deepEqual(good.report.csPreset.controlSwitchScenes,[{switch:2,scene:1,state:'OFF'},{switch:2,scene:2,state:'ON'},{switch:3,scene:3,state:'LAST'}]);
assert.deepEqual(good.report.csPreset.footswitches,[{layout:1,switch:1,definition:1,function:'latching',controlSwitch:2}]);
assert.equal(good.report.stages.csPreset.writes.length,6);
for(const line of ['CONTROL SWITCH STSEENID JA JALGLÜLITID — LÕPPFAILIST','Control Switch 2, Scene 2: ON.','Control Switch 3, Scene 3: LAST (jätab eelmise stseeni oleku).',
  'Layout 1, lüliti 1 → PP#1: Control Switch: Latching (vajutus lülitab sisse/välja), Control Switch 2.'])assert.ok(good.txt.includes(line),line);
assert.ok(!plain.txt.includes('CONTROL SWITCH STSEENID'));
// Momentary on Control Switch 3: function word 0, number word 2.
const mom=createPreset(base,{...plainSpec,footswitches:[{layout:1,switch:1,function:'momentary',controlSwitch:3}]}),mb=bodyOf(mom.syx);
assert.deepEqual([mb.readUInt16LE(L-3052),mb.readUInt16LE(L-3052+48),mb.readUInt16LE(L-3052+144),mb.readUInt16LE(L-3052+1920)],[7,0,2,0]);
// Scenes alone work too.
const sc=createPreset(base,{...plainSpec,controlSwitchScenes:[{switch:3,scene:8,state:'ON'}]});assert.equal(bodyOf(sc.syx).readUInt16LE(L-482+32+14),0);
// Fail-closed input: nothing is generated.
let rejected=0;const bad=edit=>{const s=structuredClone(spec);edit(s);assert.throws(()=>createPreset(base,s),/Control Switch preset|controlSwitchScenes|footswitches|unknown|Unknown/);rejected++;};
bad(s=>s.controlSwitchScenes[0].switch=7);bad(s=>s.controlSwitchScenes[0].switch=0);bad(s=>s.controlSwitchScenes[0].scene=9);bad(s=>s.controlSwitchScenes[0].state='on');
bad(s=>s.controlSwitchScenes[0].switch=5);bad(s=>s.controlSwitchScenes.push({...s.controlSwitchScenes[0]}));bad(s=>s.controlSwitchScenes[0].extra=1);bad(s=>s.controlSwitchScenes=[]);
bad(s=>s.controlSwitchScenes={});bad(s=>s.footswitches[0].function='toggle');
bad(s=>s.footswitches[0].controlSwitch=4);bad(s=>s.footswitches[0].controlSwitch=7);bad(s=>s.footswitches.push({...s.footswitches[0]}));bad(s=>s.footswitches[0].hold='x');
bad(s=>s.footswitches=[]);bad(s=>{delete s.controlSwitches;});bad(s=>s.footswitches[0].switch=13);bad(s=>s.footswitches[0].layout=10);bad(s=>s.footswitches[0].layout=0);
bad(s=>s.footswitches=Array.from({length:25},(_,i)=>({layout:1+Math.floor(i/12),switch:1+i%12,function:'latching',controlSwitch:2})));
// JSON arrays must not be coerced into enum keys. In 0.3.36 ['latching'] wrote
// Latching to SYX but rendered Momentary in TXT, and --verify accepted both.
for(const value of [['ON'],[['ON']],['LAST']])bad(s=>s.controlSwitchScenes[0].state=value);
for(const value of [['latching'],[['latching']],['momentary']])bad(s=>s.footswitches[0].function=value);
assert.equal(Object.keys(OVERRIDE_POSITIONS).length,108);assert.equal(OVERRIDE_POSITIONS['1/1'],0);assert.equal(OVERRIDE_POSITIONS['1/12'],11);assert.equal(OVERRIDE_POSITIONS['9/12'],107);
// Three footswitches: PP#1..PP#3 in list order, parameters 12 bytes apart, count word 3 (T16 layout).
const three=createPreset(base,{...plainSpec,footswitches:[{layout:1,switch:1,function:'latching',controlSwitch:2},{layout:1,switch:2,function:'momentary',controlSwitch:3},{layout:3,switch:5,function:'latching',controlSwitch:3}]}),tb=bodyOf(three.syx),D=L-3052;
assert.deepEqual([0,1,2].map(k=>[tb.readUInt16LE(D+2*k),tb.readUInt16LE(D+48+2*k),tb.readUInt16LE(D+144+12*k)]),[[7,1,1],[7,0,2],[7,1,2]]);
assert.deepEqual([tb.readUInt16LE(D+1920),tb.readUInt16LE(D+1922),tb.readUInt16LE(D+1920+2*28),tb.readUInt16LE(D+1920+216)],[0,1,2,3]);
assert.deepEqual(three.report.csPreset.footswitches.map(f=>[f.layout,f.switch,f.definition]),[[1,1,1],[1,2,2],[3,5,3]]);
// A base whose region is not the FM3 default is refused (no merging with unknown switch content).
for(const [off,v] of [[3052,7],[3052-1920,3],[482,0]]){const tampered=rewrite(plain.syx,b=>b.writeUInt16LE(v,L-off));
  assert.throws(()=>applyCsPreset(tampered,spec),/FM3 defaults/);rejected++;}
assert.throws(()=>applyCsPreset(rewrite(plain.syx,b=>b.writeUInt16LE(0,L-3056)),spec),/marker/);rejected++;
// Final artifact verification and CRC-valid tamper cases.
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-csp-'));let tamper=0,n=0;
const verify=(result,s)=>{const stem=path.join(dir,'v'+(n++));writePresetOutputs(stem,result,s);return verifyPresetOutputs(stem);};
try{
 assert.deepEqual(verify(good,spec).csPreset,good.report.csPreset);verify(plain,plainSpec);
 const fail=(name,change,from=good,s0=spec,re=/Control Switch preset|TXT/)=>{const r={...from,report:structuredClone(from.report)},s=structuredClone(s0);change(r,s);assert.throws(()=>verify(r,s),re,name);tamper++;};
 const syx=(r,mut)=>{r.syx=rewrite(r.syx,mut);r.report.outputSha256=sha(r.syx);};
 fail('scene word',r=>syx(r,b=>b.writeUInt16LE(2,L-482+16*1+2*1)));
 fail('extra scene word',r=>syx(r,b=>b.writeUInt16LE(0,L-482)));
 fail('function word',r=>syx(r,b=>b.writeUInt16LE(0,L-3052+48)));
 fail('number word',r=>syx(r,b=>b.writeUInt16LE(2,L-3052+144)));
 fail('override word',r=>syx(r,b=>b.writeUInt16LE(65535,L-3052+1920)));
 fail('second override',r=>syx(r,b=>b.writeUInt16LE(0,L-3052+1922)));
 fail('count word',r=>syx(r,b=>b.writeUInt16LE(2,L-3052+1920+216)));
 fail('second definition parameter',r=>syx(r,b=>b.writeUInt16LE(1,L-3052+144+12)));
 fail('txt',r=>r.txt=r.txt.replace('Control Switch 2, Scene 2: ON.','Control Switch 2, Scene 2: OFF.'));
 fail('spec state',(_r,s)=>s.controlSwitchScenes[1].state='LAST');
 fail('spec dropped',(_r,s)=>delete s.footswitches);
 fail('report',r=>r.report.csPreset.footswitches[0].function='momentary');
 // Rehashed bundle in the previously accepted malformed-input shape.
 fail('array function in spec, report and matching old TXT',(r,s)=>{
  s.footswitches[0].function=['latching'];r.report.csPreset.footswitches[0].function=['latching'];
  r.txt=r.txt.replace('Latching (vajutus lülitab sisse/välja)','Momentary (sees ainult hoidmise ajal)');
 });
 fail('unrequested scene state',r=>syx(r,b=>b.writeUInt16LE(0,L-482)),plain,plainSpec,/unrequested per-preset switch/);
 fail('unrequested override',r=>syx(r,b=>b.writeUInt16LE(0,L-3052+1920)),plain,plainSpec,/unrequested per-preset switch/);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
assert.deepEqual(readCsPreset(gb,spec),good.report.csPreset);assert.equal(CS_STATES.LAST,2);
const caps=getPresetCapabilities();assert.ok(caps.csPreset&&caps.csPreset.storage.includes('in the preset'));
console.log(JSON.stringify({passed:true,declaredWords:changed.length,rejected,tamperCases:tamper,positions:Object.keys(OVERRIDE_POSITIONS).length,deviceIO:false}));

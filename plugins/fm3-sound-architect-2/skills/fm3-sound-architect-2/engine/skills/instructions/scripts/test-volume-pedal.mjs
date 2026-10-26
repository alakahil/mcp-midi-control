// Hardware-body replay, preserved bytes, fail-closed input and adversarial final
// artifact validation. Uses the measured raw vector/hash, no device connection.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createPreset,writePresetOutputs,verifyPresetOutputs,getPresetCapabilities} from './fm3-preset.mjs';
import {bindVolumePedal} from './fm3-volume-pedal.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {decodeGen3PresetDump,reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {scanRecords} from './fm3-layout.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const evidence=JSON.parse(fs.readFileSync(new URL('../references/fm3-volume-binding-evidence.json',import.meta.url)));
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const spec={...evidence.baseline.spec,volumePedal:true};
const baseline=createPreset(base,evidence.baseline.spec),good=createPreset(base,spec);
assert.equal(sha(baseline.syx),evidence.baseline.sha256);
const parsed=inspectStructure(good.syx),body=Buffer.from(parsed.raw.body),old=Buffer.from(inspectStructure(baseline.syx).raw.body);
assert.equal(sha(body),evidence.capture.bodySha256,'entire body must match independent device export hash');
assert.equal(good.report.volumePedal.entireBodyMatchesCapture,true);
assert.deepEqual(body.subarray(0,1584),old.subarray(0,1584));assert.deepEqual(body.subarray(1634),old.subarray(1634));
assert.deepEqual(Array.from({length:25},(_,i)=>body.readUInt16LE(1584+2*i)),evidence.binding.words);
// Separate public raw decoder entry, checked against the hardware body rather
// than only the writer. Codec ancestry is shared, not independent FW evidence.
const decoded=decodeGen3PresetDump(good.syx,17);
assert.equal(decoded.crc_valid,true);assert.deepEqual(Buffer.from(decoded.decompressed_body),body);
// The binding drives Volume (Gain), which AUTO-SWELL hides: the combination is refused on any channel.
for(const ch of 'ABCD')assert.throws(()=>createPreset(base,{...spec,allow:['enum-labels'],controls:[{block:'volpan',channel:ch,param:'TYPE',value:'AUTO-SWELL'}]}),/AUTO-SWELL hides/);
const cap=getPresetCapabilities().volumePedal;
assert.equal(cap.fullRangeEncodingProven,false);assert.equal(cap.numericMinMaxAuthoring,false);
assert.equal(cap.target.pid,0);assert.equal(cap.target.channelScope,'ALL');
const observation=JSON.parse(fs.readFileSync(new URL('../references/fm3-pedal-check-20261024.json',import.meta.url)));
assert.equal(cap.pedalBehaviorEvidence.knobFollowsPedal,observation.editorCheck.P1.knobFollowsPedalHeelToToe);
assert.equal(good.report.volumePedal.pedalBehaviorEvidence.numericHeelToeMeasured,observation.editorCheck.P1.heelToeValuesRecorded);
assert.equal(good.report.volumePedal.pedalBehaviorEvidence.currentGeneratedPresetHardwareTested,false);
assert.equal(good.report.volumePedal.storeReloadProven,false);
assert.ok(good.txt.includes('P1/P0 katses kinnitati FM3-Editis pedaali järgimine'));
assert.ok(!good.txt.includes('Pedaali toimimine, heli ja STORE/reload on kontrollimata'));

const rewrite=(input,mutate)=>{const p=inspectStructure(input),b=Buffer.from(p.raw.body);mutate(b);return Buffer.from(reencodeDumpFromRawPatch(input,reencodeRawPatch(p.raw.rawPatch,b)));};
let rejected=0;
const badSpec=edit=>{const s=structuredClone(spec);edit(s);const before=Buffer.from(base);assert.throws(()=>createPreset(base,s));assert.deepEqual(base,before);rejected++;};
for(const value of [false,0,1,'true',null,{},[],{min:'0.00'},{channel:'A'}])badSpec(s=>s.volumePedal=value);
badSpec(s=>delete s.volumePan);badSpec(s=>s.composer.modifiers={external1Wah:true});
badSpec(s=>s.composer.modifiers={external1Wah:false,wahMinMaxExact:{policy:'exact-wah-cent-fw13-hw1',min:'0.00'}});
for(const channel of 'ABCD')for(const param of [0,'GAIN','VOLUME_GAIN'])badSpec(s=>s.controls=[{block:'volpan',channel,param,value:7.5}]);
// Reject all mutated defaults, other bindings, malformed headers and target type.
let invalidBodies=0;
for(let i=0;i<25;i++){
 const changed=rewrite(baseline.syx,b=>b.writeUInt16LE(b.readUInt16LE(1584+2*i)^1,1584+2*i)),saved=Buffer.from(changed);
 assert.throws(()=>bindVolumePedal(changed),/Volume pedal|modifier/);assert.deepEqual(changed,saved);invalidBodies++;
}
const vr=scanRecords(old).records.find(r=>r.eid===102);
for(const at of [1538,1540,1580,1582,1680,1700,vr.start+18,vr.start+30+18,vr.start+60+18,vr.start+90+18]){
 const changed=rewrite(baseline.syx,b=>b.writeUInt16LE(b.readUInt16LE(at)^1,at));assert.throws(()=>bindVolumePedal(changed));invalidBodies++;
}
assert.throws(()=>bindVolumePedal(good.syx),/inactive/);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3 volume pedal % # ü '));let tamperCases=0;
try{
 const verify=(name,result,s=spec)=>{const stem=path.join(temp,name);writePresetOutputs(stem,result,s);return verifyPresetOutputs(stem);};
 verify('known',good);
 // Real CLI public entry and final verification; paths contain spaces/%/#/Unicode.
 const specPath=path.join(temp,'input.json'),stem=path.join(temp,'cli');fs.writeFileSync(specPath,JSON.stringify(spec));
 const cli=fileURLToPath(new URL('fm3-preset.mjs',import.meta.url));
 execFileSync(process.execPath,[cli,fileURLToPath(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url)),specPath,stem]);
 assert.equal(JSON.parse(execFileSync(process.execPath,[cli,'--verify',stem],{encoding:'utf8'})).passed,true);
 // Different scene/parameter settings retain captured binding; no hardware claim.
 const custom={...spec,composer:{...spec.composer,name:'VOLUME PEDAL USE'},controls:[{block:'volpan',channel:'B',param:'LEVEL',value:-3},{block:'in1',channel:'A',param:'THRESH',value:-65}],blockScenes:{volpan:Array.from({length:8},(_,i)=>({scene:i+1,channel:i===1?'B':'A',bypass:i>1}))}};
 const customResult=createPreset(base,custom);verify('custom',customResult,custom);assert.equal(customResult.report.volumePedal.entireBodyMatchesCapture,false);
 // Apply before controls in grid mode too; second-instance Gain remains independent.
 const grid={...spec,layout:undefined,grid:{rows:[Array(12).fill(''),['in1','drive','-','-','amp','-','-','cab','-','-','-','send'],['return','volpan','volpan2','delay','-','-','reverb','-','-','-','-','out1'],Array(12).fill('')]},duplicate:['volpan2'],controls:[{block:'volpan2',channel:'A',param:'GAIN',value:7.5}]};
 delete grid.layout;const gridResult=createPreset(base,grid);verify('grid',gridResult,grid);
 const missing={...grid,remove:['volpan'],duplicate:[],controls:[]};missing.grid=structuredClone(grid.grid);missing.grid.rows[2][1]='-';missing.grid.rows[2][2]='-';assert.throws(()=>createPreset(base,missing),/Volume/);
 // Matching new CRC + artifact hashes must not conceal one altered raw word.
 const fail=(name,change)=>{const r={...good,report:structuredClone(good.report)},s=structuredClone(spec);change(r,s);assert.throws(()=>verify(name,r,s),/Volume pedal|Volume|modifier|TXT/);tamperCases++;};
 for(let i=0;i<25;i++)fail('word-'+i,r=>{r.syx=rewrite(good.syx,b=>b.writeUInt16LE(b.readUInt16LE(1584+2*i)^1,1584+2*i));r.report.outputSha256=sha(r.syx);r.report.volumePedal.words[i]^=1;assert.equal(decodeGen3PresetDump(r.syx,17).crc_valid,true);});
 fail('other-record',r=>{r.syx=rewrite(good.syx,b=>b.writeUInt16LE(1,1680));r.report.outputSha256=sha(r.syx);});
 fail('report',r=>r.report.volumePedal.fullRangeEncodingProven=true);
 fail('pedal-evidence-overclaim',r=>r.report.volumePedal.pedalBehaviorEvidence.currentGeneratedPresetHardwareTested=true);
 fail('report-missing',r=>delete r.report.volumePedal);
 fail('other-report',r=>r.report.modifiers[1].source=14);
 fail('intermediate-wah',r=>r.report.modifierEdit=r.report.stages.composer.modifierEdit);
 fail('stage',r=>r.report.stages.volumePedal.changedWordIndices=[0]);
 fail('txt',r=>r.txt=r.txt.replace('kanalid ALL (A–D).','kanal A.'));
 fail('txt-words',r=>r.txt=r.txt.replace('Modifikaatori 25 toorsõna:','Words:'));
 fail('unrequested',(r,s)=>{delete s.volumePedal;delete r.report.volumePedal;delete r.report.stages.volumePedal;});
 fail('false-request',(_r,s)=>s.volumePedal=false);
 fail('static-conflict',(_r,s)=>s.controls=[{block:'volpan',channel:'A',param:0,value:10}]);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,hardwareBodyReplay:true,allOtherBodyBytesPreserved:true,invalidSpecs:rejected,invalidBodies,crcValidRehashedTamperCases:tamperCases,cliFourFiles:true,gridAndSecondInstance:true,fullRangeEncodingProven:false,deviceIO:false}));

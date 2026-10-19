// User-visible regressions: known SYX bytes, final guide, malformed requests,
// complete four-file delivery and collision/tampering failures. No device I/O.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createPreset,writePresetOutputs,verifyPresetOutputs,getPresetCapabilities} from './fm3-preset.mjs';
import {writeTableControls} from './fm3-table-encoder.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url));
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const sound=JSON.parse(read('examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json'));
const saved=JSON.stringify(sound),original=Buffer.from(base),r=createPreset(base,sound);
assert.deepEqual(r.syx,read('examples/SATRIANI_SOAP_ON_A_ROPE_V3.syx'));
assert.equal(JSON.stringify(sound),saved);assert.deepEqual(base,original);
assert.equal(r.report.outputSha256,'9c928eeacd4462b4cabae5ef5e06d4f13a47306421301f73690152251dee9a3f');
assert.equal(r.report.controls.length,47);assert.ok(r.txt.includes(r.report.outputSha256));
assert.equal(r.report.stages.composer.scope,'intermediate; not final settings');
assert.notEqual(r.report.stages.composer.outputSha256,r.report.outputSha256);
// Independent byte reads: scene selection/name, Amp A Level, and the requested scene channel.
const custom=structuredClone(sound);custom.selectedScene=8;custom.context={guitar:'Ibanez AS-120',pickups:'humbucker',output:'OUT1 stereo FOH'};
custom.blockScenes={amp:[{scene:1,channel:'D',bypass:false}]};
const changed=createPreset(base,custom),body=Buffer.from(inspectStructure(changed.syx).raw.body);
assert.equal(body[0],7);assert.equal(changed.report.selectedScene,8);
assert.equal(body.readUInt16LE(4610+10),3);assert.equal(changed.report.scenes[0].blocks.amp.channel,'D');
assert.equal(changed.report.scenes[0].name,body.subarray(4,35).toString('ascii').trim());
assert.ok(changed.txt.includes('Valitud Scene: 8'));assert.ok(changed.txt.includes('amp D: JS410 Lead Orange'));
assert.ok(changed.txt.includes('Kitarr: Ibanez AS-120'));
assert.ok(Math.abs(changed.report.scenes[0].blocks.amp.levelDb-(-80+body.readUInt16LE(4656+3*288+2)/65534*100))<1e-10);
let rejected=0;
for(const channel of ['', 'AB', 'ABCDE', 'a', null, ['A'], 0, {}]){
 const bad=structuredClone(sound);bad.controls=[{...sound.controls[0],channel}];assert.throws(()=>createPreset(base,bad),/Channel/);rejected++;
 const standard=read('examples/JB_RHYTHM_LEVEL_MINUS3.syx');assert.throws(()=>writeTableControls(standard,{name:'BAD CHANNEL',controls:bad.controls}),/Channel/);rejected++;
}
for(const edit of [s=>s.controls[0].typo=1,s=>s.layout.typo=true,s=>s.blockScenes={amp:[{scene:1,channel:'A',typo:true}]},s=>s.allow=['unknown'],s=>s.allow=null,s=>s.controls.push({...s.controls[0]}),s=>s.controls[0].raw=1,s=>s.experimental=true,s=>s.controls=null,s=>s.selectedScene=9]){
 const bad=structuredClone(sound);edit(bad);assert.throws(()=>createPreset(base,bad));rejected++;
}
const cap=getPresetCapabilities(base);assert.equal(cap.composer.ampLevels.revision,'amp-level-points-2026-10-13');assert.equal(cap.outputSceneLevels.supported,true);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-release-test-'));
try{
 const stem=path.join(tmp,'preset');writePresetOutputs(stem,changed,custom);const report=verifyPresetOutputs(stem);assert.equal(report.outputSha256,changed.report.outputSha256);
 const before=fs.readdirSync(tmp);assert.throws(()=>writePresetOutputs(stem,r,sound),/already exists/);assert.deepEqual(fs.readdirSync(tmp),before);
 const collision=path.join(tmp,'collision');fs.writeFileSync(collision+'.txt','keep me');assert.throws(()=>writePresetOutputs(collision,r,sound),/already exists/);assert.equal(fs.readFileSync(collision+'.txt','utf8'),'keep me');assert.equal(fs.existsSync(collision+'.syx'),false);
 fs.appendFileSync(stem+'.txt','tampered');assert.throws(()=>verifyPresetOutputs(stem),/Artifact mismatch/);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,satrianiByteExact:true,finalScenesAndGuideVerified:true,malformedRequestsRejected:rejected,fourFilesVerified:true,collisionsAndTamperingRejected:true,deviceIO:false}));

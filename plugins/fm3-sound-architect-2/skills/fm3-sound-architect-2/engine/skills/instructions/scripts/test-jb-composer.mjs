import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generatePreset,controls} from './fm3-generate.mjs';
import {inspect} from './fm3-prototype.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {resolveImportedTemplate,bundledLibrary} from './fm3-amp-library.mjs';
import {resolveCab} from './fm3-cabs.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const base=read('examples/JB_YDOM_RHYTHM.syx'),original=Buffer.from(inspect(base).raw.body);
const meta={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'JB YDOM RHYTHM'};
const solo={scene6Name:'JB SOLO',phaserScene6Bypass:true,ampScene6:'C',reverbScene6:'D',delayScene6Bypass:false};
const body=r=>Buffer.from(inspectStructure(r.syx).raw.body);
const result=generatePreset(base,{...meta,...solo});
// Previously imported combination is an independent regression oracle. No new
// device test is inferred for combinations that merely use the same components.
assert.deepEqual(result.syx,read('examples/JB_RHYTHM_SOLO_GENERATED.syx'));
assert.deepEqual(body(result),Buffer.from(inspect(read('examples/JB_RHYTHM_SOLO_GENERATED_export.syx')).raw.body));
const fixture=JSON.parse(read('examples/JB_UNIFIED_RHYTHM_SOLO_TEST.spec.json'));
const combined=generatePreset(base,fixture),actual=body(combined);
assert.deepEqual(combined.syx,read('examples/JB_UNIFIED_RHYTHM_SOLO_TEST.syx'));
// Text now includes every present block, all scenes, active channel users and
// an output-specific export name. Historical SYX bytes remain the oracle.
assert.ok(combined.txt.includes(combined.report.outputSha256));
assert.ok(combined.txt.includes(combined.report.exportFilename));
assert.match(combined.txt,/STSEENID 1–8/);
// Preserve the user's entire rhythm Amp/Cab and other Scene2 effects exactly.
assert.deepEqual(actual.subarray(4944,5232),original.subarray(4944,5232));
assert.deepEqual(actual.subarray(6066,6278),original.subarray(6066,6278));
assert.deepEqual(combined.report.scenes[1],result.report.scenes[1]);
assert.match(combined.txt,/delay A: Deluxe Mind Guy; sees/);
assert.match(combined.txt,/drive B: T808 OD; sees/);
assert.match(combined.txt,/Delay A Time: 399\.91 ms/);
// Independent expected composition uses saved device/reference bodies and raw
// registry words, not the composer's allowed-region bookkeeping.
const expected=Buffer.from(body(result));
const driveSpec={schemaVersion:1,firmware:13,baseProfile:'jb-drive-multi',driveChannels:fixture.driveChannels};
const drive=body(generatePreset(base,driveSpec));drive.copy(expected,8548,8548,8636);
const reverbLib=JSON.parse(read('references/reverb-library.json'));
reverbLib.models.find(m=>m.name==='Room: Medium Room').words.forEach((v,i)=>expected.writeUInt16LE(v,9990+2*i));
for(const [offset,raw] of [[7408,Math.round(399/15999*65534)],[7422,0],[7412,Math.round(125/200*65534)],[7392,Math.round(15/100*65534)]])expected.writeUInt16LE(raw,offset);
assert.deepEqual(actual,expected);
// Pairwise/all-component interactions across all 31 non-empty subsets.
const groups=[{ampModelB:'Brit Silver',gainB:5,midB:6.5},{cabModelB:'4x12 Rumble EV12L'},
  {driveChannels:[{channel:'A',type:'BB Pre',drive:2,mix:25}]},
  {delayChannels:[{channel:'B',type:'Digital Stereo'}],delayTimeMs:400,delayTempoA:'NONE'},
  {reverbChannels:[{channel:'D',type:'Room: Medium Room'}],...solo}];
let combinations=0;
for(let mask=1;mask<32;mask++){
  const spec={...meta},want=Buffer.from(original);
  for(let j=0;j<groups.length;j++)if(mask&(1<<j)){
    Object.assign(spec,groups[j]);const one=body(generatePreset(base,{...meta,...groups[j]}));
    for(let i=0;i<want.length;i++)if(one[i]!==original[i])want[i]=one[i];
  }
  const out=generatePreset(base,spec);assert.deepEqual(body(out),want,'Component interaction '+mask);combinations++;
}
// Full templates are applied before scalar controls; slots equal to the base
// must still be copied. Check whole Amp B against the independently stored donor.
const amp=generatePreset(base,{...meta,ampModelB:'Brit Silver',gainB:7,levelB:-18});
const ampExpected=Buffer.from(resolveImportedTemplate(bundledLibrary,'Brit Silver').raw);
ampExpected.writeUInt16LE(Math.round(.7*65534),14);ampExpected.writeUInt16LE(Math.round(.62*65534),2);
assert.deepEqual(body(amp).subarray(4944,5232),ampExpected);
assert.deepEqual(generatePreset(base,{...meta,ampModelB:'Brit Silver',ampScene6:'C'}).report.components.amp.affectedScenes,[2]);
// Template and override on the same Delay/Reverb channel retain both writes.
for(const [family,key,type,start,n,override,offset,raw] of [
  ['delay','delayChannels','Deluxe Mind Guy',7392,89,{delayMixA:15},7392,Math.round(.15*65534)],
  ['reverb','reverbChannels','Room: Large Room',9564,71,{reverbMixA:12},9590,Math.round(.12*65534)]]){
  const model=JSON.parse(read('references/'+family+'-library.json')).models.find(m=>m.name===type),want=Buffer.alloc(n*2);
  model.words.forEach((v,i)=>want.writeUInt16LE(v,2*i));want.writeUInt16LE(raw,offset-start);
  const out=generatePreset(base,{...meta,[key]:[{channel:'A',type}],...override});assert.deepEqual(body(out).subarray(start,start+n*2),want);
}
// All shared scalar controls retain their ranges and only modify one word,
// plus an explicitly requested tempo word when required.
const values={gainB:5,bassB:4,midB:5,trebleB:4,presenceB:2,levelB:-18,delayMixA:15,reverbMixA:12,delayTimeMs:400,delayFeedback:25,reverbTimeS:2.5,reverbPredelayMs:40,delayTempoA:'NONE',reverbPredelayTempoA:'NONE',delayScene2:true,reverbScene1:'B'};
for(const [key,value] of Object.entries(values)){
  const spec={...meta,[key]:value};if(key==='delayTimeMs')spec.delayTempoA='NONE';if(key==='reverbPredelayMs')spec.reverbPredelayTempoA='NONE';
  const want=Buffer.from(original);for(const k of Object.keys(values).filter(k=>Object.hasOwn(spec,k))){const f=controls[k],v=spec[k];want.writeUInt16LE(f.rawValues?f.rawValues[f.values.indexOf(v)]:Math.round((v-f.min)/(f.max-f.min)*65534),f.offset)}
  assert.deepEqual(body(generatePreset(base,spec)),want,key+' collateral write');
}
// Exercise a Cab whose numeric ID can fool the generic header scanner.
const trickyCab=generatePreset(base,{...meta,cabModelB:'4x12 Lerxst',...solo});
assert.deepEqual(body(trickyCab).subarray(6066,6278),resolveCab('4x12 Lerxst').raw);
const invalid=[{}, {gainB:4.5},{gainB:null},{midB:NaN},{levelB:21},{delayFeedback:100},{delayTimeMs:400},{reverbPredelayMs:40},{delayTempoA:'1/4'},
 {ampModelB:'unknown'},{cabModelB:'unknown'},{cabScene2:'4x12 RECTO SLANT'},{ampScene6:'D'},{reverbScene6:'B'},{phaserScene6Bypass:1},{scene6Name:' SOLOW'},
 {scene6Name:'SOLO',name:'Õ'},{scene6Name:'SOLO',firmware:14},{scene6Name:'SOLO',purpose:'\n'},
 {driveChannels:[]},{driveChannels:null},{driveChannels:[null]},{driveChannels:[{channel:'A',type:'BB Pre',tone:7}]},
 {driveChannels:[{channel:'C',type:'Rat Distortion',drive:2}]},{driveChannels:[{channel:'A',type:'BB Pre'},{channel:'A',type:'BB Pre'}]},
 {delayChannels:[{channel:'A',type:'Digital Stereo'}],delayMixA:15},{reverbChannels:[{channel:'A',type:'Room: Medium Room'}],reverbMixA:12},
 {delayChannels:[{channel:'E',type:'Digital Stereo'}]},{reverbChannels:[{channel:'D',type:'Room: Medium Room',mix:20}]},
 {delayChannels:[{channel:'A',type:'Digital Stereo',bypass:false}]},{routing:[]},{filterChannels:[]},{outputBoostDb:3},{name:'new name only'},
 {scene6Name:'SOLO',toString:5}];
for(const bad of invalid)assert.throws(()=>generatePreset(base,{...meta,...bad}),JSON.stringify(bad));
assert.throws(()=>generatePreset(read('references/Baaspreset.syx'),{...meta,...solo}));
const corrupt=Buffer.from(base);corrupt[100]^=1;assert.throws(()=>generatePreset(corrupt,{...meta,...solo}));
const inputCopy=Buffer.from(base),specCopy=JSON.stringify(fixture);generatePreset(base,fixture);assert.deepEqual(base,inputCopy);assert.equal(JSON.stringify(fixture),specCopy);
const report={date:'2026-10-08',generator:'jb-composer-0.2.0',passed:true,previousGeneratedFileByteIdentical:true,previousHardwareExportFullBodyIdentical:true,newSpecMatchesIndependentExpectedBody:true,preservedRhythmAmpAndCab:true,componentCombinations:combinations,isolatedControls:16,templateThenControlCases:3,headerAmbiguityCabCase:1,invalidRequestsAndBases:invalid.length+2,inputObjectsPreserved:true,newSpecOutputSha256:combined.report.outputSha256,newSpecChangedBodyBytes:combined.report.changedBodyOffsets.length,hardware:'New composition pending; previous reference reproduction is exact',audio:'Not assessed'};
fs.writeFileSync(new URL('../../../docs/FM3_JB_COMPOSER_TESTS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));

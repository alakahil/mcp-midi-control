// Hardware points and synthetic integration checks are counted separately.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {composerBases,layouts} from './fm3-composer-bases.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {createPreset,writePresetOutputs,verifyPresetOutputs,getPresetCapabilities} from './fm3-preset.mjs';
import {applyWahModifier,verifyWahModifierReadback} from './fm3-wah-modifier.mjs';
import {planWahExact,exactWahPolicy} from './fm3-wah-minmax-exact.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const body=b=>Buffer.from(inspectStructure(b).raw.body),sha=b=>createHash('sha256').update(b).digest('hex');
const exact=fields=>({policy:exactWahPolicy,...fields});
const spec=(b,modifiers)=>({schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:inspectStructure(b).decoded.preset_name,modifiers});
const base=composerBases[2],bytes=read(base.file),original=body(bytes),blocks=layouts[base.layout];
let publicCases=0,negative=0,retentionCases=0;
// Values from independently decoded hardware packets, not calculated expectations.
for(const [value,raw] of [['0.00',0],['2.50',16384],['5.00',32767],['6.47',42401],['7.50',49151],['10.00',65534]]){
 const request=exact({min:value,max:value}),p=planWahExact(request);
 assert.deepEqual(p.changes.map(c=>c.raw),[raw,raw]);assert.equal(p.allRequestedInputsHardwareMeasured,true);
 const result=createPreset(bytes,spec(bytes,{wahMinMaxExact:request})),expected=Buffer.from(original);
 expected.writeUInt16LE(raw,1586);expected.writeUInt16LE(raw,1588);
 assert.deepEqual(body(result.syx),expected);assert.deepEqual(body(bytes),original);
 assert.equal(result.report.modifierEdit.min.display,null);assert.equal(result.report.modifierEdit.controls.max.display,null);
 assert.ok(result.txt.includes('täpne sisestussiht '+value));assert.equal(result.report.knownDeviceBody,null);
 publicCases++;
}
// The finite API covers 1001 cents; only six per field carry hardware evidence.
const counts={};
for(let cent=0;cent<=1000;cent++){
 const value=(cent/100).toFixed(2),p=planWahExact(exact({min:value,max:value}));
 assert.equal(p.fullRangeEncodingProven,false);assert.equal(p.deviceImportTested,false);
 for(const c of p.changes)counts[c.evidenceBasis]=(counts[c.evidenceBasis]??0)+1;
}
assert.deepEqual(counts,{'hardware-exact-input':12,'four-mode-consensus-only':1990});
const modeled=createPreset(bytes,spec(bytes,{wahMinMaxExact:exact({min:'2.51'})}));
assert.ok(modeled.txt.includes('seda sisendit riistvaral ei mõõdetud'));
assert.equal(modeled.report.modifierEdit.exactMinMax.allRequestedInputsHardwareMeasured,false);
// Existing display-point requests retain their historical words and interpretation.
const legacy=createPreset(bytes,spec(bytes,{wahMin:2.5,wahControls:{max:5}}));
assert.deepEqual([body(legacy.syx).readUInt16LE(1586),body(legacy.syx).readUInt16LE(1588)],[16375,32784]);
assert.equal(legacy.report.modifierEdit.exactMinMax,undefined);
for(const [min,max] of [[16375,65534],[16375,49159],[16375,32784],[0,65534]]){
 for(const field of ['min','max']){
  const copy=Buffer.from(original);copy.writeUInt16LE(min,1586);copy.writeUInt16LE(max,1588);
  const expected=Buffer.from(copy);expected.writeUInt16LE(42401,field==='min'?1586:1588);
  const edit=applyWahModifier(copy,{wahMinMaxExact:exact({[field]:'6.47'})},blocks);
  assert.deepEqual(copy,expected);verifyWahModifierReadback(copy,edit);retentionCases++;
 }
}
// Different fields may deliberately use different contracts; duplicate fields may not.
const mixed=createPreset(bytes,spec(bytes,{wahMin:2.5,wahMinMaxExact:exact({max:'6.47'}),wahControls:{attackMs:500}}));
assert.equal(body(mixed.syx).readUInt16LE(1586),16375);assert.equal(body(mixed.syx).readUInt16LE(1588),42401);
function reject(request,mutate=()=>{},target=blocks){
 const copy=Buffer.from(original);mutate(copy);const before=Buffer.from(copy);let callbacks=0;
 assert.throws(()=>applyWahModifier(copy,request,target,()=>callbacks++),/Wah|modifier/);
 assert.deepEqual(copy,before);assert.equal(callbacks,0);negative++;
}
for(const value of [null,undefined,[],{},true,2.5,'2.50'])reject({wahMinMaxExact:value});
for(const value of [2.5,'2.5','02.50','2,50',' 2.50','2.50\n','-0.00','10.01','NaN',null,{},'2.500'])reject({wahMinMaxExact:exact({min:value})});
for(const request of [{policy:exactWahPolicy},{policy:'exact-wah-cent-v1',min:'2.50'},exact({min:'2.50',channel:'A'})])reject({wahMinMaxExact:request});
reject({wahMin:2.5,wahMinMaxExact:exact({min:'2.50'})});
reject({wahControls:{max:5},wahMinMaxExact:exact({max:'5.00'})});
reject({external1Wah:false,wahMinMaxExact:exact({min:'2.50'})});
for(const [at,value] of [[1584,15],[1600,95],[1602,6],[1618,1],[1624,14],[1630,1],[1586,65535],[1588,65535],[1590,12345]])
 reject({wahMinMaxExact:exact({min:'2.50'})},b=>b.writeUInt16LE(value,at));
reject({wahMinMaxExact:exact({max:'6.47'})},b=>{b.writeUInt16LE(14,1680);b.writeUInt16LE(94,1696);b.writeUInt16LE(5,1698);});
reject({wahMinMaxExact:exact({min:'2.50'})},()=>{},{});
// NewLook inserts a Wah explicitly; sound path keeps the active-target write lock.
const newlook=read(composerBases.at(-1).file);
const sound={composer:{...spec(newlook,{external1Wah:true,wahMinMaxExact:exact({min:'2.50',max:'6.47'})}),wahChannels:[{channel:'A',type:'FAS Wah'}]},layout:{row2:['wah','drive','amp','cab'],row3:['delay','reverb']}};
const result=createPreset(newlook,sound);
assert.equal(result.report.modifierEdit.exactMinMax.changes[1].raw,42401);
assert.ok(result.report.scenes.every(s=>s.blocks.wah.bypass));
for(const channel of 'ABCD')assert.throws(()=>createPreset(newlook,{...sound,controls:[{block:'wah',channel,param:5,value:5}],allow:['linear-by-structure']}),/modifier-controlled/);
assert.throws(()=>createPreset(bytes,{...spec(bytes,{wahMinMaxExact:exact({min:'2.50'})}),firmware:12}),/firmware 13/);
const caps=getPresetCapabilities().modifiers.exactMinMax;
assert.equal(caps.field,'composer.modifiers.wahMinMaxExact');assert.equal(caps.fullRangeEncodingProven,false);
assert.deepEqual(caps.countsPerField,{hardwareExactInput:6,fourModeConsensusOnly:995});
const schema=JSON.parse(read('scripts/fm3-spec.schema.json')).oneOf.find(x=>x.properties?.baseProfile?.const==='jb-composer').properties.modifiers.properties.wahMinMaxExact;
assert.equal(schema.additionalProperties,false);assert.equal(schema.properties.policy.const,exactWahPolicy);
assert.equal(new RegExp(schema.properties.min.pattern).test('2.50'),true);
// Real four-file CLI workflow, standalone --verify and adversarial valid-CRC SYX.
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-exact-'));
try{
 const stem=path.join(dir,'exact'),input=path.join(dir,'input.json'),basePath=new URL('../'+composerBases.at(-1).file,import.meta.url).pathname;
 fs.writeFileSync(input,JSON.stringify(sound));
 const cli=new URL('./fm3-preset.mjs',import.meta.url).pathname;
 const run=spawnSync(process.execPath,[cli,basePath,input,stem],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
 assert.equal(verifyPresetOutputs(stem).modifierEdit.controls.max.after,42401);
 assert.equal(spawnSync(process.execPath,[cli,'--verify',stem],{encoding:'utf8'}).status,0);
 const originalFiles=Object.fromEntries(['.syx','.txt','.spec.json','.validation.json'].map(ext=>[ext,fs.readFileSync(stem+ext)]));
 const restore=()=>{for(const [ext,b] of Object.entries(originalFiles))fs.writeFileSync(stem+ext,b);};
 let report=JSON.parse(originalFiles['.validation.json']);
 report.modifierEdit.exactMinMax.fullRangeEncodingProven=true;fs.writeFileSync(stem+'.validation.json',JSON.stringify(report));
 assert.throws(()=>verifyPresetOutputs(stem),/exact report differs/);restore();
 report=JSON.parse(originalFiles['.validation.json']);delete report.modifierEdit.exactMinMax;fs.writeFileSync(stem+'.validation.json',JSON.stringify(report));
 assert.throws(()=>verifyPresetOutputs(stem),/exact report differs/);restore();
 const parsed=inspectStructure(originalFiles['.syx']),badBody=Buffer.from(parsed.raw.body);badBody.writeUInt16LE(42400,1588);
 const wrong=Buffer.from(reencodeDumpFromRawPatch(originalFiles['.syx'],reencodeRawPatch(parsed.raw.rawPatch,badBody)));
 report=JSON.parse(originalFiles['.validation.json']);report.outputSha256=sha(wrong);report.artifacts['.syx']={bytes:wrong.length,sha256:sha(wrong)};
 fs.writeFileSync(stem+'.syx',wrong);fs.writeFileSync(stem+'.validation.json',JSON.stringify(report));
 assert.throws(()=>verifyPresetOutputs(stem),/final max differs/);restore();
 // A valid checksum cannot bless a changed binding, second controller or missing target.
 const targetMutations=[
  b=>b.writeUInt16LE(14,1624),
  b=>b.writeUInt16LE(1,1630),
  b=>{b.writeUInt16LE(14,1680);b.writeUInt16LE(94,1696);b.writeUInt16LE(5,1698);},
  b=>b.writeUInt16LE(24,1580),
  b=>{for(let at=260;at<452;at+=4)if(b.readUInt16LE(at)===94)b.writeUInt16LE(0,at);}
 ];
 for(const change of targetMutations){
  const changed=Buffer.from(parsed.raw.body);change(changed);
  const malformed=Buffer.from(reencodeDumpFromRawPatch(originalFiles['.syx'],reencodeRawPatch(parsed.raw.rawPatch,changed)));
  report=JSON.parse(originalFiles['.validation.json']);report.outputSha256=sha(malformed);
  report.artifacts['.syx']={bytes:malformed.length,sha256:sha(malformed)};
  fs.writeFileSync(stem+'.syx',malformed);fs.writeFileSync(stem+'.validation.json',JSON.stringify(report));
  assert.throws(()=>verifyPresetOutputs(stem),/final target|Wah target|modifier record layout/);restore();
 }

 const badTxt=originalFiles['.txt'].toString().replace('sama sisend riistvaral mõõdetud','kogu vahemik kinnitatud');
 report=JSON.parse(originalFiles['.validation.json']);report.artifacts['.txt']={bytes:Buffer.byteLength(badTxt),sha256:sha(badTxt)};
 fs.writeFileSync(stem+'.txt',badTxt);fs.writeFileSync(stem+'.validation.json',JSON.stringify(report));assert.throws(()=>verifyPresetOutputs(stem),/TXT exact-input/);restore();
 assert.equal(verifyPresetOutputs(stem).modifierEdit.controls.max.after,42401);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,publicCases,retentionCases,negative,tableInputs:2002,hardwareExactInputs:12,modelConsensusInputs:1990,cliFourFileRoundtrip:true,finalTargetTamperCases:5,deviceIO:false,fullRangeEncodingProven:false}));

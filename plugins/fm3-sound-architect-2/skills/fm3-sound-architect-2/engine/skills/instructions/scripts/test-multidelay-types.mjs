// multidelayTypes (0.3.56, T35 2026-11-07). Offline.
// A Multi Delay Type is a measured full-channel template: all 121 words of the channel become the T35 device read
// after choosing that Type on the device-default channel. Controls apply on top; the Algorithm stays the Type's;
// MULTITAP_PRESETS in controls stays refused.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {composeSound} from './fm3-sound.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {MULTIDELAY_TYPE_LABELS,multidelayType,multidelayTypesCapabilities,MULTIDELAY_TYPES_RECEIPT} from './fm3-multidelay-types.mjs';
import {MULTIDELAY_PRESET_REFUSED} from './fm3-type-applicability.mjs';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {sha256} from './fm3-output.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {checkSchema} from './fm3-schema-check.mjs';
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const receipt=JSON.parse(fs.readFileSync(new URL('../'+MULTIDELAY_TYPES_RECEIPT,import.meta.url)));
const body=syx=>Buffer.from(inspectStructure(syx).raw.body);
const composer={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'MD TYPES',compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const spec=x=>({composer,insert:['multidelay'],selectedScene:1,layout:{row2:['compressor','drive','amp','cab'],row3:['delay','multidelay','reverb']},blockScenes:{multidelay:[{scene:1,bypass:false}]},...x});
const md=b=>scanRecords(b,{requireAmpCab:false}).records.find(r=>r.eid===74);
const ch=(b,c)=>{const r=md(b);return [...Array(121).keys()].map(i=>b.readUInt16LE(r.start+2*('ABCD'.indexOf(c)*121+i)));};
const diffWords=(a,b)=>{const d=[];for(let o=0;o<a.length;o+=2)if(a.readUInt16LE(o)!==b.readUInt16LE(o))d.push(o);return d;};

// 1. Every Type: channel A equals the T35 device image; nothing outside channel A changes; B..D stay default.
const plain=composeSound(base,spec({})),b0=body(plain.syx),r0=md(b0);
assert.deepEqual(ch(b0,'A'),receipt.presets[0].words,'the generator default channel equals the T35 device default');
assert.equal(MULTIDELAY_TYPE_LABELS.length,39);
for(const p of receipt.presets){
  const r=composeSound(base,spec({multidelayTypes:[{channel:'A',type:p.label}]})),b=body(r.syx);
  assert.deepEqual(ch(b,'A'),p.words,p.label);for(const c of 'BCD')assert.deepEqual(ch(b,c),ch(b0,c),p.label+' '+c);
  assert.ok(diffWords(b0,b).every(o=>o>=r0.start&&o<r0.start+2*121),p.label+': only channel A words');
  assert.equal(diffWords(b0,b).length,p.changedPids.length,p.label);
  assert.deepEqual(r.report.multidelayTypes,[{channel:'A',type:p.label,index:p.index,algorithm:p.algorithm,wordsChanged:p.changedPids.length}]);
  assert.match(r.txt,new RegExp('Kanal A: '+p.label.replace(/[.()]/g,'\\$&')+' \\(Type nr '+(p.index+1)));
}
assert.equal(plain.report.multidelayTypes,undefined);assert.doesNotMatch(plain.txt,/MULTI DELAY TYPE/);
// 2. Several channels; case-insensitive label; controls on top change only their own word.
const two=composeSound(base,spec({multidelayTypes:[{channel:'C',type:'mono diffuser'},{channel:'A',type:'Pealing Bells'}]})),bt=body(two.syx);
assert.deepEqual(ch(bt,'A'),multidelayType('Pealing Bells').words);assert.deepEqual(ch(bt,'C'),multidelayType('Mono Diffuser').words);assert.deepEqual(ch(bt,'B'),ch(b0,'B'));
assert.deepEqual(two.report.multidelayTypes.map(c=>c.type),['Mono Diffuser','Pealing Bells']);
const mix=composeSound(base,spec({multidelayTypes:[{channel:'A',type:'Pealing Bells'}],controls:[{block:'multidelay',channel:'A',param:'MULTITAP_MIX',value:30}]})),bm=body(mix.syx);
const only=composeSound(base,spec({multidelayTypes:[{channel:'A',type:'Pealing Bells'}]}));
assert.equal(diffWords(body(only.syx),bm).length,1,'Mix control: one word on top of the template');
// 3. Refusals.
for(const [x,re] of [[[],/1…4/],[[{channel:'E',type:'Pealing Bells'}],/A, B, C or D/],[[{channel:'A',type:'Pealing'}],/must be one of/],
  [[{channel:'A',type:'Dub Echo'},{channel:'A',type:'Aurora Delay'}],/listed twice/],[[{channel:'A',type:'Dub Echo',mix:3}],/Unknown|unknown|field/],
  [Array(5).fill(0).map((_,i)=>({channel:'ABCDA'[i],type:'Dub Echo'})),/1…4/],['Dub Echo',/1…4/]])
  assert.throws(()=>composeSound(base,spec({multidelayTypes:x})),re,JSON.stringify(x));
assert.throws(()=>composeSound(base,{composer,layout:{row2:['drive','amp','cab'],row3:['delay','reverb']},multidelayTypes:[{channel:'A',type:'Dub Echo'}]}),/needs a Multi Delay block/);
assert.throws(()=>composeSound(base,spec({multidelayTypes:[{channel:'A',type:'Pealing Bells'}],controls:[{block:'multidelay',channel:'A',param:'MULTITAP_BASETYPE',value:'Quad-Tap Delay'}]})),/not writable|Algorithm changed after Type/);
assert.throws(()=>composeSound(base,spec({controls:[{block:'multidelay',channel:'A',param:'MULTITAP_PRESETS',value:'Dub Echo'}]})),e=>/not writable/.test(e.message)||e.message.includes(MULTIDELAY_PRESET_REFUSED));
assert.match(MULTIDELAY_PRESET_REFUSED,/multidelayTypes/);
const caps=multidelayTypesCapabilities();assert.equal(caps.types.length,39);
assert.equal(caps.evidence.generatedImports,39);assert.equal(caps.evidence.storeReload,8);
assert.equal(caps.evidence.postStoreListeningH2,false);assert.equal(caps.evidence.newOutputConfirmed,false);
assert.match(caps.deviceConfirmed,/T49: 39 generated imports/);assert.match(caps.deviceConfirmed,/T38\/H2: 8 STORE confirmations/);
assert.match(only.txt,/39\/39 genereeritud importi ja heli/);assert.match(only.txt,/8\/39 STORE-kinnitust/);
assert.match(only.txt,/T36 07.11.2026 kinnitas/);
// 4. Schema and saved bundle: verifies; tampering with the Type word, Algorithm, other template word, report, text or spec is refused.
const bspec=spec({multidelayTypes:[{channel:'A',type:'Pealing Bells'},{channel:'B',type:'Dub Echo'}],controls:[{block:'multidelay',channel:'A',param:'MULTITAP_MIX',value:30}]});
assert.deepEqual(checkSchema('fm3-sound.schema.json',bspec),[],'schema accepts multidelayTypes');
assert.notDeepEqual(checkSchema('fm3-sound.schema.json',spec({multidelayTypes:[{channel:'A',type:'Nope'}]})),[],'schema refuses an unknown Type');
const good=createPreset(base,bspec),parsed=inspectStructure(good.syx),gb=Buffer.from(parsed.raw.body),rs=md(gb).start;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-md-types-'));
try{
  const stem=path.join(dir,'good');writePresetOutputs(stem,good,bspec);verifyPresetOutputs(stem);
  const tamper=[['type word',r=>r.body.writeUInt16LE(3,rs+228),/Type word differs|report differs/],
    ['algorithm',r=>r.body.writeUInt16LE(0,rs),/Algorithm changed|differ/],
    ['template word',r=>r.body.writeUInt16LE(r.body.readUInt16LE(rs+2*121+20)^1,rs+2*121+20),/differ/],
    ['report',r=>{r.report.multidelayTypes[1].type='Aurora Delay';},/Multi Delay Type report differs/],
    ['report dropped',r=>{delete r.report.multidelayTypes;},/Multi Delay Type report differs/],
    ['text',r=>{r.txt=r.txt.replace('Kanal B: Dub Echo','Kanal B: Dub Echoes');},/Final TXT|TXT differs/],
    ['spec type',r=>{r.spec.multidelayTypes[1].type='Aurora Delay';},/Type word differs|differ/],
    ['spec dropped',r=>{delete r.spec.multidelayTypes;},/without spec.multidelayTypes|differ/]];
  for(const [i,[name,mutate,error]] of tamper.entries()){
    const r={...good,report:structuredClone(good.report),body:Buffer.from(gb),spec:structuredClone(bspec)};mutate(r);
    r.syx=Buffer.from(reencodeDumpFromRawPatch(good.syx,reencodeRawPatch(parsed.raw.rawPatch,r.body)));r.report.outputSha256=sha256(r.syx);r.report.bytes=r.syx.length;
    const target=path.join(dir,String(i));writePresetOutputs(target,r,r.spec);assert.throws(()=>verifyPresetOutputs(target),error,name);
  }
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,types:receipt.presets.length,tamper:8}));

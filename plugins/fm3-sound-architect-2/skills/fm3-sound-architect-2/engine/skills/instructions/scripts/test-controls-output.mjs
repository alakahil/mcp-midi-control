import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {sha256} from './fm3-output.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch,decodeGen3PresetDump} from './fm3-codec.mjs';
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'OFFLINE FIVE FAMILIES',modifiers:{external1Wah:false}},
  insert:['gate','plex','tentap','synth','multiband'],layout:{row2:['gate','drive','amp','cab','multiband'],row3:['delay','plex','tentap','synth','reverb']},allow:['enum-labels','linear-by-structure'],
  controls:[{block:'gate',channel:'D',param:'RATIO',value:4},{block:'gate',channel:'D',param:'TYPE',value:'Modern Expander'},
    {block:'plex',channel:'B',param:'MIX',value:25},{block:'tentap',channel:'C',param:'MIX',value:20},
    {block:'synth',channel:'A',param:'TYPE3',value:'SQUARE'},{block:'multiband',channel:'B',param:'THRESH2',value:-20}]};
const good=createPreset(base,spec),parsed=inspectStructure(good.syx),body=Buffer.from(parsed.raw.body);
const gate=scanRecords(body).records.find(r=>r.family==='gate'),ratio=good.report.controls[0];
assert.ok(!spec.grid,'Exercise ordinary layout');
const cases=[
  ['raw control',r=>r.body.writeUInt16LE(ratio.raw+1,ratio.offset),/Final controls differ/],
  ['final hidden control',r=>{r.body.writeUInt16LE(2,gate.start+3*gate.words*2+28);r.spec.controls[1].value='Modern Gate';},/not applicable/],
  ['report value',r=>{r.report.controls[0].display=99;},/Final control display/],
  ['report policy',r=>{r.report.controls[0].typeApplicability.allowed=false;},/Final control typeApplicability/],
  ['missing retained parameter',r=>{r.report.parameters.pop();},/Final parameters/],
  ['wrong stored channel',r=>{r.report.channels[0].channels[0].words[0]^=1;},/Final channels/],
  ['retained TXT',r=>{r.txt=r.txt.replace('MUUD PÕHISEADED LÕPPFAILIST','FORGED SUMMARY');},/Final TXT/],
  ['scene report',r=>{r.report.scenes[0].name='FORGED';},/Final scenes/],
  ['wrong text',r=>{r.txt=r.txt.replace('gate D Ratio (GATE_RATIO):','gate D RATIO WRONG:');},/Final control TXT/],
  ['changed requested value',r=>{r.spec.controls[0].value=8;},/Final controls differ/],
  ['missing requested control',r=>{r.spec.controls.pop();},/Final parameters|Final control count/],
];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-final-five-'));
try{
  const stem=path.join(dir,'good');writePresetOutputs(stem,good,spec);verifyPresetOutputs(stem);
  for(const [i,[name,mutate,error]] of cases.entries()){
    const r={...good,report:structuredClone(good.report),body:Buffer.from(body),spec:structuredClone(spec)};mutate(r);
    r.syx=Buffer.from(reencodeDumpFromRawPatch(good.syx,reencodeRawPatch(parsed.raw.rawPatch,r.body)));
    assert.equal(decodeGen3PresetDump(r.syx,17).crc_valid,true);
    r.report.outputSha256=sha256(r.syx);r.report.bytes=r.syx.length;
    const target=path.join(dir,String(i));writePresetOutputs(target,r,r.spec);
    assert.throws(()=>verifyPresetOutputs(target),error,name);
  }
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,ordinaryLayout:true,families:5,rehashedTamperCases:cases.length,deviceIO:false}));

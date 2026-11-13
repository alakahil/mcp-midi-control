// Controllers writes (0.3.50, T28): the composer writes the prefix Controllers record (effect id 2) and nothing else.
// Replays the 29 hardware/editor readings of references/fm3-shot-t28-controllers-20261105.json through spec.controllers:
// the same display values give the same stored words at word = pid in copy = channel, and decode to the shown value.
// The saved four-file bundle verifies, and tampering with Controllers words, report, text or spec is refused.
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadGlobalScaleObservations} from './fm3-global-scale-observations.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {composeSound} from './fm3-sound.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {CONTROLLERS_RECORD,readControllers,controllersCapabilities,controllersParam} from './fm3-controllers.mjs';
import {findParam,decodeValue} from './fm3-table-encoder.mjs';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {sha256} from './fm3-output.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const receipt=JSON.parse(fs.readFileSync(new URL('../references/fm3-shot-t28-controllers-20261105.json',import.meta.url)));
const composer={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'CTRL TEST',compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const layout={row2:['compressor','drive','amp','cab'],row3:['delay','reverb']};
const body=syx=>Buffer.from(inspectStructure(syx).raw.body);
const plain=composeSound(base,{composer,layout}),b0=body(plain.syx);
const value=r=>{const p=findParam('CONTROLLERS',r.param);return p.kind==='enum'?r.shown:Number(/^-?[\d.]+/.exec(r.shown)[0]);};
assert.equal(receipt.editorReadings.length,29);
const controllers=receipt.editorReadings.map(r=>({channel:r.channel,param:r.param,value:value(r)}));
const out=composeSound(base,{composer,layout,controllers}),b1=body(out.syx);  // selectors default-writable since 0.3.52 (T28/T30 readings)
const {start,words,header}=CONTROLLERS_RECORD,changed=new Set();
for(const r of receipt.editorReadings){
  const off=start+2*('ABCD'.indexOf(r.channel)*words+r.pid);changed.add(off);changed.add(off+1);
  const p=findParam('CONTROLLERS',r.param),raw=b1.readUInt16LE(off);
  // Display values are rounded, so a re-encoded reading may differ from the stored word by the display step only.
  if(p.kind==='enum'||p.kind==='integer')assert.equal(raw,r.raw,r.channel+' '+r.param);
  const shown=/^-?\d+(?:\.(\d+))?/.exec(r.shown),d=decodeValue(p,raw);
  if(p.kind==='enum')assert.equal(d.toLowerCase(),r.shown.toLowerCase());else assert.equal(d.toFixed((shown[1]??'').length),shown[0],r.param+' '+d);
}
for(let i=0;i<b0.length;i++)if(!changed.has(i))assert.equal(b1[i],b0[i],'collateral byte '+i);
assert.equal(b1.readUInt16LE(header),2);
const copies=readControllers(b1);assert.deepEqual(copies.map(c=>c.channel),['A','B','C','D']);
assert.equal(copies[1].words[controllersParam('SCENE1_VAL1').param],receipt.editorReadings.find(r=>r.channel==='B').raw);
assert.equal(out.report.controllers.length,29);assert.equal(out.report.stages.controllers.writes,29);assert.equal(out.report.generator,'fm3-sound-0.3.71');
assert.match(out.txt,/CONTROLLERS \(Control plokk/);assert.match(out.txt,/A Rate \(CONTROLLERS_LFO1FREQ\) = 2\.5/);
// Without controllers the output is unchanged by the 0.3.50 stage.
assert.equal(plain.report.controllers,undefined);assert.doesNotMatch(plain.txt,/CONTROLLERS \(/);
// Grid mode uses the same record.
const grid=composeSound(base,{composer,grid:{rows:[Array(12).fill(''),['in1','compressor','drive','-','amp','cab','-','-','-','-','-','send'],['return','delay','-','-','reverb','-','-','-','-','-','-','out1'],Array(12).fill('')]},
  controllers:[{channel:'D',param:'MANUAL3',value:70}]});
assert.equal(readControllers(body(grid.syx))[3].words[controllersParam('MANUAL3').param],Math.round(0.7*65534));
const refuse=[[{channel:'A',param:'TEMPOTOUSE',value:0},/Tempo To Use/],[{channel:'A',param:'TEMPO',value:120},/tempo field/],[{channel:'A',param:'ADSR2_YMARK',value:1},/not writable/],
  [{channel:'A',param:'LFO2TYPE',value:'Wobble'},/unknown option/],[{channel:'A',param:'DISTORT_GAIN',value:1},/Unknown parameter/],[{channel:'A',param:130,value:1},/Unknown parameter|Not a Controllers/],
  [{channel:'A',param:'LFO1DEPTH',value:101},/outside/],[{channel:'a',param:'LFO1DEPTH',value:1},/Channel/],[{channel:'A',param:'LFO1DEPTH'},/value/]];
for(const [w,re] of refuse)assert.throws(()=>composeSound(base,{composer,layout,controllers:[w]}),re,JSON.stringify(w));
assert.throws(()=>composeSound(base,{composer,layout,controllers:[]}),/1…64/);
// Saved bundle: fm3-preset.mjs writes and verifies the four outputs; tampering with a Controllers word, the report,
// the text section or the requested value is refused.
const bspec={composer,layout,allow:['enum-labels'],controllers:[{channel:'A',param:'MANUAL1',value:40},{channel:'C',param:'LFO2TYPE',value:'Square'}]};
const good=createPreset(base,bspec),parsed=inspectStructure(good.syx),gb=Buffer.from(parsed.raw.body),m1=good.report.controllers[0];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-controllers-'));
try{
  const stem=path.join(dir,'good');writePresetOutputs(stem,good,bspec);verifyPresetOutputs(stem);
  const tamper=[['stored word',r=>r.body.writeUInt16LE(m1.raw+1,m1.offset),/Final Controllers word differs/],
    ['report display',r=>{r.report.controllers[0].display=41;},/Final Controllers display differs/],
    ['report dropped',r=>{delete r.report.controllers;},/Final Controllers count differs/],
    ['text section',r=>{r.txt=r.txt.replace('A Manual 1 (CONTROLLERS_MANUAL1) = 40','A Manual 1 (CONTROLLERS_MANUAL1) = 41');},/Final TXT/],
    ['requested value',r=>{r.spec.controllers[0].value=50;},/Final Controllers word differs/],
    ['spec dropped',r=>{delete r.spec.controllers;},/Controllers report without spec/]];
  for(const [i,[name,mutate,error]] of tamper.entries()){
    const r={...good,report:structuredClone(good.report),body:Buffer.from(gb),spec:structuredClone(bspec)};mutate(r);
    r.syx=Buffer.from(reencodeDumpFromRawPatch(good.syx,reencodeRawPatch(parsed.raw.rawPatch,r.body)));r.report.outputSha256=sha256(r.syx);r.report.bytes=r.syx.length;
    const target=path.join(dir,String(i));writePresetOutputs(target,r,r.spec);assert.throws(()=>verifyPresetOutputs(target),error,name);
  }
  // Global scale observations re-render the text; the Controllers section must stay and the bundle must verify.
  const ev=path.join(dir,'SYNTHETIC-observations.json');
  execFileSync('python3',[fileURLToPath(new URL('./global-scale-collector/test_global_scale_decode.py',import.meta.url)),'--fixture',ev]);
  const ospec=JSON.parse(fs.readFileSync(new URL('../examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json',import.meta.url)));
  ospec.composer.name='CTRL GLOBAL OBS';ospec.composer.pitchChannels=[{channel:'A',type:'Custom Shifter'}];
  ospec.layout={row2:['drive','phaser','amp','cab'],row3:['pitch','delay','reverb']};
  ospec.controls=[{block:'pitch',channel:'A',param:'CUSTOMSCALE1',value:'SCALE 1'}];ospec.controllers=[{channel:'A',param:'MANUAL2',value:55}];
  const obs=createPreset(base,ospec,{globalScaleObservations:loadGlobalScaleObservations(ev)});
  assert.match(obs.txt,/A Manual 2 \(CONTROLLERS_MANUAL2\) = 55/);
  const ostem=path.join(dir,'obs');writePresetOutputs(ostem,obs,ospec);verifyPresetOutputs(ostem);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
const cap=controllersCapabilities();assert.equal(cap.hardwareReceipt.editorReadings,29);assert.equal(cap.parameters,130);
console.log(JSON.stringify({passed:true,readingsReplayed:29,refusals:refuse.length+1,changedBytesOnly:true,bundleRoundTrip:true}));

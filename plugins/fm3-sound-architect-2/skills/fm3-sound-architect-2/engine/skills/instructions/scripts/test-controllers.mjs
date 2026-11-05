// Controllers writes (0.3.50, T28): the composer writes the prefix Controllers record (effect id 2) and nothing else.
// Replays the 29 hardware/editor readings of references/fm3-shot-t28-controllers-20261105.json through spec.controllers:
// the same display values give the same stored words at word = pid in copy = channel, and decode to the shown value.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {composeSound} from './fm3-sound.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {CONTROLLERS_RECORD,readControllers,controllersCapabilities,controllersParam} from './fm3-controllers.mjs';
import {findParam,decodeValue} from './fm3-table-encoder.mjs';
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const receipt=JSON.parse(fs.readFileSync(new URL('../references/fm3-shot-t28-controllers-20261105.json',import.meta.url)));
const composer={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'CTRL TEST',compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const layout={row2:['compressor','drive','amp','cab'],row3:['delay','reverb']};
const body=syx=>Buffer.from(inspectStructure(syx).raw.body);
const plain=composeSound(base,{composer,layout}),b0=body(plain.syx);
const value=r=>{const p=findParam('CONTROLLERS',r.param);return p.kind==='enum'?r.shown:Number(/^-?[\d.]+/.exec(r.shown)[0]);};
assert.equal(receipt.editorReadings.length,29);
const controllers=receipt.editorReadings.map(r=>({channel:r.channel,param:r.param,value:value(r)}));
const out=composeSound(base,{composer,layout,allow:['enum-labels'],controllers}),b1=body(out.syx);
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
assert.equal(out.report.controllers.length,29);assert.equal(out.report.stages.controllers.writes,29);assert.equal(out.report.generator,'fm3-sound-0.3.50');
assert.match(out.txt,/CONTROLLERS \(Control plokk/);assert.match(out.txt,/A Rate \(CONTROLLERS_LFO1FREQ\) = 2\.5/);
// Without controllers the output is unchanged by the 0.3.50 stage.
assert.equal(plain.report.controllers,undefined);assert.doesNotMatch(plain.txt,/CONTROLLERS \(/);
// Grid mode uses the same record.
const grid=composeSound(base,{composer,grid:{rows:[Array(12).fill(''),['in1','compressor','drive','-','amp','cab','-','-','-','-','-','send'],['return','delay','-','-','reverb','-','-','-','-','-','-','out1'],Array(12).fill('')]},
  controllers:[{channel:'D',param:'MANUAL3',value:70}]});
assert.equal(readControllers(body(grid.syx))[3].words[controllersParam('MANUAL3').param],Math.round(0.7*65534));
const refuse=[[{channel:'A',param:'TEMPOTOUSE',value:0},/Tempo To Use/],[{channel:'A',param:'TEMPO',value:120},/not writable/],[{channel:'A',param:'ADSR2_YMARK',value:1},/not writable/],
  [{channel:'A',param:'LFO2TYPE',value:'Sine'},/not writable/],[{channel:'A',param:'DISTORT_GAIN',value:1},/Unknown parameter/],[{channel:'A',param:130,value:1},/Unknown parameter|Not a Controllers/],
  [{channel:'A',param:'LFO1DEPTH',value:101},/outside/],[{channel:'a',param:'LFO1DEPTH',value:1},/Channel/],[{channel:'A',param:'LFO1DEPTH'},/value/]];
for(const [w,re] of refuse)assert.throws(()=>composeSound(base,{composer,layout,controllers:[w]}),re,JSON.stringify(w));
assert.throws(()=>composeSound(base,{composer,layout,controllers:[]}),/1…64/);
const cap=controllersCapabilities();assert.equal(cap.hardwareReceipt.editorReadings,29);assert.equal(cap.parameters,130);
console.log(JSON.stringify({passed:true,readingsReplayed:29,refusals:refuse.length+1,changedBytesOnly:true}));

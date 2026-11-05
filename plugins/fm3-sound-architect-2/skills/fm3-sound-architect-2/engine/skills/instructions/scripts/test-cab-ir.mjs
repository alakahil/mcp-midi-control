// Legacy Cab IR numbers (0.3.53, T31): controls with block "cab" write Cab 1/2 Bank and IR # on Legacy channels.
// Replays the T31 reading of references/fm3-shot-t31-cab-cpu-20261105.json: Bank FACTORY 1 # 18 and Bank FACTORY 2
// # 201 give exactly the Cab channel A words of the CB1 preset the FM3 held (stored 17 and 200). Writes to a
// Dyna-Cab channel, # outside 1..1024 and unknown banks are refused.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {composeSound} from './fm3-sound.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {findParam,decodeValue} from './fm3-table-encoder.mjs';
import {cabIrCapabilities,CAB_IR} from './fm3-cab-ir.mjs';
import {getParameterMap} from './fm3-parameter-map.mjs';
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const receipt=JSON.parse(fs.readFileSync(new URL('../references/fm3-shot-t31-cab-cpu-20261105.json',import.meta.url)));
const composer={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'CAB IR TEST',compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const layout={row2:['compressor','drive','amp','cab'],row3:['delay','reverb']};
const body=syx=>Buffer.from(inspectStructure(syx).raw.body);
const cab=b=>scanRecords(b).records.find(r=>r.family==='cab');
const t1=findParam('cab','TYPE1'),b1=findParam('cab','BANK1');
assert.equal(t1.kind,'integer');assert.equal(t1.status,'measured');assert.equal(t1.displayOffset,1);assert.equal(b1.status,'enum-labels-crosschecked');
assert.equal(decodeValue(t1,17),18);assert.equal(decodeValue(t1,0),1);assert.equal(decodeValue(t1,1023),1024);
const plain=composeSound(base,{composer,layout}),b0=body(plain.syx),r0=cab(b0);
assert.equal(b0.readUInt16LE(r0.start+2*CAB_IR.modePid),0,'composer Cab channel A is Legacy');
// T31 readings: value as FM3-Edit showed it -> the stored word the FM3 held.
const shown=receipt.cab.editor;
const controls=[{param:'BANK1',value:shown.CABINET_BANK1},{param:'TYPE1',value:Number(shown.CABINET_TYPE1)},{param:'BANK2',value:shown.CABINET_BANK2},{param:'TYPE2',value:Number(shown.CABINET_TYPE2)}].map(c=>({block:'cab',channel:'A',...c}));
const out=composeSound(base,{composer,layout,controls}),b=body(out.syx),r=cab(b),changed=new Set();
for(const x of receipt.cab.readings){const off=r.start+2*x.pid;changed.add(off);changed.add(off+1);assert.equal(b.readUInt16LE(off),x.raw,x.param);}
for(let i=0;i<b0.length;i++)if(!changed.has(i))assert.equal(b[i],b0[i],'collateral byte '+i);
assert.match(out.txt,/cab A Type \(CABINET_TYPE1\): 18/);
// Refusals.
const refuse=[[{block:'cab',channel:'B',param:'TYPE1',value:18},/Dyna-Cab channel/],[{block:'cab',channel:'D',param:'BANK2',value:'USER'},/Dyna-Cab channel/],
  [{block:'cab',channel:'A',param:'TYPE1',value:0},/1…1024/],[{block:'cab',channel:'A',param:'TYPE2',value:1025},/1…1024/],
  [{block:'cab',channel:'A',param:'TYPE1',value:18.5},/integer/],[{block:'cab',channel:'A',param:'BANK1',value:'FACTORY 3'},/unknown option/]];
for(const [c,re] of refuse)assert.throws(()=>composeSound(base,{composer,layout,controls:[c]}),re,JSON.stringify(c));
const cap=cabIrCapabilities();assert.equal(cap.hardwareReceipt.readings,4);
// The public parameter map advertises the same # range the writer accepts (1..1024, stored 0..1023).
for(const n of ['TYPE1','TYPE2']){const sc=getParameterMap('cab',n).parameters[0].effective.scale;
  assert.deepEqual(sc.numericInputRange,[1,1024],n+' map range');assert.deepEqual(sc.storedDomain.logicalRange,[0,1023]);assert.equal(sc.storedDomain.displayOffset,1);}
console.log(JSON.stringify({passed:true,readingsReplayed:receipt.cab.readings.length,refusals:refuse.length,changedBytesOnly:true}));

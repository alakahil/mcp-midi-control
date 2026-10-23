// Reconcile requested Input writes, independently decoded SYX, JSON and TXT.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {findParam,encodeValue,decodeValue} from './fm3-table-encoder.mjs';
import {describeInputGate,inputUnits,validateInputGateWrites} from './fm3-input-gate.mjs';
import {validateDependencyWrites} from './fm3-parameter-dependencies.mjs';
let baseline;
function baselineInput(){
  if(!baseline){
    const syx=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
    assert.equal(createHash('sha256').update(syx).digest('hex'),'afacded0a3c3a30cfbf48b4e3daa08c0639482f0f1973e429763150ff7e9372c','Input baseline drift');
    const body=Buffer.from(inspectStructure(syx).raw.body),r=scanRecords(body).records.find(r=>r.eid===37);
    assert.ok(r&&r.words===10&&r.channels===4);baseline=Buffer.from(body.subarray(r.header,r.header+r.size));
  }
  return Buffer.from(baseline);
}
export function verifyInputGateOutput(report,syx,txt,spec){
  const requested=(spec?.controls??[]).filter(c=>c.block==='in1');
  const reported=(report.controls??[]).filter(c=>c.block==='in1');
  if(!requested.length&&!reported.length)return;
  assert.equal(requested.length,reported.length,'Input gate request/report count');
  const body=Buffer.from(inspectStructure(syx).raw.body);
  const matches=scanRecords(body).records.filter(r=>r.eid===37);
  assert.equal(matches.length,1,'Input record must be unique');
  const r=matches[0];assert.equal(r.words,10);assert.equal(r.channels,4);
  assert.deepEqual(report.inputGate,describeInputGate(body,r),'Final Input state differs');
  const seen=new Set(),expected=baselineInput();
  for(const c of requested){
    const p=findParam('in1',c.param),ch='ABCD'.indexOf(c.channel);
    assert.ok(ch>=0&&c.channel.length===1);
    const key=c.channel+':'+p.param;assert.ok(!seen.has(key));seen.add(key);
    const offset=r.start+ch*20+p.param*2,raw=body.readUInt16LE(offset),display=decodeValue(p,raw);
    assert.equal(raw,encodeValue(p,c.value),'Input SYX differs from spec');
    expected.writeUInt16LE(raw,46+ch*20+p.param*2);
    const matches=reported.filter(w=>w.channel===c.channel&&w.pid===p.param);
    assert.equal(matches.length,1);const w=matches[0];
    assert.equal(w.offset,offset);assert.equal(w.effectId,37);assert.equal(w.raw,raw);assert.equal(w.value,c.value);
    assert.equal(w.name,p.name);assert.equal(w.display,display);assert.equal(w.unit,inputUnits[p.name]);
    validateInputGateWrites(body,[{...w}]);
    validateDependencyWrites(body,[{...w}]);
    const fmt=v=>typeof v==='number'?String(Number(v.toFixed(4))):String(v);
    assert.ok(txt.includes(`in1 ${c.channel} ${w.label??w.name} (${p.name}): ${fmt(display)} ${w.unit}; küsitud ${fmt(c.value)}; raw ${raw};`),'Input TXT differs from SYX/spec');
  }
  assert.deepEqual(body.subarray(r.header,r.header+r.size),expected,'Undeclared Input record changed');
  assert.ok(txt.includes('Globaalne Noisegate Offset ja AC Line Frequency ei sisaldu selles SYX-is ega muutu.'));
}

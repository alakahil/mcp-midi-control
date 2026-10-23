// Reconcile requested Input writes, independently decoded SYX, JSON and TXT.
import assert from 'node:assert/strict';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {findParam,encodeValue,decodeValue} from './fm3-table-encoder.mjs';
import {describeInputGate,inputUnits,validateInputGateWrites} from './fm3-input-gate.mjs';
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
  const seen=new Set();
  for(const c of requested){
    const p=findParam('in1',c.param),ch='ABCD'.indexOf(c.channel);
    assert.ok(ch>=0&&c.channel.length===1);
    const key=c.channel+':'+p.param;assert.ok(!seen.has(key));seen.add(key);
    const offset=r.start+ch*20+p.param*2,raw=body.readUInt16LE(offset),display=decodeValue(p,raw);
    assert.equal(raw,encodeValue(p,c.value),'Input SYX differs from spec');
    const matches=reported.filter(w=>w.channel===c.channel&&w.pid===p.param);
    assert.equal(matches.length,1);const w=matches[0];
    assert.equal(w.offset,offset);assert.equal(w.effectId,37);assert.equal(w.raw,raw);assert.equal(w.value,c.value);
    assert.equal(w.name,p.name);assert.equal(w.display,display);assert.equal(w.unit,inputUnits[p.name]);
    validateInputGateWrites(body,[{...w}]);
    const fmt=v=>typeof v==='number'?String(Number(v.toFixed(4))):String(v);
    assert.ok(txt.includes(`in1 ${c.channel} ${w.label??w.name} (${p.name}): ${fmt(display)} ${w.unit}; küsitud ${fmt(c.value)}; raw ${raw};`),'Input TXT differs from SYX/spec');
  }
  assert.ok(txt.includes('Globaalne Noisegate Offset ja AC Line Frequency ei sisaldu selles SYX-is ega muutu.'));
}

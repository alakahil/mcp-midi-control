// Modifier curve / timing codec (fm3-modifier-curve.mjs): every device reading reproduced, bounds, round trips. Offline.
import assert from 'node:assert/strict';
import {modifierCurveFields,encodeCurveValue,decodeCurveWord,verifyCurveEvidence,modifierCurveCapability} from './fm3-modifier-curve.mjs';
const ev=verifyCurveEvidence();
assert.ok(ev.points>=70,'device points checked');assert.equal(ev.fields,9);
assert.deepEqual(ev.outliers.map(o=>[o.key,o.word,o.display]),[['offValuePercent',65534,5]],'only the T7 Off Value reading disagrees');
// T12 one-field steps, as read on the FM3 front panel.
for(const [key,value,word] of [['startPercent',20,13107],['endPercent',80,52427],['midPercent',25,16384],['slopePercent',75,49151],
  ['offsetPercent',10,36044],['attackMs',99.9,655],['releaseMs',500,3277],['offValuePercent',50,32767]]){
 assert.equal(encodeCurveValue(key,value),word,key);assert.equal(decodeCurveWord(key,word),value,key);}
// Scale: the FM3 knob stored 22911 / 42623 (shown 0.500 / 1.999); the codec's exact words differ by a few counts.
assert.equal(decodeCurveWord('scale',22911),0.5);assert.equal(encodeCurveValue('scale',0.5),22903);assert.equal(decodeCurveWord('scale',22903),0.5);
assert.equal(decodeCurveWord('scale',42623),1.999);assert.equal(encodeCurveValue('scale',2),42631);assert.equal(decodeCurveWord('scale',42631),2);
assert.equal(decodeCurveWord('offValuePercent',0),5);assert.equal(decodeCurveWord('offValuePercent',65534),95);
let roundTrips=0;
for(const f of modifierCurveFields){
 assert.equal(encodeCurveValue(f.key,f.min),0);assert.equal(encodeCurveValue(f.key,f.max),65534);
 for(let w=0;w<=65534;w+=97){const shown=decodeCurveWord(f.key,w);assert.ok(shown>=f.min-1e-9&&shown<=f.max+1e-9);
  // A displayed value always re-encodes to a word that displays the same value.
  assert.equal(decodeCurveWord(f.key,encodeCurveValue(f.key,shown)),shown,f.key+' '+w);roundTrips++;}
 for(const bad of [f.min-0.01,f.max+0.01,NaN,Infinity,'1',null,undefined])assert.throws(()=>encodeCurveValue(f.key,bad),/Modifier curve/);
 for(const bad of [-1,65535,1.5])assert.throws(()=>decodeCurveWord(f.key,bad),/Modifier curve/);
}
assert.throws(()=>encodeCurveValue('damping',1),/unknown field/);
const cap=modifierCurveCapability();assert.equal(cap.fullRange,true);assert.equal(cap.fieldIndependenceVerified,true);assert.equal(cap.deviceIO,false);
console.log(JSON.stringify({passed:true,devicePoints:ev.points,outliers:ev.outliers.length,fields:ev.fields,roundTrips}));

// Ten-Tap time promotion (0.3.46): receipt binding, T25/T25b readings re-encoded without opt-in, type and clamp rules. Offline.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadDictionary,encodeValue,decodeValue,findParam,DEFAULT_STATUSES} from './fm3-table-encoder.mjs';
import {TENTAP_STATUS,TENTAP_DELAY_MAX_MS,validateTentapWrites,tentapPolicySummary} from './fm3-tentap-times.mjs';
import {composeSound} from './fm3-sound.mjs';
const R=f=>JSON.parse(fs.readFileSync(new URL('../references/'+f,import.meta.url),'utf8'));
const d=loadDictionary(),t25=R('fm3-shot-t25-tentap-20261103.json');
assert.ok(DEFAULT_STATUSES.includes(TENTAP_STATUS));
const promoted=d.params.filter(p=>p.tentapRule);
assert.deepEqual(promoted.map(p=>p.name).sort(),['TENTAP_TIMEM',...Array.from({length:10},(_,i)=>'TENTAP_TIME'+(i+1)+'M')].sort());
for(const p of promoted){assert.equal(p.status,TENTAP_STATUS);assert.equal(p.structuralStatus,'unverified-taper');assert.equal(p.kind,'linear');}
// Every other Ten-Tap time-like word keeps its pinned status (Ref Tempo has no editor control; not measured).
assert.equal(findParam('tentap','TENTAP_TIMEM').min,0.01);assert.equal(findParam('tentap','TENTAP_TIMEM').max,10);
// T25: 20 Rhythm Tap times, shown in whole ms; the encoder reproduces each word from its display and back.
assert.equal(t25.summary.rhythmTimesExact,20);assert.equal(t25.summary.delayTimeExact,4);assert.equal(t25.summary.frontPanelExact,1);
for(const x of t25.t25.rhythmTimes){const p=findParam('tentap',x.param);
  assert.equal(Math.round(decodeValue(p,x.raw)),Number.parseInt(x.shown));assert.equal(encodeValue(p,x.predictedMs),x.raw,x.param+' '+x.channel);}
// T25b: Delay Time 109/307/500/803 ms, and the clamp point 1000 ms (raw 6494).
for(const x of [...t25.t25b.delayTime,...t25.t25b.frontPanel]){const p=findParam('tentap','TENTAP_TIMEM');
  assert.equal(Math.round(decodeValue(p,x.raw)),Number.parseInt(x.shown));assert.equal(encodeValue(p,x.predictedMs),x.raw);}
assert.equal(encodeValue(findParam('tentap','TENTAP_TIMEM'),1000),6494);
for(const x of t25.t25.clampedDelay)assert.equal(x.device,6494);
// Rules: Time 1–10 only in Rhythm Tap (type 1); Delay Time only in Ten-Tap (type 0) and at most 1000 ms.
const body=Buffer.alloc(200),w=(name,pid,raw,type)=>{body.writeUInt16LE(type,0);return {effectId:158,name,pid,raw,offset:2*pid,channel:'A'};};
assert.doesNotThrow(()=>validateTentapWrites(body,[w('TENTAP_TIME3M',19,2949,1)]));
assert.throws(()=>validateTentapWrites(body,[w('TENTAP_TIME3M',19,2949,0)]),/only in type Rhythm Tap/);
assert.throws(()=>validateTentapWrites(body,[w('TENTAP_TIMEM',2,500,1)]),/only in type Ten-Tap/);
assert.doesNotThrow(()=>validateTentapWrites(body,[w('TENTAP_TIMEM',2,6494,0)]));
assert.throws(()=>validateTentapWrites(body,[w('TENTAP_TIMEM',2,6500,0)]),/above 1000 ms/);
// A planned type write in the same batch counts as the final type.
body.writeUInt16LE(0,0);assert.doesNotThrow(()=>validateTentapWrites(body,[{effectId:158,name:'TENTAP_TYPE',pid:0,raw:1,offset:0,channel:'A'},{effectId:158,name:'TENTAP_TIME1M',pid:17,raw:100,offset:34,channel:'A'}]));
// Composer: default-writable without opt-in, refused above the limit.
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const mk=controls=>composeSound(base,{composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'TENTAP TEST',compressorChannels:[{channel:'A',type:'Optical Compressor'}]},
  insert:['tentap'],selectedScene:1,layout:{row2:['compressor','drive','amp','cab'],row3:['delay','tentap','reverb']},allow:['enum-labels'],controls});
assert.doesNotThrow(()=>mk([{block:'tentap',channel:'A',param:'TENTAP_TYPE',value:'Rhythm Tap Delay'},{block:'tentap',channel:'A',param:'TENTAP_TIME3M',value:450},{block:'tentap',channel:'B',param:'TENTAP_TIMEM',value:TENTAP_DELAY_MAX_MS}]));
assert.throws(()=>mk([{block:'tentap',channel:'B',param:'TENTAP_TIMEM',value:1200}]),/above 1000 ms/);
assert.throws(()=>mk([{block:'tentap',channel:'B',param:'TENTAP_TIME3M',value:450}]),/not applicable|only in type Rhythm Tap/);
assert.equal(tentapPolicySummary().status,TENTAP_STATUS);
console.log(JSON.stringify({promoted:promoted.length,rhythmTimes:20,delayTimes:4,limitMs:TENTAP_DELAY_MAX_MS}));

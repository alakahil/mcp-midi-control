// FM3 Ten-Tap time scales (0.3.46, 2026-11-03). Offline only.
// T25/T25b (FM3 Mk II, FW13; references/fm3-shot-t25-tentap-20261103.json) wrote Ten-Tap time words through the
// edit buffer, read every word back with fn=0x1F and read the controls from FM3-Edit and the front panel:
//   Time 1–10 (TENTAP_TIMEnM, flags 0x0f00) exist only in type 'Rhythm Tap Delay' (Taps page). Linear 0…10 s,
//     shown in whole ms: 20/20 exact (11.7…9000 ms). In type 'Ten-Tap Delay' the device derives them from
//     Delay Time when a channel becomes active (stored words are overwritten), so they are refused there.
//   Delay Time (TENTAP_TIMEM, Config page, type 'Ten-Tap Delay') is linear 0.01…10 s, not the pinned dictionary's
//     0.001…2 s: raw 650/1950/3214/5200 shown 109/307/500/803 ms (4/4 exact, front panel 803 ms), and the derived
//     tap words 715/2014/3276/5260 equal Delay Time on the 0…10 s tap scale. With 10 taps the device clamped
//     raw 16384/40000 to 6494 (1000 ms); 1000 ms held. Writes are therefore limited to 10…1000 ms (safe under
//     both 'max = 10 s / taps' and a fixed 1000 ms limit) and refused in type 'Rhythm Tap Delay'.
// Both move from 'unverified-taper' to 'measured'. The type applicability policy still applies.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
export const TENTAP_RECEIPT='fm3-shot-t25-tentap-20261103.json';
export const tentapReceiptHash='bc90c49ff5c4371380269c8190966e775cd24cd86eb7f8e8f32bb0c3681d4dc1';
const receiptBytes=fs.readFileSync(new URL('../references/'+TENTAP_RECEIPT,import.meta.url));
if(createHash('sha256').update(receiptBytes).digest('hex')!==tentapReceiptHash)throw Error('Ten-Tap receipt changed; run tools/fm3/shot-t25-ingest.mjs and review');
const receipt=JSON.parse(receiptBytes);
if(receipt.summary.rhythmTimesExact!==20||receipt.summary.delayTimeExact!==4)throw Error('Ten-Tap receipt does not support the promotion');
export const TENTAP_STATUS='measured';
export const TENTAP_DELAY_MAX_MS=1000;
const TYPE={ten:0,rhythm:1},TIMES=new Set(Array.from({length:10},(_,i)=>'TENTAP_TIME'+(i+1)+'M'));
const EVIDENCE={times:'T25 2026-11-03: Rhythm Tap Time 1–10 written at 20 off-grid values, read back exactly (fn=0x1F) and shown in FM3-Edit exactly (linear 0…10 s, whole ms)',
  delay:'T25b 2026-11-03: Delay Time raw 650/1950/3214/5200 shown 109/307/500/803 ms (linear 0.01…10 s), front panel 803 ms; derived tap words match; 10 taps clamp raw 16384/40000 to 1000 ms'};
export function effectiveTentapParameter(p){
  if(p.family!=='TENTAP'||p.status!=='unverified-taper')return p;
  if(TIMES.has(p.name)){
    if(p.kind!=='class-f'||p.min!==0||p.max!==10||p.displayMultiplier!==1000||p.flags!=='0x0f00')throw Error('Ten-Tap time binding mismatch: '+p.name);
    return {...p,kind:'linear',status:TENTAP_STATUS,structuralStatus:p.status,structuralKind:p.kind,tentapRule:'rhythm-time',tentapEvidence:EVIDENCE.times};
  }
  if(p.name==='TENTAP_TIMEM'){
    if(p.kind!=='class-0'||p.param!==2||p.max!==2||p.displayMultiplier!==1000)throw Error('Ten-Tap delay binding mismatch');
    return {...p,kind:'linear',min:0.01,max:10,dictionaryRange:[p.min,p.max],status:TENTAP_STATUS,structuralStatus:p.status,structuralKind:p.kind,tentapRule:'delay-time',writableMaxMs:TENTAP_DELAY_MAX_MS,tentapEvidence:EVIDENCE.delay};
  }
  return p;
}
// Writes: [{effectId,name,pid,offset,raw,value,channel}]; body = record words before the writes.
export function validateTentapWrites(body,writes){
  const planned=new Map(writes.map(w=>[w.offset,w.raw]));
  for(const w of writes){
    if(w.effectId!==158||!(TIMES.has(w.name)||w.name==='TENTAP_TIMEM'))continue;
    const at=w.offset-2*w.pid,type=planned.get(at)??body.readUInt16LE(at);
    if(TIMES.has(w.name)&&type!==TYPE.rhythm)throw Error(`tentap ${w.channel} ${w.name}: only in type Rhythm Tap Delay (Ten-Tap Delay derives the tap times from Delay Time)`);
    if(w.name==='TENTAP_TIMEM'){
      if(type!==TYPE.ten)throw Error(`tentap ${w.channel} TENTAP_TIMEM: only in type Ten-Tap Delay`);
      const ms=10+w.raw*9990/65534;
      if(ms>TENTAP_DELAY_MAX_MS+0.5)throw Error(`tentap ${w.channel} Delay Time: ${Math.round(ms)} ms above ${TENTAP_DELAY_MAX_MS} ms (device clamps longer Delay Time with many taps)`);
    }
  }
}
export function tentapPolicySummary(){return {receipt:TENTAP_RECEIPT,sha256:tentapReceiptHash,status:TENTAP_STATUS,times:'Rhythm Tap only, linear 0…10 s',delay:'Ten-Tap only, linear 0.01…10 s, writable 10…'+TENTAP_DELAY_MAX_MS+' ms'};}

// FM3 preset storage overlay, deliberately independent of live MIDI SET encoding.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
export const pitchWordCodecHash='187d64b322f8ca1b3e277f24e63770b19cc3169f15d643929d86a67e38e51a74';
const bytes=fs.readFileSync(new URL('../references/fm3-pitch-word-codecs.json',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==pitchWordCodecHash)throw Error('Pitch word codecs changed; review and regenerate');
const receipt=JSON.parse(bytes),byPid=new Map(receipt.fields.map(f=>[f.pid,f]));
export function effectivePitchParameter(p){
 const f=p.family==='PITCH'?byPid.get(p.param):null;if(!f)return p;
 if(JSON.stringify(p)!==JSON.stringify(f.original))throw Error('Pitch codec original dictionary mismatch: '+p.name);
 return {...p,...f.effective,encodingEvidence:pitchWordCodecHash};
}
export function validPitchStoredWord(p,raw){
 if(!p.encodingEvidence)return true;
 if(!Number.isInteger(raw)||raw<0||raw>65535)return false;
 const v=p.signedWord&&raw>=32768?raw-65536:raw;
 return v>=p.min&&v<=p.max;
}
export const pitchWordCodecSummary=()=>({sha256:pitchWordCodecHash,fields:27,signedFields:20,countFields:5,nonzeroEnums:2,scope:receipt.scope,numericEnumInput:receipt.numericEnumInput,limits:receipt.limits});

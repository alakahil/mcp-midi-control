// Fixed-base, paired full-channel CAB templates. No device I/O.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspect} from './fm3-prototype.mjs';
import {inspectStructure} from './cab-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=fs.readFileSync(new URL('../lookup/cab-library.json',import.meta.url));
check(sha(bytes)==='887cc3220cdc46ded15e8fc8daf4c3c014b7aee9118fba8b54545484ad5e6b0f','CAB registry checksum mismatch');
const library=JSON.parse(bytes);
check(library.schemaVersion===1&&library.firmware===13&&library.channelWords===106&&library.templates.length===45,'Unsupported CAB registry');
export const cabNames=Object.freeze(library.templates.map(t=>t.name));
export function resolveCab(name){
 const t=library.templates.find(t=>t.name===name);
 check(typeof name==='string'&&t,'Unknown cabModelB');
 check(/^[0-9a-f]{424}$/.test(t.rawHex),'Invalid CAB template bytes');
 const raw=Buffer.from(t.rawHex,'hex');
 check(sha(raw)===t.sha256&&t.source.matchedWords===424,'CAB template evidence mismatch');
 check(raw.readUInt16LE(62)===1&&raw.readUInt16LE(170)===t.expectedId&&raw.readUInt16LE(172)===t.expectedId,'CAB template mode/IDs mismatch');
 return {...t,source:{...t.source},raw};
}
export function applyCab(body,spec,decoded){
 if(!Object.hasOwn(spec,'cabModelB'))return null;
 check(!Object.hasOwn(spec,'cabScene2'),'cabModelB and cabScene2 cannot be combined');
 const cab=decoded.blocks.find(b=>b.block==='Cab');
 check(body.length===14222&&cab?.offset===5820&&cab.params_offset===5866&&cab.cols===106&&cab.rows===4,'Unsupported CAB target layout');
 const t=resolveCab(spec.cabModelB);body.set(t.raw,6066);
 return {name:t.name,displayNumber:t.displayNumber,id:t.expectedId,targetChannel:'B',affectedScenes:cab.scene_channels.flatMap((c,i)=>c==='B'?[i+1]:[]),source:t.source,templateSha256:t.sha256,policy:library.policy,hardware:'not tested for generated output'};
}
export function inspectCabOutput(bytes,original,name){
 const out=inspectStructure(bytes),t=resolveCab(name),body=Buffer.from(out.raw.body);
 check(body.subarray(6066,6278).equals(t.raw),'Full CAB B readback mismatch');
 const cab=out.decoded.blocks.find(b=>b.block==='Cab');
 check(cab?.offset===5820&&cab.params_offset===5866&&cab.cols===106&&cab.rows===4,'CAB readback layout mismatch');
 // Generic findHeader can mistake ID37 for INPUT. Validate all other generated
 // changes using the original CAB B, and validate the real CAB against its
 // entire SHA-pinned paired template. The emitted bytes are never normalized.
 const projected=Buffer.from(body);projected.set(original.slice(6066,6278),6066);
 inspect(Buffer.from(reencodeDumpFromRawPatch(bytes,reencodeRawPatch(out.raw.rawPatch,projected))));
 return out;
}
export function cabReadback(out,name){
 const t=resolveCab(name),raw=Buffer.from(out.raw.body).subarray(6066,6278);
 check(raw.equals(t.raw),'CAB B template readback failed');
 return {channel:'B',mode:'DYNA-CAB',dynacab1_id:raw.readUInt16LE(170),dynacab2_id:raw.readUInt16LE(172),dynacab1:t.name,dynacab2:t.name,displayNumber:t.displayNumber,templateSha256:t.sha256};
}

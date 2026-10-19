// Offline, append-only import of current-format amp templates into a separate registry.
// A registry must be explicitly supplied to the generator. Never alters a device.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {inspect,BASE_SHA256} from './fm3-prototype.mjs';
export const catalog=JSON.parse(fs.readFileSync(new URL('../lookup/amp-catalog.json',import.meta.url),'utf8'));
export const bundledLibrary=JSON.parse(fs.readFileSync(new URL('../lookup/amp-library.json',import.meta.url),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
export function importAmpLibrary(base,inputs,firmware){
 check(firmware===13,'Require explicitly confirmed firmware 13');check(sha(base)===BASE_SHA256,'Original base required');
 const original=inspect(base).raw.body,templates={},rejected=[],accepted=[];
 for(const input of inputs){
  const bytes=input.bytes;check(bytes.length>0&&bytes.length%24680===0,'Input must contain complete 24680-byte single presets or banks');
  for(let i=0;i<bytes.length;i+=24680){
   const preset=bytes.subarray(i,i+24680),entry={file:input.name,index:i/24680,sha256:sha(preset)};
   try{
    const v=inspect(preset),body=v.raw.body,amp=v.decoded.blocks.find(b=>b.block==='Amp');
    check(body.length===original.length&&amp?.cols===144&&amp.rows===4&&amp.params_offset===4668,'Unsupported Amp layout');
    // Known scene-channel selections are reviewed metadata, not channel dependencies.
    const ignoredSceneSelections=[];
    for(let scene=0;scene<8;scene++){const off=4620+scene*2;const value=body[off]|body[off+1]<<8;check(value<=3,'Invalid Amp scene channel');if(value!==(original[off]|original[off+1]<<8))ignoredSceneSelections.push({scene:scene+1,base:original[off],donor:value,action:'Not copied; output keeps base scene selection'});}
    entry.ignoredSceneSelections=ignoredSceneSelections;
    // Full preset outside all four Amp channels must match the known base.
    // This excludes unknown modifier/controller/routing dependencies instead of guessing them.
    for(let o=0;o<body.length;o++)if(!(o>=4656&&o<5808)&&!(o>=4620&&o<4636))check(body[o]===original[o]||(o===0&&[0,1].includes(body[o])),'Unreviewed non-Amp bytes at '+o);
    const staged={};
    for(let ch=0;ch<4;ch++){
     const raw=Buffer.from(body.slice(4656+ch*288,4656+(ch+1)*288)),id=raw.readUInt16LE(12),model=catalog.models.find(m=>m.id===id);
     check(model&&amp.channels['ABCD'[ch]]?.type_id===id&&amp.channels['ABCD'[ch]]?.type===model.name,'Unknown or inconsistent model '+id);
     const item={modelId:id,name:model.name,channelBytesHex:raw.toString('hex'),channelSha256:sha(raw),firmware:13,format:'0x0146',source:{...entry,channel:'ABCD'[ch],presetName:v.decoded.preset_name},validation:'current-format, same-base full-channel extraction; hardware selection not confirmed'};
     // Keep the first explicit donor per model; report subsequent variants without silent replacement.
     if(!staged[model.name])staged[model.name]=item;
    }
    // Commit only after every channel passes; rejected presets contribute no templates.
    for(const [name,item] of Object.entries(staged))if(!templates[name])templates[name]=item;
    accepted.push(entry);
   }catch(e){rejected.push({...entry,reason:e.message})}
  }
 }
 return {schemaVersion:1,baseSha256:BASE_SHA256,firmware:13,templates,accepted,rejected};
}
export function coverage(library=bundledLibrary){
 const rows=catalog.models.map(m=>({id:m.id,name:m.name,status:m.bundledTemplate?'bundled-template':Object.hasOwn(library.templates,m.name)?'imported-template':'missing-template'}));
 return {catalogEntries:rows.length,ready:rows.filter(m=>m.status!=='missing-template').length,missing:rows.filter(m=>m.status==='missing-template').length,completeness:catalog.completeness,models:rows};
}
export function resolveImportedTemplate(library,name){
 check(library?.schemaVersion===1&&library.firmware===13&&library.baseSha256===BASE_SHA256,'Incompatible amp library');
 const t=library.templates?.[name],m=catalog.models.find(m=>m.name===name);check(t&&m,'Missing verified channel template for '+name);
 check(t.firmware===13&&t.format==='0x0146'&&t.modelId===m.id&&t.name===name,'Template metadata mismatch');
 check(typeof t.channelBytesHex==='string'&&/^[0-9a-f]{576}$/.test(t.channelBytesHex),'Invalid template bytes');
 const raw=Buffer.from(t.channelBytesHex,'hex');check(raw.readUInt16LE(12)===m.id&&sha(raw)===t.channelSha256,'Template integrity mismatch');return {raw,source:t.source};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [command,...args]=process.argv.slice(2);if(command==='coverage'){const lib=args[0]?JSON.parse(fs.readFileSync(args[0],'utf8')):undefined;console.log(JSON.stringify(coverage(lib),null,2));}
 else if(command==='import'){const [base,out,firmware,...files]=args;check(base&&out&&firmware&&files.length,'Usage: import BASE OUTPUT.json 13 INPUT.syx ...');check(!fs.existsSync(out),'Output exists');const lib=importAmpLibrary(fs.readFileSync(base),files.map(f=>({name:path.basename(f),bytes:fs.readFileSync(f)})),Number(firmware));fs.writeFileSync(out,JSON.stringify(lib,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({accepted:lib.accepted.length,rejected:lib.rejected.length,templates:Object.keys(lib.templates).length}));}
 else throw Error('Use coverage [LIBRARY.json] or import BASE OUTPUT.json 13 INPUT.syx ...');}catch(e){console.error(e.message);process.exitCode=1}
}

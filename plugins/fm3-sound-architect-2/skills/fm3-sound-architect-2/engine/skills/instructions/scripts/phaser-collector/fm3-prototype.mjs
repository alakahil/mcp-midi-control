// FM3 Sound Architect offline prototype. No device/network access.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parsePresetDump,decodeRawPatch,computeRawPatchXor,authorGen3PresetFromIR,decodeGen3PresetDump,validateGen3Preset} from './fm3-codec.mjs';

export const BASE_SHA256='fecac6a61d3a33c547a12e69b5056fd8750f9ded789e44672744d2e32e29c2c4';
const sha=b=>createHash('sha256').update(b).digest('hex');
function requireTrue(ok,message){if(!ok)throw new Error(message);}
export function inspectStructure(bytes){
  requireTrue(bytes.length===24680,'Expected one 24680-byte FM3 preset');
  let at=0;const functions=[];
  while(at<bytes.length){
    requireTrue(bytes[at]===0xf0,'Invalid frame boundary');
    const end=bytes.indexOf(0xf7,at+1);requireTrue(end>at+6,'Incomplete frame');
    const f=bytes.subarray(at,end+1);requireTrue(f[1]===0&&f[2]===1&&f[3]===0x74&&f[4]===0x11,'Not an FM3 frame');
    requireTrue([...f.subarray(1,-1)].every(v=>v<128),'Non-7-bit frame data');
    requireTrue((f.subarray(0,-2).reduce((a,b)=>a^b,0)&127)===f[f.length-2],'Frame checksum mismatch');
    functions.push(f[5]);at=end+1;
  }
  requireTrue(functions.join(',')===[0x77,...Array(8).fill(0x78),0x79].join(','),'Unexpected frame sequence');
  const parsed=parsePresetDump(bytes,0,17),raw=decodeRawPatch(parsed.chunkPayloads);
  requireTrue(raw.rawPatch[0]===0x46&&raw.rawPatch[1]===1,'Unsupported preset format; expected 0x0146');
  requireTrue(raw.crcValid,'Preset CRC mismatch');
  requireTrue((parsed.footerPayload[0]|parsed.footerPayload[1]<<7|parsed.footerPayload[2]<<14)===computeRawPatchXor(raw.rawPatch),'Footer checksum mismatch');
  return {parsed,raw,decoded:decodeGen3PresetDump(bytes,17)};
}
export function inspect(bytes){
  const result=inspectStructure(bytes);
  const validation=validateGen3Preset(bytes,17);requireTrue(validation.ok,validation.issues.join('; '));
  return {...result,validation};
}

// Scope deliberately bounded to the user's independently exported fixtures.
export function generate(base,spec){
  requireTrue(sha(base)===BASE_SHA256,'Unrecognised base: use the bundled Baaspreset.syx unchanged');
  requireTrue(spec&&typeof spec==='object'&&!Array.isArray(spec),'Specification must be an object');
  requireTrue(Object.keys(spec).every(k=>['name','gainB','bassB'].includes(k)),'Unsupported specification field');
  requireTrue(typeof spec.name==='string'&&/^[ -~]{1,31}$/.test(spec.name),'Name must be 1–31 printable ASCII characters');
  requireTrue(spec.gainB!==undefined||spec.bassB!==undefined,'At least one supported change is required');
  for(const key of ['gainB','bassB'])if(spec[key]!==undefined)requireTrue([4,5,6,7].includes(spec[key]),key+' currently supports only 4, 5, 6, 7');
  const before=inspect(base);const params=[];const expected=before.raw.body.slice();
  for(const [key,pid,offset] of [['gainB',7,4958],['bassB',8,4960]]){
    if(spec[key]===undefined)continue;
    params.push({paramId:pid,normalized:spec[key]/10});
    const raw=Math.round(spec[key]/10*65534);expected[offset]=raw&255;expected[offset+1]=raw>>8;
  }
  const result=authorGen3PresetFromIR(base,{name:spec.name,blocks:[{family:'amp',instance:1,channel:'B',params}]},17);
  requireTrue(result.skipped.length===0,'Encoder skipped requested changes');
  requireTrue(result.written.length===1&&result.written[0].params.length===params.length,'Incomplete write report');
  const syx=Buffer.from(result.syx),after=inspect(syx);
  requireTrue(Buffer.from(expected).equals(Buffer.from(after.raw.body)),'Unexpected body changes');
  requireTrue(after.decoded.preset_name===spec.name,'Name readback mismatch');
  requireTrue(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
  for(let i=0;i<0x48;i++)if(i!==4&&i!==5&&!(i>=8&&i<40))requireTrue(before.raw.rawPatch[i]===after.raw.rawPatch[i],'Unrelated raw header changed');
  const amp=after.decoded.blocks.find(b=>b.block==='Amp');
  const scenes=amp.scene_channels.map((ch,i)=>ch==='B'?i+1:null).filter(Boolean);
  const report={prototype:'0.1.0',codec:'forgefx-midi 0.4.3 @ 553d24b7409302908d5c7e46a71b45e07dffdc05',spec,baseSha256:sha(base),outputSha256:sha(syx),bytes:syx.length,format:'0x0146',firmware:'unknown; format word is not firmware',ampChannel:'B',ampModel:amp.channels.B.type,affectedScenes:scenes,checks:{frameChecksums:true,presetCrc:true,footer:true,exactExpectedBody:true,unrelatedHeaderPreserved:true},hardwareImport:'not tested',audio:'not tested'};
  const txt=[
    'FM3 SOUND ARCHITECT — ARENDUSKATSE',`Preset: ${spec.name}`,
    'Sihtseade: FM3 / kasutaja FM3 Mk II Turbo. Firmware versioon vajab kasutaja kinnitust.',
    'Alus: kasutaja Baaspreset.syx (USA Mk IV), vormingusõna 0x0146.',
    `Muudetud Amp 1 kanal B (${amp.channels.B.type}):`,
    ...params.map(p=>p.paramId===7?`Gain = ${spec.gainB.toFixed(2)} / 10`:`Bass = ${spec.bassB.toFixed(2)} / 10`),
    `Kanalit B kasutavad selle aluse stseenid ${scenes.join(' ja ')}; muudatus mõjutab mõlemat.`,
    'Kõik muud lahtipakitud presetibaidid säilisid. Routing, Cab, efektid, kanalid ja stseeniseosed pärinevad alusfailist.',
    'Kitarr, ühendused, Cab/IR-sõltuvused, lülitid ja expression: säilitatud alusfailist, selles katses eraldi seadmel kinnitamata.',
    'Kontrollitud: kõik SysEx-kaadrid, CRC, footer, väärtuste tagasilugemine ja kõrvalmuudatuste puudumine.',
    'FM3 import, helisignaal, tasemed ja CPU: katsetamata. See ei ole valmis artistipreset.',
    '', 'KONTROLLIMPORT',
    '1. Säilita pooleliolev töö ja olemasolev preset. Ava FM3-Edit ühendatud FM3-ga.',
    '2. Impordi see üksik SYX Preset-menüü kaudu kontrollimiseks; ära kirjuta oma presetikohta üle.',
    `3. Vali Scene 2 ja Amp kanal B. Kontrolli ${params.map(p=>p.paramId===7?'Gain '+spec.gainB.toFixed(2):'Bass '+spec.bassB.toFixed(2)).join(', ')} ning kuula madalal helitugevusel.`,
    '4. Märgi üles firmware versioon. Kui import õnnestus, ekspordi preset FM3-Editist tagasi ja lisa fail vestlusse võrdluseks.',
    '',`SHA-256: ${report.outputSha256}`,'Tööriist ei ühenda seadet ega saada MIDI/SET-käske.'
  ].join('\n')+'\n';
  return {syx,txt,report};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const [baseFile,specFile,outStem]=process.argv.slice(2);requireTrue(baseFile&&specFile&&outStem,'Usage: node fm3-prototype.mjs BASE.syx SPEC.json OUTPUT_STEM');
    const result=generate(fs.readFileSync(baseFile),JSON.parse(fs.readFileSync(specFile,'utf8')));
    fs.mkdirSync(path.dirname(outStem),{recursive:true});
    for(const [suffix,data] of [['.syx',result.syx],['.txt',result.txt],['.validation.json',JSON.stringify(result.report,null,2)+'\n']])fs.writeFileSync(outStem+suffix,data,{flag:'wx'});
    console.log(JSON.stringify(result.report,null,2));
  }catch(e){console.error(e.message);process.exitCode=1;}
}

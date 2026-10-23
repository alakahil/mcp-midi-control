import {fileURLToPath} from 'node:url';
// Offline firmware-13 Compressor channel templates. No device or network access.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './compressor-collector/fm3-prototype.mjs';
import {pair,preflight} from './compressor-collector/compressor-check.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
const bases=new Set([
  'bffe9dd559b443ebe3822532e951a27cb0a827600cb929d52dfccd3228d611ca',
  'd7813ce6c5d352da180e659e73fee0e5fe114b96eab8da1beb34570d9aa8f76a',
  'e36dd5005dcc2a7b496e99a70c2d12ad4a7b15ba4375dfe1a2c110f5d25eac79'
]);
const libraryHash='1a13ab81d4935a0d3c7135459d836dc8b1f06c94ab4fae079be9b368972921fc';
const startOf=channel=>7050+'ABCD'.indexOf(channel)*74;

export function generateCompressorMulti(base,spec){
  check(bases.has(sha(base)),'Unsupported Compressor base');
  check(spec&&typeof spec==='object'&&!Array.isArray(spec),'Expected specification');
  check(Object.keys(spec).every(k=>['schemaVersion','firmware','baseProfile','compressorChannels'].includes(k)),'Unknown specification field');
  check(spec.schemaVersion===1&&spec.firmware===13&&spec.baseProfile==='jb-compressor-multi','Unsupported profile');
  check(Array.isArray(spec.compressorChannels)&&spec.compressorChannels.length>=1&&spec.compressorChannels.length<=4,'Expected 1..4 Compressor channels');
  const bytes=fs.readFileSync(new URL('../references/compressor-library.json',import.meta.url));
  check(sha(bytes)===libraryHash,'Compressor library changed; revalidate evidence');
  const library=JSON.parse(bytes);
  check(library.count===19&&library.models.length===19&&library.effectId===46&&library.typeParameterId===12&&library.wordsPerChannel===37,'Invalid Compressor library');
  const before=inspectStructure(base),body=Buffer.from(before.raw.body),seen=new Set(),channels=[],proofs=new Map();
  check(body.length===14222&&body.readUInt16LE(7004)===46&&body.readUInt16LE(7046)===37&&body.readUInt16LE(7048)===4,'Invalid Compressor layout');
  for(const s of spec.compressorChannels){
    check(s&&typeof s==='object'&&!Array.isArray(s),'Expected channel object');
    check(Object.keys(s).every(k=>['type','channel'].includes(k)),'Only Compressor type and channel are supported');
    check(['A','B','C','D'].includes(s.channel)&&!seen.has(s.channel),'Invalid or duplicate Compressor channel');
    seen.add(s.channel);
    const m=library.models.find(m=>m.name===s.type);
    check(m&&m.words.length===37&&m.words[12]===m.binaryId,'Unknown or invalid Compressor template');
    if(!proofs.has(m.sourceCapture)){
      const folder=new URL('../references/'+library.evidenceDirectory+'/'+m.sourceCapture+'/',import.meta.url);
      const proof=pair(fileURLToPath(folder)),state=preflight(fs.readFileSync(new URL('donor.syx',folder)));
      proofs.set(m.sourceCapture,{proof,state});
    }
    const {proof,state}=proofs.get(m.sourceCapture),sourceStart='ABCD'.indexOf(m.sourceChannel)*37;
    check(proof.syxSha256===m.syxSha256&&m.words.every((v,i)=>v===state.words[sourceStart+i]),'Template differs from paired source');
    const start=startOf(s.channel);
    m.words.forEach((v,i)=>{check(Number.isInteger(v)&&v>=0&&v<=65535,'Invalid template word');body.writeUInt16LE(v,start+2*i)});
    channels.push({channel:s.channel,type:s.type,binaryId:m.binaryId,sourceChannel:m.sourceChannel,sourceCapture:m.sourceCapture,sourceSyxSha256:m.syxSha256,words:[...m.words]});
  }
  const syx=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(before.raw.rawPatch,body)));
  const after=inspectStructure(syx),actual=Buffer.from(after.raw.body);
  check(actual.equals(body),'Compressor output readback mismatch');
  const changes=[];
  for(let i=0;i<body.length;i++)if(body[i]!==before.raw.body[i]){
    check(i>=7050&&i<7346&&seen.has('ABCD'[Math.floor((i-7050)/74)]),'Collateral body change');
    changes.push(i);
  }
  check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
  for(let i=0;i<72;i++)if(i!==4&&i!==5)check(before.raw.rawPatch[i]===after.raw.rawPatch[i],'Raw header changed');
  const sceneChannels=Array.from({length:8},(_,i)=>'ABCD'[actual.readUInt16LE(7014+2*i)]);
  const report={generator:'compressor-multi-0.1.0',spec,baseSha256:sha(base),outputSha256:sha(syx),channels,sceneChannels,changedBodyOffsets:changes,
    checks:{frameChecksums:true,presetCrc:true,footer:true,pairedSources:true,exactChannelWords:true,exactBodyReadback:true,onlyRequestedCompressorChannelsChanged:true,scenesAndBypassPreserved:true,headersPreserved:true},
    hardware:'Generated Compressor template imports pending',audio:'Not evaluated',
    limitations:['Copies all 37 captured words; not asserted factory defaults','No explicit Compressor control overrides','Only three pinned firmware-13 bases supported','General decoder names are not the authority; IDs and words are checked against paired evidence']};
  const txt=[
    'FM3 SOUND ARCHITECT — COMPRESSOR ARENDUSKATSE',
    'Sihtseade: FM3 Mk II Turbo, firmware 13. Eesmärk: Compressor tüübimallide kontrollimport.',
    'Presetinimi säilib alusfailist; failinimi eristab katset.',
    ...channels.map(c=>'Compressor1 '+c.channel+': '+c.type+' (ID '+c.binaryId+'); täielik 37-sõnaline kogutud mall.'),
    'Kõik parameetrid pärinevad vastavast kogutud mallist; neid ei kirjutata eraldi.',
    'Need pole tingimata tehaseseaded. Kõik muud plokid, routing, stseenid, bypass ja määramata kanalid säilivad alusfailist.',
    'Compressor stseenikanalid 1–8: '+sceneChannels.join(', ')+'.',
    'Kontekst: Ibanez humbuckeritega, OUT 1 stereo FOH. Heli, tasemed ja CPU pole selles katses hinnatud.',
    'Cab/IR-valikud, lülitid ja expression säilivad alusfailist. Uusi väliseid IR-e ei lisata.',
    'Kontrollitud offline: GET/SYX lähtepaarid, täpsed kanalisõnad, kaadrid, CRC/footer ja kõigi muude body-baitide säilimine.',
    'Seadmeimport ja heli: OOTEL. See on tehniline arenduskatse.',
    '',
    '1. Säilita praegune töö. Impordi SYX FM3-Editis tööpuhvrisse; ära kirjuta oma presetikohta üle.',
    '2. Ava Compressor1 ja vaata järjest kanaleid A–D. Kontrolli ülal nimetatud Type-valikuid; ära paranda seadeid enne eksporti.',
    '3. Ekspordi terve preset nimega FM3_COMPRESSOR_ABCD_TEST_export.syx ning saada vestlusse.',
    'Kanali vaatamine võib muuta praeguse stseeni Compressor-kanalivalikut; see erinevus tuleb tagasiekspordis eraldi raporteerida.',
    'Tööriist ei saada MIDI/SET/SAVE-käske.',
    'SHA-256: '+report.outputSha256
  ].join('\n')+'\n';
  return {syx,txt,report};
}

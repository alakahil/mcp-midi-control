// Offline firmware-13 Delay channel templates. No device or network access.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './delay-collector/fm3-prototype.mjs';
import {pair,preflight} from './delay-collector/delay-check.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
const bases=new Set([
  'bffe9dd559b443ebe3822532e951a27cb0a827600cb929d52dfccd3228d611ca',
  '6c0017301ed1ec513b4ed0d384cc04570ef0e532d4b38696ede1eca8084dc106',
  '302b89248f0624ac93b8ae39c869ee1662dc25ca66cac8cde00e74b170cd8e96'
]);
const libraryHash='724ab79882b4e16ebc5cc7305133fb9ee5a5746785aa2930e72f6421a70b1bfd';
const startOf=channel=>7392+'ABCD'.indexOf(channel)*178;

export function generateDelayMulti(base,spec){
  check(bases.has(sha(base)),'Unsupported Delay base');
  check(spec&&typeof spec==='object'&&!Array.isArray(spec),'Expected specification');
  check(Object.keys(spec).every(k=>['schemaVersion','firmware','baseProfile','delayChannels'].includes(k)),'Unknown specification field');
  check(spec.schemaVersion===1&&spec.firmware===13&&spec.baseProfile==='jb-delay-multi','Unsupported profile');
  check(Array.isArray(spec.delayChannels)&&spec.delayChannels.length>=1&&spec.delayChannels.length<=4,'Expected 1..4 Delay channels');
  const bytes=fs.readFileSync(new URL('../references/delay-library.json',import.meta.url));
  check(sha(bytes)===libraryHash,'Delay library changed; revalidate evidence');
  const library=JSON.parse(bytes);
  check(library.count===27&&library.models.length===27&&library.effectId===70&&library.typeParameterId===6&&library.wordsPerChannel===89,'Invalid Delay library');
  const before=inspectStructure(base),body=Buffer.from(before.raw.body),seen=new Set(),channels=[],proofs=new Map();
  check(body.length===14222&&body.readUInt16LE(7346)===70&&body.readUInt16LE(7388)===89&&body.readUInt16LE(7390)===4,'Invalid Delay layout');
  for(const s of spec.delayChannels){
    check(s&&typeof s==='object'&&!Array.isArray(s),'Expected channel object');
    check(Object.keys(s).every(k=>['type','channel'].includes(k)),'Only Delay type and channel are supported');
    check(['A','B','C','D'].includes(s.channel)&&!seen.has(s.channel),'Invalid or duplicate Delay channel');
    seen.add(s.channel);
    const m=library.models.find(m=>m.name===s.type);
    check(m&&m.words.length===89&&m.words[6]===m.binaryId,'Unknown or invalid Delay template');
    if(!proofs.has(m.sourceCapture)){
      const folder=new URL('../references/'+library.evidenceDirectory+'/'+m.sourceCapture+'/',import.meta.url);
      const proof=pair(folder.pathname),state=preflight(fs.readFileSync(new URL('donor.syx',folder)));
      proofs.set(m.sourceCapture,{proof,state});
    }
    const {proof,state}=proofs.get(m.sourceCapture),sourceStart='ABCD'.indexOf(m.sourceChannel)*89;
    check(proof.syxSha256===m.syxSha256&&m.words.every((v,i)=>v===state.words[sourceStart+i]),'Template differs from paired source');
    const start=startOf(s.channel);
    m.words.forEach((v,i)=>{check(Number.isInteger(v)&&v>=0&&v<=65535,'Invalid template word');body.writeUInt16LE(v,start+2*i)});
    channels.push({channel:s.channel,type:s.type,binaryId:m.binaryId,sourceChannel:m.sourceChannel,sourceCapture:m.sourceCapture,sourceSyxSha256:m.syxSha256,words:[...m.words]});
  }
  const syx=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(before.raw.rawPatch,body)));
  const after=inspectStructure(syx),actual=Buffer.from(after.raw.body);
  check(actual.equals(body),'Delay output readback mismatch');
  const changes=[];
  for(let i=0;i<body.length;i++)if(body[i]!==before.raw.body[i]){
    check(i>=7392&&i<8104&&seen.has('ABCD'[Math.floor((i-7392)/178)]),'Collateral body change');
    changes.push(i);
  }
  check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
  for(let i=0;i<72;i++)if(i!==4&&i!==5)check(before.raw.rawPatch[i]===after.raw.rawPatch[i],'Raw header changed');
  const sceneChannels=Array.from({length:8},(_,i)=>'ABCD'[actual.readUInt16LE(7356+2*i)]);
  const report={generator:'delay-multi-0.1.0',spec,baseSha256:sha(base),outputSha256:sha(syx),channels,sceneChannels,changedBodyOffsets:changes,
    checks:{frameChecksums:true,presetCrc:true,footer:true,pairedSources:true,exactChannelWords:true,exactBodyReadback:true,onlyRequestedDelayChannelsChanged:true,scenesAndBypassPreserved:true,headersPreserved:true},
    hardware:'Generated Delay template imports pending',audio:'Not evaluated',
    limitations:['Copies all 89 captured words; not asserted factory defaults','No explicit Delay control overrides','Only three pinned firmware-13 bases supported','General decoder names are not the authority; IDs and words are checked against paired evidence']};
  const txt=[
    'FM3 SOUND ARCHITECT — DELAY ARENDUSKATSE',
    'Sihtseade: FM3 Mk II Turbo, firmware 13. Eesmärk: Delay tüübimallide kontrollimport.',
    'Presetinimi säilib alusfailist; failinimi eristab katset.',
    ...channels.map(c=>'Delay1 '+c.channel+': '+c.type+' (ID '+c.binaryId+'); täielik 89-sõnaline kogutud mall.'),
    'Time, Feedback, Mix, Tempo ja muud seaded pärinevad vastavast kogutud mallist; neid ei kirjutata eraldi.',
    'Need pole tingimata tehaseseaded. Kõik muud plokid, routing, stseenid, bypass ja määramata kanalid säilivad alusfailist.',
    'Delay stseenikanalid 1–8: '+sceneChannels.join(', ')+'.',
    'Kontekst: Ibanez humbuckeritega, OUT 1 stereo FOH. Heli, tasemed ja CPU pole selles katses hinnatud.',
    'Cab/IR-valikud, lülitid ja expression säilivad alusfailist. Uusi väliseid IR-e ei lisata.',
    'Kontrollitud offline: GET/SYX lähtepaarid, täpsed kanalisõnad, kaadrid, CRC/footer ja kõigi muude body-baitide säilimine.',
    'Seadmeimport ja heli: OOTEL. See on tehniline arenduskatse.',
    '',
    '1. Säilita praegune töö. Impordi SYX FM3-Editis tööpuhvrisse; ära kirjuta oma presetikohta üle.',
    '2. Ava Delay1 ja vaata järjest kanaleid A–D. Kontrolli ülal nimetatud Type-valikuid; ära paranda seadeid enne eksporti.',
    '3. Ekspordi terve preset nimega FM3_DELAY_ABCD_TEST_export.syx ning saada vestlusse.',
    'Kanali vaatamine võib muuta praeguse stseeni Delay-kanalivalikut; see erinevus tuleb tagasiekspordis eraldi raporteerida.',
    'Tööriist ei saada MIDI/SET/SAVE-käske.',
    'SHA-256: '+report.outputSha256
  ].join('\n')+'\n';
  return {syx,txt,report};
}

// Offline firmware-13 Wah channel templates. No device or network access.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './wah-collector/fm3-prototype.mjs';
import {pair,preflight} from './wah-collector/wah-check.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
const bases=new Set([
  'bffe9dd559b443ebe3822532e951a27cb0a827600cb929d52dfccd3228d611ca',
  '96280e726f4871a6bd5d63770acd595d4ba1cfcc36c8c9931e9686ae93cbb604',
  'a6759a734e9f1f9717280175567e8fd82ff6816b9171feb9cab314aacd844e8f'
]);
const libraryHash='7a3c2057784c5737318706b6e47363ce36558483470c4dda3f62eb44ca27cf07';
const startOf=channel=>10178+'ABCD'.indexOf(channel)*50;

export function generateWahMulti(base,spec){
  check(bases.has(sha(base)),'Unsupported Wah base');
  check(spec&&typeof spec==='object'&&!Array.isArray(spec),'Expected specification');
  check(Object.keys(spec).every(k=>['schemaVersion','firmware','baseProfile','wahChannels'].includes(k)),'Unknown specification field');
  check(spec.schemaVersion===1&&spec.firmware===13&&spec.baseProfile==='jb-wah-multi','Unsupported profile');
  check(Array.isArray(spec.wahChannels)&&spec.wahChannels.length>=1&&spec.wahChannels.length<=4,'Expected 1..4 Wah channels');
  const bytes=fs.readFileSync(new URL('../references/wah-library.json',import.meta.url));
  check(sha(bytes)===libraryHash,'Wah library changed; revalidate evidence');
  const library=JSON.parse(bytes);
  check(library.count===9&&library.models.length===9&&library.effectId===94&&library.typeParameterId===0&&library.wordsPerChannel===25,'Invalid Wah library');
  const before=inspectStructure(base),body=Buffer.from(before.raw.body),seen=new Set(),channels=[],proofs=new Map();
  check(body.length===14222&&body.readUInt16LE(10132)===94&&body.readUInt16LE(10174)===25&&body.readUInt16LE(10176)===4,'Invalid Wah layout');
  for(const s of spec.wahChannels){
    check(s&&typeof s==='object'&&!Array.isArray(s),'Expected channel object');
    check(Object.keys(s).every(k=>['type','channel'].includes(k)),'Only Wah type and channel are supported');
    check(['A','B','C','D'].includes(s.channel)&&!seen.has(s.channel),'Invalid or duplicate Wah channel');
    seen.add(s.channel);
    const m=library.models.find(m=>m.name===s.type);
    check(m&&m.words.length===25&&m.words[0]===m.binaryId,'Unknown or invalid Wah template');
    if(!proofs.has(m.sourceCapture)){
      const folder=new URL('../references/'+library.evidenceDirectory+'/'+m.sourceCapture+'/',import.meta.url);
      const proof=pair(folder.pathname),state=preflight(fs.readFileSync(new URL('donor.syx',folder)));
      proofs.set(m.sourceCapture,{proof,state});
    }
    const {proof,state}=proofs.get(m.sourceCapture),sourceStart='ABCD'.indexOf(m.sourceChannel)*25;
    check(proof.syxSha256===m.syxSha256&&m.words.every((v,i)=>v===state.words[sourceStart+i]),'Template differs from paired source');
    const start=startOf(s.channel);
    m.words.forEach((v,i)=>{check(Number.isInteger(v)&&v>=0&&v<=65535,'Invalid template word');body.writeUInt16LE(v,start+2*i)});
    channels.push({channel:s.channel,type:s.type,binaryId:m.binaryId,sourceChannel:m.sourceChannel,sourceCapture:m.sourceCapture,sourceSyxSha256:m.syxSha256,words:[...m.words]});
  }
  const syx=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(before.raw.rawPatch,body)));
  const after=inspectStructure(syx),actual=Buffer.from(after.raw.body);
  check(actual.equals(body),'Wah output readback mismatch');
  const changes=[];
  for(let i=0;i<body.length;i++)if(body[i]!==before.raw.body[i]){
    check(i>=10178&&i<10378&&seen.has('ABCD'[Math.floor((i-10178)/50)]),'Collateral body change');
    changes.push(i);
  }
  check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
  for(let i=0;i<72;i++)if(i!==4&&i!==5)check(before.raw.rawPatch[i]===after.raw.rawPatch[i],'Raw header changed');
  const sceneChannels=Array.from({length:8},(_,i)=>'ABCD'[actual.readUInt16LE(10142+2*i)]);
  const report={generator:'wah-multi-0.1.0',spec,baseSha256:sha(base),outputSha256:sha(syx),channels,sceneChannels,changedBodyOffsets:changes,
    checks:{frameChecksums:true,presetCrc:true,footer:true,pairedSources:true,exactChannelWords:true,exactBodyReadback:true,onlyRequestedWahChannelsChanged:true,scenesAndBypassPreserved:true,headersPreserved:true},
    hardware:'Generated Wah template imports pending',audio:'Not evaluated',
    limitations:['Copies all 25 captured words; not asserted factory defaults','No explicit Wah control overrides','Only three pinned firmware-13 bases supported','General decoder names are not the authority; IDs and words are checked against paired evidence']};
  const txt=[
    'FM3 SOUND ARCHITECT — WAH ARENDUSKATSE',
    'Sihtseade: FM3 Mk II Turbo, firmware 13. Eesmärk: Wah tüübimallide kontrollimport.',
    'Presetinimi säilib alusfailist; failinimi eristab katset.',
    ...channels.map(c=>'Wah1 '+c.channel+': '+c.type+' (ID '+c.binaryId+'); täielik 25-sõnaline kogutud mall.'),
    'Kõik parameetrid pärinevad vastavast kogutud mallist; neid ei kirjutata eraldi.',
    'Need pole tingimata tehaseseaded. Kõik muud plokid, routing, stseenid, bypass ja määramata kanalid säilivad alusfailist.',
    'Wah stseenikanalid 1–8: '+sceneChannels.join(', ')+'.',
    'Kontekst: Ibanez humbuckeritega, OUT 1 stereo FOH. Heli, tasemed ja CPU pole selles katses hinnatud.',
    'Cab/IR-valikud, lülitid ja expression säilivad alusfailist. Uusi väliseid IR-e ei lisata.',
    'Kontrollitud offline: GET/SYX lähtepaarid, täpsed kanalisõnad, kaadrid, CRC/footer ja kõigi muude body-baitide säilimine.',
    'Seadmeimport ja heli: OOTEL. See on tehniline arenduskatse.',
    '',
    '1. Säilita praegune töö. Impordi SYX FM3-Editis tööpuhvrisse; ära kirjuta oma presetikohta üle.',
    '2. Ava Wah1 ja vaata järjest kanaleid A–D. Kontrolli ülal nimetatud Type-valikuid; ära paranda seadeid enne eksporti ega liiguta expression-pedaali.',
    '3. Ekspordi terve preset nimega FM3_WAH_ABCD_TEST_export.syx ning saada vestlusse.',
    'Kanali vaatamine võib muuta praeguse stseeni Wah-kanalivalikut; see erinevus tuleb tagasiekspordis eraldi raporteerida.',
    'Tööriist ei saada MIDI/SET/SAVE-käske.',
    'SHA-256: '+report.outputSha256
  ].join('\n')+'\n';
  return {syx,txt,report};
}

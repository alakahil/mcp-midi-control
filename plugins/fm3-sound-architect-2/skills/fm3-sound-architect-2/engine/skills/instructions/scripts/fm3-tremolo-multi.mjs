import {fileURLToPath} from 'node:url';
// Offline firmware-13 Tremolo channel templates. No device or network access.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './tremolo-collector/fm3-prototype.mjs';
import {pair,preflight} from './tremolo-collector/tremolo-check.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
const bases=new Set([
  '5531dd4219ef3545042ed93ae713a7b0370628b76dc51f1ca375c5b4334f8c62',
  '329dbfb68d9c69f7035227e0df62143666e738d0685670149ba6c0ec6e1ac8db'
]);
const libraryHash='f67ea2bededced0e34dc457cb35b214afa9abe205bc0eadd0192829b9f58ebf7';
const startOf=channel=>9868+'ABCD'.indexOf(channel)*44;

export function generateTremoloMulti(base,spec){
  check(bases.has(sha(base)),'Unsupported Tremolo base');
  check(spec&&typeof spec==='object'&&!Array.isArray(spec),'Expected specification');
  check(Object.keys(spec).every(k=>['schemaVersion','firmware','baseProfile','tremoloChannels'].includes(k)),'Unknown specification field');
  check(spec.schemaVersion===1&&spec.firmware===13&&spec.baseProfile==='jb-tremolo-multi','Unsupported profile');
  check(Array.isArray(spec.tremoloChannels)&&spec.tremoloChannels.length>=1&&spec.tremoloChannels.length<=4,'Expected 1..4 Tremolo channels');
  const bytes=fs.readFileSync(new URL('../references/tremolo-library.json',import.meta.url));
  check(sha(bytes)===libraryHash,'Tremolo library changed; revalidate evidence');
  const library=JSON.parse(bytes);
  check(library.count===7&&library.models.length===7&&library.effectId===106&&library.typeParameterId===0&&library.wordsPerChannel===22,'Invalid Tremolo library');
  const before=inspectStructure(base),body=Buffer.from(before.raw.body),seen=new Set(),channels=[],proofs=new Map();
  check(body.length===14134&&body.readUInt16LE(9822)===106&&body.readUInt16LE(9864)===22&&body.readUInt16LE(9866)===4,'Invalid Tremolo layout');
  for(const s of spec.tremoloChannels){
    check(s&&typeof s==='object'&&!Array.isArray(s),'Expected channel object');
    check(Object.keys(s).every(k=>['type','channel'].includes(k)),'Only Tremolo type and channel are supported');
    check(['A','B','C','D'].includes(s.channel)&&!seen.has(s.channel),'Invalid or duplicate Tremolo channel');
    seen.add(s.channel);
    const m=library.models.find(m=>m.name===s.type);
    check(m&&m.words.length===22&&m.words[0]===m.binaryId,'Unknown or invalid Tremolo template');
    if(!proofs.has(m.sourceCapture)){
      const folder=new URL('../references/'+library.evidenceDirectory+'/'+m.sourceCapture+'/',import.meta.url);
      const proof=pair(fileURLToPath(folder)),state=preflight(fs.readFileSync(new URL('donor.syx',folder)));
      proofs.set(m.sourceCapture,{proof,state});
    }
    const {proof,state}=proofs.get(m.sourceCapture),sourceStart='ABCD'.indexOf(m.sourceChannel)*22;
    check(proof.syxSha256===m.syxSha256&&m.words.every((v,i)=>v===state.words[sourceStart+i]),'Template differs from paired source');
    const start=startOf(s.channel);
    m.words.forEach((v,i)=>{check(Number.isInteger(v)&&v>=0&&v<=65535,'Invalid template word');body.writeUInt16LE(v,start+2*i)});
    channels.push({channel:s.channel,type:s.type,binaryId:m.binaryId,sourceChannel:m.sourceChannel,sourceCapture:m.sourceCapture,sourceSyxSha256:m.syxSha256,words:[...m.words]});
  }
  const syx=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(before.raw.rawPatch,body)));
  const after=inspectStructure(syx),actual=Buffer.from(after.raw.body);
  check(actual.equals(body),'Tremolo output readback mismatch');
  const changes=[];
  for(let i=0;i<body.length;i++)if(body[i]!==before.raw.body[i]){
    check(i>=9868&&i<10044&&seen.has('ABCD'[Math.floor((i-9868)/44)]),'Collateral body change');
    changes.push(i);
  }
  check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
  for(let i=0;i<72;i++)if(i!==4&&i!==5)check(before.raw.rawPatch[i]===after.raw.rawPatch[i],'Raw header changed');
  const sceneChannels=Array.from({length:8},(_,i)=>'ABCD'[actual.readUInt16LE(9832+2*i)]);
  const report={generator:'tremolo-multi-0.1.0',spec,baseSha256:sha(base),outputSha256:sha(syx),channels,sceneChannels,changedBodyOffsets:changes,
    checks:{frameChecksums:true,presetCrc:true,footer:true,pairedSources:true,exactChannelWords:true,exactBodyReadback:true,onlyRequestedTremoloChannelsChanged:true,scenesAndBypassPreserved:true,headersPreserved:true},
    hardware:'Generated Tremolo template imports pending',audio:'Not evaluated',
    limitations:['Copies all 22 captured words; not asserted factory defaults','No explicit Tremolo control overrides','Only two pinned firmware-13 bases supported','General decoder names are not the authority; IDs and words are checked against paired evidence']};
  const txt=[
    'FM3 SOUND ARCHITECT — TREMOLO ARENDUSKATSE',
    'Sihtseade: FM3 Mk II Turbo, firmware 13. Eesmärk: Tremolo tüübimallide kontrollimport.',
    'Presetinimi säilib alusfailist; failinimi eristab katset.',
    ...channels.map(c=>'Tremolo1 '+c.channel+': '+c.type+' (ID '+c.binaryId+'); täielik 22-sõnaline kogutud mall.'),
    'Kõik parameetrid pärinevad vastavast kogutud mallist; neid ei kirjutata eraldi.',
    'Need pole tingimata tehaseseaded. Kõik muud plokid, routing, stseenid, bypass ja määramata kanalid säilivad alusfailist.',
    'Tremolo stseenikanalid 1–8: '+sceneChannels.join(', ')+'.',
    'Kontekst: Ibanez humbuckeritega, OUT 1 stereo FOH. Heli, tasemed ja CPU pole selles katses hinnatud.',
    'Cab/IR-valikud, lülitid ja expression säilivad alusfailist. Uusi väliseid IR-e ei lisata.',
    'Kontrollitud offline: GET/SYX lähtepaarid, täpsed kanalisõnad, kaadrid, CRC/footer ja kõigi muude body-baitide säilimine.',
    'Seadmeimport ja heli: OOTEL. See on tehniline arenduskatse.',
    '',
    '1. Säilita praegune töö. Impordi SYX FM3-Editis tööpuhvrisse; ära kirjuta oma presetikohta üle.',
    '2. Ava Tremolo1 ja vaata järjest kanaleid A–D. Kontrolli ülal nimetatud Type-valikuid; ära paranda seadeid enne eksporti ega liiguta expression-pedaali.',
    '3. Ekspordi terve preset nimega FM3_TREMOLO_ABCD_TEST_export.syx ning saada vestlusse.',
    'Kanali vaatamine võib muuta praeguse stseeni Tremolo-kanalivalikut; see erinevus tuleb tagasiekspordis eraldi raporteerida.',
    'Tööriist ei saada MIDI/SET/SAVE-käske.',
    'SHA-256: '+report.outputSha256
  ].join('\n')+'\n';
  return {syx,txt,report};
}

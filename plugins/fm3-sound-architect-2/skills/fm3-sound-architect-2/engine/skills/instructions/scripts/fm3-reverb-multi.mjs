import {fileURLToPath} from 'node:url';
// Offline firmware-13 Reverb channel templates. No device or network access.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './reverb-collector/fm3-prototype.mjs';
import {pair,preflight} from './reverb-collector/reverb-check.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
const bases=new Set([
  'bffe9dd559b443ebe3822532e951a27cb0a827600cb929d52dfccd3228d611ca',
  '04e20e9846652bda5a147b025a92d4540707eead51ce693175f050b3b1c70f72',
  '887fa4d2201fc5348e7027f8f731acfa6c28ac454750cb796968fa36a9eee059'
]);
const libraryHash='ce05e91f8cb4900619db413ac1a00eee58830af1a3cb27ad3eab7e7d847a9305';
const startOf=channel=>9564+'ABCD'.indexOf(channel)*142;

export function generateReverbMulti(base,spec){
  check(bases.has(sha(base)),'Unsupported Reverb base');
  check(spec&&typeof spec==='object'&&!Array.isArray(spec),'Expected specification');
  check(Object.keys(spec).every(k=>['schemaVersion','firmware','baseProfile','reverbChannels'].includes(k)),'Unknown specification field');
  check(spec.schemaVersion===1&&spec.firmware===13&&spec.baseProfile==='jb-reverb-multi','Unsupported profile');
  check(Array.isArray(spec.reverbChannels)&&spec.reverbChannels.length>=1&&spec.reverbChannels.length<=4,'Expected 1..4 Reverb channels');
  const bytes=fs.readFileSync(new URL('../references/reverb-library.json',import.meta.url));
  check(sha(bytes)===libraryHash,'Reverb library changed; revalidate evidence');
  const library=JSON.parse(bytes);
  check(library.count===79&&library.models.length===79&&library.effectId===66&&library.typeParameterId===0&&library.wordsPerChannel===71,'Invalid Reverb library');
  const before=inspectStructure(base),body=Buffer.from(before.raw.body),seen=new Set(),channels=[],proofs=new Map();
  check(body.length===14222&&body.readUInt16LE(9518)===66&&body.readUInt16LE(9560)===71&&body.readUInt16LE(9562)===4,'Invalid Reverb layout');
  for(const s of spec.reverbChannels){
    check(s&&typeof s==='object'&&!Array.isArray(s),'Expected channel object');
    check(Object.keys(s).every(k=>['type','channel'].includes(k)),'Only Reverb type and channel are supported');
    check(['A','B','C','D'].includes(s.channel)&&!seen.has(s.channel),'Invalid or duplicate Reverb channel');
    seen.add(s.channel);
    const m=library.models.find(m=>m.name===s.type);
    check(m&&m.words.length===71&&m.words[0]===m.binaryId,'Unknown or invalid Reverb template');
    if(!proofs.has(m.sourceCapture)){
      const folder=new URL('../references/'+library.evidenceDirectory+'/'+m.sourceCapture+'/',import.meta.url);
      const proof=pair(fileURLToPath(folder)),state=preflight(fs.readFileSync(new URL('donor.syx',folder)));
      proofs.set(m.sourceCapture,{proof,state});
    }
    const {proof,state}=proofs.get(m.sourceCapture),sourceStart='ABCD'.indexOf(m.sourceChannel)*71;
    check(proof.syxSha256===m.syxSha256&&m.words.every((v,i)=>v===state.words[sourceStart+i]),'Template differs from paired source');
    const start=startOf(s.channel);
    m.words.forEach((v,i)=>{check(Number.isInteger(v)&&v>=0&&v<=65535,'Invalid template word');body.writeUInt16LE(v,start+2*i)});
    channels.push({channel:s.channel,type:s.type,binaryId:m.binaryId,sourceChannel:m.sourceChannel,sourceCapture:m.sourceCapture,sourceSyxSha256:m.syxSha256,words:[...m.words]});
  }
  const syx=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(before.raw.rawPatch,body)));
  const after=inspectStructure(syx),actual=Buffer.from(after.raw.body);
  check(actual.equals(body),'Reverb output readback mismatch');
  const changes=[];
  for(let i=0;i<body.length;i++)if(body[i]!==before.raw.body[i]){
    check(i>=9564&&i<10132&&seen.has('ABCD'[Math.floor((i-9564)/142)]),'Collateral body change');
    changes.push(i);
  }
  check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
  for(let i=0;i<72;i++)if(i!==4&&i!==5)check(before.raw.rawPatch[i]===after.raw.rawPatch[i],'Raw header changed');
  const sceneChannels=Array.from({length:8},(_,i)=>'ABCD'[actual.readUInt16LE(9528+2*i)]);
  const report={generator:'reverb-multi-0.1.0',spec,baseSha256:sha(base),outputSha256:sha(syx),channels,sceneChannels,changedBodyOffsets:changes,
    checks:{frameChecksums:true,presetCrc:true,footer:true,pairedSources:true,exactChannelWords:true,exactBodyReadback:true,onlyRequestedReverbChannelsChanged:true,scenesAndBypassPreserved:true,headersPreserved:true},
    hardware:'Generated Reverb template imports pending',audio:'Not evaluated',
    limitations:['Copies all 71 captured words; not asserted factory defaults','No explicit Reverb control overrides','Only three pinned firmware-13 bases supported','General decoder names are not the authority; IDs and words are checked against paired evidence']};
  const txt=[
    'FM3 SOUND ARCHITECT — REVERB ARENDUSKATSE',
    'Sihtseade: FM3 Mk II Turbo, firmware 13. Eesmärk: Reverb tüübimallide kontrollimport.',
    'Presetinimi säilib alusfailist; failinimi eristab katset.',
    ...channels.map(c=>'Reverb1 '+c.channel+': '+c.type+' (ID '+c.binaryId+'); täielik 71-sõnaline kogutud mall.'),
    'Time, Pre-Delay, Mix, Tempo ja muud seaded pärinevad vastavast kogutud mallist; neid ei kirjutata eraldi.',
    'Need pole tingimata tehaseseaded. Kõik muud plokid, routing, stseenid, bypass ja määramata kanalid säilivad alusfailist.',
    'Reverb stseenikanalid 1–8: '+sceneChannels.join(', ')+'.',
    'Kontekst: Ibanez humbuckeritega, OUT 1 stereo FOH. Heli, tasemed ja CPU pole selles katses hinnatud.',
    'Cab/IR-valikud, lülitid ja expression säilivad alusfailist. Uusi väliseid IR-e ei lisata.',
    'Kontrollitud offline: GET/SYX lähtepaarid, täpsed kanalisõnad, kaadrid, CRC/footer ja kõigi muude body-baitide säilimine.',
    'Seadmeimport ja heli: OOTEL. See on tehniline arenduskatse.',
    '',
    '1. Säilita praegune töö. Impordi SYX FM3-Editis tööpuhvrisse; ära kirjuta oma presetikohta üle.',
    '2. Ava Reverb1 ja vaata järjest kanaleid A–D. Kontrolli ülal nimetatud Type-valikuid; ära paranda seadeid enne eksporti.',
    '3. Ekspordi terve preset nimega FM3_REVERB_ABCD_TEST_export.syx ning saada vestlusse.',
    'Kanali vaatamine võib muuta praeguse stseeni Reverb-kanalivalikut; see erinevus tuleb tagasiekspordis eraldi raporteerida.',
    'Tööriist ei saada MIDI/SET/SAVE-käske.',
    'SHA-256: '+report.outputSha256
  ].join('\n')+'\n';
  return {syx,txt,report};
}

// Offline type-template transplant. ABCD test specimen hardware roundtrip verified.
import fs from 'node:fs';import {createHash} from 'node:crypto';
import {inspect} from './fm3-prototype.mjs';import {inspectStructure} from './drive-collector/fm3-prototype.mjs';import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),check=(v,m)=>{if(!v)throw Error(m)};
const bases=new Set(['bffe9dd559b443ebe3822532e951a27cb0a827600cb929d52dfccd3228d611ca','9515045ce201c745fba804c8d3d4f191bd1ea69967ab9a4e187ec1e06c825e12']);
const fields={drive:[1,10],tone:[2,10],level:[3,10],mix:[4,100]};
export const controlSupport={
 'BB Pre:A':{drive:[2],level:[2],mix:[25]},
 'T808 OD:B':{drive:[2],tone:[7],level:[2],mix:[25]},
 'Rat Distortion:C':{level:[2],mix:[25]},
 'Zen Master:D':{drive:[2],tone:[7],level:[2],mix:[25]},
 'Zen Master:C':{drive:[2,8],tone:[3,7],level:[2,5],mix:[25,100]}
};
export function applyDriveControls(body,selection){
 const allowed=controlSupport[selection.type+':'+selection.channel]||{},start=8460+'ABCD'.indexOf(selection.channel)*88;
 for(const [name,[pid,max]] of Object.entries(fields))if(Object.hasOwn(selection,name)){
  check(allowed[name]?.includes(selection[name]),'Untested or unavailable control: '+selection.type+' '+selection.channel+' '+name);
  body.writeUInt16LE(Math.round(selection[name]/max*65534),start+pid*2);
 }
}
export function generateDriveMulti(base,spec){
 check(bases.has(sha(base)),'Unsupported Drive base');
 check(spec&&typeof spec==='object'&&!Array.isArray(spec),'Expected specification');
 check(Object.keys(spec).every(k=>['schemaVersion','firmware','baseProfile','driveChannels'].includes(k)),'Unknown specification field');
 check(spec.schemaVersion===1&&spec.firmware===13&&spec.baseProfile==='jb-drive-multi','Unsupported profile');
 check(Array.isArray(spec.driveChannels)&&spec.driveChannels.length>=1&&spec.driveChannels.length<=4,'Expected 1..4 channels');
 const library=JSON.parse(fs.readFileSync(new URL('../references/drive-library.json',import.meta.url)));
 check(library.models.length===87&&new Set(library.models.map(m=>m.name)).size===87,'Invalid library');
 const before=inspect(base),body=Buffer.from(before.raw.body),seen=new Set(),channels=[];
 check(before.validation.ok&&body.length===14222&&body.readUInt16LE(8414)===118&&body.readUInt16LE(8456)===44&&body.readUInt16LE(8458)===4,'Invalid Drive layout');
 for(const s of spec.driveChannels){
  check(s&&typeof s==='object'&&!Array.isArray(s),'Expected channel object');
  check(Object.keys(s).every(k=>['type','channel',...Object.keys(fields)].includes(k)),'Unknown channel field');
  check(['A','B','C','D'].includes(s.channel)&&!seen.has(s.channel),'Invalid or duplicate channel');seen.add(s.channel);
  const m=library.models.find(m=>m.name===s.type);check(m&&m.words.length===44&&m.words[0]===m.binaryId,'Unknown or invalid type template');
  const start=8460+'ABCD'.indexOf(s.channel)*88;
  m.words.forEach((v,i)=>{check(Number.isInteger(v)&&v>=0&&v<=65535,'Invalid template word');body.writeUInt16LE(v,start+i*2)});
  applyDriveControls(body,s);
  channels.push({channel:s.channel,type:s.type,binaryId:m.binaryId,source:m.source,explicitControls:Object.fromEntries(Object.keys(fields).filter(k=>Object.hasOwn(s,k)).map(k=>[k,s[k]])),words:Array.from({length:44},(_,i)=>body.readUInt16LE(start+2*i))});
 }
 const syx=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(before.raw.rawPatch,body))),after=inspectStructure(syx);check(Buffer.from(after.raw.body).equals(body),'Roundtrip failed');
 const changes=[];for(let i=0;i<body.length;i++)if(body[i]!==before.raw.body[i]){check(i>=8460&&i<8812&&seen.has('ABCD'[Math.floor((i-8460)/88)]),'Collateral change');changes.push(i)}
 check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
 for(let i=0;i<72;i++)if(i!==4&&i!==5)check(before.raw.rawPatch[i]===after.raw.rawPatch[i],'Raw header changed');
 const report={generator:'drive-multi-0.1.0',baseSha256:sha(base),outputSha256:sha(syx),channels,changedBodyOffsets:changes,checks:{structuralIntegrity:true,capturedTypeIdsAndWords:true,bodyReadback:true,onlyRequestedDriveChannelsChanged:true,scenesAndBypassPreserved:true,headersPreserved:true},hardware:'ABCD test specimen hardware roundtrip verified; other combinations not individually imported',limitations:['Type selection loads all 44 captured words, not claimed factory defaults','Explicit controls only for documented type/channel/value combinations','Scenes and bypass preserved; selecting a channel for inspection can change its scene assignment','87 templates verified by original GET/SYX collection; general transplant not individually hardware-imported']};
 const txt=['FM3 Drive nelja kanali kontrollpreset',...channels.map(c=>c.channel+': '+c.type+'; '+JSON.stringify(c.explicitControls)),'Määramata seaded pärinevad kogutud tüübi kanalist.','Stseenid ja bypass säilivad alusfailist. Heli pole häälestatud.','ABCD testpreseti seadme kaudu tagasieksport on kinnitatud; teisi kombinatsioone pole eraldi imporditud.'].join('\n')+'\n';
 return {syx,txt,report};
}

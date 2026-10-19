// Restricted offline Zen Master C writer. Zen Master C test specimen hardware roundtrip verified.
import fs from 'node:fs';import {createHash} from 'node:crypto';
import {inspect} from './fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),check=(x,m)=>{if(!x)throw Error(m)};
const bases=new Set(['bffe9dd559b443ebe3822532e951a27cb0a827600cb929d52dfccd3228d611ca','9515045ce201c745fba804c8d3d4f191bd1ea69967ab9a4e187ec1e06c825e12']);
const fields={drive:[1,10,[2,8]],tone:[2,10,[3,7]],level:[3,10,[2,5]],mix:[4,100,[25,100]]};
export function generateDrive(base,spec){
 check(bases.has(sha(base)),'Unsupported Drive base');
 check(spec&&typeof spec==='object'&&!Array.isArray(spec),'Expected object');
 check(Object.keys(spec).every(k=>['schemaVersion','firmware','baseProfile','type','channel',...Object.keys(fields)].includes(k)),'Unknown Drive specification field');
 check(spec.schemaVersion===1&&spec.firmware===13&&spec.baseProfile==='jb-drive-c','Unsupported Drive profile');
 check(spec.type==='Zen Master'&&spec.channel==='C','Only tested Zen Master channel C supported');
 const library=JSON.parse(fs.readFileSync(new URL('../references/drive-library.json',import.meta.url)));
 const template=library.models.find(m=>m.name===spec.type);
 check(template?.binaryId===26&&template.words.length===44&&template.words[0]===26,'Bad Drive template');
 const before=inspect(base),body=Buffer.from(before.raw.body);
 check(body.length===14222&&body.readUInt16LE(8414)===118&&body.readUInt16LE(8456)===44&&body.readUInt16LE(8458)===4,'Drive layout mismatch');
 // Type selection loads the complete captured channel. Unspecified controls keep template values.
 template.words.forEach((v,i)=>{check(Number.isInteger(v)&&v>=0&&v<=65535,'Bad template word');body.writeUInt16LE(v,8636+2*i)});
 for(const [name,[pid,max,values]] of Object.entries(fields))if(Object.hasOwn(spec,name)){
  check(typeof spec[name]==='number'&&values.includes(spec[name]),'Untested '+name+' value');body.writeUInt16LE(Math.round(spec[name]/max*65534),8636+2*pid);
 }
 const syx=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(before.raw.rawPatch,body))),after=inspect(syx);
 check(body.equals(Buffer.from(after.raw.body)),'Body roundtrip failed');const changes=[];
 for(let i=0;i<body.length;i++)if(before.raw.body[i]!==body[i]){check(i>=8636&&i<8724,'Collateral change');changes.push(i)}
 check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
 for(let i=0;i<72;i++)if(i!==4&&i!==5)check(before.raw.rawPatch[i]===after.raw.rawPatch[i],'Raw header changed');
 const values={};for(const [name,[pid,max]] of Object.entries(fields))values[name]=Math.round(body.readUInt16LE(8636+2*pid)/65534*max*100)/100;
 const report={generator:'drive-c-0.1.0',baseSha256:sha(base),outputSha256:sha(syx),spec,values,changedBodyOffsets:changes,selectedScene:body[0]+1,sceneDriveChannels:Array.from({length:8},(_,i)=>'ABCD'[body.readUInt16LE(8424+i*2)]),checks:{fullIntegrity:true,bodyReadback:true,onlyChannelCChanged:true,headerPreserved:true},hardware:'Zen Master C test specimen (Drive2/Tone7/Level2/Mix25) hardware roundtrip verified; other combinations not individually imported',limitations:['Zen Master C only','Two exact known bases only','Only empirically tested control values','Type selection loads all 44 captured words; scenes and bypass preserved']};
 const txt=['FM3 Drive kontrollpreset','Drive1 C: Zen Master',...Object.entries(values).map(([k,v])=>`${k}: ${v}${k==='mix'?'%':''}`),'Kõik muud kanalid, stseenid ja bypass säilivad alusfailist.','See on tehniline katse, heli pole häälestatud.','Zen Master C katse (Drive2/Tone7/Level2/Mix25) seadme kaudu tagasieksport kinnitatud; teisi kombinatsioone pole eraldi imporditud.'].join('\n')+'\n';return {syx,txt,report};
}

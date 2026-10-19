// Offline Scene 6 writer, restricted to the independently tested JB source.
import {createHash} from 'node:crypto';
import {inspect} from './fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
export const JB_BASE_SHA256='bffe9dd559b443ebe3822532e951a27cb0a827600cb929d52dfccd3228d611ca';
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
const own=(o,k)=>Object.hasOwn(o,k);
export function generateJBScenes(base,spec){
 check(sha(base)===JB_BASE_SHA256,'Unrecognised JB base; use original JB_YDOM_RHYTHM.syx');
 check(spec&&typeof spec==='object'&&!Array.isArray(spec),'Expected specification object');
 check(Object.keys(spec).every(k=>['schemaVersion','firmware','baseProfile','name','purpose','scene6Name','phaserScene6Bypass','reverbScene6','delayScene6Bypass','ampScene6'].includes(k)),'Unsupported JB field');
 check(spec.schemaVersion===1&&spec.firmware===13&&spec.baseProfile==='jb-ydom-rhythm','Require schemaVersion 1, firmware 13 and JB profile');
 check(spec.name==='JB YDOM RHYTHM','JB profile preserves the preset name');
 if(own(spec,'purpose'))check(typeof spec.purpose==='string'&&spec.purpose.length<=1000&&!/[\x00-\x1f]/.test(spec.purpose),'Invalid purpose');
 check(own(spec,'scene6Name')||own(spec,'phaserScene6Bypass')||own(spec,'reverbScene6')||own(spec,'delayScene6Bypass')||own(spec,'ampScene6'),'At least one Scene 6 control required');
 if(own(spec,'scene6Name'))check(typeof spec.scene6Name==='string'&&/^[ -~]{1,31}$/.test(spec.scene6Name)&&spec.scene6Name===spec.scene6Name.trim(),'Scene name must be 1–31 printable ASCII characters without edge spaces');
 if(own(spec,'phaserScene6Bypass'))check(typeof spec.phaserScene6Bypass==='boolean','phaserScene6Bypass must be boolean (true = bypass)');
 if(own(spec,'reverbScene6'))check(['A','D'].includes(spec.reverbScene6),'Scene 6 Reverb supports tested A/D only');
 if(own(spec,'delayScene6Bypass'))check(typeof spec.delayScene6Bypass==='boolean','delayScene6Bypass must be boolean (true = bypass)');
 if(own(spec,'ampScene6'))check(['B','C'].includes(spec.ampScene6),'Scene 6 Amp supports tested B/C only');
 const before=inspect(base),body=before.raw.body.slice(),phaser=before.decoded.blocks.find(b=>b.block==='Phaser');
 check(body.length===14222&&body[195]===0&&before.decoded.scene_names[5]==='Rhythm FX'&&phaser?.offset===9204&&phaser.scene_channels[5]==='D'&&body[9228]===0&&body[9229]===0,'JB layout mismatch');
 check(before.decoded.blocks.find(b=>b.block==='Reverb')?.offset===9530&&body[9538]===0&&body[9539]===0&&body[7382]===1&&body[7383]===0,'JB Reverb/Delay anchor mismatch');
 check(before.decoded.blocks.find(b=>b.block==='Amp')?.offset===4622&&body[4630]===1&&body[4631]===0,'JB Amp anchor mismatch');
 const allowed=new Set();
 if(own(spec,'scene6Name')){for(let i=164;i<195;i++){allowed.add(i);body[i]=32}body.set(Buffer.from(spec.scene6Name,'ascii'),164)}
 if(own(spec,'phaserScene6Bypass')){allowed.add(9228);body[9228]=spec.phaserScene6Bypass?1:0}
 if(own(spec,'reverbScene6')){allowed.add(9538);body[9538]=spec.reverbScene6==='D'?3:0}
 if(own(spec,'delayScene6Bypass')){allowed.add(7382);body[7382]=spec.delayScene6Bypass?1:0}
 if(own(spec,'ampScene6')){allowed.add(4630);body[4630]=spec.ampScene6==='C'?2:1}
 const syx=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(before.raw.rawPatch,body))),after=inspect(syx);
 check(Buffer.from(body).equals(Buffer.from(after.raw.body)),'Full body readback failed');
 const changes=[];for(let i=0;i<body.length;i++)if(before.raw.body[i]!==after.raw.body[i]){check(allowed.has(i),'Collateral body change');changes.push(i)}
 check(after.raw.body[0]===before.raw.body[0],'Selected scene changed');
 check(after.decoded.scene_names[5]===(spec.scene6Name??before.decoded.scene_names[5]),'Scene name readback failed');
 check(after.decoded.blocks.find(b=>b.block==='Phaser').scene_bypass[5]===(spec.phaserScene6Bypass??false),'Phaser bypass readback failed');
 check(after.decoded.blocks.find(b=>b.block==='Reverb').scene_channels[5]===(spec.reverbScene6??'A'),'Reverb Scene 6 readback failed');
 check((after.raw.body[7382]|after.raw.body[7383]<<8)===((spec.delayScene6Bypass??true)?1:0),'Delay Scene 6 readback failed');
 check(after.decoded.blocks.find(b=>b.block==='Amp').scene_channels[5]===(spec.ampScene6??'B'),'Amp Scene 6 readback failed');
 check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
 for(let i=0;i<72;i++)if(i!==4&&i!==5)check(before.raw.rawPatch[i]===after.raw.rawPatch[i],'Raw header changed');
 const report={generator:'jb-scenes-0.3.0',spec,baseSha256:sha(base),outputSha256:sha(syx),changedBodyOffsets:changes,selectedScene:2,ampScene6:after.decoded.blocks.find(b=>b.block==='Amp').scene_channels[5],reverbScene6:after.decoded.blocks.find(b=>b.block==='Reverb').scene_channels[5],delayScene6Bypass:after.raw.body[7382]===1,scene6Name:after.decoded.scene_names[5],phaserScene6Bypass:after.decoded.blocks.find(b=>b.block==='Phaser').scene_bypass[5],checks:{frames:true,crc:true,footer:true,exactExpectedBody:true,noCollateralChanges:true,selectedScenePreserved:true,headerPreserved:true},hardware:'JB SOLO + Phaser bypass, Reverb A/D, Delay bypass/on and Amp B/C have independent hardware-export references; this generated file not reimported.',audio:'not assessed',limitations:['Exact original JB source only','Scene 6 only; no Phaser type/channel or routing changes','Other names are file-validated, not individually hardware-tested']};
 const txt=['FM3 SOUND ARCHITECT — JB SCENE 6',`Preset: ${spec.name}`,'Siht: FM3 Mk II Turbo, firmware 13.',`Scene 6 nimi: ${report.scene6Name}`,`Scene 6 Phaser: ${report.phaserScene6Bypass?'bypass':'sees'}; kanal D säilitatud.`,`Scene 6 Amp kanal: ${report.ampScene6}`,`Scene 6 Reverb kanal: ${report.reverbScene6}`,`Scene 6 Delay: ${report.delayScene6Bypass?'bypass':'sees'}`, 'Valitud stseen: 2, säilitatud alusfailist.','Määramata juhte, kõiki muid sisubaite ja presetinime säilitati.','JB SOLO + bypass vastendub sõltumatule seadmeekspordile; selle genereeritud faili uut importi ega heli pole katsetatud.',`SHA-256: ${report.outputSha256}`].join('\n')+'\n';
 return {syx,txt,report};
}

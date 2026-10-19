// Experimental, fixed-base FM3 EQ/level/mix writer. No device/network access.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {generateScenes} from './fm3-scenes.mjs';
import {inspect} from './fm3-prototype.mjs';
import {authorGen3PresetFromIR,findBlockHeader,readBlockParamsForModel,reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
export const fields={
 midB:{eid:58,pid:9,offset:4962,min:0,max:10,label:'Amp B Mid',unit:'/10'},
 trebleB:{eid:58,pid:10,offset:4964,min:0,max:10,label:'Amp B Treble',unit:'/10'},
 presenceB:{eid:58,pid:26,offset:4996,min:0,max:10,label:'Amp B Presence',unit:'/10'},
 levelB:{eid:58,pid:1,offset:4946,min:-80,max:20,label:'Amp B Level',unit:'dB'},
 delayMixA:{eid:70,pid:0,offset:7392,min:0,max:100,label:'Delay A Mix',unit:'%'},
 reverbMixA:{eid:66,pid:13,offset:9590,min:0,max:100,label:'Reverb A Mix',unit:'%'}
};
export function generateTone(base,spec){
 check(spec&&typeof spec==='object'&&!Array.isArray(spec),'Expected object');
 check(Object.keys(spec).every(k=>k==='name'||k in fields),'Unsupported field');
 const keys=Object.keys(fields).filter(k=>spec[k]!==undefined);
 check(keys.length>0,'At least one tone parameter required');
 for(const k of keys){const f=fields[k];check(typeof spec[k]==='number'&&Number.isFinite(spec[k])&&spec[k]>=f.min&&spec[k]<=f.max,'Out of range: '+k)}
 // Explicit defaults form part of both the report and user-facing TXT.
 const initial=generateScenes(base,{name:spec.name,gainB:5,delayScene2:true,reverbScene1:'A'});
 const before=inspect(initial.syx),expected=before.raw.body.slice();
 for(const [eid,header] of [[58,4610],[70,7346],[66,9518]]){
  check(before.decoded.grid.some(g=>g.effect_id===eid),'Missing grid block '+eid);
  check(findBlockHeader(expected,eid,0x1202)===header,'Unexpected block anchor '+eid);
 }
 const requests=keys.map(k=>{const f=fields[k];return {...f,key:k,value:spec[k],raw:Math.round((spec[k]-f.min)/(f.max-f.min)*65534)}});
 const amp=requests.filter(p=>p.eid===58),rev=requests.filter(p=>p.eid===66);
 const blocks=[];
 if(amp.length)blocks.push({family:'amp',instance:1,channel:'B',params:amp.map(p=>({paramId:p.pid,normalized:p.raw/65534}))});
 if(rev.length)blocks.push({family:'reverb',instance:1,params:rev.map(p=>({paramId:p.pid,normalized:p.raw/65534}))});
 const authored=authorGen3PresetFromIR(initial.syx,{blocks},17);
 check(authored.skipped.length===0,'Skipped parameter');
 check(authored.written.reduce((n,b)=>n+b.params.length,0)===amp.length+rev.length,'Incomplete write');
 const interim=inspect(Buffer.from(authored.syx)),body=interim.raw.body.slice();
 // Delay walk decoder is incomplete. Fixed base + grid + ID anchor + independently
 // confirmed scene word identify this record. Parameter mapping awaits hardware test.
 for(const p of requests){expected[p.offset]=p.raw&255;expected[p.offset+1]=p.raw>>8;if(p.eid===70){body[p.offset]=p.raw&255;body[p.offset+1]=p.raw>>8}}
 const syx=Buffer.from(reencodeDumpFromRawPatch(authored.syx,reencodeRawPatch(interim.raw.rawPatch,body)));
 const after=inspect(syx);
 check(Buffer.from(expected).equals(Buffer.from(after.raw.body)),'Unexpected body change');
 check(after.decoded.preset_name===spec.name,'Name mismatch');
 check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
 check(Buffer.from(before.raw.rawPatch.subarray(0,4)).equals(Buffer.from(after.raw.rawPatch.subarray(0,4))),'Raw header changed');
 for(let i=6;i<0x48;i++)check(before.raw.rawPatch[i]===after.raw.rawPatch[i],'Unrelated header change');
 const read=readBlockParamsForModel(after.raw.body,new Set([58,70,66]),17);
 for(const p of requests){const b=read.find(b=>b.effectId===p.eid&&(p.eid!==58||b.channel===1));check(b?.params.find(q=>q.paramId===p.pid)?.raw===p.raw,'Parameter readback failed: '+p.key)}
 const changed=[];for(let i=0;i<expected.length;i++)if(expected[i]!==before.raw.body[i])changed.push(i);
 const sha256=createHash('sha256').update(syx).digest('hex');
 const report={prototype:'tone-0.1.0',spec,defaults:{gainB:5,delayScene2:true,reverbScene1:'A'},requests,changedBodyOffsets:changed,sha256,firmwareTarget:13,checks:{frameChecksums:true,presetCrc:true,footer:true,exactExpectedBody:true,rawParamReadback:true,headerPreserved:true},hardware:'pending for EQ/level/mix',audio:'unconfirmed'};
 const txt=['FM3 SOUND ARCHITECT — EQ / LEVEL / MIX ARENDUSKATSE',`Preset: ${spec.name}`,'Siht: FM3 Mk II Turbo, firmware 13. Alus: kasutaja Baaspreset.syx.',...requests.map(p=>`${p.label}: ${p.value.toFixed(2)} ${p.unit}`),'Lisaks: Amp B Gain 5.00; Scene 2 Delay sees; Scene 1 Reverb kanal A.','Amp B muudatused mõjutavad stseene 2 ja 6. Delay A Mix mõjutab kõiki 8 stseeni, kui efekt on aktiivne.','Reverb A Mix mõjutab stseene 1, 3, 4, 6, 7, 8; Scene 2 Reverb B jääb muutmata.','Amp mudel: USA MK IV Rhythm 2. Routing, Cab/IR, muud mudelid, lülitid ja expression säilivad alusfailist.','Kitarr ja ühendus: selles katses määramata; kasuta senist kontrollühendust. IR-id pärinevad baasist; sõltuvusi pole eraldi kinnitatud.','Failikontrollid läbitud. EQ/Level/Mix väärtused, heli ning CPU vajavad seadmel kontrolli; see pole valmis artistipreset.','','Säilita senine töö ning impordi FM3-Editis olemasolevat presetikohta üle kirjutamata.','Kontrolli Scene 2 Amp B väärtusi ja Delay A Mixi; seejärel Scene 1 Reverb A Mixi.','Level on ploki Level, mitte Master Volume. Kuula madalal helitugevusel.','Pärast kontrolli ekspordi preset tagasi ja lisa vestlusse koos tulemusega.',`SHA-256: ${sha256}`,'Tööriist ei ühenda seadet ega saada MIDI/SET-käske.'].join('\n')+'\n';
 return {syx,txt,report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [base,spec,stem]=process.argv.slice(2);const r=generateTone(fs.readFileSync(base),JSON.parse(fs.readFileSync(spec,'utf8')));fs.mkdirSync(path.dirname(stem),{recursive:true});for(const [ext,data] of [['.syx',r.syx],['.txt',r.txt],['.validation.json',JSON.stringify(r.report,null,2)+'\n']])fs.writeFileSync(stem+ext,data,{flag:'wx'});console.log(JSON.stringify(r.report));}catch(e){console.error(e.message);process.exitCode=1}
}

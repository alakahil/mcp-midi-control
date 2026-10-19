// Fixed-base, experimental time/feedback controls. Offline only.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {generateTone} from './fm3-tone.mjs';import {inspect} from './fm3-prototype.mjs';
import {findBlockHeader,readBlockParamsForModel,reencodeRawPatch,reencodeDumpFromRawPatch,authorGen3PresetFromIR} from './fm3-codec.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
const definitions={delayTimeMs:{eid:70,pid:8,offset:7408,min:1,max:16000,testMin:50,testMax:1000,unit:'ms',label:'Delay A Time'},delayFeedback:{eid:70,pid:10,offset:7412,min:-100,max:100,testMin:0,testMax:50,unit:'%',label:'Delay A Feedback'},reverbTimeS:{eid:66,pid:1,offset:9566,min:0.1,max:100,testMin:0.5,testMax:5,unit:'s',label:'Reverb A Time'},reverbPredelayMs:{eid:66,pid:9,offset:9582,min:0,max:1000,testMin:0,testMax:100,unit:'ms',label:'Reverb A Pre-Delay'}};
export function generateTime(base,spec){
 check(spec&&typeof spec==='object'&&!Array.isArray(spec),'Expected object');
 check(Object.keys(spec).every(k=>k==='name'||k in definitions),'Unsupported field');
 for(const [k,f] of Object.entries(definitions))check(typeof spec[k]==='number'&&Number.isFinite(spec[k])&&spec[k]>=f.testMin&&spec[k]<=f.testMax,'Missing/out-of-test-range '+k);
 const initial=generateTone(base,{name:spec.name,midB:5,trebleB:4,presenceB:2,levelB:-18,delayMixA:15,reverbMixA:12});
 const before=inspect(initial.syx),expected=before.raw.body.slice();
 for(const [eid,h] of [[70,7346],[66,9518]])check(findBlockHeader(expected,eid,0x1202)===h,'Unexpected header');
 const requests=Object.entries(definitions).map(([k,f])=>({...f,key:k,value:spec[k],raw:Math.round((spec[k]-f.min)/(f.max-f.min)*65534)}));
 const rev=requests.filter(p=>p.eid===66);
 const authored=authorGen3PresetFromIR(initial.syx,{blocks:[{family:'reverb',instance:1,params:rev.map(p=>({paramId:p.pid,normalized:p.raw/65534}))}]},17);
 check(authored.skipped.length===0&&authored.written.length===1&&authored.written[0].params.length===2,'Incomplete Reverb write');
 const interim=inspect(Buffer.from(authored.syx)),body=interim.raw.body.slice();
 const put=(b,o,v)=>{b[o]=v&255;b[o+1]=v>>8};
 for(const p of requests){put(expected,p.offset,p.raw);if(p.eid===70)put(body,p.offset,p.raw)}
 // Explicitly disable relevant tempo divisions so numeric times are effective.
 const tempo=[{eid:70,pid:15,offset:7422,old:14},{eid:66,pid:62,offset:9688,old:0}];
 for(const t of tempo){check((before.raw.body[t.offset]|before.raw.body[t.offset+1]<<8)===t.old,'Unexpected Tempo word');put(body,t.offset,0);put(expected,t.offset,0)}
 const syx=Buffer.from(reencodeDumpFromRawPatch(authored.syx,reencodeRawPatch(interim.raw.rawPatch,body))),after=inspect(syx);
 check(Buffer.from(after.raw.body).equals(Buffer.from(expected)),'Unexpected body changes');
 check(after.decoded.preset_name===spec.name,'Name mismatch');
 check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
 for(let i=0;i<0x48;i++)if(i!==4&&i!==5)check(before.raw.rawPatch[i]===after.raw.rawPatch[i],'Unrelated raw header changed');
 const read=readBlockParamsForModel(after.raw.body,new Set([70,66]),17);
 for(const p of [...requests,...tempo.map(t=>({...t,raw:0}))])check(read.find(b=>b.effectId===p.eid)?.params.find(q=>q.paramId===p.pid)?.raw===p.raw,'Readback failed');
 const sha256=createHash('sha256').update(syx).digest('hex');const differences=[];for(let i=0;i<body.length;i++)if(before.raw.body[i]!==body[i])differences.push(i);
 const report={prototype:'time-0.1.0',spec,requests,tempo:'Delay A Tempo NONE; Reverb A Pre-Delay Tempo NONE',toneDefaults:initial.report,changedBodyOffsets:differences,sha256,checks:{frames:true,crc:true,footer:true,exactBody:true,rawReadback:true,headersPreserved:true},hardware:'pending for times/feedback/tempo',audio:'unconfirmed'};
 const txt=['FM3 SOUND ARCHITECT — AJA JA FEEDBACKI ARENDUSKATSE',`Preset: ${spec.name}`,'Siht: FM3 Mk II Turbo, firmware 13.',...requests.map(p=>`${p.label}: ${p.value.toFixed(2)} ${p.unit}`),'Delay A Tempo: NONE; Reverb A Pre-Delay Tempo: NONE.','Need on oodatud ekraaniväärtused, mitte veel riistvaral kinnitatud tulemused. Aja teisendus kasutab FM3 cache-vahemikke; ümardus võib anda väga väikese erinevuse.','Säilitatud eelmise katse seaded: Amp B Gain5/Mid5/Treble4/Presence2/Level−18 dB; Delay A Mix15%; Reverb A Mix12%.','Scene 2 Delay sees; Scene 1 Reverb A. Amp B mõjutab Scene 2 ja 6; Delay A kõiki; Reverb A Scene 1,3,4,6,7,8.','Mudelid, Cab/IR, routing, muud kanalid, lülitid ja expression pärinevad Baaspreset.syx-ist. Amp B USA MK IV Rhythm 2.','Kasuta senist kitarri ja kontrollühendust. Heli/CPU ning IR-sõltuvused pole eraldi kinnitatud.','','Säilita oma töö ja impordi FM3-Editis olemasolevat presetikohta üle kirjutamata.','Kontrolli Scene 2 Delay A Time, Feedback, Tempo; seejärel Scene 1 Reverb A Time, Pre-Delay ja selle Tempo.','Kui väärtus erineb, ära paranda seda enne eksporti: kirjuta nähtav väärtus üles. Ekspordi preset tagasi võrdluseks.','Kuula madalal helitugevusel. Tööriist ei saada seadmele MIDI/SET-käske.',`SHA-256: ${sha256}`].join('\n')+'\n';return {syx,txt,report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const [base,spec,stem]=process.argv.slice(2);const r=generateTime(fs.readFileSync(base),JSON.parse(fs.readFileSync(spec,'utf8')));fs.mkdirSync(path.dirname(stem),{recursive:true});for(const [ext,data] of [['.syx',r.syx],['.txt',r.txt],['.validation.json',JSON.stringify(r.report,null,2)+'\n']])fs.writeFileSync(stem+ext,data,{flag:'wx'});console.log(JSON.stringify({sha256:r.report.sha256,changedBodyOffsets:r.report.changedBodyOffsets}));}catch(e){console.error(e.message);process.exitCode=1}}

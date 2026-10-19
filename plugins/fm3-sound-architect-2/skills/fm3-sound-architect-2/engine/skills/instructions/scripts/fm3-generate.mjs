import {generatePitchMulti} from './fm3-pitch-multi.mjs';
import {generateRotaryControls} from './fm3-rotary-controls.mjs';
// Unified fixed-base FM3 generator. Omitted controls preserve base bytes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {BASE_SHA256,inspect} from './fm3-prototype.mjs';
import {authorGen3PresetFromIR,findBlockHeader,readBlockParamsForModel,reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {applySelections,selectionReadback} from './fm3-models.mjs';
import {applyCab,inspectCabOutput,cabReadback} from './fm3-cabs.mjs';
import {generateDrive} from './fm3-drive.mjs';
import {generateDriveMulti} from './fm3-drive-multi.mjs';
import {generateTremoloMulti} from './fm3-tremolo-multi.mjs';
import {generateWahMulti} from './fm3-wah-multi.mjs';
import {generateChorusMulti} from './fm3-chorus-multi.mjs';
import {generateFlangerMulti} from './fm3-flanger-multi.mjs';
import {generatePhaserMulti} from './fm3-phaser-multi.mjs';
import {generateCompressorMulti} from './fm3-compressor-multi.mjs';
import {generateReverbMulti} from './fm3-reverb-multi.mjs';
import {generateDelayMulti} from './fm3-delay-multi.mjs';
import {generateJBScenes} from './fm3-jb-scenes.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
const own=(o,k)=>Object.hasOwn(o,k);
const sha=b=>createHash('sha256').update(b).digest('hex');
import {controls} from './fm3-controls.mjs';
export {controls};
import {generateJBComposer,getComposerCapabilities} from './fm3-jb-composer.mjs';
export {getComposerCapabilities};
const word=(b,o)=>b[o]|b[o+1]<<8;
const put=(b,o,v)=>{b[o]=v&255;b[o+1]=v>>8};
export function generatePreset(base,spec,ampLibrary){
 if(spec?.baseProfile==='jb-composer')return generateJBComposer(base,spec,ampLibrary);
 if(spec?.baseProfile==='jb-rotary-controls')return generateRotaryControls(base,spec);
 if(spec?.baseProfile==='jb-pitch-multi')return generatePitchMulti(base,spec);
 if(spec?.baseProfile==='jb-tremolo-multi')return generateTremoloMulti(base,spec);
 if(spec?.baseProfile==='jb-wah-multi')return generateWahMulti(base,spec);
 if(spec?.baseProfile==='jb-chorus-multi')return generateChorusMulti(base,spec);
 if(spec?.baseProfile==='jb-flanger-multi')return generateFlangerMulti(base,spec);
 if(spec?.baseProfile==='jb-phaser-multi')return generatePhaserMulti(base,spec);
 if(spec?.baseProfile==='jb-compressor-multi')return generateCompressorMulti(base,spec);
 if(spec?.baseProfile==='jb-reverb-multi')return generateReverbMulti(base,spec);
 if(spec?.baseProfile==='jb-delay-multi')return generateDelayMulti(base,spec);
 if(spec?.baseProfile==='jb-drive-multi')return generateDriveMulti(base,spec);
 if(spec?.baseProfile==='jb-drive-c')return generateDrive(base,spec);
 if(spec?.baseProfile==='jb-ydom-rhythm')return generateJBScenes(base,spec);
 check(sha(base)===BASE_SHA256,'Unrecognised base; use original bundled Baaspreset.syx');
 check(spec&&typeof spec==='object'&&!Array.isArray(spec),'Expected specification object');
 check(Object.keys(spec).every(k=>['schemaVersion','firmware','name','purpose','ampModelB','cabScene2','cabModelB'].includes(k)||own(controls,k)),'Unsupported field');
 check(spec.schemaVersion===1&&spec.firmware===13,'Require schemaVersion 1 and firmware 13');
 check(typeof spec.name==='string'&&/^[ -~]{1,31}$/.test(spec.name),'Name must be 1–31 printable ASCII characters');
 if(own(spec,'purpose'))check(typeof spec.purpose==='string'&&spec.purpose.length<=1000&&!/[\x00-\x1f]/.test(spec.purpose),'Invalid purpose');
 const keys=Object.keys(controls).filter(k=>own(spec,k));check(keys.length>0||own(spec,'ampModelB')||own(spec,'cabScene2')||own(spec,'cabModelB'),'At least one control or selection required');
 for(const k of keys){const f=controls[k],v=spec[k];if(f.values)check(f.values.includes(v),'Unsupported value: '+k);else check(typeof v==='number'&&Number.isFinite(v)&&v>=(f.low??f.min)&&v<=(f.high??f.max),'Out of range: '+k)}
 // No silent tempo reset: require the user/spec to state it when changing time.
 if(own(spec,'delayTimeMs'))check(spec.delayTempoA==='NONE','delayTimeMs requires explicit delayTempoA: NONE');
 if(own(spec,'reverbPredelayMs'))check(spec.reverbPredelayTempoA==='NONE','reverbPredelayMs requires explicit reverbPredelayTempoA: NONE');
 const before=inspect(base),expected=before.raw.body.slice();
 for(const [eid,h] of [[58,4610],[70,7346],[66,9518]])check(before.decoded.grid.some(g=>g.effect_id===eid)&&findBlockHeader(expected,eid,0x1202)===h,'Unexpected block anchor');
 if(own(spec,'cabModelB'))check(!own(spec,'cabScene2'),'cabModelB and cabScene2 cannot be combined');
 const requests=keys.map(key=>{const f=controls[key],value=spec[key],raw=f.rawValues?f.rawValues[f.values.indexOf(value)]:Math.round((value-f.min)/(f.max-f.min)*65534);return {key,...f,value,raw}});
 const blocks=[];
 for(const [eid,family,channel] of [[58,'amp','B'],[66,'reverb',undefined]]){const params=requests.filter(p=>p.eid===eid).map(p=>({paramId:p.pid,normalized:p.raw/65534}));if(params.length)blocks.push({family,instance:1,...(channel?{channel}:{}),params})}
 const authored=authorGen3PresetFromIR(base,{name:spec.name,blocks},17);
 check(authored.skipped.length===0&&authored.written.reduce((n,b)=>n+b.params.length,0)===requests.filter(p=>[58,66].includes(p.eid)).length,'Incomplete IR write');
 const interim=inspect(Buffer.from(authored.syx)),body=interim.raw.body.slice();
 const selections=applySelections(before.raw.body,expected,spec,ampLibrary);
 applySelections(before.raw.body,body,spec,ampLibrary);
 const cabSelection=applyCab(expected,spec,before.decoded);
 applyCab(body,spec,before.decoded);
 if(cabSelection)selections.cabTemplate=cabSelection;
 for(const p of requests){put(expected,p.offset,p.raw);put(body,p.offset,p.raw)}
 const syx=Buffer.from(reencodeDumpFromRawPatch(authored.syx,reencodeRawPatch(interim.raw.rawPatch,body))),after=own(spec,'cabModelB')?inspectCabOutput(syx,before.raw.body,spec.cabModelB):inspect(syx);
 check(Buffer.from(expected).equals(Buffer.from(after.raw.body)),'Unexpected body changes');
 check(after.decoded.preset_name===spec.name,'Name readback failed');
 check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
 for(let i=0;i<0x48;i++)if(i!==4&&i!==5&&!(i>=8&&i<40))check(before.raw.rawPatch[i]===after.raw.rawPatch[i],'Unrelated raw header changed');
 const read=readBlockParamsForModel(after.raw.body,new Set([58,70,66]),17);
 for(const p of requests){if(p.eid){const b=read.find(b=>b.effectId===p.eid&&(p.eid!==58||b.channel===1));check(b?.params.find(q=>q.paramId===p.pid)?.raw===p.raw,'Parameter readback failed: '+p.key)}else check(word(after.raw.body,p.offset)===p.raw,'Scene readback failed')}
 const modelReadback=selectionReadback(after.decoded,spec);
 if(cabSelection){modelReadback.cabB=cabReadback(after,spec.cabModelB);if(modelReadback.cabScene2.channel==='B')modelReadback.cabScene2={...modelReadback.cabScene2,...modelReadback.cabB};}
 const effective=Object.entries(controls).map(([key,f])=>{const raw=word(after.raw.body,f.offset);let value;if(f.rawValues){const idx=f.rawValues.indexOf(raw);value=idx>=0?f.values[idx]:(key==='delayTempoA'&&raw===14?'1/4':`raw ${raw}`)}else value=f.min+raw/65534*(f.max-f.min);return {key,label:f.label,unit:f.unit??'',raw,value,requested:own(spec,key)?spec[key]:null,source:own(spec,key)?'requested':(own(spec,'ampModelB')&&f.eid===58?'amp-template':'base')}});
 const changes=[];for(let i=0;i<body.length;i++)if(before.raw.body[i]!==body[i])changes.push(i);
 const report={generator:'unified-0.3.0',selections,modelReadback,spec,baseSha256:sha(base),outputSha256:sha(syx),effective,changedBodyOffsets:changes,checks:{frames:true,crc:true,footer:true,exactExpectedBody:true,rawReadback:true,headerPreserved:true},hardware:'Selected reference combinations verified on firmware13; this output needs evidence comparison before claiming an exact match.',audio:'not assessed',limitations:['Original base only','Amp B and Delay/Reverb A controls only','Requires a full bundled/imported Amp channel template; no model-ID-only writing; 45 paired full CAB B templates or existing Scene2 Dyna-Cab channels; no external IR/routing writing','Unknown body offset0 export difference remains tracked']};
 const fmt=v=>typeof v==='number'?v.toFixed(3):typeof v==='boolean'?(v?'sees':'bypass'):String(v);
 const txt=['FM3 SOUND ARCHITECT — PIIRATUD GENERAATOR',`Preset: ${spec.name}`,`Eesmärk: ${spec.purpose??'Toetatud seadistuste rakendamine kasutaja aluspresetile.'}`,'Siht: FM3 Mk II Turbo, firmware 13. Alus: kasutaja Baaspreset.syx.',...effective.map(p=>`${p.label}: ${fmt(p.value)} ${p.unit}${p.source!=='requested'?` [${p.source==='amp-template'?'Amp-mallist':'säilitatud alusfailist'}]`:` [soovitud ${fmt(p.requested)}]`}`),'Määramata juhtseadised säilivad; Amp-mudeli selgesõnaline valik asendab kogu Amp B kanali malliga enne üksikparameetrite rakendamist.',`Amp B mudel ${modelReadback.ampB.type}; muudatused mõjutavad Scene 2 ja 6. Delay A kasutavad kõik 8 stseeni.`,`Reverb A kasutavad stseenid ${[...(word(body,9528)===0?[1]:[]),3,4,6,7,8].join(', ')}. Muud kanalid säilivad.`,`Scene 2 Cab kanal ${modelReadback.cabScene2.channel}: ${modelReadback.cabScene2.dynacab1}; teine Cab: ${modelReadback.cabScene2.dynacab2}. Dyna-Cab teegi olemasolu tuleb seadmel kontrollida.`,...(Object.keys(selections).length?['ARENDUSKATSE: uus mudeli/Cab-valik on failitasemel kontrollitud; selle väljundi riistvaraimport ja heli on kinnitamata.','Amp-valik kopeerib terve salvestatud kanali, seejärel rakendatakse selgesõnalised juhtseadised. cabScene2 valib olemasoleva kanali; cabModelB asendab CAB B täiskanalimalliga koos mikrofoni-, miksimis- ja filtriseadetega.']:[]),...(cabSelection?[`CAB B mõlemad pesad: ${cabSelection.displayNumber}: ${cabSelection.name}. Mõjutatud stseenid: ${cabSelection.affectedScenes.join(', ')}.`,`CAB B kogu 106-sõnaline kanal kopeeriti allikast ${cabSelection.source.folder}, kanal ${cabSelection.source.channel}; sealhulgas mikrofonid, segu, filtrid ja tasemed. Need ei ole universaalsed tehase vaikeväärtused.`,`Uue CAB B kirjutuse import/tagasieksport ja heli on veel kontrollimata. Kontrolli Scene 2, Cab B mõlemat pesa ning ekspordi preset tagasi.`]:[]),'Routing, muud efektid, lülitid ja expression pärinevad baasist. Väliseid User IR-e ei kirjutata ega paigaldata.','Kitarr ja ühendus: kasutaja senine kontrollseadistus, selle faili jaoks eraldi määramata.','Failikontrollid läbitud. Kirjutusfunktsioonidel on firmware13 võrdluskatsed; uusi väärtusi/kombinatsioone ei nimetata automaatselt riistvaral kinnitatuks.','Artistisoundi täpsus, heli ja CPU pole selle generaatoriga hinnatud.','','Impordi FM3-Editis oma tööd säilitades ning olemasolevat presetikohta üle kirjutamata.','Kontrolli soovitud parameetreid õigel kanalil ja stseenis. Vajadusel ekspordi kontrolliks tagasi.','Tööriist ei ühenda seadet ega saada MIDI/SET-käske.',`SHA-256: ${report.outputSha256}`].join('\n')+'\n';
 return {syx,txt,report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const [base,spec,stem,libraryFile]=process.argv.slice(2);if(base==='--capabilities'){check(!stem&&!libraryFile,'Usage: node fm3-generate.mjs --capabilities [BASE.syx]');console.log(JSON.stringify(getComposerCapabilities(spec?fs.readFileSync(spec):undefined),null,2));}else{check(base&&spec&&stem,'Usage: node fm3-generate.mjs BASE SPEC OUTPUT_STEM [AMP_LIBRARY.json] | --capabilities [BASE.syx]');const r=generatePreset(fs.readFileSync(base),JSON.parse(fs.readFileSync(spec,'utf8')),libraryFile?JSON.parse(fs.readFileSync(libraryFile,'utf8')):undefined);fs.mkdirSync(path.dirname(stem),{recursive:true});const entries=[['.syx',r.syx],['.txt',r.txt],['.validation.json',JSON.stringify(r.report,null,2)+'\n']];for(const [ext] of entries)check(!fs.existsSync(stem+ext),'Output already exists: '+stem+ext);for(const [ext,data] of entries)fs.writeFileSync(stem+ext,data,{flag:'wx'});console.log(JSON.stringify({sha256:r.report.outputSha256,changedBodyBytes:r.report.changedBodyOffsets.length}));}}catch(e){console.error(e.message);process.exitCode=1}}

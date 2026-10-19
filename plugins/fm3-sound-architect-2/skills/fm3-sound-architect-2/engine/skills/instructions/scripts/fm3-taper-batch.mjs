// One-import batch test for the unverified taper classes 0x05 and 0x06 (0.74.0).
// Writes every such parameter present in the standard composer base into channel D
// at n=0.25 (raw 16384) and lists linear/log display predictions for each.
import fs from 'node:fs';
import {loadDictionary,writeTableControls} from './fm3-table-encoder.mjs';
import {layouts} from './fm3-composer-bases.mjs';
const N=0.25,RAW=Math.round(N*65534),slug=Object.fromEntries(Object.entries(layouts.standard).map(([k,v])=>[v.eid,k]));
const d=loadDictionary(),fmt=v=>Math.abs(v)>=100?v.toFixed(0):Math.abs(v)>=10?v.toFixed(1):v.toFixed(2);
const targets=d.params.filter(p=>p.status==='unverified-taper'&&slug[p.block]&&['5','6'].includes(p.flags[3])&&p.param<layouts.standard[slug[p.block]].words);
const controls=targets.map(p=>({block:slug[p.block],channel:'D',param:p.name,raw:RAW}));
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3.syx',import.meta.url));
const r=writeTableControls(base,{name:'FM3 TAPER BATCH TEST',controls},{experimental:true});
const rows=targets.map((p,i)=>{const m=p.displayMultiplier||1,lin=(p.min+N*(p.max-p.min))*m,log=p.min>0?p.min*Math.pow(p.max/p.min,N)*m:null;
  const k5=p.flags[3]==='5',lin0=p.min+N*(p.max-p.min),log0=p.min>0?p.min*Math.pow(p.max/p.min,N):null;
  return {nr:i+1,block:slug[p.block],channel:'D',name:p.name,label:p.label,class:'0x'+p.flags[3],range:k5?[p.min,p.max]:[p.min*m,p.max*m],raw:RAW,predictLinear:+(k5?lin0:lin).toFixed(4),predictLog:(k5?log0:log)===null?null:+(k5?log0:log).toFixed(4),predictKnob:k5?+(N*m).toFixed(4):null}});
const out=new URL('../examples/FM3_TAPER_BATCH_TEST',import.meta.url).pathname;
const txt=['FM3 TAPER BATCH TEST — kõverate partiikatse (0.74.0)',
 'Alus: JB_RHYTHM_LEVEL_MINUS3.syx. Muudetud ainult kanal D: '+rows.length+' parameetrit toorväärtusele '+RAW+' (25% skaalast).',
 'Kõik muud baidid, stseenid, routing ja nimi peale preseti nime on alusega identsed (kontrollitud).','',
 'TEGEVUS',
 '1. Säilita pooleli olev töö. Impordi see SYX FM3-Editis TÜHJALE presetikohale; ära salvesta olemasoleva peale.',
 '2. Ava iga allolev plokk, vali kanal D ja kirjuta üles näidatud väärtus täpselt nagu ekraanil.',
 '   Kui parameetrit selle ploki tüübi juures ei kuvata, kirjuta "ei kuva".',
 '3. Saada väärtused vestlusse (nt "1: 3.2, 2: -40 ..."). Eksporti pole vaja; kuulamist pole vaja.','',
 'Klass 0x05: sisemine vahemik; võimalik, et FM3-Edit näitab 0–10 nuppu (siis oleks näit 2.50).',
 'Nr | Plokk | Parameeter (FM3-Edit silt) | Vahemik | Kui lineaarne | Kui logaritmiline | Kui 0–10 nupp',
 ...rows.map(x=>`${x.nr} | ${x.block} D | ${x.label} (${x.name}) | ${fmt(x.range[0])}…${fmt(x.range[1])} | ${fmt(x.predictLinear)} | ${x.predictLog===null?'—':fmt(x.predictLog)} | ${x.predictKnob===null?'—':fmt(x.predictKnob)}`),
 '','SHA-256: '+r.report.outputSha256,'Tööriist ei ühenda seadet ega saada MIDI-käske.'].join('\n')+'\n';
fs.writeFileSync(out+'.syx',r.syx,{flag:'wx'});fs.writeFileSync(out+'.txt',txt,{flag:'wx'});
fs.writeFileSync(out+'.spec.json',JSON.stringify({name:'FM3 TAPER BATCH TEST',experimental:true,n:N,controls},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(out+'.validation.json',JSON.stringify({...r.report,rows},null,2)+'\n',{flag:'wx'});
console.log(txt);

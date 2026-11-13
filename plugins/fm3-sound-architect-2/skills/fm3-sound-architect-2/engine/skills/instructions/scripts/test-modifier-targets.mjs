// Generic modifier targets (modifierTargets) and preset tempo (tempo), 0.3.60: T42 records replayed word for word,
// record placement after Volume / Control Switch bindings, the 0x0080 flag rule, refusals, saved-bundle verify and
// CRC-valid tamper rejection. Offline; the hardware evidence is references/fm3-t42-modifier-targets-20261109.json.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {readModifiers} from './fm3-parameter-dependencies.mjs';
import {findParam,loadDictionary} from './fm3-table-encoder.mjs';
import {MODIFIER_TARGET_COUNT,isModifierTarget,listModifierTargets,validateModifierTargets,DEVICE_CONFIRMED_TARGETS,modifierTargetsCapabilities} from './fm3-modifier-targets.mjs';
import {stripControlSwitchRecords} from './fm3-control-switches.mjs';
import {CONTROLLERS_RECORD as R,readPresetTempo} from './fm3-controllers.mjs';
const E=new URL('../',import.meta.url);
const base=fs.readFileSync(new URL('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',E));
const receipt=JSON.parse(fs.readFileSync(new URL('references/fm3-t42-modifier-targets-20261109.json',E)));
const bodyOf=syx=>Buffer.from(inspectStructure(syx).raw.body);
const words=(b,r)=>Array.from({length:25},(_,i)=>b.readUInt16LE(1584+96*r+2*i));
const rewrite=(input,mutate)=>{const p=inspectStructure(input),b=Buffer.from(p.raw.body);mutate(b);return Buffer.from(reencodeDumpFromRawPatch(input,reencodeRawPatch(p.raw.rawPatch,b)));};
const composer={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'MOD TARGETS',modifiers:{external1Wah:false},filterChannels:[{channel:'A',type:'Low-Pass'}]};
const layout={row2:['drive','amp','cab','filter'],row3:['delay','reverb']},layoutVol={row2:['drive','amp','cab','filter'],row3:['volpan','delay','reverb']};

// 1. Flag rule: 476 bit-clear parameters, 468 labelled targets; every device/corpus target bit-clear, Delay Low Cut (refused by the FM3 in T42 D) bit-set.
assert.equal(MODIFIER_TARGET_COUNT,468);assert.equal(listModifierTargets().length,468);
const bitClear=loadDictionary().params.filter(p=>p.flags!==undefined&&p.family&&!['MOD','CONTROLLERS','GLOBAL'].includes(p.family)&&p.kind!=='unused'&&(+p.flags&0x80)===0);
assert.equal(bitClear.length,476);assert.deepEqual(bitClear.filter(p=>!isModifierTarget(p)).map(p=>p.name).sort(),['DELAY_TYPE','FDBKSEND_OUTLEVEL','FDBKSEND_SENDLEVEL','MIXER_BYPASS','MULTIPLEXER_BYPASS','PLEX_BASETYPE','REVERB_BASETYPE','REVERB_TONETYPE']);
for(const [b,n] of [['volpan','VOLUME_GAIN'],['wah','WAH_CONTROL'],['amp','DISTORT_BOOST'],['amp','DISTORT_BRIGHT'],['amp','DISTORT_CUT'],['amp','DISTORT_FAT'],['amp','DISTORT_SATSWITCH'],['rotary','ROTARY_RATE'],['delay','DELAY_MIX'],['filter','FILTER_FREQ'],['amp','DISTORT_DRIVE']])
 assert.ok(isModifierTarget(findParam(b,n)),n);
assert.ok(!isModifierTarget(findParam('delay','DELAY_LOCUT')));
for(const p of loadDictionary().params.filter(p=>/_TYPE$|_TEMPO$/.test(p.name)&&p.flags!==undefined))assert.ok(!isModifierTarget(p),p.name);
assert.deepEqual(Object.keys(DEVICE_CONFIRMED_TARGETS).sort(),['DELAY_MIX','DISTORT_DRIVE','FILTER_FREQ']);
assert.equal(modifierTargetsCapabilities().targets,468);

// 2. T42 records replayed: the generated record equals the device-stored T42 record word for word (record moves 0 -> 1).
const t42Words=part=>receipt.parts.find(p=>p.case.startsWith(part)).storedRecord.words;  // device-stored record (STORE 427)
const replay=[['T42A',{source:'Scene Controller 1',block:'delay',param:'DELAY_MIX',min:0,max:100}],['T42B',{source:'LFO 1A',block:'filter',param:'FILTER_FREQ',min:300,max:3000}],['T42C',{source:'External 1',block:'amp',param:'DISTORT_DRIVE',min:2,max:8}]];
for(const [part,t] of replay){
 const r=createPreset(base,{composer:{...composer,name:part},layout,modifierTargets:[t]}),b=bodyOf(r.syx);
 assert.deepEqual(words(b,1),t42Words(part),part+' record words = device-stored T42 record');
 assert.deepEqual(readModifiers(b).filter(m=>m.active).map(m=>m.record),[1]);
 assert.equal(r.report.modifierTargets[0].record,1);assert.equal(r.report.modifierTargets[0].min.display,t.min);assert.equal(r.report.modifierTargets[0].max.display,t.max);
 const plain=createPreset(base,{composer:{...composer,name:part},layout});
 assert.deepEqual(stripControlSwitchRecords(b),bodyOf(plain.syx),part+': only the target record differs');
}

// 3. Placement after Volume and Control Switch bindings; tempo; full saved-bundle verify.
const full={composer,volumePan:true,volumePedal:{source:'External 1'},layout:layoutVol,controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST'}],
 modifierTargets:[{source:'LFO 1A',block:'delay',param:'DELAY_MIX',min:10,max:60},{source:'Scene Controller 2',block:'reverb',param:'REVERB_MIX'},{source:'Manual 1',block:'filter',param:'FILTER_FREQ',channel:'B'}],
 tempo:97,controllers:[{channel:'A',param:'LFO1FREQ',value:2}]};
const r=createPreset(base,full),b=bodyOf(r.syx);
assert.deepEqual(r.report.modifierTargets.map(t=>t.record),[2,3,4]);assert.equal(r.report.volumePedal.record,0);assert.equal(r.report.controlSwitches[0].record,1);
assert.equal(r.report.modifierTargets[2].channelScope,'CHAN B');assert.equal(r.report.modifierTargets[1].fullRange,true);
for(let ch=0;ch<4;ch++){assert.equal(b.readUInt16LE(R.start+2*(ch*R.words+32)),97);assert.equal(b.readUInt16LE(R.start+2*(ch*R.words+33)),0);}
assert.deepEqual(readPresetTempo(b),{bpm:97,channels:[97,97,97,97],tempoToUse:'PRESET'});
// Codex P2 (PR #85): per-preset switch states must keep the target records (csPreset reads the target-stage output).
const cs=createPreset(base,{composer,layout,controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST'}],controlSwitchScenes:[{switch:2,scene:2,state:'ON'}],
 modifierTargets:[{source:'LFO 1A',block:'delay',param:'DELAY_MIX',min:10,max:60}]});
assert.deepEqual(readModifiers(bodyOf(cs.syx)).filter(m=>m.active).map(m=>m.record),[1,2]);assert.equal(cs.report.modifierTargets[0].record,2);
assert.match(r.txt,/MODIFIKAATORI SIHID — LÕPPFAILIST/);assert.match(r.txt,/97 BPM/);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-modtgt-'));
try{
 const stem=path.join(tmp,'ok');writePresetOutputs(stem,r,full);verifyPresetOutputs(stem);
 // Without the fields nothing is reported and the base tempo stays.
 const plain=createPreset(base,{composer,layout});assert.equal(plain.report.modifierTargets,undefined);assert.equal(plain.report.presetTempo,undefined);
 assert.equal(readPresetTempo(bodyOf(plain.syx)).bpm,120);
 // Tamper: target record, tempo word, report and TXT are refused even with valid CRCs and rehashed manifests.
 const tamper=[['target max',x=>rewrite(x,b=>b.writeUInt16LE(b.readUInt16LE(1584+96*2+4)-1,1584+96*2+4))],['target source',x=>rewrite(x,b=>b.writeUInt16LE(2,1584+96*2))],
  ['tempo channel D',x=>rewrite(x,b=>b.writeUInt16LE(98,R.start+2*(3*R.words+32)))],['extra target',x=>rewrite(x,b=>[30,0,65534,0,32767,65534,32767,66,70,1].forEach((w,i)=>b.writeUInt16LE(w,1584+96*5+2*i)))]];
 for(const [name,f] of tamper){const s=path.join(tmp,name.replace(/ /g,'_'));writePresetOutputs(s,{...r,syx:f(r.syx)},full);assert.throws(()=>verifyPresetOutputs(s),undefined,name);}
 const s2=path.join(tmp,'report');writePresetOutputs(s2,{...r,report:{...r.report,modifierTargets:r.report.modifierTargets.slice(1)}},full);assert.throws(()=>verifyPresetOutputs(s2),undefined,'report');
 const s3=path.join(tmp,'txt');writePresetOutputs(s3,{...r,txt:r.txt.replace('97 BPM','96 BPM')},full);assert.throws(()=>verifyPresetOutputs(s3),undefined,'txt');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

// 4. Refusals.
const one=x=>({composer,layout,modifierTargets:[x]});
const bad=[[{source:'Scene Controller 1',block:'delay',param:'DELAY_LOCUT'},/not a modifier target/],[{source:'LFO 1A',block:'delay',param:'DELAY_TYPE'},/not a modifier target/],
 [{source:'External 1',block:'volpan',param:'VOLUME_GAIN'},/volumePedal/],[{source:'External 1',block:'wah',param:'WAH_CONTROL'},/external1Wah/],
 [{source:'Control Switch 1',block:'delay',param:'DELAY_MIX'},/source must be/],[{source:'LFO 1A',block:'delay',param:'REVERB_MIX'},/not in the dictionary/],
 [{source:'LFO 1A',block:'amp',param:'DISTORT_BOOST',min:0,max:1},/continuous/],[{source:'LFO 1A',block:'delay',param:'DELAY_MIX',min:50,max:50},/differ/],
 [{source:'LFO 1A',block:'delay',param:'DELAY_MIX',channel:'E'},/channel/],[{source:'LFO 1A',block:'delay',param:'DELAY_MIX',curve:1},/curve must name/],[{source:'LFO 1A',block:'delay',param:'DELAY_MIX',curve:{}},/curve must name/],
 [{source:'LFO 1A',block:'delay',param:'DELAY_MIX',curve:{offValuePercent:50}},/curve must name/],[{source:'LFO 1A',block:'delay',param:'DELAY_MIX',curve:{scale:11}},/scale out of range/],
 [{source:'LFO 1A',block:'delay',param:'DELAY_MIX',curve:{attackMs:'5'}},/attackMs must be a number/],[{source:'LFO 1A',block:'delay',param:'DELAY_MIX',bogus:1},/unknown field/],
 [{source:'LFO 1A',block:'phaser',param:'PHASER_RATE'},/exactly once|once on the grid/]];
for(const [x,re] of bad)assert.throws(()=>createPreset(base,one(x)),re,JSON.stringify(x));
assert.throws(()=>createPreset(base,{composer,layout,modifierTargets:[{source:'LFO 1A',block:'delay',param:'DELAY_MIX'},{source:'LFO 1B',block:'delay',param:'DELAY_MIX'}]}),/twice/);
assert.throws(()=>validateModifierTargets(Array(9).fill({source:'LFO 1A',block:'delay',param:'DELAY_MIX'})),/1\.\.8/);
for(const t of [23,251,97.5,'97'])assert.throws(()=>createPreset(base,{composer,layout,tempo:t}),/tempo must be/,String(t));
// 5. 0.3.69 curve / timing per binding: only words 3-7 and 13-15 of that record differ from the plain binding; the other
// binding keeps the template; the words are the fm3-modifier-curve codec (T12 device steps: 13107 = 20.0 %, 52427 = 80.0 %).
{const plainT=[{source:'Envelope Follower',block:'filter',param:'FILTER_FREQ',min:300,max:3000},{source:'LFO 1A',block:'delay',param:'DELAY_MIX',min:10,max:60}];
 const curve={startPercent:20,midPercent:25,endPercent:80,slopePercent:75,scale:2,offsetPercent:10,attackMs:50,releaseMs:500};
 const a=createPreset(base,{composer,layout,modifierTargets:plainT}),c=createPreset(base,{composer,layout,modifierTargets:[{...plainT[0],curve},plainT[1]]});
 const wa=words(bodyOf(a.syx),1),wc=words(bodyOf(c.syx),1);
 assert.deepEqual(wa.map((x,i)=>x!==wc[i]?i:-1).filter(i=>i>=0),[3,4,5,6,7,13,14,15]);
 assert.deepEqual([3,4,5,6,7,13,14,15].map(i=>wc[i]),[13107,16384,52427,49151,328,42631,36044,3277]);
 assert.deepEqual(words(bodyOf(a.syx),2),words(bodyOf(c.syx),2));
 const ba=bodyOf(a.syx),bc=bodyOf(c.syx);for(let o=0;o<ba.length;o++)if(ba[o]!==bc[o])assert.ok(o>=1584+96+6&&o<1584+96+32,'byte '+o);
 const st=c.report.modifierTargets;assert.equal(st[0].curveCustom,true);assert.equal(st[0].curve.scale.display,2);assert.equal(st[0].curve.attackMs.display,50.1);assert.equal(st[1].curve,undefined);
 assert.equal(a.report.modifierTargets[0].curve,undefined);assert.ok(!a.txt.includes('Kõver ja ajad ('));assert.ok(c.txt.includes('Kõver ja ajad (filter'));assert.ok(c.txt.includes('Start 20%'));
 assert.ok(stripControlSwitchRecords(bc).equals(stripControlSwitchRecords(ba)),'curve record is recognised and stripped');
 // A curve naming only defaults is still reported, but not custom.
 const d=createPreset(base,{composer,layout,modifierTargets:[{...plainT[0],curve:{midPercent:50}},plainT[1]]});assert.equal(d.report.modifierTargets[0].curveCustom,false);assert.ok(bodyOf(d.syx).equals(ba));
 const tmp2=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-modcurve-'));
 try{const spec={composer,layout,modifierTargets:[{...plainT[0],curve},plainT[1]]},stem=path.join(tmp2,'ok');writePresetOutputs(stem,c,spec);verifyPresetOutputs(stem);
  const s1=path.join(tmp2,'word');writePresetOutputs(s1,{...c,syx:rewrite(c.syx,b=>b.writeUInt16LE(13108,1584+96+6))},spec);assert.throws(()=>verifyPresetOutputs(s1),undefined,'curve word');
  const s2=path.join(tmp2,'txt');writePresetOutputs(s2,{...c,txt:c.txt.replace('Start 20%','Start 21%')},spec);assert.throws(()=>verifyPresetOutputs(s2),undefined,'curve txt');
  // the same file without the curve request is refused: the curve words are not the template
  const s3=path.join(tmp2,'unrequested');writePresetOutputs(s3,c,{composer,layout,modifierTargets:plainT});assert.throws(()=>verifyPresetOutputs(s3),undefined,'unrequested curve');
 }finally{fs.rmSync(tmp2,{recursive:true,force:true});}
}
console.log(JSON.stringify({passed:true,targets:468,t42RecordsReplayed:3,tamperCases:9,curveWords:8,deviceIO:false}));

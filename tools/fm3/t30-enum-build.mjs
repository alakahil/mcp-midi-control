// Build the T30 option-selector pack. Offline; writes measurement presets, never device I/O.
// After T24 (197 selectors promoted) 151 option selectors stay opt-in ('enum-labels'). Most of them stay so by
// design: GLOBAL (75, global settings are never written), modifier/routing/bypass words, channel type/model
// selectors, learn/preset/IR-bank pickers and Tempo To Use. The sound-relevant rest has no FM3-Edit reading yet:
//   PEQ band types 1-5 (corpus: 335 bodies, every stored word inside its list), Phaser LFO Quantize (its list starts
//   OFF, OFF, 2, ...: which index shows which number), Multi Delay Filter Type and Comb Filter Type, and 17
//   Controllers selectors (LFO Tempo/Quantize/Run, ADSR Type/Mode/Retrigger/Source, Envelope and Pitch source,
//   Sequencer Run/Tempo; T28 already read LFO Type and ADSR 1 Mode).
//   EN1: one non-default option per PEQ band type, Phaser LFO Quantize 3, Multi Delay (Base Type Quad Parallel, where
//        both filter selectors are visible) Filter Type BANDPASS and Comb Filter Type FEEDFORWARD; all channel A.
//   EN2: the 17 Controllers selectors on Controllers channel A, each at a non-default option.
// The presets are made by the generator itself (composeSound with allow:['enum-labels']), so the pack also checks
// that the generator writes exactly the declared words. FM3_SHOT_LOAD.py --load sends one preset to the edit buffer
// (7F 00) and reads every listed record with fn=0x1F; Claude reads FM3-Edit. Nothing is stored or set.
// Usage: node tools/fm3/t30-enum-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as R from './fm3-read-requests.mjs';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {findParam,encodeValue,decodeValue}=await imp('scripts/fm3-table-encoder.mjs');
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const {CONTROLLERS_RECORD}=await imp('scripts/fm3-controllers.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t30-enum-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const NEWLOOK=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const COMPOSER={schemaVersion:1,firmware:13,baseProfile:'jb-composer',compressorChannels:[{channel:'A',type:'Optical Compressor'}],
  peqChannels:[{channel:'A'}],phaserChannels:[{channel:'A',type:'Classic Vibe'}]};
const LAYOUT={row2:['compressor','drive','peq','phaser','amp','cab'],row3:['delay','multidelay','reverb']};
const FAMILY={peq:'PEQ',phaser:'PHASER',multidelay:'MULTITAP',controllers:'CONTROLLERS'};
const allow=['enum-labels'];
const body=syx=>Buffer.from(inspectStructure(syx).raw.body);
const compose=(name,extra)=>Buffer.from(composeSound(NEWLOOK,{composer:{...COMPOSER,name},insert:['multidelay'],recordOrder:'append',allow,layout:LAYOUT,...extra}).syx);
// Records read back: the three blocks (4 channels each) and the Controllers prefix record (4 copies).
function records(b){
  const rs=scanRecords(b).records,pick=f=>{const r=rs.filter(x=>x.family===f);assert.equal(r.length,1,f);return r[0];};
  const C=CONTROLLERS_RECORD;assert.equal(b.readUInt16LE(C.header),C.effectId);
  return [...['peq','phaser','multidelay'].map(f=>{const r=pick(f);return {family:f,effectId:r.eid,start:r.start,words:r.words,channels:r.channels};}),
    {family:'controllers',effectId:C.effectId,start:C.start,words:C.words,channels:C.channels}];
}
const wordsOf=(b,r)=>[...Array(r.words*r.channels).keys()].map(i=>b.readUInt16LE(r.start+2*i));
// One reading per selector: value as FM3-Edit should show it (label), the stored word, the default it replaces.
const sel=(block,name,value)=>{const p=findParam(FAMILY[block],FAMILY[block]+'_'+name);assert.equal(p.kind,'enum',name);assert.equal(p.structuralStatus??p.status,'enum-labels',name);
  const raw=encodeValue(p,value,{allow});return {block,param:p.name,channel:'A',pid:p.param,label:p.label,value,raw,shows:decodeValue(p,raw)};};
const EN1=[sel('peq','TYPE1','Blocking'),sel('peq','TYPE2','Shelving 2'),sel('peq','TYPE3','Peaking 2'),sel('peq','TYPE4','Shelving'),sel('peq','TYPE5','Peaking 2'),
  sel('phaser','LFOQUANTIZE',3),sel('multidelay','FILTER_TYPE','BANDPASS'),sel('multidelay','COMBTYPE','FEEDFORWARD')];
const EN2=[['LFO1TEMPO','1/8'],['LFO2TEMPO','1/4 DOT'],['LFO1QUANTIZE',4],['LFO2QUANTIZE',2],['LFO1RUN','STOP'],['LFO2RUN','STOP'],
  ['ADSR1_TYPE','LINEAR'],['ADSR2_TYPE','LINEAR'],['ADSR2MODE','SUST'],['ADSR1RETRIG','ON'],['ADSR2RETRIG','ON'],
  ['ADSR1SOURCE','INPUT 2'],['ADSR2SOURCE','INPUT 2'],['ENVSOURCE','INPUT 2'],['PITCH_SOURCE','INPUT 2'],['SEQRUN','PAUSE'],['SEQTEMPO','1/16']].map(([n,v])=>sel('controllers',n,v));
// Multi Delay Base Type Quad Parallel Delay (1) on channel A: both filter selectors are visible there (FW13 policy).
const MD_BASE={block:'multidelay',channel:'A',param:'BASETYPE',value:1};

const items=[];
function add(id,name,sels,question){
  const spec=id==='EN1'?{controls:[MD_BASE,...sels.map(s=>({block:s.block,channel:'A',param:s.param,value:s.value}))]}
    :{controllers:sels.map(s=>({channel:'A',param:s.param,value:s.value}))};
  const ref=id==='EN1'?{controls:[MD_BASE]}:{};
  const syx=compose(name,spec),b=body(syx),b0=body(compose(name,ref)),recs=records(b);
  assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
  // Only the declared words differ from the same preset without the selector writes; each is non-default.
  const offs=new Set();
  for(const s of sels){const r=recs.find(x=>x.family===s.block),o=r.start+2*s.pid;offs.add(o);offs.add(o+1);
    assert.equal(b.readUInt16LE(o),s.raw,s.param);assert.notEqual(b0.readUInt16LE(o),s.raw,'non-default '+s.param);s.before=b0.readUInt16LE(o);s.beforeShows=decodeValue(findParam(FAMILY[s.block],s.param),s.before);}
  for(let i=0;i<b.length;i++)if(!offs.has(i))assert.equal(b[i],b0[i],'only declared words '+id+' @'+i);
  items.push({id,file:id+'.syx',sha256:sha(syx),name,syx,question,
    blocks:recs.map(r=>({family:r.family,effectId:r.effectId,words:r.words,channels:r.channels,request:hex(R.bulkReadPoll(r.effectId)),expected:wordsOf(b,r),
      writes:sels.filter(s=>s.block===r.family).map(({block,...s})=>s)}))});
}
add('EN1','T30 ENUM BLOCKS',EN1,'PEQ band 1-5 types, Phaser LFO Quantize and Multi Delay Filter/Comb Filter Type on channel A: which option does FM3-Edit show?');
add('EN2','T30 ENUM CTRL',EN2,'17 Controllers selectors on Controllers channel A (LFO 1+2, ADSR 1 and 2, Envelope/Manual, Pitch, Sequencer pages): which option does FM3-Edit show?');
assert.notEqual(items[0].sha256,items[1].sha256);

const dir=path.join(out,'FM3_T30_ENUM');fs.mkdirSync(dir,{recursive:true});
for(const it of items)fs.writeFileSync(path.join(dir,it.file),it.syx);
for(const f of ['FM3_SHOT_LOAD.py','FM3_SHOT_READ.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py'])fs.copyFileSync(new URL(f,COLLECT),path.join(dir,f));
const manifest={kind:'fm3-shot-check',version:1,date:'2026-11-05',test:'T30',title:'Ülejäänud valikunupud: PEQ, Phaser, Multi Delay ja Controllers',experimental:false,observeOnly:true,
  method:'FM3_SHOT_LOAD.py --load sends one preset to the edit buffer (7F 00) and reads the PEQ, Phaser, Multi Delay and Controllers records with fn=0x1F (read-only); Claude reads FM3-Edit without saving. Nothing is stored or set.',
  items:items.map(({syx,...it})=>it)};
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
const L=['FM3 katse T30: ülejäänud valikunupud (ainult laadimine ja lugemine)','='.repeat(66),
 'Skriptid EI salvesta ega sea midagi. STORE-i pole vaja. FM3-Editis EI vajutata Save.',
 'Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse). "ERINEB" on siin tulemus, mitte viga.','',
 'Iga preseti jaoks: FM3-Edit ja Fractal-Bot kinni, siis Remote Control:',
 '  cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T30_ENUM && python3 FM3_SHOT_LOAD.py --self-test',
 '  python3 FM3_SHOT_LOAD.py --load --pack . --session ../FM3_T30_ENUM_SESSION --preset EN1',
 '  python3 FM3_SHOT_READ.py --pack . --session ../FM3_T30_ENUM_SESSION --preset EN1 --label after-load',
 '  (sama EN2 jaoks)','',
 'Pärast igat laadimist: Claude avab FM3-Editi ja teeb pildid; kui lehe vahetus taustal ei õnnestu, klõpsab Jan',
 'vahelehe ja kirjutab "ok". Siis FM3-Edit kinni.',''];
fs.writeFileSync(path.join(dir,'LOE_MIND.txt'),L.join('\n'));
console.log(JSON.stringify({manifest:sha(fs.readFileSync(path.join(dir,'manifest.json'))),items:items.map(i=>({id:i.id,sha256:i.sha256,writes:i.blocks.reduce((n,b)=>n+b.writes.length,0),
  readings:i.blocks.flatMap(b=>b.writes.map(w=>`${w.param}: ${w.beforeShows} -> ${w.shows}`))}))},null,1));

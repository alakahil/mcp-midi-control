// Build the T29 Feedback Send/Return pack. Offline; writes measurement presets, never device I/O.
// Finding (re-mined corpus, 2026-11-05): every composer preset already holds the Feedback Send (effect id 182,
// 2 words x 1 channel) and Feedback Return (186, 6 words x 1 channel) records: they are the "Send" at the end of
// row 2 and the "Return" at the start of row 3 that link the two rows. 507 of 507 corpus records hold the same
// words (Send 0,0; Return 65534,52427,32767,0,0,0), so there is no oracle for the Send scales yet: the dictionary
// decodes Send 0,0 as Send Level 0 % and Output Level -80 dB, which cannot be what a working two-row preset uses.
// Questions: does fn=0x1F read both records, is word n the dictionary pid n, and what does FM3-Edit show?
//   FS0: unchanged composer preset (device defaults) -> FM3-Edit readings of the Send and Return blocks.
//   FS1: Send Level 50 %, Send Output Level -10 dB, Return Level 80 %, Return Output Level -3 dB, Balance 20 %.
//        All values attenuate or pan; nothing raises the level.
// FM3_SHOT_LOAD.py --load sends one preset to the edit buffer (7F 00) and reads both records with fn=0x1F;
// Claude reads the FM3-Edit Send/Return pages. Nothing is stored or set.
// Usage: node tools/fm3/t29-feedback-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as R from './fm3-read-requests.mjs';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {findParam,encodeValue,OPT_IN_STATUSES}=await imp('scripts/fm3-table-encoder.mjs');
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump,reencodeRawPatch,reencodeDumpFromRawPatch}=await imp('scripts/fm3-codec.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t29-feedback-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const NEWLOOK=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const COMPOSER={schemaVersion:1,firmware:13,baseProfile:'jb-composer',compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const BLOCKS=[{family:'feedbacksend',dict:'FDBKSEND',effectId:182,words:2,expected:[0,0]},
  {family:'feedbackreturn',dict:'FDBKRET',effectId:186,words:6,expected:[65534,52427,32767,0,0,0]}];
const opts={allow:[...OPT_IN_STATUSES]};

function base(name){
  const syx=Buffer.from(composeSound(NEWLOOK,{composer:{...COMPOSER,name},layout:{row2:['compressor','drive','amp','cab'],row3:['delay','reverb']}}).syx);
  const body=Buffer.from(inspectStructure(syx).raw.body),recs=scanRecords(body).records;
  const at=BLOCKS.map(b=>{const r=recs.filter(x=>x.eid===b.effectId);assert.equal(r.length,1,b.dict);assert.equal(r[0].words,b.words);assert.equal(r[0].channels,1);
    assert.deepEqual([...Array(b.words).keys()].map(i=>body.readUInt16LE(r[0].start+2*i)),b.expected,'corpus default '+b.dict);return r[0];});
  return {syx,body,at};
}
function patch(syx,body,at,writes){
  const st=inspectStructure(syx),b=Buffer.from(body);
  for(const w of writes)b.writeUInt16LE(w.raw,at[BLOCKS.findIndex(x=>x.dict===w.family)].start+2*w.pid);
  const o=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(st.raw.rawPatch,b)));
  assert.deepEqual([...parsePresetDump(o,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
  assert.ok(Buffer.from(inspectStructure(o).raw.body).equals(b),'re-encode round trip');
  return o;
}
const w=(family,name,value,shows)=>{const p=findParam(family,name),raw=encodeValue(p,value,opts);
  return {family,param:p.name,channel:'A',pid:p.param,label:p.label,value,raw,shows};};
const FS1=[w('FDBKSEND','SENDLEVEL',50,'50.0 % (if the dictionary scale holds)'),w('FDBKSEND','OUTLEVEL',-10,'-10.0 dB (if the dictionary scale holds)'),
  w('FDBKRET','RETLEVEL',80,'80.0 %'),w('FDBKRET','LEVEL',-3,'-3.0 dB'),w('FDBKRET','PAN',20,'20.0 %')];

const items=[];
function add(id,name,writes,question){
  const {syx:s0,body:b0,at}=base(name);
  const syx=writes.length?patch(s0,b0,at,writes):s0,body=Buffer.from(inspectStructure(syx).raw.body);
  for(let i=0;i<body.length;i++)if(body[i]!==b0[i])assert.ok(writes.some(x=>{const o=at[BLOCKS.findIndex(b=>b.dict===x.family)].start+2*x.pid;return i===o||i===o+1;}),'only declared words '+id+' @'+i);
  items.push({id,file:id+'.syx',sha256:sha(syx),name,syx,question,
    blocks:BLOCKS.map((b,k)=>({family:b.family,effectId:b.effectId,words:b.words,channels:1,request:hex(R.bulkReadPoll(b.effectId)),
      expected:[...Array(b.words).keys()].map(i=>body.readUInt16LE(at[k].start+2*i)),writes:writes.filter(x=>x.family===b.dict)}))});
}
add('FS0','T29 FEEDBACK DEF',[],'Device defaults: what do the FM3-Edit Send and Return blocks show for Send 0,0 and Return 65534,52427,32767?');
add('FS1','T29 FEEDBACK',FS1,'Send Level 50 % / Output Level -10 dB, Return Level 80 % / Output Level -3 dB / Balance 20 %: which readings does FM3-Edit show?');
assert.notEqual(items[0].sha256,items[1].sha256);

const dir=path.join(out,'FM3_T29_FDBK');fs.mkdirSync(dir,{recursive:true});
for(const it of items)fs.writeFileSync(path.join(dir,it.file),it.syx);
for(const f of ['FM3_SHOT_LOAD.py','FM3_SHOT_READ.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py'])fs.copyFileSync(new URL(f,COLLECT),path.join(dir,f));
const manifest={kind:'fm3-shot-check',version:1,date:'2026-11-05',test:'T29',title:'Feedback Send/Return: lugemine, sõnade järjekord ja näidud',experimental:false,observeOnly:true,
  method:'FM3_SHOT_LOAD.py --load sends one preset to the edit buffer (7F 00) and reads the Feedback Send (182) and Return (186) records with fn=0x1F (read-only); Claude reads the FM3-Edit Send/Return blocks without saving. Nothing is stored or set.',
  items:items.map(({syx,...it})=>it)};
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
const L=['FM3 katse T29: Feedback Send/Return (ainult laadimine ja lugemine)','='.repeat(64),
 'Skriptid EI salvesta ega sea midagi. STORE-i pole vaja. FM3-Editis EI vajutata Save.',
 'Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse). "ERINEB" on siin tulemus, mitte viga.',
 'FS1 väärtused ainult vähendavad või panoreerivad taset, valjemaks ei lähe midagi.','',
 'Iga preseti jaoks: FM3-Edit ja Fractal-Bot kinni, siis Remote Control:',
 '  cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T29_FDBK && python3 FM3_SHOT_LOAD.py --self-test',
 '  python3 FM3_SHOT_LOAD.py --load --pack . --session ../FM3_T29_FDBK_SESSION --preset FS0',
 '  python3 FM3_SHOT_READ.py --pack . --session ../FM3_T29_FDBK_SESSION --preset FS0 --label after-load',
 '  (sama FS1 jaoks)','',
 'Pärast igat laadimist: Claude avab FM3-Editi, valib Send ja Return ploki ning teeb pildid; siis FM3-Edit kinni.',''];
fs.writeFileSync(path.join(dir,'LOE_MIND.txt'),L.join('\n'));
console.log(JSON.stringify({manifest:sha(fs.readFileSync(path.join(dir,'manifest.json'))),items:items.map(i=>({id:i.id,sha256:i.sha256,writes:i.blocks.reduce((n,b)=>n+b.writes.length,0)}))}));

// Build the T27 Multi Delay side-effect pack. Offline; writes measurement presets, never device I/O.
// Question: when the Multi Delay Base Type (pid 0) or Multi Delay preset (MULTITAP_PRESETS, pid 114) word is written
// on its own, does the FM3 keep the stored words, or does it rewrite other words on load or when the channel becomes
// active? The user's MD_TYPES export (2026-11-03, channels B/C/D chosen in FM3-Edit) changed Base Type and Presets
// together plus Diffusion Time and Ring Freq/Mix 1-4, so editor fills and device behaviour are not separated yet.
//   MDB_A..MDB_D: Base Type only, A=Quad Parallel(1) B=Quad Series(2) C=Quad Tape(4) D=Quad-Tap Band(5); every other
//     word is the device default. The four presets differ only in the Scene 1 channel (A/B/C/D), so the read-back
//     shows whether activating a channel rewrites its words.
//   MDS: Presets word only on A (12 Pealing Bells) and B (33 Aurora Delay), C = Presets 1 with Base Type 0
//     (inconsistent pair), D = Base Type 3 + Presets 3 (consistent pair). Scene 1 on channel A.
//   MDF: the device-default block (Quad-Tap Delay) as the baseline for the optional FM3-Edit preset sweep (part 2).
// FM3_SHOT_LOAD.py --load sends one preset to the edit buffer (7F 00) and compares all 484 words; FM3_SHOT_READ.py
// re-reads the block (all values saved). A mismatch is a result here, not an error. Nothing is stored or set.
// Usage: node tools/fm3/t27-multidelay-side-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as R from './fm3-read-requests.mjs';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {findParam}=await imp('scripts/fm3-table-encoder.mjs');
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump,reencodeRawPatch,reencodeDumpFromRawPatch}=await imp('scripts/fm3-codec.mjs');
const {scanRecords,readGrid}=await imp('scripts/fm3-layout.mjs');
const {MULTIDELAY_DONOR}=await imp('scripts/fm3-insert-blocks.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t27-multidelay-side-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const NEWLOOK=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const COMPOSER={schemaVersion:1,firmware:13,baseProfile:'jb-composer',compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const BASETYPE=findParam('multidelay','MULTITAP_BASETYPE'),PRESETS=findParam('multidelay','MULTITAP_PRESETS');
assert.equal(BASETYPE.param,0);assert.equal(BASETYPE.enum.length,6);assert.equal(PRESETS.param,114);assert.equal(PRESETS.enum.length,39);
const WORDS=121,CH='ABCD';

const mdp=name=>Buffer.from(composeSound(NEWLOOK,{composer:{...COMPOSER,name},insert:['multidelay'],selectedScene:1,
  layout:{row2:['compressor','drive','amp','cab'],row3:['delay','multidelay','reverb']},blockScenes:{multidelay:[{scene:1,bypass:false}]}}).syx);
const recordOf=syx=>{const body=Buffer.from(inspectStructure(syx).raw.body),rec=scanRecords(body,{requireAmpCab:false}).records.find(r=>r.eid===74);
  assert.ok(rec&&rec.words===WORDS&&rec.channels===4,'Multi Delay record');
  return {body,rec,words:Buffer.from(body.subarray(rec.start,rec.start+2*WORDS*4))};};
// Raw measurement words on a composed preset (the composer refuses Multi Delay writes); verified re-encode.
function patch(syx,writes,scene1Channel){
  const st=inspectStructure(syx),{body,rec}=recordOf(syx);
  for(const w of writes)body.writeUInt16LE(w.raw,rec.start+2*(CH.indexOf(w.channel)*WORDS+w.pid));
  body.writeUInt16LE(scene1Channel,rec.header+10);
  const o=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(st.raw.rawPatch,body)));
  assert.deepEqual([...parsePresetDump(o,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
  assert.ok(Buffer.from(inspectStructure(o).raw.body).equals(body),'re-encode round trip');
  return o;
}
const donor=recordOf(read(MULTIDELAY_DONOR.file));
assert.ok([0,1,2,3].every(c=>donor.words.readUInt16LE(2*c*WORDS)===0&&donor.words.readUInt16LE(2*(c*WORDS+114))===0),'donor: Quad-Tap Delay, preset 0');
const bt=(channel,raw)=>({param:'MULTITAP_BASETYPE',channel,pid:0,raw,label:BASETYPE.enum[raw]});
const ps=(channel,raw)=>({param:'MULTITAP_PRESETS',channel,pid:114,raw,label:PRESETS.enum[raw]});
const items=[];
function add(id,name,writes,scene1Channel,question){
  const syx=writes.length?patch(mdp(name),writes,scene1Channel):mdp(name);
  const r=recordOf(syx),exp=[...Array(WORDS*4).keys()].map(i=>r.words.readUInt16LE(2*i));
  // Only the declared words differ from the device default record.
  const changed=exp.map((v,i)=>v!==donor.words.readUInt16LE(2*i)?i:-1).filter(i=>i>=0);
  assert.deepEqual(changed,writes.map(w=>CH.indexOf(w.channel)*WORDS+w.pid).sort((a,b)=>a-b),'only declared words '+id);
  assert.equal(r.body.readUInt16LE(r.rec.header+10),scene1Channel,'scene 1 channel '+id);
  const cell=readGrid(r.body).find(g=>g.id===74);assert.ok(cell,'grid cell '+id);
  items.push({id,file:id+'.syx',sha256:sha(syx),name,syx,question,scene1Channel:CH[scene1Channel],
    placement:{row:cell.row+1,column:cell.col+1},
    blocks:[{family:'multidelay',effectId:74,words:WORDS,channels:4,request:hex(R.bulkReadPoll(74)),expected:exp,writes}]});
}
const baseWrites=[bt('A',1),bt('B',2),bt('C',4),bt('D',5)];
for(const c of [0,1,2,3])add('MDB_'+CH[c],'T27 MD BASE '+CH[c],baseWrites,c,
  `Base Type alone; Scene 1 on channel ${CH[c]}: does the device keep all 484 words, or fill words of the active channel?`);
add('MDS','T27 MD PRESETS',[ps('A',12),ps('B',33),ps('C',1),bt('D',3),ps('D',3)],0,
  'Presets word alone (A, B), inconsistent with Base Type (C), consistent pair (D): does the device apply a preset fill on load?');
add('MDF','T27 MD DEFAULT',[],0,'Device-default baseline for the optional FM3-Edit preset sweep (part 2).');
assert.equal(new Set(items.map(i=>i.sha256)).size,items.length,'distinct presets');

const dir=path.join(out,'FM3_T27_MDSIDE');fs.mkdirSync(dir,{recursive:true});
for(const it of items)fs.writeFileSync(path.join(dir,it.file),it.syx);
for(const f of ['FM3_SHOT_LOAD.py','FM3_SHOT_READ.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py'])fs.copyFileSync(new URL(f,COLLECT),path.join(dir,f));
const manifest={kind:'fm3-shot-check',version:1,date:'2026-11-05',test:'T27',title:'Multi Delay Base Type / Presets kõrvalmõjud',experimental:false,observeOnly:true,
  method:'FM3_SHOT_LOAD.py --load sends one preset to the edit buffer (7F 00) and reads the Multi Delay block back with fn=0x1F (all 484 words; read-only); FM3_SHOT_READ.py re-reads it and saves every value. A word that differs from the generated preset is the measured side effect. Nothing is stored or set.',
  donor:{file:MULTIDELAY_DONOR.file,sha256:MULTIDELAY_DONOR.sha256},
  editorFillsSeen:'MD_TYPES (2026-11-03): FM3-Edit preset 1-3 on B/C/D also changed Diffusion Time (pid 39) and Ring Freq/Mix 1-4 (pid 87-94)',
  items:items.map(({syx,...it})=>it)};
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
const p=items[0].placement;
const L=['FM3 katse T27: Multi Delay Base Type / Presets kõrvalmõjud (ainult laadimine ja lugemine)','='.repeat(66),
 'Skriptid EI salvesta ega sea midagi. STORE-i pole vaja. Preset on ainult redaktsioonipuhvris.',
 'FM3-Editis EI vajutata kunagi Save. Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse).',
 'Selles katses on "ERINEB" oodatav tulemus (kõrvalmõju), mitte viga.','',
 'OSA 1: viis laadimist (Remote Control käivitab, sinult tegevust ei vaja)',
 '  0. Sulge FM3-Edit ja Fractal-Bot (USB-port on ainukasutuses).',
 '  1. cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T27_MDSIDE && python3 FM3_SHOT_LOAD.py --self-test',
 '  2. Iga ID kohta (MDB_A, MDB_B, MDB_C, MDB_D, MDS):',
 '       python3 FM3_SHOT_LOAD.py --load --pack . --session ../FM3_T27_MDSIDE_SESSION --preset ID',
 '       python3 FM3_SHOT_READ.py --pack . --session ../FM3_T27_MDSIDE_SESSION --preset ID --label after-load',
 `  Multi Delay on rida ${p.row}, veerg ${p.column} (Delay ja Reverb vahel).`,'',
 'OSA 2 (valikuline, ainult kui REA ei anna presetite tabelit): FM3-Editi presetivalik',
 '  Claude laadib MDF, valib FM3-Editis kanalil A ühe Multi Delay preseti (ei salvesta), sulgeb FM3-Editi',
 '  ja loeb ploki: python3 FM3_SHOT_READ.py --pack . --session ../FM3_T27_MDSIDE_SESSION --preset MDF --label pNN','',
 'Kirjuta Claude\'ile "valmis", kui osa 1 on tehtud.',''];
fs.writeFileSync(path.join(dir,'LOE_MIND.txt'),L.join('\n'));
console.log(JSON.stringify({manifest:sha(fs.readFileSync(path.join(dir,'manifest.json'))),placement:p,
  items:items.map(i=>({id:i.id,sha256:i.sha256,scene1:i.scene1Channel,writes:i.blocks[0].writes.map(w=>`${w.channel}:${w.param.slice(9)}=${w.raw} ${w.label}`)}))},null,1));

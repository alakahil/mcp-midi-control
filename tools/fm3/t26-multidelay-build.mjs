// Build the T26 Multi Delay test packs (placement + CPU). Offline; writes measurement presets, never device I/O.
// Goal: confirm on the FM3 that the composer's Multi Delay insertion (0.3.47, fm3-insert-blocks.mjs, donor pair
// fm3-multidelay-*-20261103.syx) loads as generated, appears in the grid where the layout put it, and measure its
// CPU cost per Base Type so the CPU estimate can count it.
//   FM3_T26_PLACE (FM3_SHOT_LOAD.py --load): MDP = NewLook + Optical Compressor + Multi Delay between Delay and
//     Reverb (row 3), engaged in Scene 1. The loader reads the Multi Delay block back with fn=0x1F (121 words x 4
//     channels) and compares every word with the device-default donor record. Claude then takes FM3-Edit screenshots
//     (grid position, block type "Quad-Tap Delay").
//   FM3_T26_CPU (FM3_CPU_SWEEP.py): cal-newlook (52.8 %, stops on mismatch), the MDP preset, Base Type 1..5 written as
//     a raw word on channel A (measurement only; the composer refuses Multi Delay writes), and the device-authored
//     channels B/C/D of the user's MD_TYPES export (types 1..3 set in FM3-Edit) selected in Scene 1. CPU of an item
//     minus cal-newlook = Multi Delay cost (Delay and Reverb are unchanged; bypass does not save CPU).
// Nothing is stored or set. Usage: node tools/fm3/t26-multidelay-build.mjs OUT_DIR
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
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t26-multidelay-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const NEWLOOK=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const COMPOSER={schemaVersion:1,firmware:13,baseProfile:'jb-composer',compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const BASETYPE=findParam('multidelay','MULTITAP_BASETYPE');assert.equal(BASETYPE.param,0);assert.equal(BASETYPE.enum.length,6);

const mdp=name=>Buffer.from(composeSound(NEWLOOK,{composer:{...COMPOSER,name},insert:['multidelay'],selectedScene:1,
  layout:{row2:['compressor','drive','amp','cab'],row3:['delay','multidelay','reverb']},blockScenes:{multidelay:[{scene:1,bypass:false}]}}).syx);
// Measurement edits on a composed preset: Multi Delay words and Scene 1 channel; verified re-encode.
function patch(syx,{words=null,writes=[],scene1Channel=0}={}){
  const st=inspectStructure(syx),body=Buffer.from(st.raw.body),rec=scanRecords(body).records.find(r=>r.family==='multidelay');
  assert.ok(rec&&rec.words===121&&rec.channels===4,'Multi Delay record');
  if(words){assert.equal(words.length,2*121*4);words.copy(body,rec.start);}
  for(const w of writes)body.writeUInt16LE(w.raw,rec.start+2*('ABCD'.indexOf(w.channel)*rec.words+w.pid));
  body.writeUInt16LE(scene1Channel,rec.header+10);
  const o=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(st.raw.rawPatch,body)));
  assert.deepEqual([...parsePresetDump(o,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
  assert.ok(Buffer.from(inspectStructure(o).raw.body).equals(body),'re-encode round trip');
  return o;
}
const recordOf=syx=>{const body=Buffer.from(inspectStructure(syx).raw.body),rec=scanRecords(body,{requireAmpCab:false}).records.find(r=>r.eid===74);
  return {body,rec,words:Buffer.from(body.subarray(rec.start,rec.start+2*rec.words*rec.channels))};};
const donor=recordOf(read(MULTIDELAY_DONOR.file)),types=recordOf(read('references/fm3-multidelay-types-20261103.syx'));
const typeOf=(w,ch)=>w.readUInt16LE(2*ch*121);
assert.deepEqual([0,1,2,3].map(ch=>typeOf(types.words,ch)),[0,1,2,3],'MD_TYPES channels A-D = Base Type 0-3');
assert.ok([0,1,2,3].every(ch=>typeOf(donor.words,ch)===0),'donor: Quad-Tap Delay on every channel');

// ---- FM3_T26_PLACE ----
const place=mdp('SHOT T26 MULTIDELAY');
const pr=recordOf(place);assert.ok(pr.words.equals(donor.words),'placed words = device defaults');
const cell=readGrid(pr.body).find(g=>g.id===74);assert.ok(cell,'grid cell');
const placeItem={id:'MDP',file:'MDP.syx',sha256:sha(place),name:'SHOT T26 MULTIDELAY',
  placement:{row:cell.row+1,column:cell.col+1,mask:cell.mask,scene1:'channel A, engaged',scenes2to8:'channel A, bypassed'},
  blocks:[{family:'multidelay',effectId:74,words:121,channels:4,request:hex(R.bulkReadPoll(74)),expected:[...Array(484).keys()].map(i=>pr.words.readUInt16LE(2*i)),
    writes:[0,1,2,3].map(ch=>({param:'MULTITAP_BASETYPE',channel:'ABCD'[ch],pid:0,raw:0}))}],
  shots:[{what:'grid',expect:`Multi Delay in row ${cell.row+1}, column ${cell.col+1}, between Delay and Reverb`},{what:'Multi Delay block, channel A',expect:'Base Type Quad-Tap Delay (device default)'}]};

// ---- FM3_T26_CPU ----
const cpuItems=[];const add=(id,syx,meta)=>cpuItems.push({id,family:'multidelay',syx,...meta});
add('cal-newlook',Buffer.from(composeSound(NEWLOOK,{composer:{...COMPOSER,name:'CPU CAL NEWLOOK'},layout:{row2:['compressor','drive','amp','cab'],row3:['delay','reverb']}}).syx),{expectPercent:52.8,family:'calibration',note:'NewLook + Optical Compressor (= 0.3.x sweep reference)'});
add('md:0',patch(mdp('CPU MD QUAD TAP')),{baseType:0,type:BASETYPE.enum[0],source:'device-default donor record'});
for(let t=1;t<6;t++)add('md:'+t,patch(mdp('CPU MD TYPE '+t),{writes:[{channel:'A',pid:0,raw:t}]}),{baseType:t,type:BASETYPE.enum[t],source:'raw Base Type word on channel A (other words default)'});
for(const ch of [1,2,3])add('md-editor:'+'ABCD'[ch],patch(mdp('CPU MD EDIT '+'ABCD'[ch]),{words:types.words,scene1Channel:ch}),
  {baseType:ch,type:BASETYPE.enum[ch],source:`MD_TYPES export channel ${'ABCD'[ch]} (type set in FM3-Edit), Scene 1 on channel ${'ABCD'[ch]}`});
for(const it of cpuItems)if(it.id!=='cal-newlook'){const r=recordOf(it.syx);const ch=r.body.readUInt16LE(r.rec.header+10);assert.equal(typeOf(r.words,ch),it.baseType,'scene 1 type '+it.id);}

// ---- write packs ----
const copy=(dir,files)=>{for(const f of files)fs.copyFileSync(new URL(f,COLLECT),path.join(dir,f));};
const pdir=path.join(out,'FM3_T26_PLACE');fs.mkdirSync(pdir,{recursive:true});fs.writeFileSync(path.join(pdir,placeItem.file),place);
copy(pdir,['FM3_SHOT_LOAD.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py']);
const pm={kind:'fm3-shot-check',version:1,date:'2026-11-04',test:'T26',title:'Multi Delay paigutus',experimental:false,
  method:'FM3_SHOT_LOAD.py --load sends one composer preset to the edit buffer (7F 00) and reads the Multi Delay block back with fn=0x1F (all words, all channels; read-only). FM3-Edit screenshots confirm the grid position and the default type. Nothing is stored or set.',
  donor:{file:MULTIDELAY_DONOR.file,sha256:MULTIDELAY_DONOR.sha256},items:[placeItem]};
fs.writeFileSync(path.join(pdir,'manifest.json'),JSON.stringify(pm,null,1)+'\n');
const cdir=path.join(out,'FM3_T26_CPU');fs.mkdirSync(path.join(cdir,'presets'),{recursive:true});copy(cdir,['FM3_CPU_SWEEP.py']);
const cm={schemaVersion:1,builder:'t26-multidelay-build 0.1.0',test:'T26',calibrationOnly:false,confirmName:'CPU CAL NEWLOOK',reference:'cal-newlook',scene:1,header:'7f0000400',
  note:'Multi Delay cost of an item = CPU(item) - CPU(cal-newlook); every item is cal-newlook plus one Multi Delay block in row 3.',
  items:cpuItems.map((it,i)=>{const f=`presets/${String(i).padStart(3,'0')}.syx`;fs.writeFileSync(path.join(cdir,f),it.syx);const {syx,...meta}=it;return {...meta,file:f,sha256:sha(syx)};})};
fs.writeFileSync(path.join(cdir,'manifest.json'),JSON.stringify(cm,null,1)+'\n');
const L=['FM3 katse T26: Multi Delay paigutus ja CPU (ainult laadimine ja lugemine)','='.repeat(60),
 'Skriptid EI salvesta ega sea midagi. STORE-i pole vaja. Preset on ainult redaktsioonipuhvris; preseti vahetamine kustutab selle.',
 'FM3-Editis EI vajutata kunagi Save. Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse).','',
 'OSA 1: paigutus (Remote Control laadib, Claude teeb FM3-Editi pildid)',
 '  0. Sulge FM3-Edit ja Fractal-Bot (USB-port on ainukasutuses).',
 '  1. cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T26_PLACE && python3 FM3_SHOT_LOAD.py --self-test',
 '  2. python3 FM3_SHOT_LOAD.py --load --pack . --session ../FM3_T26_PLACE_SESSION --preset MDP',
 '     Skript kontrollib ise, et seade hoiab kõiki 484 Multi Delay väärtust ("Kõik plokid klapivad").',
 `  3. FM3-Editis: Multi Delay rida ${cell.row+1}, veerg ${cell.col+1} (Delay ja Reverb vahel); ploki tüüp Quad-Tap Delay.`,'',
 'OSA 2: CPU (Jan käivitab ise Terminalis, umbes 1 minut)',
 '  0. Sulge FM3-Edit.',
 '  1. cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T26_CPU',
 '  2. python3 FM3_CPU_SWEEP.py --pack . --session ../FM3_T26_CPU_SESSION',
 '     Esimese preseti järel küsib skript, kas FM3 ekraanil on nimi "CPU CAL NEWLOOK". Vasta j ja Enter.',
 `     Edasi läheb ise läbi (${cpuItems.length} presetti). Lõpus vali FM3-l mõni preset; midagi ei salvestatud.`,'',
 'Kirjuta Claude\'ile "valmis", kui mõlemad osad on tehtud.',''];
for(const d of [pdir,cdir])fs.writeFileSync(path.join(d,'LOE_MIND.txt'),L.join('\n'));
console.log(JSON.stringify({place:{sha256:placeItem.sha256,cell:placeItem.placement,manifest:sha(fs.readFileSync(path.join(pdir,'manifest.json')))},
  cpu:{items:cm.items.map(i=>i.id+(i.type?' '+i.type:'')),manifest:sha(fs.readFileSync(path.join(cdir,'manifest.json')))}},null,1));

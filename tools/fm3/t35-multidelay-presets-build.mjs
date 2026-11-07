// Build the T35 Multi Delay preset sweep pack (audit O4/H3). Offline; writes one measurement preset, never device I/O.
// One preset with the device-default Multi Delay block (Quad-Tap Delay, preset word 0 on all channels; the same
// composition as the T27 MDF baseline). FM3_MD_PRESETS.py loads it to the edit buffer (7F 00), checks all 484 words,
// lets the user choose one "Type" (MULTITAP_PRESETS, 39 choices) on channel A, reads the block again (fn=0x1F) and
// saves it; then it reloads the default for the next Type. All 39 Types are listed: 34 never measured, 0..3 from the
// device default (the MD_TYPES export had an unknown start state) and 12 Pealing Bells as a repeat of T27.
// Nothing is stored or set by the scripts.
// Usage: node tools/fm3/t35-multidelay-presets-build.mjs OUT_DIR
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
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {scanRecords,readGrid}=await imp('scripts/fm3-layout.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t35-multidelay-presets-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const NEWLOOK=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const PRESETS=findParam('multidelay','MULTITAP_PRESETS');assert.equal(PRESETS.param,114);assert.equal(PRESETS.enum.length,39);
const WORDS=121,NAME='T35 MD DEFAULT';
const syx=Buffer.from(composeSound(NEWLOOK,{composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:NAME,compressorChannels:[{channel:'A',type:'Optical Compressor'}]},
  insert:['multidelay'],recordOrder:'append',selectedScene:1,layout:{row2:['compressor','drive','amp','cab'],row3:['delay','multidelay','reverb']},blockScenes:{multidelay:[{scene:1,bypass:false}]}}).syx);
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const body=Buffer.from(inspectStructure(syx).raw.body),rec=scanRecords(body,{requireAmpCab:false}).records.find(r=>r.eid===74);
assert.ok(rec&&rec.words===WORDS&&rec.channels===4,'Multi Delay record');
const expected=[...Array(4*WORDS).keys()].map(i=>body.readUInt16LE(rec.start+2*i));
const o4=JSON.parse(read('references/fm3-o4-multidelay-presets-20261107.json'));
assert.deepEqual(expected.slice(0,WORDS),o4.defaultChannel.words,'default channel = T27 MDF baseline');
for(let c=1;c<4;c++)assert.deepEqual(expected.slice(c*WORDS,(c+1)*WORDS),o4.defaultChannel.words);
assert.equal(body.readUInt16LE(rec.header+10),0,'Scene 1 on channel A');
const cell=readGrid(body).find(g=>g.id===74);assert.ok(cell);
const dir=path.join(out,'FM3_T35_MDPRESETS');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'T35_MD_DEFAULT.syx'),syx);
for(const f of ['FM3_MD_PRESETS.py','FM3_SHOT_LOAD.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py'])fs.copyFileSync(new URL(f,COLLECT),path.join(dir,f));
const measured={1:'MD_TYPES export (start state unknown)',2:'MD_TYPES export (start state unknown)',3:'MD_TYPES export (start state unknown)',12:'T27 (repeat check)'};
const manifest={kind:'fm3-md-presets',version:1,date:'2026-11-07',test:'T35',audit:'O4/H3',confirmName:NAME,
 preset:{file:'T35_MD_DEFAULT.syx',sha256:sha(syx)},placement:{row:cell.row+1,column:cell.col+1},
 block:{family:'multidelay',effectId:74,words:WORDS,channels:4,request:hex(R.bulkReadPoll(74)),expected},
 presets:PRESETS.enum.map((label,index)=>({index,label:label.trim(),...(measured[index]?{before:measured[index]}:{})})),
 method:'FM3_MD_PRESETS.py --run: per Type, edit-buffer load of the default preset (7F 00) + fn=0x1F read (must equal the default), the user chooses the Type on channel A (front panel or FM3-Edit, no Save), fn=0x1F read saved. The script never stores and never sets.'};
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
const L=['FM3 katse T35 (Multi Delay presetid): kõik 39 Type valikut, ainult laadimine ja lugemine','='.repeat(70),
 'Skriptid EI salvesta ega sea midagi. STORE-i pole. FM3-Editis EI vajutata kunagi Save.',
 'Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse). Umbes 20-40 minutit.','',
 '0. Sulge FM3-Edit ja Fractal-Bot.',
 '   cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T35_MDPRESETS && python3 FM3_MD_PRESETS.py --self-test',
 '1. Käivita:',
 '   python3 FM3_MD_PRESETS.py --run --pack . --session ../FM3_T35_SESSION',
 `   Skript laadib preseti "${NAME}" (Multi Delay rida ${cell.row+1}, veerg ${cell.col+1}) ja kontrollib seda.`,
 '2. Iga sammu juures ütleb skript, millise Type valida. Vali see Multi Delay plokis KANALIL A:',
 '   - kiireim on FM3 esipaneel (Multi Delay plokk -> Type);',
 '   - või FM3-Edit: ava, vali Type, sulge FM3-Edit ILMA Save-ta, alles siis vajuta Enter.',
 '   Vajuta Enter. Skript loeb ploki ja laadib järgmiseks sammuks vaikimisi preseti uuesti.',
 '   v = jäta see Type vahele, q = lõpeta (sama käsk jätkab hiljem sealt, kus pooleli jäi).',
 '3. Kui skript ütleb "Ei klapi", kontrolli Type nime ja kanalit A; Enter loeb uuesti.','',
 'Lõpuks kirjuta vestlusesse "valmis".',''];
fs.writeFileSync(path.join(dir,'LOE_MIND.txt'),L.join('\n'));
console.log(JSON.stringify({manifest:sha(fs.readFileSync(path.join(dir,'manifest.json'))),preset:sha(syx),placement:manifest.placement,presets:manifest.presets.length}));

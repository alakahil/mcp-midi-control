// Build the T52 Plex preset sweep pack. Offline; writes one measurement preset, never device I/O.
// One preset with the device-default Plex block (channel A, engaged in scene 1). FM3_PLEX_PRESETS.py (derived from the
// T35 collector FM3_MD_PRESETS.py by fixed text substitutions, checked below) loads it to the edit buffer (7F 00), checks
// every word, lets the user choose one Plex preset (PLEX_PRESETS, pid 90, 45 choices) on channel A, reads the block again
// (fn=0x1F) and saves it; then it reloads the default for the next one. Ghidra 2026-11-12: the preset names are not in
// the FM3-Edit binary, so the 45 channel images can only come from the device. Nothing is stored or set by the scripts.
// Usage: node tools/fm3/t52-plex-presets-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as R from './fm3-read-requests.mjs';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {findParam}=await imp('scripts/fm3-table-encoder.mjs');
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {scanRecords,readGrid}=await imp('scripts/fm3-layout.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t52-plex-presets-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const NEWLOOK=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const EID=178,PID=90,NAME='T52 PLEX DEFAULT';
const PRESETS=findParam('plex','PLEX_PRESETS');assert.equal(PRESETS.param,PID);assert.equal(PRESETS.enum.length,45);
const r=composeSound(NEWLOOK,{composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:NAME,compressorChannels:[{channel:'A',type:'Optical Compressor'}]},
  insert:['plex'],selectedScene:1,layout:{row2:['compressor','drive','amp','cab'],row3:['delay','plex','reverb']},blockScenes:{plex:[{scene:1,bypass:false}]}});
const syx=Buffer.from(r.syx);
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const body=Buffer.from(inspectStructure(syx).raw.body),rec=scanRecords(body,{requireAmpCab:false}).records.find(x=>x.eid===EID);
assert.ok(rec&&rec.channels===4&&rec.words>PID,'Plex record');
const WORDS=rec.words,expected=[...Array(4*WORDS).keys()].map(i=>body.readUInt16LE(rec.start+2*i));
assert.equal(body.readUInt16LE(rec.header+10),0,'Scene 1 on channel A');
const cell=readGrid(body).find(g=>g.id===EID);assert.ok(cell);
// Derive the collector: same guarded code as FM3_MD_PRESETS.py, only the block constants and the texts differ.
let py=fs.readFileSync(new URL('FM3_MD_PRESETS.py',COLLECT),'utf8');
const sub=(a,b,n)=>{const k=py.split(a).length-1;assert.ok(n===undefined?k>0:k===n,`collector text "${a}": ${k}`);py=py.split(a).join(b);};
sub('WORDS = 121','WORDS = '+WORDS,1);sub('[114]','['+PID+']');sub("{'pid': 114,","{'pid': "+PID+",",1);sub("== [0, 10, 114]","== [0, 10, "+PID+"]",1);
sub('0x1f, 74, 0]','0x1f, '+(EID&127)+', '+(EID>>7)+']',1);sub('fm3-md-presets','fm3-plex-presets');sub('fm3-md-preset','fm3-plex-preset');
sub('md-preset-','plex-preset-');sub('Multi Delay preset sweep (T35)','Plex preset sweep (T52)',1);sub('Multi Delay','Plex');sub('FM3_MD_PRESETS.py','FM3_PLEX_PRESETS.py');
sub('"Type", 39 choices','45 choices',1);sub('Type = "%s"','Preset = "%s"',1);sub('all 484 words','all '+4*WORDS+' words',1);
sub("'algorithm': a[0]","'type': a[0]",1);sub("'algorithm': 2","'type': 2",1);sub("'algorithm': 0","'type': 0",1);
const dir=path.join(out,'FM3_T52_PLEXPRESETS');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'T52_PLEX_DEFAULT.syx'),syx);fs.writeFileSync(path.join(dir,'FM3_PLEX_PRESETS.py'),py);
for(const f of ['FM3_SHOT_LOAD.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py'])fs.copyFileSync(new URL(f,COLLECT),path.join(dir,f));
const manifest={kind:'fm3-plex-presets',version:1,date:'2026-11-12',test:'T52',confirmName:NAME,
 preset:{file:'T52_PLEX_DEFAULT.syx',sha256:sha(syx)},placement:{row:cell.row+1,column:cell.col+1},
 block:{family:'plex',effectId:EID,words:WORDS,channels:4,request:hex(R.bulkReadPoll(EID)),expected},
 presets:PRESETS.enum.map((label,index)=>({index,label:label.trim()})),
 collector:{file:'FM3_PLEX_PRESETS.py',sha256:sha(Buffer.from(py)),derivedFrom:'FM3_MD_PRESETS.py'},
 method:'FM3_PLEX_PRESETS.py --run: per preset, edit-buffer load of the default preset (7F 00) + fn=0x1F read (must equal the default), the user chooses the Plex preset on channel A (front panel or FM3-Edit, no Save), fn=0x1F read saved. The script never stores and never sets.'};
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
const L=['FM3 katse T52 (Plexi presetid): kõik 45 valikut, ainult laadimine ja lugemine','='.repeat(70),
 'Skriptid EI salvesta ega sea midagi. STORE-i pole. FM3-Editis EI vajutata kunagi Save.',
 'Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse). Umbes 30-45 minutit.','',
 '0. Sulge FM3-Edit ja Fractal-Bot.',
 '   cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T52_PLEXPRESETS && python3 -B FM3_PLEX_PRESETS.py --self-test',
 '1. Käivita:',
 '   python3 -B FM3_PLEX_PRESETS.py --run --pack . --session ../FM3_T52_SESSION',
 `   Skript laadib preseti "${NAME}" (Plex rida ${cell.row+1}, veerg ${cell.col+1}) ja kontrollib seda.`,
 '2. Iga sammu juures ütleb skript, millise Plexi preseti valida. Vali see Plex plokis KANALIL A:',
 '   - kiireim on FM3 esipaneel (Plex plokk -> Preset);',
 '   - või FM3-Edit: ava, vali preset, sulge FM3-Edit ILMA Save-ta, alles siis vajuta Enter.',
 '   Vajuta Enter. Skript loeb ploki ja laadib järgmiseks sammuks vaikimisi preseti uuesti.',
 '   v = jäta see vahele, q = lõpeta (sama käsk jätkab hiljem sealt, kus pooleli jäi).',
 '3. Kui skript ütleb "Ei klapi", kontrolli preseti nime ja kanalit A; Enter loeb uuesti.',
 '   Kui FM3 preseti sõna ei salvesta (alati "Ei klapi"), vajuta s (salvesta nii nagu on) ja kirjuta sellest vestlusesse.','',
 'Lõpuks kirjuta vestlusesse "valmis".',''];
fs.writeFileSync(path.join(dir,'LOE_MIND.txt'),L.join('\n'));
execFileSync('python3',['-B',path.join(dir,'FM3_PLEX_PRESETS.py'),'--self-test'],{stdio:'pipe'});
console.log(JSON.stringify({manifest:sha(fs.readFileSync(path.join(dir,'manifest.json'))),preset:sha(syx),words:WORDS,placement:manifest.placement,presets:manifest.presets.length,cpu:r.report.cpu?.maxPercent}));

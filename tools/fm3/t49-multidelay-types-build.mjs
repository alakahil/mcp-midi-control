// Build the T49 Multi Delay Type pack: the 31 Types whose generated import was never checked on the device (T35 read all
// 39 images; T36/T38/H2 confirmed 8). Offline; writes eight load-only presets T49A..H, never device I/O.
// Each preset is made only through the public generator input multidelayTypes, four Types on channels A..D (T49H: three),
// scenes 1..4 engage the Multi Delay on channels A..D. Questions per preset: does the FM3 hold every generated word after
// loading (fn=0x1F read-back), does FM3-Edit show the Type names, and do the channels sound like those Types?
// FM3_SHOT_LOAD.py --load sends one preset to the edit buffer (7F 00) and reads the Multi Delay block back. Nothing is stored or set.
// Usage: node tools/fm3/t49-multidelay-types-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as R from './fm3-read-requests.mjs';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {multidelayType}=await imp('scripts/fm3-multidelay-types.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t49-multidelay-types-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const NEWLOOK=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const WORDS=121,EID=74;
const {MULTIDELAY_TYPE_LABELS}=await imp('scripts/fm3-multidelay-types.mjs');
export const CONFIRMED=['Pealing Bells','Dub Echo','Mono Diffuser','Aurora Delay','Ya-Ya Delay','L-C-R-C','Space Tape','Centaurus X-3'];
export const REMAINING=MULTIDELAY_TYPE_LABELS.filter(t=>!CONFIRMED.includes(t));
assert.equal(REMAINING.length,31,'31 unconfirmed Types');
const CH=['A','B','C','D'],items=[];
for(let k=0;k*4<REMAINING.length;k++){
 const id='T49'+String.fromCharCode(65+k),NAME=id+' MD TYPES',TYPES=REMAINING.slice(4*k,4*k+4).map((t,i)=>[CH[i],t]);
 const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:NAME,compressorChannels:[{channel:'A',type:'Optical Compressor'}],
    scenes:TYPES.map(([c,t],i)=>({scene:i+1,name:(c+' '+t).slice(0,31)}))},
  insert:['multidelay'],selectedScene:1,layout:{row2:['compressor','drive','amp','cab'],row3:['delay','multidelay','reverb']},
  multidelayTypes:TYPES.map(([channel,type])=>({channel,type})),
  blockScenes:{multidelay:TYPES.map(([channel],i)=>({scene:i+1,channel,bypass:false}))}};
 const r=composeSound(NEWLOOK,spec),syx=Buffer.from(r.syx);
 assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
 const body=Buffer.from(inspectStructure(syx).raw.body),rec=scanRecords(body,{requireAmpCab:false}).records.find(x=>x.eid===EID);
 assert.ok(rec&&rec.words===WORDS&&rec.channels===4,'Multi Delay record');
 const expected=[...Array(4*WORDS).keys()].map(i=>body.readUInt16LE(rec.start+2*i));
 TYPES.forEach(([c,t],j)=>assert.deepEqual(expected.slice(j*WORDS,(j+1)*WORDS),[...multidelayType(t).words],c+' '+t));
 const cpu=r.report.cpu;assert.ok(cpu&&cpu.maxPercent<cpu.limitPercent,id+' CPU estimate under the safe limit');
 items.push({id,file:id+'.syx',sha256:sha(syx),name:NAME,syx,generator:r.report.generator,cpuEstimate:cpu.scenes.slice(0,TYPES.length).map(s=>s.percent),
  question:'Holds the FM3 all generated Multi Delay words? FM3-Edit Type per channel = '+TYPES.map(([c,t])=>c+' '+t).join(' / ')+'? Scenes 1..'+TYPES.length+' sound like those Types?',
  types:TYPES.map(([channel,type])=>({channel,type,index:multidelayType(type).index})),
  blocks:[{family:'multidelay',effectId:EID,words:WORDS,channels:4,request:hex(R.bulkReadPoll(EID)),expected,writes:[]}]});
}
const dir=path.join(out,'FM3_T49_MDTYPES');fs.mkdirSync(dir,{recursive:true});
for(const it of items)fs.writeFileSync(path.join(dir,it.file),it.syx);
for(const f of ['FM3_SHOT_LOAD.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py'])fs.copyFileSync(new URL(f,COLLECT),path.join(dir,f));
const manifest={kind:'fm3-shot-check',version:1,date:'2026-11-12',test:'T49',title:'Multi Delay ülejäänud 31 Type malli (multidelayTypes): laadimine, lugemine, kuulamine',experimental:false,observeOnly:true,
  method:'FM3_SHOT_LOAD.py --load --preset ID sends one generated preset to the edit buffer (7F 00) and reads the Multi Delay record (74) with fn=0x1F (read-only), word for word against the generated file; FM3-Edit Type names are read without saving and the user listens to scenes 1..4. Nothing is stored or set.',
  items:items.map(({syx,generator,...it})=>it)};
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
const L=['FM3 katse T49: Multi Delay ülejäänud 31 Type malli (ainult laadimine ja lugemine)','='.repeat(64),
 'Skriptid EI salvesta ega sea midagi. STORE-i pole vaja. FM3-Editis EI vajutata Save.',
 'Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse).','',
 'Kaheksa presetti. Igas on Multi Delay kanalitel A–D neli Type malli; stseenid 1–4 valivad kanali A–D (plokk sees).',
 ...items.map(it=>it.id+': '+it.types.map(t=>t.channel+' '+t.type).join(', ')+'  (CPU hinnang '+it.cpuEstimate.join('/')+' %)'),'',
 'Enne: cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T49_MDTYPES && python3 -B FM3_SHOT_LOAD.py --self-test','',
 'Iga preseti kohta (T49A, siis T49B ... T49H):',
 '1. FM3-Edit ja Fractal-Bot kinni, siis Terminalis:',
 '   python3 -B FM3_SHOT_LOAD.py --load --pack . --session ../FM3_T49_SESSION --preset T49A',
 '   Oodatud: "multidelay KLAPIB".',
 '2. Kirjuta vestlusesse "ok". Claude avab FM3-Editi (Save-nuppu ei vajutata), pildistab Multi Delay Type välja',
 '   kanalitel A–D ja CPU ning sulgeb FM3-Editi.',
 '3. Mängi stseenid 1–4 läbi. Kirjuta iga stseeni kohta lühidalt: kõlab nagu nimi lubab / vaikne / imelik.',
 '4. Järgmine preset: sama käsk järgmise tähega.','',
 'Kui mõni laadimine ei klapi, peatu ja kirjuta vestlusesse; ära jätka.',''];
fs.writeFileSync(path.join(dir,'LOE_MIND.txt'),L.join('\n'));
console.log(JSON.stringify({manifest:sha(fs.readFileSync(path.join(dir,'manifest.json'))),presets:items.length,types:items.flatMap(i=>i.types).length,sha256:Object.fromEntries(items.map(i=>[i.id,i.sha256])),cpuMax:Math.max(...items.flatMap(i=>i.cpuEstimate))}));

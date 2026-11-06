// Build the T32 packs: one complete usage preset (audit 06.11.2026, H1) checked on the device for sound, scene
// level balance, real CPU in all 8 scenes and STORE/reload. Offline; writes the packs, never device I/O.
// The preset is composed only from features that are already writable (Amp/Cab/Drive/Chorus/Delay/Reverb channel
// templates, scenes, Multi Delay insert with device defaults). No commercial preset content is used.
//   FM3_T32_LIVE  (FM3_CPU_SCENES.py): loads LIVE.syx into the edit buffer; the USER selects scenes 1..8, listens to
//                  each and writes a short impression; the script reads the CPU meter after each selection.
//   FM3_T32_STORE (FM3_BIND_STORE.py --load / --verify): loads the same preset again; the USER STOREs it to 424,
//                  selects another preset, comes back and answers the same checks; --verify reads location 424
//                  with the read-only stored-dump request. The scripts never store and never set.
// Usage: node tools/fm3/t32-live-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset,writePresetOutputs,verifyPresetOutputs}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {estimateCpu}=await imp('scripts/fm3-cpu.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t32-live-build.mjs OUT_DIR');
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const NAME='T32 LIVE KOOSLUS';
const sc=(scene,name,amp,{drive=false,chorus=false,delay=false,reverb=true,reverbChannel='A'}={})=>({scene,name,blocks:{
  amp:{channel:amp,bypass:false},cab:{channel:amp,bypass:false},drive:{channel:'A',bypass:!drive},chorus:{channel:'A',bypass:!chorus},
  delay:{channel:'A',bypass:!delay},reverb:{channel:reverbChannel,bypass:!reverb}}});
export const spec={
  purpose:'T32 (H1): päris kasutuspreseti koondkatse. 4 põhistseeni (CLEAN, CRUNCH, LEAD, AMBIENT) + 4 varianti; Multi Delay (Quad-Tap, seadme vaikimisi) ainult Scene 4-s. Kontrollitakse heli, stseenide nivood, tegelik CPU 8 stseenis ja STORE/reload.',
  context:{guitar:'Ibanez AS-120',pickups:'humbucker',output:'OUT1 stereo FOH'},
  composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:NAME,
    ampChannels:[{channel:'A',model:'Deluxe Verb Normal'},{channel:'B',model:'Class-A 30W TB'},{channel:'C',model:'Brit JVM OD1 Orange'},{channel:'D',model:'Plexi 50W High 1'}],
    cabChannels:[{channel:'A',model:'1x12 Deluxe Verb'},{channel:'B',model:'2x12 Class-A 30W'},{channel:'C',model:'4x12 Friedman GB'},{channel:'D',model:'4x12 1960TV'}],
    driveChannels:[{channel:'A',type:'T808 OD'}],chorusChannels:[{channel:'A',type:'Analog Stereo'}],delayChannels:[{channel:'A',type:'Digital Stereo'}],
    reverbChannels:[{channel:'A',type:'Room: Recording Studio A'},{channel:'B',type:'Plate: Medium Plate'}],
    scenes:[sc(1,'CLEAN','A',{chorus:true,reverbChannel:'B'}),sc(2,'CRUNCH','B'),sc(3,'LEAD','C',{drive:true,delay:true}),
      sc(4,'AMBIENT','A',{chorus:true,reverbChannel:'B'}),sc(5,'CLEAN DRY','A',{reverb:false}),sc(6,'CRUNCH PUSH','B',{drive:true}),
      sc(7,'LEAD DRY','C',{drive:true,reverb:false}),sc(8,'PLEXI','D')]},
  insert:['multidelay'],layout:{row2:['drive','chorus','amp','cab'],row3:['delay','multidelay','reverb']},
  blockScenes:{multidelay:[{scene:4,bypass:false}]},selectedScene:1};

const result=createPreset(BASE,spec),syx=Buffer.from(result.syx);
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const st=inspectStructure(syx);assert.equal(String(st.decoded.preset_name).trim(),NAME);
assert.equal(Buffer.from(st.raw.body)[0],0,'selected scene 1');
const cpu=estimateCpu(syx);assert.ok(cpu.maxPercent<cpu.limitPercent,'estimate under the safe limit');
const perScene=cpu.scenes.map(s=>s.percent);

const copy=(dir,files)=>{for(const f of files)fs.copyFileSync(new URL(f,COLLECT),path.join(dir,f));};
const COLLECTORS=['FM3_CPU_SWEEP.py','FM3_READ_PROBE.py'];
const preset={file:'LIVE.syx',sha256:sha(syx)};
// Generator's four files (TXT for the user), verified as a set.
const gdir=path.join(out,'FM3_T32_LIVE');fs.mkdirSync(gdir,{recursive:true});
writePresetOutputs(path.join(gdir,'T32_LIVE'),result,spec);verifyPresetOutputs(path.join(gdir,'T32_LIVE'));
assert.ok(fs.readFileSync(path.join(gdir,'T32_LIVE.syx')).equals(syx));
fs.writeFileSync(path.join(gdir,preset.file),syx);copy(gdir,[...COLLECTORS,'FM3_CPU_SCENES.py']);
const lm={kind:'fm3-cpu-scenes',version:1,test:'T32',date:'2026-11-06',confirmName:NAME,preset,storedSelectedScene:1,
  scenes:[1,2,3,4,5,6,7,8],sceneNames:spec.composer.scenes.map(s=>s.name),
  estimate:{model:cpu.model,measurementsSha256:cpu.measurementsSha256,perScene,limitPercent:cpu.limitPercent,
    familiesWithoutCost:[...new Set(cpu.scenes.flatMap(s=>s.unknown))]},
  userNote:'At each scene the user writes "ok" or a short listening impression (level, sound).'};
fs.writeFileSync(path.join(gdir,'manifest.json'),JSON.stringify(lm,null,1)+'\n');

const sdir=path.join(out,'FM3_T32_STORE');fs.mkdirSync(sdir,{recursive:true});
fs.writeFileSync(path.join(sdir,preset.file),syx);copy(sdir,[...COLLECTORS,'FM3_BIND_STORE.py']);
const sm={kind:'fm3-bind-store',version:1,test:'T32',date:'2026-11-06',confirmName:NAME,preset,storeLocation:424,
  checks:[
    {id:'scenes',text:'Käi läbi stseenid 1-8. Kas iga stseen kõlab nagu enne (nimi, amp, efektid)? Kirjuta "ok" või mis erines (nt "S4 Multi Delay puudub").'},
    {id:'multidelay',text:'Scene 4 AMBIENT: kas Multi Delay kordused on kuulda? (j / e)'}],
  method:'--load: edit-buffer dump (7F 00) only. The user STOREs on the FM3 to location 424. --verify: one read-only stored-dump request (fn=0x03 hi lo 00) for that location; bodies compared offline. The script never stores and never sets.'};
fs.writeFileSync(path.join(sdir,'manifest.json'),JSON.stringify(sm,null,1)+'\n');

const L=[
'FM3 katse T32: päris kasutuspreset "'+NAME+'" (heli, nivood, CPU 8 stseenis, STORE/reload)',
'='.repeat(78),
'Skriptid EI salvesta ega sea midagi. STORE-i teed sina ise, ainult asukohta 424.',
'FM3-Editis EI vajutata Save. Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse).',
'',
'Stseenid: '+spec.composer.scenes.map(s=>s.scene+' '+s.name).join(', ')+'.',
'Multi Delay (seadme vaikimisi Quad-Tap) on sees ainult Scene 4-s. Täpsem kirjeldus: FM3_T32_LIVE/T32_LIVE.txt.',
'CPU hinnang stseenide kaupa: '+perScene.map((p,i)=>'S'+(i+1)+' '+p+' %').join(', ')+' (ohutu piir '+cpu.limitPercent+' %).',
'',
'OSA 1: heli, nivood ja CPU (kaust FM3_T32_LIVE)',
'  0. Sulge FM3-Edit ja Fractal-Bot (USB-port on ainukasutuses).',
'  1. cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T32_LIVE && python3 FM3_CPU_SCENES.py --self-test',
'  2. python3 FM3_CPU_SCENES.py --pack . --session ../FM3_T32_SESSION/live',
'     Skript laadib preseti ja küsib nime (vasta j) ning valitud stseeni (peaks olema 1).',
'  3. Iga stseeni juures: vali FM3-l see stseen, mängi natuke ja kirjuta "ok" või lühike muljet',
'     (nt "ok", "S3 liiga vali", "S2 tuhm"). Skript loeb pärast igat valikut CPU.',
'',
'OSA 2: STORE ja tagasitulek (kaust FM3_T32_STORE)',
'  1. cd ../FM3_T32_STORE && python3 FM3_BIND_STORE.py --self-test',
'  2. python3 FM3_BIND_STORE.py --load --pack . --session ../FM3_T32_SESSION/store',
'  3. FM3-l: STORE asukohta 424. Vali mõni muu preset, siis tagasi 424-le.',
'  4. python3 FM3_BIND_STORE.py --verify --pack . --session ../FM3_T32_SESSION/store',
'     Skript küsib kaks küsimust enne ja pärast salvestamist ning asukoha (vasta 424). Siis loeb asukoha 424.',
'  5. Kirjuta vestlusesse "valmis".',''];
fs.writeFileSync(path.join(gdir,'LOE_MIND.txt'),L.join('\n'));fs.writeFileSync(path.join(sdir,'LOE_MIND.txt'),L.join('\n'));
console.log(JSON.stringify({name:NAME,sha256:preset.sha256,perScene,limit:cpu.limitPercent}));

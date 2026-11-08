// Build the T40/T41 packs: the 14 Controllers sources still unmeasured on the device (audit 07.11.2026 K2,
// docs/fm3/FM3_CONTROLLERS_GAPS.md). Offline; writes presets, never device I/O.
// Every preset is made through the public inputs (volumePedal.source, controllers); no raw patch.
// One independent source binding per preset, target Volume/Pan Volume ALL (the only supported target).
// Each part is one ring: load to the edit buffer, listen, the USER stores on the FM3 to a location he chooses,
// selects another preset, comes back, listens again, then FM3_BIND_STORE.py --verify reads that location.
// Contrast settings make a wrong binding audible: e.g. the LFO 1B preset runs LFO 1 fast and LFO 2 slow.
//   T40 (dynamic sources): A LFO 1B, B LFO 2A, C LFO 2B, D ADSR 2, E Envelope Follower
//   T41 (static sources):  A-C Scene Controller 2-4, D-H Manual 1-5, I Pitch Follower
// FM3-Edit 1.07.17 (arm64 strings, 2026-11-08): the Controllers block holds only CONTROLLERS_PITCH_SOURCE for the
// Pitch Follower; its note range is not an editor parameter, so T41I records only the direction (low vs high notes).
// Usage: node tools/fm3/t40-controllers-sources-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset,writePresetOutputs,verifyPresetOutputs}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {readModifiers}=await imp('scripts/fm3-parameter-dependencies.mjs');
const {readControllers,controllersParam}=await imp('scripts/fm3-controllers.mjs');
const {decodeValue}=await imp('scripts/fm3-table-encoder.mjs');
const {VOLUME_SOURCES}=await imp('scripts/fm3-volume-pedal.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(process.versions.node.split('.')[0],'22','Use Node 22');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t40-controllers-sources-build.mjs OUT_DIR');
fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Use an empty output directory');
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const COLLECTORS=['FM3_BIND_STORE.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py'];
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const layout={row2:['drive','amp','cab'],row3:['volpan','delay','reverb']};
const composer=(name,scenes)=>({schemaVersion:1,firmware:13,baseProfile:'jb-composer',name,scenes:scenes.map((n,i)=>({scene:i+1,name:n}))});
const c=(param,value)=>({channel:'A',param,value});
const DATE='2026-11-08';

// ---- source cases ----
const lfo=(n,fast)=>[c(`LFO${n}TYPE`,'SINE'),c(`LFO${n}RUN`,'RUN'),c(`LFO${n}DEPTH`,100),c(`LFO${n}FREQ`,fast?5:1)];
const cases={
 T40:[
  {id:'A',source:'LFO 1B',name:'T40A LFO1B',scene:'LFO1 5HZ B 180',controllers:[...lfo(1,true),c('LFO1PHASE',180),...lfo(2,false)],
   expect:'Tremolo kiire, umbes 5 pulssi sekundis (LFO 1 = 5 Hz, LFO 2 = 1 Hz; aeglane pulss tähendaks valet LFO-d).'},
  {id:'B',source:'LFO 2A',name:'T40B LFO2A',scene:'LFO2 1HZ',controllers:[...lfo(1,true),...lfo(2,false)],
   expect:'Tremolo aeglane, umbes 1 pulss sekundis (LFO 2 = 1 Hz; kiire 5 Hz pulss tähendaks LFO 1-te).'},
  {id:'C',source:'LFO 2B',name:'T40C LFO2B',scene:'LFO2 1HZ B 180',controllers:[...lfo(1,true),...lfo(2,false),c('LFO2PHASE',180)],
   expect:'Tremolo aeglane, umbes 1 pulss sekundis (LFO 2 väljund B, faas 180; kiire pulss tähendaks LFO 1-te).'},
  {id:'D',source:'ADSR 2',name:'T40D ADSR2',scene:'ADSR2 2S SWELL',
   controllers:[c('ADSR1MODE','ONCE'),c('ADSR1ATTACK',1),c('ADSR2MODE','ONCE'),c('ADSR2RETRIG','ON'),c('ADSR2ATTACK',2000),c('ADSR2LEVEL',100),c('ADSR2THRESH',-40)],
   expect:'Iga eraldi löödud noot paisub sisse umbes 2 sekundi jooksul (ADSR 1 Attack 1 ms; kohe täisvaljusega noot tähendaks ADSR 1-te).'},
  {id:'E',source:'Envelope Follower',name:'T40E ENVFOLLOW',scene:'ENV FOLLOW',
   controllers:[c('ENVSOURCE','INPUT 1'),c('ENVATTACK',5),c('ENVRELEASE',300),c('ENVSENS',-60),c('ENVGAIN',2)],
   expect:'Vaikne mäng on vaikne, tugev löök valjem; noodi hääbudes vaibub helitugevus kiiremini kui tavaliselt (Attack 5 ms, Release 300 ms).'}],
 T41:[
  ...[2,3,4].map((n,i)=>({id:'ABC'[i],source:`Scene Controller ${n}`,name:`T41${'ABC'[i]} SCENECTRL${n}`,scenes:['10 PCT','40 PCT','70 PCT','100 PCT'].map(s=>`SC${n} ${s}`),
   controllers:[1,2,3,4].flatMap(k=>[10,40,70,100].map((v,s)=>c(`SCENE${k}_VAL${s+1}`,k===n?v:110-v))),
   expect:`Stseenid 1-4 kasvavad vaiksest valjemaks (Scene Controller ${n} = 10/40/70/100 %; teistel vastupidi, kahanev tase tähendaks vale kontrollerit).`})),
  ...[1,2,3,4,5].map((n,i)=>({id:'DEFGH'[i],source:`Manual ${n}`,name:`T41${'DEFGH'[i]} MANUAL${n}`,scene:`MANUAL${n} 100`,
   controllers:[1,2,3,4,5].map(k=>c(`MANUAL${k}`,k===n?100:0)),
   expect:`Heli on täisvaljusega (Manual ${n} = 100 %, teised Manual 0 %; vaikus tähendaks vale Manual-allikat).`})),
  {id:'I',source:'Pitch Follower',name:'T41I PITCHFOLLOW',scene:'PITCH FOLLOW',controllers:[c('PITCH_SOURCE','INPUT 1')],
   expect:'Madalad noodid (lahtine madal E) on vaiksemad, kõrged noodid (kõrge E 12. kast ja kõrgemal) valjemad. Kirjelda suunda; täpset vahemikku ei eeldata.'}]};

function buildPack(group,root,cs){
 const packs=[];
 for(const k of cs){
  const dir=`${group}${k.id}_${k.source.toUpperCase().replace(/[^A-Z0-9]+/g,'')}`,d=path.join(root,dir);fs.mkdirSync(d,{recursive:true});
  const spec={composer:composer(k.name,k.scenes??[k.scene]),layout,volumePan:true,volumePedal:{source:k.source},selectedScene:1,allow:['enum-labels'],controllers:k.controllers};
  const r=createPreset(BASE,spec),syx=Buffer.from(r.syx);
  assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],dir+' edit-buffer header');
  const st=inspectStructure(syx),body=Buffer.from(st.raw.body);
  assert.equal(String(st.decoded.preset_name).trim(),k.name);
  const vol=readModifiers(body).filter(m=>m.active&&m.effectId===102&&m.pid===0);
  assert.equal(vol.length,1,dir+' one Volume binding');assert.equal(vol[0].source,VOLUME_SOURCES[k.source],dir+' source code');
  const ctrl=readControllers(body);
  const words=ctrl.find(x=>x.channel==='A').words;
  for(const w of k.controllers){const p=controllersParam(w.param),got=decodeValue(p,words[p.param]);
   if(typeof w.value==='string')assert.equal(String(got).trim(),w.value,dir+' '+w.param);
   else assert.ok(Math.abs(Number(got)-w.value)<=Math.max(0.011*Math.abs(w.value),0.11),`${dir} ${w.param}: ${got} != ${w.value}`);}
  const stem=path.join(d,dir);writePresetOutputs(stem,r,spec);verifyPresetOutputs(stem);
  for(const f of COLLECTORS)fs.copyFileSync(new URL(f,COLLECT),path.join(d,f));
  const manifest={kind:'fm3-bind-store',version:1,test:`${group}${k.id}`,date:DATE,confirmName:k.name,preset:{file:dir+'.syx',sha256:sha(syx)},
   purpose:`Device import, audible behavior and STORE/reload of ${k.source} as the Volume modifier source (code ${VOLUME_SOURCES[k.source]}, FM3-Edit list).`,
   volumeSource:{name:k.source,code:VOLUME_SOURCES[k.source]},controllers:k.controllers,expect:k.expect,
   storeLocationPolicy:'User chooses an expendable or backed-up location (normally 424-427). No fixed slot is assumed and no script performs STORE.',
   checks:[{id:'source',text:`Mis on Volume/Pan -> Volume modifikaatori Source? Oodatud: ${k.source}. Kui ei kontrollinud, kirjuta -.`},
    {id:'behavior',text:`${k.expect} Kas see käitumine vastab? Kirjuta jah / ei / mõõtmata.`}],
   method:'--load: edit-buffer dump (7F 00) only. User STOREs on the FM3, selects another preset and returns. --verify asks observations and reads the user-reported location (fn=0x03); no automatic STORE or SET.'};
  fs.writeFileSync(path.join(d,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  packs.push({id:k.id,dir,source:k.source,expectedBehavior:k.expect,preset:manifest.preset,manifestSha256:sha(fs.readFileSync(path.join(d,'manifest.json'))),fourFilesVerified:true,hardwareStoreTested:false});
 }
 const parts=packs.map(p=>p.dir).join(' ');
 fs.writeFileSync(path.join(root,'ALUSTA.command'),`#!/bin/bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
parts="${parts}"
if [ "\${1:-}" = "--self-test" ]; then
  for part in $parts; do python3 "$part/FM3_BIND_STORE.py" --self-test; done
  exit 0
fi
# Valikuline: bash ALUSTA.command OSA [OSA...] teeb ainult nimetatud osad (nt ${packs[0].dir}).
[ "$#" -gt 0 ] && parts="$*"
session="SESSION_$(date +%Y%m%dT%H%M%S)"
mkdir -- "$session"
echo 'Sulge FM3-Edit ja Fractal-Bot. STORE-i teeb kasutaja FM3-l; skript ei salvesta.'
echo 'Salvesta oma testikohta (424-427). Sama kohta võib uuesti kasutada pärast eelmise osa tagasilugemist.'
for part in $parts; do
  echo "Katse $part"
  python3 "$part/FM3_BIND_STORE.py" --load --pack "$part" --session "$session/$part"
  echo 'Kuula ja kontrolli Source. Seejärel STORE FM3-l, vali teine preset ja tule salvestatud presetile tagasi. Kuula uuesti.'
  echo 'Kui vaatasid FM3-Editit, sulge see nüüd. Alles siis kirjuta STORE (vahele jätmiseks s); muu vastus lõpetab.'
  read -r answer
  [ "$answer" = s ] && { echo "$part jäeti vahele"; continue; }
  [ "$answer" = STORE ] || exit 1
  python3 "$part/FM3_BIND_STORE.py" --verify --pack "$part" --session "$session/$part"
done
python3 - "$session" <<'PY'
import shutil, sys
shutil.make_archive(sys.argv[1], 'zip', '.', sys.argv[1])
print('Valmis. Kirjuta vestlusesse "valmis" (fail ' + sys.argv[1] + '.zip).')
PY
`,{mode:0o755});
 const files=[];const walk=x=>{for(const e of fs.readdirSync(x,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(x,e.name);if(e.isDirectory())walk(p);else files.push({path:path.relative(root,p),sha256:sha(fs.readFileSync(p))});}};
 return {packs,files,walk};
}

const summary=[];
for(const [group,title] of [['T40','Controllersi dünaamilised allikad: LFO 1B, LFO 2A, LFO 2B, ADSR 2, Envelope Follower'],['T41','Controllersi staatilised allikad: Scene Controller 2-4, Manual 1-5, Pitch Follower']]){
 const root=path.join(out,`FM3_${group}_CTRL`);fs.mkdirSync(root);
 const {packs,files,walk}=buildPack(group,root,cases[group]);
 fs.writeFileSync(path.join(root,'LOE_MIND.txt'),[
  `FM3 ${group} (ette valmistatud 08.11.2026): ${title}`,'='.repeat(78),
  'Skriptid EI salvesta ega sea midagi. FM3-Editis EI vajutata Save. Ampero A-nuppu ära kasuta, B ainult lühidalt.',
  'Iga osa = üks allikas, üks preset. Allikas -> Volume/Pan Volume. STORE teed sina oma testikohta (424-427).','',
  '1. Sulge FM3-Edit ja Fractal-Bot.',
  `2. Terminalis: cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_${group}_CTRL && bash ALUSTA.command --self-test`,
  '3. Seejärel: bash ALUSTA.command   (ainult mõned osad: bash ALUSTA.command OSA_KAUST ...)',
  '4. Igas osas: kontrolli nime, kuula, vaata soovi korral FM3-Editis Source (sulge ilma Save-ta).',
  '5. STORE FM3-l testikohta, vali teine preset, tule tagasi, kuula uuesti.',
  '6. Kirjuta Terminali STORE (või s = jäta vahele) ja vasta küsimustele ning asukoha numbrile.',
  '7. Lõpus tekib SESSION_....zip. Kirjuta vestlusesse "valmis".','',
  ...packs.map(p=>`${p.dir}: ${p.source}. ${p.expectedBehavior}`),''].join('\n'));
 walk(root);
 const pj={schemaVersion:1,kind:'fm3-controllers-sources-preparation',test:group,date:DATE,packs,files,deviceIO:false,newHardwareMeasurements:false};
 fs.writeFileSync(path.join(root,'pack.json'),JSON.stringify(pj,null,2)+'\n');
 summary.push({group,parts:packs.map(p=>[p.dir,p.source,p.preset.sha256.slice(0,12)])});
}
assert.equal(summary.flatMap(s=>s.parts).length,14,'14 sources');
assert.equal(new Set(summary.flatMap(s=>s.parts.map(p=>p[1]))).size,14,'each source once');
console.log(JSON.stringify({passed:true,summary,deviceIO:false},null,1));

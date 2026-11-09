// Build the T42 pack: modifier targets other than Volume, one forbidden-target control, and the preset tempo.
// Offline; writes presets, never device I/O. Plan: /mnt/project-files/fm3/S1-S3/S1-S3-analuus-20261109.md (09.11.2026).
// Hypotheses under test (formula-based, not device-confirmed):
//   H1  A modifier record with word 8 = target effect ID, word 9 = target PID and words 1/2 = Min/Max in the TARGET
//       parameter's own stored-word codec drives that target (previously only Volume/Pan Volume, Wah Control and the
//       Amp switches were device-confirmed). Parts A-C use three sources and three scale classes (linear %, log Hz, /10).
//   H2  FM3-Edit FW13 cache flags bit 0x0080 set = the parameter is NOT a modifier target. Part D binds a bit-set
//       parameter (Delay Low Cut, flags 0x0482) exactly like part A; the FM3 should ignore or refuse it.
//   H3  CONTROLLERS_TEMPO (pid 32, all 767 corpus bodies hold 120) stores the BPM directly. Parts E/F write 97 and 143.
// The composer has no public input for H1-H3. Each preset is first made through the public inputs (volumePedal.source,
// controllers, controls, blockScenes); then this TEST builder patches only the declared words and re-encodes the dump.
// These are test presets, not generator outputs: the generator's capabilities are unchanged.
// Each part is one ring: load to the edit buffer, listen, the USER stores on the FM3 to a location he chooses,
// selects another preset, comes back, listens again, then FM3_BIND_STORE.py --verify reads that location.
// Usage: node tools/fm3/t42-modifier-targets-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump,reencodeRawPatch,reencodeDumpFromRawPatch}=await imp('scripts/fm3-codec.mjs');
const {readModifiers}=await imp('scripts/fm3-parameter-dependencies.mjs');
const {CONTROLLERS_RECORD}=await imp('scripts/fm3-controllers.mjs');
const {findParam,encodeValue,decodeValue}=await imp('scripts/fm3-table-encoder.mjs');
const {VOLUME_SOURCES}=await imp('scripts/fm3-volume-pedal.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(process.versions.node.split('.')[0],'22','Use Node 22');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t42-modifier-targets-build.mjs OUT_DIR');
fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Use an empty output directory');
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const COLLECTORS=['FM3_BIND_STORE.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py'];
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const DATE='2026-11-09';
const composer=(name,scenes,extra={})=>({schemaVersion:1,firmware:13,baseProfile:'jb-composer',name,scenes:scenes.map((n,i)=>({scene:i+1,name:n})),...extra});
const cc=(param,value)=>({channel:'A',param,value});
const ctl=(block,param,value)=>({block,channel:'A',param,value});
const on=(...blocks)=>Object.fromEntries(blocks.map(b=>[b,[1,2,3,4].map(scene=>({scene,channel:'A',bypass:false}))]));
const SC=[0,33,67,100];
const sc1=SC.map((v,s)=>cc(`SCENE1_VAL${s+1}`,v));
const delayEcho=(mix,feed)=>[ctl('delay','DELAY_TEMPO','NONE'),ctl('delay','DELAY_TIME',400),ctl('delay','DELAY_FEED',feed),ctl('delay','DELAY_MIX',mix)];
const layoutDR={row2:['drive','amp','cab'],row3:['volpan','delay','reverb']};
const MOD_BIT=0x0080;

const parts=[
 {id:'A',name:'T42A SC1 DLYMIX',source:'Scene Controller 1',target:{family:'DELAY',param:'DELAY_MIX',min:0,max:100,unit:'%'},
  scenes:SC.map(v=>`SC1 ${v} DLY MIX`),controllers:sc1,controls:delayEcho(50,40),blockScenes:on('delay'),
  expect:'Stseenid 1-4: viivituse kordused kuulduvad järjest valjemini (Delay Mix 0 / 33 / 67 / 100 %). Stseen 1 on kuiv.'},
 {id:'B',name:'T42B LFO1A FILTFREQ',source:'LFO 1A',target:{family:'FILTER',param:'FILTER_FREQ',min:300,max:3000,unit:'Hz'},
  scenes:['LFO 0.5HZ LP SWEEP'],controllers:[cc('LFO1TYPE','SINE'),cc('LFO1RUN','RUN'),cc('LFO1DEPTH',100),cc('LFO1FREQ',0.5)],
  composerExtra:{filterChannels:[{channel:'A',type:'Low-Pass'}]},layout:{row2:['drive','amp','cab','filter'],row3:['volpan','delay','reverb']},
  controls:[],blockScenes:on('filter'),
  expect:'Tämber liigub aeglaselt tumedast heledaks ja tagasi, üks tsükkel umbes 2 sekundiga (Low-Pass 300-3000 Hz, LFO 0,5 Hz).'},
 {id:'C',name:'T42C EXT1 AMPGAIN',source:'External 1',target:{family:'DISTORT',param:'DISTORT_DRIVE',min:2,max:8,unit:'/10'},
  scenes:['EXT1 AMP GAIN 2-8'],controllers:[],controls:[],blockScenes:{},
  expect:'Pedaal kannal: puhtam, vähem moonutust (Amp Gain 2). Pedaal varbal: rohkem moonutust (Gain 8). Helitugevus ise ei muutu.'},
 {id:'D',name:'T42D SC1 LOCUT NEG',source:'Scene Controller 1',target:{family:'DELAY',param:'DELAY_LOCUT',min:20,max:2000,unit:'Hz'},negative:true,
  scenes:SC.map(v=>`SC1 ${v} DLY LOCUT`),controllers:sc1,controls:delayEcho(60,50),blockScenes:on('delay'),
  expect:'KEELATUD SIHT (kontroll). Kui FM3 seda sihti ei luba, kõlavad kordused kõigis stseenides 1-4 ühtmoodi täis. Kui lubab, muutuvad kordused stseeniti õhemaks (Low Cut 20 -> 2000 Hz).'},
 {id:'E',name:'T42E TEMPO 97',tempo:97,scenes:['TEMPO 97 DLY 1/4'],controllers:[],
  controls:[ctl('delay','DELAY_TEMPO','1/4'),ctl('delay','DELAY_FEED',30),ctl('delay','DELAY_MIX',40)],blockScenes:on('delay'),
  expect:'FM3 näitab preseti tempoks 97 BPM. Kordused tulevad veerandnoodi kaupa, umbes 0,62 s vahega.'},
 {id:'F',name:'T42F TEMPO 143',tempo:143,scenes:['TEMPO 143 DLY 1/4'],controllers:[],
  controls:[ctl('delay','DELAY_TEMPO','1/4'),ctl('delay','DELAY_FEED',30),ctl('delay','DELAY_MIX',40)],blockScenes:on('delay'),
  expect:'FM3 näitab preseti tempoks 143 BPM. Kordused tulevad veerandnoodi kaupa, umbes 0,42 s vahega (kiiremini kui E-s).'}];

function patchDump(syx,body){
 const st=inspectStructure(syx);
 const o=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(st.raw.rawPatch,body)));
 const back=inspectStructure(o);assert.ok(Buffer.from(back.raw.body).equals(body),'re-encoded body readback');
 assert.ok(Buffer.from(st.parsed.headerPayload).equals(Buffer.from(back.parsed.headerPayload)),'dump header preserved');
 return o;
}
function build(k){
 const spec={composer:composer(k.name,k.scenes,k.composerExtra),layout:k.layout??(k.source?layoutDR:{row2:['drive','amp','cab'],row3:['delay','reverb']}),selectedScene:1,allow:['enum-labels'],
  ...(k.source?{volumePan:true,volumePedal:{source:k.source}}:{}),
  ...(k.controllers.length?{controllers:k.controllers}:{}),...(k.controls.length?{controls:k.controls}:{}),
  ...(Object.keys(k.blockScenes).length?{blockScenes:k.blockScenes}:{})};
 const r=createPreset(BASE,spec),syx0=Buffer.from(r.syx),st=inspectStructure(syx0),orig=Buffer.from(st.raw.body),body=Buffer.from(orig);
 assert.equal(String(st.decoded.preset_name).trim(),k.name);
 const changed=[];
 if(k.target){
  const p=findParam(k.target.family,k.target.param),flagSet=(+p.flags&MOD_BIT)!==0;
  assert.equal(flagSet,!!k.negative,`${k.id}: flags ${p.flags} bit 0x0080 must be ${k.negative?'set':'clear'}`);
  const rec=scanRecords(body).records.filter(x=>x.block===p.block&&x.instance===1);assert.equal(rec.length,1,`${k.id}: target block present once`);
  const vol=readModifiers(body).filter(m=>m.active);assert.equal(vol.length,1,k.id+' one active modifier');
  const m=vol[0];assert.equal(m.effectId,102);assert.equal(m.pid,0);assert.equal(m.source,VOLUME_SOURCES[k.source]);assert.equal(m.channel,0);
  const set={1:encodeValue(p,k.target.min),2:encodeValue(p,k.target.max),8:p.block,9:p.param};
  for(const [w,v] of Object.entries(set)){const off=m.offset+2*w;changed.push({word:+w,offset:off,before:body.readUInt16LE(off),after:v});body.writeUInt16LE(v,off);}
  const after=readModifiers(body).filter(x=>x.active);assert.equal(after.length,1);
  assert.equal(after[0].effectId,p.block);assert.equal(after[0].pid,p.param);assert.equal(after[0].source,VOLUME_SOURCES[k.source]);
  for(const [w,v] of [[1,k.target.min],[2,k.target.max]])assert.ok(Math.abs(decodeValue(p,set[w])-v)<=Math.max(0.006*Math.abs(v),0.06),`${k.id} word ${w}`);
  k.binding={record:m.record,effectId:p.block,pid:p.param,name:p.name,label:p.label,flags:p.flags,modifierBitSet:flagSet,
   min:{display:k.target.min,word:set[1]},max:{display:k.target.max,word:set[2]},unit:k.target.unit,source:k.source,sourceCode:VOLUME_SOURCES[k.source]};
 }
 if(k.tempo){
  const R=CONTROLLERS_RECORD;assert.equal(body.readUInt16LE(R.header),R.effectId,'Controllers record');
  for(let ch=0;ch<R.channels;ch++){const off=R.start+2*(ch*R.words+32);assert.equal(body.readUInt16LE(off),120,'base tempo 120');
   changed.push({word:'CONTROLLERS_TEMPO ch'+'ABCD'[ch],offset:off,before:120,after:k.tempo});body.writeUInt16LE(k.tempo,off);
   assert.equal(body.readUInt16LE(R.start+2*(ch*R.words+33)),0,'Tempo To Use = PRESET');}
 }
 for(let i=0;i<body.length;i+=2)if(body.readUInt16LE(i)!==orig.readUInt16LE(i))assert.ok(changed.some(c=>c.offset===i),'undeclared change at '+i);
 const syx=patchDump(syx0,body);
 assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],k.id+' edit-buffer header');
 return {syx,changed,composerSha256:sha(syx0)};
}

const root=path.join(out,'FM3_T42_MODTGT');fs.mkdirSync(root);
const packs=[];
for(const k of parts){
 const dir=`T42${k.id}_${k.name.slice(5).replace(/[^A-Z0-9]+/g,'')}`,d=path.join(root,dir);fs.mkdirSync(d);
 const {syx,changed,composerSha256}=build(k);
 fs.writeFileSync(path.join(d,dir+'.syx'),syx);
 for(const f of COLLECTORS)fs.copyFileSync(new URL(f,COLLECT),path.join(d,f));
 const what=k.target?`${k.source} -> ${k.binding.label} (${k.target.family} pid ${k.binding.pid}), Min ${k.target.min} / Max ${k.target.max} ${k.target.unit}`:`preseti tempo ${k.tempo} BPM`;
 const checks=k.target?[
  {id:'target',text:`Ava FM3-l (või FM3-Editis) ${k.target.family==='DISTORT'?'Amp':k.target.family==='FILTER'?'Filter':'Delay'} ploki parameeter ${k.binding.label}. Kas sellel on modifikaator (punkt/täpp nupul)? Mis on Source? Oodatud: ${k.negative?'tõenäoliselt modifikaatorit pole või see ei tööta':k.source}. Kirjuta, mida nägid, või -.`},
  {id:'minmax',text:`Modify lehel Min ja Max? Oodatud: ${k.target.min} ja ${k.target.max} ${k.target.unit}. Kirjuta näidud või -.`},
  {id:'behavior',text:`${k.expect} Kas kõlab nii? Kirjuta jah / ei / mõõtmata ja lühike kirjeldus.`}]:[
  {id:'tempo',text:`Mis tempo näitab FM3 (Tempo / Home)? Oodatud: ${k.tempo}. Kirjuta number.`},
  {id:'behavior',text:`${k.expect} Kas kõlab nii? Kirjuta jah / ei / mõõtmata.`}];
 const manifest={kind:'fm3-bind-store',version:1,test:`T42${k.id}`,date:DATE,confirmName:k.name,preset:{file:dir+'.syx',sha256:sha(syx)},
  purpose:k.target?`${k.negative?'Negative control H2':'H1'}: ${what}.`:`H3: ${what} (stored word = BPM).`,
  ...(k.binding?{binding:k.binding}:{tempo:k.tempo}),hypothesis:k.negative?'H2':k.target?'H1':'H3',
  testOnlyPatch:{composerOutputSha256:composerSha256,changedWords:changed,note:'Declared words only; not a generator output.'},
  controllers:k.controllers,controls:k.controls,expect:k.expect,
  storeLocationPolicy:'User chooses an expendable or backed-up location (normally 424-427). No fixed slot is assumed and no script performs STORE.',
  checks,method:'--load: edit-buffer dump (7F 00) only. User STOREs on the FM3, selects another preset and returns. --verify asks observations and reads the user-reported location (fn=0x03); no automatic STORE or SET.'};
 fs.writeFileSync(path.join(d,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 packs.push({id:k.id,dir,what,hypothesis:manifest.hypothesis,expectedBehavior:k.expect,preset:manifest.preset,manifestSha256:sha(fs.readFileSync(path.join(d,'manifest.json'))),hardwareStoreTested:false});
}
const list=packs.map(p=>p.dir).join(' ');
fs.writeFileSync(path.join(root,'ALUSTA.command'),`#!/bin/bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
parts="${list}"
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
  echo 'Kuula ja vaata parameetrit. Seejärel STORE FM3-l, vali teine preset ja tule salvestatud presetile tagasi. Kuula uuesti.'
  echo 'Kui vaatasid FM3-Editit, sulge see nüüd (ilma Save-ta). Alles siis kirjuta STORE (vahele jätmiseks s); muu vastus lõpetab.'
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
fs.writeFileSync(path.join(root,'LOE_MIND.txt'),[
 'FM3 T42 (ette valmistatud 09.11.2026): modifikaatori uued sihid, keelatud sihi kontroll ja preseti tempo','='.repeat(78),
 'Skriptid EI salvesta ega sea midagi. FM3-Editis EI vajutata Save. Ampero A-nuppu ära kasuta, B ainult lühidalt.',
 'Üldseadeid ei muudeta. Iga osa = üks preset. STORE teed sina oma testikohta (424-427).',
 'Osa C vajab External 1 pedaali (sama pedaal kui T2/T10 katsetes).','',
 '1. Sulge FM3-Edit ja Fractal-Bot.',
 '2. Terminalis: cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T42_MODTGT && bash ALUSTA.command --self-test',
 '3. Seejärel: bash ALUSTA.command   (ainult mõned osad: bash ALUSTA.command OSA_KAUST ...)',
 '4. Igas osas: kontrolli nime, kuula stseene 1-4 (kui on), vaata parameetri modifikaatorit (sulge FM3-Edit ilma Save-ta).',
 '5. STORE FM3-l testikohta, vali teine preset, tule tagasi, kuula uuesti.',
 '6. Kirjuta Terminali STORE (või s = jäta vahele) ja vasta küsimustele ning asukoha numbrile.',
 '7. Lõpus tekib SESSION_....zip. Kirjuta vestlusesse "valmis".','',
 ...packs.map(p=>`${p.dir}: ${p.what}. ${p.expectedBehavior}`),''].join('\n'));
const files=[];const walk=x=>{for(const e of fs.readdirSync(x,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(x,e.name);if(e.isDirectory())walk(p);else files.push({path:path.relative(root,p),sha256:sha(fs.readFileSync(p))});}};
walk(root);
fs.writeFileSync(path.join(root,'pack.json'),JSON.stringify({schemaVersion:1,kind:'fm3-modifier-targets-preparation',test:'T42',date:DATE,packs,files,deviceIO:false,newHardwareMeasurements:false},null,2)+'\n');
assert.equal(packs.length,6);
console.log(JSON.stringify({passed:true,packs:packs.map(p=>[p.dir,p.hypothesis,p.preset.sha256.slice(0,12)]),deviceIO:false},null,1));

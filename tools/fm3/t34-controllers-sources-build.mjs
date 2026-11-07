// Build the T34 packs (audit 06.11.2026: H2 remainder, H1 follow-up, H7). Offline; writes presets, never device I/O.
// All Controllers presets are made through the public 0.3.55 inputs (controllersScenes, volumePedal.source,
// controllers); no raw patch. T33 confirmed scenes 1..4 = channels A..D and LFO 1A as a modifier source.
//   T34A (fm3-bind-store, STORE 426): LFO 1A -> Volume, LFO 1 Rate A/B/C/D = 1/2/4/8 Hz, scene channels
//        A,B,C,D,D,C,B,D. Scenes 5..8 are the new part: expected tremolo S5 fastest, S6 fast, S7 medium, S8 fastest.
//   T34B (fm3-bind-check): Scene Controller 1 -> Volume, Scene 1..4 values 10/40/70/100 % (all scenes channel A):
//        expected level rising from scene 1 to 4.
//   T34C (fm3-bind-check): Sequencer -> Volume, 4 stages 0/100/0/100 %, 4 Hz, Run: expected rhythmic on/off chop.
//   T34D (fm3-bind-check): ADSR 1 -> Volume, Once, Retrigger On, Attack 800 ms, Threshold -40 dB: each picked note
//        should swell in.
//   T34E (fm3-bind-check): LIVE KOOSLUS V1 (T32C, Amp C -8 dB) listen only; rebuilt by tools/fm3/t32-live-build.mjs.
//   T34F (fm3-bind-check): the T20 CAB_A pack unchanged (Cab Preamp NONE: are the block-level cuts visible?), rebuilt
//        by tools/fm3/cab-cut-t20-build.mjs.
// Usage: node tools/fm3/t34-controllers-sources-build.mjs OUT_DIR
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset,writePresetOutputs,verifyPresetOutputs}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {readModifiers}=await imp('scripts/fm3-parameter-dependencies.mjs');
const {readControllersScenes}=await imp('scripts/fm3-controllers.mjs');
const {VOLUME_SOURCES}=await imp('scripts/fm3-volume-pedal.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t34-controllers-sources-build.mjs OUT_DIR');
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const COLLECTORS=['FM3_BIND_STORE.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py'];
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const RULES=['Skriptid EI salvesta ega sea midagi. FM3-Editis EI vajutata Save.','Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse).'];
const layout={row2:['drive','amp','cab'],row3:['volpan','delay','reverb']};
const composer=(name,scenes)=>({schemaVersion:1,firmware:13,baseProfile:'jb-composer',name,scenes:scenes.map((n,i)=>({scene:i+1,name:n}))});
fs.mkdirSync(out,{recursive:true});
const built=[];
const copy=dir=>{for(const f of COLLECTORS)fs.copyFileSync(new URL(f,COLLECT),path.join(dir,f));};

function pack({dir,test,kind,spec,source,purpose,checks,expect,store}){
  const r=createPreset(BASE,spec),syx=Buffer.from(r.syx),d=path.join(out,dir);fs.mkdirSync(d,{recursive:true});
  assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],dir+' edit-buffer header');
  const body=Buffer.from(inspectStructure(syx).raw.body);
  assert.equal(String(inspectStructure(syx).decoded.preset_name).trim(),spec.composer.name);
  const vol=readModifiers(body).filter(m=>m.active&&m.effectId===102&&m.pid===0);
  assert.equal(vol.length,1,dir+' one Volume binding');assert.equal(vol[0].source,VOLUME_SOURCES[source],dir+' source code');
  const stem=path.join(d,dir.replace(/^FM3_/,''));writePresetOutputs(stem,r,spec);verifyPresetOutputs(stem);
  copy(d);
  const manifest={kind,version:1,test,date:'2026-11-07',confirmName:spec.composer.name,preset:{file:path.basename(stem)+'.syx',sha256:sha(syx)},
    ...(store?{storeLocation:store}:{}),purpose,volumeSource:{name:source,code:VOLUME_SOURCES[source]},controllersScenes:readControllersScenes(body),expect,checks,
    method:store?'--load: edit-buffer dump (7F 00) only. The user STOREs on the FM3 to location '+store+'. --verify: one read-only stored-dump request (fn=0x03) for that location. The script never stores and never sets.'
      :'--load: edit-buffer dump (7F 00) only. --record: the user answers the questions. Nothing is stored or set.'};
  fs.writeFileSync(path.join(d,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
  built.push({dir,test,name:spec.composer.name,sha256:manifest.preset.sha256,source});
}
const sourceQ=(label)=>({id:'source',text:`Kui avad FM3-Editi: Volume/Pan plokk -> Volume -> modifikaator. Mis on Source? (oodatud "${label}"; kui ei vaata, kirjuta "-"). Sulge FM3-Edit ilma Save-ta.`});

// ---- T34A: scenes 5..8 on channels D,C,B,D; LFO 1A -> Volume; STORE 426 ----
const RATES={A:1,B:2,C:4,D:8},SCENES=['A','B','C','D','D','C','B','D'];
pack({dir:'FM3_T34A_SCENES',test:'T34A',kind:'fm3-bind-store',store:426,source:'LFO 1A',
  purpose:'Controllers channel per scene for scenes 5..8 (T33 measured 1..4 only).',
  spec:{composer:composer('T34A CTRL SCENES',SCENES.map((c,i)=>`S${i+1} CTRL ${c} ${RATES[c]} HZ`)),layout,volumePan:true,volumePedal:{source:'LFO 1A'},selectedScene:1,
    controllersScenes:SCENES,controllers:Object.entries(RATES).map(([channel,value])=>({channel,param:'LFO1FREQ',value}))},
  expect:{tremolo:'S1 1 Hz, S2 2 Hz, S3 4 Hz, S4 8 Hz, S5 8 Hz, S6 4 Hz, S7 2 Hz, S8 8 Hz',channels:SCENES.join(' ')},
  checks:[
    {id:'tremolo',text:'Mängi stseene 5, 6, 7 ja 8 (soovi korral ka 1-4 võrdluseks). Kirjelda tremolo kiirust igas stseenis (nt "S5 kõige kiirem; S6 kiire; S7 keskmine; S8 kõige kiirem").'},
    {id:'channel',text:'Kui näed (FM3-Edit Controllers plokk või esipaneel): mis Controllersi kanal on stseenides 5-8? (nt "5-D 6-C 7-B 8-D"; kui ei näe, "-")'},
    sourceQ('LFO 1A')]});
// ---- T34B: Scene Controller 1 -> Volume ----
pack({dir:'FM3_T34B_SCENECTRL',test:'T34B',kind:'fm3-bind-check',source:'Scene Controller 1',
  purpose:'Scene Controller 1 as the Volume modifier source (code 30, FM3-Edit list).',
  spec:{composer:composer('T34B SCENE CTRL',['SC 10 PCT','SC 40 PCT','SC 70 PCT','SC 100 PCT']),layout,volumePan:true,volumePedal:{source:'Scene Controller 1'},selectedScene:1,
    controllers:[10,40,70,100].map((value,i)=>({channel:'A',param:`SCENE1_VAL${i+1}`,value}))},
  expect:{level:'scene 1 quietest, rising to scene 4 (Volume 1.0 / 4.0 / 7.0 / 10.0)'},
  checks:[{id:'level',text:'Mängi stseene 1, 2, 3 ja 4. Kas helitugevus kasvab stseenist stseeni (1 kõige vaiksem, 4 kõige valjem)? Kirjelda (nt "kasvab ühtlaselt" või "kõik sama").'},sourceQ('Scene Controller 1')]});
// ---- T34C: Sequencer -> Volume ----
pack({dir:'FM3_T34C_SEQ',test:'T34C',kind:'fm3-bind-check',source:'Sequencer',
  purpose:'Sequencer as the Volume modifier source (code 7, FM3-Edit list).',
  spec:{composer:composer('T34C SEQUENCER',['SEQ 4 HZ']),layout,volumePan:true,volumePedal:{source:'Sequencer'},selectedScene:1,allow:['enum-labels'],
    controllers:[{channel:'A',param:'SEQRUN',value:'RUN'},{channel:'A',param:'SEQSTAGES',value:4},{channel:'A',param:'SEQFREQ',value:4},
      ...[0,100,0,100].map((value,i)=>({channel:'A',param:`SEQ${i+1}`,value}))]},
  expect:{sound:'rhythmic on/off chopping of the volume'},
  checks:[{id:'chop',text:'Mängi pikk noot või akord. Kas heli lülitub rütmiliselt sisse-välja (tükeldab)? Kirjelda (nt "tükeldab, umbes 2 korda sekundis" või "ei tükelda").'},sourceQ('Sequencer')]});
// ---- T34D: ADSR 1 -> Volume ----
pack({dir:'FM3_T34D_ADSR',test:'T34D',kind:'fm3-bind-check',source:'ADSR 1',
  purpose:'ADSR 1 as the Volume modifier source (code 5, FM3-Edit list).',
  spec:{composer:composer('T34D ADSR SWELL',['ADSR SWELL']),layout,volumePan:true,volumePedal:{source:'ADSR 1'},selectedScene:1,allow:['enum-labels'],
    controllers:[{channel:'A',param:'ADSR1MODE',value:'ONCE'},{channel:'A',param:'ADSR1RETRIG',value:'ON'},{channel:'A',param:'ADSR1ATTACK',value:800},
      {channel:'A',param:'ADSR1LEVEL',value:100},{channel:'A',param:'ADSR1THRESH',value:-40}]},
  expect:{sound:'each picked note swells in over about 0.8 s'},
  checks:[{id:'swell',text:'Löö üksikuid noote (vaikselt ja tugevamalt). Kas iga noot paisub sisse (helitugevus kasvab umbes 1 sekundi jooksul)? Kirjelda (nt "paisub iga noodiga" või "ei paisu").'},sourceQ('ADSR 1')]});

// ---- T34E: LIVE KOOSLUS V1 listen (T32C file, rebuilt by its own builder) ----
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t34-'));
try{
  execFileSync('node',[path.join(ROOT,'tools/fm3/t32-live-build.mjs'),path.join(tmp,'t32')],{stdio:'ignore'});
  const live=fs.readFileSync(path.join(tmp,'t32','FM3_T32C_FINAL','LIVE_KOOSLUS_V1.syx'));
  assert.equal(String(inspectStructure(live).decoded.preset_name).trim(),'LIVE KOOSLUS V1');
  const d=path.join(out,'FM3_T34E_LIVE');fs.mkdirSync(d,{recursive:true});
  for(const ext of ['.syx','.txt'])fs.copyFileSync(path.join(tmp,'t32','FM3_T32C_FINAL','LIVE_KOOSLUS_V1'+ext),path.join(d,'LIVE_KOOSLUS_V1'+ext));copy(d);
  fs.writeFileSync(path.join(d,'manifest.json'),JSON.stringify({kind:'fm3-bind-check',version:1,test:'T34E',date:'2026-11-07',confirmName:'LIVE KOOSLUS V1',
    preset:{file:'LIVE_KOOSLUS_V1.syx',sha256:sha(live)},purpose:'Listen to the final T32 usage preset (Amp C -8 dB, set from the T32B estimate).',
    checks:[{id:'leadLevel',text:'Võrdle stseene 2 (CRUNCH), 3 (LEAD), 6 (CRUNCH PUSH) ja 7 (LEAD DRY). Kas Lead on nüüd teistega sama valjusega? (ok / vaikne / vali, ligikaudu mitu dB)'},
      {id:'overall',text:'Käi läbi stseenid 1-8. Kas midagi vajab muutmist? (ok või lühike märkus)'}],
    method:'--load: edit-buffer dump (7F 00) only. --record: listening answers. Nothing is stored or set.'},null,1)+'\n');
  built.push({dir:'FM3_T34E_LIVE',test:'T34E',name:'LIVE KOOSLUS V1',sha256:sha(live)});
  // ---- T34F: T20 CAB_A pack as built in October ----
  execFileSync('node',[path.join(ROOT,'tools/fm3/cab-cut-t20-build.mjs'),path.join(tmp,'t20')],{stdio:'ignore'});
  fs.cpSync(path.join(tmp,'t20','CAB_A'),path.join(out,'FM3_T34F_CABNONE'),{recursive:true});copy(path.join(out,'FM3_T34F_CABNONE'));
  const cm=JSON.parse(fs.readFileSync(path.join(out,'FM3_T34F_CABNONE','manifest.json'),'utf8'));
  built.push({dir:'FM3_T34F_CABNONE',test:'T20 CAB_A',name:cm.confirmName,sha256:cm.preset.sha256});
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

const run=(dir,session,store)=>[`  cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T34/${dir}`,
  `  python3 FM3_BIND_STORE.py --load --pack . --session ../SESSION/${session}`,
  ...(store?[`  (kuula ja vaata; siis FM3-l STORE asukohta ${store}, vali mõni muu preset ja tule tagasi ${store}-le)`,`  python3 FM3_BIND_STORE.py --verify --pack . --session ../SESSION/${session}`]
    :['  (kuula ja vaata)',`  python3 FM3_BIND_STORE.py --record --pack . --session ../SESSION/${session}`])];
fs.writeFileSync(path.join(out,'LOE_MIND.txt'),[
'FM3 katse T34 (07.11.2026): Controllersi allikad, stseenid 5-8, LIVE KOOSLUS V1 ja Cab NONE',
'='.repeat(78),...RULES,'STORE-i teed ainult osas 1 ja ainult asukohta 426. Kõik presetid lähevad redaktsioonipuhvrisse.',
'Sulge enne algust FM3-Edit ja Fractal-Bot. Kui tahad mõnes osas FM3-Editit vaadata, sulge see enne järgmist käsku.',
'Iga osa: --load laadib, sina kuulad, siis vastad küsimustele. Kokku umbes 25 minutit.','',
'Kontroll alguses:','  cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T34/FM3_T34A_SCENES && python3 FM3_BIND_STORE.py --self-test','',
'OSA 1 (T34A) stseenid 5-8 Controllersi kanalitel D, C, B, D; LFO 1A -> Volume. Oodatud tremolo:','  S5 kõige kiirem, S6 kiire, S7 keskmine, S8 kõige kiirem.',...run('FM3_T34A_SCENES','a',426),'',
'OSA 2 (T34B) Scene Controller 1 -> Volume. Oodatud: stseen 1 vaikne, 4 vali.',...run('FM3_T34B_SCENECTRL','b'),'',
'OSA 3 (T34C) Sequencer -> Volume. Oodatud: heli tükeldub rütmiliselt.',...run('FM3_T34C_SEQ','c'),'',
'OSA 4 (T34D) ADSR 1 -> Volume. Oodatud: iga noot paisub sisse.',...run('FM3_T34D_ADSR','d'),'',
'OSA 5 (T34E) LIVE KOOSLUS V1 (Amp C -8 dB): kas Lead on teistega sama valjusega?',...run('FM3_T34E_LIVE','e'),'',
'OSA 6 (T34F) Cab Preamp NONE: kas ploki Low/High Cut on nähtavad? (sama pakk mis T20 CAB_A)',...run('FM3_T34F_CABNONE','f'),'',
'Lõpuks kirjuta vestlusesse "valmis". Võid teha ka ainult osa osadest; kirjuta siis, millised.',''].join('\n'));
console.log(JSON.stringify(built,null,1));

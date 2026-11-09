// controllersScenes and volumePedal.source (0.3.55, T33 2026-11-06). Offline.
// controllersScenes writes only the Controllers header scene words (body 462+2*(scene-1), 0..3 = A..D); volumePedal.source
// changes only word 0 of the captured Volume binding (FM3-Edit MOD_CTRLID index). The FM3-stored T33 body replay is
// tools/fm3/test-t33-controllers-replay.mjs (it reads the raw device results outside the plugin).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {composeSound} from './fm3-sound.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {CONTROLLERS_SCENE_OFFSET,readControllersScenes,controllersCapabilities} from './fm3-controllers.mjs';
import {VOLUME_SOURCES,volumePedalCapabilities} from './fm3-volume-pedal.mjs';
import {readModifiers} from './fm3-parameter-dependencies.mjs';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {sha256} from './fm3-output.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {checkSchema} from './fm3-schema-check.mjs';
import {loadGlobalScaleObservations} from './fm3-global-scale-observations.mjs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const body=syx=>Buffer.from(inspectStructure(syx).raw.body);
const composer={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'CTRL SCENES',scenes:[1,2,3,4].map(s=>({scene:s,name:'S'+s}))};
const layout={row2:['drive','amp','cab'],row3:['volpan','delay','reverb']};
const diffWords=(a,b)=>{const d=[];for(let o=0;o<a.length;o+=2)if(a.readUInt16LE(o)!==b.readUInt16LE(o))d.push(o);return d;};

// 1. Scene channels: only the listed header words change; unlisted scenes stay A; without the field all scenes are A.
const plain=composeSound(base,{composer,layout,volumePan:true}),b0=body(plain.syx);
assert.equal(CONTROLLERS_SCENE_OFFSET,462);assert.deepEqual(readControllersScenes(b0),Array(8).fill('A'));
assert.equal(plain.report.controllersScenes,undefined);assert.match(plain.txt,/^(?![\s\S]*Kanal stseeniti)/);
const sc=composeSound(base,{composer,layout,volumePan:true,controllersScenes:['B','C','D','A','D','C','B','B']}),b1=body(sc.syx);
assert.deepEqual(readControllersScenes(b1),['B','C','D','A','D','C','B','B']);
assert.deepEqual(diffWords(b0,b1),[462,464,466,470,472,474,476]);
assert.deepEqual(sc.report.controllersScenes,['B','C','D','A','D','C','B','B']);assert.deepEqual(sc.report.stages.controllersScenes.changedScenes,[1,2,3,5,6,7,8]);
assert.match(sc.txt,/CONTROLLERS \(Control plokk\):\n  Kanal stseeniti 1–8: B, C, D, A, D, C, B, B \(seadmel kinnitatud kõigis 8 stseenis: T33 06.11.2026 stseenid 1–4 = A–D, T34 07.11.2026 stseenid 5–8/);
const short=composeSound(base,{composer,layout,volumePan:true,controllersScenes:['A','D']});
assert.deepEqual(readControllersScenes(body(short.syx)),['A','D','A','A','A','A','A','A']);assert.deepEqual(diffWords(b0,body(short.syx)),[464]);
for(const [v,re] of [[[],/1…8/],[Array(9).fill('A'),/1…8/],[['E'],/A, B, C or D/],[['a'],/A, B, C or D/],[[0],/A, B, C or D/],['ABCD',/1…8/]])
  assert.throws(()=>composeSound(base,{composer,layout,volumePan:true,controllersScenes:v}),re,JSON.stringify(v));
assert.equal(controllersCapabilities().sceneChannel.field,'controllersScenes');

// 2. volumePedal.source: word 0 only; the rest is the captured template; unknown sources refused.
const ext=composeSound(base,{composer,layout,volumePan:true,volumePedal:true}),be=body(ext.syx);
assert.equal(VOLUME_SOURCES['LFO 1A'],1);assert.equal(VOLUME_SOURCES['External 1'],14);assert.equal(VOLUME_SOURCES['Pitch Follower'],9);
assert.equal(VOLUME_SOURCES['Scene Controller 1'],30);assert.equal(VOLUME_SOURCES['Manual 5'],60);assert.equal(Object.keys(VOLUME_SOURCES).length,19);
for(const [name,code] of Object.entries(VOLUME_SOURCES)){
  const r=composeSound(base,{composer,layout,volumePan:true,volumePedal:{source:name}}),b=body(r.syx);
  assert.deepEqual(diffWords(be,b),code===14?[]:[1584],name);
  const m=readModifiers(b).find(x=>x.active&&x.effectId===102&&x.pid===0);assert.equal(m.source,code);assert.equal(m.record,0);
  assert.equal(r.report.volumePedal.sourceName,name);
  if(code!==14){assert.match(r.txt,new RegExp(name.toUpperCase()+' → VOLUME/PAN 1 — LÕPPFAILIST'));assert.doesNotMatch(r.txt,/External 1 globaalne pedaali/);
    // T39-T41 (2026-11-09): every source is confirmed and STOREd byte-identically; no source is left "not tested".
    assert.match(r.txt,{'LFO 1A':/seadmel kinnitatud: T33 \(2026-11-06\), LFO 1A → Volume säilis STORE/,'Scene Controller 1':/seadmel kinnitatud: T34B \(2026-11-07\); STORE T39 K1 \(2026-11-09\), Scene Controller 1 → Volume säilis STORE/,
      'Sequencer':/seadmel kinnitatud: T34C .*STORE T39/,'ADSR 1':/seadmel kinnitatud: T34D .*STORE T39/,'LFO 2A':/seadmel kinnitatud: T40B \(2026-11-09\), LFO 2A → Volume säilis STORE/,
      'Pitch Follower':/seadmel kinnitatud: T41I \(2026-11-09\)/,'Manual 5':/seadmel kinnitatud: T41H \(2026-11-09\)/}[name]??/seadmel kinnitatud: T4[01][A-I] \(2026-11-09\), .* säilis STORE/);
    assert.doesNotMatch(r.txt,/seadmel ei kontrollitud|STORE\/reload-i selle allikaga ei tehtud/);}
}
assert.equal(composeSound(base,{composer,layout,volumePan:true,volumePedal:{source:'External 1'}}).txt,ext.txt,'explicit External 1 = default');
for(const s of ['Control Switch 1','PEDAL 1 (EXP/SW TIP)','External 2','NONE','lfo 1a',1])
  assert.throws(()=>composeSound(base,{composer,layout,volumePan:true,volumePedal:{source:s}}),/volumePedal.source must be one of/,String(s));
// Range, curve and source combine; next to the Wah binding the Volume record is 1.
const wah={...composer,wahChannels:[{channel:'A',type:'FAS Wah'}],modifiers:{external1Wah:true}},lw=composeSound(base,{composer:wah,layout:{...layout,row2:['wah','drive','amp','cab']},volumePan:true,volumePedal:{source:'LFO 2A',min:2.5,max:7.5}});
const mw=readModifiers(body(lw.syx)).filter(m=>m.active);assert.deepEqual(mw.map(m=>[m.record,m.source,m.effectId]),[[0,14,94],[1,3,102]]);
assert.match(lw.txt,/Volume järgib allikat LFO 2A, mitte pedaali/);
assert.equal(volumePedalCapabilities().sources.deviceConfirmed['LFO 1A'],'T33 (2026-11-06)');
assert.deepEqual(Object.keys(volumePedalCapabilities().sources.deviceConfirmed).sort(),Object.keys(VOLUME_SOURCES).sort(),'T39-T41: all 19 sources device-confirmed');
// modifierEdits identify the Volume binding by its own source.
const espec=s=>({composer:wah,layout:{...layout,row2:['wah','drive','amp','cab']},volumePan:true,volumePedal:{source:'LFO 1A'},modifierEdits:[{operation:'remove',record:1,expect:{source:s,block:'volpan',param:'VOLUME_GAIN'}}]});
assert.deepEqual(checkSchema('fm3-sound.schema.json',espec('LFO 1A')),[],'schema accepts a Volume edit by its LFO source');
const removed=composeSound(base,espec('LFO 1A'));assert.deepEqual(readModifiers(body(removed.syx)).filter(m=>m.active).map(m=>m.record),[0]);
assert.throws(()=>composeSound(base,espec('External 1')),/expect must identify/);

// 3. Saved bundle: verifies; tampering with a scene word, the report, the text, the spec or the source is refused.
const bspec={composer,layout,volumePan:true,volumePedal:{source:'LFO 1A'},controllersScenes:['A','B','C','D'],controllers:[{channel:'B',param:'LFO1FREQ',value:2}]};
const good=createPreset(base,bspec),parsed=inspectStructure(good.syx),gb=Buffer.from(parsed.raw.body);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-ctl-scenes-'));
try{
  const stem=path.join(dir,'good');writePresetOutputs(stem,good,bspec);verifyPresetOutputs(stem);
  const tamper=[['scene word',r=>r.body.writeUInt16LE(3,466),/Final Controllers scene channels differ/],
    ['scene word 6',r=>r.body.writeUInt16LE(1,472),/Final Controllers scene channels differ/],
    ['report',r=>{r.report.controllersScenes[1]='C';},/Final Controllers scene report differs/],
    ['stage',r=>{r.report.stages.controllersScenes.after[0]='D';},/stage report differs/],
    ['report dropped',r=>{delete r.report.controllersScenes;},/Final Controllers scene report differs/],
    ['text',r=>{r.txt=r.txt.replace('Kanal stseeniti 1–8: A, B, C, D,','Kanal stseeniti 1–8: A, B, D, C,');},/Final TXT/],
    ['spec channel',r=>{r.spec.controllersScenes[2]='A';},/Final Controllers scene channels differ/],
    ['spec dropped',r=>{delete r.spec.controllersScenes;},/Controllers scene report without spec/],
    ['source word',r=>r.body.writeUInt16LE(2,1584),/binding readback failed/],
    ['spec source',r=>{r.spec.volumePedal.source='LFO 1B';},/binding readback failed/]];
  for(const [i,[name,mutate,error]] of tamper.entries()){
    const r={...good,report:structuredClone(good.report),body:Buffer.from(gb),spec:structuredClone(bspec)};mutate(r);
    r.syx=Buffer.from(reencodeDumpFromRawPatch(good.syx,reencodeRawPatch(parsed.raw.rawPatch,r.body)));r.report.outputSha256=sha256(r.syx);r.report.bytes=r.syx.length;
    const target=path.join(dir,String(i));writePresetOutputs(target,r,r.spec);assert.throws(()=>verifyPresetOutputs(target),error,name);
  }
  // Global scale observations re-render the text; the scene-channel section must stay and the bundle must verify.
  const ev=path.join(dir,'SYNTHETIC-observations.json');
  execFileSync('python3',[fileURLToPath(new URL('./global-scale-collector/test_global_scale_decode.py',import.meta.url)),'--fixture',ev]);
  const ospec=JSON.parse(fs.readFileSync(new URL('../examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json',import.meta.url)));
  ospec.composer.name='CTS GLOBAL OBS';ospec.composer.pitchChannels=[{channel:'A',type:'Custom Shifter'}];
  ospec.layout={row2:['drive','phaser','amp','cab'],row3:['pitch','delay','reverb']};
  ospec.controls=[{block:'pitch',channel:'A',param:'CUSTOMSCALE1',value:'SCALE 1'}];ospec.controllersScenes=['C','B'];
  const obs=createPreset(base,ospec,{globalScaleObservations:loadGlobalScaleObservations(ev)});
  assert.match(obs.txt,/Kanal stseeniti 1–8: C, B, A,/);const ostem=path.join(dir,'obs');writePresetOutputs(ostem,obs,ospec);verifyPresetOutputs(ostem);
  // An unrequested scene channel in a composer output is refused.
  const pstem=path.join(dir,'plain'),pb=body(plain.syx);pb.writeUInt16LE(1,462);
  const ps=Buffer.from(reencodeDumpFromRawPatch(plain.syx,reencodeRawPatch(inspectStructure(plain.syx).raw.rawPatch,pb))),pr={...plain,syx:ps,report:{...structuredClone(plain.report),outputSha256:sha256(ps),bytes:ps.length}};
  writePresetOutputs(pstem,pr,{composer,layout,volumePan:true});assert.throws(()=>verifyPresetOutputs(pstem),/scene channel set without controllersScenes|differ/);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,sceneWords:8,volumeSources:Object.keys(VOLUME_SOURCES).length,tamper:10}));

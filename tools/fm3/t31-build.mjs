// Build the T31 packs: legacy Cab IR number display and CPU cost of the insertable block types. Offline; writes
// measurement presets, never device I/O.
// REA (FM3-Edit 1.07.17 __block_layout.xml, sha 0fc5f3da…95a2, the layout pinned by fm3-insert-applicability.json):
//   CABINET_TYPE1/2 are the Cab 1/2 "Type" readouts (readoutCabNumber, beside Bank and the IR name) on the Legacy Cab
//   page; DISTORT_XFLEAKAGE, DISTORT_RESOLUTION, DISTORT_DYNDEPTH, DISTORT_DYNPRES and TENTAP_REFTEMPO have no
//   EditorControl at all (T23 also found no front-panel control for DYNDEPTH/DYNPRES). So only the Cab numbers can be
//   read on a screen; the other five stay unverified-taper.
//   Corpus (tracked .syx): Cab channels hold mode/bank1/type1/bank2/type2 = 1/1/597/1/583 (DynaCab, 1972 channels),
//   1/0/0/0/0, 0/3/127/0/0 (Legacy, bank LEGACY, IR 127) and 1/3/127/0/0: the Type word is a plain IR index.
//   The composer Cab (NewLook) channel A is already Legacy (bank LEGACY, IR 127); Scene 1 uses channel D (DynaCab).
//   FM3_T31_CAB (FM3_SHOT_LOAD.py --load): CB1 = NewLook + Optical Compressor, Cab channel A Cab 1 = FACTORY 1 IR word
//     17, Cab 2 = FACTORY 2 IR word 200 (raw words, measurement only), Scene 1 on Cab channel A. Claude reads Bank,
//     Type number and Name for Cab 1 and Cab 2 in FM3-Edit: does Type show the stored word or the word + 1?
//   FM3_T31_CPU (FM3_CPU_SWEEP.py): cal-newlook (52.8 %, stops on mismatch), then cal-newlook plus one inserted block in
//     row 3 (between Delay and Reverb, engaged in Scene 1) for every type of the insertable families whose CPU table
//     has only the default type (Plex 5, Megatap 22, Ten-Tap 2, Resonator 2, Ring Mod 3, Gate 4, Synth voice 1 8),
//     the single-type families as a cross-check (Multiband, Looper, Formant), Volume/Pan VOLUME and AUTO-SWELL, the
//     Cab in Legacy mode (Scene 1 on the composer's Legacy channel A), and cal-newlook again (drift). Non-default types are a raw type word on channel A; every
//     other word keeps the device default. CPU(item) - CPU(cal-newlook) = the block's cost.
// Nothing is stored or set. Usage: node tools/fm3/t31-build.mjs OUT_DIR
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
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t31-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const NEWLOOK=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const COMPOSER={schemaVersion:1,firmware:13,baseProfile:'jb-composer',compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const ROW2=['compressor','drive','amp','cab'];
const body=syx=>Buffer.from(inspectStructure(syx).raw.body);
const recOf=(b,family)=>{const r=scanRecords(b,{requireAmpCab:false}).records.filter(x=>x.family===family);assert.equal(r.length,1,family);return r[0];};
// Raw word writes on a composed preset (measurement only), verified re-encode into the edit-buffer dump.
function patch(syx,family,writes,scene1Channel=null){
  const st=inspectStructure(syx),b=Buffer.from(st.raw.body),r=recOf(b,family);
  for(const w of writes){assert.ok(w.pid<r.words);b.writeUInt16LE(w.raw,r.start+2*('ABCD'.indexOf(w.channel)*r.words+w.pid));}
  if(scene1Channel!==null)b.writeUInt16LE(scene1Channel,r.header+10);
  const o=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(st.raw.rawPatch,b)));
  assert.deepEqual([...parsePresetDump(o,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
  assert.ok(body(o).equals(b),'re-encode round trip');
  return o;
}
const words=(b,r)=>[...Array(r.words*r.channels).keys()].map(i=>b.readUInt16LE(r.start+2*i));

// ---- FM3_T31_CAB ----
const CAB={mode:findParam('CABINET','CABINET_MODE'),bank1:findParam('CABINET','CABINET_BANK1'),type1:findParam('CABINET','CABINET_TYPE1'),
  bank2:findParam('CABINET','CABINET_BANK2'),type2:findParam('CABINET','CABINET_TYPE2')};
assert.deepEqual([CAB.mode.param,CAB.bank1.param,CAB.type1.param,CAB.bank2.param,CAB.type2.param],[31,0,4,1,5]);
assert.equal(CAB.mode.enum[0],'LEGACY');assert.equal(CAB.bank1.enum[0],'FACTORY 1');assert.equal(CAB.bank2.enum[1],'FACTORY 2');
const cabBase=Buffer.from(composeSound(NEWLOOK,{composer:{...COMPOSER,name:'T31 CAB LEGACY'},layout:{row2:ROW2,row3:['delay','reverb']}}).syx);
const CAB_WRITES=[{param:'CABINET_BANK1',pid:0,raw:0,shows:'FACTORY 1'},{param:'CABINET_TYPE1',pid:4,raw:17,shows:'17 or 18'},
  {param:'CABINET_BANK2',pid:1,raw:1,shows:'FACTORY 2'},{param:'CABINET_TYPE2',pid:5,raw:200,shows:'200 or 201'}].map(w=>({...w,channel:'A'}));
const cb1=patch(cabBase,'cab',CAB_WRITES,0),cb=body(cb1),cr=recOf(cb,'cab'),cb0=body(cabBase);
assert.equal(cb0.readUInt16LE(cr.start+2*CAB.mode.param),0,'composer Cab channel A is Legacy');assert.equal(cb0.readUInt16LE(cr.header+10),3,'composer Scene 1 on Cab D');
for(const w of CAB_WRITES){w.before=cb0.readUInt16LE(cr.start+2*w.pid);assert.notEqual(w.before,w.raw,'non-default '+w.param);}
assert.equal(cb.readUInt16LE(cr.header+10),0,'Scene 1 on Cab channel A');
const cabItem={id:'CB1',file:'CB1.syx',sha256:sha(cb1),name:'T31 CAB LEGACY',
  question:'Legacy Cab channel A: which Bank, Type number and Name does FM3-Edit show for Cab 1 and Cab 2?',
  blocks:[{family:'cab',effectId:cr.eid,words:cr.words,channels:cr.channels,request:hex(R.bulkReadPoll(cr.eid)),expected:words(cb,cr),writes:CAB_WRITES}]};

// ---- FM3_T31_CPU ----
const SEL={plex:'PLEX_BASETYPE',megatap:'MEGATAP_TYPE',tentap:'TENTAP_TYPE',resonator:'RESONATOR_MODE',ringmod:'RINGMOD_TYPE',gate:'GATE_TYPE',synth:'SYNTH_TYPE1'};
const FAM={plex:'PLEX',megatap:'MEGATAP',tentap:'TENTAP',resonator:'RESONATOR',ringmod:'RINGMOD',gate:'GATE',synth:'SYNTH'};
const cpuItems=[];const add=(id,family,syx,meta)=>cpuItems.push({id,family,syx,...meta});
const calibration=()=>Buffer.from(composeSound(NEWLOOK,{composer:{...COMPOSER,name:'CPU CAL NEWLOOK'},layout:{row2:ROW2,row3:['delay','reverb']}}).syx);
add('cal-newlook','calibration',calibration(),{expectPercent:52.8,note:'NewLook + Optical Compressor (= T26 cal-newlook)'});
const inserted=(b,name)=>Buffer.from(composeSound(NEWLOOK,{composer:{...COMPOSER,name},insert:[b],layout:{row2:ROW2,row3:['delay',b,'reverb']},
  blockScenes:{[b]:[{scene:1,bypass:false}]}}).syx);
for(const [b,n] of Object.entries(SEL)){
  const p=findParam(FAM[b],n),syx0=inserted(b,('CPU '+b).toUpperCase().slice(0,20)),r0=recOf(body(syx0),b),def=body(syx0).readUInt16LE(r0.start+2*p.param);
  assert.equal(body(syx0).readUInt16LE(r0.header+10),0,b+' Scene 1 channel A');
  for(let t=0;t<p.enum.length;t++){
    const name=('CPU '+b+' '+t).toUpperCase();
    const syx=t===def?inserted(b,name):patch(inserted(b,name),b,[{channel:'A',pid:p.param,raw:t}]);
    assert.equal(body(syx).readUInt16LE(recOf(body(syx),b).start+2*p.param),t);
    add(b+':'+t,b,syx,{selector:n,typeWord:t,type:p.enum[t],source:t===def?'device-default insert record':'raw type word on channel A (other words default)'});
  }
}
for(const b of ['multiband','looper','formant'])add(b+':default',b,inserted(b,('CPU '+b).toUpperCase()),{source:'device-default insert record (cross-check)'});
const VT=findParam('VOLUME','VOLUME_TYPE');assert.deepEqual(VT.enum,['VOLUME','AUTO-SWELL']);
const vp=name=>Buffer.from(composeSound(NEWLOOK,{composer:{...COMPOSER,name},volumePan:true,layout:{row2:ROW2,row3:['delay','volpan','reverb']}}).syx);
add('volpan:0','volpan',vp('CPU VOLPAN 0'),{selector:'VOLUME_TYPE',typeWord:0,type:'VOLUME',source:'composer Volume/Pan record'});
add('volpan:1','volpan',patch(vp('CPU VOLPAN 1'),'volpan',[{channel:'A',pid:VT.param,raw:1}]),{selector:'VOLUME_TYPE',typeWord:1,type:'AUTO-SWELL',source:'raw type word on channel A'});
// Legacy Cab: cost = CPU(item) - CPU(cal-newlook) + DynaCab cost.
add('cab:legacy','cab',patch(calibration(),'cab',[],0),
  {selector:'CABINET_MODE',typeWord:0,type:'LEGACY',source:'cal-newlook with Scene 1 on Cab channel A (composer Legacy channel: bank LEGACY, IR 127); cal-newlook uses DynaCab channel D'});
add('cal-newlook-end','calibration',calibration(),{note:'cal-newlook again: meter drift over the sweep'});
const ids=new Set(cpuItems.map(i=>i.id));assert.equal(ids.size,cpuItems.length);
for(const it of cpuItems)assert.deepEqual([...parsePresetDump(it.syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit buffer '+it.id);

// ---- write packs ----
const copy=(dir,files)=>{for(const f of files)fs.copyFileSync(new URL(f,COLLECT),path.join(dir,f));};
const adir=path.join(out,'FM3_T31_CAB');fs.mkdirSync(adir,{recursive:true});fs.writeFileSync(path.join(adir,cabItem.file),cb1);
copy(adir,['FM3_SHOT_LOAD.py','FM3_SHOT_READ.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py']);
const am={kind:'fm3-shot-check',version:1,date:'2026-11-05',test:'T31',title:'Legacy Cab IR number',experimental:false,observeOnly:true,
  method:'FM3_SHOT_LOAD.py --load sends CB1 to the edit buffer (7F 00) and reads the Cab record with fn=0x1F (read-only); Claude reads FM3-Edit without saving. Nothing is stored or set.',
  items:[cabItem]};
fs.writeFileSync(path.join(adir,'manifest.json'),JSON.stringify(am,null,1)+'\n');
const cdir=path.join(out,'FM3_T31_CPU');fs.mkdirSync(path.join(cdir,'presets'),{recursive:true});copy(cdir,['FM3_CPU_SWEEP.py']);
const cm={schemaVersion:1,builder:'t31-build 0.1.0',test:'T31',calibrationOnly:false,confirmName:'CPU CAL NEWLOOK',reference:'cal-newlook',scene:1,header:'7f0000400',
  note:'Cost of an item = CPU(item) - CPU(cal-newlook); every item is cal-newlook plus one block in row 3 (Cab item: the Cab switched to Legacy).',
  items:cpuItems.map((it,i)=>{const f=`presets/${String(i).padStart(3,'0')}.syx`;fs.writeFileSync(path.join(cdir,f),it.syx);const {syx,...meta}=it;return {...meta,file:f,sha256:sha(syx)};})};
fs.writeFileSync(path.join(cdir,'manifest.json'),JSON.stringify(cm,null,1)+'\n');
const L=['FM3 katse T31: Legacy Cabi IR-number ja lisatud plokkide CPU (ainult laadimine ja lugemine)','='.repeat(70),
 'Skriptid EI salvesta ega sea midagi. STORE-i pole vaja. Preset on ainult redaktsioonipuhvris; preseti vahetamine kustutab selle.',
 'FM3-Editis EI vajutata kunagi Save. Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse).','',
 'OSA 1: Cab (Remote Control laadib, Claude teeb FM3-Editi pildid)',
 '  0. Sulge FM3-Edit ja Fractal-Bot (USB-port on ainukasutuses).',
 '  1. cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T31_CAB && python3 FM3_SHOT_LOAD.py --self-test',
 '  2. python3 FM3_SHOT_LOAD.py --load --pack . --session ../FM3_T31_CAB_SESSION --preset CB1',
 '  3. python3 FM3_SHOT_READ.py --pack . --session ../FM3_T31_CAB_SESSION --preset CB1 --label after-load',
 '  4. FM3-Editis Cab plokk, kanal A: Cab 1 ja Cab 2 Bank, Type number ja nimi.','',
 'OSA 2: CPU (Remote Control või Jan Terminalis, umbes 5 minutit)',
 '  0. Sulge FM3-Edit.',
 '  1. cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T31_CPU',
 '  2. python3 FM3_CPU_SWEEP.py --pack . --session ../FM3_T31_CPU_SESSION',
 '     Esimese preseti järel küsib skript, kas FM3 ekraanil on nimi "CPU CAL NEWLOOK". Vasta j ja Enter.',
 `     Edasi läheb ise läbi (${cpuItems.length} presetti). Lõpus vali FM3-l mõni preset; midagi ei salvestatud.`,''];
for(const d of [adir,cdir])fs.writeFileSync(path.join(d,'LOE_MIND.txt'),L.join('\n'));
console.log(JSON.stringify({cab:{sha256:cabItem.sha256,manifest:sha(fs.readFileSync(path.join(adir,'manifest.json'))),writes:CAB_WRITES.map(w=>`${w.param}: ${w.before} -> ${w.raw}`)},
  cpu:{items:cm.items.length,manifest:sha(fs.readFileSync(path.join(cdir,'manifest.json'))),ids:cm.items.map(i=>i.id+(i.type?' '+i.type:'')).join(', ')}},null,1));

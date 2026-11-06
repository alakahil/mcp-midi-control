// Build the T33 pack (audit 06.11.2026, O3/H2): which Controllers channel each scene uses, and a Controllers source
// (LFO 1A) driving a modifier. Offline; writes one measurement preset, never device I/O.
// Hypothesis 1 (scene channel): the Controllers record (effect id 2, body offset 452) has the same 46-byte header as
//   every grid block (id, 4 words, 8 scene-channel words at +10, 8 bypass words at +26, words, channels). In the
//   grid blocks +10+2*(scene-1) is the scene's channel (T32: Amp A,B,C,A,A,B,C,D read back exactly). All 806 repo
//   presets hold 0 in the Controllers header (= channel A), so there is no oracle yet. CTS writes scenes 1..4 = A..D.
// Hypothesis 2 (source code): FM3-Edit's MOD_CTRLID list (61 labels, fm3-param-dictionary.json) gives the modifier
//   source code as the list index. Six codes are already device-anchored (External 1 = 14, Control Switch 2..6 =
//   51..55) and the 25-word record template is source independent (External 1 and Control Switch records share it).
//   CTS takes the composer's External 1 -> Volume/Pan Volume record and changes only word 0 to 1 (LFO 1A).
// Combined audible check: LFO 1 Rate is 1 / 2 / 4 / 8 Hz on Controllers channels A / B / C / D, so if both hold, the
// volume pulses faster in each of scenes 1..4. FM3_BIND_STORE.py --load sends the edit buffer (7F 00); the user
// listens, looks at the Controllers channel and the Volume modifier source, STOREs to 425 and comes back; --verify
// reads 425 (fn=0x03, read only). The scripts never store or set.
// Usage: node tools/fm3/t33-controllers-scene-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset}=await imp('scripts/fm3-preset.mjs');
const {loadDictionary,findParam,decodeValue}=await imp('scripts/fm3-table-encoder.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump,reencodeRawPatch,reencodeDumpFromRawPatch}=await imp('scripts/fm3-codec.mjs');
const {readModifiers}=await imp('scripts/fm3-parameter-dependencies.mjs');
const {CONTROLLERS_RECORD,readControllers}=await imp('scripts/fm3-controllers.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t33-controllers-scene-build.mjs OUT_DIR');
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const NAME='T33 CTRL SCENES';
const RATES={A:1,B:2,C:4,D:8};
const FIELDS0=1584,RECORD=96,LFO1A=1,EXT1=14,VOLPAN=102;

// FM3-Edit source list: index = code; check the device-anchored codes.
const mod=loadDictionary().params.find(p=>p.family==='MOD'&&p.name==='MOD_CTRLID');assert.ok(mod,'MOD_CTRLID');
assert.equal(mod.enum.length,61);assert.equal(mod.enum[LFO1A],'LFO 1A');assert.equal(mod.enum[EXT1],'External 1');
for(let n=1;n<=6;n++)assert.equal(mod.enum[49+n],'Control Switch '+n);

const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:NAME,
    scenes:['A','B','C','D'].map((c,i)=>({scene:i+1,name:'CTRL '+c+' '+RATES[c]+' HZ'}))},volumePan:true,volumePedal:true,
  layout:{row2:['drive','amp','cab'],row3:['volpan','delay','reverb']},selectedScene:1,
  controllers:Object.entries(RATES).map(([channel,value])=>({channel,param:'LFO1FREQ',value}))};
const syx0=Buffer.from(createPreset(BASE,spec).syx),st0=inspectStructure(syx0),b0=Buffer.from(st0.raw.body);
const C=CONTROLLERS_RECORD;assert.equal(b0.readUInt16LE(C.header),2);
assert.ok(b0.subarray(C.header+2,C.header+42).every(x=>x===0),'composer Controllers header all zero');
const ctl=readControllers(b0),rateRaw={},LFO1FREQ=findParam('CONTROLLERS','LFO1FREQ');
for(const ch of 'ABCD'){const raw=ctl.find(x=>x.channel===ch).words[LFO1FREQ.param];assert.ok(Math.abs(decodeValue(LFO1FREQ,raw)-RATES[ch])<0.01,'LFO1FREQ '+ch);rateRaw[ch]=raw;}
const ext=readModifiers(b0).filter(m=>m.active&&m.sourceName==='External 1'&&m.effectId===VOLPAN);assert.equal(ext.length,1,'one External 1 -> Volume record');
const rec=ext[0].record,src=FIELDS0+RECORD*rec;assert.equal(b0.readUInt16LE(src),EXT1);

// Raw measurement patch: Controllers scene words 1..4 = A..D (5..8 stay A), record word 0 = LFO 1A.
const b=Buffer.from(b0);const SCENE=[0,1,2,3,0,0,0,0];
SCENE.forEach((c,i)=>b.writeUInt16LE(c,C.header+10+2*i));b.writeUInt16LE(LFO1A,src);
const syx=Buffer.from(reencodeDumpFromRawPatch(syx0,reencodeRawPatch(st0.raw.rawPatch,b)));
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const st=inspectStructure(syx),bb=Buffer.from(st.raw.body);assert.ok(bb.equals(b),'re-encode round trip');
assert.equal(String(st.decoded.preset_name).trim(),NAME);
const diff=[];for(let o=0;o<b.length;o+=2)if(b0.readUInt16LE(o)!==bb.readUInt16LE(o))diff.push(o);
assert.deepEqual(diff,[C.header+12,C.header+14,C.header+16,src],'only three scene words and the source word changed');
const m1=readModifiers(bb).find(m=>m.record===rec);assert.equal(m1.sourceName,'LFO 1A');assert.equal(m1.effectId,VOLPAN);

fs.mkdirSync(out,{recursive:true});const dir=path.join(out,'FM3_T33_CTRL');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'CTS.syx'),syx);
for(const f of ['FM3_BIND_STORE.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py'])fs.copyFileSync(new URL(f,COLLECT),path.join(dir,f));
const manifest={kind:'fm3-bind-store',version:1,test:'T33',date:'2026-11-06',confirmName:NAME,preset:{file:'CTS.syx',sha256:sha(syx)},storeLocation:425,
  hypotheses:{sceneChannel:{offsets:SCENE.map((c,i)=>C.header+10+2*i),values:SCENE,meaning:'Controllers channel per scene (0..3 = A..D)'},
    source:{record:rec,offset:src,from:EXT1,to:LFO1A,label:'LFO 1A',target:'Volume/Pan 1 Volume (effect 102, pid 0)'}},
  lfo1RateHz:RATES,lfo1RateRaw:rateRaw,changedWordOffsets:diff,
  checks:[
    {id:'tremolo',text:'Mängi stseene 1, 2, 3 ja 4. Kas helitugevus pulseerib (tremolo)? Kirjelda kiirust igas stseenis (nt "S1 aeglane, S2 kiirem, S3 veel kiirem, S4 kõige kiirem" või "ei pulseeri").'},
    {id:'channel',text:'Kui näed (FM3-Edit Controllers plokk või esipaneel): mis Controllersi kanal on igas stseenis 1-4? (nt "A B C D"; kui ei näe, kirjuta "-")'},
    {id:'source',text:'Volume/Pan plokk -> Volume -> modifikaator: mis on Source? (nt "LFO 1A"; kui ei näe, "-")'}],
  method:'--load: edit-buffer dump (7F 00) only. The user STOREs on the FM3 to location 425. --verify: one read-only stored-dump request (fn=0x03) for that location. The script never stores and never sets.'};
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
fs.writeFileSync(path.join(dir,'LOE_MIND.txt'),[
'FM3 katse T33: Controllersi kanal stseeniti ja LFO 1A -> Volume (laadimine, kuulamine, STORE 425)',
'='.repeat(78),
'Skriptid EI salvesta ega sea midagi. STORE-i teed sina ise, ainult asukohta 425.',
'FM3-Editis EI vajutata Save. Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse).',
'',
'Preset: stseenides 1-4 on Controllersi kanal A/B/C/D, LFO 1 kiirus seal 1/2/4/8 Hz. LFO 1A juhib Volume/Pan',
'helitugevust. Kui kõik klapib, pulseerib heli igas järgmises stseenis kiiremini. Volume pedaal selles presetis',
'ei tööta (selle seos on LFO-le ümber suunatud).',
'',
'  0. Sulge FM3-Edit ja Fractal-Bot.',
'  1. cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T33_CTRL && python3 FM3_BIND_STORE.py --self-test',
'  2. python3 FM3_BIND_STORE.py --load --pack . --session ../FM3_T33_SESSION',
'  3. Mängi stseene 1-4 ja jäta meelde, kas ja kui kiiresti heli pulseerib.',
'     Kui tahad, ava FM3-Edit ja vaata Controllers ploki kanalit igas stseenis ning Volume modifikaatori Source-i.',
'     Sulge FM3-Edit ilma Save-ta.',
'  4. FM3-l: STORE asukohta 425. Vali mõni muu preset, siis tagasi 425-le.',
'  5. python3 FM3_BIND_STORE.py --verify --pack . --session ../FM3_T33_SESSION',
'     Vasta kolmele küsimusele (enne ja pärast salvestamist) ning asukoha küsimusele: 425.',
'  6. Kirjuta vestlusesse "valmis".',''].join('\n'));
console.log(JSON.stringify({name:NAME,sha256:manifest.preset.sha256,record:rec,changed:diff}));

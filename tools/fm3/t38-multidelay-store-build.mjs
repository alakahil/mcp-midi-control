// Build the T38 Multi Delay Type STORE/reload pack (multidelayTypes, 0.3.56). Offline; writes one preset, never device I/O.
// T36 confirmed that a multidelayTypes preset loads into the edit buffer with all 484 Multi Delay words. Open: does a
// templated channel survive STORE and reload? This preset uses four other Types (A Ya-Ya Delay + Mix 30 %, B Space
// Tape, C L-C-R-C, D Centaurus X-3; scenes 1..4 engage channels A..D), so it also widens the load coverage.
// FM3_BIND_STORE.py --load sends it to the edit buffer (7F 00); the user STOREs it on the FM3 to a location he picks
// in 424..426, selects another preset, returns, answers the questions; --verify reads that location with one
// read-only stored-dump request (fn=0x03). The scripts never store and never set.
// Usage: node tools/fm3/t38-multidelay-store-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset,writePresetOutputs,verifyPresetOutputs}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const {multidelayType}=await imp('scripts/fm3-multidelay-types.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t38-multidelay-store-build.mjs OUT_DIR');
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const NAME='T38 MD STORE',WORDS=121;
const TYPES=[['A','Ya-Ya Delay'],['B','Space Tape'],['C','L-C-R-C'],['D','Centaurus X-3']];
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:NAME,compressorChannels:[{channel:'A',type:'Optical Compressor'}],
    scenes:TYPES.map(([c,t],i)=>({scene:i+1,name:c+' '+t}))},
  insert:['multidelay'],selectedScene:1,layout:{row2:['compressor','drive','amp','cab'],row3:['delay','multidelay','reverb']},
  multidelayTypes:TYPES.map(([channel,type])=>({channel,type})),
  controls:[{block:'multidelay',channel:'A',param:'MULTITAP_MIX',value:30}],
  blockScenes:{multidelay:TYPES.map(([channel],i)=>({scene:i+1,channel,bypass:false}))}};
const r=createPreset(BASE,spec),syx=Buffer.from(r.syx);
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const body=Buffer.from(inspectStructure(syx).raw.body),rec=scanRecords(body,{requireAmpCab:false}).records.find(x=>x.eid===74);
const mix=r.report.controls.find(c=>c.name==='MULTITAP_MIX');
TYPES.forEach(([c,t],k)=>{const img=multidelayType(t).words,got=[...Array(WORDS).keys()].map(i=>body.readUInt16LE(rec.start+2*(k*WORDS+i)));
  assert.deepEqual(img.map((w,i)=>w!==got[i]?i:-1).filter(i=>i>=0),c==='A'?[mix.pid]:[],c+' '+t);});
const d=path.join(out,'FM3_T38_MDSTORE');fs.mkdirSync(d,{recursive:true});
const stem=path.join(d,'T38_MD_STORE');writePresetOutputs(stem,r,spec);verifyPresetOutputs(stem);
for(const f of ['FM3_BIND_STORE.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py'])fs.copyFileSync(new URL(f,COLLECT),path.join(d,f));
const manifest={kind:'fm3-bind-store',version:1,test:'T38',date:'2026-11-07',confirmName:NAME,preset:{file:'T38_MD_STORE.syx',sha256:sha(syx)},
  storeLocation:'424..426 (the user picks a location he may overwrite)',
  purpose:'multidelayTypes channel templates after STORE and reload (T36 confirmed the edit-buffer load only).',
  multidelayTypes:TYPES.map(([channel,type])=>({channel,type,index:multidelayType(type).index})),
  expect:{types:TYPES.map(([c,t])=>c+' '+t).join(', '),mixA:'30 %'},
  checks:[{id:'types',text:'FM3-Editis (ilma Save-ta) Multi Delay plokk: mis on Type kanalitel A, B, C, D? (oodatud A Ya-Ya Delay, B Space Tape, C L-C-R-C, D Centaurus X-3; kui ei vaata, "-"). Sulge FM3-Edit enne järgmist käsku.'},
    {id:'sound',text:'Mängi stseenid 1-4. Kas delay kõlab igas stseenis ja erinevalt? (ok või lühike märkus)'}],
  method:'--load: edit-buffer dump (7F 00) only. The user STOREs on the FM3 to a location in 424..426. --verify: one read-only stored-dump request (fn=0x03) for that location. The script never stores and never sets.'};
fs.writeFileSync(path.join(d,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
const L=['FM3 katse T38: Multi Delay Type pärast STORE-i ja uuesti laadimist','='.repeat(64),
 'Skriptid EI salvesta ega sea midagi. FM3-Editis EI vajutata Save.','Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse).',
 'STORE-i teed sina, ainult asukohta 424, 425 või 426 (vali selline, mida tohib üle kirjutada).','',
 'Preset "T38 MD STORE": Multi Delay A Ya-Ya Delay (Mix 30 %), B Space Tape, C L-C-R-C, D Centaurus X-3; stseenid 1-4 = kanalid A-D.','',
 '0. Sulge FM3-Edit ja Fractal-Bot.',
 '1. cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T38_MDSTORE && python3 FM3_BIND_STORE.py --self-test',
 '2. python3 FM3_BIND_STORE.py --load --pack . --session ../FM3_T38_SESSION',
 '   (vasta j, kui FM3 ekraanil on "T38 MD STORE")',
 '3. Soovi korral vaata FM3-Editis Type\'e ja kuula stseene 1-4; sulge FM3-Edit ilma Save-ta.',
 '4. FM3-l STORE asukohta 424, 425 või 426. Siis vali mõni muu preset ja tule tagasi sellele asukohale.',
 '5. Vaata uuesti Type\'e (FM3-Edit, ilma Save-ta, siis kinni) ja kuula stseene 1-4.',
 '6. python3 FM3_BIND_STORE.py --verify --pack . --session ../FM3_T38_SESSION',
 '   Skript küsib, mida nägid enne ja pärast, ning asukoha numbrit; siis loeb selle asukoha (ainult lugemine).',
 '7. Kirjuta Claude\'ile "valmis" ja asukoha number.',''];
fs.writeFileSync(path.join(d,'LOE_MIND.txt'),L.join('\n'));
console.log(JSON.stringify({manifest:sha(fs.readFileSync(path.join(d,'manifest.json'))),preset:manifest.preset.sha256,cpu:r.report.cpu.maxPercent,files:fs.readdirSync(d)}));

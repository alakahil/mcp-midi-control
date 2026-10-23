// Build the CPU sweep pack (audit point 7). Offline; writes measurement presets, never device I/O.
// Every preset = the pinned NewLook base + at most one changed/added block, Scene 1 selected,
// dump header 7F 00 (edit buffer, as in every FM3-Edit export). The collector sends them one by one
// to the edit buffer and reads the CPU meter (fn=0x01 sub=0x2E). Nothing is ever stored.
// Usage: node tools/fm3/cpu-sweep-build.mjs OUT_DIR [--families=drive,reverb,...]
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {generatePreset}=await imp('scripts/fm3-generate.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {reencodeRawPatch,reencodeDumpFromRawPatch,parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const {findParam,encodeValue,decodeValue}=await imp('scripts/fm3-table-encoder.mjs');
const {composerLibraries}=await imp('scripts/fm3-composer-components.mjs');
const {insertBlocks}=await imp('scripts/fm3-insert-blocks.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const BASE=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');

// Body edits for measurement presets only: selected scene and explicit table words; verified readback.
function patch(syx,{scene=1,writes=[]}={}){
  const before=inspectStructure(syx),body=Buffer.from(before.raw.body),{records}=scanRecords(body);
  body[0]=scene-1;
  for(const w of writes){const r=records.find(x=>x.family===w.block);assert.ok(r,'missing '+w.block);const p=findParam(w.block,w.param);
    body.writeUInt16LE(encodeValue(p,w.value,{allow:['linear-by-structure','enum-labels']}),r.start+2*('ABCD'.indexOf(w.channel??'A')*r.words+p.param));}
  const out=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(before.raw.rawPatch,body)));
  assert.ok(Buffer.from(inspectStructure(out).raw.body).equals(body),'readback');
  assert.deepEqual([...parsePresetDump(out,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
  return out;
}
const compose=(name,extra={})=>generatePreset(BASE,{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:name.slice(0,31),...extra}).syx;
// What the preset actually holds in Scene 1 for the measured block (decoded, not assumed).
function describe(syx,block,fields){
  const body=Buffer.from(inspectStructure(syx).raw.body),r=scanRecords(body,{requireAmpCab:false}).records.find(x=>x.family===block);if(!r)return null;
  const ch=body.readUInt16LE(r.header+10);
  return Object.fromEntries(fields.map(n=>{const p=findParam(block,n);return [n,String(decodeValue(p,body.readUInt16LE(r.start+2*(ch*r.words+p.param)))).trim()];}));
}
const FIELDS={drive:['FUZZ_TYPE'],reverb:['REVERB_TYPE','REVERB_QUALITY'],delay:['DELAY_MODEL'],compressor:['COMP_TYPE'],chorus:['CHORUS_TYPE'],
  flanger:['FLANGER_TYPE'],phaser:['PHASER_TYPE'],wah:['WAH_TYPE'],tremolo:['TREMOLO_TYPE'],pitch:['PITCH_TYPE'],filter:['FILTER_TYPE']};
const items=[];
const add=(id,family,syx,meta)=>items.push({id,family,syx,meta});
const CAL=process.argv.includes('--calibration');
const {composeSound}=await imp('scripts/fm3-sound.mjs');
// Calibration states = the user's subtractive readings (2026-10-23), rebuilt from the P6 test specs.
function calibration(){
  const A=JSON.parse(read('examples/FM3_P6_INSERT_A.spec.json')),B=JSON.parse(read('examples/FM3_P6_INSERT_B.spec.json'));
  const strip=(spec,drop,name)=>{const s=JSON.parse(JSON.stringify(spec));delete s.purpose;s.composer.name=name;
    const keep=b=>!drop.includes(b)&&!(drop.includes('volume')&&b==='volpan');
    if(s.insert){s.volumePan=s.insert.includes('volume')&&!drop.includes('volume')?true:undefined;s.insert=s.insert.filter(b=>b!=='volume'&&keep(b));if(!s.insert.length)delete s.insert;}
    if(s.volumePan===undefined)delete s.volumePan;
    if(drop.includes('compressor'))delete s.composer.compressorChannels;
    for(const r of ['row2','row3'])s.layout[r]=s.layout[r].map(b=>b==='volume'?'volpan':b).filter(keep);
    s.controls=(s.controls??[]).map(c=>c.block==='volume'?{...c,block:'volpan'}:c).filter(c=>keep(c.block));if(!s.controls.length)delete s.controls;
    if(!Object.keys(s.composer).some(k=>k.endsWith('Channels')))s.composer.compressorChannels=undefined;
    return patch(composeSound(BASE,s).syx);
  };
  const seqA=[['A0',[],82.5],['A1',['plex'],72.0],['A2',['plex','multiband'],61.0],['A3',['plex','multiband','looper'],57.7],['A4',['plex','multiband','looper','gate'],54.0],['A5',['plex','multiband','looper','gate','volume'],52.8]];
  const seqB=[['B1',['synth'],78.3],['B2',['synth','formant'],76.4],['B3',['synth','formant','ringmod'],73.8],['B4',['synth','formant','ringmod','resonator'],66.2],['B5',['synth','formant','ringmod','resonator','tentap'],62.0],['B6',['synth','formant','ringmod','resonator','tentap','megatap'],52.9]];
  for(const [id,drop,v] of seqA)add('cal-'+id,'calibration',strip(A,drop,'CPU CAL '+id),{expectPercent:v,removed:drop});
  for(const [id,drop,v] of seqB)add('cal-'+id,'calibration',strip(B,drop,'CPU CAL '+id),{expectPercent:v,removed:drop});
}
if(CAL)calibration();

// Calibration: base (user measured 44.6 % in Scene 1) and P6 test A (82.5 %).
if(!CAL)add('cal-newlook','calibration',patch(compose('CPU CAL NEWLOOK',{compressorChannels:[{channel:'A',type:'Optical Compressor'}]})),{expectPercent:52.8,note:'NewLook + Optical Compressor = A5'});
if(!CAL)add('cal-p6a','calibration',patch(read('examples/FM3_P6_INSERT_A.syx')),{expectPercent:82.5});
const lib=composerLibraries();
const families=CAL?[]:(process.argv.find(a=>a.startsWith('--families='))?.slice(11).split(','))??Object.keys(FIELDS);
for(const fam of Object.keys(FIELDS).filter(f=>families.includes(f)))
  for(const m of lib[fam].models){
    let syx;try{syx=patch(compose(`CPU ${fam} ${m.name}`,{[fam+'Channels']:[{channel:'A',type:m.name}]}));}
    catch(e){items.push({id:`${fam}:${m.name}`,family:fam,skipped:e.message});continue;}
    add(`${fam}:${m.name}`,fam,syx,{type:m.name,decoded:describe(syx,fam,FIELDS[fam])});
  }
// Reverb quality: three algorithms × four qualities.
if(families.includes('reverb'))for(const t of ['Room: Large Room','Plate: Medium Plate','Hall: Large Hall'])for(const q of ['ECONOMY','NORMAL','HIGH','ULTRA-HIGH']){
  const syx=patch(compose(`CPU rev ${t} ${q}`,{reverbChannels:[{channel:'A',type:t}]}),{writes:[{block:'reverb',param:'REVERB_QUALITY',value:q}]});
  add(`reverb-quality:${t}:${q}`,'reverb-quality',syx,{type:t,quality:q,decoded:describe(syx,'reverb',FIELDS.reverb)});
}
// Anchors for families without a measured cost: Rotary, PEQ, GEQ, Enhancer, Synth.
if(!CAL&&(families.includes('anchors')||!process.argv.some(a=>a.startsWith('--families=')))){
  const ex=n=>JSON.parse(read('examples/'+n)).composer??JSON.parse(read('examples/'+n));
  add('anchor:rotary','rotary',patch(compose('CPU rotary',{rotaryA:ex('FM3_ROTARY_A_TEST.spec.json').rotaryA})),{});
  add('anchor:peq','peq',patch(compose('CPU peq',{peqChannels:[{channel:'A'}]})),{});
  add('anchor:geq','geq',patch(compose('CPU geq',{geqChannels:ex('FM3_ENHANCER_ABCD_TEST.spec.json').geqChannels.slice(0,1)})),{});
  add('anchor:enhancer','enhancer',patch(compose('CPU enhancer',{enhancerChannels:ex('FM3_ENHANCER_ABCD_TEST.spec.json').enhancerChannels.slice(0,1)})),{});
  add('anchor:synth','synth',patch(insertBlocks(compose('CPU synth',{compressorChannels:[{channel:'A',type:'Optical Compressor'}]}),['synth']).syx),{note:'NewLook + compressor + Synth; subtract cal-newlook'});
}
const out=process.argv[2];assert.ok(out,'Usage: cpu-sweep-build.mjs OUT_DIR');fs.mkdirSync(path.join(out,'presets'),{recursive:true});
const manifest={schemaVersion:1,builder:'cpu-sweep-build 0.1.0',calibrationOnly:CAL,confirmName:items[0]&&inspectStructure(items[0].syx).decoded.preset_name,baseSha256:sha(BASE),reference:'cal-newlook',scene:1,header:'7f0000400',
  note:'Measured cost of an item = CPU(item) - CPU(base without that block). Base for drive/reverb/delay items = NewLook base with its own type (user-measured costs: drive Full OD 7.9, reverb Large Room/Economy 13.2, delay 1.2).',
  items:items.map((it,i)=>{if(it.skipped)return {id:it.id,family:it.family,skipped:it.skipped};const f=`presets/${String(i).padStart(3,'0')}.syx`;fs.writeFileSync(path.join(out,f),it.syx);return {id:it.id,family:it.family,file:f,sha256:sha(it.syx),...it.meta};})};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({items:manifest.items.filter(i=>i.file).length,skipped:manifest.items.filter(i=>i.skipped).map(i=>i.id)}));

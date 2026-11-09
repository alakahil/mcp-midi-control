// Receipt for the 2026-11-09 T42 test: new modifier targets, a forbidden-target control and preset tempo.
// A SC1 -> Delay Mix, B LFO 1A -> Filter Freq, C External 1 -> Amp Gain (cache flag 0x0080 clear, H1);
// D SC1 -> Delay Low Cut (flag 0x0080 set, H2: not a modifier target); E/F preset tempo 97/143 BPM (H3).
// Offline. The pack is rebuilt (tools/fm3/t42-modifier-targets-build.mjs); every session file must name the rebuilt
// manifest SHA-256. Each preset was loaded to the edit buffer (7F 00), the user checked and listened, STOREd it on the
// FM3 himself (location 427), selected another preset, came back and checked again; FM3_BIND_STORE.py --verify then
// read the location (fn=0x03, read only). Scripts never stored or set.
// Usage: node tools/fm3/t42-modifier-targets-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compareStoredPreset} from './controllers-store-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-09/t42/');
const OUT=path.join(ENG,'references/fm3-t42-modifier-targets-20261109.json');
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const {parsePresetDump}=await import(path.join(ENG,'scripts/fm3-codec.mjs'));
const {readModifiers}=await import(path.join(ENG,'scripts/fm3-parameter-dependencies.mjs'));
const {CONTROLLERS_RECORD:R}=await import(path.join(ENG,'scripts/fm3-controllers.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const yes=v=>typeof v==='string'&&['jah','j','yes','ok'].includes(v.trim().toLowerCase());
assert.ok(process.argv.slice(2).every(a=>a==='--write'),'Usage: t42-modifier-targets-ingest.mjs [--write]');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t42-ingest-'));
let receipt;
try{
 execFileSync(process.execPath,[path.join(ROOT,'tools/fm3/t42-modifier-targets-build.mjs'),tmp],{stdio:'ignore'});
 const pack=path.join(tmp,'FM3_T42_MODTGT'),root=JSON.parse(fs.readFileSync(path.join(pack,'pack.json')));
 assert.equal(root.kind,'fm3-modifier-targets-preparation');assert.equal(root.packs.length,6);
 const parts=[],files=[];
 for(const p of root.packs){
  const d=path.join(pack,p.dir),sd=path.join(RAW,p.dir),mb=fs.readFileSync(path.join(d,'manifest.json')),m=JSON.parse(mb);
  const lf=path.join(sd,'bind-store-load.json'),rf=path.join(sd,'bind-store-results.json');
  const load=JSON.parse(fs.readFileSync(lf)),r=JSON.parse(fs.readFileSync(rf));
  for(const f of [lf,rf])files.push({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
  assert.equal(load.kind,'fm3-bind-store-load');assert.equal(load.userConfirmedName,true,p.dir+' name confirmed at load');
  assert.equal(r.kind,'fm3-bind-store-results');assert.equal(r.packSha256,sha(mb),p.dir+' result names rebuilt manifest');assert.equal(load.packSha256,sha(mb));
  assert.equal(r.shownLocation,427);assert.equal(r.index,426);
  const dump=Buffer.concat(r.storedDumpFrames.map(h=>Buffer.from(h,'hex')).filter(f=>[0x77,0x78,0x79].includes(f[5])));
  assert.deepEqual(r.frameKinds,[0x77,...Array(8).fill(0x78),0x79],'complete stored dump');
  assert.deepEqual([...parsePresetDump(dump,0,17).headerPayload].slice(0,2),[426>>7,426&127],'dump is location 427');
  const expected=fs.readFileSync(path.join(d,m.preset.file)),g=Buffer.from(inspectStructure(expected).raw.body),s=Buffer.from(inspectStructure(dump).raw.body);
  assert.equal(g.length,s.length);
  const changed=[];for(let i=0;i<g.length;i+=2)if(g.readUInt16LE(i)!==s.readUInt16LE(i))changed.push({byte:i,generated:g.readUInt16LE(i),stored:s.readUInt16LE(i)});
  const mods=readModifiers(s).filter(x=>x.active).map(x=>({source:x.sourceName.trim(),effectId:x.effectId,pid:x.pid,min:s.readUInt16LE(x.offset+2),max:s.readUInt16LE(x.offset+4)}));
  const part={case:p.dir,hypothesis:m.hypothesis,observations:{before:r.beforeStore,after:r.afterReload,note:r.note},resultSha256:sha(fs.readFileSync(rf))};
  if(m.hypothesis==='H2'){
   // The FM3 cleared the forbidden modifier on import: Source (word 0) and target effect id (word 8) of record 0 are 0.
   const rec=1584;assert.deepEqual(changed,[{byte:rec,generated:30,stored:0},{byte:rec+16,generated:m.binding.effectId,stored:0}],'D: only Source and target eid cleared');
   assert.equal(mods.length,0,'D: no active modifier stored');
   for(const o of [r.beforeStore,r.afterReload])assert.match(o.target,/^Ei ole täppi/,'D: no modifier dot shown');
   Object.assign(part,{target:m.binding.name,flags:m.binding.flags,deviceResult:'refused: Source and target cleared on import, repeats unchanged across scenes',storedModifier:null,clearedWords:changed});
  }else{
   assert.equal(changed.length,0,p.dir+' stored body byte-identical');assert.equal(compareStoredPreset(expected,dump).bodyByteIdentical,true);
   for(const o of [r.beforeStore,r.afterReload])assert.ok(yes(o.behavior),p.dir+' behavior');
   if(m.hypothesis==='H1'){
    for(const o of [r.beforeStore,r.afterReload])assert.ok(o.target.includes(m.binding.source),p.dir+' Source shown');
    assert.deepEqual(mods,[{source:m.binding.source,effectId:m.binding.effectId,pid:m.binding.pid,min:m.binding.min.word,max:m.binding.max.word}]);
    Object.assign(part,{target:m.binding.name,label:m.binding.label,flags:m.binding.flags,source:m.binding.source,min:m.binding.min,max:m.binding.max,deviceResult:'accepted: Source, Min/Max and behavior shown before STORE and after reload'});
   }else{
    assert.equal(m.hypothesis,'H3');const bpm=+r.beforeStore.tempo;assert.equal(+r.afterReload.tempo,bpm);
    for(let ch=0;ch<4;ch++){assert.equal(s.readUInt16LE(R.start+2*(ch*R.words+32)),bpm);assert.equal(s.readUInt16LE(R.start+2*(ch*R.words+33)),0);}
    Object.assign(part,{tempoBpm:bpm,storedWord:bpm,tempoToUse:'PRESET',deviceResult:'tempo shown on FM3 before STORE and after reload; stored word equals BPM'});
   }
  }
  parts.push(part);
 }
 const onDisk=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const q=path.join(d,e.name);if(e.isDirectory())walk(q);else onDisk.push(path.relative(ROOT,q));}};walk(RAW);
 assert.deepEqual(onDisk.sort(),files.map(f=>f.path).sort(),'raw folder holds exactly the receipt inputs');
 receipt={schemaVersion:1,kind:'fm3-t42-modifier-targets',date:'2026-11-09',device:'FM3 Mk II Turbo, FW13',
  method:'Edit-buffer load (7F 00), user check and listening, user STORE to location 427, another preset selected and back, read-only stored dump (fn=0x03). Scripts never stored or set.',
  builder:'tools/fm3/t42-modifier-targets-build.mjs',
  findings:{
   modifierTargets:'Delay Mix, Filter Freq and Amp Gain accepted as new modifier targets (cache flag 0x0080 clear); stored bodies byte-identical.',
   forbiddenTarget:'Delay Low Cut (flag 0x0080 set) refused: the FM3 cleared Source and target effect id on import; Min/Max/pid words left as sent.',
   flagRule:'Supported, not proven per parameter: flag 0x0080 clear on 20 accepted targets (17 earlier + 3 here), set on the 1 refused target.',
   presetTempo:'CONTROLLERS_TEMPO stored word = BPM (97, 143), shown on the FM3 and kept after STORE; Tempo To Use 0 = PRESET.'},
  scope:'Only the tested targets, ranges, channel ALL and default curve; other targets rely on the flag rule.',
  parts,files,resultsSha256:sha(Buffer.from(JSON.stringify(files)))};
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
const text=JSON.stringify(receipt,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(OUT,text);
else assert.equal(fs.readFileSync(OUT,'utf8'),text,'T42 receipt stale; run with --write and review');
console.log(JSON.stringify({passed:true,parts:receipt.parts.length,accepted:3,refused:1,tempo:2,deviceIO:false}));

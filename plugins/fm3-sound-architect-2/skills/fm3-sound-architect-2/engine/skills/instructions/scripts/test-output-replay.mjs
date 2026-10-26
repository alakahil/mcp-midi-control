// Whole-bundle contract tests. Derived reports are not trusted as truth.
// Existing scalar/template tests supply independent byte oracles; replay adds
// request/base binding and protects every report/text field without device I/O.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {resolveReplayBase} from './fm3-preset-core.mjs';
import {sha256} from './fm3-output.mjs';
import {composerBases} from './fm3-composer-bases.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch,decodeGen3PresetDump} from './fm3-codec.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const meta={schemaVersion:1,firmware:13};
const composer={...meta,baseProfile:'jb-composer',name:'POINT2 REPLAY',ampChannels:[{channel:'A',model:'Jazz 120'}]};
const sound={composer,context:{guitar:'Ibanez AS-120',pickups:'humbucker',output:'OUT1 stereo FOH'},purpose:'Ühine lõppseis — ilma seadmeta',layout:{row2:['drive','amp','cab'],row3:['delay','reverb']}};
const newlook=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const cases=[
 ['unified','references/Baaspreset.syx',{...meta,name:'POINT2 ORIGINAL',gainB:5}],
 ['jb-ydom-rhythm','examples/JB_YDOM_RHYTHM.syx',{...meta,baseProfile:'jb-ydom-rhythm',name:'JB YDOM RHYTHM',scene6Name:'JB SOLO',phaserScene6Bypass:true}],
 ['jb-drive-c','examples/JB_YDOM_RHYTHM.syx',{...meta,baseProfile:'jb-drive-c',type:'Zen Master',channel:'C',drive:2,tone:7,level:2,mix:25}],
 ['jb-rotary-controls','references/rotary-batch-20261007-151451/baseline.syx',{...meta,baseProfile:'jb-rotary-controls',rotaryA:{rateHz:5}}],
 ...[
 ['drive','examples/JB_YDOM_RHYTHM.syx','Zen Master'],
 ['delay','examples/FM3_DRIVE_ABCD_TEST_export.syx','Digital Stereo'],
 ['reverb','examples/FM3_DELAY_ABCD_TEST_export.syx','Chamber: Deep Chamber'],
 ['compressor','examples/FM3_REVERB_ABCD_TEST_export.syx','Optical Compressor'],
 ['chorus','references/chorus-batch-20261007-134057/capture-001/donor.syx','4-Voice Analog'],
 ['flanger','examples/FM3_PHASER_ABCD_TEST_export.syx',"80's Rack Flanger"],
 ['phaser','examples/FM3_COMPRESSOR_ABCD_TEST_export.syx','Script 90'],
 ['wah','references/wah-batch-20261007-140115/capture-001/donor.syx','Clyde'],
 ['tremolo','references/tremolo-batch-20261007-143642/capture-001/donor.syx','Bias Trem'],
 ['pitch','references/pitch-batch-20261007-153634/capture-20261007T153125-b17a97eec7/donor.syx','Advanced Whammy']
 ].map(([family,file,type])=>['jb-'+family+'-multi',file,{...meta,baseProfile:'jb-'+family+'-multi',[family+'Channels']:'ABCD'.split('').map(channel=>({channel,type}))}]),
 ...composerBases.map(b=>[b.id,b.file,{...composer,modifiers:{external1Wah:false}}]),
 ['layout','examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',sound],
 ['grid','examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',{composer,remove:['send','return'],grid:{rows:[Array(12).fill(''),['in1','drive','amp','cab','delay','reverb','-','-','-','-','-','out1'],Array(12).fill(''),Array(12).fill('')]}}]
];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3 punkt2 % # õ '));
let bundles=0,rejections=0,transport=0,filesystem=0;
const extensions=['.syx','.txt','.spec.json','.validation.json'];
const tested=[];
function putReport(stem,report){fs.writeFileSync(stem+'.validation.json',JSON.stringify(report,null,2)+'\n');}
function refresh(stem){
 const r=JSON.parse(fs.readFileSync(stem+'.validation.json'));
 for(const ext of extensions.slice(0,3)){const b=fs.readFileSync(stem+ext);r.artifacts[ext]={sha256:sha256(b),bytes:b.length};}
 r.outputSha256=r.artifacts['.syx'].sha256;putReport(stem,r);
}
function rejectMutation(label,good,spec,mutate,error){
 const stem=path.join(dir,'mutation-'+rejections),r={...good,syx:Buffer.from(good.syx),report:structuredClone(good.report),spec:structuredClone(spec)};
 mutate(r);r.report.outputSha256=sha256(r.syx);if('bytes' in r.report)r.report.bytes=r.syx.length;
 writePresetOutputs(stem,r,r.spec);assert.throws(()=>verifyPresetOutputs(stem),error,label);rejections++;
}
try{
 for(const [label,file,spec] of cases){
  const base=read(file),original=Buffer.from(base),request=JSON.stringify(spec),result=createPreset(base,spec),again=createPreset(base,spec);
  assert.doesNotMatch(result.txt,/\bundefined\b|\bNaN\b/,label+' readable guide');
  if(spec.baseProfile==='jb-composer'){assert.match(result.txt,/Salvestatud väärtused nimetatud kanalites/);assert.doesNotMatch(result.txt,/4\. Ekspordi terve preset/);}
  if(spec.baseProfile==='jb-composer')assert.equal((result.txt.match(/in1 [ABCD]: seaded alusfailist;/g)??[]).length,8,'Input scenes have an explicit retained-state label');
  assert.deepEqual(result.syx,again.syx,label+' deterministic SYX');assert.equal(result.txt,again.txt);assert.deepEqual(result.report,again.report);
  assert.deepEqual(base,original);assert.equal(JSON.stringify(spec),request);
  assert.deepEqual(resolveReplayBase(result.report.baseSha256),base);
  const stem=path.join(dir,label);writePresetOutputs(stem,result,spec);verifyPresetOutputs(stem);bundles++;tested.push(label);
  for(const [kind,mutate] of [
   ['TXT',r=>{r.txt+='Unproven statement\n';}],
   ['report claim',r=>{r.report.hardware='fully confirmed by device';}],
   ['unknown request',r=>{r.spec.unrecognisedField=true;}]
  ])rejectMutation(label+' '+kind,result,spec,mutate);
 }
 const good=createPreset(newlook,sound),legacy=createPreset(newlook,composer);
 for(const [label,mutate] of [
  ['wrong composer model',r=>{r.spec.composer.ampChannels[0].model='Deluxe Verb Normal';}],
  ['wrong composer channel',r=>{r.spec.composer.ampChannels[0].channel='D';}],
  ['wrong scene request',r=>{r.spec.selectedScene=8;}],
  ['wrong name',r=>{r.spec.composer.name='OTHER NAME';}],
  ['wrong layout order',r=>{r.spec.layout.row2=['amp','drive','cab'];}],
  ['omitted template',r=>{delete r.spec.composer.ampChannels;r.spec.composer.modifiers={external1Wah:false};}],
  ['invented check',r=>{r.report.checks.deviceImport=true;}],
  ['false check',r=>{r.report.checks.finalStateDecoded=false;}],
  ['missing checks',r=>{delete r.report.checks;}],
  ['unknown claim',r=>{r.report.signature='trusted';}],
  ['wrong byte count',r=>{r.report.bytes=1;}],
  ['missing audio',r=>{delete r.report.audio;}],
  ['forged stage',r=>{r.report.stages.composer.outputSha256='0'.repeat(64);}],
  ['wrong version',r=>{r.report.generator='fm3-sound-0.0.0';}],
  ['missing base',r=>{delete r.report.baseSha256;}],
  ['unknown base',r=>{r.report.baseSha256='0'.repeat(64);}],
  ['different known base',r=>{r.report.baseSha256=composerBases[0].sha256;}],
  ['lost limitations',r=>{r.report.stages.composer.limitations=[];}]
 ]){
  // Byte-count must be left forged instead of the usual mutation helper refresh.
  if(label==='wrong byte count'){
   const stem=path.join(dir,'wrong-size');writePresetOutputs(stem,good,sound);const rep=JSON.parse(fs.readFileSync(stem+'.validation.json'));rep.bytes=1;putReport(stem,rep);assert.throws(()=>verifyPresetOutputs(stem),/Replay report field differs: bytes/);rejections++;
  }else rejectMutation(label,good,sound,mutate);
 }
 rejectMutation('legacy changed request',legacy,composer,r=>{r.spec.name='OTHER REQUEST';},/Replay SYX/);
 // Valid CRC cannot hide an unrequested word even when report/text are regenerated
 // from the altered output. Use a legacy path without type-specific sub-verifiers.
 const rawSpec={...meta,name:'POINT2 RAW',gainB:5},raw=createPreset(read('references/Baaspreset.syx'),rawSpec);
 for(const offset of [0,4,264,1586,4656,5808+46,9518+46]){
  rejectMutation('valid CRC changed byte '+offset,raw,rawSpec,r=>{
   const parsed=inspectStructure(r.syx),body=Buffer.from(parsed.raw.body);body[offset]^=1;
   r.syx=Buffer.from(reencodeDumpFromRawPatch(r.syx,reencodeRawPatch(parsed.raw.rawPatch,body)));
   assert.equal(decodeGen3PresetDump(r.syx,17).crc_valid,true);
  },/Replay SYX/);
 }
 // Missing/truncated/corrupt/malformed files; every case gets fresh hashes.
 for(const ext of extensions){
  for(const kind of ['missing','truncated','invalid']){
   const stem=path.join(dir,'transport-'+transport);writePresetOutputs(stem,raw,rawSpec);
   if(kind==='missing')fs.unlinkSync(stem+ext);
   else if(kind==='truncated')fs.writeFileSync(stem+ext,fs.readFileSync(stem+ext).subarray(0,10));
   else {const b=fs.readFileSync(stem+ext);b[0]=0xff;fs.writeFileSync(stem+ext,b);}
   if(ext!=='.validation.json'&&kind!=='missing')refresh(stem);
   assert.throws(()=>verifyPresetOutputs(stem),undefined,ext+' '+kind);transport++;
  }
 }
 for(const mutate of [r=>r.artifacts['.other']={},r=>r.artifacts['.txt'].url='https://example.invalid',r=>r.artifacts['.txt'].bytes++,r=>delete r.artifacts['.syx']]){
  const stem=path.join(dir,'manifest-'+transport);writePresetOutputs(stem,raw,rawSpec);const r=JSON.parse(fs.readFileSync(stem+'.validation.json'));mutate(r);putReport(stem,r);assert.throws(()=>verifyPresetOutputs(stem));transport++;
 }
 // UTF-8 with legitimate replacement characters must not accept malformed bytes.
 const unicodeSpec={...sound,purpose:'Mõõdetud märk: \uFFFD'},unicode=createPreset(newlook,unicodeSpec),utfStem=path.join(dir,'utf8');writePresetOutputs(utfStem,unicode,unicodeSpec);
 const utf=fs.readFileSync(utfStem+'.txt'),at=utf.indexOf(Buffer.from('\uFFFD'));assert.ok(at>0);
 fs.writeFileSync(utfStem+'.txt',Buffer.concat([utf.subarray(0,at),Buffer.from([0xff]),utf.subarray(at+3)]));refresh(utfStem);assert.throws(()=>verifyPresetOutputs(utfStem),/encoded data|encoding/i);transport++;
 // JSON formatting/key order is not a content change; TXT bytes are canonical.
 const formatStem=path.join(dir,'format');writePresetOutputs(formatStem,good,sound);
 fs.writeFileSync(formatStem+'.spec.json',JSON.stringify(Object.fromEntries(Object.entries(sound).reverse())));refresh(formatStem);verifyPresetOutputs(formatStem);bundles++;
 // Every bundle file is read once, then all checks use the same snapshot.
 const realRead=fs.readFileSync,counts=new Map();
 try{fs.readFileSync=function(file,...args){const key=String(file);if(extensions.some(e=>key===formatStem+e))counts.set(key,(counts.get(key)??0)+1);return realRead.call(this,file,...args);};verifyPresetOutputs(formatStem);}
 finally{fs.readFileSync=realRead;}
 assert.deepEqual([...counts.values()],[1,1,1,1]);
 // Each collision is refused before changing any existing output.
 for(const ext of extensions){const stem=path.join(dir,'collision-'+filesystem);fs.writeFileSync(stem+ext,'KEEP');assert.throws(()=>writePresetOutputs(stem,good,sound),/already exists/);for(const e of extensions)assert.equal(fs.existsSync(stem+e),e===ext);assert.equal(fs.readFileSync(stem+ext,'utf8'),'KEEP');filesystem++;}
 // Inject each staging and publication failure; no completed marker or our files remain.
 for(const op of ['writeFileSync','linkSync'])for(let failAt=1;failAt<=4;failAt++){
  const original=fs[op],stem=path.join(dir,'io-failure-'+filesystem);let n=0;
  try{fs[op]=function(...args){if(++n===failAt)throw Error('INJECTED '+op);return original.apply(this,args);};assert.throws(()=>writePresetOutputs(stem,good,sound),/INJECTED/);}
  finally{fs[op]=original;}
  for(const ext of extensions)assert.equal(fs.existsSync(stem+ext),false);assert.equal(fs.readdirSync(dir).some(n=>n.startsWith('.fm3-output-')),false);filesystem++;
 }
 // Concurrent collision at final publication keeps the other writer's file.
 {const original=fs.linkSync,stem=path.join(dir,'race');let n=0;
  try{fs.linkSync=function(src,dst){if(++n===4)fs.writeFileSync(dst,'OTHER WRITER');return original.call(this,src,dst);};assert.throws(()=>writePresetOutputs(stem,good,sound),/EEXIST/);}
  finally{fs.linkSync=original;}
  assert.equal(fs.readFileSync(stem+'.validation.json','utf8'),'OTHER WRITER');for(const ext of extensions.slice(0,3))assert.equal(fs.existsSync(stem+ext),false);filesystem++;
 }
 // A replaced destination (file or symlink) is not ours to remove on rollback.
 for(const kind of ['file','symlink']){
  const original=fs.linkSync,stem=path.join(dir,'replacement-'+kind);let n=0;
  try{fs.linkSync=function(src,dst){if(++n===4){fs.unlinkSync(stem+'.syx');if(kind==='file')fs.writeFileSync(stem+'.syx','REPLACEMENT');else fs.symlinkSync(path.join(path.dirname(src),'preset.syx'),stem+'.syx');throw Error('REPLACED');}return original.call(this,src,dst);};assert.throws(()=>writePresetOutputs(stem,good,sound),/REPLACED/);}
  finally{fs.linkSync=original;}
  assert.ok(fs.lstatSync(stem+'.syx'));if(kind==='file')assert.equal(fs.readFileSync(stem+'.syx','utf8'),'REPLACEMENT');else assert.ok(fs.lstatSync(stem+'.syx').isSymbolicLink());
  for(const ext of extensions.slice(1))assert.equal(fs.existsSync(stem+ext),false);filesystem++;
 }
 // Base candidates are inventory-bound, contained in the package and rehashed.
 for(const hash of [null,'../base.syx','0'.repeat(64),'A'.repeat(64)])assert.throws(()=>resolveReplayBase(hash));
 {const original=fs.readFileSync,hash=good.report.baseSha256;
  try{fs.readFileSync=function(file,...args){const bytes=original.call(this,file,...args);if(String(file).endsWith('JB_RHYTHM_LEVEL_MINUS3_NewLook.syx')){const b=Buffer.from(bytes);b[0]^=1;return b;}return bytes;};assert.throws(()=>resolveReplayBase(hash),/pinned SHA/);}
  finally{fs.readFileSync=original;}
 }
 // The public CLI performs the same legacy replay; verification is read-only.
 const cli=fileURLToPath(new URL('./fm3-preset.mjs',import.meta.url)),input=path.join(dir,'request.json'),cliStem=path.join(dir,'cli');
 fs.writeFileSync(input,JSON.stringify(rawSpec));
 execFileSync(process.execPath,[cli,fileURLToPath(new URL('../references/Baaspreset.syx',import.meta.url)),input,cliStem]);
 const before=extensions.map(e=>sha256(fs.readFileSync(cliStem+e)));execFileSync(process.execPath,[cli,'--verify',cliStem]);assert.deepEqual(extensions.map(e=>sha256(fs.readFileSync(cliStem+e))),before);bundles++;
 fs.appendFileSync(cliStem+'.txt','FORGED');refresh(cliStem);assert.notEqual(spawnSync(process.execPath,[cli,'--verify',cliStem]).status,0);rejections++;
 console.log(JSON.stringify({passed:true,bundles,workflows:tested,rehashedSemanticRejections:rejections,transportRejections:transport,filesystemFailureCases:filesystem,readsEachArtifactOnce:true,legacyInputTextVerified:true,newHardwareMeasurements:0,scope:'Deterministic software consistency; no independent DSP, device, audio or CPU proof'}));
}finally{fs.rmSync(dir,{recursive:true,force:true});}

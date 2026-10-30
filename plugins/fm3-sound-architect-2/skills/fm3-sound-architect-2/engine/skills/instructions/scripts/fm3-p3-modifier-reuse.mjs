// Replay one historical fixed research fixture; NOT a public modifier allocator.
// Its original 0.3.38 metadata is immutable. Source quartets are independently
// regenerated and verified with this 0.3.39 engine before the exact SYX replay.
// Build/verify/compare local files only; no MIDI, device access, import or STORE.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const E='../';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset,writePresetOutputs,verifyPresetOutputs}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {readModifiers}=await imp('scripts/fm3-parameter-dependencies.mjs');
const {removeBinding}=await imp('scripts/fm3-modifier-removal.mjs');
const {isControlSwitchRecord}=await imp('scripts/fm3-control-switches.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const {reencodeRawPatch,reencodeDumpFromRawPatch}=await imp('scripts/fm3-codec.mjs');
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const NAME='FM3 P3 REMOVE REUSE',STEM='FM3_P3_REMOVE_REUSE';
const VERSION='fm3-p3-modifier-reuse-research-1';
const SOURCE='7040fb17983ce5dfc5343421488c3fa052fa1026';
const offset=r=>1584+96*r;
export const words=(b,r)=>Array.from({length:25},(_,i)=>b.readUInt16LE(offset(r)+2*i));
export const decode=syx=>{const p=inspectStructure(syx);assert.equal(p.raw.crcValid,true,'CRC');return {p,body:Buffer.from(p.raw.body)};};
const json=o=>JSON.stringify(o,null,2)+'\n';
const seedSpec=()=>({composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:NAME,
 wahChannels:[{channel:'A',type:'FAS Wah'}],modifiers:{external1Wah:true},
 scenes:Array.from({length:8},(_,i)=>({scene:i+1,name:i===1?'CUT ON':'CUT OFF',blocks:{
  amp:{channel:'A',bypass:false},cab:{channel:'A',bypass:false},wah:{channel:'A',bypass:true},
  drive:{channel:'A',bypass:true},delay:{channel:'A',bypass:true},reverb:{channel:'A',bypass:true}}}))},
 volumePan:true,volumePedal:{min:2.5,max:7.5,curve:{midPercent:25,attackMs:500}},
 layout:{row2:['wah','drive','amp','cab'],row3:['volpan','delay','reverb']},selectedScene:1,
 controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST',invert:true,channel:'D'},
  {switch:3,block:'amp',param:'DISTORT_BRIGHT',invert:true},
  {switch:4,block:'amp',param:'DISTORT_FAT',channel:'D'}],
 controlSwitchScenes:[2,3,4].flatMap(s=>Array.from({length:8},(_,i)=>({switch:s,scene:i+1,state:s===2&&i===1?'ON':'OFF'})))});
let cached;
export function context(){
 if(cached)return cached;
 const base=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
 assert.equal(sha(base),'afacded0a3c3a30cfbf48b4e3daa08c0639482f0f1973e429763150ff7e9372c','base drift');
 const seed=seedSpec(),donor=structuredClone(seed);delete donor.volumePedal;
 donor.controlSwitches[0]={switch:2,block:'amp',param:'DISTORT_CUT'};
 const a=createPreset(base,seed),b=createPreset(base,donor);
 assert.equal(a.report.generator,'fm3-sound-0.3.39');assert.equal(b.report.generator,a.report.generator);
 // Both ordinary source quartets must pass the unchanged public verifier first.
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-p3-source-'));
 try{for(const [n,result,spec] of [['seed',a,seed],['donor',b,donor]]){
  const stem=path.join(tmp,n);writePresetOutputs(stem,result,spec);verifyPresetOutputs(stem);
 }}finally{fs.rmSync(tmp,{recursive:true,force:true});}
 const before=decode(a.syx).body,replacement=words(decode(b.syx).body,1);
 assert.deepEqual(readModifiers(before).filter(m=>m.active).map(m=>m.record),[0,1,2,3,4]);
 assert.ok(isControlSwitchRecord(replacement));
 const volume=readModifiers(before)[1],boost=readModifiers(before)[2];
 assert.deepEqual([volume.source,volume.effectId,volume.pid],[14,102,0]);
 assert.deepEqual([boost.source,boost.effectId,boost.pid],[51,58,42]);
 const removed=removeBinding(removeBinding(before,2).body,1).body;
 cached={seedSpec:seed,donorSpec:donor,seedSyx:Buffer.from(a.syx),donorSyx:Buffer.from(b.syx),before,removed,replacement};
 return cached;
}
// Fixed preimage + complete template allowlist: no Source-zero => free heuristic.
// Record 1 must be exactly the result of this fixture's two removals. Words 21..24
// and the 46-byte record header are preserved. Active/secondary/unknown/tail drift fails.
export function reuseFixtureRecord(body,replacement){
 const c=context();assert.ok(Buffer.isBuffer(body),'body must be a Buffer');
 readModifiers(body);assert.deepEqual(body,c.removed,'fixed removed-body preimage required');
 assert.deepEqual(replacement,c.replacement,'exact generated CS2 -> Cut template required');
 const mods=readModifiers(body),m=mods[1];
 assert.ok(!m.active&&!m.uncertain&&m.source===0&&m.secondarySource===0&&m.operation===0&&m.effectId===0&&m.pid===0);
 assert.ok(!mods.some(x=>x.active&&x.effectId===replacement[8]&&x.pid===replacement[9]),'duplicate target');
 assert.deepEqual(words(body,1).slice(21),replacement.slice(21),'reserved tail');
 const out=Buffer.from(body);replacement.slice(0,21).forEach((w,i)=>out.writeUInt16LE(w,offset(1)+2*i));
 for(let i=0;i<body.length;i++)if(body[i]!==out[i])assert.ok(i>=offset(1)&&i<offset(1)+42,'write escaped record');
 return out;
}
export function candidate(){
 const c=context(),body=reuseFixtureRecord(c.removed,c.replacement),original=decode(c.seedSyx);
 const syx=Buffer.from(reencodeDumpFromRawPatch(c.seedSyx,reencodeRawPatch(original.p.raw.rawPatch,body)));
 const final=decode(syx);assert.deepEqual(final.body,body);assert.equal(final.p.decoded.preset_name,NAME);
 assert.deepEqual(final.p.parsed.headerPayload,original.p.parsed.headerPayload,'dump header');
 const diffs=[];
 for(let i=0;i<body.length;i++)if(body[i]!==c.before[i]){
  const removed=[0,8,9].some(w=>i===offset(2)+2*w||i===offset(2)+2*w+1);
  assert.ok(removed||(i>=offset(1)&&i<offset(1)+42),'change outside declared words');
  diffs.push({offset:i,before:c.before[i],after:body[i]});
 }
 const inventory=readModifiers(body).filter(m=>m.active).map(m=>({record:m.record,source:m.sourceName,effectId:m.effectId,pid:m.pid,channel:m.channelScope}));
 assert.deepEqual(inventory.map(m=>m.record),[0,1,3,4]);
 const spec={schema:VERSION,engineVersion:'0.3.38',engineSourceCommit:SOURCE,seedSpec:c.seedSpec,donorSpec:c.donorSpec,
  operations:[{operation:'remove',record:2,target:'amp.DISTORT_BOOST',clearWords:[0,8,9]},
   {operation:'remove',record:1,target:'volpan.VOLUME_GAIN',clearWords:[0,8,9]},
   {operation:'reuse',record:1,donorRecord:1,target:'amp.DISTORT_CUT',source:'Control Switch 2',writeWords:[0,20],preserveWords:[21,24]}]};
 const txt=`${NAME} — P3 katseline eemaldamine ja taaskasutus\n\nAinult selle faili uuringukandidaat; avalik generaator 0.3.38 ei paku eemaldamise/taaskasutuse API-t.\n\nLÕPPFAILI SEOSED\nWah / Control: External 1 (kirje 0, muutmata).\nVolume/Pan / Volume: NONE (senine kirje 1 asendatud).\nAmp / Input Boost: NONE (kirje 2: sõnad 0/8/9 nullitud, ülejäänud säilinud).\nAmp / Cut: Control Switch 2; Min OFF, Max ON; Channel ALL (taaskasutatud kirje 1).\nAmp / Bright: Control Switch 3; Min ON, Max OFF; Channel ALL (kirje 3, muutmata).\nAmp / Fat: Control Switch 4; Min OFF, Max ON; Channel D (kirje 4, muutmata).\n\nStseen 1 CUT OFF: CS2 OFF. Stseen 2 CUT ON: CS2 ON. Amp kanal A mõlemas.\nCS3 ja CS4 on kõigis stseenides OFF. Jalglülitite määranguid ei lisata.\n\nKONTROLLIPIIR\nAlg- ja doonorpresetid läbisid muutmata 0.3.38 nelja faili kontrolli.\nLõppfail kasutab eraldi uuringuverifikaatorit: node tools/fm3/p3-modifier-reuse.mjs verify VÄLJUNDI_TÜVI\nLõppfaili ei nimetata tavalise fm3-preset.mjs --verify läbinud presetiks.\nImport, STORE/reload, taaskasutatud kirje säilimine ja Cut-lülitumine on veel seadmel kinnitamata.\nSee katse ei tõenda FM3-Editi automaatset vaba kirje valikut ega suvaliste presetite muutmist.\n`;
 const files={'.syx':syx,'.txt':Buffer.from(txt),'.spec.json':Buffer.from(json(spec))};
 const report={schema:VERSION,status:'offline_passed_hardware_pending',deviceIO:false,hardwareVerified:false,
  engineVersion:'0.3.38',engineSourceCommit:SOURCE,seedSha256:sha(c.seedSyx),donorSha256:sha(c.donorSyx),outputSha256:sha(syx),
  sourceQuartetsVerified:true,finalVerifier:'tools/fm3/p3-modifier-reuse.mjs verify',bodyBytes:body.length,
  removal:{record:2,before:words(c.before,2),after:words(body,2),clearedWords:[0,8,9],compacted:false},
  reuse:{record:1,before:words(c.before,1),cleared:words(c.removed,1),after:words(body,1),onlyWords0through20Written:true,headerAndWords21through24Preserved:true},
  activeModifiers:inventory,changedBytes:diffs,
  evidence:{T12:'references/fm3-mod-steps-20261029.json',inactiveCorpus:'references/fm3-modifier-removal-20261028.json',
   limits:['T12 removed a Volume binding whose PID was already zero; nonzero PID removal is covered here only offline until export',
    'No general allocator, arbitrary-base support, new source/target family, audio or CPU claim']},
  artifacts:Object.fromEntries(Object.entries(files).map(([ext,b])=>[ext,{sha256:sha(b),bytes:b.length}]))};
 files['.validation.json']=Buffer.from(json(report));return {files,syx,body,report};
}
export function writeCandidate(stem){
 const {files,report,syx}=candidate();
 writePresetOutputs(stem,{syx,txt:files['.txt'].toString('utf8'),report},JSON.parse(files['.spec.json']));
 return verifyCandidate(stem);
}
export function verifyCandidate(stem){
 const expected=candidate();
 for(const [ext,bytes] of Object.entries(expected.files))assert.deepEqual(fs.readFileSync(stem+ext),bytes,'replay mismatch: '+ext);
 return {passed:true,outputSha256:expected.report.outputSha256,deviceIO:false,hardwareVerified:false};
}
// A comparison reports evidence only. No returned result claims the human STORE
// or UI checks happened. Device block ordering may differ; all record bytes,
// modifier holes, scene words and unknown bytes must still match exactly.
export function compareExport(syx){
 const expected=candidate(),actual=decode(syx);assert.equal(actual.p.decoded.preset_name,NAME,'preset name');
 const a=expected.body,b=actual.body;assert.equal(b.length,a.length,'body length');
 const ar=scanRecords(a),br=scanRecords(b);assert.equal(ar.records.length,br.records.length,'block count');
 assert.equal(new Set(br.records.map(r=>r.eid)).size,br.records.length,'duplicate block');
 assert.deepEqual(b.subarray(0,br.records[0].header),a.subarray(0,ar.records[0].header),'prefix / modifiers / scene');
 assert.deepEqual(b.subarray(br.tail),a.subarray(ar.tail),'system tail');
 const reordered=[];
 for(const [i,r] of ar.records.entries()){
  const j=br.records.findIndex(x=>x.eid===r.eid);assert.ok(j>=0,'missing block '+r.eid);const s=br.records[j];
  assert.equal(s.size,r.size,'block size');
  assert.deepEqual(b.subarray(s.header,s.header+s.size),a.subarray(r.header,r.header+r.size),'block bytes '+r.eid);
  if(i!==j)reordered.push({effectId:r.eid,generatedIndex:i,exportIndex:j});
 }
 return {passed:true,comparisonOnly:true,deviceIO:false,exportSha256:sha(syx),bodyByteIdentical:b.equals(a),
  allRecordBytesPreserved:true,modifierRegionIdentical:true,reorderedBlocks:reordered,humanChecks:'must be supplied separately'};
}
export function runCLI(args){
 const [mode,file,...extra]=args;assert.ok(file&&!extra.length,'Usage: p3-modifier-reuse.mjs build|verify STEM / compare EXPORT.syx');
 const result=mode==='build'?writeCandidate(file):mode==='verify'?verifyCandidate(file):mode==='compare'?compareExport(fs.readFileSync(file)):null;
 assert.ok(result,'unknown mode');console.log(json(result));
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))runCLI(process.argv.slice(2));

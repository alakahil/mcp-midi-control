// Turn the 2026-10-23 FM3 read probe and value check into a receipt (audit points 3/4/5/6). Offline.
// Usage: node tools/fm3/read-value-ingest.mjs [PROBE_RESULTS.json VALUE_RESULTS.json] [--write]
// Without arguments the pinned copies in references/ are checked. Both packs are rebuilt
// deterministically and must hash to the manifests the device runs used.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const REF=path.join(ENG,'references/');
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const {scanRecords}=await import(path.join(ENG,'scripts/fm3-layout.mjs'));
const {loadDictionary}=await import(path.join(ENG,'scripts/fm3-table-encoder.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const PIN={probe:path.join(REF,'fm3-read-probe-20261023-results.json'),value:path.join(REF,'fm3-value-check-20261023-results.json')};
const args=process.argv.slice(2).filter(a=>!a.startsWith('--')),write=process.argv.includes('--write');
const probe=JSON.parse(fs.readFileSync(args[0]??PIN.probe,'utf8')),value=JSON.parse(fs.readFileSync(args[1]??PIN.value,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-rv-'));
const build=(tool,dir)=>{execFileSync('node',[path.join(ROOT,'tools/fm3',tool),path.join(tmp,dir)],{stdio:'ignore'});return path.join(tmp,dir);};
const P=build('read-probe-build.mjs','probe'),V=build('value-check-build.mjs','value');
const pm=JSON.parse(fs.readFileSync(path.join(P,'manifest.json'))),vm=JSON.parse(fs.readFileSync(path.join(V,'manifest.json')));
assert.equal(sha(fs.readFileSync(path.join(P,'manifest.json'))),probe.packSha256,'probe pack rebuilt identically');
assert.equal(sha(fs.readFileSync(path.join(V,'manifest.json'))),value.packSha256,'value pack rebuilt identically');
const fr=h=>Buffer.from(h,'hex'),u16=(a,b,c)=>(a&0x7f)|(b&0x7f)<<7|(c&3)<<14;
function bulk(frames,eid){let head=null,vals=[],end=false;
  for(const f of frames.map(fr)){if(f[5]===0x74&&!head)head=[(f[6]&0x7f)|(f[7]&0x7f)<<7,(f[8]&0x7f)|(f[9]&0x7f)<<7];
    else if(f[5]===0x75&&head)for(let i=8;i+3<=f.length-2;i+=3)vals.push(u16(f[i],f[i+1],f[i+2]));else if(f[5]===0x76&&head)end=true;}
  assert.ok(head&&head[0]===eid&&end&&vals.length===head[1],'bulk reply '+eid);return vals;}
// ── read probe ──
assert.equal(probe.userConfirmedName,true);
const rep=k=>probe.replies.filter(r=>r.kind===k);
let bulkEqual=0,bulkTotal=0;
for(const r of rep('bulk')){const q=pm.requests.find(x=>x.kind==='bulk'&&x.label===r.label);const want=q.storedWords.flat(),got=bulk(r.frames,q.effectId);
  assert.equal(got.length,want.length);bulkTotal+=want.length;bulkEqual+=got.filter((v,i)=>v===want[i]).length;}
assert.equal(bulkEqual,bulkTotal,'probe bulk read equals the written words');
const dict=loadDictionary();
const display=rep('display').map(r=>{const q=pm.requests.find(x=>x.kind==='display'&&x.label===r.label);assert.equal(r.frames.length,1);
  const f=fr(r.frames[0]),payload=f.subarray(6,f.length-2),strLen=(payload[13]&0x7f)|(payload[14]&0x7f)<<7;
  const p=dict.params.find(x=>x.block===(q.effectId===119?118:q.effectId)&&x.param===q.paramId);
  return {label:q.label,effectId:q.effectId,paramId:q.paramId,storedRaw:q.raw,storedDisplay:q.expected,replyBytes:f.length,textLength:strLen,
    enumIndex0:Array.isArray(p?.enum)?p.enum[0]:null};});
const typed=display.filter(d=>d.textLength>0),knobs=display.filter(d=>d.textLength===0);
assert.ok(typed.length===6&&typed.every(d=>d.enumIndex0&&d.storedRaw!==0),'type reads: six enum params whose stored value is not index 0');
assert.ok(knobs.length===13&&knobs.every(d=>d.replyBytes===23),'knob reads carry no text');
const stored=Buffer.concat(rep('storedDump')[0].frames.map(fr)),s436=inspectStructure(stored);
const ebr=rep('editBufferDump')[0],eb=ebr.frames.map(fr),ebCount=eb.length+(ebr.framesOmitted??0);
assert.ok(eb[0][5]===0x51&&eb.at(-1)[5]===0x53&&ebCount===66&&(ebr.framesOmitted!==undefined||eb.slice(1,-1).every(f=>f[5]===0x52&&f.length===3082)),'edit-buffer dump shape');
const ebSha=ebr.allFramesSha256??sha(Buffer.concat(eb));
// type label texts are decoded only with the codec build (the --write run); CI checks shapes + hashes
let typedTexts=null;
const dist=path.join(ROOT,'packages/fractal-midi/dist/gen3/axe-fx-iii/setParam.js');
if(fs.existsSync(dist)){const C=await import(dist);typedTexts=Object.fromEntries(typed.map(d=>{const r=rep('display').find(x=>x.label===d.label);
  return [d.label,C.parseGetParameterResponse([...fr(r.frames[0])],0x11).displayString];}));
  for(const d of typed)assert.equal(typedTexts[d.label],d.enumIndex0,'type read returns the label of enum index 0: '+d.label);}
// ── value check ──
assert.equal(value.userConfirmedName,true);
const presets=value.presets.map(p=>{assert.ok(p.allMatch&&p.gridMatches&&p.blocks.every(b=>b.matches),'value check '+p.id);
  const it=vm.items.find(i=>i.id===p.id);assert.equal(p.blocks.length,it.blocks.length);
  return {id:p.id,name:it.name,proves:it.proves,blocks:p.blocks.length,values:p.blocks.reduce((n,b)=>n+b.values,0),gridCells:48,allMatch:true};});
assert.equal(presets.length,vm.items.length);
assert.ok(value.reloaded.allMatch,'reload');
const sd=Buffer.concat(value.storedDump.frames.map(fr)),s=inspectStructure(sd),got=Buffer.from(s.raw.body);
const exp=Buffer.from(fs.readFileSync(path.join(V,vm.store.presetId+'.body.hex'),'utf8').trim(),'hex');
const G=scanRecords(got),X=scanRecords(exp),recs=(b,S)=>S.records.map(x=>b.subarray(x.header,x.header+x.size).toString('hex')).sort().join();
assert.ok(s.raw.crcValid&&got.length===exp.length&&got.subarray(0,4610).equals(exp.subarray(0,4610))&&got.subarray(G.tail).equals(exp.subarray(X.tail))&&recs(got,G)===recs(exp,X),'stored 436 content');
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-23',
  method:'Edit-buffer loads (7F 00) and read-only requests only (FM3_READ_PROBE.py / FM3_VALUE_CHECK.py). The STORE to location 436 was done by the user on the front panel; the collectors never store.',
  readPaths:{
    blockBulkRead:{request:'fn=0x1F eid',result:`returns every stored word of every channel: ${bulkEqual}/${bulkTotal} equal in the probe`,usable:true},
    storedDump:{request:'fn=0x03 hi lo 00',result:`location 436 read as a normal 0x77/0x78/0x79 dump (before the test: "${s436.decoded.preset_name}", CRC valid)`,usable:true},
    editBufferDump:{request:'fn=0x43',result:'0x51 head + 64 x 0x52 (3082 B) + 0x53 tail: a 128 KB internal image, not the preset body; not decoded',usable:false,frames:ebCount,sha256:ebSha},
    displayRead:{request:'fn=0x01 sub=0x1F eid pid, value 0',result:'knob parameters: no text (23-byte reply). Type parameters: the label of the enum index carried in the value field (0), NOT the current type: 6/6 equal the dictionary index-0 label while the stored types were other entries',usable:false,
      cases:display}},
  valueCheck:{presets,totalValues:presets.reduce((n,p)=>n+p.values,0),
    store:{preset:vm.store.presetId,location:436,bodyBytes:got.length,crcValid:true,prefixIdentical:true,systemTailIdentical:true,recordsIdenticalAsSet:true,
      recordOrder:'device sorts records by effect ID on store (generator appends new records)',deviceOrder:G.records.map(r=>r.family)},
    reload:{allMatch:true,blocks:value.reloaded.blocks.length}},
  findings:['The fn=0x1F block bulk read returns the stored words exactly: 7 generated presets (all composer and point-6 families, Mixer, Multiplexer, Compressor 2/Drive 2/Delay 2, Volume/Pan with the pedal binding, Satriani V3), every word of every channel, plus the 48-cell grid, matched.',
    'A preset stored to 436 from the front panel holds the identical body (prefix, records, system tail); the device only reorders records by effect ID. After reloading 436 every value and the grid matched again.',
    'fn=0x01 sub=0x1F does not read the current type name: it labels the value in the request (0 -> enum index 0). The fractal-midi/fractal-gen3 "current type name" read and its FM9 evidence (index-0 names) need correcting.',
    'fn=0x43 returns an internal 128 KB image, not the preset body.'],
  probeResultsSha256:sha(fs.readFileSync(args[0]??PIN.probe)),valueResultsSha256:sha(fs.readFileSync(args[1]??PIN.value))};
const target=path.join(REF,'fm3-read-value-check-20261023.json'),content=JSON.stringify(out,null,1)+'\n';
if(write){
  if(args[0]){const slim={...probe,replies:probe.replies.map(r=>r.kind==='editBufferDump'?{...r,frames:[r.frames[0],r.frames.at(-1)],framesOmitted:r.frames.length-2,allFramesSha256:sha(Buffer.concat(r.frames.map(fr)))}:r)};
    fs.writeFileSync(PIN.probe,JSON.stringify(slim)+'\n');fs.copyFileSync(args[1],PIN.value);
    execFileSync('node',[fileURLToPath(import.meta.url),'--write'],{stdio:'inherit'});process.exit(0);}
  fs.writeFileSync(target,content);
}else assert.equal(fs.readFileSync(target,'utf8'),content,'read/value receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});
console.log(JSON.stringify({presets:presets.length,values:out.valueCheck.totalValues,probeBulk:`${bulkEqual}/${bulkTotal}`,store:'identical',typedTexts:!!typedTexts}));

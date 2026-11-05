// Receipt for the 2026-11-05 T29 Feedback Send/Return test (FM3_SHOT_LOAD.py --load + FM3_SHOT_READ.py; FM3-Edit
// readings taken by Claude from background screenshots after each load). Offline. The pack is rebuilt
// (tools/fm3/t29-feedback-build.mjs) and must match the manifest SHA-256 recorded by the loader and the reader.
// Nothing was stored or set; FM3-Edit was quit without saving.
//   FS0 (defaults): Send [0,0] and Return [65534,52427,32767,0,0,0] read back unchanged. FM3-Edit: the Send block
//     page says "No user editable parameters"; Return shows Return Level 100.0 %, Output Level 0.0 dB, Balance 0.0,
//     Bypass Mode Thru, not bypassed.
//   FS1: the Return words 0..2 came back as written and FM3-Edit showed 80.0 % / -3.0 dB / 20.0. The two Send words
//     (32767, 45874) came back as 0,0: the device itself clears the Feedback Send record on load.
// So Return word n = dictionary pid n with the dictionary scales (Level, Output Level, Balance), and the Feedback
// Send has nothing to write.
// Usage: node tools/fm3/t29-feedback-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-05/');
const {findParam,decodeValue}=await import(path.join(ENG,'scripts/fm3-table-encoder.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t29-'));execFileSync('node',[path.join(ROOT,'tools/fm3/t29-feedback-build.mjs'),tmp],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'FM3_T29_FDBK','manifest.json')),man=JSON.parse(mb);
fs.rmSync(tmp,{recursive:true,force:true});
const packSha256=sha(mb);

const runs={};
for(const id of ['FS0','FS1']){
  const it=man.items.find(i=>i.id===id);
  const lf=path.join(RAW,`fm3-t29-shot-load-${id}.json`),rf=path.join(RAW,`fm3-t29-shot-read-${id}-after-load.json`),l=J(lf),r=J(rf);
  assert.equal(l.kind,'fm3-shot-load');assert.equal(l.packSha256,packSha256,'pack rebuilt identically');assert.equal(l.preset,id);assert.equal(l.name,it.name);
  assert.equal(r.kind,'fm3-shot-read');assert.equal(r.packSha256,packSha256);assert.equal(r.preset,id);
  const [send,ret]=it.blocks;
  assert.deepEqual(r.blocks.map(b=>b.effectId),[182,186]);
  // Return: every word as generated.
  assert.equal(l.blocks[1].matches,true);assert.deepEqual(r.blocks[1].device,ret.expected,id+' Return re-read = generated record');
  for(const w of l.blocks[1].testWords)assert.equal(w.device,w.raw,w.param);
  // Send: the device reports 0,0 whatever was sent.
  assert.deepEqual(r.blocks[0].device,[0,0],id+' Send reads 0,0');
  assert.equal(l.allMatch,id==='FS0');assert.equal(l.blocks[0].matches,send.expected.every(v=>v===0));
  runs[id]={load:{...rel(lf),time:l.time,allMatch:l.allMatch},read:{...rel(rf),time:r.time},sendSent:send.expected,sendDevice:r.blocks[0].device,returnDevice:r.blocks[1].device};
}

// FM3-Edit 1.07.17 readings (screenshots 2026-11-05 12:03 and 12:05 UTC, preset unsaved in the edit buffer).
const SHOWN={FS0:{RETLEVEL:'100.0 %',LEVEL:'0.0 dB',PAN:'0.0',BYPASSMODE:'Thru'},FS1:{RETLEVEL:'80.0 %',LEVEL:'-3.0 dB',PAN:'20.0',BYPASSMODE:'Thru'}};
const readings=[];
for(const [id,shown] of Object.entries(SHOWN))for(const [short,text] of Object.entries(shown)){
  const p=findParam('FDBKRET','FDBKRET_'+short),raw=runs[id].returnDevice[p.param],d=decodeValue(p,raw);
  if(p.kind==='enum')assert.equal(d.toLowerCase(),text.toLowerCase(),short);
  else{const m=/^-?\d+(?:\.(\d+))?/.exec(text);const dec=(m[1]??'').length;assert.equal(Math.abs(d)<0.5*10**-dec?(0).toFixed(dec):d.toFixed(dec),m[0],id+' '+short+' '+d);}
  readings.push({preset:id,param:p.name,pid:p.param,label:p.label,raw,decoded:p.kind==='enum'?d:Number(d.toPrecision(9)),shown:text});
}
assert.equal(readings.length,8);

const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,editor:'FM3-Edit 1.07.17',date:'2026-11-05',test:'T29',
 method:'FM3_SHOT_LOAD.py --load (Remote Control) sent FS0 and then FS1 to the edit buffer (7F 00) and read the Feedback Send (effect id 182) and Feedback Return (186) records back with fn=0x1F; FM3_SHOT_READ.py re-read them. After each load Claude opened FM3-Edit in the background, selected the Send and Return blocks and read their pages from screenshots, then quit FM3-Edit without saving. Nothing stored or set.',
 packSha256,records:{send:{effectId:182,words:2,channels:1},return:{effectId:186,words:6,channels:1}},
 runs,editorReadings:readings,
 editorSend:'FM3-Edit shows "No user editable parameters" on the Feedback Send block page (FS0 and FS1).',
 notMeasured:['audio','STORE/reload','Return Bypass Mode other than Thru','Return Bypass word','Return word 4 (unused)','values other than the FS1 points'],
 summary:{returnWordsMatched:12,returnTestWords:3,editorReadingsMatched:readings.length,sendWordsCleared:2,
  meaning:'Feedback Return word n is dictionary parameter n; Return Level, Output Level and Balance show exactly as decoded and become writable through controls (block "return", 0.3.51). The Feedback Send has no user-editable parameter and the FM3 clears its two words on load, so Send writes are refused.'}};
const target=path.join(ENG,'references','fm3-shot-t29-feedback-20261105.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T29 receipt stale');
console.log(JSON.stringify({returnWords:12,readings:readings.length,sendCleared:true}));

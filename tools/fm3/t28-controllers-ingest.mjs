// Receipt for the 2026-11-05 T28 Controllers test (FM3_SHOT_LOAD.py --load + FM3_SHOT_READ.py; FM3-Edit readings
// taken by Claude from background screenshots while Jan clicked the Controllers pages). Offline. The pack is rebuilt
// (tools/fm3/t28-controllers-build.mjs) and must match the manifest SHA-256 recorded by the loader and the reader.
// Nothing was stored or set; FM3-Edit was closed without saving.
//   CT1 load + read: all 520 words of the Controllers record (effect id 2) came back as generated (32 test words).
//   FM3-Edit: 26 channel-A readings on LFO 1+2, ADSR 1, Sequencer, Envelope/Manual and Scene Ctrl 1+2 equal the
//     decoded words at the displayed precision; the channel selector B/C/D showed Scene Ctrl 1 / Scene 1 = 11/12/13 %,
//     the markers of copies B/C/D. So word n = dictionary pid n and copy = Controllers channel.
// Usage: node tools/fm3/t28-controllers-ingest.mjs [--write]
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
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t28-'));execFileSync('node',[path.join(ROOT,'tools/fm3/t28-controllers-build.mjs'),tmp],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'FM3_T28_CTRL','manifest.json')),man=JSON.parse(mb);
fs.rmSync(tmp,{recursive:true,force:true});
const packSha256=sha(mb),WORDS=130,CH='ABCD',it=man.items.find(i=>i.id==='CT1'),blk=it.blocks[0];

const lf=path.join(RAW,'fm3-t28-shot-load-CT1.json'),rf=path.join(RAW,'fm3-t28-shot-read-CT1-after-load.json'),l=J(lf),r=J(rf);
assert.equal(l.kind,'fm3-shot-load');assert.equal(l.packSha256,packSha256,'pack rebuilt identically');assert.equal(l.preset,'CT1');assert.equal(l.name,it.name);
assert.equal(l.allMatch,true);const lb=l.blocks[0];assert.equal(lb.effectId,2);assert.equal(lb.values,WORDS*4);assert.equal(lb.matches,true);
assert.equal(lb.testWords.length,blk.writes.length);for(const w of lb.testWords)assert.equal(w.device,w.raw,w.param+' '+w.channel);
assert.equal(r.kind,'fm3-shot-read');assert.equal(r.packSha256,packSha256);assert.equal(r.preset,'CT1');
const rb=r.blocks[0];assert.equal(rb.effectId,2);assert.deepEqual(rb.device,blk.expected,'re-read = generated record');

// FM3-Edit 1.07.17 readings (screenshots 2026-11-05 10:44-10:47 UTC, preset unsaved in the edit buffer).
const SHOWN={A:{LFO1TYPE:'Square',LFO1FREQ:'2.500 Hz',LFO1DEPTH:'75.0 %',LFO1DUTY:'25.0 %',LFO2TYPE:'Triangle',LFO2FREQ:'0.800 Hz',LFO2DEPTH:'40.0 %',
  ADSR1MODE:'Loop',ADSR1ATTACK:'250.01 ms',ADSR1DECAY:'500.03 ms',ADSR1LEVEL:'60.0 %',ADSR1RELEASE:'999.93 ms',ADSR1THRESH:'-30.0 dB',
  SEQFREQ:'4.000 Hz',SEQSTAGES:'12',SEQ1:'25.0 %',SEQ2:'50.0 %',ENVATTACK:'20.00 ms',ENVRELEASE:'300.00 ms',ENVGAIN:'2.00',MANUAL1:'40.0 %',MANUAL5:'90.0 %',
  SCENE1_VAL1:'10.0 %',SCENE1_VAL2:'20.0 %',SCENE1_VAL8:'80.0 %',SCENE2_VAL1:'33.0 %'},
 B:{SCENE1_VAL1:'11.0 %'},C:{SCENE1_VAL1:'12.0 %'},D:{SCENE1_VAL1:'13.0 %'}};
const PAGE={LFO:'LFO 1 + 2',ADSR:'ADSR 1',SEQ:'Sequencer',ENV:'Envelope/Manual',MAN:'Envelope/Manual',SCE:'Scene Ctrl 1+2'};
const readings=[];
for(const [channel,shown] of Object.entries(SHOWN))for(const [short,text] of Object.entries(shown)){
  const w=blk.writes.find(x=>x.channel===channel&&x.param==='CONTROLLERS_'+short);assert.ok(w,channel+' '+short);
  const p=findParam('CONTROLLERS',w.param),d=decodeValue(p,rb.device[CH.indexOf(channel)*WORDS+w.pid]);
  if(p.kind==='enum')assert.equal(d.toLowerCase(),text.toLowerCase(),short);
  else{const m=/^-?\d+(?:\.(\d+))?/.exec(text);assert.ok(m,text);const dec=(m[1]??'').length;assert.equal(d.toFixed(dec),m[0],channel+' '+short+' '+d);}
  readings.push({channel,param:w.param,pid:w.pid,page:PAGE[short.slice(0,3)],raw:w.raw,decoded:p.kind==='enum'?d:Number(d.toPrecision(9)),shown:text});
}
assert.equal(readings.filter(x=>x.channel==='A').length,26);

const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,editor:'FM3-Edit 1.07.17',date:'2026-11-05',test:'T28',
 method:'FM3_SHOT_LOAD.py --load (Remote Control) sent CT1 to the edit buffer (7F 00) and read the Controllers record (effect id 2) back with fn=0x1F; FM3_SHOT_READ.py re-read it and saved all 520 words. Jan clicked the FM3-Edit Controllers pages and channel selector, Claude read them from background screenshots; FM3-Edit was then quit without saving. Nothing stored or set.',
 packSha256,record:{header:452,data:498,words:WORDS,channels:4,effectId:2},
 load:{...rel(lf),time:l.time},read:{...rel(rf),time:r.time},
 editorReadings:readings,
 notMeasured:['audio','STORE/reload','per-scene Controllers channel','ADSR 2, Scene Ctrl 3+4, CS per Scene and Modifiers pages','enum option lists beyond LFO Type, ADSR Mode and the defaults shown','Tempo / Tempo To Use'],
 summary:{deviceWordsMatched:WORDS*4,testWords:lb.testWords.length,editorReadingsMatched:readings.length,channelA:26,channelMarkers:'B/C/D = 11/12/13 %',
  meaning:'Word n of the Controllers record is dictionary parameter n, the four copies are Controllers channels A-D, and the taper-class scales (linear, log, integer) show exactly as decoded. Controllers parameters become writable through spec.controllers (0.3.50).'}};
const target=path.join(ENG,'references','fm3-shot-t28-controllers-20261105.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T28 receipt stale');
console.log(JSON.stringify({deviceWords:WORDS*4,readings:readings.length}));

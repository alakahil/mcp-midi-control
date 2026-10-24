// Receipts for the 2026-10-24 front-panel step-diff checks: Input 1 + Volume/Pan 1 (test 4) and Volume TYPE /
// Auto-Swell (test 5). Offline.
// Usage: node tools/fm3/step-diff-ingest.mjs [--write]
// The pack is rebuilt to the device run's hash. For every step the asked parameter changed on channel A
// and the device word equals the generator encoding of the value the user read on the FM3 screen.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const {findParam,encodeValue,decodeValue}=await import(path.join(ENG,'scripts/fm3-table-encoder.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=path.join(ENG,'references/fm3-step-diff-input-volume-20261024-results.json'),res=JSON.parse(fs.readFileSync(file,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-sd-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/step-diff-build.mjs'),'input-volume',tmp],{stdio:'ignore'});
const m=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8'));
assert.equal(sha(fs.readFileSync(path.join(tmp,'manifest.json'))),res.packSha256,'step-diff pack rebuilt identically');
assert.ok(res.baselineMatchesPack,'baseline read equals the pack preset');
// The value the user read on the FM3 screen at each step (their notes, chat 2026-10-24).
const SHOWN={'thr-40':-40,'thr-off':'OFF','thr-80':-80,'lvl+6':6,'vol0':0,'vol2.5':2.5,'vol7.5':7.5,'vlvl-10':-10,'bal':-67};
// Step 8: the user also changed Volume Taper LOG 20A -> LOG 30A while looking for Level (accidental).
const ACCIDENTAL={'vlvl-10':[{block:'volpan',channel:'A',param:2}]};
assert.equal(res.steps.length,m.steps.length);
const steps=res.steps.map((s,i)=>{const st=m.steps[i];assert.equal(s.id,st.id);
  const p=findParam(st.block,st.param),hit=s.changed.filter(c=>c.block===st.block&&c.param===p.param);
  const extra=s.changed.filter(c=>!(c.block===st.block&&c.param===p.param));
  assert.deepEqual(extra.map(({block,channel,param})=>({block,channel,param})),ACCIDENTAL[s.id]??[],'no other change at '+s.id);
  assert.ok(hit.length===1&&hit[0].channel==='A','asked parameter changed on channel A at '+s.id);
  const shown=SHOWN[s.id],value=shown==='OFF'?p.min*(p.displayMultiplier||1):shown;
  assert.equal(encodeValue(p,value),hit[0].after,'device word = generator encoding at '+s.id);
  return {id:s.id,asked:s.asked,userReading:s.userReading,param:p.name,shown,deviceWord:hit[0].after,generatorWord:encodeValue(p,value),decoded:Number(decodeValue(p,hit[0].after).toFixed(4)),
    ...(extra.length?{accidental:extra.map(c=>({param:findParam(c.block,c.param).name,before:decodeValue(findParam(c.block,c.param),c.before),after:decodeValue(findParam(c.block,c.param),c.after)}))}:{})};});
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-24',auditPoint:4,
  method:'FM3_STEP_DIFF.py: the generated preset STEP 4 IN VOL in the edit buffer only; the user set one field per step on the front panel and typed the shown value; Input 1 and Volume/Pan 1 were read with fn=0x1F after each step.',
  findings:['Every reading equals the generator encoding word for word: Input Threshold -40 / -80 dB, Input Output Level +6 dB, Volume 0.00 / 2.50 / 7.50, Volume Level -10 dB, Balance -67.',
    'Input Threshold at its minimum shows OFF and is stored as word 0 (= -100 dB in the dictionary scale). The generator now writes -100 dB as OFF.',
    'Volume (Gain) is the 0..10 display scale, linear in the stored word (0 / 16384 / 49151 for 0 / 2.5 / 7.5).'],
  steps,notMeasured:['Input Ratio / Attack / Release scales','Volume Pan L/R','values between the measured points'],resultsSha256:sha(fs.readFileSync(file))};
const target=path.join(ENG,'references/fm3-step-diff-input-volume-20261024.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'step-diff receipt stale');
// Test 5: Volume/Pan 1 TYPE and Auto-Swell controls.
const f5=path.join(ENG,'references/fm3-step-diff-volume-type-20261024-results.json'),r5=JSON.parse(fs.readFileSync(f5,'utf8'));
const t5=path.join(tmp,'t5');execFileSync('node',[path.join(ROOT,'tools/fm3/step-diff-build.mjs'),'volume-type',t5],{stdio:'ignore'});
const m5=JSON.parse(fs.readFileSync(path.join(t5,'manifest.json'),'utf8'));
assert.equal(sha(fs.readFileSync(path.join(t5,'manifest.json'))),r5.packSha256,'volume-type pack rebuilt identically');
assert.ok(r5.baselineMatchesPack,'test 5 baseline equals the pack preset');
// What the user saw (chat 2026-10-24): exact = word equals the encoding; preset = the field already showed that
// value, so no word changed and the stored word equals the encoding; near = the FM3 could not show the asked
// value exactly; the shown value is compared with the generator decoding of the stored word.
const KIND={'type-swell':['exact','AUTO-SWELL'],'sw-thr-40':['exact',-40],'sw-att100':['preset',100],'sw-rel20':['near',19.999],'sw-hys6':['preset',6],'type-volume':['exact','VOLUME']};
const enc=(p,v)=>encodeValue(p,v,{allow:['enum-labels']});
let words=r5.baseline.volpan.words;
const steps5=r5.steps.map((s,i)=>{const st=m5.steps[i];assert.equal(s.id,st.id);const p=findParam('volpan',st.param),[kind,shown]=KIND[s.id];
  const w=words[p.param];let row;
  if(kind==='preset'){assert.equal(s.changed.length,0,'nothing changed at '+s.id);assert.equal(w,enc(p,shown),'stored default = encoding at '+s.id);row={deviceWord:w,generatorWord:enc(p,shown)};}
  else{assert.ok(s.changed.length===1&&s.changed[0].param===p.param&&s.changed[0].channel==='A','one word changed at '+s.id);const dw=s.changed[0].after;
    if(kind==='exact'){assert.equal(dw,enc(p,shown),'device word = encoding at '+s.id);row={deviceWord:dw,generatorWord:enc(p,shown)};}
    else{const dec=decodeValue(p,dw),rel=Math.abs(dec-shown)/shown;assert.ok(rel<0.001,'within 0.1% at '+s.id);
      row={deviceWord:dw,deviceShown:shown,generatorDecodes:Number(dec.toFixed(4)),relativeDifference:Number(rel.toFixed(5)),generatorWordFor20ms:enc(p,20)};}}
  words=s.words.volpan;return {id:s.id,asked:s.asked,userReading:s.userReading,param:p.name,kind,shown,...row};});
assert.equal(words[findParam('volpan','VOLUME_GAIN').param],r5.baseline.volpan.words[findParam('volpan','VOLUME_GAIN').param],'Volume unchanged after the type round trip');
const out5={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-24',auditPoint:4,
  method:'FM3_STEP_DIFF.py: the generated preset STEP 5 VOL TYPE in the edit buffer only; the user switched Volume/Pan 1 TYPE and set the Auto-Swell controls on the front panel; Volume/Pan 1 read with fn=0x1F after each step.',
  findings:['TYPE VOLUME <-> AUTO-SWELL is one word (VOLUME_TYPE, 0 = VOLUME, 1 = AUTO-SWELL); switching back left Volume at 10.00: no other word changes.',
    'Auto-Swell Threshold -40 dB equals the encoding word for word; the Attack 100 ms and Hysteresis 6.00 dB defaults equal the encoding of those values.',
    'Release: the FM3 offered 19.999 ms (word 42623); the generator decodes that word as 19.989 ms and encodes 20 ms as 42631 (0.05 % apart). The log curve is close but not word-exact at this point.'],
  steps:steps5,notMeasured:['other Release / Attack points','a generated AUTO-SWELL preset on the device (the generator writes it from this evidence)'],resultsSha256:sha(fs.readFileSync(f5))};
const target5=path.join(ENG,'references/fm3-step-diff-volume-type-20261024.json'),content5=JSON.stringify(out5,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target5,content5);else assert.equal(fs.readFileSync(target5,'utf8'),content5,'test 5 receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});
console.log(JSON.stringify({test4Steps:steps.length,test5Steps:steps5.length,allEqualEncoder:true,thresholdOffWord:0,releaseRelDiff:steps5.find(s=>s.kind==='near').relativeDifference}));

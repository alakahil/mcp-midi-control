// Receipt for the 2026-10-24 device check of a generated Auto-Swell preset. Offline.
// Usage: node tools/fm3/auto-swell-verify-ingest.mjs [--write]
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
const file=path.join(ENG,'references/fm3-auto-swell-verify-20261024-results.json'),res=JSON.parse(fs.readFileSync(file,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-asv-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/auto-swell-verify-build.mjs'),tmp],{stdio:'ignore'});
assert.equal(sha(fs.readFileSync(path.join(tmp,'manifest.json'))),res.packSha256,'Auto-Swell verify pack rebuilt identically');
const m=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8'));
assert.ok(res.userConfirmedName&&res.presets.length===1&&res.presets[0].allMatch&&res.presets[0].gridMatches,'every block and the grid read back exactly');
// What the user read on the FM3 Volume page (chat 2026-10-24): Attack 249.99 ms, Release 20.000 ms, the rest exactly as generated.
const SHOWN={TYPE:'AUTO-SWELL',THRESHOLD:-40,ATTACK:249.99,RELEASE:20,HYSTERESIS:3};
const enc=(p,v)=>encodeValue(p,v,{allow:['enum-labels']});
const checks=m.items[0].controls.filter(c=>c.channel==='A').map(c=>{const p=findParam('volpan',c.param),w=enc(p,c.value),d=decodeValue(p,w),shown=SHOWN[c.param];
  if(typeof shown==='number')assert.ok(Math.abs(d-shown)<=0.01*Math.max(1,Math.abs(shown))/10+0.006,`${c.param}: generator ${d} vs FM3 ${shown}`);else assert.equal(d,shown);
  return {param:p.name,asked:c.value,word:w,generatorDecodes:typeof d==='number'?Number(d.toFixed(4)):d,fm3Shows:shown};});
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-24',
  method:'tools/fm3/auto-swell-verify-build.mjs: a generated preset (Volume/Pan 1 channel A AUTO-SWELL, channel B VOLUME 7.5) loaded to the edit buffer and read back with FM3_VALUE_CHECK.py --skip-store; the user read the Volume page.',
  readback:{blocks:res.presets[0].blocks.length,allMatch:true,gridMatches:true},channelA:checks,
  finding:'The generated AUTO-SWELL record reads back word for word and the FM3 shows the asked values (Attack 250 ms as 249.99, Release 20 ms as 20.000).',
  resultsSha256:sha(fs.readFileSync(file))};
const target=path.join(ENG,'references/fm3-auto-swell-verify-20261024.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'Auto-Swell verify receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});console.log(JSON.stringify({checks:checks.length,readback:true}));

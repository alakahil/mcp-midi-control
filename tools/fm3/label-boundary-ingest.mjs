// Receipt for the 2026-10-26 Pitch label boundary run (label-boundary-build.mjs + FM3_LABEL_SWEEP.py, test T3).
// Offline. Closes the two "notRequested" words of the 2026-10-24 label sweep (fm3-label-sweep-20261024.json):
// PITCH_TRACKMODE word 2 and PITCH_TEMPO word 78. Every word is compared with the dictionary by STORED WORD
// (word w = enum[w - enumBase]); word 0 is the device-only OFF / NONE seen in the sweep.
// Usage: node tools/fm3/label-boundary-ingest.mjs [--write]
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
const {findParam,dictionaryHash}=await import(path.join(ENG,'scripts/fm3-table-encoder.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex'),trim=s=>String(s).replace(/\s+$/,'');
const file=path.join(REF,'fm3-label-boundary-20261026-results.json'),res=JSON.parse(fs.readFileSync(file,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-lbi-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/label-boundary-build.mjs'),tmp],{stdio:'ignore'});
const m=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8'));
assert.equal(sha(fs.readFileSync(path.join(tmp,'manifest.json'))),res.packSha256,'pack rebuilt identically');
assert.equal(m.dictionarySha256,dictionaryHash,'same dictionary');
assert.ok(res.userConfirmedName&&res.pilot.unchanged&&res.pilot.parsed[3]===m.pilot.label&&res.finalUnchanged&&res.baselineMatchesPack.grid&&res.baselineMatchesPack.blocks&&!res.stoppedAt,'safety reads: preset unchanged');
assert.ok(res.families.every(f=>f.unchanged&&!f.skipped),'every block re-read unchanged');
const pf=res.families.find(f=>f.slug==='pitch'),mp=m.families.find(f=>f.slug==='pitch');
const params=mp.params.map(p=>{const got=pf.params.find(x=>x.paramId===p.paramId),d=findParam('pitch',p.name);
  assert.ok(got&&got.texts.length===p.count&&got.noReply.length===0,p.name+': every index answered');
  const words=got.texts.map((t,w)=>({word:w,deviceText:t,dictionary:w>=d.enumBase?d.enum[w-d.enumBase]:null}));
  assert.equal(words[0].dictionary,null);
  const cmp=words.slice(1);assert.ok(cmp.every(x=>trim(x.deviceText)===trim(x.dictionary)),p.name+': every label equals the dictionary by stored word');
  assert.equal(words.at(-1).deviceText,p.expectLast,p.name+' last label');
  return {param:'pitch.'+p.name,paramId:p.paramId,words:p.count,deviceOnlyWord0:words[0].deviceText,compared:cmp.length,exact:cmp.filter(x=>x.deviceText===x.dictionary).length,
    lastWord:{word:p.lastWord,deviceText:words.at(-1).deviceText}};});
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-26',auditPoint:3,dictionarySha256:dictionaryHash,
  method:'Edit-buffer load (7F 00) of the label-sweep preset; integer-form fn=0x01 sub=0x1F label requests for Pitch TRACKMODE 0..2 and TEMPO 0..78 only (inside the FW13 lists, 20 ms pacing), grid and every block re-read before and after. No store, no SET.',
  params,closes:'fm3-label-sweep-20261024.json notRequested: pitch.PITCH_TRACKMODE word 2 and pitch.PITCH_TEMPO word 78',
  finding:'Both last labels equal the dictionary (CHORDS, 63/64); all 80 dictionary words of both lists now match the device by stored word; word 0 is the device-only OFF / NONE. The preset was unchanged and the FM3 stayed responsive.',
  resultsSha256:sha(fs.readFileSync(file))};
const target=path.join(REF,'fm3-label-boundary-20261026.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'label boundary receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});console.log(JSON.stringify(params.map(p=>[p.param,p.compared,p.lastWord.deviceText])));

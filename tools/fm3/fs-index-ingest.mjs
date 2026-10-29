// Receipt for the 2026-10-29 footswitch override position check (FM3_BIND_STORE.py --load / --record, test T15).
// Offline. The pack is rebuilt (tools/fm3/fs-index-build.mjs). The user loaded the preset into the edit buffer and
// read FC PER-PRESET -> Overrides on the front panel; layouts 3 and 9 are in his note file (the --record answers for
// them were pasted into other fields). Nothing was stored.
// Usage: node tools/fm3/fs-index-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-10-29/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const f={res:path.join(RAW,'fm3-fs-index-20261029-results.json'),load:path.join(RAW,'fm3-fs-index-20261029-load.json'),notes:path.join(RAW,'fm3-fs-index-20261029-notes.rtf')};
const res=JSON.parse(fs.readFileSync(f.res,'utf8')),load=JSON.parse(fs.readFileSync(f.load,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t15-'));execFileSync('node',[path.join(ROOT,'tools/fm3/fs-index-build.mjs'),tmp],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'manifest.json')),m=JSON.parse(mb);fs.rmSync(tmp,{recursive:true,force:true});
for(const r of [res,load])assert.equal(sha(mb),r.packSha256,'pack rebuilt identically');assert.ok(load.userConfirmedName);
// Note file: "LAYOUT n" headings followed by "row: default - PP#k..." lines.
const rtf=fs.readFileSync(f.notes,'latin1');
const text=rtf.replace(/\{\\(?:fonttbl|colortbl|\*\\expandedcolortbl)[^}]*\}/g,'').replace(/\\[a-z]+-?\d* ?/gi,'').replace(/[{}]/g,'').replace(/\\\n/g,'\n');
const seen={};let layout=null;
for(const line of text.split('\n').map(s=>s.trim()).filter(Boolean)){let x;
  if((x=/^LAYOUT\s+(\d)$/.exec(line))){layout=+x[1];continue;}
  if((x=/^(\d+):.*?PP#(\d)/.exec(line)))seen[`${layout}/${x[1]}`]=+x[2];}
// Pack: override word w -> PP#(k+1) for WORDS[k]; position of word w = layout floor(w/12)+1, switch w%12+1.
const expected=Object.fromEntries(m.overrideWords.map((w,k)=>[`${Math.floor(w/12)+1}/${w%12+1}`,k+1]));
assert.deepEqual(Object.keys(seen).sort(),Object.keys(expected).sort(),'PP# seen exactly at the eight expected positions');
const mismatch=Object.keys(expected).filter(p=>seen[p]!==expected[p]);
assert.deepEqual(mismatch,['1/12'],'one reading differs: Layout 1 switch 12');assert.equal(seen['1/12'],6);
assert.match(res.readings.otherLayouts,/^9 LAYOUTI/);
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-29',test:'T15',
  preset:{name:m.confirmName,sha256:m.preset.sha256,experiment:m.experiment},
  method:'Edit-buffer load (7F 00) only; the user read FC PER-PRESET -> Overrides on the front panel; nothing stored or set.',
  readings:{fromNotes:seen,layouts:9,recordAnswers:res.readings},
  decoded:{overrideWord:'12 x (layout - 1) + (switch - 1); 9 layouts x 12 switches = the 108 override words',
    positionsSeen:Object.fromEntries(Object.entries(expected).map(([p,k])=>[p,{word:m.overrideWords[k-1],ppExpected:k,ppRead:seen[p]}])),
    layout1Switch12:'read as PP#6 where the pack put PP#5 (PP#6 was on Layout 2 switch 1, the next row read); T16 confirmed word 11 = Layout 1 switch 12 from a FM3-stored override, so this was a misreading'},
  definitionsNote:'PP#2..PP#8 showed "Unassigned" and PP#1 "Momentary": the pack wrote their parameter words at +144 + 2k (the T14 single-definition guess), which T16 corrected to +144 + 12k (six parameter words per definition); the definition count word was also left at 1',
  resultsSha256:sha(fs.readFileSync(f.res)),loadSha256:sha(fs.readFileSync(f.load)),notesSha256:sha(fs.readFileSync(f.notes))};
const target=path.join(ENG,'references/fm3-fs-index-20261029.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'fs index receipt stale');
console.log(JSON.stringify({positions:Object.keys(seen).length,misread:mismatch}));

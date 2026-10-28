// Receipt for the 2026-10-28 Volume pedal Min/Max check (test T10). Offline.
// The pack is rebuilt (tools/fm3/volume-range-build.mjs) to the manifest the run used: volumePedal
// {min:2.5, max:7.5}, words 1/2 = 16384 / 49151. The user read Source 1 / Min / Max on the FM3 Modify page and
// the Volume knob in FM3-Edit at heel, middle and toe. Edit buffer only; nothing stored.
// Usage: node tools/fm3/volume-range-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-10-28/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=path.join(RAW,'fm3-volume-range-20261028-results.json'),loadFile=path.join(RAW,'fm3-volume-range-20261028-load.json');
const res=JSON.parse(fs.readFileSync(file,'utf8')),load=JSON.parse(fs.readFileSync(loadFile,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-vr-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/volume-range-build.mjs'),tmp],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'manifest.json')),m=JSON.parse(mb);
for(const r of [res,load])assert.equal(sha(mb),r.packSha256,'pack rebuilt identically');
assert.ok(load.userConfirmedName,'edit-buffer load confirmed');
const num=s=>{const v=Number(String(s).trim().replace(',','.'));assert.ok(Number.isFinite(v),'reading '+s);return v;};
const r=res.readings;
assert.equal(r.source.trim(),'15 External 1');
const reading={min:num(r.min),max:num(r.max),heel:num(r.heel),mid:num(r.mid),toe:num(r.toe)};
assert.equal(reading.min,m.binding.min.display);assert.equal(reading.max,m.binding.max.display);
assert.equal(reading.heel,m.binding.min.display,'heel = Min');assert.equal(reading.toe,m.binding.max.display,'toe = Max');
assert.ok(reading.mid>reading.heel&&reading.mid<reading.toe,'middle between');
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-28',
  preset:{name:m.confirmName,generator:'0.3.31 volumePedal {min:2.5, max:7.5}',sha256:m.preset.sha256,words:{min:m.binding.min.word,max:m.binding.max.word}},
  pedal:'Valeton expression pedal on External 1 (global setting unchanged)',
  method:m.method,
  readings:{source1:r.source.trim(),modifyPage:{min:reading.min,max:reading.max},fm3EditVolumeKnob:{heel:reading.heel,aboutMiddle:reading.mid,toe:reading.toe},
    units:'Volume (0..10); the middle pedal position is approximate'},
  findings:['The Modify page shows Min 2.50 and Max 7.50 for words 16384 / 49151: numeric Volume Min/Max encode with the VOLUME_GAIN codec as decoded in T7/T7b.',
    'The Volume knob follows the pedal from 2.50 (heel) to 7.50 (toe), about 4.90 in the middle.'],
  notMeasured:['STORE/reload of a ranged binding (the record format is the one T9 stored)','audio','the curve between the end points'],
  resultsSha256:sha(fs.readFileSync(file)),loadSha256:sha(fs.readFileSync(loadFile))};
const target=path.join(ENG,'references/fm3-volume-range-20261028.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'volume range receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});console.log(JSON.stringify(reading));

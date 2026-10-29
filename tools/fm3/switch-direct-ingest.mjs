// Receipt for the 2026-10-29 switching check (test T13, variant B_RING). Offline. EXPERIMENT: the generated
// Control Switch records with word 0 set to 13 = PEDAL 2 (SW RING), so the Ampero switch already plugged into
// PEDAL 2 drives them without changing a global FM3 setting. The script loaded the preset into the edit buffer
// (7F 00); the user pressed the Ampero B (ring) switch briefly, selected scenes on the front panel and wrote the
// Amp readings into a note (fm3-switch-direct-20261029-notes.rtf), which this tool parses. Nothing was stored.
// The readings are compared with the values stored in the preset's Amp channels.
// Usage: node tools/fm3/switch-direct-ingest.mjs [--write]
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
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const {scanRecords}=await import(path.join(ENG,'scripts/fm3-layout.mjs'));
const {readModifiers}=await import(path.join(ENG,'scripts/fm3-parameter-dependencies.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const loadFile=path.join(RAW,'fm3-switch-direct-20261029-load.json'),notesFile=path.join(RAW,'fm3-switch-direct-20261029-notes.rtf');
const load=JSON.parse(fs.readFileSync(loadFile,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t13-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/switch-direct-build.mjs'),tmp],{stdio:'ignore'});
const dir=path.join(tmp,'B_RING'),mb=fs.readFileSync(path.join(dir,'manifest.json')),m=JSON.parse(mb);
assert.equal(sha(mb),load.packSha256,'B_RING pack rebuilt identically');assert.ok(load.userConfirmedName,'edit-buffer load confirmed');
// Notes: RTF from TextEdit; strip the control words and keep the text lines.
const rtf=fs.readFileSync(notesFile,'latin1');
const text=rtf.replace(/\\'93|\\'94/g,'"').replace(/\{\\(?:fonttbl|colortbl|\*\\expandedcolortbl)[^}]*\}/g,'').replace(/\\[a-z]+-?\d* ?/gi,'').replace(/[{}]/g,'').replace(/\\\n/g,'\n');
const lines=text.split('\n').map(s=>s.trim()).filter(Boolean);
const readings={};let scene=null,phase=null;
for(const l of lines){let x;
  if((x=/^SCENE (\d)$/.exec(l))){scene='scene'+x[1];readings[scene]={};continue;}
  if(/^Enne$/i.test(l)){phase='before';continue;}if(/^1x$/i.test(l)){phase='press1';continue;}if(/^2\.?x$/i.test(l)){phase='press2';continue;}
  if((x=/^(INPUT BOOST|BRIGHT|FAT) - (ON|OFF)$/.exec(l))){(readings[scene][phase]??={})[{'INPUT BOOST':'boost','BRIGHT':'bright','FAT':'fat'}[x[1]]]=x[2];continue;}
  if((x=/^(\d+ PEDAL 2 \(SW RING\)), igal pool oli "Momentary"$/.exec(l))){readings.source1=x[1];readings.behaviour='momentary';continue;}
  assert.fail('unparsed note line: '+l);}
const s1={boost:'ON',bright:'OFF',fat:'OFF'},s2={boost:'ON',bright:'OFF',fat:'ON'};
assert.deepEqual(readings,{scene1:{before:s1,press1:s1,press2:s1},scene2:{before:s2,press1:s2,press2:s2},source1:'14 PEDAL 2 (SW RING)',behaviour:'momentary'});
// What the preset stores: Amp channel values (A for scene 1, D for scene 2) and the three records.
const body=Buffer.from(inspectStructure(fs.readFileSync(path.join(dir,m.preset.file))).raw.body);
const amp=scanRecords(body).records.find(r=>r.family==='amp'),PID={boost:42,bright:41,fat:80};
const stored=ch=>Object.fromEntries(Object.entries(PID).map(([k,p])=>[k,body.readUInt16LE(amp.start+ch*amp.words*2+p*2)?'ON':'OFF']));
const storedA=stored(0),storedD=stored(3);
assert.deepEqual(storedA,{boost:'OFF',bright:'OFF',fat:'OFF'});assert.deepEqual(storedD,{boost:'OFF',bright:'ON',fat:'ON'});
const recs=readModifiers(body).filter(x=>x.active);
assert.deepEqual(recs.map(x=>[x.record,x.source,x.pid,x.channelScope]),[[1,13,42,'ALL'],[2,13,41,'ALL'],[3,13,80,'CHAN D']]);
assert.deepEqual(recs.map(x=>[body.readUInt16LE(1584+96*x.record+2),body.readUInt16LE(1584+96*x.record+4)]),[[0,65534],[65534,0],[0,65534]],'Min/Max: Boost normal, Bright inverted, Fat normal');
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-29',test:'T13',variant:'B_RING',
  experiment:m.experiment,preset:{name:m.confirmName,sha256:m.preset.sha256,bindings:m.bindings,scenes:m.scenes},
  method:'Edit-buffer load (7F 00) by the script; the user pressed the Ampero B switch (PEDAL 2 ring) briefly, selected scenes on the FM3 front panel and read Input Boost / Bright / Fat on the Amp page after each press. Nothing stored or set; no global setting changed. Readings typed into a TextEdit note.',
  storedAmpValues:{channelA:storedA,channelD:storedD},
  readings,
  findings:['Source 1 shows "14 PEDAL 2 (SW RING)" for word 0 = 13: the FM3 list number is the source code + 1, as for External 1 and the Control Switches.',
    'At rest the three records show their Max side: Input Boost ON in both scenes although both stored channels hold OFF; Bright OFF in scene 2 although channel D stores ON (inverted record: Max = OFF).',
    'The CHAN D record applies only on channel D: Fat stays at its stored OFF in scene 1 (channel A) and shows the record value ON in scene 2 (channel D).',
    'The PEDAL 2 ring source is momentary: the values change only while the switch is held and return after release, so the readings after one and two short presses equal the readings before.'],
  notMeasured:['values while the switch is held (only the momentary behaviour was noted)','PEDAL 2 TIP variant (A_TIP loaded, not used: the A switch is reserved)','Control Switch 1-6 sources driven by a footswitch (needs a global FC assignment)','audio'],
  implication:'The generator keeps writing Control Switch sources (latching state is a per-switch global setting); a direct PEDAL 2 source would be momentary with this switch and is not a generator feature.',
  loadSha256:sha(fs.readFileSync(loadFile)),notesSha256:sha(fs.readFileSync(notesFile))};
const target=path.join(ENG,'references/fm3-switch-direct-20261029.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'switch direct receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});console.log(JSON.stringify({variant:'B_RING',source1:readings.source1,behaviour:readings.behaviour}));

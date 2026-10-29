// Receipt for the 2026-10-29 Control Switch / per-preset switch step check (FM3_MOD_STEPS.py, test T14). Offline.
// The pack is rebuilt (tools/fm3/cs-steps-build.mjs) to the manifest the device run used. The user made one change
// per stored step on the FM3 front panel and STOREd to his test location; the script read that location after each
// STORE (fn=0x03, read only). Observation steps record footswitch presses. No global setting was changed.
// The user's note file (fm3-cs-steps-20261029-notes.rtf) corrects one terminal answer (press1, first press).
// Usage: node tools/fm3/cs-steps-ingest.mjs [--write]
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
const {readModifiers}=await import(path.join(ENG,'scripts/fm3-parameter-dependencies.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=path.join(RAW,'fm3-cs-steps-20261029-results.json'),notesFile=path.join(RAW,'fm3-cs-steps-20261029-notes.rtf');
const res=JSON.parse(fs.readFileSync(file,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t14-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/cs-steps-build.mjs'),tmp],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'manifest.json')),m=JSON.parse(mb),ref=fs.readFileSync(path.join(tmp,m.preset.file));
assert.equal(sha(mb),res.packSha256,'pack rebuilt identically');assert.ok(res.userConfirmedName);assert.equal(res.index,res.shownLocation-1,'Display Offset 1');
assert.deepEqual(res.steps.map(s=>s.id),m.steps.map(s=>s.id));
const step=id=>res.steps.find(s=>s.id===id);
// Notes (TextEdit RTF): Scene 1 before / after 1st / after 2nd press, as Input Boost / Bright / Fat.
const rtf=fs.readFileSync(notesFile,'latin1').replace(/\\'e4/g,'ä').replace(/\\'fc/g,'ü');
const text=rtf.replace(/\{\\(?:fonttbl|colortbl|\*\\expandedcolortbl)[^}]*\}/g,'').replace(/\\[a-z]+-?\d* ?/gi,'').replace(/[{}]/g,'').replace(/\\\n/g,'\n');
const blocks=[...text.matchAll(/INPUT BOOST - (ON|OFF)\s*\nBRIGHT - (ON|OFF)\s*\nFAT - (ON|OFF)/g)].map(x=>x.slice(1,4).join(' '));
assert.deepEqual(blocks,['OFF ON OFF','ON ON OFF','OFF ON OFF'],'note file: Scene 1 before / press 1 / press 2');
assert.match(step('press1').shown,/Esimene vajutus - ON\/OFF\/OFF/,'terminal answer the user corrected');
const bodyOf=id=>{const s=inspectStructure(Buffer.concat(step(id).storedDumpFrames.map(h=>Buffer.from(h,'hex'))));assert.ok(s.raw.crcValid,'CRC '+id);assert.equal(s.decoded.preset_name,m.confirmName);return Buffer.from(s.raw.body);};
const gen=Buffer.from(inspectStructure(ref).raw.body);
const diff=(a,b)=>{assert.equal(a.length,b.length);const d=[];for(let o=0;o<a.length;o+=2)if(a.readUInt16LE(o)!==b.readUInt16LE(o))d.push([o,a.readUInt16LE(o),b.readUInt16LE(o)]);return d;};
const base=bodyOf('base'),cs=bodyOf('cs2scene1'),def=bodyOf('ppDefine'),ov=bodyOf('ppOverride');
assert.deepEqual(diff(gen,base),[],'STORE of the generated preset: body unchanged');
assert.deepEqual(diff(base,cs),[],'nothing changed in the CONTROLLERS step (no CS page there)');
// The per-preset switch region sits at a fixed distance from the end of the body (tail-relative, 3052 bytes).
const FROM_END=3052,T=gen.length-FROM_END;
assert.equal(gen.readUInt16LE(T-4),1525,'region marker 1525 four bytes before the definitions');
assert.deepEqual(diff(cs,def),[[T,0,7],[T+48,0,1],[T+144,0,1]],'definition 1: three words');
assert.deepEqual(diff(def,ov),[[T+1920,65535,0]],'override: one word');
assert.equal(readModifiers(ov).filter(x=>x.active).length,4,'bindings kept');
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-29',test:'T14',
  preset:{name:m.confirmName,sha256:m.preset.sha256,bindings:m.bindings,scenes:m.scenes,offValueWord:m.offValueWord},
  method:'Edit-buffer load (7F 00) once; the user made one front-panel change per stored step and STOREd to his test location; the script read it with fn=0x03 (read-only) after each STORE. Observation steps: no STORE, no read. No global setting changed.',
  storedLocation:{shown:res.shownLocation,index:res.index},
  readings:{offValue:step('base').shown,controllersMenu:step('csLookup').shown,fcPerPresetMenu:step('ppLookup').shown,definition:step('ppDefine').shown,override:step('ppOverride').shown,
    scene1:{before:blocks[0],press1:blocks[1],press2:blocks[2],led:'dim -> bright (active) -> dim',source:'note file; the terminal answer for press 1 ("ON/OFF/OFF") was corrected by the user to ON ON OFF'},
    scene2:step('press2').shown,scene1Reselected:step('scene1again').shown,skipped:res.steps.filter(s=>s.skipped).map(s=>({id:s.id,note:s.note}))},
  decoded:{
    offValue:'word 12 = 65534 shows 95.0% (native 5..95 % range); the T7 "5.0%" reading for the same word was a misreading',
    perPresetSwitchRegion:{position:'fixed distance from the end of the body: definitions start 3052 bytes before the end (13050-byte body: offset 9998); marker 1525 four bytes before; the same marker sits at the same distance in 384/384 tonepack presets',
      definitions:'24 definitions x 8 words, stored as 8 arrays of 24 words (array k at +48k). Definition 1 "Control Switch: Latching, Control Switch 2, Hold unassigned" = arrays 0/1/3 -> 7 / 1 / 1 (array 0 = Tap category, 7 = Control Switch). Which of arrays 1 and 3 is the function and which the Control Switch number is not yet separated (T14b).',
      overrides:'from 1920 bytes after the definitions: one word per footswitch, 65535 = none, n = definition n+1; Layout 1 switch 1 is the first word'},
    controlSwitchBehaviour:['At rest (switch off) the records show their Min side: Input Boost OFF; Bright ON (inverted record); Fat OFF in scene 2 although channel D stores Fat ON (CHAN D record at Min).',
      'Control Switch: Latching on the overridden switch toggles Control Switch 2: first press Input Boost ON and the LED lights, second press OFF and the LED dims. Bright (CS 3) and Fat (CS 4) do not move.',
      'Scene 2: OFF ON OFF at selection, ON ON OFF after one press. Re-selecting Scene 1 shows OFF ON OFF: the latched state did not carry over the scene change (CS Per Scene state of the preset, not checked yet).']},
  findings:['Per-preset switch definitions and overrides are stored in the preset (STORE changed only those words); no global setting is needed for a Control Switch footswitch.',
    'The FM3 keeps "CS Per Scene" under FC PER-PRESET (not under CONTROLLERS as on the Axe-Fx III); the three CS-per-scene steps of this pack were skipped and move to T14b.'],
  notMeasured:['CS Per Scene words','Control Switch: Momentary','Control Switch number word vs function word (arrays 1 / 3)','audio'],
  resultsSha256:sha(fs.readFileSync(file)),notesSha256:sha(fs.readFileSync(notesFile))};
const target=path.join(ENG,'references/fm3-cs-steps-20261029.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'cs steps receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});console.log(JSON.stringify({steps:res.steps.length,definitionWords:3,overrideWords:1,offValue:step('base').shown}));

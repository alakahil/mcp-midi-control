// Build the label-request probe pack (FM3_LABEL_PROBE.py, audit point 3). Offline.
// Same preset as the label sweep (LABEL SWEEP 3); a handful of value-field encodings of the
// fn=0x01 sub=0x1F request on two list parameters, each followed by a full re-read.
// Usage: node tools/fm3/label-probe-build.mjs OUT_DIR
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {floatSeptets} from './fm3-read-requests.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const E=path.join(here,'../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const {findParam}=await import(path.join(E,'scripts/fm3-table-encoder.mjs'));
const [out]=process.argv.slice(2);assert.ok(out,'Usage: label-probe-build.mjs OUT_DIR');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-lp-'));
execFileSync('node',[path.join(here,'label-sweep-build.mjs'),tmp],{stdio:'ignore'});
const sweep=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8'));
const fams=sweep.families.filter(f=>f.present).map(({params,...f})=>f);
const amp=findParam('amp','DISTORT_TYPE'),rev=findParam('reverb','REVERB_TYPE');
const words=(eid,pid)=>{const f=fams.find(x=>x.effectId===eid),n=f.expectedWords.length/4;return [0,1,2,3].map(c=>f.expectedWords[c*n+pid]);};
const int=n=>[n&0x7f,(n>>7)&0x7f,0,0,0];
const [ampA]=words(58,amp.param),[revA]=words(66,rev.param);
const V=(id,eid,pid,field,what,expect)=>({id,effectId:eid,paramId:pid,field,what,...(expect!==undefined?{dictionaryLabel:expect}:{})});
const variants=[
  V('A0',58,amp.param,[0,0,0,0,0],'amp type, value 0 (control)',amp.enum[0]),
  V('A1',58,amp.param,int(1),'amp type, integer 1',amp.enum[1]),
  V('A2',58,amp.param,int(ampA),`amp type, integer ${ampA} (stored)`,amp.enum[ampA]),
  V('A3',58,amp.param,floatSeptets(ampA),`amp type, float ${ampA} (stored)`,amp.enum[ampA]),
  V('R0',66,rev.param,[0,0,0,0,0],'reverb type, value 0 (control)',rev.enum[0]),
  V('R1',66,rev.param,int(5),'reverb type, integer 5',rev.enum[5]),
  V('R2',66,rev.param,int(revA),`reverb type, integer ${revA} (stored)`,rev.enum[revA]),
];
fs.mkdirSync(out,{recursive:true});fs.copyFileSync(path.join(tmp,'SWEEP.syx'),path.join(out,'SWEEP.syx'));
const manifest={kind:'fm3-label-probe',version:1,date:'2026-10-24',confirmName:sweep.confirmName,preset:sweep.preset,dictionarySha256:sweep.dictionarySha256,
  gridRequest:sweep.gridRequest,expectedGrid:sweep.expectedGrid,storedTypes:{amp:words(58,amp.param),reverb:words(66,rev.param)},
  knownBefore:'2026-10-24 label sweep pilot: amp type with float32(1) got a 23-byte reply without text (value field 64 02 00 00 00).',
  method:'Edit-buffer load (7F 00) only; one fn=0x01 sub=0x1F request per variant, then grid + every block re-read (stop at the first difference). No store, no SET.',
  variants,families:fams};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest)+'\n');fs.rmSync(tmp,{recursive:true,force:true});
console.log(JSON.stringify({variants:variants.map(v=>v.id+': '+v.what+(v.dictionaryLabel?' = '+v.dictionaryLabel:'')),storedTypes:manifest.storedTypes}));

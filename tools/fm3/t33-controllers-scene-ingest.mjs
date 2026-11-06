// Receipt for the 2026-11-06 T33 test (audit O3/H2): Controllers channel per scene and LFO 1A as a modifier source.
// Offline. The pack is rebuilt (tools/fm3/t33-controllers-scene-build.mjs) and must match the manifest SHA-256 the
// collector recorded. The user loaded CTS (edit buffer), listened to scenes 1..4, read FM3-Edit, STOREd to 425,
// selected another preset and came back; FM3_BIND_STORE.py --verify read 425 (fn=0x03, read only).
// Usage: node tools/fm3/t33-controllers-scene-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-06/');
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const {readModifiers}=await import(path.join(ENG,'scripts/fm3-parameter-dependencies.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t33-'));execFileSync('node',[path.join(ROOT,'tools/fm3/t33-controllers-scene-build.mjs'),tmp],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'FM3_T33_CTRL','manifest.json')),m=JSON.parse(mb),syx=fs.readFileSync(path.join(tmp,'FM3_T33_CTRL','CTS.syx'));
fs.rmSync(tmp,{recursive:true,force:true});assert.equal(sha(syx),m.preset.sha256);

const loadFile=path.join(RAW,'fm3-t33-ctrl-20261106-load.json'),resFile=path.join(RAW,'fm3-t33-ctrl-20261106-results.json');
const ld=J(loadFile),res=J(resFile);
assert.equal(ld.packSha256,sha(mb),'pack rebuilt identically');assert.equal(ld.userConfirmedName,true);
assert.equal(res.kind,'fm3-bind-store-results');assert.equal(res.packSha256,sha(mb));
assert.equal(res.shownLocation,425);assert.equal(res.index,424);assert.deepEqual(res.frameKinds,[0x77,...Array(8).fill(0x78),0x79]);
const EXPECT={tremolo:'S1 aeglane; S2 poole kiirem; S3 veel kiirem; S4 kõige kiirem',channel:'Scene1-A; 2-B;3-C;4-D',source:'LFO 1A'};
assert.deepEqual(res.beforeStore,EXPECT,'user readings before STORE');assert.deepEqual(res.afterReload,EXPECT,'user readings after reload');

const dev=Buffer.concat(res.storedDumpFrames.map(h=>Buffer.from(h,'hex')));
const A=Buffer.from(inspectStructure(syx).raw.body),B=Buffer.from(inspectStructure(dev).raw.body);
assert.equal(String(inspectStructure(dev).decoded.preset_name).trim(),m.confirmName);
assert.ok(A.equals(B),'stored body byte-identical to the generated one');
const sc=m.hypotheses.sceneChannel;sc.offsets.forEach((o,i)=>assert.equal(B.readUInt16LE(o),sc.values[i],'scene word '+(i+1)));
const s=m.hypotheses.source,rec=readModifiers(B).find(r=>r.record===s.record);
assert.equal(B.readUInt16LE(s.offset),s.to);assert.equal(rec.sourceName,'LFO 1A');assert.equal(rec.effectId,102);

const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-11-06',test:'T33',auditItem:'O3/H2',
 method:'Jan in Terminal: FM3_BIND_STORE.py --load sent CTS to the edit buffer (7F 00); he listened to scenes 1..4, read FM3-Edit (Controllers channel per scene, Volume modifier source), STOREd to 425 on the FM3, selected another preset, came back, answered again; --verify read 425 with the read-only stored dump (fn=0x03). Scripts never stored or set.',
 preset:{name:m.confirmName,sha256:m.preset.sha256,builder:'tools/fm3/t33-controllers-scene-build.mjs',changedWordOffsets:m.changedWordOffsets},
 load:rel(loadFile),results:rel(resFile),packSha256:sha(mb),location:425,readings:{beforeStore:res.beforeStore,afterReload:res.afterReload},
 storedVsGenerated:{bodyBytes:A.length,bodyByteIdentical:true},
 findings:{
  sceneChannel:{rule:'Controllers record (effect 2, body offset 452) header word 5+(scene-1), i.e. body offset 462+2*(scene-1), is the Controllers channel of that scene (0..3 = A..D), the same header layout as the grid blocks.',
   written:sc.values,shown:'Scene 1 A, 2 B, 3 C, 4 D (FM3-Edit)',audible:'LFO 1 Rate per channel 1/2/4/8 Hz heard as faster tremolo in each scene',storedAndReloaded:true},
  modifierSource:{rule:'Modifier record word 0 = FM3-Edit MOD_CTRLID list index (61 labels); anchors now External 1 = 14, Control Switch n = 49+n, LFO 1A = 1. The 25-word template is source independent.',
   record:s.record,written:s.to,shown:'LFO 1A',target:s.target,audible:'volume pulsed (LFO 1A drives Volume/Pan Volume)',storedAndReloaded:true}},
 notMeasured:['other Controllers sources (LFO 1B/2A/2B, ADSR, Sequencer, Envelope, Pitch Follower, Scene Controllers, Manual)','scenes 5..8 on channels other than A','LFO depth/shape effect on the modifier curve','targets other than Volume/Pan Volume']};
const target=path.join(ENG,'references','fm3-t33-controllers-scene-20261106.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T33 receipt stale');
console.log(JSON.stringify({sceneChannel:sc.values,source:rec.sourceName,identical:true}));

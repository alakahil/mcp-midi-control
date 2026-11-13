// Replay the 2026-11-13 L1 scene-loudness measurement of LIVE KOOSLUS V1.2 (H6) and the V1.3 listening verdict.
// No device or MIDI access. L1 recorded FM3 USB audio only (fm3IO false); V1.3 was judged by ear.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build,specV13,BASE,V13_SCENE_LEVELS} from './l1-v13-build.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const D=path.join(E,'references/l1-20261113');
const {createPreset}=await import(path.join(E,'scripts/fm3-preset.mjs'));
const {inspectStructure}=await import(path.join(E,'scripts/drive-collector/fm3-prototype.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const l1=JSON.parse(fs.readFileSync(path.join(D,'l1-loudness-results.json')));
const listen=JSON.parse(fs.readFileSync(path.join(D,'v13-listening.json')));
assert.equal(l1.kind,'fm3-l1-scene-loudness');assert.equal(l1.preset,'LIVE KOOSLUS V1.2');assert.equal(l1.fm3IO,false);
assert.deepEqual(l1.scenes.map(s=>s.scene),[1,2,3,4,5,6,7,8]);
for(const s of l1.scenes){
 assert.ok(!s.silent&&!s.clipRisk,'scene '+s.scene);
 assert.ok(Math.abs(s.correctedDeltaDb)<=1.5,'scene '+s.scene+' within 1.5 dB');
 assert.equal(Math.round((s.deltaDb-s.playingDeltaDb)*10)/10,s.correctedDeltaDb,'scene '+s.scene+' corrected = delta - playing');
}
// V1.3 levels: scene 2 takes L1's suggested trim; leads 3 and 7 +2 dB on purpose (not louder on average in L1).
assert.equal(V13_SCENE_LEVELS[1],l1.scenes[1].suggestedTrimDb);
for(const i of [2,6])assert.ok(l1.scenes[i].correctedDeltaDb<=0&&V13_SCENE_LEVELS[i]===2);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-l1-ev-'));
try{
 const {syx}=build(tmp);
 assert.equal(sha(syx),listen.fileSha256,'V1.3 builder reproduces the listened file');
 const {v12}=specV13(),v12syx=Buffer.from(createPreset(fs.readFileSync(BASE),v12).syx);
 const a=Buffer.from(inspectStructure(syx).raw.body),b=Buffer.from(inspectStructure(v12syx).raw.body);
 const diffWords=[...new Set([...a.keys()].filter(i=>a[i]!==b[i]).map(i=>i>>1))];
 assert.ok(diffWords.length>0&&diffWords.length<=3,'V1.3 differs from V1.2 only in the changed Out 1 scene levels');
 const sources={};for(const f of fs.readdirSync(D).sort())sources[f]=sha(fs.readFileSync(path.join(D,f)));
 const report={schemaVersion:1,date:'2026-11-13',generatedPresetVersion:'0.3.70',
  scope:'L1: integrated loudness (EBU R128, ffmpeg) of LIVE KOOSLUS V1.2 scenes 1-8 from the FM3 USB audio, wet 1-2 and dry 3-4, user playing the same riff; no FM3 MIDI I/O. V1.3: generator file built from tools/fm3/l1-v13-build.mjs, judged by ear by the user.',
  l1:{preset:l1.preset,seconds:l1.seconds,reference:l1.reference,method:l1.method,
   scenes:l1.scenes.map(s=>({scene:s.scene,wetLufs:s.wet.lufs,wetPeakDb:Math.round(s.wet.peakDb*10)/10,deltaDb:s.deltaDb,playingDeltaDb:s.playingDeltaDb,correctedDeltaDb:s.correctedDeltaDb,suggestedTrimDb:s.suggestedTrimDb}))},
  v13:{file:listen.file,fileSha256:listen.fileSha256,out1SceneLevelsDb:V13_SCENE_LEVELS,bodyWordsChangedVsV12:diffWords.length,userVerdict:listen.userVerdict,method:listen.method,measured:listen.measured},
  findings:'V1.2: all 8 scenes within 1.5 dB of scene 1 after removing the playing difference; no clipping. Scene 2 was loudest (+1.5 dB); lead scenes 3 and 7 were not louder on average (peaks higher). V1.3 (Out 1 S2 -1.5 dB, S3/S7 +2 dB) is balanced by the user\'s listening.',
  sources,
  limitations:['One riff, one player, 12 s per scene; loudness is integrated LUFS, not perceived lead presence.','V1.3 was not measured numerically, CPU-read or stored/reloaded.','Audio files are not committed (user playing).'],
  deviceIO:false,newHardwareMeasurements:false};
 const out=path.join(E,'references/fm3-l1-20261113.json'),text=JSON.stringify(report,null,2)+'\n';
 assert.ok(process.argv.slice(2).every(a=>a==='--write'),'Usage: l1-evidence.mjs [--write]');
 if(process.argv.includes('--write'))fs.writeFileSync(out,text);else assert.equal(fs.readFileSync(out,'utf8'),text,'L1 evidence is stale');
 console.log(JSON.stringify({passed:true,scenes:8,maxCorrectedDb:Math.max(...l1.scenes.map(s=>Math.abs(s.correctedDeltaDb))),v13Sha:listen.fileSha256.slice(0,12),deviceIO:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

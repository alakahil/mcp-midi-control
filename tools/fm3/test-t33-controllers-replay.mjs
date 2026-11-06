// Replay of the T33 device result (2026-11-06) through the public generator inputs (0.3.55).
// The T33 pack was made with a raw patch (Controllers scene words + modifier word 0). The same preset written with
// controllersScenes ['A','B','C','D'] and volumePedal {source:'LFO 1A'} must equal, byte for byte, the body the FM3
// stored at location 425 (read with fn=0x03, docs/fm3/hardware-results/2026-11-06/fm3-t33-ctrl-20261106-results.json).
// The four-file bundle must also verify. Offline. Usage: node tools/fm3/test-t33-controllers-replay.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const {createPreset,writePresetOutputs,verifyPresetOutputs}=await import(path.join(ENG,'scripts/fm3-preset.mjs'));
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const resFile=path.join(ROOT,'docs/fm3/hardware-results/2026-11-06/fm3-t33-ctrl-20261106-results.json');
const receipt=JSON.parse(fs.readFileSync(path.join(ENG,'references/fm3-t33-controllers-scene-20261106.json'),'utf8'));
assert.equal(sha(fs.readFileSync(resFile)),receipt.results.sha256,'T33 results file is the one the receipt names');
const res=JSON.parse(fs.readFileSync(resFile,'utf8'));
assert.equal(res.shownLocation,425);
const RATES={A:1,B:2,C:4,D:8};
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'T33 CTRL SCENES',
    scenes:['A','B','C','D'].map((c,i)=>({scene:i+1,name:'CTRL '+c+' '+RATES[c]+' HZ'}))},
  volumePan:true,volumePedal:{source:'LFO 1A'},layout:{row2:['drive','amp','cab'],row3:['volpan','delay','reverb']},selectedScene:1,
  controllersScenes:['A','B','C','D'],controllers:Object.entries(RATES).map(([channel,value])=>({channel,param:'LFO1FREQ',value}))};
const base=fs.readFileSync(path.join(ENG,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'));
const out=createPreset(base,spec);
const dev=Buffer.concat(res.storedDumpFrames.map(h=>Buffer.from(h,'hex')));
const A=Buffer.from(inspectStructure(Buffer.from(out.syx)).raw.body),B=Buffer.from(inspectStructure(dev).raw.body);
assert.equal(A.length,B.length);assert.ok(A.equals(B),'generator body = FM3-stored T33 body');
assert.equal(sha(Buffer.from(out.syx)),receipt.preset.sha256,'same file as the T33 measurement preset');
assert.deepEqual(out.report.controllersScenes,['A','B','C','D','A','A','A','A']);
assert.equal(out.report.volumePedal.sourceName,'LFO 1A');assert.equal(out.report.volumePedal.source,1);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t33-replay-'));
try{const stem=path.join(dir,'T33');writePresetOutputs(stem,out,spec);verifyPresetOutputs(stem);}
finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,bodyBytes:A.length,identicalToStored425:true,sha256:receipt.preset.sha256}));

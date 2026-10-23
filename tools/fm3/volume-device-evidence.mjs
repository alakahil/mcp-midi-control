// Replay the captured body receipt. Supply --capture to verify original file bytes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPreset} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-preset.mjs';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {insertVolumePan} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-volume.mjs';
import {compareInputVolume} from './compare-input-volume.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root=new URL('../../',import.meta.url),engine=new URL('plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/',root);
const receipt=JSON.parse(fs.readFileSync(new URL('references/fm3-volume-donor.json',engine)));
const spec=JSON.parse(fs.readFileSync(new URL('docs/fm3/parameter-evidence/input-volume-check.spec.json',root))),base=fs.readFileSync(new URL('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',engine));
const source=createPreset(base,spec).syx;assert.equal(sha(source),receipt.sourceSha256);
const generated=insertVolumePan(source).syx;assert.equal(sha(generated),receipt.generatedSyxSha256);assert.equal(sha(Buffer.from(inspectStructure(generated).raw.body)),receipt.captureBodySha256);
const args=process.argv.slice(2);assert.ok(args.length===0||(args.length===2&&args[0]==='--capture'),'Usage: [--capture original.syx]');
if(args.length){const captured=fs.readFileSync(args[1]);assert.equal(sha(captured),receipt.captureSha256);assert.equal(sha(Buffer.from(inspectStructure(captured).raw.body)),receipt.captureBodySha256);const comparison=compareInputVolume(source,captured);assert.equal(comparison.passed,true,JSON.stringify(comparison.errors));assert.equal(generated.equals(captured),receipt.fullSyxReconstruction);}
console.log(JSON.stringify({passed:true,capturedBodyReconstructed:true,originalCaptureRechecked:!!args.length,rawInputWordsPreserved:20,newPhysicalScaleMeasurements:0,fullSyxBytesEqual:receipt.fullSyxReconstruction,compressionBytesDiffer:receipt.compressionBytesDiffer}));

import { readFileSync, writeFileSync } from 'node:fs';

import {
  parsePresetDump,
  serializePresetDump,
} from '../../packages/fractal-gen3/dist/presetDump.js';

import {
  decodeRawPatch,
  reencodeRawPatch,
} from '../../packages/fractal-gen3/dist/presetHuffman.js';

import {
  decodeGen3Body,
  decodeGen3PresetDump,
  MODEL_FM3,
} from '../../packages/fractal-gen3/dist/presetBody.js';

import {
  reframeRawPatch,
} from '../../packages/fractal-gen3/dist/presetAuthor.js';

const INPUT =
  'samples/captured/Baaspreset.syx';

const OUTPUT =
  'samples/captured/TEST_Encoded_Sag5.syx';

const TARGET_VALUE = 5.00;

function writeU16LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
}

function knob10ToRaw(value: number): number {
  return Math.round((value / 10) * 65535);
}

const source = new Uint8Array(readFileSync(INPUT));
const parsed = parsePresetDump(source);

if (parsed.modelId !== MODEL_FM3) {
  throw new Error(
    `Expected FM3 model 0x${MODEL_FM3.toString(16)}, got 0x${parsed.modelId.toString(16)}`
  );
}

const decodedRaw = decodeRawPatch(parsed.chunkPayloads);

if (!decodedRaw.crcValid) {
  throw new Error('Source preset CRC is invalid');
}

const decodedBody = decodeGen3Body(decodedRaw.body, parsed.modelId);

const amp = decodedBody.blocks?.find((b) => b.block === 'Amp');

if (!amp) {
  throw new Error('Amp block not found');
}

if (!amp.scene_channels || amp.scene_channels.length < 2) {
  throw new Error('Scene channel data not found');
}

// Scene 2 = array index 1
const scene2Channel = amp.scene_channels[1];

const channelIndex: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

const ch = channelIndex[scene2Channel];

if (ch === undefined) {
  throw new Error(`Unexpected Scene 2 Amp channel: ${scene2Channel}`);
}

const oldSag = amp.channels?.[scene2Channel]?.sag;

const channelBase =
  amp.params_offset + ch * amp.cols * 2;

// FM3 Amp Sag = +38 bytes from channel base
const sagOffset = channelBase + 38;

const rawValue = knob10ToRaw(TARGET_VALUE);

const newBody = decodedRaw.body.slice();

writeU16LE(newBody, sagOffset, rawValue);

const newRawPatch =
  reencodeRawPatch(decodedRaw.rawPatch, newBody);

const reframed =
  reframeRawPatch(parsed, newRawPatch);

const outputSyx =
  serializePresetDump(reframed);

writeFileSync(OUTPUT, outputSyx);

// Re-decode generated file as validation
const check =
  decodeGen3PresetDump(outputSyx, MODEL_FM3);

const checkAmp =
  check.blocks?.find((b) => b.block === 'Amp');

const newSag =
  checkAmp?.channels?.[scene2Channel]?.sag;

console.log('');
console.log('FM3 Sag write test');
console.log('------------------');
console.log(`Preset: ${check.preset_name}`);
console.log(`Scene 2 Amp Channel: ${scene2Channel}`);
console.log(`Old Sag: ${oldSag}`);
console.log(`Requested Sag: ${TARGET_VALUE.toFixed(2)}`);
console.log(`Re-decoded Sag: ${newSag}`);
console.log(`CRC valid: ${check.crc_valid}`);
console.log(`Output: ${OUTPUT}`);

if (!check.crc_valid) {
  throw new Error('Generated preset CRC failed');
}

if (newSag !== TARGET_VALUE) {
  throw new Error(
    `Sag verification failed: expected ${TARGET_VALUE}, got ${newSag}`
  );
}

console.log('');
console.log('SUCCESS: generated preset re-decodes correctly.');
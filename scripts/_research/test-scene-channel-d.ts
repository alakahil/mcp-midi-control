import { readFileSync, writeFileSync } from 'node:fs';
import { parsePresetDump, serializePresetDump } from '../../packages/fractal-gen3/dist/presetDump.js';
import { decodeRawPatch, reencodeRawPatch } from '../../packages/fractal-gen3/dist/presetHuffman.js';
import { decodeGen3Body, decodeGen3PresetDump, MODEL_FM3 } from '../../packages/fractal-gen3/dist/presetBody.js';
import { reframeRawPatch } from '../../packages/fractal-gen3/dist/presetAuthor.js';

const INPUT = 'samples/captured/Baaspreset.syx';
const OUTPUT = 'samples/captured/TEST_Encoded_S2_AmpChannel_D.syx';

function writeU16LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
}

const source = new Uint8Array(readFileSync(INPUT));
const parsed = parsePresetDump(source);

if (parsed.modelId !== MODEL_FM3) {
  throw new Error('Expected FM3 preset');
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

const oldChannel = amp.scene_channels?.[1];

const newBody = decodedRaw.body.slice();

// Scene 2 channel-state = amp.offset
// A=0, B=1, C=2, D=3
writeU16LE(newBody, amp.offset, 3);

const newRawPatch = reencodeRawPatch(decodedRaw.rawPatch, newBody);
const reframed = reframeRawPatch(parsed, newRawPatch);
const outputSyx = serializePresetDump(reframed);

writeFileSync(OUTPUT, outputSyx);

const check = decodeGen3PresetDump(outputSyx, MODEL_FM3);
const checkAmp = check.blocks?.find((b) => b.block === 'Amp');
const newChannel = checkAmp?.scene_channels?.[1];

console.log('');
console.log('FM3 Scene 2 Amp channel write test');
console.log('----------------------------------');
console.log(`Old channel: ${oldChannel}`);
console.log(`Requested channel: D`);
console.log(`Re-decoded channel: ${newChannel}`);
console.log(`CRC valid: ${check.crc_valid}`);
console.log(`Output: ${OUTPUT}`);

if (!check.crc_valid) {
  throw new Error('Generated preset CRC failed');
}

if (newChannel !== 'D') {
  throw new Error(`Channel verification failed: expected D, got ${newChannel}`);
}

console.log('');
console.log('SUCCESS: generated preset re-decodes correctly.');

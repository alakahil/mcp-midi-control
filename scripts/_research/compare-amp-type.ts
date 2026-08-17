import { readFileSync } from 'node:fs';
import { parsePresetDump } from '../../packages/fractal-gen3/dist/presetDump.js';
import { decodeRawPatch } from '../../packages/fractal-gen3/dist/presetHuffman.js';
import { decodeGen3Body, MODEL_FM3 } from '../../packages/fractal-gen3/dist/presetBody.js';

const BASE = 'samples/captured/Baaspreset.syx';
const TEST = 'samples/captured/Baaspreset_S2_AmpB_USA_MKIV_Lead.syx';

function load(path: string) {
  const source = new Uint8Array(readFileSync(path));
  const parsed = parsePresetDump(source);

  if (parsed.modelId !== MODEL_FM3) {
    throw new Error(`Expected FM3 model in ${path}`);
  }

  const raw = decodeRawPatch(parsed.chunkPayloads);
  if (!raw.crcValid) {
    throw new Error(`CRC invalid in ${path}`);
  }

  const body = decodeGen3Body(raw.body, parsed.modelId);
  const amp = body.blocks?.find((b) => b.block === 'Amp');

  if (!amp) {
    throw new Error(`Amp block not found in ${path}`);
  }

  return { raw, amp };
}

const base = load(BASE);
const test = load(TEST);

console.log('');
console.log('FM3 Scene 2 Amp channel comparison');
console.log('----------------------------------');
console.log(`Base Scene 2 bypass: ${base.amp.scene_bypass?.[1]}`);
console.log(`Test Scene 2 bypass: ${test.amp.scene_bypass?.[1]}`);
console.log(`Base CRC valid: ${base.raw.crcValid}`);
console.log(`Test CRC valid: ${test.raw.crcValid}`);

const diffs: number[] = [];
const length = Math.min(base.raw.body.length, test.raw.body.length);

for (let i = 0; i < length; i++) {
  if (base.raw.body[i] !== test.raw.body[i]) {
    diffs.push(i);
  }
}

console.log(`Decoded body byte diffs: ${diffs.length}`);

for (const offset of diffs) {
  console.log(
    `0x${offset.toString(16).padStart(4, '0')}: ` +
    `${base.raw.body[offset]} -> ${test.raw.body[offset]}`
  );
}
const baseChannelB = base.amp.params_offset + 1 * base.amp.cols * 2;
const testChannelB = test.amp.params_offset + 1 * test.amp.cols * 2;

console.log('');
console.log('Amp Channel B focused check');
console.log('---------------------------');
console.log(`Base params_offset: 0x${base.amp.params_offset.toString(16)}`);
console.log(`Test params_offset: 0x${test.amp.params_offset.toString(16)}`);
console.log(`Base cols: ${base.amp.cols}`);
console.log(`Test cols: ${test.amp.cols}`);
console.log(`Base Channel B base: 0x${baseChannelB.toString(16)}`);
console.log(`Test Channel B base: 0x${testChannelB.toString(16)}`);
console.log(`Base Amp type byte: ${base.raw.body[baseChannelB]}`);
console.log(`Test Amp type byte: ${test.raw.body[testChannelB]}`);
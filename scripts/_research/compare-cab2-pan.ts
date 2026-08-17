import { readFileSync } from 'node:fs';
import { parsePresetDump } from '../../packages/fractal-gen3/dist/presetDump.js';
import { decodeRawPatch } from '../../packages/fractal-gen3/dist/presetHuffman.js';
import { decodeGen3Body, MODEL_FM3 } from '../../packages/fractal-gen3/dist/presetBody.js';

const BASE = 'samples/captured/Baaspreset.syx';
const TEST =
  'samples/captured/Baaspreset_S2_CabB_Cab2_Pan50R.syx';

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
  const cab = body.blocks?.find((b) => b.block === 'Cab');

  if (!cab) {
    throw new Error(`Cab block not found in ${path}`);
  }

  return { raw, cab };
}

const base = load(BASE);
const test = load(TEST);

console.log('');
console.log('FM3 Scene 2 Cab 1 Pan comparison');
console.log('--------------------------------');
console.log(`Base Scene 2 bypass: ${base.cab.scene_bypass?.[1]}`);
console.log(`Test Scene 2 bypass: ${test.cab.scene_bypass?.[1]}`);
console.log(`Base CRC valid: ${base.raw.crcValid}`);
console.log(`Test CRC valid: ${test.raw.crcValid}`);

console.log('');
console.log('Cab block metadata');
console.log('------------------');
console.log(`Base offset: 0x${base.cab.offset.toString(16)}`);
console.log(`Test offset: 0x${test.cab.offset.toString(16)}`);
console.log(`Base params_offset: 0x${base.cab.params_offset.toString(16)}`);
console.log(`Test params_offset: 0x${test.cab.params_offset.toString(16)}`);
console.log(`Base cols: ${base.cab.cols}`);
console.log(`Test cols: ${test.cab.cols}`);

const diffs: number[] = [];
const length = Math.min(base.raw.body.length, test.raw.body.length);

for (let i = 0; i < length; i++) {
  if (base.raw.body[i] !== test.raw.body[i]) {
    diffs.push(i);
  }
}

console.log('');
console.log(`Decoded body byte diffs: ${diffs.length}`);

for (const offset of diffs) {
  console.log(
    `0x${offset.toString(16).padStart(4, '0')}: ` +
    `${base.raw.body[offset]} -> ${test.raw.body[offset]}`
  );
}
function readU16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

const baseChannelB =
  base.cab.params_offset + 1 * base.cab.cols * 2;

const panOffset = baseChannelB + 14;

const baseRawPan = readU16LE(base.raw.body, panOffset);
const testRawPan = readU16LE(test.raw.body, panOffset);

console.log('');
console.log('Cab 1 Pan focused check');
console.log('-----------------------');
console.log(`Channel B base: 0x${baseChannelB.toString(16)}`);
console.log(`Pan offset: 0x${panOffset.toString(16)}`);
console.log(`Base raw Pan: ${baseRawPan}`);
console.log(`Test raw Pan: ${testRawPan}`);
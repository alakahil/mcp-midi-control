import { readFileSync } from 'node:fs';

import {
  parsePresetDump,
} from '../../packages/fractal-gen3/dist/presetDump.js';

import {
  decodeRawPatch,
} from '../../packages/fractal-gen3/dist/presetHuffman.js';

import {
  decodeGen3Body,
} from '../../packages/fractal-gen3/dist/presetBody.js';

const BASELINE = 'samples/captured/Baaspreset.syx';
const CHANGED = 'samples/captured/cab2-delay-0.250ms.syx';

function readU16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

function load(path: string) {
  const source = new Uint8Array(readFileSync(path));
  const parsed = parsePresetDump(source);
  const raw = decodeRawPatch(parsed.chunkPayloads);

  if (!raw.crcValid) {
    throw new Error(`CRC invalid: ${path}`);
  }

  const body = decodeGen3Body(raw.body, parsed.modelId);
  const cab = body.blocks?.find((b) => b.block === 'Cab');

  if (!cab) {
    throw new Error(`Cab block not found: ${path}`);
  }

  const scene2Channel = cab.scene_channels?.[1];
  const channelIndex: Record<string, number> = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
  };

  if (!scene2Channel || channelIndex[scene2Channel] === undefined) {
    throw new Error(`Invalid Scene 2 Cab channel: ${scene2Channel}`);
  }

  const channelBase =
    cab.params_offset +
    channelIndex[scene2Channel] * cab.cols * 2;

  return {
    raw: raw.body,
    cab,
    scene2Channel,
    channelBase,
  };
}

const a = load(BASELINE);
const b = load(CHANGED);

console.log(`Baseline Scene 2 Cab Channel: ${a.scene2Channel}`);
console.log(`Changed  Scene 2 Cab Channel: ${b.scene2Channel}`);
console.log(`Channel base A: 0x${a.channelBase.toString(16)}`);
console.log(`Channel base B: 0x${b.channelBase.toString(16)}`);
console.log('');
console.log('Changed U16 words:');

for (let rel = 0; rel < a.cab.cols * 2; rel += 2) {
  const av = readU16LE(a.raw, a.channelBase + rel);
  const bv = readU16LE(b.raw, b.channelBase + rel);

  if (av !== bv) {
    console.log(
      `+0x${rel.toString(16).padStart(2, '0')}  ` +
      `${av} -> ${bv}`
    );
  }
}

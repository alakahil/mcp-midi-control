// The inline read-only request builders equal the fractal-midi builders (when the codec is built).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as R from './fm3-read-requests.mjs';
const dist=new URL('../../packages/fractal-midi/dist/gen3/axe-fx-iii/setParam.js',import.meta.url);
if(!fs.existsSync(dist)){console.log(JSON.stringify({skipped:'fractal-midi not built'}));process.exit(0);}
const C={...await import(new URL('../../packages/fractal-midi/dist/gen3/axe-fx-iii/index.js',import.meta.url)),...await import(dist)};
const F=0x11;
assert.deepEqual(R.gridRequest(),C.buildRequestGridLayout(F));
assert.deepEqual(R.editBufferDumpRequest(),C.buildRequestEditBufferDump(F));
for(const e of [37,58,119,126,178,191,1037])assert.deepEqual(R.bulkReadPoll(e),C.buildBlockBulkReadPoll(e,F));
for(const i of [0,127,128,435,511])assert.deepEqual(R.storedDumpRequest(i),C.buildRequestPresetDump(i,F));
for(const [e,p] of [[58,6],[178,73],[37,0],[119,1]])assert.deepEqual(R.displayRequest(e,p),C.buildRequestCurrentTypeName(e,p,F));
console.log(JSON.stringify({equal:true}));

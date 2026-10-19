import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {pair,preflight} from './drive-check.mjs';
const seed=new URL('./seed/capture-001/',import.meta.url);assert.equal(pair(seed.pathname).matchedWords,176);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'drive-test-'));fs.cpSync(seed,tmp,{recursive:true});
const p=path.join(tmp,'capture.json'),r=JSON.parse(fs.readFileSync(p));r.txCalls=2;fs.writeFileSync(p,JSON.stringify(r));assert.throws(()=>pair(tmp),/one complete/);
r.txCalls=1;let raw=Buffer.from(r.rawRxHex,'hex');raw[30]^=1;r.rawRxHex=raw.toString('hex');fs.writeFileSync(p,JSON.stringify(r));assert.throws(()=>pair(tmp),/checksum/);
assert.equal(preflight(fs.readFileSync(new URL('./baseline.syx',import.meta.url))).channels[3].binaryId,61);fs.rmSync(tmp,{recursive:true});console.log('Drive pair, preflight and corruption rejection PASS');

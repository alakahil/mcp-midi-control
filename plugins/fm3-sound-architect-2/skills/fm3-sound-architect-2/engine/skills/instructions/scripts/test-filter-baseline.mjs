// Read-only source audit. Does not claim a Filter GET/SYX pair exists.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),sha=x=>createHash('sha256').update(x).digest('hex');
const bytes=read('scripts/filter-collector/baseline.syx'),base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
assert.equal(sha(bytes),'9a254a1af26b64025cb9a281fb53845e7e7f95a6713ea2ec5d2b7e670edbfd80');
assert.equal(sha(base),'afacded0a3c3a30cfbf48b4e3daa08c0639482f0f1973e429763150ff7e9372c');
const state=inspectStructure(bytes),body=Buffer.from(state.raw.body),old=Buffer.from(inspectStructure(base).raw.body);
assert.equal(body.length,13146);assert.equal(body[0],1);
assert.equal(body.readUInt16LE(7568),114);assert.equal(body.readUInt16LE(7610),37);assert.equal(body.readUInt16LE(7612),4);
assert.equal(body.readUInt16LE(392),114);assert.equal(body.readUInt16LE(394),2);
const restored=Buffer.concat([body.subarray(0,7568),body.subarray(7910)]);restored.writeUInt16LE(1028,392);assert.deepEqual(restored,old);
const channels=Array.from({length:4},(_,i)=>({channel:'ABCD'[i],typeWord:body.readUInt16LE(7614+i*74)}));assert.ok(channels.every(x=>x.typeWord===0));
const report={date:'2026-10-08',sourceFile:'skills/instructions/scripts/filter-collector/baseline.syx',sourceSha256:sha(bytes),bytes:bytes.length,bodyBytes:body.length,compressedBytes:state.raw.compSize,presetName:state.decoded.preset_name,selectedScene:2,filter:{eid:114,row:2,column:9,recordStart:7568,recordEnd:7910,parameterStart:7614,wordsPerChannel:37,totalWords:148,channels,sceneChannels:Array.from({length:8},(_,i)=>body.readUInt16LE(7578+i*2)),sceneBypass:Array.from({length:8},(_,i)=>body.readUInt16LE(7594+i*2)),screenshotSelection:'Null',typePid:'0 candidate from existing catalog and zero words; requires first real GET/SYX pair',activeInSuppliedBaseline:true},checks:{framesCrcFooter:true,removeFilterAndRestoreOneShuntEqualsAll12804NewLookBodyBytes:true,allPriorBlockRecordsScenesLevelsAndSystemDataPreserved:true},typeList:{count:18,source:'skills/instructions/references/filter-20261008/type-list.png',displayOrderIsNotBinaryId:true},hardware:'User-exported baseline only; first live Filter GET/SYX pair pending',generator:'Filter writing and insertion not enabled; numeric scaling and Order unconfirmed'};
fs.writeFileSync(new URL('../../../docs/FM3_FILTER_BASELINE_AUDIT.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

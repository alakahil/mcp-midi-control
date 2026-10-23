import {fileURLToPath} from 'node:url';
// Supplemental measured Filter controls; file-only validation, no device access.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {compare,pair} from './filter-rea-proof/filter-check.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const filterReaLibraryHash='e667bb04bbb29ac0fab55ca48b63031ed4adb551f588b19dc3e99f0cbb575d9b';
export function loadFilterReaControls(){
 const bytes=fs.readFileSync(new URL('../references/filter-rea-controls.json',import.meta.url));
 assert.equal(sha(bytes),filterReaLibraryHash,'Filter REA registry changed; revalidate');
 const lib=JSON.parse(bytes);
 assert.ok(lib.schemaVersion===1&&lib.firmware===13&&lib.effectId===114&&lib.wordsPerChannel===37&&lib.count===23&&lib.points.length===23);
 return lib;
}
export function validateFilterReaPoint(point){
 const root=new URL('../references/'+point.evidenceDirectory+'/',import.meta.url),dir=new URL(point.folder+'/',root);
 const read=name=>fs.readFileSync(new URL(name,dir));
 const current=read('donor.syx'),previous=fs.readFileSync(new URL(point.previousFile,root));
 const rb=read('result.json'),cb=read('capture.json');
 for(const [bytes,expected] of [[current,point.syxSha256],[previous,point.previousSha256],[rb,point.resultSha256],[cb,point.captureSha256]])
  assert.equal(sha(bytes),expected,'Filter REA source hash mismatch');
 const result=JSON.parse(rb),comparison=compare(previous,current,point.stepIndex),proof=pair(fileURLToPath(dir));
 assert.ok(result.status==='passed'&&result.displayConfirmed===true&&result.getAuthorized===true);
 assert.deepEqual(comparison,result.comparison);assert.deepEqual(proof,result.pair);
 assert.equal(proof.rawRxSha256,point.rawRxSha256);assert.equal(proof.matchedWords,148);
 const i=result.step.targets.findIndex(t=>t.channel===point.channel&&t.parameterId===point.parameterId);
 assert.ok(i>=0);const target=result.step.targets[i],obs=result.observations[i],word=comparison.targets[i];
 assert.equal(target.type,point.type);assert.equal(target.value,point.targetValue);assert.equal(target.unit,point.unit);
 assert.equal({Frequency:'frequencyHz',Q:'q',Gain:'gainDb',Level:'levelDb',Order:'order'}[target.parameter],point.field);
 assert.deepEqual(obs,{channel:point.channel,parameterId:point.parameterId,requestedValue:point.targetValue,displayText:point.displayText,displayValue:point.displayValue});
 assert.ok(word.wordChanged);assert.equal(word.before,point.rawBefore);assert.equal(word.after,point.raw);
 const body=Buffer.from(inspectStructure(current).raw.body),at=7614+'ABCD'.indexOf(point.channel)*74;
 assert.equal(body.length,point.bodyBytes);assert.equal(sha(body),point.bodySha256);
 assert.equal(body.readUInt16LE(at),point.binaryId);assert.equal(body.readUInt16LE(at+point.parameterId*2),point.raw);
 return {body,proof};
}

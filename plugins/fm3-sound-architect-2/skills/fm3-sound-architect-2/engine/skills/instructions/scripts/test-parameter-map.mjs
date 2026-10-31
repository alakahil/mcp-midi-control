import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {getParameterMap,parameterMapCLI,validateParameterIndex} from './fm3-parameter-map.mjs';
import {loadDictionary,findParam} from './fm3-table-encoder.mjs';

const all=getParameterMap(),byId=new Map(all.parameters.map(p=>[p.id,p]));
assert.equal(all.summary.parameterKeys,3223);assert.equal(byId.size,3223);
assert.equal(all.summary.dictionaryRows,2892);assert.equal(all.summary.catalogOnlyKeys,331);
assert.equal(all.summary.indexedObservations,1399);  // +23 T17, +28 T18, +50 T19 front-panel readings (2026-10-31)
let names=0,observations=0,labels=0,comparedWords=0,unrequested=0,disputed=0;
for(const p of loadDictionary().params){
 const row=byId.get(`${p.family??'UNNAMED'}:${p.param}`);
 assert.ok(row);assert.equal(row.effective.kind,p.kind);assert.equal(row.effective.status,p.status);
 assert.equal(row.evidence.fullRangeHardwareProven,false);
 if(p.name&&p.family){assert.equal(getParameterMap(p.family,p.name).parameters[0].id,row.id);names++;}
 if(['unverified-taper','n/a'].includes(p.status))assert.equal(row.effective.scale.known,false);
 if(!row.authoring.publicBlockBinding)assert.deepEqual(row.authoring.channels,[]);
}
for(const row of all.parameters){
 if(!row.effective)assert.equal(row.authoring.scalarGate,'blocked');
 for(const obs of row.evidence.observations){
  observations++;assert.equal(obs.parameter,row.id);
  if(obs.kind==='device-enum-labels'){
   labels++;comparedWords+=obs.scope.comparedWords.length;unrequested+=obs.scope.notRequestedWords.length;
   assert.equal(new Set(obs.scope.comparedWords).size,obs.scope.comparedWords.length);
   for(const word of obs.scope.comparedWords)assert.ok(row.effective.scale.options.some(o=>o.word===word));
   for(const word of obs.scope.notRequestedWords)assert.ok(!obs.scope.comparedWords.includes(word));
  }
  if(obs.kind==='front-panel-disputed-reading'){disputed++;assert.equal(obs.scope.readingDisputed,true);}
 }
}
assert.equal(observations,1399);assert.equal(labels,363);assert.equal(comparedWords,5275);assert.equal(unrequested,2);assert.equal(disputed,1);
const one=(f,p)=>getParameterMap(f,p).parameters[0];
assert.deepEqual(one('chorus','VOICES').effective.scale.numericInputRange,[2,8]);
assert.equal(one('chorus','VOICES').effective.scale.storedDomain.displayStep,2);
assert.deepEqual(one('plex','NUMDLINES').effective.scale.numericInputRange,[4,8]);
assert.deepEqual(one('cab',93).effective.scale.numericInputRange,[0,10]);
assert.equal(one('pitch','CUSTOMSCALE1').effective.scale.displayCodec.displayOffset,1);
assert.equal(one('pitch','TEMPO').effective.scale.options[0].word,1);
assert.equal(one('pitch','TEMPO').evidence.observations.find(o=>o.kind==='device-enum-labels').scope.notRequestedWords.length,1);
assert.equal(one('filter','QUANTIZE').effective.scale.repeatedLabels.length,1);
assert.equal(one('filter','QUANTIZE').effective.scale.repeatedLabels[0].stringSelects,0);
assert.equal(one('flanger','FLANGER_MANUAL').pid,5);
assert.equal(one('flanger','OLD_FLANGER_MANUAL').pid,6);
assert.equal(one('mixer','DELAY1').name,'MIXER_DELAY1');
assert.equal(one('tentap','TIME1M').effective.scale.known,false);
assert.equal(one('drive','OVERSAMPLE').authoring.scalarGate,'blocked');
assert.equal(one('delay','TYPE').authoring.fullChannelTemplateRequired,true);
assert.equal(one('in1','MODE').authoring.tableScalarEligible,false);
assert.deepEqual(one('looper',0).authoring.channels,['A']);
assert.deepEqual(one('megatap',0).authoring.channels,['A','B']);
assert.ok(one('delay','TIME').authoring.tempoDependencies.length);
// No cached output references leak mutable engine/index state to callers.
const r=one('amp','MID');r.effective.scale.numericInputRange[0]=999;r.catalogNames.length=0;
assert.equal(one('amp','MID').effective.scale.numericInputRange[0],0);
assert.ok(one('amp','MID').catalogNames.length);
const scale=one('pitch','CUSTOMSCALE1');scale.effective.scale.displayCodec.displayOffset=999;
assert.equal(one('pitch','CUSTOMSCALE1').effective.scale.displayCodec.displayOffset,1);
const dependency=one('delay','TIME');dependency.authoring.tempoDependencies[0].labels.length=0;
assert.ok(one('delay','TIME').authoring.tempoDependencies[0].labels.length);
const indexBytes=fs.readFileSync(new URL('../../../docs/FM3_PARAMETER_EVIDENCE.json',import.meta.url));
const index=validateParameterIndex(indexBytes);
for(const mutated of [Buffer.from('{}'),indexBytes.subarray(0,-1),Buffer.concat([indexBytes,Buffer.from(' ')])])assert.throws(()=>validateParameterIndex(mutated),/hash mismatch/);
let hashedSources=0;
const prefix='plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
for(const [path,expected] of Object.entries(index.evidenceSources)){
 if(!path.startsWith(prefix))continue;
 const local=path.slice(prefix.length);assert.ok(!local.split('/').includes('..'));
 const bytes=fs.readFileSync(new URL('../'+local,import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,path);hashedSources++;
}
for(const args of [['--bad'],['amp','MID','extra'],['unknown'],['amp','MISSING'],['amp','-1']])assert.throws(()=>parameterMapCLI(args));
assert.equal(parameterMapCLI([]).summary.parameterKeys,3223);
const cli=fileURLToPath(new URL('./fm3-preset.mjs',import.meta.url));
const good=spawnSync(process.execPath,[cli,'--parameter-map','cab','93'],{encoding:'utf8'});
assert.equal(good.status,0,good.stderr);assert.equal(JSON.parse(good.stdout).parameters[0].id,'CABINET:93');
const bad=spawnSync(process.execPath,[cli,'--parameter-map','amp','MID','--write'],{encoding:'utf8'});
assert.notEqual(bad.status,0);assert.equal(bad.stdout,'');
console.log(JSON.stringify({passed:true,parameterKeys:byId.size,dictionaryRows:2892,namedLookups:names,indexedObservations:observations,labelParameters:labels,comparedLabelWords:comparedWords,unrequestedLabelWords:unrequested,disputedReadings:disputed,hashedBundledEvidenceSources:hashedSources,deviceIO:false}));

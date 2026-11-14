import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createPreset,writePresetOutputs} from './fm3-preset.mjs';
import {reviewPreset} from './fm3-preset-review.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-review-'));
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
try{
 const composer={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'REVIEW TEST',modifiers:{external1Wah:false}};
 const e=()=>Array(12).fill('');
 const spec={composer,remove:['send','return'],insert:['mixer'],recordOrder:'device',
  grid:{rows:[e(),['in1','drive','amp','cab','delay','-','mixer','-','-','-','-','out1'],['','','','','-','reverb','','','','','',''],e()],
   links:[{row:3,col:5,from:[2]},{row:2,col:7,from:[2,3]}]}};
 const stem=path.join(tmp,'test');writePresetOutputs(stem,createPreset(base,spec),spec);
 const r=reviewPreset(stem);assert.ok(r.fourFilesVerified);
 assert.equal(r.risks.filter(x=>x.code==='parallel-sum-level-risk').length,1);
 assert.ok(Math.abs(r.risks[0].unityCoherentGainUpperBoundDb-6.0206)<0.001);
 assert.equal(r.hardware.storeReload,'not-tested');assert.equal(r.cpuEstimate.measured,false);
 const f=stem+'.validation.json',original=fs.readFileSync(f),bad=JSON.parse(original);bad.scenes[0].name='FALSE';fs.writeFileSync(f,JSON.stringify(bad));
 assert.throws(()=>reviewPreset(stem));fs.writeFileSync(f,original);
 fs.unlinkSync(stem+'.txt');assert.throws(()=>reviewPreset(stem));
 const legacy=path.join(tmp,'legacy');writePresetOutputs(legacy,createPreset(base,composer),composer);
 const lr=reviewPreset(legacy);assert.equal(lr.decoded.scenes.length,8);assert.ok(lr.decoded.presetTempo.channels.length===4);
 console.log(JSON.stringify({passed:true,parallelSumDetected:true,tamperedAndIncompleteRejected:true,deviceIO:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

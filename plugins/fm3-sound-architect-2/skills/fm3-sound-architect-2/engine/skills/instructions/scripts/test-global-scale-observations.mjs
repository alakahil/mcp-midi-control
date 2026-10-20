import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {loadGlobalScaleObservations} from './fm3-global-scale-observations.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
for(const displayOnly of [false,true]){
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-global-observations-'));
try{
  const evidence=path.join(tmp,'SYNTHETIC-observations.json');
  execFileSync('python3',[fileURLToPath(new URL('./global-scale-collector/test_global_scale_decode.py',import.meta.url)),displayOnly?'--display-fixture':'--fixture',evidence]);
  const observations=loadGlobalScaleObservations(evidence);
  const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
  const spec=JSON.parse(read('examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json'));
  spec.composer.name='GLOBAL OBS TEST';
  spec.composer.pitchChannels=[{channel:'A',type:'Custom Shifter'},{channel:'D',type:'Custom Shifter'}];
  spec.layout={row2:['drive','phaser','amp','cab'],row3:['pitch','delay','reverb']};
  spec.controls=['A','D'].flatMap(channel=>[{block:'pitch',channel,param:'CUSTOMSCALE1',value:'SCALE 1'},{block:'pitch',channel,param:'CUSTOMSCALE2',value:'SCALE 32'}]);
  const plain=createPreset(base,spec),result=createPreset(base,spec,{globalScaleObservations:observations});
  assert.deepEqual(result.syx,plain.syx);
  const deps=result.report.globalScaleDependencies;
  assert.deepEqual(deps.observedScales.map(s=>s.scale),[1,32]);
  assert.equal(deps.contentsIncluded,false);assert.equal(deps.contentsVerified,false);
  assert.equal(deps.assessment.liveGetEncodingVerified,false);
  assert.match(result.txt,/SCALE 32: A=/);assert.match(result.txt,/pooltooni/);
  assert.doesNotMatch(result.txt,/päringuid pole käivitatud/);
  if(displayOnly){
    assert.equal(observations.schemaVersion,2);
    assert.equal(deps.assessment.numericMismatchCount,4);
    assert.equal(deps.assessment.status,'display-text-observed');
    assert.deepEqual(deps.observedScales[0].notes.slice(0,3).map(n=>n.shiftSemitones),[-24,24,0]);
    assert.deepEqual(deps.observedScales[0].notes.slice(0,3).map(n=>n.numericMatchesDisplay),[false,false,true]);
    assert.match(result.txt,/Skaalanihe pärineb kogumise kuvatekstist/);
    assert.match(result.txt,/LAHKNEVUS SCALE 1 A: kuva=-24 semi; arvuvälja float32=0; bitid=0x00000000/);
    assert.match(result.txt,/LAHKNEVUS SCALE 32 A#\/Bb: kuva=24 semi/);
    assert.doesNotMatch(result.txt,/kuva ja arvuvälja ristkontroll/);
  }else{
    assert.equal(observations.schemaVersion,1);
    assert.match(result.txt,/kuva ja arvuvälja ristkontroll/);
    assert.doesNotMatch(result.txt,/LAHKNEVUS/);
  }
  const partial=structuredClone(observations);partial.scales.pop();
  if(displayOnly)partial.assessment.numericMismatchCount=partial.scales.flatMap(s=>s.notes).filter(n=>!n.numericMatchesDisplay).length;
  assert.throws(()=>createPreset(base,spec,{globalScaleObservations:partial}),/Missing global scale observations/);
  const malformed=structuredClone(observations);malformed.scales[0].notes[0].shiftSemitones=4;
  assert.throws(()=>createPreset(base,spec,{globalScaleObservations:malformed}),/rejected/);
  assert.throws(()=>createPreset(base,spec,{globalScaleObservations:null}),/rejected/);
  const stem=path.join(tmp,'preset');writePresetOutputs(stem,result,spec);verifyPresetOutputs(stem);
  const reportPath=stem+'.validation.json',originalReport=fs.readFileSync(reportPath);
  for(const change of [r=>r.globalScaleDependencies.observedScales[0].notes[0].shiftSemitones++,
                       r=>r.globalScaleDependencies.uses[0].scale++,
                       r=>r.globalScaleObservations.assessment.contentsVerified=true,
                       r=>delete r.globalScaleObservations,
                       ...(displayOnly?[
                         r=>r.globalScaleObservations.scales[0].notes[0].numericMatchesDisplay=true,
                         r=>r.globalScaleObservations.scales[0].notes[0].numericFloat32=-24,
                         r=>r.globalScaleObservations.assessment.numericMismatchCount=0,
                         r=>r.globalScaleObservations.schemaVersion=1,
                       ]:[])]){
    const r=JSON.parse(originalReport);change(r);fs.writeFileSync(reportPath,JSON.stringify(r));
    assert.throws(()=>verifyPresetOutputs(stem));
  }
  fs.writeFileSync(reportPath,originalReport);verifyPresetOutputs(stem);
  if(displayOnly){
    const txtPath=stem+'.txt',originalTxt=fs.readFileSync(txtPath,'utf8');
    fs.writeFileSync(txtPath,originalTxt.replace(/^LAHKNEVUS.*\n/gm,''));
    assert.throws(()=>verifyPresetOutputs(stem));
    fs.writeFileSync(txtPath,originalTxt);verifyPresetOutputs(stem);
  }
  const basePath=path.join(tmp,'base.syx'),specPath=path.join(tmp,'spec.json'),cliStem=path.join(tmp,'cli');
  fs.writeFileSync(basePath,base);fs.writeFileSync(specPath,JSON.stringify(spec));
  const cli=fileURLToPath(new URL('./fm3-preset.mjs',import.meta.url));
  execFileSync(process.execPath,[cli,basePath,specPath,cliStem,'--global-scales',evidence]);
  execFileSync(process.execPath,[cli,'--verify',cliStem]);
  assert.deepEqual(fs.readFileSync(cliStem+'.syx'),plain.syx);
  fs.writeFileSync(evidence,JSON.stringify(partial));
  const failedStem=path.join(tmp,'missing');
  assert.notEqual(spawnSync(process.execPath,[cli,basePath,specPath,failedStem,'--global-scales',evidence]).status,0);
  for(const ext of ['.syx','.txt','.spec.json','.validation.json'])assert.equal(fs.existsSync(failedStem+ext),false);
  // The common entry point also attaches observations to a legacy composer spec.
  const legacyPlain=createPreset(base,spec.composer),legacy=createPreset(base,spec.composer,{globalScaleObservations:observations});
  assert.deepEqual(legacyPlain.syx,legacy.syx);assert.ok(legacy.report.globalScaleDependencies.observationsIncluded);
  const legacyStem=path.join(tmp,'legacy');writePresetOutputs(legacyStem,legacy,spec.composer);verifyPresetOutputs(legacyStem);
  console.log(JSON.stringify({passed:true,synthetic:true,displayOnly,requiredScales:[1,32],byteIdenticalSyx:true,cliAndVerify:true,deviceIO:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
}

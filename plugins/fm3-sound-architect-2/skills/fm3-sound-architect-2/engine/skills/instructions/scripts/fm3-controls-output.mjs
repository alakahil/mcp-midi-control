// Semantic check of saved composer bundles, including ordinary two-row layouts.
// Reapplying the requested writes to a copy validates final type/tempo/modifier
// state and must leave every byte unchanged. Refreshed hashes alone are not proof.
import assert from 'node:assert/strict';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {applyTableControls} from './fm3-layout.mjs';
import {finalSoundState,renderFinalSoundText} from './fm3-final-state.mjs';
import {renderCpuText} from './fm3-cpu.mjs';
export function verifyControlsOutput(report,syx,txt,spec){
  if(!spec?.composer)return;
  const body=Buffer.from(inspectStructure(syx).raw.body),copy=Buffer.from(body);
  const writes=applyTableControls(copy,spec.controls??[],{allow:spec.allow??[]});
  assert.ok(copy.equals(body),'Final controls differ from requested spec');
  const final=finalSoundState(syx,writes,{allow:spec.allow??[]});
  const canonical=x=>JSON.parse(JSON.stringify(x));
  for(const key of ['parameters','channels','typeApplicability','dependencies','scenes','name','selectedScene','signalLayout','signalRows','signalLinks','gridWarnings','sceneMidi','inputGate','volumePan','modifiers','pitchCustomScales'])
    assert.deepEqual(report[key],canonical(final[key]),'Final '+key+' report differs from SYX/policy');
  assert.equal(report.controls.length,writes.length,'Final control count differs');
  const fmt=v=>typeof v==='number'?String(Number(v.toFixed(4))):String(v);
  for(const w of final.controls){
    const matches=report.controls.filter(r=>(r.instanceBlock??r.block)===(w.instanceBlock??w.block)&&r.channel===w.channel&&r.pid===w.pid);
    assert.equal(matches.length,1,'Final control missing or duplicated');
    for(const key of ['offset','instanceEid','raw','display','value','label','unit','typeApplicability','dependencies'])
      assert.deepEqual(matches[0][key],canonical({v:w[key]}).v,'Final control '+key+' differs');
    assert.ok(txt.includes(`${w.instanceBlock??w.block} ${w.channel} ${w.label??w.name} (${w.name}): ${fmt(w.display)} ${w.unit}; küsitud ${fmt(w.value)}; raw ${w.raw};`),'Final control TXT differs');
  }
  // Global observations and pedal/modifier additions have their own verifiers.
  const textState={...final,globalScaleDependencies:report.globalScaleDependencies,modifierEdit:report.modifierEdit,volumePedal:report.volumePedal};
  assert.equal(txt,renderFinalSoundText(textState,spec)+renderCpuText(report.cpu)+'\n','Final TXT differs from decoded state/spec');
}

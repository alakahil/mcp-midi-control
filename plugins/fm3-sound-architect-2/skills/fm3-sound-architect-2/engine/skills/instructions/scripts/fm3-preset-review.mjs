// Read-only SV5 review. Verify all four files before trusting any decoded report.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyPresetOutputs} from './fm3-output.mjs';
import {auditGrid} from './fm3-grid-audit.mjs';
import {readPresetTempo,readControllersScenes} from './fm3-controllers.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {finalSoundState} from './fm3-final-state.mjs';
import {estimateCpu} from './fm3-cpu.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function reviewPreset(stem){
 verifyPresetOutputs(stem);
 const spec=JSON.parse(fs.readFileSync(stem+'.spec.json'));
 const saved=JSON.parse(fs.readFileSync(stem+'.validation.json'));
 const syx=fs.readFileSync(stem+'.syx'),body=Buffer.from(inspectStructure(syx).raw.body);
 const r=Array.isArray(saved.scenes)&&Array.isArray(saved.parameters)?saved:{...saved,...finalSoundState(syx,[])};
 const cpu=Array.isArray(r.cpu?.scenes)?r.cpu:estimateCpu(syx);
 const grid=auditGrid(syx);
 const risks=[];
 // Multiple physical inputs need a level test, including a bypassed Mixer.
 // A Multiplexer may select one row: flag it as unresolved, never assert summing.
 for(const c of grid.grid.cells.filter(c=>c.effectId&&c.inputRows.length>1)){
  risks.push({code:c.name==='multiplexer'?'parallel-selection-unresolved':'parallel-sum-level-risk',
   row:c.row,col:c.col,block:c.name,inputRows:c.inputRows,
   unityCoherentGainUpperBoundDb:c.name==='multiplexer'?null:20*Math.log10(c.inputRows.length),
   basis:'Potential coherent equal-amplitude unity inputs only; actual gains, phase, channel and bypass can change the result.',
   action:'Measure branches and sum during strong playing, bypass and scene changes. Use only supported level controls; no automatic trim.'});
 }
 for(const x of grid.grid.unresolved)risks.push({code:'unresolved-grid',detail:x});
 const params=r.parameters??[];
 const ir=params.filter(p=>p.block==='cab'&&/CABINET_(BANK[12]|TYPE[12]|DYNACAB_TYPE[12])$/.test(p.name));
 for(const p of ir.filter(p=>/BANK/.test(p.name)&&['USER','SCRATCHPAD'].includes(p.value)))
  risks.push({code:'external-ir-dependency',channel:p.channel,bank:p.value,action:'Record IR file identity and SHA-256; the preset does not install it.'});
 const scenes=r.scenes??r.report?.scenes??[];
 const sharedChannels=[];
 for(const block of r.channels??[]){for(const ch of block.channels){
  const used=scenes.filter(s=>s.blocks?.[block.block]?.channel===ch.channel&&!s.blocks[block.block].bypass).map(s=>s.scene);
  if(used.length>1)sharedChannels.push({block:block.block,channel:ch.channel,activeScenes:used});
 }}
 const files=Object.fromEntries(['syx','txt','spec.json','validation.json'].map(ext=>[ext,{sha256:sha(fs.readFileSync(stem+'.'+ext)),bytes:fs.statSync(stem+'.'+ext).size}]));
 // Reuse a historical listening statement only for the exact same SYX bytes.
 // This does not turn that statement into numeric measurements or STORE proof.
 const receiptPath='../references/l1-20261113/v13-listening.json';
 const receiptBytes=fs.readFileSync(new URL(receiptPath,import.meta.url));
 const receipt=JSON.parse(receiptBytes);
 const historicalListening=receipt.fileSha256===files.syx.sha256?{
  source:receiptPath,receiptSha256:sha(receiptBytes),presetSha256:receipt.fileSha256,
  date:receipt.date,userVerdict:receipt.userVerdict,method:receipt.method,measured:receipt.measured}:null;
 return {kind:'fm3-preset-review',version:1,fourFilesVerified:true,files,name:r.name??null,
  verification:'Complete deterministic spec replay and decoded final SYX, TXT and validation comparison',
  request:{composer:spec.composer??spec,controls:spec.controls??[],tempo:spec.tempo??null,modifierTargets:spec.modifierTargets??[],footswitches:spec.footswitches??[]},
  decoded:{scenes,controls:r.controls??[],presetTempo:readPresetTempo(body),controllersScenes:readControllersScenes(body),
   modifierTargets:r.modifierTargets??[],controlSwitches:r.controlSwitches??[],footswitches:r.csPreset?.footswitches??[],
   activeModifiers:(r.modifiers??[]).filter(x=>x.active),ir,sharedChannels,
   timeParameters:params.filter(p=>/TEMPO|DELAY_TIME|REVERB_TIME/.test(p.name))},
  cpuEstimate:{model:cpu.model,scenes:cpu.scenes.map(s=>({scene:s.scene,estimatedPercent:s.percent})),measured:false},
  grid:{status:grid.structuralStatus,summary:grid.grid.summary},risks,
  storePolicy:{allowedDifferences:['SysEx destination header','selected-scene byte 0','whole-record order only'],
   exactRequired:['record set and every record header/data byte','prefix except selected scene','system tail'],
   note:'No parameter, name, grid, controller or modifier word may be normalized away.'},
  hardware:{import:historicalListening?'historically-confirmed-for-exact-syx':'not-tested',
   audio:historicalListening?'historically-listened-for-exact-syx':'not-tested',
   historicalListening,cpu:'not-measured',loudness:'not-measured',storeReload:'not-tested'},deviceIO:false};
}

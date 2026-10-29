// Control Switch state per scene and per-preset Control Switch footswitches. Offline; no device I/O.
// Both live in the preset itself (FC PER-PRESET menu), at fixed distances from the END of the body:
//   CS Per Scene      482 bytes before the end: 6 Control Switches x 8 scenes, one word each; ON 0 / OFF 1 / LAST 2.
//   Definitions      3052 bytes before the end: 24 per-preset switch definitions as 8 arrays of 24 words (array k at
//                    +48k): array 0 = Tap category (7 = Control Switch), 1 = Tap function (1 Latching / 0 Momentary),
//                    3 = Control Switch number - 1; the rest 0 (Hold unassigned).
//   Overrides        1920 bytes after the definitions: one word per footswitch position, 65535 = none,
//                    n = definition n+1. Layout 1 switch 1 = the first word (the only position device-confirmed).
// Evidence: T14 / T14b device step checks (references/fm3-cs-steps-20261029.json, fm3-cs-steps-b-20261029.json), each
// change STOREd on the FM3 and read back word for word; marker 1525 four bytes before the definitions in 384/384
// tonepack presets; CS Per Scene words in that corpus take only the values 0, 1, 2.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const check=(ok,m)=>{if(!ok)throw Error('Control Switch preset: '+m);};
const sha=b=>createHash('sha256').update(b).digest('hex');
const RECEIPTS=Object.freeze({'fm3-cs-steps-20261029.json':'58e4cb0e30eef1fded80443e6eb4aa9b25ec978af66f40345db3ea315c765c7b','fm3-cs-steps-b-20261029.json':'8e45f37e27e999a7fcfd2627ad5dc0d97fa5d220cf09750d4649b2423ea83e9f'});
const receipts=Object.fromEntries(Object.entries(RECEIPTS).map(([f,h])=>{const b=fs.readFileSync(new URL('../references/'+f,import.meta.url));check(sha(b)===h,'evidence drift: '+f);return [f,JSON.parse(b)];}));
const t14b=receipts['fm3-cs-steps-b-20261029.json'];
check(JSON.stringify(t14b.decoded.csPerScene.codes)==='{"ON":0,"OFF":1,"LAST":2}','CS Per Scene codes');
export const CS_STATES=Object.freeze({ON:0,OFF:1,LAST:2});
export const FOOTSWITCH_FUNCTIONS=Object.freeze({latching:1,momentary:0});
const CATEGORY_CONTROL_SWITCH=7,DEFS=24,ARRAYS=8,FROM_END={csPerScene:482,definitions:3052},OVERRIDES_AFTER_DEFS=1920,OVERRIDE_WORDS=108,MARKER=1525;
// Footswitch positions with device evidence: [layout, switch] -> override word index.
export const OVERRIDE_POSITIONS=Object.freeze({'1/1':0});
const at=body=>{const L=body.length,def=L-FROM_END.definitions;return {L,def,ov:def+OVERRIDES_AFTER_DEFS,csps:L-FROM_END.csPerScene};};
const cspsOffset=(o,cs,scene)=>o.csps+16*(cs-1)+2*(scene-1);
const defOffset=(o,array,k)=>o.def+48*array+2*k;
function region(body){
 const o=at(body);check(o.def>=4610&&body.readUInt16LE(o.def-4)===MARKER,'per-preset region marker not found');
 return o;
}
// The supported base holds the FM3 defaults: no definition, no override, every CS Per Scene state OFF.
function isDefault(body){
 const o=region(body);
 for(let a=0;a<ARRAYS;a++)for(let k=0;k<DEFS;k++)if(body.readUInt16LE(defOffset(o,a,k))!==0)return false;
 for(let i=0;i<OVERRIDE_WORDS;i++)if(body.readUInt16LE(o.ov+2*i)!==65535)return false;
 for(let cs=1;cs<=6;cs++)for(let s=1;s<=8;s++)if(body.readUInt16LE(cspsOffset(o,cs,s))!==CS_STATES.OFF)return false;
 return true;
}
export function validateCsPreset(spec){
 const scenes=spec.controlSwitchScenes,feet=spec.footswitches,bound=new Set((spec.controlSwitches??[]).map(c=>c.switch));
 const outScenes=[],outFeet=[];
 if(scenes!==undefined){
  check(Array.isArray(scenes)&&scenes.length>=1&&scenes.length<=48,'controlSwitchScenes must be a list of 1..48 entries');
  const seen=new Set();
  scenes.forEach((x,i)=>{check(x&&typeof x==='object'&&!Array.isArray(x),`controlSwitchScenes[${i}] must be an object`);
   for(const k of Object.keys(x))check(['switch','scene','state'].includes(k),`controlSwitchScenes[${i}]: unknown field ${k}`);
   check(Number.isInteger(x.switch)&&x.switch>=1&&x.switch<=6,`controlSwitchScenes[${i}].switch must be 1..6`);
   check(Number.isInteger(x.scene)&&x.scene>=1&&x.scene<=8,`controlSwitchScenes[${i}].scene must be 1..8`);
   check(Object.hasOwn(CS_STATES,x.state),`controlSwitchScenes[${i}].state must be ON, OFF or LAST`);
   check(bound.has(x.switch),`controlSwitchScenes[${i}]: Control Switch ${x.switch} has no binding in controlSwitches`);
   const key=x.switch+'/'+x.scene;check(!seen.has(key),`controlSwitchScenes: Control Switch ${x.switch} scene ${x.scene} set twice`);seen.add(key);
   outScenes.push({switch:x.switch,scene:x.scene,state:x.state,code:CS_STATES[x.state]});});
 }
 if(feet!==undefined){
  check(Array.isArray(feet)&&feet.length>=1&&feet.length<=Object.keys(OVERRIDE_POSITIONS).length,`footswitches must be a list of 1..${Object.keys(OVERRIDE_POSITIONS).length} entries`);
  const seen=new Set();
  feet.forEach((x,i)=>{check(x&&typeof x==='object'&&!Array.isArray(x),`footswitches[${i}] must be an object`);
   for(const k of Object.keys(x))check(['layout','switch','function','controlSwitch'].includes(k),`footswitches[${i}]: unknown field ${k}`);
   const pos=x.layout+'/'+x.switch;
   check(Object.hasOwn(OVERRIDE_POSITIONS,pos),`footswitches[${i}]: only Layout 1 switch 1 is device-confirmed (layout:1, switch:1)`);
   check(Object.hasOwn(FOOTSWITCH_FUNCTIONS,x.function),`footswitches[${i}].function must be latching or momentary`);
   check(Number.isInteger(x.controlSwitch)&&x.controlSwitch>=1&&x.controlSwitch<=6,`footswitches[${i}].controlSwitch must be 1..6`);
   check(bound.has(x.controlSwitch),`footswitches[${i}]: Control Switch ${x.controlSwitch} has no binding in controlSwitches`);
   check(!seen.has(pos),`footswitches: Layout ${x.layout} switch ${x.switch} set twice`);seen.add(pos);
   outFeet.push({layout:x.layout,switch:x.switch,function:x.function,controlSwitch:x.controlSwitch,definition:i+1,overrideIndex:OVERRIDE_POSITIONS[pos]});});
 }
 return {scenes:outScenes,footswitches:outFeet};
}
export function applyCsPreset(syx,spec){
 const want=validateCsPreset(spec);check(want.scenes.length||want.footswitches.length,'nothing requested');
 const before=inspectStructure(syx),original=Buffer.from(before.raw.body),body=Buffer.from(original);
 check(isDefault(original),'the per-preset switch region must hold the FM3 defaults (no definitions, no overrides, CS Per Scene all OFF)');
 const o=region(body),writes=[];const put=(off,v,what)=>{writes.push({fromEnd:o.L-off,before:body.readUInt16LE(off),after:v,what});body.writeUInt16LE(v,off);};
 for(const s of want.scenes)if(s.code!==CS_STATES.OFF)put(cspsOffset(o,s.switch,s.scene),s.code,`CS ${s.switch} scene ${s.scene} ${s.state}`);
 for(const f of want.footswitches){const k=f.definition-1;
  put(defOffset(o,0,k),CATEGORY_CONTROL_SWITCH,`definition ${f.definition} category Control Switch`);
  if(FOOTSWITCH_FUNCTIONS[f.function])put(defOffset(o,1,k),FOOTSWITCH_FUNCTIONS[f.function],`definition ${f.definition} ${f.function}`);
  if(f.controlSwitch>1)put(defOffset(o,3,k),f.controlSwitch-1,`definition ${f.definition} Control Switch ${f.controlSwitch}`);
  put(o.ov+2*f.overrideIndex,k,`override Layout ${f.layout} switch ${f.switch} -> PP#${f.definition}`);}
 const allowed=new Set(writes.flatMap(w=>[o.L-w.fromEnd,o.L-w.fromEnd+1]));
 for(let i=0;i<body.length;i++)if(body[i]!==original[i])check(allowed.has(i),'byte outside the declared words changed at '+i);
 const out=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(before.raw.rawPatch,body))),after=inspectStructure(out);
 check(Buffer.from(after.raw.body).equals(body)&&after.raw.crcValid,'encoded body readback differs');
 check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'dump header changed');
 return {syx:out,report:{policy:'cs-preset-fw13-t14b',writes,onlyDeclaredWordsChanged:true,bodyReadback:true,dumpHeaderPreserved:true,deviceIO:false}};
}
// Final-state readback: the region must hold exactly the requested states and switches, nothing else.
export function readCsPreset(body,spec){
 const want=validateCsPreset(spec),o=region(body);
 const scenes=[];for(let cs=1;cs<=6;cs++)for(let s=1;s<=8;s++){const v=body.readUInt16LE(cspsOffset(o,cs,s)),req=want.scenes.find(x=>x.switch===cs&&x.scene===s);
  check(v===(req?req.code:CS_STATES.OFF),`CS ${cs} scene ${s}: stored ${v}, expected ${req?req.state:'OFF (default)'}`);if(req)scenes.push({switch:cs,scene:s,state:req.state});}
 const feet=[];for(let k=0;k<DEFS;k++){const f=want.footswitches.find(x=>x.definition===k+1);
  const exp=f?[CATEGORY_CONTROL_SWITCH,FOOTSWITCH_FUNCTIONS[f.function],0,f.controlSwitch-1,0,0,0,0]:Array(ARRAYS).fill(0);
  for(let a=0;a<ARRAYS;a++)check(body.readUInt16LE(defOffset(o,a,k))===exp[a],`per-preset definition ${k+1} word ${a} differs`);}
 for(let i=0;i<OVERRIDE_WORDS;i++){const f=want.footswitches.find(x=>x.overrideIndex===i),v=body.readUInt16LE(o.ov+2*i);
  check(v===(f?f.definition-1:65535),`override word ${i}: stored ${v}`);
  if(f)feet.push({layout:f.layout,switch:f.switch,definition:f.definition,function:f.function,controlSwitch:f.controlSwitch});}
 return {controlSwitchScenes:scenes,footswitches:feet,otherScenes:'OFF',evidence:Object.keys(RECEIPTS).map(f=>'references/'+f)};
}
export function renderCsPresetText(state){
 if(!state)return [];
 return ['','CONTROL SWITCH STSEENID JA JALGLÜLITID — LÕPPFAILIST',
  ...state.controlSwitchScenes.map(s=>`Control Switch ${s.switch}, Scene ${s.scene}: ${s.state}${s.state==='LAST'?' (jätab eelmise stseeni oleku)':''}.`),
  'Teised Control Switchi stseeniolekud: OFF (FM3 vaikimisi). FC PER-PRESET → CS Per Scene.',
  ...state.footswitches.map(f=>`Layout ${f.layout}, lüliti ${f.switch} → PP#${f.definition}: Control Switch: ${f.function==='latching'?'Latching (vajutus lülitab sisse/välja)':'Momentary (sees ainult hoidmise ajal)'}, Control Switch ${f.controlSwitch}. Ainult selles presetis (Per-Preset FC / Overrides); lüliti tavaline funktsioon on selles presetis asendatud.`),
  'Kodeering on seadmel kinnitatud 29.10.2026 (T14/T14B: iga väli FM3-l ükshaaval salvestatud ja sõna-sõnalt tagasi loetud; Latching ja Momentary käitusid nii, nagu kirjas). Üldseadeid ei muudeta; kui per-preset override on FM3 üldseadetes keelatud, asendus ei rakendu. Selle uue faili import on seadmes kontrollimata.'];
}
export function csPresetCapabilities(){return {
 fields:{controlSwitchScenes:'[{switch 1..6, scene 1..8, state ON|OFF|LAST}] (switch must be bound in controlSwitches; unlisted states stay OFF)',
  footswitches:'[{layout 1, switch 1, function latching|momentary, controlSwitch 1..6}] (Control Switch must be bound in controlSwitches)'},
 codes:{csPerScene:CS_STATES,function:FOOTSWITCH_FUNCTIONS,category:CATEGORY_CONTROL_SWITCH},positions:Object.keys(OVERRIDE_POSITIONS),
 storage:'in the preset (FC PER-PRESET); no global setting',evidence:Object.keys(RECEIPTS).map(f=>'references/'+f),
 hardware:'encoding confirmed word for word on the device (T14/T14b, 2026-10-29); Latching toggles with the LED, Momentary is active while held, CS Per Scene applies on scene change',
 notSupported:['footswitch positions other than Layout 1 switch 1 (override index mapping not yet device-checked)','Hold functions','functions other than Control Switch'],deviceIO:false};}
// Final artifact check (verifyPresetOutputs).
export function verifyCsPresetOutput(report,syx,txt,spec){
 const requested=Object.hasOwn(spec??{},'controlSwitchScenes')||Object.hasOwn(spec??{},'footswitches'),body=Buffer.from(inspectStructure(syx).raw.body);
 if(!requested){check(!report.csPreset&&!report.stages?.csPreset,'unexpected Control Switch preset report');if(spec?.composer)check(isDefault(body),'unrequested per-preset switch or CS Per Scene state');return;}
 const state=readCsPreset(body,spec);
 check(JSON.stringify(report.csPreset)===JSON.stringify(state),'Control Switch preset final state differs');
 const stage=report.stages?.csPreset;
 check(stage?.policy==='cs-preset-fw13-t14b'&&stage.onlyDeclaredWordsChanged===true&&stage.bodyReadback===true&&stage.dumpHeaderPreserved===true&&stage.deviceIO===false,'Control Switch preset stage report differs');
 for(const line of renderCsPresetText(state).filter(Boolean))check(txt.includes(line),'TXT differs from final Control Switch preset state');
}

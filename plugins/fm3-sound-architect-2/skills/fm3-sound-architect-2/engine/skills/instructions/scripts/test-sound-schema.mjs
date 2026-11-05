// The bundled sound schema (fm3-sound.schema.json) and the generator decide the same way for the 0.3.30-0.3.32
// fields (controlSwitches, volumePedal {min,max}, Wah + Volume, out2), Multi Delay placement, Controllers writes,
// and every current example spec.
// Generator-only rules (the schema cannot express them) are listed and must be refused by the generator.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {checkSchema} from './fm3-schema-check.mjs';
import {createPreset} from './fm3-preset.mjs';
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const S='fm3-sound.schema.json',ok=s=>{const e=checkSchema(S,s);assert.deepEqual(e,[],JSON.stringify(e));createPreset(base,s);};
// Historical example outside the public input contract (old Volume alias); kept as a dated exception.
const HISTORICAL=new Set(['FM3_P6_INSERT_A.spec.json']);
let examples=0;
for(const f of fs.readdirSync(new URL('../examples/',import.meta.url)).filter(f=>f.endsWith('.spec.json'))){
  const s=JSON.parse(fs.readFileSync(new URL('../examples/'+f,import.meta.url)));if(!s.composer)continue;
  if(HISTORICAL.has(f)){assert.notDeepEqual(checkSchema(S,s),[]);continue;}
  assert.deepEqual(checkSchema(S,s),[],f);examples++;}
const composer={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'SCHEMA CHECK',modifiers:{external1Wah:false}};
const wahComposer={...composer,wahChannels:[{channel:'A',type:'FAS Wah'}],modifiers:{external1Wah:true}};
const E=Array(12).fill('');
const valid=[
  {composer,layout:{row2:['drive','amp','cab'],row3:['delay','reverb']},controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST'},{switch:3,block:'amp',param:'DISTORT_BRIGHT',invert:true},{switch:4,block:'amp',param:'DISTORT_FAT',channel:'D'}]},
  {composer,layout:{row2:['drive','amp','cab'],row3:['delay','reverb']},controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST'}],controlSwitchScenes:[{switch:2,scene:2,state:'ON'},{switch:2,scene:3,state:'LAST'}],footswitches:[{layout:1,switch:1,function:'momentary',controlSwitch:2},{layout:2,switch:12,function:'latching',controlSwitch:2}]},
  {composer,volumePan:true,volumePedal:true,layout:{row2:['drive','amp','cab'],row3:['volpan','delay','reverb']}},
  {composer,volumePan:true,volumePedal:{min:2.5,max:7.5},layout:{row2:['drive','amp','cab'],row3:['volpan','delay','reverb']}},
  {composer,volumePan:true,volumePedal:{min:1,max:9,curve:{startPercent:10,endPercent:90,slopePercent:65,scale:1.5,offsetPercent:-5,attackMs:50,releaseMs:400}},layout:{row2:['drive','amp','cab'],row3:['volpan','delay','reverb']}},
  {composer:wahComposer,volumePan:true,volumePedal:{max:8},layout:{row2:['wah','drive','amp','cab'],row3:['volpan','delay','reverb']},controlSwitches:[{switch:2,block:'amp',param:'DISTORT_CUT',channel:'ALL'}]},
  {composer,grid:{rows:[E,['in1','drive','-','-','amp','cab','-','-','-','-','-','send'],['return','delay','-','-','reverb','-','-','-','-','-','-','out1'],[...Array(11).fill(''),'out2']],links:[{row:4,col:12,from:[3]}]},duplicate:['out2']}];
for(const s of valid)ok(s);
// Multi Delay is insertable in both layout rows and the general grid. The schema must
// accept its placement and A-D scene states while keeping parameter writes closed.
const multidelayLayout={composer,insert:['multidelay'],layout:{row2:['drive','amp','cab'],row3:['delay','multidelay','reverb'],columns:{drive:3,amp:6,cab:8,delay:6,multidelay:7,reverb:8}},
  blockScenes:{multidelay:[{scene:1,channel:'A',bypass:false},{scene:2,channel:'D',bypass:true}]}};
const multidelayRow2={...multidelayLayout,layout:{row2:['drive','multidelay','amp','cab'],row3:['delay','reverb']}};
const multidelayGrid={composer,insert:['multidelay'],grid:{rows:[E,['in1','drive','-','-','amp','cab','-','-','-','-','-','send'],
  ['return','delay','-','-','-','-','multidelay','-','reverb','-','-','out1'],E]},blockScenes:multidelayLayout.blockScenes};
// All 11 serial insert families fit; do not impose the old 10-item limit.
const allSerialInserts={composer,insert:['plex','multiband','synth','looper','gate','formant','tentap','megatap','ringmod','resonator','multidelay'],
  layout:{row2:['drive','amp','cab','plex','multiband','synth','looper','gate','formant','tentap'],row3:['megatap','ringmod','resonator','multidelay','delay','reverb']}};
for(const s of [multidelayLayout,multidelayRow2,multidelayGrid,allSerialInserts])ok(s);
const mdDuplicate=structuredClone(multidelayLayout);mdDuplicate.insert.push('multidelay');
const mdChannel=structuredClone(multidelayLayout);mdChannel.blockScenes.multidelay[0].channel='E';
const mdColumn=structuredClone(multidelayLayout);mdColumn.layout.columns.multidelay=12;
// 0.3.49 (T27): Base Type and Multi Delay parameters are writable; the Multi Delay preset word (Type, pid 114) is refused
// by the generator only (the schema cannot know the parameter rule).
const mdWrite={...multidelayLayout,allow:['enum-labels','linear-by-structure'],controls:[{block:'multidelay',channel:'A',param:'MULTITAP_BASETYPE',value:'Quad Parallel Delay'},{block:'multidelay',channel:'A',param:'MULTITAP_MIX',value:30}]};
ok(mdWrite);
const mdPreset={...multidelayLayout,allow:['enum-labels'],controls:[{block:'multidelay',channel:'A',param:'MULTITAP_PRESETS',value:3}]};
assert.deepEqual(checkSchema(S,mdPreset),[],'schema shape of a Multi Delay preset write');
assert.throws(()=>createPreset(base,mdPreset),/preset selection \(Type\) is not writable/,'generator refuses the Multi Delay preset word');
for(const s of [mdDuplicate,mdChannel,mdColumn]){
  assert.notDeepEqual(checkSchema(S,s),[],'schema accepts invalid Multi Delay input');
  assert.throws(()=>createPreset(base,s),Error,'generator accepts invalid Multi Delay input');
}
// 0.3.50 (T28): Controllers writes. Shape errors are refused by both; status gate, refused parameters and
// duplicates by the generator only.
const ctl={composer,layout:{row2:['drive','amp','cab'],row3:['delay','reverb']},allow:['enum-labels'],
  controllers:[{channel:'A',param:'LFO1TYPE',value:'Square'},{channel:'A',param:'CONTROLLERS_LFO1FREQ',value:2.5},{channel:'B',param:17,value:60}]};
ok(ctl);
const ctlBoth=[['channel E',s=>s.controllers[0].channel='E'],['extra key',s=>s.controllers[0].block='controllers'],['empty list',s=>s.controllers=[]],
  ['65 writes',s=>s.controllers=Array.from({length:65},(_,i)=>({channel:'ABCD'[i%4],param:40+Math.floor(i/4),value:1}))],['pid 130',s=>s.controllers[2].param=130],['missing value',s=>delete s.controllers[0].value]];
const ctlGenerator=[['Tempo To Use',s=>s.controllers=[{channel:'A',param:'TEMPOTOUSE',value:0}]],['enum without allow',s=>delete s.allow],
  ['n/a mark',s=>s.controllers=[{channel:'A',param:'ADSR1_XMARK',value:1}]],['same word twice',s=>s.controllers.push({channel:'A',param:1,value:1})],['out of range',s=>s.controllers[1].value=100]];
for(const [name,edit] of ctlBoth){const s=structuredClone(ctl);edit(s);
  assert.notDeepEqual(checkSchema(S,s),[],'schema accepts controllers: '+name);assert.throws(()=>createPreset(base,s),Error,'generator accepts controllers: '+name);}
for(const [name,edit] of ctlGenerator){const s=structuredClone(ctl);edit(s);
  assert.deepEqual(checkSchema(S,s),[],'schema refuses controllers: '+name);assert.throws(()=>createPreset(base,s),Error,'generator accepts controllers: '+name);}
// 0.3.51 (T29): Feedback Return controls. "send" is refused by both; Return channels B-D, Bypass/Bypass Mode and
// out-of-range values by the generator only.
const fb={composer,layout:{row2:['drive','amp','cab'],row3:['delay','reverb']},controls:[{block:'return',channel:'A',param:'RETLEVEL',value:80},{block:'return',channel:'A',param:'PAN',value:20}]};
ok(fb);
{const s=structuredClone(fb);s.controls[0].block='send';assert.notDeepEqual(checkSchema(S,s),[],'schema accepts send');assert.throws(()=>createPreset(base,s),/Feedback Send/,'generator accepts send');}
for(const [name,edit] of [['channel B',s=>s.controls[0].channel='B'],['bypass',s=>s.controls[0]={block:'return',channel:'A',param:'BYPASS',value:0}],['level 101',s=>s.controls[0].value=101]]){
  const s=structuredClone(fb);edit(s);assert.deepEqual(checkSchema(S,s),[],'schema refuses return: '+name);assert.throws(()=>createPreset(base,s),Error,'generator accepts return: '+name);}
// Both refuse (schema error and generator error).
const both=[
  ['volumePedal min below 0',s=>s.volumePedal={min:-1},2],['volumePedal max above 10',s=>s.volumePedal={max:11},2],['volumePedal unknown key',s=>s.volumePedal={min:1,curve:2},2],
  ['volumePedal empty object',s=>s.volumePedal={},2],['volumePedal false',s=>s.volumePedal=false,2],['volumePedal string min',s=>s.volumePedal={min:'1'},2],
  ['switch 7',s=>s.controlSwitches[0].switch=7,0],['switch 0',s=>s.controlSwitches[0].switch=0,0],['block cab',s=>s.controlSwitches[0].block='cab',0],
  ['param gain',s=>s.controlSwitches[0].param='DISTORT_GAIN',0],['invert string',s=>s.controlSwitches[0].invert='yes',0],['channel E',s=>s.controlSwitches[0].channel='E',0],
  ['extra key',s=>s.controlSwitches[0].min=0,0],['nine bindings',s=>s.controlSwitches=Array(9).fill(s.controlSwitches[0]),0],['empty list',s=>s.controlSwitches=[],0],
  ['duplicate out3',s=>s.duplicate=['out3'],6],['out3 cell',s=>s.grid.rows[3][11]='out3',6],
  ['cs scene 9',s=>s.controlSwitchScenes[0].scene=9,1],['cs state on',s=>s.controlSwitchScenes[0].state='on',1],['cs scene extra key',s=>s.controlSwitchScenes[0].x=1,1],
  ['cs state array',s=>s.controlSwitchScenes[0].state=['ON'],1],['cs state nested array',s=>s.controlSwitchScenes[0].state=[['LAST']],1],
  ['footswitch function array',s=>s.footswitches[0].function=['latching'],1],['footswitch function nested array',s=>s.footswitches[0].function=[['momentary']],1],
  ['footswitch layout 10',s=>s.footswitches[0].layout=10,1],['footswitch switch 13',s=>s.footswitches[0].switch=13,1],['footswitch toggle',s=>s.footswitches[0].function='toggle',1],
  ['footswitch cs 7',s=>s.footswitches[0].controlSwitch=7,1],['25 footswitches',s=>s.footswitches=Array.from({length:25},(_,i)=>({layout:1+Math.floor(i/12),switch:1+i%12,function:'latching',controlSwitch:2})),1],['cs scenes without bindings',s=>delete s.controlSwitches,1],
  ['curve unknown key',s=>s.volumePedal.curve.offValuePercent=50,4],['curve start above 100',s=>s.volumePedal.curve.startPercent=101,4],['curve scale below 0.1',s=>s.volumePedal.curve.scale=0.05,4],
  ['curve attack above 10 s',s=>s.volumePedal.curve.attackMs=10001,4],['curve empty',s=>s.volumePedal.curve={},4],['curve string',s=>s.volumePedal.curve.midPercent='50',4]];
for(const [name,edit,i] of both){const s=structuredClone(valid[i]);edit(s);
  assert.notDeepEqual(checkSchema(S,s),[],'schema accepts: '+name);assert.throws(()=>createPreset(base,s),Error,'generator accepts: '+name);}
// Generator-only rules: the schema accepts the shape, the generator refuses the content.
const generatorOnly=[
  ['volumePedal min == max',s=>s.volumePedal={min:5,max:5},3],['same target twice',s=>s.controlSwitches=[s.controlSwitches[0],{...s.controlSwitches[0],switch:5}],0],
  ['out2 without duplicate',s=>s.duplicate=[],6],['out2 unlinked',s=>s.grid.links=[],6],
  ['cs scene on an unbound switch',s=>s.controlSwitchScenes[0].switch=5,1],['footswitch on an unbound switch',s=>s.footswitches[0].controlSwitch=4,1],['same cs scene twice',s=>s.controlSwitchScenes.push({...s.controlSwitchScenes[0]}),1],['same footswitch twice',s=>s.footswitches.push({...s.footswitches[0]}),1],
  ['static write to a bound switch',s=>{s.allow=['enum-labels'];s.controls=[{block:'amp',channel:'A',param:'DISTORT_BOOST',value:'ON'}];},0]];
for(const [name,edit,i] of generatorOnly){const s=structuredClone(valid[i]);edit(s);
  assert.deepEqual(checkSchema(S,s),[],'schema refuses (move it to the both-list): '+name);assert.throws(()=>createPreset(base,s),Error,'generator accepts: '+name);}
assert.ok(checkSchema(S,{composer,layout:{row2:['amp','cab'],row3:[]},unknownField:1}).some(e=>/unknownField/.test(e)),'unknown top-level field refused');
console.log(JSON.stringify({passed:true,examples,newFieldSpecs:valid.length,multidelayValidSpecs:5,multidelayRefusals:4,controllersRefusals:{both:ctlBoth.length,generatorOnly:ctlGenerator.length},refusedByBoth:both.length,generatorOnly:generatorOnly.map(x=>x[0]),historicalExceptions:[...HISTORICAL]}));

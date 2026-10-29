// The bundled sound schema (fm3-sound.schema.json) and the generator decide the same way for the 0.3.30-0.3.32
// fields (controlSwitches, volumePedal {min,max}, Wah + Volume, out2) and for every current example spec.
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
  {composer,volumePan:true,volumePedal:true,layout:{row2:['drive','amp','cab'],row3:['volpan','delay','reverb']}},
  {composer,volumePan:true,volumePedal:{min:2.5,max:7.5},layout:{row2:['drive','amp','cab'],row3:['volpan','delay','reverb']}},
  {composer:wahComposer,volumePan:true,volumePedal:{max:8},layout:{row2:['wah','drive','amp','cab'],row3:['volpan','delay','reverb']},controlSwitches:[{switch:2,block:'amp',param:'DISTORT_CUT',channel:'ALL'}]},
  {composer,grid:{rows:[E,['in1','drive','-','-','amp','cab','-','-','-','-','-','send'],['return','delay','-','-','reverb','-','-','-','-','-','-','out1'],[...Array(11).fill(''),'out2']],links:[{row:4,col:12,from:[3]}]},duplicate:['out2']}];
for(const s of valid)ok(s);
// Both refuse (schema error and generator error).
const both=[
  ['volumePedal min below 0',s=>s.volumePedal={min:-1},1],['volumePedal max above 10',s=>s.volumePedal={max:11},1],['volumePedal unknown key',s=>s.volumePedal={min:1,curve:2},1],
  ['volumePedal empty object',s=>s.volumePedal={},1],['volumePedal false',s=>s.volumePedal=false,1],['volumePedal string min',s=>s.volumePedal={min:'1'},1],
  ['switch 7',s=>s.controlSwitches[0].switch=7,0],['switch 0',s=>s.controlSwitches[0].switch=0,0],['block cab',s=>s.controlSwitches[0].block='cab',0],
  ['param gain',s=>s.controlSwitches[0].param='DISTORT_GAIN',0],['invert string',s=>s.controlSwitches[0].invert='yes',0],['channel E',s=>s.controlSwitches[0].channel='E',0],
  ['extra key',s=>s.controlSwitches[0].min=0,0],['nine bindings',s=>s.controlSwitches=Array(9).fill(s.controlSwitches[0]),0],['empty list',s=>s.controlSwitches=[],0],
  ['duplicate out3',s=>s.duplicate=['out3'],4],['out3 cell',s=>s.grid.rows[3][11]='out3',4]];
for(const [name,edit,i] of both){const s=structuredClone(valid[i]);edit(s);
  assert.notDeepEqual(checkSchema(S,s),[],'schema accepts: '+name);assert.throws(()=>createPreset(base,s),Error,'generator accepts: '+name);}
// Generator-only rules: the schema accepts the shape, the generator refuses the content.
const generatorOnly=[
  ['volumePedal min == max',s=>s.volumePedal={min:5,max:5},2],['same target twice',s=>s.controlSwitches=[s.controlSwitches[0],{...s.controlSwitches[0],switch:5}],0],
  ['out2 without duplicate',s=>s.duplicate=[],4],['out2 unlinked',s=>s.grid.links=[],4],
  ['static write to a bound switch',s=>{s.allow=['enum-labels'];s.controls=[{block:'amp',channel:'A',param:'DISTORT_BOOST',value:'ON'}];},0]];
for(const [name,edit,i] of generatorOnly){const s=structuredClone(valid[i]);edit(s);
  assert.deepEqual(checkSchema(S,s),[],'schema refuses (move it to the both-list): '+name);assert.throws(()=>createPreset(base,s),Error,'generator accepts: '+name);}
assert.ok(checkSchema(S,{composer,layout:{row2:['amp','cab'],row3:[]},unknownField:1}).some(e=>/unknownField/.test(e)),'unknown top-level field refused');
console.log(JSON.stringify({passed:true,examples,newFieldSpecs:valid.length,refusedByBoth:both.length,generatorOnly:generatorOnly.map(x=>x[0]),historicalExceptions:[...HISTORICAL]}));

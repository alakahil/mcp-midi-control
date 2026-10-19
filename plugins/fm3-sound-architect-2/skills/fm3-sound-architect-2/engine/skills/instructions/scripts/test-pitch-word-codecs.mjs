// Independent stored-word oracles and complete SYX/TXT path. No device I/O.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {findParam,loadDictionary,encodeValue,decodeValue,writeTableControls,OPT_IN_STATUSES} from './fm3-table-encoder.mjs';
import {applyTableControls,scanRecords} from './fm3-layout.mjs';
import {typeApplicability,readTypeState} from './fm3-type-applicability.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {createPreset} from './fm3-preset.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const signed=[15,16,17,18,...Array.from({length:16},(_,i)=>77+i)],counts=[63,71,72,73,74],enums=[35,76];
const pids=[...signed,...counts,...enums];let domainChecks=0,rejections=0;
const reject=(p,v)=>{assert.throws(()=>encodeValue(p,v),Error);rejections++;};
for(const pid of signed){const p=findParam('pitch',pid);
 for(const [v,raw] of [[-24,65512],[-12,65524],[-3,65533],[-2,65534],[-1,65535],[0,0],[1,1],[12,12],[24,24]]){assert.equal(encodeValue(p,v),raw);assert.equal(decodeValue(p,raw),v);}
 for(let v=-24;v<=24;v++){const b=Buffer.alloc(2);b.writeInt16LE(v);assert.equal(encodeValue(p,v),b.readUInt16LE());assert.equal(decodeValue(p,b.readUInt16LE()),v);domainChecks++;}
 for(const v of [-25,25,0.5,-0.5,'-1',true,null,NaN,Infinity,-Infinity])reject(p,v);
 for(const raw of [25,32767,32768,65511,-1,65536,1.5,NaN])assert.equal(decodeValue(p,raw),undefined);
}
for(const [pid,lo,hi] of [[63,4,8],[71,0,31],[72,0,31],[73,2,16],[74,1,31]]){const p=findParam('pitch',pid);
 for(let v=lo;v<=hi;v++){assert.equal(encodeValue(p,v),v);assert.equal(decodeValue(p,v),v);domainChecks++;}
 for(const v of [lo-1,hi+1,lo+0.5,'4',true,null,NaN,Infinity])reject(p,v);
 assert.equal(decodeValue(p,65535),undefined);
}
const tracking=findParam('pitch','TRACKMODE'),tempo=findParam('pitch','TEMPO');
assert.equal(encodeValue(tracking,' NOTES '),1);assert.equal(encodeValue(tracking,'chords'),2);assert.equal(decodeValue(tracking,1),'NOTES');assert.equal(decodeValue(tracking,2),'CHORDS');
assert.equal(encodeValue(tempo,'1/64 TRIP'),1);assert.equal(encodeValue(tempo,'1/16'),8);assert.equal(encodeValue(tempo,'63/64'),78);
for(const p of [tracking,tempo]){
 for(let id=1;id<=p.max;id++){assert.equal(encodeValue(p,id),id);assert.equal(encodeValue(p,p.enum[id-1]),id);assert.equal(decodeValue(p,id),p.enum[id-1]);domainChecks++;}
 for(const v of [0,p.max+1,1.5,'OFF','NONE',null,true])reject(p,v);
 assert.equal(decodeValue(p,0),undefined);
}
// Other tempo lists retain NONE=0; the overlay changes exactly 27 definitions.
assert.equal(encodeValue(findParam('pitch','DTEMPO1'),'NONE',{allow:['enum-labels']}),0);
assert.equal(loadDictionary().params.filter(p=>p.encodingEvidence).length,27);
const factory=JSON.parse(read('references/fm3-pitch-factory-evidence.json'));
let factoryWords=0;
for(const s of factory.specimens)for(const ch of Object.values(s.channels))for(const [pid,raw] of Object.entries(ch.words)){
 const p=findParam('pitch',Number(pid)),value=p.kind==='enum'?raw:raw>=32768?raw-65536:raw;
 assert.equal(encodeValue(p,value),raw,s.name+'/'+pid);factoryWords++;
}
assert.equal(factoryWords,432);
// Experimental/raw cannot inject a normalized midpoint or a zero enum ID.
const base=read('examples/FM3_PITCH_ABCD_TEST_export.syx'),body=Buffer.from(inspectStructure(base).raw.body),rec=scanRecords(body).records.find(r=>r.family==='pitch');
let rawSignedChecks=0;
for(const channel of 'ABCD')for(const pid of signed){const p=findParam('pitch',pid);
 const c={block:'pitch',channel,param:pid,raw:32767};
 assert.throws(()=>writeTableControls(base,{name:'NO NORMALIZED',controls:[c]},{experimental:true}),/outside allowed preset domain/);
 const state=readTypeState(p,x=>body.readUInt16LE(rec.start+2*('ABCD'.indexOf(channel)*rec.words+x)));
 if(typeApplicability(p,state).allowed){const result=writeTableControls(base,{name:'MINUS ONE RAW',controls:[{...c,raw:65535}]},{experimental:true});assert.equal(result.writes[0].display,-1);rawSignedChecks++;}
}
assert.ok(rawSignedChecks>0);
for(const pid of enums)assert.throws(()=>writeTableControls(base,{name:'NO ZERO ID',controls:[{block:'pitch',channel:'A',param:pid,raw:0}]},{experimental:true}),/outside allowed preset domain/);
// Invalid controls fail before any mutation or callback.
for(const value of [-25,-0.1,25]){const b=Buffer.from(body),original=Buffer.from(b);let callbacks=0;
 const controls=[{block:'amp',channel:'A',param:'MID',value:7},{block:'pitch',channel:'A',param:'SHIFT1',value}];
 for(const list of [controls,[...controls].reverse()]){assert.throws(()=>applyTableControls(b,list,{allow:[...OPT_IN_STATUSES]},()=>callbacks++));assert.deepEqual(b,original);assert.equal(callbacks,0);}
}
const spec=JSON.parse(read('examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json'));
spec.composer.pitchChannels=[{channel:'A',type:'Virtual Capo'},{channel:'B',type:'Quad Chromatic'},{channel:'C',type:'Arpeggiator'},{channel:'D',type:'Custom Shifter'}];
spec.layout={row2:['drive','phaser','amp','cab'],row3:['pitch','delay','reverb']};spec.allow=[...OPT_IN_STATUSES];
const control=(channel,param,value)=>({block:'pitch',channel,param,value});
spec.controls=[control('A','SHIFT1',-1),control('A','TRACKMODE','CHORDS'),control('B','SHIFT1',-24),control('B','SHIFT2',-12),control('B','SHIFT3',12),control('B','SHIFT4',24),control('C','NUMSTEPS',16),control('C','NUMREPEATS',31),control('C','TEMPO','1/16'),control('D','CUSTOMSCALE1',31),control('D','CUSTOMSCALE2',30),...Array.from({length:16},(_,i)=>control('C','STEP'+(i+1),[-24,-12,-3,-2,-1,0,1,12,24][i%9]))];
const result=createPreset(read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec),final=Buffer.from(inspectStructure(result.syx).raw.body),r=scanRecords(final).records.find(r=>r.family==='pitch');
for(const c of spec.controls){const p=findParam('pitch',c.param),raw=final.readUInt16LE(r.start+2*('ABCD'.indexOf(c.channel)*r.words+p.param));assert.equal(raw,encodeValue(p,c.value));const displayed=result.report.controls.find(w=>w.channel===c.channel&&w.pid===p.param);assert.equal(displayed.display,decodeValue(p,raw));}
assert.equal(final.readUInt16LE(r.start+30),65535);assert.ok(result.txt.includes('-1 nihet'));assert.ok(result.txt.includes('global scale contents'));assert.ok(result.txt.includes('1/16'));assert.ok(result.txt.includes('skaalaastet'));assert.ok(result.txt.includes('not a verified displayed repeat count'));
assert.ok(!result.report.parameters.some(p=>/^PITCH_NOTE[2-8]$/.test(p.name)));
console.log(JSON.stringify({passed:true,fields:pids.length,domainChecks,rejections,factoryWords,rawSignedChecks,finalPresetControls:spec.controls.length,deviceIO:false,newHardwareMeasurements:false}));

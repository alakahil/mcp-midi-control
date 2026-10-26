// Point 6: independent field/address anchors plus complete bounded software domains.
// Synthetic cases are never counted as hardware observations.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadDictionary,findParam,encodeValue,decodeValue,FAMILY_BY_SLUG,DEFAULT_STATUSES,OPT_IN_STATUSES} from './fm3-table-encoder.mjs';
import {readTypeState,typeApplicability,validateTypeWrites} from './fm3-type-applicability.mjs';
import {auditModifierTargetType} from './fm3-modifier-type-audit.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {editRecords} from './fm3-grid.mjs';
import {scanRecords,applyTableControls,applyBlockScenes,CHANNELS} from './fm3-layout.mjs';
import {applySceneMidi,describeSceneMidi,validateSceneMidi} from './fm3-scene-midi.mjs';
import {INSERT_TYPE_PID} from './fm3-insert-blocks.mjs';
import {auditCorpus} from './fm3-corpus-audit.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const policy=JSON.parse(read('references/fm3-insert-applicability.json'));
const dictionary=loadDictionary().params,allow=[...OPT_IN_STATUSES],opts={allow};
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const bodyOf=b=>Buffer.from(inspectStructure(b).raw.body);
const counters={parameters:0,scalarChecks:0,visibilityCases:0,typeChannelCases:0,writes:0,readOnlyCases:0,rejections:0,sceneMidiCases:0};
const rejects=(fn,re)=>{assert.throws(fn,re);counters.rejections++;};
const anchors=[['MIXER',0,[0]],['MIXER',4,[]],['MIXER',10,[]],['MIXER',17,[0]],
 ['MULTIPLEXER',0,[0]],['MULTIPLEXER',4,[]],['FORMANT',10,[]],['FORMANT',11,[0]],
 ['MEGATAP',28,[]],['MEGATAP',29,[0]],['RINGMOD',10,[]],['RINGMOD',12,[0]],
 ['RESONATOR',9,[0]],['RESONATOR',3,[1]],['RESONATOR',1,[1]],['RESONATOR',4,[0,1]],
 ['LOOPER',7,[]],['LOOPER',8,[]],['LOOPER',12,[]],['LOOPER',22,[]],['LOOPER',23,[0]],
 ['MULTITAP',59,[]],['MULTITAP',60,[]],['MULTITAP',114,[]],['MULTITAP',77,[1,2]]];
for(const [family,pid,types] of anchors){
 const p=dictionary.find(p=>p.family===family&&p.param===pid),f=policy.families[family];
 for(let type=0;type<(f.typeLabels?.length??1);type++){
  assert.equal(typeApplicability(p,{type}).allowed,types.includes(type),family+':'+pid+' type '+type);counters.visibilityCases++;
 }
}
assert.deepEqual(Object.keys(INSERT_TYPE_PID).sort(),['gate','plex','resonator','tentap']);
const supported=p=>['linear','log','knob','integer','enum'].includes(p.kind)&&[...DEFAULT_STATUSES,...OPT_IN_STATUSES].includes(p.status);
function valueAt(p,n){
 if(p.kind==='integer')return Math.round(p.min+n*(p.max-p.min))*(p.integerScale??1);
 const mult=p.displayMultiplier||1;
 return (p.kind==='knob'?n:p.kind==='log'?Math.exp((1-n)*Math.log(p.min)+n*Math.log(p.max)):p.min+n*(p.max-p.min))*mult;
}
for(const [family,f] of Object.entries(policy.families)){
 const params=dictionary.filter(p=>p.family===family),slug=Object.keys(FAMILY_BY_SLUG).find(s=>FAMILY_BY_SLUG[s]===family);
 const channels=CHANNELS[params[0].block]??4;
 const body=slug?bodyOf(editRecords(base,{add:[slug]}).syx):null;
 const record=body?scanRecords(body).records.find(r=>r.block===params[0].block):null;
 assert.equal(params.length,Object.keys(f.parameters).length);
 if(record)assert.equal(record.channels,channels);
 for(const p of params){
  counters.parameters++;
  if(supported(p)){
   if(p.kind==='enum'){
    for(let n=0;n<p.enum.length;n++){
     assert.equal(encodeValue(p,n,opts),n);assert.equal(decodeValue(p,n),p.enum[n]);counters.scalarChecks+=2;
    }
    for(const x of [-1,p.enum.length,.5,'__INVALID_ENUM__'])rejects(()=>encodeValue(p,x,opts),Error);
   }else{
    for(const n of [0,.25,.5,.75,1]){
     const value=valueAt(p,n),word=encodeValue(p,value,opts);
     const expected=p.kind==='integer'?((Math.round(value/(p.integerScale??1))+65536)%65536):Math.round(n*65534);
     assert.ok(Math.abs(word-expected)<=1,p.name+': independent position');counters.scalarChecks++;
    }
    for(const x of [NaN,Infinity,-Infinity,null,true,'1',valueAt(p,0)-Math.max(1,Math.abs(valueAt(p,0))),valueAt(p,1)+Math.max(1,Math.abs(valueAt(p,1)))])rejects(()=>encodeValue(p,x,opts),Error);
   }
  }else rejects(()=>encodeValue(p,0,opts),Error);
  for(const type of [-1,f.typeLabels?.length??1,NaN,Infinity])assert.equal(typeApplicability(p,{type}).allowed,false);
  for(let type=0;type<(f.typeLabels?.length??1);type++)for(let ch=0;ch<channels;ch++){
   const app=typeApplicability(p,{type});counters.typeChannelCases++;
   if(!body){assert.equal(family,'MULTITAP');counters.readOnlyCases++;continue;}
   const b=Buffer.from(body),start=record.start+ch*record.words*2,offset=start+2*p.param;
   if(f.selectorPid!==null)b.writeUInt16LE(type,start+2*f.selectorPid);
   const before=Buffer.from(b),w={block:slug,pid:p.param,name:p.name,label:p.label,channel:'ABCD'[ch],offset,raw:b.readUInt16LE(offset)};
   if(app.allowed)validateTypeWrites(b,[w]);else rejects(()=>validateTypeWrites(b,[w]),/not applicable/);
   assert.ok(b.equals(before),'Visibility preflight mutated input');
   const audit=auditModifierTargetType(b,{effectId:p.block,channel:ch+1},p,record);
   assert.equal(audit.channels.length,channels);assert.equal(audit.channels[ch].status,app.allowed?'available':'excluded');
   assert.equal(audit.modifierSupportVerified,false);
   if(!app.allowed||!supported(p))continue;
   // Existing tempo and modifier gates stay independent: isolate the visibility
   // check above, then exercise a scalar write only in an unlocked final state.
   for(const lock of JSON.parse(read('references/fm3-insert-tempo-locks.json')).tempoLocks.filter(x=>x.family===family))b.writeUInt16LE(0,start+2*lock.tempoPid);
   const value=p.param===f.selectorPid?type:p.kind==='enum'?0:valueAt(p,.5);
   const saved=Buffer.from(b),writes=applyTableControls(b,[{block:slug,channel:'ABCD'[ch],param:p.param,value}],opts);
   assert.equal(writes.length,1);assert.equal(b.readUInt16LE(offset),encodeValue(p,value,opts));
   for(let i=0;i<b.length;i++)if(i!==offset&&i!==offset+1)assert.equal(b[i],saved[i],'Collateral byte '+i);
   counters.writes++;
  }
 }
 if(body&&channels<4){
  const p=params.find(supported),saved=Buffer.from(body);let callbacks=0;
  for(let ch=channels;ch<4;ch++){
   rejects(()=>applyTableControls(body,[{block:slug,channel:'ABCD'[ch],param:p.param,value:p.kind==='enum'?0:valueAt(p,.5)}],opts,()=>callbacks++),/channel/i);
   const audit=auditModifierTargetType(body,{effectId:p.block,channel:ch+1},p,record);
   assert.equal(audit.scopeKnown,false);assert.ok(audit.channels.every(c=>c.inModifierScope===null));
  }
  assert.ok(body.equals(saved));assert.equal(callbacks,0);
 }
}
assert.equal(counters.parameters,515);
// Final Resonator mode is evaluated after planning, including second instances.
{
 const b=bodyOf(editRecords(editRecords(base,{add:['resonator']}).syx,{duplicate:['resonator2']}).syx);
 const controls=[{block:'resonator2',channel:'B',param:'CHORD',value:0},{block:'resonator2',channel:'B',param:'MODE',value:'CHORDAL'}];
 const a=Buffer.from(b),z=Buffer.from(b);applyTableControls(a,controls,opts);applyTableControls(z,[...controls].reverse(),opts);assert.ok(a.equals(z));
 const saved=Buffer.from(b);let callbacks=0;
 rejects(()=>applyTableControls(b,[...controls,{block:'resonator2',channel:'B',param:'FREQ1',value:440}],opts,()=>callbacks++),/not applicable/);
 assert.ok(b.equals(saved));assert.equal(callbacks,0);
}
// Scene MIDI: each of 64 positions, all 16 channels, every 7-bit number/value.
// Independent offsets and full byte comparison check reserved and unrelated words.
const record={eid:190,words:257,channels:1,start:8},seed=Buffer.alloc(530,0xa5);
for(let k=0;k<64;k++)for(let n=0;n<128;n++)for(const type of ['CC','PC','NONE']){
 const channel=n%16+1,c={scene:Math.floor(k/8)+1,command:k%8+1,type,...(type==='CC'?{channel,number:n,value:127-n}:type==='PC'?{channel,program:n}:{})};
 const b=Buffer.from(seed),expected=Buffer.from(seed),allowed=[];
 expected.writeUInt16LE(type==='CC'?1:type==='PC'?2:0,8+2*k);
 if(type!=='NONE'){
  expected.writeUInt16LE(channel-1,8+2*(64+k));expected.writeUInt16LE(type==='PC'?n:127-n,8+2*(192+k));
  if(type==='CC')expected.writeUInt16LE(n,8+2*(128+k));
 }
 applySceneMidi(b,record,[c],(offset,count)=>allowed.push([offset,count]));assert.ok(b.equals(expected));
 assert.equal(allowed.length,type==='CC'?4:type==='PC'?3:1);counters.sceneMidiCases++;
}
// All 64 commands in one plan; permutation invariance and late invalid-entry atomicity.
const commands=Array.from({length:64},(_,k)=>({scene:Math.floor(k/8)+1,command:k%8+1,type:'CC',channel:k%16+1,number:k,value:127-k}));
const a=Buffer.from(seed),b=Buffer.from(seed);applySceneMidi(a,record,commands);applySceneMidi(b,record,[...commands].reverse());assert.ok(a.equals(b));assert.deepEqual(describeSceneMidi(a,record),commands);
for(const [field,values] of Object.entries({scene:[0,9,.5,NaN,Infinity,null,'1'],command:[0,9,.5,NaN,null,'1'],channel:[0,17,.5,NaN,null,'1'],number:[-1,128,.5,NaN,null,'1'],value:[-1,128,.5,NaN,'1']})){
 for(const value of values){const target=Buffer.from(seed);let callbacks=0;
  // null channel/value use documented defaults; explicit malformed coordinates do not.
  if(field==='channel'&&value===null)continue;
  rejects(()=>applySceneMidi(target,record,[commands[0],{...commands[63],[field]:value}],()=>callbacks++),Error);
  assert.ok(target.equals(seed));assert.equal(callbacks,0);
 }
}
for(const start of [-2,1,.5,NaN,Infinity,18,1e20]){
 const b=Buffer.from(seed);let callbacks=0;
 rejects(()=>applySceneMidi(b,{...record,start},[commands[0]],()=>callbacks++),/outside|unaligned/);
 assert.ok(b.equals(seed));assert.equal(callbacks,0);
}
rejects(()=>validateSceneMidi([...commands,commands[0]]),/1..64/);
rejects(()=>validateSceneMidi([commands[0],commands[0]]),/twice/);
{
 const sparse=[commands[0]];sparse.length=2;const b=Buffer.from(seed);let callbacks=0;
 rejects(()=>applySceneMidi(b,record,sparse,()=>callbacks++),/must be an object/);assert.ok(b.equals(seed));assert.equal(callbacks,0);
}
// Corpus inputs stay byte-identical, filenames/names stay out of derived reports,
// aliases are deduplicated, malformed inputs and symlinks never become successes.
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-corpus-test-'));
try{
 fs.mkdirSync(path.join(temp,'nested'));
 fs.writeFileSync(path.join(temp,'private-title.syx'),base);fs.writeFileSync(path.join(temp,'nested','alias.SYX'),base);
 const bad=Buffer.from(base);bad[20]^=1;fs.writeFileSync(path.join(temp,'bad.syx'),bad);
 fs.writeFileSync(path.join(temp,'bank.syx'),Buffer.alloc(123));fs.symlinkSync(path.join(temp,'private-title.syx'),path.join(temp,'link.syx'));
 const report=auditCorpus(temp);
 assert.equal(report.files,4);assert.equal(report.uniqueSizedInputs,2);assert.equal(report.duplicates,1);
 assert.equal(report.unsupportedSize,1);assert.equal(report.skippedSymlinks,1);
 assert.equal(report.summary.supportedStructure,1);assert.equal(report.summary.unsupportedOrInvalid,1);
 assert.ok(!JSON.stringify(report).includes('private-title'));assert.ok(!JSON.stringify(report).includes('JB RHYTHM'));
 assert.ok(fs.readFileSync(path.join(temp,'private-title.syx')).equals(base));assert.ok(fs.readFileSync(path.join(temp,'bad.syx')).equals(bad));
 rejects(()=>auditCorpus(path.join(temp,'link.syx')),/real directory/);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,...counters,deviceIO:false,newHardwareMeasurements:false}));

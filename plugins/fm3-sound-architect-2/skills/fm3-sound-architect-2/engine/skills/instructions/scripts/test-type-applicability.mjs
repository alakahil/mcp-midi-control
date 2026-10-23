// Independent semantic cases + all captured type templates. Offline only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {findParam,writeTableControls,encodeValue,DEFAULT_STATUSES,OPT_IN_STATUSES,loadDictionary} from './fm3-table-encoder.mjs';
import {typeApplicability} from './fm3-type-applicability.mjs';
import {applyTableControls,scanRecords} from './fm3-layout.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {createPreset} from './fm3-preset.mjs';
import {finalSoundState} from './fm3-final-state.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3.syx'),original=Buffer.from(base);
const c=(block,channel,param,value)=>({block,channel,param,value});
const type=(block,channel,value)=>c(block,channel,'TYPE',value);
const write=controls=>writeTableControls(base,{name:'TYPE POLICY CHECK',controls},{allow:[...OPT_IN_STATUSES]});
const low=[2,3,5,6,7,8,13,14,21];
for(let t=0;t<27;t++){
  assert.equal(typeApplicability(findParam('chorus','BASS'),t).allowed,low.includes(t));
  assert.equal(typeApplicability(findParam('chorus','TREBLE'),t).allowed,[...low,20].includes(t));
  assert.equal(typeApplicability(findParam('chorus','DELAYRANGE'),t).allowed,![15,16,17].includes(t));
}
assert.equal(typeApplicability(findParam('chorus','TREBLE'),20).label,'EQ');
assert.equal(typeApplicability(findParam('drive','TONE'),19).allowed,false);
assert.equal(typeApplicability(findParam('drive','TONE'),6).allowed,true);
for(const channel of 'ABCD'){
  const controls=[c('chorus',channel,30,5),type('chorus',channel,'Analog Mono')];
  const a=write(controls),b=write([...controls].reverse());
  assert.deepEqual(a.syx,b.syx,'Final type must be independent of request order');
  assert.throws(()=>write([type('chorus',channel,'Digital Mono'),c('chorus',channel,'BASS',5)]),/not applicable.*Digital Mono/);
  assert.throws(()=>write([c('drive',channel,'TONE',5),type('drive',channel,'BB Pre')]),/not applicable.*BB Pre/);
}
assert.throws(()=>write([type('chorus','A',2),type('chorus','B',0),c('chorus','B',30,5)]),/chorus B.*not applicable/);
assert.throws(()=>writeTableControls(base,{name:'RAW BYPASS',controls:[type('drive','A',19),{block:'drive',channel:'A',param:2,raw:32767}]},{experimental:true}),/not applicable/);
assert.throws(()=>writeTableControls(base,{name:'BAD TYPE',controls:[{block:'chorus',channel:'A',param:0,raw:65534}]},{experimental:true}),/unknown/);
assert.deepEqual(base,original);

// Direct in-place entry point: a late validation failure must not apply earlier edits/callbacks.
const body=Buffer.from(inspectStructure(base).raw.body),before=Buffer.from(body);let callbacks=0;
const invalid=[c('amp','A','MID',7),type('drive','D',19),c('drive','D',2,5)];
assert.throws(()=>applyTableControls(body,invalid,{},()=>callbacks++),/not applicable/);
assert.deepEqual(body,before);assert.equal(callbacks,0);
const direct=[c('chorus','C','BASS',5),type('chorus','C','Analog Mono')];
const forward=Buffer.from(before),reverse=Buffer.from(before);
applyTableControls(forward,direct);applyTableControls(reverse,[...direct].reverse());
assert.deepEqual(forward,reverse);
assert.throws(()=>applyTableControls(body,[c('amp','A','MID',7),c('amp','B','MID',null)],{},()=>callbacks++),/numeric/);
assert.deepEqual(body,before);assert.equal(callbacks,0);

// Reuse every existing channel template; no new captures or raw type-only model fabrication.
// Stored hidden words are retained. Explicit writes are accepted or rejected by the separate policy.
let templates=0,accepted=0,rejected=0;
const records=scanRecords(before).records;
for(const [slug,family] of [['chorus','CHORUS'],['drive','FUZZ']]){
  const lib=JSON.parse(read('references/'+slug+'-library.json')),r=records.find(r=>r.family===slug);
  const params=loadDictionary().params.filter(p=>p.family===family&&[...DEFAULT_STATUSES,...OPT_IN_STATUSES].includes(p.status));
  for(const m of lib.models){
    assert.equal(m.words[0],m.binaryId);
    const sample=Buffer.from(before);
    for(let ch=0;ch<4;ch++)m.words.forEach((v,pid)=>sample.writeUInt16LE(v,r.start+2*(ch*r.words+pid)));
    const controls=[];
    for(const p of params){
      const value=p.kind==='enum'?(p.param===0?m.binaryId:0):p.kind==='knob'?(p.displayMultiplier||1)/2:p.kind==='integer'?Math.round((p.min+p.max)/2):(p.min+p.max)/2*(p.displayMultiplier||1);
      const a=typeApplicability(p,m.binaryId);
      for(const ch of 'ABCD'){
        const ctl=c(slug,ch,p.param,value);
        if(a.allowed){controls.push(ctl);accepted++;}
        else{const saved=Buffer.from(sample);assert.throws(()=>applyTableControls(sample,[ctl],{allow:[...OPT_IN_STATUSES]}),/not applicable/);assert.deepEqual(sample,saved);rejected++;}
      }
    }
    const writes=applyTableControls(sample,controls,{allow:[...OPT_IN_STATUSES]});
    const allowed=new Set(writes.flatMap(w=>[w.offset,w.offset+1]));
    for(const w of writes)assert.equal(sample.readUInt16LE(w.offset),encodeValue(findParam(w.block,w.pid),w.value,{allow:[...OPT_IN_STATUSES]}));
    const template=Buffer.from(before);for(let ch=0;ch<4;ch++)m.words.forEach((v,pid)=>template.writeUInt16LE(v,r.start+2*(ch*r.words+pid)));
    for(let i=0;i<sample.length;i++)if(!allowed.has(i))assert.equal(sample[i],template[i]);
    templates++;
  }
}
// Full composer chooses the type before table controls. BB Pre has no generic Tone control.
const newlook=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const spec=JSON.parse(read('examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json'));
spec.composer.driveChannels=[{channel:'A',type:'BB Pre'}];
spec.controls=[c('drive','A','TONE',5)];
assert.throws(()=>createPreset(newlook,spec),/not applicable.*BB Pre/);
spec.controls=[c('drive','A','LEVEL',2)];
const valid=createPreset(newlook,spec);
assert.ok(!valid.report.parameters.some(p=>p.block==='drive'&&p.channel==='A'&&p.name==='FUZZ_TONE'));
assert.ok(valid.report.channels.find(b=>b.block==='drive').channels[0].words.length===44);
const eq=write([type('chorus','A',20),c('chorus','A',31,5)]);
const final=finalSoundState(eq.syx,eq.writes);
assert.equal(final.controls.find(w=>w.name==='CHORUS_TREBLE').label,'EQ');
assert.ok(!final.parameters.some(p=>p.block==='chorus'&&p.channel==='A'&&p.name==='CHORUS_BASS'));
console.log(JSON.stringify({passed:true,templates,channels:'ABCD',acceptedWrites:accepted,rejectedWrites:rejected,orderIndependent:true,atomicValidation:true,composerFinalType:true,deviceIO:false}));

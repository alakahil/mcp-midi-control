// All captured templates; edited bodies are software fixtures, not new measurements.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadDictionary,findParam,writeTableControls,OPT_IN_STATUSES,DEFAULT_STATUSES,encodeValue} from './fm3-table-encoder.mjs';
import {typeApplicability,readTypeState,templateOnlyParameter} from './fm3-type-applicability.mjs';
import {applyTableControls,scanRecords} from './fm3-layout.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {createPreset} from './fm3-preset.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3.syx'),before=Buffer.from(inspectStructure(base).raw.body);
const records=scanRecords(before).records,dict=loadDictionary().params,opts={allow:[...OPT_IN_STATUSES]};
const families={flanger:'FLANGER',phaser:'PHASER',compressor:'COMP'};
const libs=Object.fromEntries(Object.keys(families).map(s=>[s,JSON.parse(read('references/'+s+'-library.json'))]));
const record=slug=>records.find(r=>r.family===slug);
const ctl=(block,channel,param,value)=>({block,channel,param,value});
const valueFor=p=>p.kind==='enum'?0:p.kind==='knob'?(p.displayMultiplier||1)/2:p.kind==='integer'?Math.round((p.min+p.max)/2):(p.min+p.max)/2*(p.displayMultiplier||1);
function fixture(slug,m){const body=Buffer.from(before),r=record(slug);for(let ch=0;ch<4;ch++)m.words.forEach((v,pid)=>body.writeUInt16LE(v,r.start+2*(ch*r.words+pid)));return body;}
const policy=(slug,p,body,ch=0)=>typeApplicability(p,readTypeState(p,pid=>body.readUInt16LE(record(slug).start+2*(ch*record(slug).words+pid))));
let templates=0,accepted=0,rejected=0,templateOnly=0;
for(const [slug,lib] of Object.entries(libs)){
  const params=dict.filter(p=>p.family===families[slug]&&[...DEFAULT_STATUSES,...OPT_IN_STATUSES].includes(p.status));
  for(const m of lib.models){
    const body=fixture(slug,m),original=Buffer.from(body),controls=[];
    if(slug==='phaser'){
      for(const n of ['MANUAL','FMIN','FMAX','LFOTYPE','ATTACK','RELEASE'])assert.equal(policy(slug,findParam(slug,n),body).allowed,m.words[17]!==2,m.name+'/'+n);
      for(const n of ['DIRECTION','Q'])assert.equal(policy(slug,findParam(slug,n),body).allowed,m.words[17]===2,m.name+'/'+n);
    }else if(slug==='compressor'){
      const id=m.binaryId;
      for(const n of ['COMPANSION','COMPTIME','COMPMATCH'])assert.equal(policy(slug,findParam(slug,n),body).allowed,id===12,m.name+'/'+n);
      for(const n of ['DYNAMICS','THRESH2'])assert.equal(policy(slug,findParam(slug,n),body).allowed,id===3,m.name+'/'+n);
      assert.equal(policy(slug,findParam(slug,'DELAYTIME'),body).allowed,id!==18);
      assert.equal(policy(slug,findParam(slug,'RATIO'),body).allowed,[0,4,6,8,9,10,11,13,14].includes(id));
      assert.equal(policy(slug,findParam(slug,'TONE'),body).allowed,[2,7,15,16,17,18].includes(id));
    }
    for(const p of params)for(const ch of 'ABCD'){
      const c=ctl(slug,ch,p.param,valueFor(p));
      if(templateOnlyParameter(p)){assert.throws(()=>applyTableControls(body,[c],opts),/full channel template required/);templateOnly++;continue;}
      if(policy(slug,p,body,'ABCD'.indexOf(ch)).allowed){controls.push(c);accepted++;}
      else{assert.throws(()=>applyTableControls(body,[c],opts),/not applicable/);rejected++;}
    }
    assert.deepEqual(body,original);
    const writes=applyTableControls(body,controls,opts),allowed=new Set(writes.flatMap(w=>[w.offset,w.offset+1]));
    for(const w of writes)assert.equal(body.readUInt16LE(w.offset),encodeValue(findParam(w.block,w.pid),w.value,opts));
    for(let i=0;i<body.length;i++)if(!allowed.has(i))assert.equal(body[i],original[i],m.name+': collateral change');
    templates++;
  }
}
assert.equal(templates,67);
// Flanger's current Manual is PID 5; the exact old MANUAL name remains PID 6 (Dry Delay).
for(const [n,pid] of [['MANUAL',5],['FLANGER_MANUAL',5],['DRYDELAY',6],['FLANGER_DRYDELAY',6],['OLD_FLANGER_MANUAL',6],['OLD_FLANGER_DELAYTIME',5],['LPFREQ',19],['HPFREQ',21]])assert.equal(findParam('flanger',n).param,pid,n);
const aliasBody=Buffer.from(before),aliasWrites=applyTableControls(aliasBody,[ctl('flanger','A','MANUAL',2.5),ctl('flanger','A','DRYDELAY',75)],opts);
assert.deepEqual(aliasWrites.map(w=>[w.pid,w.label,w.raw]),[[5,'Manual',16384],[6,'Dry Delay',49151]]);
const aliases=writeTableControls(base,{name:'VERIFIED FLANGER NAMES',controls:[ctl('flanger','D','FLANGER_MANUAL',2.5),ctl('flanger','D','FLANGER_DRYDELAY',75)]},opts);
assert.deepEqual(aliases.writes.map(w=>[w.pid,w.label]),[[5,'Manual'],[6,'Dry Delay']]);
assert.throws(()=>applyTableControls(Buffer.from(before),[ctl('flanger','A','MANUAL',1),ctl('flanger','A','OLD_FLANGER_DELAYTIME',2)],opts),/Duplicate control/);
// Protected selectors and read-only/unused words cannot be written through raw entry points.
for(const [slug,names] of [['flanger',['TYPE',0]],['phaser',['TYPE',0,'MODE',17]],['compressor',['TYPE',12]]])for(const param of names){
  assert.throws(()=>writeTableControls(base,{name:'NO SELECTOR BYPASS',controls:[{block:slug,channel:'A',param,raw:0}]},{experimental:true}),/full channel template required/);
}
for(const [slug,pids] of [['flanger',[15]],['phaser',[15]],['compressor',[24,25,28,29]]])for(const param of pids){
  assert.throws(()=>writeTableControls(base,{name:'NO METER WRITE',controls:[{block:slug,channel:'A',param,raw:0}]},{experimental:true}),/not applicable/);
}
for(const [slug,pid,raw] of [['flanger',0,31],['phaser',0,17],['phaser',17,3],['compressor',12,19]]){
  const body=Buffer.from(before);body.writeUInt16LE(raw,record(slug).start+2*pid);
  assert.throws(()=>applyTableControls(body,[ctl(slug,'A','LEVEL',0)],opts),/unknown or mismatched/);
  applyTableControls(body,[ctl(slug,'B','LEVEL',0)],opts);
}
const inconsistent=fixture('phaser',libs.phaser.models.find(m=>m.name==='Digital Mono'));
inconsistent.writeUInt16LE(2,record('phaser').start+34);
assert.throws(()=>applyTableControls(inconsistent,[ctl('phaser','A','Q',1)],opts),/unknown or mismatched/);
for(const ch of 'ABCD'){
  const body=fixture('compressor',libs.compressor.models.find(m=>m.name==='Compander')),original=Buffer.from(body);let callbacks=0;
  const controls=[ctl('amp','A','MID',7),ctl('compressor',ch,'RATIO',2)];
  for(const plan of [controls,[...controls].reverse()]){
    assert.throws(()=>applyTableControls(body,plan,opts,()=>callbacks++),/not applicable/);
    assert.deepEqual(body,original);assert.equal(callbacks,0);
  }
}
// Full templates remain supported; final guide follows composed models and current labels.
const newlook=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec=JSON.parse(read('examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json'));
spec.composer.phaserChannels=[{channel:'A',type:'Barber Pole'}];
spec.composer.compressorChannels=[{channel:'A',type:'Compander'}];
spec.composer.flangerChannels=[{channel:'A',type:'Digital Mono'}];
spec.layout={row2:['compressor','flanger','drive','phaser','amp','cab'],row3:['delay','reverb']};spec.allow=[...OPT_IN_STATUSES];
spec.controls=[ctl('phaser','A','Q',1),ctl('compressor','A','COMPTIME',valueFor(findParam('compressor','COMPTIME'))),ctl('flanger','A','MANUAL',2.5),ctl('flanger','A','DRYDELAY',75)];
const good=createPreset(newlook,spec);
for(const [slug,names] of [['phaser',['PHASER_MANUAL','PHASER_FMIN','PHASER_LFOTYPE']],['compressor',['COMP_RATIO','COMP_THRESH','COMP_ATTACK','COMP_SIDECHAIN']]])for(const n of names)assert.ok(!good.report.parameters.some(p=>p.block===slug&&p.channel==='A'&&p.name===n));
assert.ok(good.txt.includes('Manual (OLD_FLANGER_DELAYTIME)'));assert.ok(good.txt.includes('Dry Delay (OLD_FLANGER_MANUAL)'));
spec.controls=[ctl('compressor','A','RATIO',2)];assert.throws(()=>createPreset(newlook,spec),/not applicable/);
spec.controls=[ctl('phaser','A','MANUAL',5)];assert.throws(()=>createPreset(newlook,spec),/not applicable/);
console.log(JSON.stringify({passed:true,templates,channels:'ABCD',acceptedWrites:accepted,rejectedWrites:rejected,templateOnlyChecks:templateOnly,deviceIO:false,newHardwareEvidence:false}));

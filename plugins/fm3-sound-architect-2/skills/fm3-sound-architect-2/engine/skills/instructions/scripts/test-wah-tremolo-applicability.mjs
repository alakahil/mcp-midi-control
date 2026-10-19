// Captured templates replayed on software fixtures; no new hardware measurements.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadDictionary,findParam,writeTableControls,OPT_IN_STATUSES,DEFAULT_STATUSES,encodeValue} from './fm3-table-encoder.mjs';
import {typeApplicability,readTypeState,templateOnlyParameter} from './fm3-type-applicability.mjs';
import {applyTableControls,scanRecords} from './fm3-layout.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {createPreset} from './fm3-preset.mjs';
import {generatePreset} from './fm3-generate.mjs';
import {readModifiers} from './fm3-parameter-dependencies.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const newlook=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const bases={wah:read('examples/JB_RHYTHM_LEVEL_MINUS3.syx'),tremolo:read('examples/FM3_TREMOLO_ABCD_TEST_export.syx')};
const inserted=generatePreset(newlook,{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'WAH FIXTURE',wahChannels:[{channel:'A',type:'FAS Wah'}]}).syx;
const before=Object.fromEntries(Object.entries({...bases,wah:inserted}).map(([s,b])=>[s,Buffer.from(inspectStructure(b).raw.body)]));
const records=Object.fromEntries(Object.entries(before).map(([s,b])=>[s,scanRecords(b).records.find(r=>r.family===s)]));
const families={wah:'WAH',tremolo:'TREMOLO'},dict=loadDictionary().params,opts={allow:[...OPT_IN_STATUSES]};
const libs=Object.fromEntries(Object.keys(families).map(s=>[s,JSON.parse(read('references/'+s+'-library.json'))]));
const ctl=(block,channel,param,value)=>({block,channel,param,value});
const valueFor=p=>p.kind==='enum'?0:p.kind==='knob'?(p.displayMultiplier||1)/2:(p.min+p.max)/2*(p.displayMultiplier||1);
function fixture(slug,m){const body=Buffer.from(before[slug]),r=records[slug];for(let ch=0;ch<4;ch++)m.words.forEach((v,pid)=>body.writeUInt16LE(v,r.start+2*(ch*r.words+pid)));return body;}
const policy=(slug,p,body,ch=0)=>typeApplicability(p,readTypeState(p,pid=>body.readUInt16LE(records[slug].start+2*(ch*records[slug].words+pid))));
// NewLook already contains an inactive Wah assignment; do not clear a modifier to make tests pass.
assert.ok(readModifiers(before.wah).every(m=>!m.active&&!m.uncertain));
let templates=0,accepted=0,rejected=0,templateOnly=0;
for(const [slug,lib] of Object.entries(libs))for(const m of lib.models){
  const body=fixture(slug,m),original=Buffer.from(body),controls=[];
  const expected=slug==='wah'?{TRACK:m.binaryId!==8,MIX:m.binaryId!==8,BIAS:m.binaryId!==8,CONTROL:true,EQ1:true,EQ8:true}:
    {WIDTH:m.binaryId===1,CENTER:m.binaryId===1,DEPTH:m.binaryId!==1,STARTPHASE:m.binaryId!==1,ORDER:m.binaryId===3,XOVER:m.binaryId===3,LFOTYPE:m.binaryId!==6,DUTY:m.binaryId!==6,BETA:[0,2,4,5].includes(m.binaryId)};
  for(const [n,allow] of Object.entries(expected))assert.equal(policy(slug,findParam(slug,n),body).allowed,allow,m.name+'/'+n);
  for(const p of dict.filter(p=>p.family===families[slug]&&[...DEFAULT_STATUSES,...OPT_IN_STATUSES].includes(p.status)))for(const ch of 'ABCD'){
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
assert.equal(templates,16);
for(const slug of Object.keys(families))for(const channel of 'ABCD'){
  for(const param of ['TYPE',0]){
    assert.throws(()=>writeTableControls(bases[slug],{name:'NO TYPE WRITE',controls:[{block:slug,channel,param,raw:0}]},{experimental:true}),/full channel template required/);
    assert.throws(()=>writeTableControls(bases[slug],{name:'NO TYPE WRITE',controls:[ctl(slug,channel,param,0)]},opts),/full channel template required/);
  }
  const body=Buffer.from(before[slug]),r=records[slug],original=Buffer.from(body);let callbacks=0;
  const plan=[ctl(slug,channel,'LEVEL',-3),ctl(slug,channel,'TYPE',0)];
  for(const controls of [plan,[...plan].reverse()]){
    assert.throws(()=>applyTableControls(body,controls,opts,()=>callbacks++),/full channel template required/);
    assert.deepEqual(body,original);assert.equal(callbacks,0);
  }
  body.writeUInt16LE(slug==='wah'?9:7,r.start+2*'ABCD'.indexOf(channel)*r.words);
  assert.throws(()=>applyTableControls(body,[ctl(slug,channel,'LEVEL',0)],opts),/unknown or mismatched/);
  applyTableControls(body,[ctl(slug,channel==='D'?'A':'D','LEVEL',0)],opts);
}
for(const param of [6,10])assert.throws(()=>writeTableControls(bases.tremolo,{name:'NO UNUSED WRITE',controls:[{block:'tremolo',channel:'A',param,raw:0}]},{experimental:true}),/not applicable/);
for(const [slug,model,param] of [['wah','Paragon','BIAS'],['tremolo','Neon Trem','LFOTYPE'],['tremolo','Panner','DEPTH'],['tremolo','VCA Trem','XOVER']]){
  const body=fixture(slug,libs[slug].models.find(m=>m.name===model)),original=Buffer.from(body);let callbacks=0;
  for(const name of [param,findParam(slug,param).param])assert.throws(()=>applyTableControls(body,[{block:slug,channel:'A',param:name,raw:0}],{experimental:true}),/do not allow experimental/);
  const plan=[ctl(slug,'A','LEVEL',-3),ctl(slug,'A',param,valueFor(findParam(slug,param)))];
  for(const controls of [plan,[...plan].reverse()]){
    assert.throws(()=>applyTableControls(body,controls,opts,()=>callbacks++),/not applicable/);
    assert.deepEqual(body,original);assert.equal(callbacks,0);
  }
}
// The bounded legacy writer also rejects hidden raw writes on unchanged listed bases.
for(const slug of Object.keys(families)){
  const body=Buffer.from(inspectStructure(bases[slug]).raw.body),r=scanRecords(body).records.find(r=>r.family===slug);
  for(const channel of 'ABCD')for(const p of dict.filter(p=>p.family===families[slug]&&p.param!==0)){
    const a=typeApplicability(p,readTypeState(p,pid=>body.readUInt16LE(r.start+2*('ABCD'.indexOf(channel)*r.words+pid))));
    if(!a.allowed)assert.throws(()=>writeTableControls(bases[slug],{name:'NO HIDDEN RAW',controls:[{block:slug,channel,param:p.param,raw:0}]},{experimental:true}),/not applicable/);
  }
}
// Existing tempo and modifier checks remain effective through both table writers.
const active=read('examples/JB_RHYTHM_LEVEL_MINUS3.syx');
for(const channel of 'ABCD'){
  const mod=[ctl('wah',channel,'CONTROL',5)];
  assert.throws(()=>writeTableControls(active,{name:'PEDAL TARGET',controls:mod},opts),/modifier-controlled/);
  const body=Buffer.from(inspectStructure(active).raw.body),original=Buffer.from(body);
  assert.throws(()=>applyTableControls(body,mod,opts),/modifier-controlled/);assert.deepEqual(body,original);
  const time=[ctl('tremolo',channel,'RATE',2),ctl('tremolo',channel,'TEMPO',1)];
  for(const plan of [time,[...time].reverse()]){
    assert.throws(()=>writeTableControls(bases.tremolo,{name:'TEMPO LOCK',controls:plan},opts),/tempo-controlled/);
    const b=Buffer.from(before.tremolo);assert.throws(()=>applyTableControls(b,plan,opts),/tempo-controlled/);assert.deepEqual(b,before.tremolo);
    const none=plan.map(c=>c.param==='TEMPO'?{...c,value:'NONE'}:c);
    const good=writeTableControls(bases.tremolo,{name:'MANUAL RATE',controls:none},opts),b2=Buffer.from(before.tremolo);applyTableControls(b2,none,opts);
    assert.deepEqual(b2,Buffer.from(inspectStructure(good.syx).raw.body));
  }
}
// Full templates still compose; final guide suppresses hidden words but keeps raw channel state.
const spec=JSON.parse(read('examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json'));
spec.composer.wahChannels=[{channel:'A',type:'Paragon'}];spec.composer.tremoloChannels=[{channel:'A',type:'Neon Trem'}];
spec.layout={row2:['wah','drive','phaser','amp','cab'],row3:['tremolo','delay','reverb']};spec.allow=[...OPT_IN_STATUSES];
spec.controls=[ctl('wah','A','CONTROL',5),ctl('wah','A','EQ1',-3),ctl('tremolo','A','RATE',2),ctl('tremolo','A','DEPTH',50)];
const good=createPreset(newlook,spec);
for(const name of ['WAH_BIAS','WAH_TRACK','WAH_MIX','TREMOLO_LFOTYPE','TREMOLO_DUTY','TREMOLO_BETA','TREMOLO_XOVER','TREMOLO_WIDTH'])assert.ok(!good.report.parameters.some(p=>p.channel==='A'&&p.name===name));
assert.ok(good.txt.includes('Control (WAH_CONTROL)'));assert.ok(good.txt.includes('160 (WAH_EQ1)'));
assert.deepEqual(readModifiers(Buffer.from(inspectStructure(good.syx).raw.body)),readModifiers(before.wah));
for(const c of [ctl('wah','A','BIAS',5),ctl('tremolo','A','LFOTYPE',0)]){spec.controls=[c];assert.throws(()=>createPreset(newlook,spec),/not applicable/);}
console.log(JSON.stringify({passed:true,templates,channels:'ABCD',acceptedWrites:accepted,rejectedWrites:rejected,templateOnlyChecks:templateOnly,deviceIO:false,newHardwareEvidence:false}));

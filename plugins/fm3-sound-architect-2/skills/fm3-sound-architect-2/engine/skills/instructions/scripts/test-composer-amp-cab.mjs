// Independent oracle: literal observed channel boundaries and stored raw donor
// bytes, not the new selection helper or its allowed-offset list.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const json=p=>JSON.parse(read(p)),body=b=>Buffer.from(inspectStructure(b).raw.body);
const sha=b=>createHash('sha256').update(b).digest('hex');
const ampLib=json('lookup/amp-library.json'),cabLib=json('lookup/cab-library.json');
const catalog=json('lookup/amp-catalog.json'),originalAmp=body(read('references/Baaspreset.syx'));
const builtins={'USA MK IV Rhythm 1':0,'USA MK IV Rhythm 2':1,'USA MK IV Lead Bright':2,'USA MK IV Lead Mid':3};
const lead=body(read('references/S2_AmpModelLead.syx'));
const ampRaw=name=>ampLib.templates[name]?Buffer.from(ampLib.templates[name].channelBytesHex,'hex'):name==='USA MK IV Lead'?Buffer.from(lead.subarray(4944,5232)):Buffer.from(originalAmp.subarray(4656+builtins[name]*288,4656+(builtins[name]+1)*288));
const cabRaw=name=>Buffer.from(cabLib.templates.find(t=>t.name===name).rawHex,'hex');
const start=(family,ch)=>(family==='amp'?4656:5854)+'ABCD'.indexOf(ch)*(family==='amp'?288:212);
const meta={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'AMP CAB CHANNEL TEST'};
const newlook=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),clean=body(newlook);
const valid=[],invalid=[];let modelCases=0,ampTransfers=0,cabTransfers=0,isolationCases=0,sceneCases=0,rejected=0;
function oracle(base,s){
  const out=body(base);
  for(const f of ['amp','cab']){
    const entries=[...(s[f+'Channels']??[]),...(Object.hasOwn(s,f+'ModelB')?[{channel:'B',model:s[f+'ModelB']}]:[])];
    for(const c of entries)(f==='amp'?ampRaw(c.model):cabRaw(c.model)).copy(out,start(f,c.channel));
  }
  const scalar={gainB:[4958,0,10],bassB:[4960,0,10],midB:[4962,0,10],trebleB:[4964,0,10],presenceB:[4996,0,10],levelB:[4946,-80,20]};
  for(const [k,[at,min,max]] of Object.entries(scalar))if(Object.hasOwn(s,k))out.writeUInt16LE(Math.round((s[k]-min)/(max-min)*65534),at);
  for(const e of s.scenes??[]){
    if(e.name){const at=4+(e.scene-1)*32;out.fill(32,at,at+31);Buffer.from(e.name).copy(out,at);}
    for(const [f,v] of Object.entries(e.blocks??{})){
      const at=(f==='amp'?4610:5808)+10+(e.scene-1)*2;
      if(Object.hasOwn(v,'channel'))out.writeUInt16LE('ABCD'.indexOf(v.channel),at);
      if(Object.hasOwn(v,'bypass'))out.writeUInt16LE(v.bypass?1:0,at+16);
    }
  }
  return out;
}
function verify(base,s,label){
  const input=Buffer.from(base),specBefore=JSON.stringify(s),r=generatePreset(base,s);
  assert.deepEqual(body(r.syx),oracle(base,s),label+' entire body');
  assert.deepEqual(base,input);assert.equal(JSON.stringify(s),specBefore);
  assert.deepEqual(body(r.syx).subarray(260,452),body(base).subarray(260,452));
  for(const family of ['amp','cab'])if(r.report.components[family]){
    const rows=Array.isArray(r.report.components[family])?r.report.components[family]:[r.report.components[family]];
    for(const c of rows){
      assert.equal(c.targetChannel,c.channel);assert.equal(c.templateSha256,sha(family==='amp'?ampRaw(c.model):cabRaw(c.model)));
      const users=r.report.scenes.filter(x=>x.blocks[family].channel===c.channel);
      assert.deepEqual(c.affectedScenes,users.map(x=>x.scene));
      assert.deepEqual(c.activeScenes,users.filter(x=>!x.blocks[family].bypass).map(x=>x.scene));
      assert.ok(r.txt.includes(`${family==='amp'?'Amp':'Cab'} ${c.channel}: ${c.model};`));
      for(const scene of users){
        if(family==='amp')assert.equal(scene.blocks.amp.type,c.model);
        else assert.ok(scene.blocks.cab.cabs.every(x=>x.name===c.model));
      }
    }
  }
  return r;
}
// Every catalogued model is copied to all four destinations in a full preset.
// This includes the five original USA templates and the five firmware13 additions.
for(const m of catalog.models){
  const s={...meta,ampChannels:[...'ABCD'].map(channel=>({channel,model:m.name}))};
  verify(newlook,s,m.name);ampTransfers+=4;modelCases++;
}
for(const m of cabLib.templates){
  const s={...meta,cabChannels:[...'ABCD'].map(channel=>({channel,model:m.name}))};
  verify(newlook,s,m.name);cabTransfers+=4;modelCases++;
}
const bases=['JB_YDOM_RHYTHM.syx','JB_RHYTHM_LEVEL_MINUS3.syx','JB_RHYTHM_LEVEL_MINUS3_export.syx','FM3_TREMOLO_ABCD_TEST_export.syx','FM3_ROTARY_A_TEST_export.syx','FM3_PITCH_ABCD_TEST_export.syx','JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'];
const ampModels=['Double Verb Vibrato','Brit Silver','USA MK IV Lead','Brit JVM Crunch Orange'];
const cabModels=['2x12 Double Verb','4x12 Rumble EV12L','4x12 Friedman V30','4x12 Lerxst'];
for(const file of bases){
  const base=read('examples/'+file);
  // Single-channel requests must preserve every other byte, including levels,
  // scene headers, routing, controllers and inactive channels.
  for(const f of ['amp','cab'])for(const [i,channel] of [...'ABCD'].entries()){
    verify(base,{...meta,[f+'Channels']:[{channel,model:(f==='amp'?ampModels:cabModels)[i]}]},file+'/'+f+'/'+channel);isolationCases++;
  }
  const s={...meta,ampChannels:[...'ABCD'].map((channel,i)=>({channel,model:ampModels[i]})),cabChannels:[...'ABCD'].map((channel,i)=>({channel,model:cabModels[i]})),gainB:5,bassB:4,levelB:-3,
    scenes:Array.from({length:8},(_,i)=>({scene:i+1,name:'CHANNEL TEST '+(i+1),blocks:{amp:{channel:'ABCD'[i%4],bypass:i===7},cab:{channel:'DCBA'[i%4],bypass:i===0}}}))};
  verify(base,s,file+'/all models/scenes');sceneCases++;valid.push(s);
}
// Legacy and new B syntax produce identical SYX, including explicit B scalars.
let compatibilityCases=0;
for(const file of bases)for(const f of ['amp','cab']){
  const base=read('examples/'+file),model=f==='amp'?'USA MK IV Rhythm 2':'4x12 Lerxst';
  const old={...meta,[f+'ModelB']:model,...(f==='amp'?{gainB:7,levelB:-3}:{})};
  const newer={...meta,[f+'Channels']:[{channel:'B',model}],...(f==='amp'?{gainB:7,levelB:-3}:{})};
  const a=generatePreset(base,old),b=verify(base,newer,'legacy/new '+file+'/'+f);
  assert.deepEqual(a.syx,b.syx);assert.ok(!Array.isArray(a.report.components[f]));
  const mixed={...old,[f+'Channels']:[{channel:'D',model:(f==='amp'?ampModels:cabModels)[3]}]};
  verify(base,mixed,'legacy with distinct D');valid.push(mixed);compatibilityCases+=2;
}
// Collected models also compose with automatic Filter insertion. The independent
// expected body starts from the previously confirmed Filter device export.
const filterSpec=json('examples/FM3_NEWLOOK_FILTER_TEST.spec.json');
const insertedSpec={...filterSpec,ampChannels:[{channel:'D',model:'Double Verb Vibrato'}],cabChannels:[{channel:'A',model:'4x12 Lerxst'}]};
const inserted=generatePreset(newlook,insertedSpec),want=body(read('examples/FM3_NEWLOOK_FILTER_TEST_export.syx'));
ampRaw('Double Verb Vibrato').copy(want,start('amp','D'));cabRaw('4x12 Lerxst').copy(want,start('cab','A'));
assert.deepEqual(body(inserted.syx),want);assert.equal(inserted.report.knownDeviceBody,null);
assert.equal(inserted.report.insertions.length,1);valid.push(insertedSpec);
// Existing accepted rhythm/solo remains exact through the new Cab B syntax.
const accepted=json('examples/JB_NEWLOOK_RHYTHM_SOLO.spec.json');
accepted.cabChannels=[{channel:'B',model:accepted.cabModelB}];delete accepted.cabModelB;
const replay=generatePreset(newlook,accepted);assert.deepEqual(body(replay.syx),clean);assert.ok(replay.report.knownDeviceBody);valid.push(accepted);
for(const f of ['amp','cab']){
  const model=f==='amp'?ampModels[0]:cabModels[0];
  const bad=[null,{},[],[null],[[]],[{}],[{channel:'E',model}],[{channel:'a',model}],[{channel:1,model}],[{channel:'AB',model}],[{channel:'A'}],[{model}],[{channel:'A',model:1}],[{channel:'A',model:null}],[{channel:'A',model:'NOT A MODEL'}],[{channel:'A',model,levelDb:-3}],[{channel:'A',type:model}],[{channel:'A',model},{channel:'A',model}],Array.from({length:5},()=>({channel:'B',model}))];
  for(const entries of bad){const s={...meta,[f+'Channels']:entries};assert.throws(()=>generatePreset(newlook,s));invalid.push(s);rejected++;}
  for(const ch of ['B']){const s={...meta,[f+'Channels']:[{channel:ch,model}],[f+'ModelB']:model};assert.throws(()=>generatePreset(newlook,s),/conflicts/);invalid.push(s);rejected++;}
}
for(const key of ['levelA','gainC','cabModelD','ampModelA']){const s={...meta,[key]:key.includes('Model')?'Brit Silver':-3};assert.throws(()=>generatePreset(newlook,s));invalid.push(s);rejected++;}
// Explicit bad external templates cannot enter a new target channel.
const tampered=structuredClone(ampLib);tampered.templates['Brit Silver'].channelBytesHex='00'.repeat(288);
assert.throws(()=>generatePreset(newlook,{...meta,ampChannels:[{channel:'D',model:'Brit Silver'}]},tampered),/integrity/);rejected++;
const cap=getComposerCapabilities(newlook);
assert.equal(cap.templates.amp.count,336);assert.equal(cap.templates.cab.count,45);
for(const f of ['amp','cab']){assert.deepEqual(cap.templates[f].channels,[...'ABCD']);assert.ok(cap.bases[0].fields.includes(f+'Channels'));}
const schema=json('scripts/fm3-spec.schema.json').oneOf.find(x=>x.properties?.baseProfile?.const==='jb-composer');
for(const f of ['amp','cab']){
  assert.deepEqual(schema.properties[f+'Channels'].items.properties.model.enum,cap.templates[f].names);
  assert.deepEqual(schema.properties[f+'Channels'].items.required,['channel','model']);
}
// The single device handoff targets A/D Amps and A/C/D Cabs. Rhythm Scene2
// and solo Scene6 keep their complete original Amp/Cab channels and headers.
const example={...meta,name:'FM3 AMP CAB AD TEST',purpose:'A/D Ampi ja A/C/D Cabi mudelivaliku koostajakatse. Scene2 ja Scene6 kogu senine sound ning NewLooki kaks rida säilivad.',ampChannels:[{channel:'A',model:'Double Verb Vibrato'},{channel:'D',model:'Brit JVM Crunch Orange'}],cabChannels:[{channel:'A',model:'2x12 Double Verb'},{channel:'C',model:'4x12 Friedman V30'},{channel:'D',model:'4x12 Lerxst'}],scenes:[{scene:1,name:'AMP CAB A TEST',blocks:{amp:{channel:'A',bypass:false},cab:{channel:'A',bypass:false}}},{scene:4,name:'AMP CAB D TEST',blocks:{amp:{channel:'D',bypass:false},cab:{channel:'D',bypass:false}}}]};
const final=verify(newlook,example,'device handoff'),out=body(final.syx);
for(const ch of ['B','C'])assert.deepEqual(out.subarray(start('amp',ch),start('amp',ch)+288),clean.subarray(start('amp',ch),start('amp',ch)+288));
assert.deepEqual(out.subarray(6066,6278),clean.subarray(6066,6278));
for(const i of [1,5]){
  assert.deepEqual(out.subarray(4+i*32,4+(i+1)*32),clean.subarray(4+i*32,4+(i+1)*32));
  for(const h of [4610,5808,6702,7568,8346])for(const p of [10,26])assert.deepEqual(out.subarray(h+p+i*2,h+p+i*2+2),clean.subarray(h+p+i*2,h+p+i*2+2));
}
assert.deepEqual(out.subarray(6702),clean.subarray(6702));assert.equal(final.report.knownDeviceBody.submittedFileConfirmed,true);
valid.push(example);
for(const [ext,data] of [['.spec.json',JSON.stringify(example,null,2)+'\n'],['.syx',final.syx],['.txt',final.txt],['.validation.json',JSON.stringify(final.report,null,2)+'\n']])fs.writeFileSync(new URL('../examples/FM3_AMP_CAB_AD_TEST'+ext,import.meta.url),data);
const report={date:'2026-10-08',generator:'jb-composer-0.7.1',passed:true,ampModels:336,cabModels:45,fullAmpChannelTransfers:ampTransfers,fullCabChannelTransfers:cabTransfers,wholeBodyCatalogCases:modelCases,bases:bases.length,isolatedChannelCases:isolationCases,allEightSceneCases:sceneCases,legacyCompatibilityCases:compatibilityCases,invalidRequestsRejected:rejected,filterInsertionCombinationVerified:true,acceptedRhythmSoloBodyExact:true,sourceInputsUnchanged:true,sceneUsersAndActiveUsersChecked:true,modelNamesInTxtAndJson:true,exampleSha256:final.report.outputSha256,exampleBodyBytes:out.length,exampleScene2And6ContentUnchanged:true,exampleNewlookRoutingUnchanged:true,hardware:'Exact representative Amp A/D and Cab A/C/D NewLook import/export confirmed; other combinations remain offline-tested only',audio:'New A/D sounds and CPU not assessed; example Scene2/6 content is unchanged',schema:'Structure, duplicate/conflict constraints and current enums checked; full Draft2020-12 validator not used'};
fs.writeFileSync(new URL('../../../docs/FM3_AMP_CAB_CHANNEL_TESTS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(new URL('../../../docs/FM3_COMPOSER_CAPABILITIES.json',import.meta.url),JSON.stringify(getComposerCapabilities(),null,2)+'\n');
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({valid,invalid}));
console.log(JSON.stringify(report,null,2));

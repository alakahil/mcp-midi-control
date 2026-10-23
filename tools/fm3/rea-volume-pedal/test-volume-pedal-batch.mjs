import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {arm64Slice, classifyResult, collect, EXPECTED_SHA256, ghidraReady, validatePlanTarget} from './fm3-rea-volume-pedal.mjs';

const thin = Buffer.alloc(32);
thin.writeUInt32BE(0xcffaedfe); thin.writeUInt32LE(0x100000c,4);
test('universal Mach-O: select arm64 bytes and reject invalid bounds',()=>{
  assert.equal(arm64Slice(thin),thin);
  for (const wide of [false,true]) for (const little of [false,true]) {
    const buf = Buffer.alloc(128); const put=(off,n)=>little?buf.writeUInt32LE(n,off):buf.writeUInt32BE(n,off);
    buf.writeUInt32BE(wide?(little?0xbfbafeca:0xcafebabf):(little?0xbebafeca:0xcafebabe),0);
    put(4,1);put(8,0x100000c);
    if(wide){ if(little){buf.writeBigUInt64LE(64n,16);buf.writeBigUInt64LE(32n,24);}else{buf.writeBigUInt64BE(64n,16);buf.writeBigUInt64BE(32n,24);} }
    else {put(16,64);put(20,32);}
    thin.copy(buf,64);assert.deepEqual(arm64Slice(buf),thin);
    if(wide){if(little)buf.writeBigUInt64LE(1000n,16);else buf.writeBigUInt64BE(1000n,16);}else put(16,1000);
    assert.throws(()=>arm64Slice(buf),/piirid/);
  }
  assert.throws(()=>arm64Slice(Buffer.alloc(20)));
});
test('text-only errors and bounded evidence never become unqualified success',()=>{
  assert.equal(classifyResult({isError:true,content:[{type:'text',text:'{"error":{"code":"provider_unavailable"}}'}]}).status,'error');
  assert.equal(classifyResult({structuredContent:{normalized_result:{truncated:true,next_offset:null,limitations:['budget']}}}).status,'limited');
  assert.equal(classifyResult({structuredContent:{normalized_result:{next_offset:100}}}).status,'limited');
  assert.equal(classifyResult({content:[]}).status,'error');
});
const required=['open_binary','close_binary','analyze_function','trace_native_values','xrefs','resolve_containing_procedure','export_evidence_bundle','binary_session'];
const plan={functions:[{id:'first',address:'0x1000'},{id:'duplicate',address:'0x1000'},{id:'second',address:'0x2000'}],
  xrefs:[{id:'refs',address:'0x1000'}],traces:[{id:'trace',address:'0x1000'}],
  max_reference_sites:2,max_extra_functions:1,trace_budget:{max_nodes:4000,limit:4000}};
function fake({failure=false,badHash=false}={}) {
  const calls=[];
  return {calls,listTools:async()=>({tools:required.map(name=>({name}))}),callTool:async q=>{
    calls.push(q);let value={};
    if(q.name==='open_binary')return {structuredContent:{result:{sha256:badHash?'wrong':EXPECTED_SHA256}}};
    if(q.name==='analyze_function'&&failure) return {isError:true,content:[{type:'text',text:'{"error":{"code":"provider_unavailable"}}'}]};
    if(q.name==='xrefs')value=['0x1004','0x3004','0x4004'];
    if(q.name==='resolve_containing_procedure')value={found:true,procedure:{address:q.arguments.address==='0x1004'?'0x1000':'0x3000'}};
    if(q.name==='trace_native_values')value={truncated:true,next_offset:null,limitations:['max_functions reached']};
    if(q.name==='export_evidence_bundle') fs.writeFileSync(q.arguments.path,'{"mock":true}');
    return {structuredContent:{normalized_result:value}};
  }};
}
test('one session, query deduplication, bounded reference followup, retained partial flags',async()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-batch-test-'));
 try{
  const client=fake();const result=await collect(client,'/mock/editor',out,plan,{log:()=>{},timeoutMs:1000});
  assert.equal(result.error,null);
  assert.equal(client.calls.filter(x=>x.name==='open_binary').length,1);
  assert.equal(client.calls.filter(x=>x.name==='close_binary').length,1);
  assert.equal(client.calls.filter(x=>x.name==='analyze_function'&&x.arguments.procedure==='0x1000').length,1);
  assert.equal(client.calls.filter(x=>x.name==='analyze_function'&&x.arguments.procedure==='0x3000').length,1);
  assert.equal(result.rows.find(x=>x.id==='trace').status,'limited');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'reference-followup.json'))).unvisited_sites,['0x4004']);
  assert.ok(fs.existsSync(path.join(out,'rea-evidence.json')));
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});
test('provider failure is retained, stops analysis, exports diagnostics and closes',async()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-batch-test-'));
 try{
  const client=fake({failure:true});const result=await collect(client,'/mock/editor',out,plan,{log:()=>{}});
  assert.match(result.error,/ebaõnnestus/);
  assert.equal(client.calls.filter(x=>x.name==='analyze_function').length,1);
  assert.equal(client.calls.at(-1).name,'close_binary');
  assert.equal(result.rows.find(x=>x.id==='first').status,'error');
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});
test('provider-opened identity mismatch prevents all function queries',async()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-batch-test-'));
 try{
  const client=fake({badHash:true});const result=await collect(client,'/mock/editor',out,plan,{log:()=>{}});
  assert.match(result.error,/räsi/);
  assert.equal(client.calls.filter(x=>x.name==='analyze_function').length,0);
  assert.equal(client.calls.at(-1).name,'close_binary');
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});
test('Ghidra scope checks require the native decompiler and full JDK but ignore unrelated registration failures',()=>{
  const names=['node','ghidra','ghidra-platform','ghidra-architecture','ghidra-installation','ghidra-version','ghidra-headless','ghidra-native_decompiler','ghidra-java'];
  const d={healthy:true,environment_healthy:false,scope_checks:names.map(name=>({name,ok:true})),informational_checks:[{name:'ida-registration',ok:false}]};
  assert.equal(ghidraReady(d),true);
  for(const name of ['ghidra-native_decompiler','ghidra-java','ghidra-headless']){
    const bad=structuredClone(d);bad.scope_checks.find(c=>c.name===name).ok=false;
    assert.equal(ghidraReady(bad),false);
  }
  assert.equal(ghidraReady({healthy:true}),false);
});
test('incorrect target bytes never pass function checkpoint validation',()=>{
  assert.throws(()=>validatePlanTarget(JSON.parse(fs.readFileSync(new URL('./plan.json',import.meta.url))),thin),/identiteet/);
});
test('previously analyzed functions are reused instead of re-requested as xref discoveries',async()=>{
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-volume-reuse-'));
  try{
    const client=fake();const p={...plan,reuse_previous_functions:['0x3000']};
    const r=await collect(client,'/mock/editor',out,p,{log:()=>{}});
    assert.equal(r.error,null);
    assert.equal(client.calls.some(x=>x.name==='analyze_function'&&x.arguments.procedure==='0x3000'),false);
  }finally{fs.rmSync(out,{recursive:true,force:true});}
});
test('three sequential later failures stop all remaining analysis and retain each response',async()=>{
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-volume-failure-'));
  try{
    const client=fake(),original=client.callTool;let analyses=0;
    client.callTool=async q=>{
      if(q.name==='analyze_function'&&++analyses>1){client.calls.push(q);throw Error('simulated transport loss');}
      return original(q);
    };
    const p={...plan,functions:Array.from({length:6},(_,i)=>({id:'f'+i,address:'0x'+(0x1000+i*0x1000).toString(16)}))};
    const r=await collect(client,'/mock/editor',out,p,{log:()=>{},timeoutMs:20});
    assert.match(r.error,/Kolm/);assert.equal(analyses,4);
    const index=JSON.parse(fs.readFileSync(path.join(out,'query-index.json')));
    assert.equal(index.filter(x=>x.status==='error').length,3);
    assert.equal(client.calls.at(-1).name,'close_binary');
    for(const row of index)assert.ok(fs.existsSync(path.join(out,row.file)));
  }finally{fs.rmSync(out,{recursive:true,force:true});}
});
test('an evidence export error does not prevent closing the target',async()=>{
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-volume-export-'));
  try{
    const client=fake(),original=client.callTool;
    client.callTool=async q=>q.name==='export_evidence_bundle'?{isError:true,structuredContent:{error:'export failed'}}:original(q);
    const r=await collect(client,'/mock/editor',out,plan,{log:()=>{}});
    assert.equal(r.rows.find(x=>x.id==='evidence-export').status,'error');
    assert.equal(client.calls.at(-1).name,'close_binary');
  }finally{fs.rmSync(out,{recursive:true,force:true});}
});

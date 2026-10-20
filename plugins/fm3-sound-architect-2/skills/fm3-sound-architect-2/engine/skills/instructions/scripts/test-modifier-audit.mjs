import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {composerBases} from './fm3-composer-bases.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {auditModifiers,renderModifierAuditText,createPreset,getPresetCapabilities} from './fm3-preset.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const samples=composerBases.map(b=>({...b,bytes:read(b.file)}));
for(const b of samples){
  const before=Buffer.from(b.bytes),a=auditModifiers(b.bytes);
  assert.deepEqual(b.bytes,before);assert.equal(a.inputSha256,b.sha256);
  assert.equal(a.firmwareDetected,null);assert.equal(a.metadataFirmware,13);
  assert.equal(a.summary.serializedRecords,32);assert.equal(a.summary.active,b.id==='jb-newlook'?0:1);
  assert.equal(a.modifiers[0].targetName,'WAH_CONTROL');
  assert.equal(a.modifiers[0].channelScope,'ALL');assert.equal(a.modifiers[0].words.length,25);
  assert.equal(a.summary.overlappingTargets,0);assert.equal(a.summary.recordsWithIssues,b.id==='jb-newlook'?1:0);
  assert.equal(a.deviceIO,false);assert.equal(a.presetWritten,false);
  assert.equal(a.externalControllers.length,b.id==='jb-newlook'?0:1);
  assert.ok(renderModifierAuditText(a).includes('faili tegelikku püsivara ei tuvastata'));
}
const base=samples.find(b=>b.id==='jb-balanced-export').bytes,inspected=inspectStructure(base);
const rawBody=Buffer.from(inspected.raw.body);
function synthetic(change){const body=Buffer.from(rawBody);change(body);return Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(inspected.raw.rawPatch,body)));}
const word=(body,record,pid,value)=>body.writeUInt16LE(value,1584+96*record+2*pid);
const target=(body,record,{source=14,secondary=0,operation=0,effect=94,pid=5,channel=0}={})=>{
  for(const [p,v] of [[0,source],[20,secondary],[23,operation],[8,effect],[9,pid],[17,channel]])word(body,record,p,v);
};
const run=change=>auditModifiers(synthetic(change));
// Decode every known source as metadata, not as permission to author it.
const sources=JSON.parse(read('references/fm3-parameter-dependencies.json')).modifiers.sources;
for(const secondary of [false,true])for(let start=0;start<sources.length;start+=32){
  const a=run(b=>{for(let slot=0;slot<32&&start+slot<sources.length;slot++)target(b,slot,{source:secondary?0:start+slot,secondary:secondary?start+slot:0});});
  for(let slot=0;slot<32&&start+slot<sources.length;slot++){
    const n=start+slot,m=a.modifiers[slot];
    assert.equal(secondary?m.secondarySourceName:m.sourceName,sources[n].trim());
    assert.equal(m.active,n!==0);
  }
}
const inactive=run(b=>target(b,1,{source:0}));assert.equal(inactive.overlappingTargets.length,0);
const overlap=run(b=>target(b,1));assert.deepEqual(overlap.overlappingTargets,[{records:[0,1],certainty:'same-target'}]);
const disjoint=run(b=>{target(b,0,{channel:1});target(b,1,{channel:2});});assert.equal(disjoint.overlappingTargets.length,0);
const uncertain=run(b=>target(b,1,{channel:65535,effect:0,source:65535,secondary:65534,operation:2}));
assert.equal(uncertain.overlappingTargets[0].certainty,'possible-target');
assert.ok(uncertain.modifiers[1].issues.includes('unknown-source'));
assert.ok(uncertain.modifiers[1].issues.includes('unknown-secondary-source'));
assert.ok(uncertain.modifiers[1].issues.includes('target-effect-unspecified'));
assert.ok(renderModifierAuditText(uncertain).includes('65534'));
assert.ok(run(b=>target(b,1,{effect:94,pid:65535})).modifiers[1].issues.includes('target-parameter-not-in-dictionary'));
assert.equal(run(b=>target(b,1,{source:15})).externalControllers.length,2);
assert.equal(overlap.externalControllers.length,1,'deduplicated global dependency');
assert.ok(run(b=>target(b,1,{source:0,operation:1})).modifiers[1].issues.includes('operation-not-evaluated'));
// Successful structural inspection does not admit an unpinned file to the writer.
const unpinned=synthetic(b=>word(b,0,0,15));assert.equal(auditModifiers(unpinned).summary.active,1);
assert.throws(()=>createPreset(unpinned,{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'UNKNOWN'}),/Unsupported|Unknown|recognized|supported|SHA|base/i);
let negatives=0;
for(let r=0;r<32;r++){
  assert.throws(()=>run(b=>b.writeUInt16LE(24,1538+96*r+42)),/Unsupported modifier record layout/);negatives++;
}
const broken=Buffer.from(base);broken[20]^=1;assert.throws(()=>auditModifiers(broken),/checksum|boundary|sequence/i);negatives++;
assert.throws(()=>auditModifiers(base.subarray(0,-1)),/24680/);negatives++;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-modifier-audit-'));
try{
  const input=path.join(tmp,'input.syx');fs.writeFileSync(input,base);
  const cli=fileURLToPath(new URL('./fm3-preset.mjs',import.meta.url));
  const command=args=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  const json=command(['--inspect-modifiers',input]);assert.equal(json.status,0,json.stderr);
  assert.deepEqual(JSON.parse(json.stdout),auditModifiers(base));
  const txt=command(['--inspect-modifiers',input,'--format','txt']);assert.equal(txt.status,0,txt.stderr);
  assert.equal(txt.stdout,renderModifierAuditText(auditModifiers(base)));
  for(const args of [[],[input,'--format'],[input,'--format','xml'],[input,'ignored'],[input,'--format','txt','ignored']]){
    const r=command(['--inspect-modifiers',...args]);assert.equal(r.status,1);assert.equal(r.stdout,'');negatives++;
  }
  fs.writeFileSync(input,broken);const invalid=command(['--inspect-modifiers',input]);assert.equal(invalid.status,1);assert.equal(invalid.stdout,'');
  assert.deepEqual(fs.readFileSync(input),broken);assert.deepEqual(fs.readdirSync(tmp),['input.syx']);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
assert.equal(getPresetCapabilities().modifierAudit.grantsWritePermission,false);
console.log(JSON.stringify({passed:true,bases:7,sourceNames:sources.length,secondarySourceNames:sources.length,recordHeaders:32,negativeCases:negatives,deviceIO:false,newHardwareMeasurements:false}));

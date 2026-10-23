import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkBinding} from './check-binding.mjs';
import {inspectStructure} from '../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from '../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-codec.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'FM3 binding % # ü '));
const folder=path.join(temp,'test package');
execFileSync(process.execPath,[path.join(here,'prepare-binding.mjs'),folder]);
const bytes=fs.readFileSync(path.join(folder,'FM3_VOL_BIND_CHECK.syx'));
const base=inspectStructure(bytes),body=Buffer.from(base.raw.body);
const encode=b=>Buffer.from(reencodeDumpFromRawPatch(bytes,reencodeRawPatch(base.raw.rawPatch,b)));
function candidate(index=0){
 const b=Buffer.from(body),at=1584+index*96;
 // Synthetic fixture only: these are not claimed firmware defaults.
 for(const [pid,raw] of [[0,14],[1,0],[2,65534],[8,102],[9,0],[17,0],[20,0],[23,0]])b.writeUInt16LE(raw,at+2*pid);
 return b;
}
test('complete baseline package and all four outputs generated in a complex path',()=>{
 assert.ok(fs.existsSync(path.join(folder,'FM3_VOL_BIND_CHECK.validation.json')));
 assert.equal(checkBinding(bytes,bytes).passed,false);
});
test('one synthetic record accepted without assuming allocation slot',()=>{
 for(const index of [0,17,31]){const r=checkBinding(bytes,encode(candidate(index)));assert.ok(r.passed,JSON.stringify(r));assert.equal(r.newModifier.record,index);}
});
test('wrong source, target, parameter, channel, secondary source and operation rejected',()=>{
 for(const [pid,val] of [[0,15],[8,94],[9,1],[17,1],[20,2],[23,1],[1,65535]]){
  const b=candidate();b.writeUInt16LE(val,1584+2*pid);assert.equal(checkBinding(bytes,encode(b)).passed,false);
 }
});
test('two active bindings and changed inactive records rejected',()=>{
 for(const [pid,val] of [[0,1],[7,1234]]){const b=candidate();b.writeUInt16LE(val,1584+96+2*pid);assert.equal(checkBinding(bytes,encode(b)).passed,false);}
});
test('valid-CRC changes to headers, names, grid and effect words rejected',()=>{
 for(const at of [0,260,1538+2,1584+32*96+50,body.length-10]){
  const b=candidate();b[at]^=1;assert.equal(checkBinding(bytes,encode(b)).passed,false,'offset '+at);
 }
});
test('bad transport checksum rejected',()=>{
 const b=encode(candidate());b[10]^=1;assert.equal(checkBinding(bytes,b).passed,false);
});
test('standalone packaged comparison reads exact pinned baseline',()=>{
 const input=path.join(temp,'synthetic.syx'),output=path.join(temp,'comparison.json');fs.writeFileSync(input,encode(candidate()));
 execFileSync(process.execPath,[path.join(folder,'check-binding.mjs'),input,output]);
 assert.equal(JSON.parse(fs.readFileSync(output)).passed,true);
 const changed=Buffer.from(bytes);changed[10]^=1;fs.writeFileSync(path.join(folder,'FM3_VOL_BIND_CHECK.syx'),changed);
 assert.throws(()=>execFileSync(process.execPath,[path.join(folder,'check-binding.mjs'),input,path.join(temp,'bad.json')],{stdio:'pipe'}));
});
test.after(()=>fs.rmSync(temp,{recursive:true,force:true}));

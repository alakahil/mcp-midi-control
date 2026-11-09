// T42 pack builder tests: reproducible build, edit-buffer headers, declared targets / tempo words. Never device evidence.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {parsePresetDump}=await import(path.join(E,'scripts/fm3-codec.mjs'));
const {inspectStructure}=await import(path.join(E,'scripts/drive-collector/fm3-prototype.mjs'));
const {readModifiers}=await import(path.join(E,'scripts/fm3-parameter-dependencies.mjs'));
const {findParam,decodeValue}=await import(path.join(E,'scripts/fm3-table-encoder.mjs'));
const {CONTROLLERS_RECORD:R}=await import(path.join(E,'scripts/fm3-controllers.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t42-test-'));
const build=dir=>execFileSync(process.execPath,[path.join(ROOT,'tools/fm3/t42-modifier-targets-build.mjs'),dir],{stdio:'pipe'});
const tree=dir=>{const o={};const w=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else o[path.relative(dir,p)]=sha(fs.readFileSync(p));}};w(dir);return o;};
const EXPECT={A:['DELAY','DELAY_MIX','Scene Controller 1',false],B:['FILTER','FILTER_FREQ','LFO 1A',false],
 C:['DISTORT','DISTORT_DRIVE','External 1',false],D:['DELAY','DELAY_LOCUT','Scene Controller 1',true],E:97,F:143};
try{
 const a=path.join(tmp,'a'),b=path.join(tmp,'b');build(a);build(b);
 assert.deepEqual(tree(a),tree(b),'reproducible build');
 assert.throws(()=>build(a),undefined,'non-empty output refused');
 const pack=path.join(a,'FM3_T42_MODTGT'),root=JSON.parse(fs.readFileSync(path.join(pack,'pack.json')));
 assert.equal(root.deviceIO,false);assert.equal(root.packs.length,6);
 for(const f of root.files)if(f.path!=='pack.json')assert.equal(sha(fs.readFileSync(path.join(pack,f.path))),f.sha256,f.path);
 for(const c of root.packs){
  const d=path.join(pack,c.dir),m=JSON.parse(fs.readFileSync(path.join(d,'manifest.json'))),syx=fs.readFileSync(path.join(d,m.preset.file));
  assert.equal(m.kind,'fm3-bind-store');assert.ok(!('storeLocation' in m),'no fixed STORE slot');assert.equal(sha(syx),m.preset.sha256);
  assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[127,0,0,64,0],'edit buffer only');
  const body=Buffer.from(inspectStructure(syx).raw.body),mods=readModifiers(body).filter(x=>x.active),x=EXPECT[c.id];
  if(Array.isArray(x)){
   const p=findParam(x[0],x[1]);assert.equal(mods.length,1);assert.equal(mods[0].effectId,p.block);assert.equal(mods[0].pid,p.param);
   assert.equal(mods[0].sourceName.trim(),x[2]);assert.equal(mods[0].channel,0);assert.equal((+p.flags&0x80)!==0,x[3],'modifier bit hypothesis');
   assert.equal(m.hypothesis,x[3]?'H2':'H1');
   assert.ok(Math.abs(decodeValue(p,body.readUInt16LE(mods[0].offset+2))-m.binding.min.display)<0.06*Math.max(1,m.binding.min.display));
  }else{
   assert.equal(mods.length,0);assert.equal(m.hypothesis,'H3');
   for(let ch=0;ch<4;ch++){assert.equal(body.readUInt16LE(R.start+2*(ch*R.words+32)),x);assert.equal(body.readUInt16LE(R.start+2*(ch*R.words+33)),0);}
  }
  assert.ok(m.testOnlyPatch.changedWords.length>0&&m.testOnlyPatch.changedWords.length<=4,'declared words only');
 }
 console.log(JSON.stringify({passed:true,parts:6,reproducible:true,deviceIO:false,newHardwareMeasurements:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

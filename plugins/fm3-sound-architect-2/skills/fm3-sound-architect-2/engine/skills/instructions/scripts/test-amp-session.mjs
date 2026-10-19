import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {inspectSession,buildSession} from './fm3-amp-session.mjs';
import {inspect} from './fm3-prototype.mjs';import {generatePreset} from './fm3-generate.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const read=n=>fs.readFileSync(new URL('../references/'+n,import.meta.url));
const base=read('Baaspreset.syx'),good=read('FM3_AMP_GET_hipower.json'),syx=read('FM3_AMP_HIPOWER_TEST.syx');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-session-test-'));
const marker={schemaVersion:1,kind:'fm3-amp-session',firmware:13};
function session(name){const p=path.join(root,name);fs.mkdirSync(p);fs.writeFileSync(path.join(p,'session.json'),JSON.stringify(marker));return p;}
function add(p,name,json,donor){const d=path.join(p,'capture-'+name);fs.mkdirSync(d);if(json)fs.writeFileSync(path.join(d,'capture.json'),json);if(donor)fs.writeFileSync(path.join(d,'donor.syx'),donor);return d;}
const p=session('resume');
add(p,'001',read('FM3_AMP_GET_capture004.json'),read('FM3_AMP_CAPTURE_004_corrected.syx'));
add(p,'002',good,syx);add(p,'003',good,syx);
add(p,'004',good);add(p,'005');add(p,'006',read('FM3_AMP_GET_failed_v1.json'));
const first=inspectSession(p,base),again=inspectSession(p,base);assert.deepEqual(first,again);
assert.equal(Object.keys(first.templates).length,5);assert.equal(first.conflicts.length,0);assert.equal(first.duplicates.length,4);
assert.equal(first.captures.filter(x=>x.state==='paired-verified').length,3);
assert.equal(first.captures.filter(x=>x.state==='awaiting-syx').length,1);
assert.equal(first.captures.filter(x=>x.state==='interrupted').length,1);
const out=path.join(root,'library.json');const lib=buildSession(p,base,out);
const snapshot=fs.readFileSync(out);assert.throws(()=>buildSession(p,base,out),/EEXIST/);assert.deepEqual(snapshot,fs.readFileSync(out));
const generated=generatePreset(base,{schemaVersion:1,firmware:13,name:'SESSION HIPOWER',ampModelB:'Hipower Normal'},lib);
assert.deepEqual(inspect(generated.syx).raw.body.slice(4944,5232),inspect(syx).raw.body.slice(4656,4944));
// Synthesize a coherent GET/SYX alternate setting; it must remain a conflict.
const r=JSON.parse(good);const raw=Buffer.from(r.rawRxHex,'hex');raw[20]^=1;raw[788]=raw.subarray(12,788).reduce((a,b)=>a^b,0)&127;
r.rawRxHex=raw.toString('hex');delete r.frames;delete r.decoded;
const d=inspect(syx),body=d.raw.body.slice();body[4656]^=1;
const alternate=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(d.raw.rawPatch,body)));
add(p,'007',Buffer.from(JSON.stringify(r)),alternate);
const conflict=inspectSession(p,base);assert.equal(conflict.conflicts.length,1);assert.equal(conflict.conflicts[0].name,'Hipower Normal');
assert.throws(()=>buildSession(p,base,path.join(root,'blocked.json')),/Conflicting/);assert(!fs.existsSync(path.join(root,'blocked.json')));
const bad=session('mismatch');add(bad,'001',good,read('FM3_AMP_CAPTURE_004_corrected.syx'));
assert.equal(inspectSession(bad,base).rejected.length,1);assert.throws(()=>buildSession(bad,base,path.join(root,'bad.json')),/Rejected/);
const empty=session('empty');assert.throws(()=>buildSession(empty,base,path.join(root,'empty.json')),/No paired/);
// Two channels of one valid pair contain different variants of the same model.
const sameBody=d.raw.body.slice();sameBody.set(sameBody.slice(4656,4944),4944);sameBody[4944]^=1;
const sameSyx=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(d.raw.rawPatch,sameBody)));
const sameReport=JSON.parse(good),sameWire=Buffer.from(sameReport.rawRxHex,'hex');let word=0;
for(const [start,len] of [[12,778],[790,778],[1568,202]]){
 for(let i=start+8;i<start+len-2;i+=3){const v=sameBody[4656+word*2]|sameBody[4657+word*2]<<8;sameWire[i]=v&127;sameWire[i+1]=(v>>7)&127;sameWire[i+2]=v>>14;word++;}
 sameWire[start+len-2]=sameWire.subarray(start,start+len-2).reduce((a,b)=>a^b,0)&127;
}
sameReport.rawRxHex=sameWire.toString('hex');delete sameReport.frames;delete sameReport.decoded;
const same=session('same-capture');add(same,'001',Buffer.from(JSON.stringify(sameReport)),sameSyx);
assert.equal(inspectSession(same,base).conflicts.length,1);assert.throws(()=>buildSession(same,base,path.join(root,'same.json')),/Conflicting/);
const links=session('links');fs.symlinkSync(path.join(p,'capture-002'),path.join(links,'capture-link'));
assert.equal(inspectSession(links,base).rejected.length,1);
console.log('PASS: resume/rebuild; 5 models; duplicate provenance; pending/failed/interrupted isolation; conflict blocks export; mismatched pair rejected; no overwrite; symlink rejected; exact generated Hipower channel.');
console.log('Test fixtures retained: '+root);

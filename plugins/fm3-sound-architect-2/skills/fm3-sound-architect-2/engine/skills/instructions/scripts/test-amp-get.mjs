import fs from 'node:fs';
import assert from 'node:assert/strict';
import {decodeAmpGet,importAmpGet} from './fm3-amp-get.mjs';
import {inspect} from './fm3-prototype.mjs';
import {generatePreset} from './fm3-generate.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const read=n=>fs.readFileSync(new URL('../references/'+n,import.meta.url));
const base=read('Baaspreset.syx');
const cases=[['FM3_AMP_GET_capture004.json','FM3_AMP_CAPTURE_004_corrected.syx'],['FM3_AMP_GET_hipower.json','FM3_AMP_HIPOWER_TEST.syx']];
for(const [json,syx] of cases){
 const report=read(json),donor=read(syx),r=JSON.parse(report),cap=decodeAmpGet(r,13),lib=importAmpGet(base,report,donor,13,json,syx);
 assert.equal(cap.itemCount,576);assert.equal(Object.keys(lib.templates).length,4);
 const d=inspect(donor),original=inspect(base).raw.body;
 for(const [k,ch] of cap.channels.entries()){
  const generated=generatePreset(base,{schemaVersion:1,firmware:13,name:'GET IMPORT TEST',ampModelB:ch.name},lib);
  const body=inspect(generated.syx).raw.body;
  assert.deepEqual(body.slice(4944,5232),d.raw.body.slice(4656+k*288,4656+(k+1)*288));
  for(let i=0;i<body.length;i++)if(i<4944||i>=5232)assert.equal(body[i],original[i]);
 }
}
const good=JSON.parse(read(cases[1][0])),donor=read(cases[1][1]);
let rejected=0;
function bad(fn){assert.throws(fn);rejected++;}
function corrupt(mutator){const r=structuredClone(good);mutator(r);bad(()=>decodeAmpGet(r,13));}
corrupt(r=>r.rawRxHex=r.rawRxHex.slice(0,-2));
corrupt(r=>r.rawRxHex+='00');
corrupt(r=>r.rawRxHex='zz'+r.rawRxHex.slice(2));
corrupt(r=>r.txCalls=2);
corrupt(r=>r.firmwareDeclared=12);
corrupt(r=>r.frames[0][6]=59);
corrupt(r=>r.decoded.values[0]^=1);
// Change raw bytes, then repair checksum: exercise semantic checks, not just XOR.
function rawBad(offset,value,repair=true){corrupt(r=>{const b=Buffer.from(r.rawRxHex,'hex');b[offset]=value;if(repair){let start=b.lastIndexOf(240,offset),end=b.indexOf(247,offset);b[end-1]=b.subarray(start,end-1).reduce((a,v)=>a^v,0)&127;}r.rawRxHex=b.toString('hex');delete r.frames;delete r.decoded;});}
rawBad(6,59);rawBad(8,63);rawBad(18,1);rawBad(22,4);rawBad(40,3);rawBad(20,1,false);
bad(()=>decodeAmpGet(good,12));
bad(()=>importAmpGet(base,read(cases[1][0]),read(cases[0][1]),13));
bad(()=>importAmpGet(base,read(cases[1][0]),Buffer.alloc(10),13));
const d=inspect(donor),body=d.raw.body.slice();body[100]^=1;
const unrelated=Buffer.from(reencodeDumpFromRawPatch(donor,reencodeRawPatch(d.raw.rawPatch,body)));
bad(()=>importAmpGet(base,read(cases[1][0]),unrelated,13));
for(const n of ['FM3_AMP_GET_failed_v1.json','FM3_AMP_GET_failed_v2.json'])bad(()=>decodeAmpGet(JSON.parse(read(n)),13));
// An obsolete collector status/reference is informational, not an import verdict.
const status=structuredClone(good);status.status='not-a-verdict';status.referenceSha256='old-reference';
assert.equal(decodeAmpGet(status,13).channels[0].name,'Hipower Normal');
console.log(`PASS: 2 real GET/SYX pairs; 8 exact channel generations; ${rejected} rejection cases; collector status ignored.`);

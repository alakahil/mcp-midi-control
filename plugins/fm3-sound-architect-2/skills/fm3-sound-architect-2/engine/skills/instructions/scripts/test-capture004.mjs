import fs from 'node:fs';import assert from 'node:assert/strict';
import {inspect} from './fm3-prototype.mjs';import {generatePreset} from './fm3-generate.mjs';import {importAmpLibrary} from './fm3-amp-library.mjs';import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const read=n=>fs.readFileSync(new URL('../references/'+n,import.meta.url));
const base=read('Baaspreset.syx'),donor=read('FM3_AMP_CAPTURE_004.syx'),d=inspect(donor),b=inspect(base);
const lib=importAmpLibrary(base,[{name:'FM3_AMP_CAPTURE_004.syx',bytes:donor}],13);assert.equal(lib.accepted.length,1);assert.equal(lib.rejected.length,0);
const models=['1987X Normal','1987X Treble','Brit 800 2203 High','Brit Super'],ids=[12,13,314,15],results=[];
assert.deepEqual(Object.keys(lib.templates),models);assert.equal(lib.templates['Brit 800 2204 High'],undefined);
for(const [i,model] of models.entries()){
 const r=generatePreset(base,{schemaVersion:1,firmware:13,name:'CAPTURE004 CHECK',ampModelB:model}),a=inspect(r.syx),ch=a.decoded.blocks.find(x=>x.block==='Amp').channels.B;
 assert.equal(ch.type_id,ids[i]);assert.equal(ch.type,model);assert.ok(r.txt.includes(`Amp B mudel ${model};`));
 assert.deepEqual(a.raw.body.slice(4944,5232),d.raw.body.slice(4656+i*288,4656+(i+1)*288));
 for(let k=0;k<a.raw.body.length;k++)if(k<4944||k>=5232)assert.equal(a.raw.body[k],b.raw.body[k]);
 results.push({model,modelId:ids[i],sourceChannel:'ABCD'[i],targetChannel:'B',fullChannelIdentical:true,otherBodyBytesPreserved:true,checks:r.report.checks,sha256:r.report.outputSha256});
}
// A late channel with an unresolved decoder name must not leak earlier valid channels into the registry.
const body=d.raw.body.slice();body[4656+3*288+12]=255;body[4656+3*288+13]=255;
const invalid=Buffer.from(reencodeDumpFromRawPatch(donor,reencodeRawPatch(d.raw.rawPatch,body)));
const rejected=importAmpLibrary(base,[{name:'late-invalid',bytes:invalid}],13);assert.equal(rejected.accepted.length,0);assert.match(rejected.rejected[0].reason,/65535/);assert.deepEqual(rejected.templates,{});
if(process.argv.includes('--report'))fs.writeFileSync(new URL('../../../docs/FM3_AMP_CAPTURE_004_RESULTS.json',import.meta.url),JSON.stringify({date:'2026-10-01',source:lib.accepted[0],results,planDifference:{channel:'C',expected:{id:14,name:'Brit 800 2204 High'},actual:{id:314,name:'Brit 800 2203 High'},action:'Actual model imported; missing ID14 moved to later ID314 capture slot'},decoderCorrection:'Added missing ID12 name from existing AMP_ROSTER; raw and decoded IDs agree',atomicImportRegression:true,hardware:'User source export; generated combinations not separately hardware-confirmed'},null,2)+'\n');
console.log('PASS: four actual model IDs/names and exact channel generation; no unrelated byte changes; TXT names; late rejection leaves no partial templates.');

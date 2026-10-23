// Read-only research adapter: FW10 factory banks vs the device's own FW13 exports of six of them.
// Keeps STRUCTURE only (effect IDs, words per channel, channel counts, which words changed),
// never parameter values: no factory preset content is redistributed.
// Usage: node tools/fm3/factory_structure_evidence.mjs FACTORY_DIR EXPORT_DIR [--write]
//   FACTORY_DIR = unzipped FM3_Factory_Presets_10p0 (fractalaudio.com, 2025-06-04)
//   EXPORT_DIR  = F155/F038/F163/F249/F288/F370.syx exported from FM3 FW13 (display offset 1)
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ENGINE='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const {parsePresetDump,decodeRawPatch}=await import(new URL(ENGINE+'scripts/drive-collector/fm3-codec.mjs',import.meta.url));
const {inspectStructure}=await import(new URL(ENGINE+'scripts/drive-collector/fm3-prototype.mjs',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
export const banks={'FM3-BANK-A-250604-113656.syx':'0be1134f91aafa5c3e3d93699b96a4e27334e8b185e15fddb68d1b31e5f93159',
  'FM3-BANK-B-250604-113656.syx':'20e947ac4488488e9f877facb62d86b5091f797f9da9abec082df381041d8e02',
  'FM3-BANK-C-250604-113656.syx':'3289d4274e696000c39031c31fe105131234668221e046b78a0a03a013e98cb2'};
// displayed number (offset 1) -> zero-based factory slot
export const pairs={155:'Bl@de Runner FM',38:'Das Metall',163:'Poltergeist Pigs FM',249:'Music Box FM',288:'Rhythm Tap',370:'MF Gift of Tone FM3'};
// Research-only walk: tolerant of FW10 word counts; stops at the system record 201.
function walk(body){
  const out=[];let at=4610;
  while(at+46<=body.length){const eid=body.readUInt16LE(at),words=body.readUInt16LE(at+42),channels=body.readUInt16LE(at+44);
    if(eid<37||eid>250||eid===201||words<1||words>600||![1,2,4].includes(channels)||at+46+2*words*channels>body.length)break;
    out.push({eid,at,words,channels});at+=46+2*words*channels;}
  assert.equal(body.readUInt16LE(at),201);return {records:out,tail:at};
}
export function extract(factoryDir,exportDir){
  const bank={};for(const [f,h] of Object.entries(banks)){const b=fs.readFileSync(path.join(factoryDir,f));assert.equal(sha(b),h);assert.equal(b.length,128*24680);bank[f[9]]=b;}
  const census={};
  for(const [letter,b] of Object.entries(bank))for(let i=0;i<128;i++){
    const d=b.subarray(i*24680,(i+1)*24680),raw=decodeRawPatch(parsePresetDump(d,0,17).chunkPayloads);assert.ok(raw.crcValid);
    assert.equal(Buffer.from(raw.rawPatch).readUInt16LE(0),0x013e);
    for(const r of walk(Buffer.from(raw.body)).records){const c=(census[r.eid]??={presets:0,fw10:new Set()});c.presets++;c.fw10.add(r.words+'x'+r.channels);}
  }
  const conversions=[];
  for(const [shown,name] of Object.entries(pairs)){
    const slot=shown-1,b=bank['ABC'[Math.floor(slot/128)]],d=b.subarray((slot%128)*24680,(slot%128+1)*24680);
    const old=Buffer.from(decodeRawPatch(parsePresetDump(d,0,17).chunkPayloads).body);
    const ex=fs.readFileSync(path.join(exportDir,`F${String(shown).padStart(3,'0')}.syx`)),s=inspectStructure(ex),neu=Buffer.from(s.raw.body);
    assert.equal(s.decoded.preset_name,name);assert.equal(Buffer.from(s.raw.rawPatch).readUInt16LE(0),0x0146);
    const O=walk(old),N=walk(neu);
    assert.ok(old.subarray(0,4610).equals(neu.subarray(0,4610)),'grid/scene prefix must be unchanged');
    assert.ok(old.subarray(O.tail).equals(neu.subarray(N.tail)),'system tail must be unchanged');
    assert.deepEqual(O.records.map(r=>r.eid),N.records.map(r=>r.eid),'record order must be unchanged');
    const blocks=O.records.map((o,k)=>{const n=N.records[k],changed=new Set();let appended=0;
      for(let i=0;i<46;i++)if(old[o.at+i]!==neu[n.at+i])assert.ok(i===42||i===43,'only the words field may change in a header');
      for(let c=0;c<o.channels;c++)for(let p=0;p<n.words;p++){if(p>=o.words){appended++;continue}
        if(old.readUInt16LE(o.at+46+2*(c*o.words+p))!==neu.readUInt16LE(n.at+46+2*(c*n.words+p)))changed.add(p);}
      return {eid:o.eid,fw10:o.words+'x'+o.channels,fw13:n.words+'x'+n.channels,changedWords:[...changed].sort((a,b)=>a-b),appendedWordsPerChannel:n.words-o.words};});
    conversions.push({shown,name,factorySha256:sha(d),exportSha256:sha(ex),blocks});
  }
  return {schemaVersion:1,source:{url:'https://www.fractalaudio.com/downloads/firmware-presets/fm3/10p0/FM3_Factory_Presets_10p0.zip',banks,displayOffset:1},
    scope:'Structure only: effect IDs, words per channel, channel counts and which word indexes the device changed when converting FW10 0x013E to FW13 0x0146. No parameter values are stored.',
    findings:['Grid/scene prefix (bytes 0..4609), record order and the system tail are byte-identical after conversion.',
      'A record header changes only in its words field (offset 42).','Blocks whose word count is unchanged keep every word unless the FW13 range/scale of that word changed (re-scaled by the device).',
      'Grown blocks keep words 0..old-1 and get the new words appended at the end of each channel.'],
    census:Object.fromEntries(Object.entries(census).map(([e,c])=>[e,{presets:c.presets,fw10:[...c.fw10]}])),conversions};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [factoryDir,exportDir]=process.argv.slice(2);assert.ok(factoryDir&&exportDir,'Usage: factory_structure_evidence.mjs FACTORY_DIR EXPORT_DIR [--write]');
  const out=new URL(ENGINE+'references/fm3-factory-structure-evidence.json',import.meta.url),content=JSON.stringify(extract(factoryDir,exportDir),null,1)+'\n';
  if(process.argv.includes('--write'))fs.writeFileSync(out,content);else assert.equal(fs.readFileSync(out,'utf8'),content);
  console.log(JSON.stringify({pairs:6,deviceIO:false,valuesStored:false}));
}

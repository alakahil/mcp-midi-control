// FM3 table-based parameter encoder (0.74.0).
// Source: FracTool 3.87 embedded FM3 table (model 0x11, format 0x0146) merged with
// forgefx-midi FM3 names; see docs/FM3_TABLE_ENCODER.md. Offline only: no device I/O.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {authorGen3PresetFromIR,reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {composerBases,layouts,checkComposerStructure} from './fm3-composer-bases.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
export const dictionaryHash='4a31bb556f44a19f5e425e0e3aae9627f7e5f8da0804a4b9fe9ccf915f9d449f';
// Statuses writable without an explicit opt-in. 'measured' and
// 'taper-class-verified' share the exact curve class of 280/280 hardware points.
export const DEFAULT_STATUSES=Object.freeze(['measured','taper-class-verified','enum-labels-crosschecked']);
export const OPT_IN_STATUSES=Object.freeze(['linear-by-structure','enum-labels']);
export const FAMILY_BY_SLUG=Object.freeze({amp:'DISTORT',cab:'CABINET',drive:'FUZZ',delay:'DELAY',reverb:'REVERB',phaser:'PHASER',compressor:'COMP',chorus:'CHORUS',flanger:'FLANGER',wah:'WAH',tremolo:'TREMOLO',rotary:'ROTARY',pitch:'PITCH',filter:'FILTER',peq:'PEQ',geq:'GEQ',enhancer:'ENHANCER'});

let cache=null;
export function loadDictionary(){
  if(cache)return cache;
  const bytes=fs.readFileSync(new URL('../references/fm3-param-dictionary.json',import.meta.url));
  check(sha(bytes)===dictionaryHash,'Parameter dictionary changed; revalidate (validate.py) before use');
  const d=JSON.parse(bytes);check(d.params.length===2892,'Unexpected dictionary size');
  const byKey=new Map(),byName=new Map();
  for(const p of d.params){byKey.set(p.block+':'+p.param,p);if(p.name)byName.set(p.family+':'+p.name,p)}
  return cache={...d,byKey,byName};
}
export function findParam(family,param){
  const d=loadDictionary(),fam=FAMILY_BY_SLUG[family]??family;
  const p=typeof param==='number'?[...d.byKey.values()].find(x=>x.family===fam&&x.param===param):d.byName.get(fam+':'+param)??d.byName.get(fam+':'+fam+'_'+String(param).toUpperCase());
  check(p,`Unknown parameter ${family}/${param}`);return p;
}
function gate(p,opts){
  const ok=[...DEFAULT_STATUSES,...(opts.allow??[]).filter(s=>OPT_IN_STATUSES.includes(s))];
  if(opts.experimental===true&&p.status==='unverified-taper')return;
  check(ok.includes(p.status),`${p.name??p.block+':'+p.param}: status ${p.status} is not writable${p.status==='unverified-taper'?' (batch test only)':''}`);
}
// display value (as FM3-Edit shows it) -> 16-bit wire word
export function encodeValue(p,value,opts={}){
  gate(p,opts);
  if(p.kind==='enum'){
    const i=typeof value==='number'?value:p.enum.findIndex(x=>x.toLowerCase()===String(value).toLowerCase());
    check(Number.isInteger(i)&&i>=0&&i<p.enum.length,`${p.name}: unknown option ${value}`);return i;
  }
  check(p.kind==='linear'||p.kind==='log'||opts.experimental===true,`${p.name}: kind ${p.kind} has no encoder`);
  check(typeof value==='number'&&Number.isFinite(value),`${p.name}: numeric value required`);
  const v=value/(p.displayMultiplier||1),lo=p.min,hi=p.max,eps=1e-6*Math.max(1,Math.abs(hi-lo));
  check(v>=lo-eps&&v<=hi+eps,`${p.name}: ${value} outside ${lo*(p.displayMultiplier||1)}…${hi*(p.displayMultiplier||1)}`);
  const n=p.kind==='log'?Math.log(v/lo)/Math.log(hi/lo):(v-lo)/(hi-lo);
  return Math.min(65534,Math.max(0,Math.round(n*65534)));
}
export function decodeValue(p,raw){
  if(p.kind==='enum')return p.enum[raw];
  const n=raw/65534,m=p.displayMultiplier||1;
  return (p.kind==='log'?p.min*Math.pow(p.max/p.min,n):p.min+n*(p.max-p.min))*m;
}

// Write table controls into an unchanged bundled composer base.
// controls: [{block:'amp',channel:'B',param:'DISTORT_MID'|9,value:6.5}]
export function writeTableControls(baseBytes,spec,opts={}){
  const base=composerBases.find(b=>b.sha256===sha(baseBytes));check(base,'Unrecognised base; use a listed, unchanged composer base');
  const blocks=layouts[base.layout];
  check(typeof spec.name==='string'&&/^[ -~]{1,31}$/.test(spec.name),'Name must be 1–31 printable ASCII characters');
  check(Array.isArray(spec.controls)&&spec.controls.length>0,'controls[] required');
  const before=inspectStructure(baseBytes),original=Buffer.from(before.raw.body),body=Buffer.from(original);
  checkComposerStructure(body,{...base,blocks});
  const writes=[],allowed=new Set(),seen=new Set();
  for(const c of spec.controls){
    const l=blocks[c.block];check(l,`Block ${c.block} not in base layout ${base.layout}`);
    const p=findParam(c.block,c.param);check(p.block===l.eid,'Family/effect mismatch');
    const ch='ABCD'.indexOf(c.channel);check(ch>=0,'Channel must be A–D');
    check(p.param<l.words,'Parameter outside block word range');
    const offset=l.start+ch*l.words*2+p.param*2;check(!seen.has(offset),'Duplicate control');seen.add(offset);
    // Direct raw words are allowed only for experimental batch tests.
    const raw=c.raw!==undefined?(check(opts.experimental===true&&Number.isInteger(c.raw)&&c.raw>=0&&c.raw<=65534,'raw words require --experimental and 0…65534'),c.raw):encodeValue(p,c.value,opts);
    writes.push({block:c.block,channel:c.channel,name:p.name,label:p.label,pid:p.param,status:p.status,kind:p.kind,value:c.value,raw,before:body.readUInt16LE(offset),offset,display:decodeValue(p,raw)});
    body.writeUInt16LE(raw,offset);allowed.add(offset);allowed.add(offset+1);
  }
  checkComposerStructure(body,{...base,blocks});
  const renamed=authorGen3PresetFromIR(baseBytes,{name:spec.name,blocks:[]},17);check(renamed.skipped.length===0,'Name authoring skipped');
  const named=inspectStructure(Buffer.from(renamed.syx));check(Buffer.from(named.raw.body).equals(original),'Name authoring changed body');
  const syx=Buffer.from(reencodeDumpFromRawPatch(renamed.syx,reencodeRawPatch(named.raw.rawPatch,body)));
  const after=inspectStructure(syx),actual=Buffer.from(after.raw.body);
  check(actual.equals(body),'Body readback mismatch');check(after.decoded.preset_name===spec.name,'Name readback mismatch');
  for(let i=0;i<actual.length;i++)if(actual[i]!==original[i])check(allowed.has(i),'Collateral change at '+i);
  for(const w of writes)check(actual.readUInt16LE(w.offset)===w.raw,'Readback failed: '+w.name);
  check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
  const raw=Buffer.from(after.raw.rawPatch);check(raw.readUInt16LE(72)===actual.length&&raw.readUInt16LE(74)===after.raw.compSize,'Invalid encoded size');
  check(raw.subarray(76+after.raw.compSize).every(v=>v===0),'Nonzero output padding');
  return {syx,writes,report:{encoder:'fm3-table-encoder 0.74.0',dictionarySha256:dictionaryHash,base:base.id,baseSha256:base.sha256,outputSha256:sha(syx),bytes:syx.length,
    checks:{frameChecksums:true,presetCrc:true,footer:true,bodyReadback:true,noCollateralChanges:true,headerPreserved:true},experimental:opts.experimental===true,hardwareImport:'not tested',audio:'not tested'}};
}

if(process.argv[1]&&new URL(import.meta.url).pathname===fs.realpathSync(process.argv[1])){
  try{
    const [baseFile,specFile,outStem,...flags]=process.argv.slice(2);check(baseFile&&specFile&&outStem,'Usage: node fm3-table-encoder.mjs BASE.syx SPEC.json OUTPUT_STEM [--allow=linear-by-structure,...] [--experimental]');
    const opts={allow:(flags.find(f=>f.startsWith('--allow='))??'').slice(8).split(',').filter(Boolean),experimental:flags.includes('--experimental')};
    const r=writeTableControls(fs.readFileSync(baseFile),JSON.parse(fs.readFileSync(specFile,'utf8')),opts);
    fs.writeFileSync(outStem+'.syx',r.syx,{flag:'wx'});fs.writeFileSync(outStem+'.validation.json',JSON.stringify({...r.report,writes:r.writes},null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify(r.report,null,2));
  }catch(e){console.error(e.message);process.exitCode=1}
}

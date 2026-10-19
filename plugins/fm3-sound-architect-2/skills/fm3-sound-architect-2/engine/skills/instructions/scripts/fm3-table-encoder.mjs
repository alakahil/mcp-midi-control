// FM3 table-based parameter encoder (0.74.8). Class 0x5 'knob' confirmed by taper batch 2026-10-13.
// Source: FracTool 3.87 embedded FM3 table (model 0x11, format 0x0146) merged with
// forgefx-midi FM3 names; see docs/FM3_TABLE_ENCODER.md. Offline only: no device I/O.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {authorGen3PresetFromIR,reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {composerBases,layouts,checkComposerStructure} from './fm3-composer-bases.mjs';
import {validateDependencyWrites,dependencyPolicySummary} from './fm3-parameter-dependencies.mjs';
import {validateTypeWrites,typePolicySummary} from './fm3-type-applicability.mjs';
import {nativeParameterId} from './fm3-modulation-dynamics-applicability.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
export const dictionaryHash='a54e0ba251d380d5fe2de952d18a0f9aeedd22c093984ed130720c0fa664d730';
// Statuses writable without an explicit opt-in. 'measured' and
// 'taper-class-verified' share the exact curve class of 280/280 hardware points.
export const DEFAULT_STATUSES=Object.freeze(['measured','taper-class-verified','enum-labels-crosschecked']);
export const OPT_IN_STATUSES=Object.freeze(['linear-by-structure','enum-labels']);
export const FAMILY_BY_SLUG=Object.freeze({amp:'DISTORT',cab:'CABINET',drive:'FUZZ',delay:'DELAY',reverb:'REVERB',phaser:'PHASER',compressor:'COMP',chorus:'CHORUS',flanger:'FLANGER',wah:'WAH',tremolo:'TREMOLO',rotary:'ROTARY',pitch:'PITCH',filter:'FILTER',peq:'PEQ',geq:'GEQ',enhancer:'ENHANCER',out1:'OUTPUT'});

let cache=null;
export function loadDictionary(){
  if(cache)return cache;
  const bytes=fs.readFileSync(new URL('../references/fm3-param-dictionary.json',import.meta.url));
  check(sha(bytes)===dictionaryHash,'Parameter dictionary changed; run test-table-encoder.mjs and review evidence before use');
  const d=JSON.parse(bytes);check(d.params.length===2892,'Unexpected dictionary size');
  const byKey=new Map(),byName=new Map();
  for(const p of d.params){byKey.set(p.block+':'+p.param,p);if(p.name)byName.set(p.family+':'+p.name,p)}
  return cache={...d,byKey,byName};
}
export function findParam(family,param){
  const d=loadDictionary(),fam=FAMILY_BY_SLUG[family]??family;
  const byPid=pid=>[...d.byKey.values()].find(x=>x.family===fam&&x.param===pid);
  const p=typeof param==='number'?byPid(param):d.byName.get(fam+':'+param)??d.byName.get(fam+':'+fam+'_'+String(param).toUpperCase())??byPid(nativeParameterId(fam,param));
  check(p,`Unknown parameter ${family}/${param}`);return p;
}
function gate(p,opts){
  const ok=[...DEFAULT_STATUSES,...(opts.allow??[]).filter(s=>OPT_IN_STATUSES.includes(s))];
  if(opts.experimental===true&&p.status==='unverified-taper')return;
  check(ok.includes(p.status),`${p.name??p.block+':'+p.param}: status ${p.status} is not writable${p.status==='unverified-taper'?' (batch test only)':''}`);
}
export function assertFields(value,fields,label){
  check(value&&typeof value==='object'&&!Array.isArray(value),label+' must be an object');
  check(Object.keys(value).every(k=>fields.includes(k)),'Unknown '+label+' field');
}
export function channelIndex(channel){
  check(typeof channel==='string'&&/^[ABCD]$/.test(channel),'Channel must be exactly A, B, C or D');
  return 'ABCD'.indexOf(channel);
}
export function validateOptions(opts){
  assertFields(opts,['allow','experimental'],'encoder options');
  check(opts.allow===undefined||(Array.isArray(opts.allow)&&opts.allow.every(x=>OPT_IN_STATUSES.includes(x))&&new Set(opts.allow).size===opts.allow.length),'Unknown/duplicate allow status');
  check(opts.experimental===undefined||typeof opts.experimental==='boolean','experimental must be boolean');
}
export function validateControl(c,experimental=false){
  assertFields(c,experimental?['block','channel','param','value','raw']:['block','channel','param','value'],'control');
  check(Object.hasOwn(FAMILY_BY_SLUG,c.block),'Unknown control block');
  channelIndex(c.channel);
  check((typeof c.param==='string'&&c.param.length>0)||(Number.isInteger(c.param)&&c.param>=0),'Invalid parameter');
  check(Object.hasOwn(c,'raw')!==Object.hasOwn(c,'value'),'Exactly one control value is required');
}
// display value (as FM3-Edit shows it) -> 16-bit wire word
export function encodeValue(p,value,opts={}){
  validateOptions(opts);
  gate(p,opts);
  if(p.kind==='enum'){
    const i=typeof value==='number'?value:p.enum.findIndex(x=>x.trim().toLowerCase()===String(value).trim().toLowerCase());
    check(Number.isInteger(i)&&i>=0&&i<p.enum.length,`${p.name}: unknown option ${value}`);return i;
  }
  check(['linear','log','knob'].includes(p.kind)||opts.experimental===true,`${p.name}: kind ${p.kind} has no encoder`);
  check(typeof value==='number'&&Number.isFinite(value),`${p.name}: numeric value required`);
  if(p.kind==='knob'){const m=p.displayMultiplier||1;check(value>=0&&value<=m+1e-9,`${p.name}: ${value} outside 0…${m}`);return Math.round(value/m*65534)}
  const v=value/(p.displayMultiplier||1),lo=p.min,hi=p.max,eps=1e-6*Math.max(1,Math.abs(hi-lo));
  check(v>=lo-eps&&v<=hi+eps,`${p.name}: ${value} outside ${lo*(p.displayMultiplier||1)}…${hi*(p.displayMultiplier||1)}`);
  // The numeric tolerance must not admit zero/negative values into a logarithm.
  if(p.kind==='log')check(v>0,`${p.name}: logarithmic value must be positive`);
  const n=p.kind==='log'?Math.log(v/lo)/Math.log(hi/lo):(v-lo)/(hi-lo);
  return Math.min(65534,Math.max(0,Math.round(n*65534)));
}
export function decodeValue(p,raw){
  if(p.kind==='enum')return p.enum[raw];
  const n=raw/65534,m=p.displayMultiplier||1;
  if(p.kind==='knob')return n*m;
  return (p.kind==='log'?p.min*Math.pow(p.max/p.min,n):p.min+n*(p.max-p.min))*m;
}

// Write table controls into an unchanged bundled composer base.
// controls: [{block:'amp',channel:'B',param:'DISTORT_MID'|9,value:6.5}]
export function writeTableControls(baseBytes,spec,opts={}){
  assertFields(spec,['name','controls'],'table spec');
  validateOptions(opts);
  const base=composerBases.find(b=>b.sha256===sha(baseBytes));check(base,'Unrecognised base; use a listed, unchanged composer base');
  const blocks=layouts[base.layout];
  check(typeof spec.name==='string'&&/^[ -~]{1,31}$/.test(spec.name),'Name must be 1–31 printable ASCII characters');
  check(Array.isArray(spec.controls)&&spec.controls.length>0,'controls[] required');
  const before=inspectStructure(baseBytes),original=Buffer.from(before.raw.body),body=Buffer.from(original);
  checkComposerStructure(body,{...base,blocks});
  const writes=[],allowed=new Set(),seen=new Set();
  for(const c of spec.controls){
    validateControl(c,opts.experimental===true);
    const l=blocks[c.block];check(l,`Block ${c.block} not in base layout ${base.layout}`);
    const p=findParam(c.block,c.param);check(p.block===l.eid,'Family/effect mismatch');
    // Hidden editor controls are not enabled even by experimental raw writes.
    check(p.status!=='blocked-hidden-editor',`${p.name}: hidden in the pinned FM3 editor; not writable`);
    const ch=channelIndex(c.channel);
    check(p.param<l.words,'Parameter outside block word range');
    const offset=l.start+ch*l.words*2+p.param*2;check(!seen.has(offset),'Duplicate control');seen.add(offset);
    // Direct raw words are allowed only for experimental batch tests.
    const raw=c.raw!==undefined?(check(opts.experimental===true&&Number.isInteger(c.raw)&&c.raw>=0&&c.raw<=65534,'raw words require --experimental and 0…65534'),c.raw):encodeValue(p,c.value,opts);
    writes.push({effectId:p.block,block:c.block,channel:c.channel,name:p.name,label:p.label,pid:p.param,status:p.status,kind:p.kind,value:c.value,raw,before:body.readUInt16LE(offset),offset,display:decodeValue(p,raw)});
  }
  validateTypeWrites(original,writes);
  validateDependencyWrites(original,writes);
  for(const {raw,offset} of writes){body.writeUInt16LE(raw,offset);allowed.add(offset);allowed.add(offset+1)}
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
  return {syx,writes,report:{encoder:'fm3-table-encoder 0.74.8',dictionarySha256:dictionaryHash,typeApplicability:typePolicySummary(),dependencies:dependencyPolicySummary(),base:base.id,baseSha256:base.sha256,outputSha256:sha(syx),bytes:syx.length,
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

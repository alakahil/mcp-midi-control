// Build references/fm3-enum-promotion-20261103.json: which option selectors (status 'enum-labels') become
// default-writable. Offline. Evidence per selector, all against the pinned dictionary:
//  1. corpus: every stored word of the selector in the 811 tracked .syx files (639 distinct preset bodies; every
//     record and channel) lies inside its label list (a wrong list length or a 0/1-based shift shows up here);
//  2. one of: 'hardware-t24' (written at a non-default label and read in FM3-Edit, references/fm3-shot-t24-enum-
//     20261103.json), 'shared-labels' (byte-identical label list and base as an already default-writable option
//     selector), or 'family-t24' (unique list in a family whose own unique lists read exactly in T24).
// Not promoted: channel type/model selectors (they need full channel templates), global/controller/modifier and
// routing families, learn/preset/IR-bank pickers, families with no T24 reading, lists contradicted by the corpus, and PHASER_LFOQUANTIZE (its
// list repeats OFF). Usage: node tools/fm3/enum-promotion-build.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const imp=p=>import(new URL(p,'file://'+ENG));
const {loadDictionary,DEFAULT_STATUSES}=await imp('scripts/fm3-table-encoder.mjs');
const {templateOnlyParameter}=await imp('scripts/fm3-type-applicability.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const d=loadDictionary(),base=p=>p.structuralStatus??p.status;
const json=f=>JSON.parse(fs.readFileSync(path.join(ENG,'references',f),'utf8'));
const t24=json('fm3-shot-t24-enum-20261103.json'),t24File='fm3-shot-t24-enum-20261103.json';
const typePol=json('fm3-type-applicability.json'),insPol=json('fm3-insert-applicability.json');
const selectorPid=Object.fromEntries([...Object.entries(typePol.families).map(([k,f])=>[k,f.typePid]),...Object.entries(insPol.families).map(([k,f])=>[k,f.selectorPid])].filter(([,v])=>Number.isInteger(v)));
const NON_SOUND=['GLOBAL','CONTROLLERS','MOD','OUTPUT','INPUT','MIXER','MULTIPLEXER','FDBKRET','VOLUME'];
const SELECTORS=['CABINET_MODE','GEQ_TYPE','ENHANCER_TYPE','MEGATAP_TYPE','RINGMOD_TYPE','PLEX_BASETYPE','MULTITAP_BASETYPE'];
const SUSPECT={PHASER_LFOQUANTIZE:'label list repeats OFF (OFF, OFF, 2…); index meaning unresolved'};
const ACTION=/_(LEARN|PRESETS)$|^CABINET_BANK[12]$/;// learn buttons, layout presets and IR bank pickers (IR choice goes through the composer)
// Corpus scan (tracked files only, so the receipt is reproducible from the repository).
const files=execFileSync('git',['ls-files','*.syx'],{cwd:ROOT,encoding:'utf8'}).split('\n').filter(Boolean).sort();
const seen=new Set(),obs=new Map();let bodies=0;
const cand=d.params.filter(p=>p.kind==='enum'&&base(p)==='enum-labels');
for(const f of files){const b=fs.readFileSync(path.join(ROOT,f));if(b.length!==24680)continue;const h=sha(b);if(seen.has(h))continue;seen.add(h);
  let body,sc;try{body=Buffer.from(inspectStructure(b).raw.body);sc=scanRecords(body,{requireAmpCab:false})}catch{continue}bodies++;
  for(const r of sc.records)for(const p of cand){if(p.block!==r.block||p.param>=r.words)continue;
    for(let c=0;c<r.channels;c++){const v=body.readUInt16LE(r.start+2*(c*r.words+p.param)),k=p.family+':'+p.param,o=obs.get(k)??{vals:new Set(),bodies:new Set()};o.vals.add(v);o.bodies.add(h);obs.set(k,o);}}}
const defaultEnums=d.params.filter(p=>p.kind==='enum'&&DEFAULT_STATUSES.includes(p.status)&&base(p)!=='enum-labels');
const sameList=(a,b)=>(a.enumBase??0)===(b.enumBase??0)&&a.enum.length===b.enum.length&&a.enum.every((x,i)=>x===b.enum[i]);
const read=new Set(t24.summary.parameters),t24ByFamily=new Map();
for(const p of cand)if(read.has(p.name))t24ByFamily.set(p.family,(t24ByFamily.get(p.family)??0)+1);
const rows=cand.map(p=>{
  const o=obs.get(p.family+':'+p.param),vals=o?[...o.vals].sort((a,b)=>a-b):[],lo=p.enumBase??0,hi=lo+p.enum.length-1;
  const corpus={bodies:o?o.bodies.size:0,distinct:vals.length,min:vals[0]??null,max:vals.at(-1)??null,outOfRange:vals.filter(v=>v<lo||v>hi)};
  const shared=defaultEnums.find(q=>sameList(p,q));
  let excluded=null;
  if(NON_SOUND.includes(p.family))excluded='non-sound or routing family';
  else if(selectorPid[p.family]===p.param||SELECTORS.includes(p.name)||templateOnlyParameter(p))excluded='channel type/model selector (full channel template only)';
  else if(ACTION.test(p.name))excluded='action or picker control (learn, layout preset, IR bank)';
  else if(SUSPECT[p.name])excluded=SUSPECT[p.name];
  else if(corpus.outOfRange.length)excluded='stored word outside the label list in the corpus';
  const evidence=read.has(p.name)?'hardware-t24':shared?'shared-labels':t24ByFamily.has(p.family)?'family-t24':null;
  if(!excluded&&!evidence)excluded='no T24 reading in this family and no shared label list';
  return {family:p.family,param:p.param,name:p.name,label:p.label,options:p.enum.length,enumBase:lo,corpus,evidence,sharedWith:shared?.name??null,promoted:!excluded,excluded};
});
const promoted=rows.filter(r=>r.promoted),count=k=>Object.fromEntries([...new Set(rows.map(r=>r[k]))].map(v=>[v??'none',rows.filter(r=>r[k]===v&&r.promoted).length]));
const out={schemaVersion:1,firmware:13,date:'2026-11-03',dictionarySha256:'a54e0ba251d380d5fe2de952d18a0f9aeedd22c093984ed130720c0fa664d730',
 corpus:{trackedFiles:files.length,distinctBodies:bodies,sha256:sha(Buffer.from(files.join('\n')))},
 hardwareReceipt:{file:t24File,sha256:sha(fs.readFileSync(path.join(ENG,'references',t24File))),controls:t24.summary.controls,exact:t24.summary.exact},
 rule:'Option selector becomes enum-labels-crosschecked when every corpus word is inside its list and it was read on hardware (T24), shares its exact list with a default-writable selector, or belongs to a family whose unique lists read exactly in T24. Type/model selectors, non-sound families and unresolved lists stay opt-in.',
 summary:{candidates:rows.length,promoted:promoted.length,byEvidence:count('evidence'),
  keptOptIn:Object.fromEntries([...new Set(rows.filter(r=>!r.promoted).map(r=>r.excluded))].map(e=>[e,rows.filter(r=>r.excluded===e).length]))},
 parameters:rows};
const target=path.join(ENG,'references','fm3-enum-promotion-20261103.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'enum promotion receipt stale');
console.log(JSON.stringify(out.summary,null,1));

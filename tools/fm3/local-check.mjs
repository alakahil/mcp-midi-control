#!/usr/bin/env node
// Run the FM3 CI workflow (.github/workflows/fm3-plugin-offline.yml) locally, step for step, before a push.
// The command list is read from the workflow file itself, so this script never drifts from CI.
//
//   node tools/fm3/local-check.mjs            check only, exactly what CI runs (no file is written)
//   node tools/fm3/local-check.mjs --fix      first regenerate the evidence chain, then check; a command that fails
//                                             with a "stale" message is rerun once with --write and checked again
//                                             (two passes, because the registry/evidence files depend on each other)
//   --quick          skip the release phase (offline suite, release build, unpacked-package self-check; the slow part)
//   --factory DIR    with --fix: also refresh the point-5 factory receipt from the FM3 10.0 factory preset folder
//   --jobs N         parallel commands in the check phase (default: CPU count; --fix always runs one at a time)
//   --list           print the commands per phase and exit (CI runs this to keep the parser honest)
//
// Offline only: no MIDI, no device, no network except the pinned `git fetch` the workflow itself does.
// It never commits or pushes; review `git status` afterwards. Exit code 0 = everything CI checks passed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const WORKFLOW=path.join(ROOT,'.github/workflows/fm3-plugin-offline.yml');
const ENGINE='plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';

// ---- arguments
const argv=process.argv.slice(2),flag=f=>argv.includes(f),opt=f=>{const i=argv.indexOf(f);return i<0?undefined:argv[i+1];};
const known=new Set(['--fix','--quick','--list','--factory','--jobs']);
for(let i=0;i<argv.length;i++){if(!known.has(argv[i]))usage('unknown argument '+argv[i]);if(argv[i]==='--factory'||argv[i]==='--jobs')i++;}
function usage(m){console.error(m+'\nUsage: node tools/fm3/local-check.mjs [--fix] [--quick] [--factory DIR] [--jobs N] [--list]');process.exit(2);}
const FIX=flag('--fix'),QUICK=flag('--quick'),FACTORY=opt('--factory'),JOBS=Math.max(1,Number(opt('--jobs')??os.cpus().length)||1);
if(FACTORY&&!FIX)usage('--factory needs --fix');
if(FACTORY&&!fs.existsSync(FACTORY))usage('factory folder not found: '+FACTORY);

// ---- workflow parser: every `run:` of the offline job, one shell command per line, in order
export function parseWorkflow(text){
  const lines=text.split('\n'),steps=[];let name=null;
  for(let i=0;i<lines.length;i++){
    const l=lines[i],m=l.match(/^(\s*)-?\s*name:\s*(.+)$/);if(m)name=m[2].trim();
    const r=l.match(/^(\s*)run:\s*(.*)$/);if(!r)continue;
    const cmds=[];
    if(r[2].trim()==='|'){
      const base=r[1].length;
      for(i++;i<lines.length;i++){const s=lines[i];if(s.trim()==='')continue;const ind=s.match(/^\s*/)[0].length;if(ind<=base){i--;break;}cmds.push(s.trim());}
    }else cmds.push(r[2].trim());
    steps.push({name:name??'(unnamed)',cmds});name=null;
  }
  if(!steps.length)throw Error('no run: steps found in '+WORKFLOW);
  return steps;
}
// Release phase = steps that use the runner's temp folder or commit SHA (they need RUNNER_TEMP / GITHUB_SHA and run as
// one script, because they share shell variables). Everything else is a list of independent check commands.
const isRelease=s=>s.cmds.some(c=>/RUNNER_TEMP|GITHUB_SHA/.test(c));
const steps=parseWorkflow(fs.readFileSync(WORKFLOW,'utf8'));
const checkSteps=steps.filter(s=>!isRelease(s)),releaseSteps=steps.filter(isRelease);
// A step is parallel-safe when its commands do not depend on each other (no git, no shell variables).
const parallelSafe=s=>s.cmds.every(c=>!/^git\b|\$/.test(c));
if(flag('--list')){
  for(const s of checkSteps)console.log(`[check${parallelSafe(s)?', parallel':''}] ${s.name}\n`+s.cmds.map(c=>'  '+c).join('\n'));
  for(const s of releaseSteps)console.log(`[release] ${s.name}\n`+s.cmds.map(c=>'  '+c).join('\n'));
  const n=checkSteps.reduce((a,s)=>a+s.cmds.length,0);
  if(n<50||releaseSteps.length<3)throw Error(`workflow parse looks wrong: ${n} check commands, ${releaseSteps.length} release steps`);
  console.log(JSON.stringify({checkCommands:n,checkSteps:checkSteps.length,releaseSteps:releaseSteps.length}));
  process.exit(0);
}

// ---- runner
const env={...process.env,PYTHONDONTWRITEBYTECODE:'1'};// no __pycache__ in the plugin tree (it breaks the tree hash)
function run(cmd,extraEnv={}){
  return new Promise(res=>{const t=Date.now();let out='';
    const p=spawn('bash',['-c',cmd],{cwd:ROOT,env:{...env,...extraEnv}});
    p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>out+=d);
    p.on('close',code=>res({cmd,code,out,ms:Date.now()-t}));});
}
async function pool(cmds,n){const out=new Array(cmds.length);let next=0;
  await Promise.all(Array.from({length:Math.min(n,cmds.length)},async()=>{while(next<cmds.length){const i=next++;out[i]=await run(cmds[i]);}}));return out;}
const secs=ms=>(ms/1000).toFixed(1)+' s',tail=(s,n=4)=>s.trim().split('\n').slice(-n).map(x=>'      '+x.slice(0,240)).join('\n');
const started=Date.now(),failures=[],rewrites=[];

// ---- --fix: regenerate the evidence chain (order matters; three rounds settle the mutual hashes)
const sha=f=>createHash('sha256').update(fs.readFileSync(path.join(ROOT,f))).digest('hex');
async function regenerate(){
  const chain=['python3 tools/fm3/evidence-index.py --write','python3 tools/fm3/parameter-evidence.py --write','python3 tools/fm3/metadata_reconciliation.py --write',
    'node tools/fm3/encoder-matrix.mjs --write','node tools/fm3/input-volume-audit.mjs --write','python3 tools/fm3/point3-index.py --write'];
  const after=['node tools/fm3/point3-evidence.mjs --write','node tools/fm3/point6-evidence.mjs --write'];
  if(FACTORY)after.push(`node tools/fm3/point5-evidence.mjs --factory ${JSON.stringify(path.resolve(FACTORY))} --write`);
  const mapFile=ENGINE+'scripts/fm3-parameter-map.mjs',index=ENGINE.replace('skills/instructions/','')+'docs/FM3_PARAMETER_EVIDENCE.json';
  for(let round=1;round<=3;round++){
    for(const c of chain){const r=await run(c);if(r.code){failures.push({...r,phase:'regenerate'});return false;}}
    // fm3-parameter-map.mjs pins the hash of the regenerated parameter evidence index.
    const src=fs.readFileSync(path.join(ROOT,mapFile),'utf8'),m=src.match(/parameterEvidenceIndexHash='([0-9a-f]{64})'/);
    if(!m)throw Error('parameterEvidenceIndexHash not found in '+mapFile);
    const now=sha(index);if(m[1]!==now)fs.writeFileSync(path.join(ROOT,mapFile),src.replace(m[1],now));
    for(const c of after){const r=await run(c);if(r.code){failures.push({...r,phase:'regenerate'});return false;}}
  }
  console.log(`regenerate: evidence chain rebuilt (3 rounds${FACTORY?', with factory receipt':''})`);return true;
}

async function checkPhase(pass){
  let failed=0;
  for(const s of checkSteps){
    const results=FIX||!parallelSafe(s)?await pool(s.cmds,1):await pool(s.cmds,JOBS);
    for(const r of results){
      if(!r.code)continue;
      if(FIX&&/stale/i.test(r.out)&&!/^git\b/.test(r.cmd)){
        const w=await run(r.cmd+' --write'),again=w.code?w:await run(r.cmd);
        if(!again.code){rewrites.push(r.cmd);console.log(`  rewrote (stale): ${r.cmd}`);continue;}
      }
      failed++;if(pass===2||!FIX)failures.push({...r,phase:'check: '+s.name});
      if(!FIX||pass===2)console.log(`  FAIL ${r.cmd}\n${tail(r.out)}`);
    }
    console.log(`check${FIX?' pass '+pass:''}: ${s.name} — ${s.cmds.length} commands, ${results.filter(r=>r.code).length} failed`);
  }
  return failed;
}

async function releasePhase(){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-local-check-')),head=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT}).toString().trim();
  const dirty=execFileSync('git',['status','--porcelain'],{cwd:ROOT}).toString().trim();
  if(dirty)console.log('release: NOTE the working tree has uncommitted changes; build-release builds the committed HEAD, so commit first for a meaningful result.');
  try{
    for(const s of releaseSteps){
      const r=await run('set -e\n'+s.cmds.join('\n'),{RUNNER_TEMP:tmp,GITHUB_SHA:head});
      console.log(`release: ${s.name} — ${r.code?'FAILED':'ok'} (${secs(r.ms)})`);
      if(r.code){failures.push({...r,cmd:s.name,phase:'release'});console.log(tail(r.out,8));break;}
    }
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}

console.log(`FM3 local check (${FIX?'fix':'check only'}${QUICK?', quick':''}), commands from ${path.relative(ROOT,WORKFLOW)}`);
if(FIX&&!(await regenerate())){/* reported below */}
else{
  const f1=await checkPhase(1);
  if(FIX&&f1)await checkPhase(2);
  if(!QUICK&&!failures.length)await releasePhase();
  else if(!QUICK)console.log('release: skipped because a check failed');
}
const changed=execFileSync('git',['status','--porcelain'],{cwd:ROOT}).toString().trim();
console.log('\n'+JSON.stringify({passed:failures.length===0,failures:failures.map(f=>({phase:f.phase,cmd:f.cmd})),rewrites,
  changedFiles:changed?changed.split('\n').length:0,seconds:Math.round((Date.now()-started)/1000)}));
if(failures.length){for(const f of failures)console.log(`\nFAILED [${f.phase}] ${f.cmd}\n${tail(f.out,8)}`);process.exit(1);}

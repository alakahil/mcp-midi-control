// Regression for the FM3_GRID_CHECK.py collector against a simulated FM3 (fake_fm3.py). Offline:
// no serial port, no device. Builds a 3-preset pack through the production path, then checks that
// the collector sends only edit-buffer dumps and read requests, confirms the name once, detects a
// mismatching cell, resumes without resending, and refuses tampered or stored-location files
// before the first device write.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {readGrid} from './fm3-layout.mjs';
import {composeSound} from './fm3-sound.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
const here=path.dirname(fileURLToPath(import.meta.url)),harness=path.join(here,'cpu-sweep-collector/fake_fm3.py');
const sha=b=>createHash('sha256').update(b).digest('hex');
const BASE=fs.readFileSync(path.join(here,'../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-gridcheck-'));
const e=()=>Array(12).fill('');
const comp={compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const CASES=[
  {id:'T1',name:'GRIDTEST T1 TWO ROWS',spec:{grid:{rows:[e(),['in1','-','compressor','drive','-','amp','-','cab','-','-','-','send'],['return','-','-','-','-','-','-','-','delay','reverb','-','out1'],e()]}}},
  {id:'T2',name:'GRIDTEST T2 PARALLEL',spec:{remove:['send','return'],insert:['mixer'],blockScenes:{mixer:[{scene:1,bypass:false}]},
    grid:{rows:[e(),['in1','compressor','drive','amp','cab','delay','-','mixer','-','-','-','out1'],['','','','','','-','reverb','','','','',''],e()],links:[{row:3,col:6,from:[2]},{row:2,col:8,from:[2,3]}]}}},
  {id:'T3',name:'GRIDTEST T3 SYNTH',spec:{insert:['mixer','synth'],grid:{rows:[e(),['in1','compressor','drive','amp','cab','-','-','mixer','-','-','-','send'],['return','-','-','-','-','-','-','-','delay','reverb','-','out1'],['','','','','','synth','-','','','','','']],links:[{row:2,col:8,from:[2,4]}]}}},
];
function makePack(dir,mutate){
  fs.mkdirSync(dir,{recursive:true});const items=[];
  for(const c of CASES){
    const r=composeSound(BASE,{composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:c.name,...comp},selectedScene:1,...c.spec});
    let syx=Buffer.from(r.syx);if(mutate)syx=mutate(c.id,syx);
    fs.writeFileSync(path.join(dir,c.id+'.syx'),syx);
    items.push({id:c.id,file:c.id+'.syx',sha256:sha(syx),name:c.name,expectedGrid:readGrid(Buffer.from(inspectStructure(r.syx).raw.body)).map(g=>[g.row,g.col,g.id,g.mask])});
  }
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({kind:'fm3-grid-check',version:1,confirmName:items[0].name,items}));
  return items;
}
const run=(pack,session,...args)=>{
  const out=execFileSync('python3',['-B',harness,pack,session,...args],{encoding:'utf8'});
  const fake=JSON.parse(out.split('\n').find(l=>l.startsWith('FAKE ')).slice(5));
  const log=path.join(session,'results.jsonl');
  return {fake,out,results:fs.existsSync(log)?fs.readFileSync(log,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)):[]};
};
try{
  const pack=path.join(tmp,'pack'),items=makePack(pack);
  check(items.some(i=>i.expectedGrid.some(c=>c[2]===182||c[2]===186))&&items.some(i=>i.expectedGrid.some(c=>c[2]===130)),'Pack covers ids > 127');
  // 1. normal run: all grids match, name confirmed once, only dumps + read requests sent
  const a=run(pack,path.join(tmp,'s1'));
  check(a.fake.exit==='ok'&&a.fake.dumpsReceived===3&&a.fake.otherFrames===0&&a.fake.requests>=3*3,'Normal run: '+JSON.stringify(a.fake));
  check(a.results.length===3&&a.results.every(r=>r.gridMatches&&r.mismatches.length===0&&r.cpuPercent===62&&r.frameBytes===590),'Normal results');
  check(a.results.filter(r=>r.userConfirmedName).length===1&&a.out.includes('Kõik ruudustikud klapivad'),'Name confirmed once');
  // 2. resume: the same session sends nothing again
  const b=run(pack,path.join(tmp,'s1'));
  check(b.fake.dumpsReceived===0&&b.results.length===3,'Resume without resending');
  // 3. one wrong cell is detected and reported
  const c=run(pack,path.join(tmp,'s2'),'--corrupt','T2');
  const t2=c.results.find(r=>r.id==='T2');
  check(t2&&!t2.gridMatches&&t2.mismatches.length===1&&c.results.length===2&&c.fake.dumpsReceived===2&&c.fake.exit.includes('kirjutused peatatud'),'Mismatch detected');
  const resumedFailure=run(pack,path.join(tmp,'s2'));
  check(resumedFailure.fake.dumpsReceived===0&&resumedFailure.fake.exit.includes('Varasem katse ebaõnnestus'),'Failed session cannot resume blindly');
  for(const mode of ['--no-reply','--unstable']){
    const bad=run(pack,path.join(tmp,mode.slice(2)),mode,'T2');
    check(bad.fake.dumpsReceived===2&&bad.results.length===2&&bad.results[1].status==='failed'&&bad.results[1].sentFramesHex.length>0,'Readback failure stops and retains sends: '+mode);
    check(bad.fake.exit.includes(mode==='--no-reply'?'ei vastanud':'ei stabiliseerunud'),'Readback diagnostic: '+mode);
  }
  // 4. the user does not see the name: stop after the first dump and retain diagnostics
  const d=run(pack,path.join(tmp,'s3'),'--answer','e');
  check(d.fake.exit.includes('redaktsioonipuhvrisse')&&d.fake.dumpsReceived===1&&d.results.length===1&&d.results[0].status==='failed'&&d.results[0].sentFramesHex.length>0,'Name refusal stops');
  // 5. a file that differs from its manifest hash is refused before any device write
  const tampered=path.join(tmp,'tampered');makePack(tampered);
  const f=fs.readFileSync(path.join(tampered,'T3.syx'));f[100]^=1;fs.writeFileSync(path.join(tampered,'T3.syx'),f);
  const g=run(tampered,path.join(tmp,'s4'));
  check(g.fake.exit.includes('SHA-256 mismatch')&&g.fake.dumpsReceived===0,'Tampered file refused');
  // 6. a stored-location dump header (not 7F 00 00 40 00) is refused even with a matching hash
  const stored=path.join(tmp,'stored');
  makePack(stored,(id,syx)=>{if(id!=='T2')return syx;const s=Buffer.from(syx);s[6]=0x01;s[7]=0x1a;
    const end=s.indexOf(0xf7);let x=0;for(let i=0;i<end-1;i++)x^=s[i];s[end-1]=x&0x7f;return s;});
  const h=run(stored,path.join(tmp,'s5'));
  check(h.fake.exit.includes('edit buffer')&&h.fake.dumpsReceived===0,'Stored-location header refused: '+h.fake.exit);
  // 7. the shipped collectors' own self-tests
  for(const s of ['FM3_GRID_CHECK.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py','FM3_VALUE_CHECK.py','FM3_PEDAL_CHECK.py'])
    check(JSON.parse(execFileSync('python3',['-B',path.join(here,'cpu-sweep-collector',s),'--self-test'],{encoding:'utf8'}).trim().split('\n').pop()).selfTest.startsWith('passed'),s+' self-test');
  console.log(JSON.stringify({scenarios:10,deviceIO:false,collector:'FM3_GRID_CHECK.py'}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

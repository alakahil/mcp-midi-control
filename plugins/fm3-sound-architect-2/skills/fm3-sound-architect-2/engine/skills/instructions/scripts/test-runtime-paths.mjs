// Exercise real CLI processes from a relocated engine, not a symlink whose
// resolution would hide escaped-path failures. No device I/O.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const source=fileURLToPath(new URL('../',import.meta.url));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3 paths % # ü '));
try {
  const engine=path.join(temp,'engine with spaces');
  fs.cpSync(source,engine,{recursive:true});
  const run=(script,...args)=>JSON.parse(execFileSync(process.execPath,
    [path.join(engine,'scripts',script),...args],{encoding:'utf8',maxBuffer:8*1024*1024}));
  const base=path.join(engine,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
  const known=path.join(temp,'known preset % # ü');
  run('fm3-preset.mjs',base,path.join(engine,'examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json'),known);
  assert.deepEqual(fs.readFileSync(known+'.syx'),fs.readFileSync(path.join(engine,'examples/SATRIANI_SOAP_ON_A_ROPE_V3.syx')));
  assert.equal(run('fm3-preset.mjs','--verify',known).passed,true);
  const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'PATH CHECK',modifiers:{external1Wah:false}},volumePan:true,
    layout:{row2:['drive','amp','cab'],row3:['volpan','delay','reverb'],columns:{drive:4,amp:6,cab:8,volpan:2,delay:9,reverb:10}},
    controls:['A','B','C','D'].flatMap(channel=>[{block:'in1',channel,param:'THRESH',value:-65},{block:'volpan',channel,param:'GAIN',value:7.5}]),
    blockScenes:{volpan:Array.from({length:8},(_,i)=>({scene:i+1,channel:'A',bypass:i>0}))}};
  const specPath=path.join(temp,'input volume spec % # ü.json');fs.writeFileSync(specPath,JSON.stringify(spec));
  const stem=path.join(temp,'input volume output % # ü');
  assert.equal(run('fm3-sound.mjs',base,specPath,stem).outputs,4);
  assert.equal(run('fm3-preset.mjs','--verify',stem).passed,true);
  const caps=run('fm3-preset.mjs','--capabilities',base);assert.equal(caps.revision,'0.3.15');
  console.log(JSON.stringify({passed:true,realRelocatedDirectory:true,spacesPercentHashUnicode:true,knownPresetByteReplay:true,inputVolumeFourFiles:true,deviceIO:false}));
} finally {fs.rmSync(temp,{recursive:true,force:true});}

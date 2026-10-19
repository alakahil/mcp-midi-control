// FM3 sound composer (0.75.0): jb-composer (templates, inserted blocks, scenes)
// → two-row layout chosen by the sound → table controls. Offline only.
// spec: {composer:{...jb-composer spec on jb-newlook...}, layout:{row2:[...],row3:[...],columns?},
//        blockScenes?:{block:[{scene,channel,bypass}]}, controls?:[{block,channel,param,value}], allow?:[...]}
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {generatePreset} from './fm3-generate.mjs';
import {arrangeSound} from './fm3-layout.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};const sha=b=>createHash('sha256').update(b).digest('hex');
export function composeSound(base,spec){
  check(spec&&spec.composer&&spec.layout,'spec.composer and spec.layout are required');
  check(Object.keys(spec).every(k=>['composer','layout','blockScenes','controls','allow','purpose'].includes(k)),'Unsupported sound field');
  const first=generatePreset(base,spec.composer);
  check(first.report.baseId==='jb-newlook','Sound composer requires the jb-newlook base');
  const second=arrangeSound(first.syx,spec,{allow:(spec.allow??[])});
  return {syx:second.syx,composerReport:first.report,layoutReport:{...second.report,rows:second.rows,writes:second.writes,sceneEdits:second.sceneEdits,composerOutputSha256:first.report.outputSha256}};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===fs.realpathSync(process.argv[1])){
  try{const [b,s,stem]=process.argv.slice(2);check(b&&s&&stem,'Usage: node fm3-sound.mjs examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx SPEC.json OUTPUT_STEM');
    const r=composeSound(fs.readFileSync(b),JSON.parse(fs.readFileSync(s,'utf8')));
    fs.writeFileSync(stem+'.syx',r.syx,{flag:'wx'});fs.writeFileSync(stem+'.validation.json',JSON.stringify({composer:r.composerReport,layout:r.layoutReport},null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({sha256:sha(r.syx),rows:r.layoutReport.rows,writes:r.layoutReport.writes.length},null,2));
  }catch(e){console.error(e.message);process.exitCode=1}}

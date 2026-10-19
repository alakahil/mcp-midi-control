// Offline checks shared by the guided collector. No device access.
import fs from 'node:fs';
import {inspect} from './fm3-prototype.mjs';
import {importAmpLibrary,catalog,coverage} from './fm3-amp-library.mjs';
import {inspectSession} from './fm3-amp-session.mjs';
import {importAmpGet} from './fm3-amp-get.mjs';
const base=fs.readFileSync(new URL('../references/Baaspreset.syx',import.meta.url));
const [command,p,ids]=process.argv.slice(2);
try {
 let result;
 if(command==='next'){
  const s=inspectSession(p,base);
  if(s.rejected.length||s.conflicts.length)throw Error(JSON.stringify({rejected:s.rejected,conflicts:s.conflicts}));
  const ready=new Set(coverage().models.filter(m=>m.status!=='missing-template').map(m=>m.id));
  for(const t of Object.values(s.templates))ready.add(t.modelId);
  const missing=catalog.models.filter(m=>!ready.has(m.id));
  // Capture084 keeps the three verified JVM channels and puts the one remaining model on D.
  const selected=missing.length===1&&missing[0].id===331&&[333,334,335].every(id=>ready.has(id))
   ?[333,334,335,331].map(id=>catalog.models.find(m=>m.id===id)):missing.slice(0,4);
  result={remaining:missing.length,models:selected.map(m=>({id:m.id,name:m.name})),captures:s.captures};
 }else if(command==='preflight'){
  const bytes=fs.readFileSync(p),lib=importAmpLibrary(base,[{name:p,bytes}],13);
  if(lib.rejected.length||lib.accepted.length!==1)throw Error('SYX rejected: '+JSON.stringify(lib.rejected));
  const channels=inspect(bytes).decoded.blocks.find(b=>b.block==='Amp').channels;
  const expected=JSON.parse(ids),actual=Object.values(channels).map(c=>c.type_id);
  if(!expected.every((id,i)=>actual[i]===id))throw Error('Wrong channel models: '+JSON.stringify(actual)+' expected '+ids);
  result={valid:true,actual};
 }else if(command==='pair'){
  importAmpGet(base,fs.readFileSync(p+'/capture.json'),fs.readFileSync(p+'/donor.syx'),13);
  result={valid:true,matchedWords:576};
 }else throw Error('Unknown command');
 console.log(JSON.stringify(result));
}catch(e){console.error(e.message);process.exitCode=1;}

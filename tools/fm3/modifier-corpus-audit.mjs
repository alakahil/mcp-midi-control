// Inventory existing 0x0146 modifier records; no preset mutations or device I/O.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {readModifiers} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-parameter-dependencies.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),engine=path.join(root,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const sha=b=>createHash('sha256').update(b).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(d,x.name)):[path.join(d,x.name)]).sort();
const inventory=[],unsupported=[],seen=new Map(),bySlot=Array(32).fill(0);let files=0,totalActive=0,maxActive=0;
for(const file of walk(engine).filter(p=>p.endsWith('.syx'))){
 files++;const bytes=fs.readFileSync(file),hash=sha(bytes),rel=path.relative(root,file);
 if(seen.has(hash)){seen.get(hash).aliases.push(rel);continue;}
 const row={path:rel,sha256:hash,aliases:[]};seen.set(hash,row);
 try{
  const body=Buffer.from(inspectStructure(bytes).raw.body),mods=readModifiers(body);
  const active=mods.filter(m=>m.active);totalActive+=active.length;maxActive=Math.max(maxActive,active.length);
  active.forEach(m=>bySlot[m.record]++);
  Object.assign(row,{active:active.map(m=>({record:m.record,source:m.source,effectId:m.effectId,pid:m.pid,channel:m.channel,secondarySource:m.secondarySource,operation:m.operation})),
   inactiveBound:mods.filter(m=>!m.active&&m.effectId!==0).map(m=>m.record),
   secondaryWithoutPrimary:mods.filter(m=>m.source===0&&m.secondarySource!==0).map(m=>m.record),
   gapsBeforeActive:mods.filter(m=>!m.active&&active.some(a=>a.record>m.record)).map(m=>m.record)});
  inventory.push(row);
 }catch(e){unsupported.push({...row,error:e.message});}
 if(sha(fs.readFileSync(file))!==hash)throw Error('Input changed');
}
const report={schemaVersion:1,scope:'All distinct SYX bytes currently packaged; includes generated examples and captures, not all independent hardware observations.',files,unique:seen.size,accepted:inventory.length,unsupported,
 summary:{totalActiveRecords:totalActive,maxActivePerFile:maxActive,activeBySlot:bySlot,multiActiveFiles:inventory.filter(x=>x.active.length>1).length,
 nonContiguousFiles:inventory.filter(x=>x.gapsBeforeActive.length).length,secondaryWithoutPrimaryFiles:inventory.filter(x=>x.secondaryWithoutPrimary.length).length,
 simultaneousWahVolumeGain:inventory.filter(x=>x.active.some(m=>m.effectId===94&&m.pid===5)&&x.active.some(m=>m.effectId===102&&m.pid===0)).map(x=>x.path)},
 inventory,limits:['Corpus occupancy is not a proof of usable hardware capacity, allocation order, initialization or removal/reuse.',
 'Generated examples are not device captures. Aliases are not independent observations. Unsupported files remain unresolved.',
 'Active means at least one nonzero primary/secondary source; it does not establish controller value or audible activity.'],deviceIO:false,presetWrites:false};
const output=path.join(root,'docs/fm3/parameter-evidence/modifier-corpus-audit.json');
if(process.argv[2]==='--write'&&process.argv.length===3)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
else if(process.argv.length===2){if(JSON.stringify(JSON.parse(fs.readFileSync(output)))!==JSON.stringify(report))throw Error('Modifier corpus evidence is stale');}
else throw Error('Usage: modifier-corpus-audit.mjs [--write]');
console.log(JSON.stringify({passed:true,files,unique:seen.size,accepted:inventory.length,unsupported:unsupported.length,...report.summary}));

// Read-only evidence inventory. No target rewrites or device I/O.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {readModifiers} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-parameter-dependencies.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const args=process.argv.slice(2);
if(args.length!==2 && args.length!==4)throw new Error('Usage: node volume-pedal-audit.mjs --output FILE [--capture FILE]');
if(args[0]!=='--output' || (args.length===4 && args[2]!=='--capture'))throw new Error('Unknown arguments');
const output=path.resolve(args[1]);
if(fs.existsSync(output))throw new Error('Output already exists');
const engine=path.join(root,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]).sort();
const sha=b=>createHash('sha256').update(b).digest('hex');
const paths=walk(engine).filter(p=>p.endsWith('.syx'));const seen=new Set(),matches=[],unsupported=[],inventory=[];let accepted=0;
for(const file of paths){const bytes=fs.readFileSync(file),hash=sha(bytes);if(seen.has(hash))continue;seen.add(hash);const rel=path.relative(root,file);
  try{const body=Buffer.from(inspectStructure(bytes).raw.body),mods=readModifiers(body);accepted++;
    const volume=mods.filter(m=>m.effectId===102);inventory.push({file:rel,sha256:hash,activeRecords:mods.filter(m=>m.active).length,volumeRecords:volume.length});
    for(const m of volume)matches.push({file:rel,sha256:hash,...m,words:Array.from({length:25},(_,i)=>body.readUInt16LE(m.offset+2*i))});
  }catch(e){unsupported.push({file:rel,sha256:hash,error:e.message});}}
let returnedVolumeCapture=null;
if(args[3]){const b=fs.readFileSync(path.resolve(args[3])),body=Buffer.from(inspectStructure(b).raw.body),mods=readModifiers(body);returnedVolumeCapture={sha256:sha(b),activeRecords:mods.filter(m=>m.active).length,volumeBindings:mods.filter(m=>m.effectId===102)};}
const result={schemaVersion:1,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),engineGitTree:execFileSync('git',['rev-parse','HEAD:plugins/fm3-sound-architect-2'],{cwd:root,encoding:'utf8'}).trim(),method:'Existing-file scan using validated modifier record headers; no new REA analysis or hardware writes',files:paths.length,unique:seen.size,accepted,volumeBindings:matches,unsupported,inventory,
 returnedVolumeCapture,
 limits:['Unsupported files are unresolved, not Volume-binding-free.','Existing generic target-field IDs do not prove a new serialized Volume binding.','No Wah Min/Max model is transferred to Volume.','Global External 1 pedal assignment and runtime pedal/audio response are not evaluated.']};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({files:paths.length,unique:seen.size,accepted,volumeBindings:matches.length,unsupported:unsupported.length,returnedCaptureActive:result.returnedVolumeCapture?.activeRecords ?? null,returnedCaptureVolumeBindings:result.returnedVolumeCapture?.volumeBindings.length ?? null}));

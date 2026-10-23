// Read-only corpus inventory. Unsupported record layouts are retained explicitly.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {decodeGen3PresetDump} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-codec.mjs';
import {scanRecords} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-layout.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const engine='plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions';
const sha=b=>createHash('sha256').update(b).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]).sort();
const paths=walk(path.join(root,engine)).filter(f=>f.endsWith('.syx'));
const seen=new Set(),inputs=new Map(),volume=[],unsupported=[];let accepted=0;
for(const file of paths){const bytes=fs.readFileSync(file),hash=sha(bytes);if(seen.has(hash))continue;seen.add(hash);
  const relative=path.relative(root,file);try{const body=Buffer.from(inspectStructure(bytes).raw.body);const {records}=scanRecords(body);accepted++;
    for(const r of records){if(r.eid===102)volume.push({file:relative,sha256:hash,record:r});
      if(r.eid===37){const b=body.subarray(r.header,r.header+r.size),h=sha(b);if(!inputs.has(h))inputs.set(h,{file:relative,syxSha256:hash,recordSha256:h,record:r,words:Array.from({length:r.words*r.channels},(_,i)=>body.readUInt16LE(r.start+2*i))});}}
  }catch(e){unsupported.push({file:relative,sha256:hash,error:e.message});}}
const oldVolume=[];
for(const [name,offset,words] of [['preset-55.syx',10486,15],['preset-96.syx',8108,14]]){
  const file=engine+'/references/upstream-fm3-goldens/'+name,bytes=fs.readFileSync(path.join(root,file)),body=Buffer.from(decodeGen3PresetDump(bytes,17).decompressed_body);
  if(body.readUInt16LE(offset)!==102||body.readUInt16LE(offset+42)!==words||body.readUInt16LE(offset+44)!==4)throw Error('Old golden drift');
  const record=body.subarray(offset,offset+46+words*8);
  oldVolume.push({file,syxSha256:sha(bytes),effectId:102,header:offset,words,channels:4,recordSha256:sha(record),trustedCurrentFW13Donor:false});
}
const result={schemaVersion:1,files:paths.length,unique:seen.size,accepted,unsupported,inputRecords:[...inputs.values()],volumeInAccepted:volume,oldVolume,
  limits:'Scanner targets the supported composer record layout. Ten unsupported upstream presets are not treated as Volume-free. Old Volume records are not current FW13 import evidence. No device I/O.'};
const out=path.join(root,'docs/fm3/parameter-evidence/input-volume-corpus.json'),data=JSON.stringify(result,null,2)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(out,data);else if(fs.readFileSync(out,'utf8')!==data)throw Error('Stale corpus receipt');
console.log(JSON.stringify({verified:true,files:paths.length,unique:seen.size,accepted,unsupported:unsupported.length,inputVariants:inputs.size,currentVolume:volume.length,oldVolume:oldVolume.length}));

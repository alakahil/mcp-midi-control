// Verify the package actually present on disk. No device I/O or source writes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createPreset,getPresetCapabilities} from './fm3-preset.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../../..');
const sha=b=>createHash('sha256').update(b).digest('hex');
try{
 const args=process.argv.slice(2);if(args.length!==1||!/^[0-9a-f]{40}$/.test(args[0]))throw Error('Usage: node fm3-self-check.mjs EXPECTED_COMMIT_SHA');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json')));
 if(manifest.sourceCommit!==args[0])throw Error('Loaded package commit mismatch');
 for(const rel of ['plugin.json','.codex-plugin/plugin.json']){
  const p=JSON.parse(fs.readFileSync(path.join(root,rel)));if(p.name!==manifest.name||p.version!==manifest.version)throw Error('Loaded manifest mismatch');
 }
 const seen=[];
 function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,d.name);if(d.isSymbolicLink())throw Error('Unexpected symlink');if(d.isDirectory())walk(p);else if(d.isFile())seen.push(path.relative(root,p).split(path.sep).join('/'));}}
 walk(root);
 if(JSON.stringify(seen.filter(p=>p!=='release-manifest.json').sort())!==JSON.stringify(Object.keys(manifest.files).sort()))throw Error('Loaded package file inventory mismatch');
 for(const [rel,expected] of Object.entries(manifest.files)){
  const p=path.resolve(root,rel);if(!p.startsWith(root+path.sep))throw Error('Invalid manifest path');
  const data=fs.readFileSync(p);if(data.length!==expected.bytes||sha(data)!==expected.sha256)throw Error('Loaded file mismatch: '+rel);
 }
 const engine=new URL('../',import.meta.url),base=fs.readFileSync(new URL('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',engine));
 const spec=JSON.parse(fs.readFileSync(new URL('examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json',engine)));
 const r=createPreset(base,spec),expected=fs.readFileSync(new URL('examples/SATRIANI_SOAP_ON_A_ROPE_V3.syx',engine));
 if(!r.syx.equals(expected))throw Error('Known preset replay mismatch');
 const caps=getPresetCapabilities(base);if(caps.revision!==manifest.version||caps.composer.ampLevels.revision!=='amp-level-points-2026-10-13')throw Error('Capability mismatch');
 console.log(JSON.stringify({passed:true,scope:'Files and runtime at the invoked path; host discovery must separately identify this path',path:root,version:manifest.version,sourceCommit:manifest.sourceCommit,filesVerified:Object.keys(manifest.files).length,knownPresetSha256:sha(r.syx),deviceIO:false}));
}catch(e){console.error(e.message);process.exitCode=1;}

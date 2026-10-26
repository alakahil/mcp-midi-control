// Local, read-only preset inventory. No MIDI, networking, preset export or names in reports.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {loadDictionary} from './fm3-table-encoder.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const tailSha='ed7f69e7c6201a7aedda97f3ca1d188ae833bfb6dd147eceed8bd13a20b9483a';
export function auditCorpus(directory){
 const root=path.resolve(directory),st=fs.lstatSync(root);
 if(!st.isDirectory()||st.isSymbolicLink())throw Error('Input must be a real directory');
 const files=[];let skippedSymlinks=0,visited=0;
 function walk(dir){
  for(const item of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
   if(++visited>50000)throw Error('Directory entry limit exceeded (50000)');
   const file=path.join(dir,item.name);
   if(item.isSymbolicLink()){skippedSymlinks++;continue;}
   if(item.isDirectory())walk(file);
   else if(item.isFile()&&/\.syx$/i.test(item.name))files.push(file);
  }
 }
 walk(root);if(files.length>10000)throw Error('Preset file limit exceeded (10000)');
 const inventory=[],seen=new Map(),families={};let unsupportedSize=0;
 const dictionary=loadDictionary().params;
 for(const file of files){
  // A bank/other-size dump is unsupported; never decompress it speculatively.
  // O_NOFOLLOW also rejects a symlink substituted after directory discovery.
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  let bytes;
  try{
   const stat=fs.fstatSync(fd);
   if(!stat.isFile()||stat.size!==24680){unsupportedSize++;continue;}
   bytes=Buffer.alloc(24680);if(fs.readSync(fd,bytes,0,bytes.length,0)!==bytes.length)throw Error('Input changed during read');
   if(fs.fstatSync(fd).size!==stat.size)throw Error('Input changed during read');
  }finally{fs.closeSync(fd);}
  const hash=sha(bytes);
  if(seen.has(hash)){seen.get(hash).copies++;continue;}
  const row={sha256:hash,copies:1,bytes:bytes.length};seen.set(hash,row);inventory.push(row);
  try{
   const body=Buffer.from(inspectStructure(bytes).raw.body),scan=scanRecords(body,{requireAmpCab:false});
   const complete=sha(body.subarray(scan.tail))===tailSha;
   Object.assign(row,{status:complete?'supported-structure':'partial-record-scan',
    checks:{frameChecksums:true,presetCrc:true,footer:true},bodyBytes:body.length,
    records:scan.records.map(r=>({effectId:r.eid,baseEffectId:r.block,instance:r.instance,words:r.words,channels:r.channels,
      family:dictionary.find(p=>p.block===r.block)?.family??'unmapped'})),tailFingerprintMatched:complete});
   for(const r of row.records){const key=r.family+':'+r.words+'x'+r.channels;families[key]=(families[key]??0)+1;}
  }catch(error){Object.assign(row,{status:'unsupported-or-invalid',reason:error.message});}
 }
 inventory.sort((a,b)=>a.sha256<b.sha256?-1:a.sha256>b.sha256?1:0);
 return {schemaVersion:1,mode:'local-read-only-corpus-audit',metadataFirmware:13,firmwareDetected:null,
  files:files.length,uniqueSizedInputs:inventory.length,duplicates:inventory.reduce((n,r)=>n+r.copies-1,0),unsupportedSize,skippedSymlinks,
  summary:{supportedStructure:inventory.filter(r=>r.status==='supported-structure').length,
   partialRecordScans:inventory.filter(r=>r.status==='partial-record-scan').length,
   unsupportedOrInvalid:inventory.filter(r=>r.status==='unsupported-or-invalid').length,
   familyRecordShapes:Object.fromEntries(Object.entries(families).sort())},inventory,
  limits:['Only single 24680-byte FM3 0x0146 dumps are parsed. Banks and other formats remain unsupported.',
   'Firmware cannot be identified from the format word. FW13 dictionary metadata is a comparison baseline.',
   'Partial scans cannot establish block absence. A matching pinned system tail is required for a complete scan.',
   'Hashes deduplicate bytes, not independent device observations. Stored parameters do not prove ranges, visibility, DSP, CPU, sound or MIDI output.',
   'Report contains hashes and derived structure only: no filenames, preset names, parameter values or preset bytes.'],
  deviceIO:false,networkIO:false,presetWrites:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length!==4||args[0]!=='--input'||args[2]!=='--output')throw Error('Usage: node fm3-corpus-audit.mjs --input DIRECTORY --output NEW_REPORT.json');
 if(!args[3].endsWith('.json'))throw Error('Output must be a new .json report');
 const report=auditCorpus(args[1]);fs.writeFileSync(args[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({files:report.files,...report.summary,report:path.resolve(args[3]),presetWrites:false}));
 if(report.unsupportedSize||report.summary.partialRecordScans||report.summary.unsupportedOrInvalid)process.exitCode=2;
}

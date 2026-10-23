import {fileURLToPath} from 'node:url';
// Adapters retain every component's pinned-source and parameter validation.
// Component generators always receive their OWN approved donor, never a newly
// modified composer output. Only declared channel/control words are transferred.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {pair as drivePair,preflight as drivePreflight} from './drive-collector/drive-check.mjs';
import {generateDriveMulti} from './fm3-drive-multi.mjs';
import {generateDelayMulti} from './fm3-delay-multi.mjs';
import {generateReverbMulti} from './fm3-reverb-multi.mjs';
import {generateCompressorMulti} from './fm3-compressor-multi.mjs';
import {generateChorusMulti} from './fm3-chorus-multi.mjs';
import {generateFlangerMulti} from './fm3-flanger-multi.mjs';
import {generatePhaserMulti} from './fm3-phaser-multi.mjs';
import {generateWahMulti} from './fm3-wah-multi.mjs';
import {generateTremoloMulti} from './fm3-tremolo-multi.mjs';
import {generatePitchMulti} from './fm3-pitch-multi.mjs';
import {generateRotaryControls} from './fm3-rotary-controls.mjs';
import {composeFilterTemplates,filterLibraryHash} from './fm3-filter-library.mjs';
import {composeEnhancerFull} from './fm3-enhancer-full.mjs';
import {composeGeqFull} from './fm3-geq-full.mjs';
import {composePeqTemplates} from './fm3-peq-controls.mjs';
import {layout,layouts,composerBases} from './fm3-composer-bases.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
export const readComposerFile=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
export function readPinnedComposerFile(file,hash){const b=readComposerFile(file);check(sha(b)===hash,'Pinned composer donor changed: '+file);return b;}
export const componentDefinitions=Object.freeze({
  drive:{generate:generateDriveMulti},delay:{generate:generateDelayMulti},reverb:{generate:generateReverbMulti},
  compressor:{generate:generateCompressorMulti},chorus:{generate:generateChorusMulti},flanger:{generate:generateFlangerMulti},
  phaser:{generate:generatePhaserMulti},wah:{generate:generateWahMulti},
  tremolo:{generate:generateTremoloMulti,file:'references/tremolo-batch-20261007-143642/capture-001/donor.syx',sha256:'5531dd4219ef3545042ed93ae713a7b0370628b76dc51f1ca375c5b4334f8c62'},
  pitch:{generate:generatePitchMulti,file:'references/pitch-batch-20261007-153634/baseline.syx',sha256:'a7ba0f77b53d542902561e051d15256b041e71e652264e319309f9154ba2d1d2'},
  filter:{compose:composeFilterTemplates},peq:{compose:composePeqTemplates},geq:{compose:composeGeqFull},enhancer:{compose:composeEnhancerFull}
});
const hashes={drive:'61b3dbd4ed2215873340ba3994ae351f998ea565a04d64eecc3fae852e3a4b85',delay:'724ab79882b4e16ebc5cc7305133fb9ee5a5746785aa2930e72f6421a70b1bfd',reverb:'ce05e91f8cb4900619db413ac1a00eee58830af1a3cb27ad3eab7e7d847a9305',compressor:'1a13ab81d4935a0d3c7135459d836dc8b1f06c94ab4fae079be9b368972921fc',chorus:'94a689027e3f6c04ec0b80b7639e82fbbc0e4fba380525637e2e8ed01df9fded',flanger:'286e0ff64b91c66b24b69f24a108fee2c2c6a33cd5860651f20b7a65233e8a4c',phaser:'d9e8a9bbc2788cf304639c2feb68c47e86aaa73a5a224ef98ba0938eaea62f99',wah:'7a3c2057784c5737318706b6e47363ce36558483470c4dda3f62eb44ca27cf07',tremolo:'f67ea2bededced0e34dc457cb35b214afa9abe205bc0eadd0192829b9f58ebf7',pitch:'4817534c8265e22be7ade32ae974278710f0f84357d008742eb09dd4130a4584'};
export function composerLibraries(){return Object.fromEntries(Object.entries({...hashes,filter:filterLibraryHash}).map(([k,h])=>[k,JSON.parse(readPinnedComposerFile('references/'+k+'-library.json',h))]));}
function verifyDriveSources(lib,selections){
  check(Array.isArray(selections)&&selections.length>=1&&selections.length<=4,'Expected 1..4 Drive channels');
  const proofs=new Map();
  for(const s of selections){
    check(s&&typeof s==='object'&&!Array.isArray(s),'Invalid Drive selection');
    const m=lib.models.find(m=>m.name===s.type);check(m,'Unknown Drive type');
    const dir=new URL('../references/drive-batch-20261006-112254/'+m.source.capture+'/',import.meta.url);
    if(!proofs.has(m.source.capture))proofs.set(m.source.capture,{proof:drivePair(fileURLToPath(dir)),state:drivePreflight(fs.readFileSync(new URL('donor.syx',dir)))});
    const {proof,state}=proofs.get(m.source.capture),start='ABCD'.indexOf(m.source.channel)*44;
    check(proof.syxSha256===m.source.syxSha256&&proof.rawRxSha256===m.source.rawRxSha256&&m.words.every((w,i)=>w===state.words[start+i]),'Drive template differs from paired source');
  }
}
export function composeComponent(family,selections,libraries){
  const def=componentDefinitions[family];check(def,'Unsupported component');
  if(def.compose)return def.compose(selections);
  if(family==='drive')verifyDriveSources(libraries.drive,selections);
  const donor=def.file?def:composerBases[0],base=readPinnedComposerFile(donor.file,donor.sha256);
  const result=def.generate(base,{schemaVersion:1,firmware:13,baseProfile:'jb-'+family+'-multi',[family+'Channels']:selections});
  const donorLayout=(layouts[family]??layout)[family];
  const body=Buffer.from(inspectStructure(result.syx).raw.body);
  return {channels:result.report.channels,source:donor.file,sourceSha256:donor.sha256,wordsPerChannel:donorLayout.words,
    data:selections.map(s=>({channel:s.channel,bytes:Buffer.from(body.subarray(donorLayout.start+'ABCD'.indexOf(s.channel)*donorLayout.words*2,donorLayout.start+('ABCD'.indexOf(s.channel)+1)*donorLayout.words*2))}))};
}
export function composeRotary(values){
  const donor=readPinnedComposerFile('references/rotary-batch-20261007-151451/baseline.syx','07f557d31cfc76d0c1152fc7c82283b1044fc11aef1ab9d2655d32e279f7f061');
  const result=generateRotaryControls(donor,{schemaVersion:1,firmware:13,baseProfile:'jb-rotary-controls',rotaryA:values});
  return result.report.controls;
}

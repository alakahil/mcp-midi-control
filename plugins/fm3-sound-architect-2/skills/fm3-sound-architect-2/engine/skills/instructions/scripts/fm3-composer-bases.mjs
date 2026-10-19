// Exact firmware-13 specimens with independently inspected structural layouts.
// No discovery by scanning parameter data. NewLook insertion has its own writer.
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const block=(eid,header,words,typePid)=>Object.freeze({eid,header,start:header+46,words,...(typePid===undefined?{}:{typePid})});
export const layout=Object.freeze({
  amp:block(58,4610,144,6),cab:block(62,5808,106),
  drive:block(118,8414,44,0),delay:block(70,7346,89,6),
  reverb:block(66,9518,71,0),phaser:block(90,9192,35,0),
  compressor:block(46,7004,37,12),chorus:block(78,6702,32,0),
  flanger:block(82,8104,33,0),wah:block(94,10132,25,0)
});
function alternate(kind){
  const out={...layout};delete out.flanger;
  out.drive=block(118,8104,44,0);
  out.phaser=block(90,kind==='pitch'?9840:8882,35,0);
  out.reverb=block(66,kind==='pitch'?10166:9208,71,0);
  out.wah=block(94,{tremolo:10044,rotary:10036,pitch:10780}[kind],25,0);
  out[kind]=kind==='tremolo'?block(106,9822,22,0):kind==='rotary'?block(86,9822,21):block(110,8882,114,0);
  return Object.freeze(out);
}
export const layouts=Object.freeze({standard:layout,tremolo:alternate('tremolo'),rotary:alternate('rotary'),pitch:alternate('pitch'),newlook:Object.freeze({amp:block(58,4610,144,6),cab:block(62,5808,106),drive:block(118,7568,44,0),delay:block(70,6702,89,6),reverb:block(66,8346,71,0)})});
// A block donor only; the active collection preset is not a new user base.
export const filterDonor=Object.freeze({file:'references/filter-batch-20261008-132133/baseline.syx',sha256:'9a254a1af26b64025cb9a281fb53845e7e7f95a6713ea2ec5d2b7e670edbfd80',bodyBytes:13146,blocks:Object.freeze({filter:block(114,7568,37,0)})});
export const peqDonor=Object.freeze({file:'examples/FM3_PEQ_BASELINE.syx',sha256:'c1a706b9078793dd3c8db4873e329f06d2a5f96a1f4be201a4501477821277be',bodyBytes:13456,blocks:Object.freeze({peq:block(54,8688,33)})});
export const geqDonor=Object.freeze({file:'examples/FM3_GEQ_BASELINE.syx',sha256:'51f5f3e297bec66f9bf36e0482e1e360bea93ec35fd09f7c80b1e88c78a2470b',bodyBytes:13662,blocks:Object.freeze({geq:block(50,8308,20,15)})});
export const enhancerDonor=Object.freeze({file:'examples/FM3_ENHANCER_BASELINE.syx',sha256:'755c477cd39b471b1c381f82dc735ad1285f2966d258a7381e8110a8f52a6d41',bodyBytes:13804,blocks:Object.freeze({enhancer:block(122,7460,12,6)})});
export const composerBases=Object.freeze([
  {id:'jb-original',file:'examples/JB_YDOM_RHYTHM.syx',sha256:'bffe9dd559b443ebe3822532e951a27cb0a827600cb929d52dfccd3228d611ca',layout:'standard',bodyBytes:14222},
  {id:'jb-balanced',file:'examples/JB_RHYTHM_LEVEL_MINUS3.syx',sha256:'7df04a541f45ef0d73e08de3583f0cd8a34f061392a28aa6691875689563b902',layout:'standard',bodyBytes:14222},
  {id:'jb-balanced-export',file:'examples/JB_RHYTHM_LEVEL_MINUS3_export.syx',sha256:'a7262b9703e23d3641be39344e13472b9b7ccd509305e08f76d3db1677cb97b3',layout:'standard',bodyBytes:14222},
  {id:'jb-tremolo',file:'examples/FM3_TREMOLO_ABCD_TEST_export.syx',sha256:'de7dfc12cbcd2ad517f10f13d392f8b859aee75e94286152d14b80fe9d1596f1',layout:'tremolo',bodyBytes:14134},
  {id:'jb-rotary',file:'examples/FM3_ROTARY_A_TEST_export.syx',sha256:'4eda4d22b89fb843ce47ab011bf01290a2cdbaabb9fe0219038faa5f5f0e7095',layout:'rotary',bodyBytes:14126},
  {id:'jb-pitch',file:'examples/FM3_PITCH_ABCD_TEST_export.syx',sha256:'1b7ffc02a8e56749677a24fc55b192b0cb414dc960c3af408c17e3d78fc918a8',layout:'pitch',bodyBytes:14870},
  {id:'jb-newlook',file:'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',sha256:'afacded0a3c3a30cfbf48b4e3daa08c0639482f0f1973e429763150ff7e9372c',layout:'newlook',bodyBytes:12804}
].map(Object.freeze));
export function resolveComposerBase(bytes){
  const base=composerBases.find(b=>b.sha256===sha(bytes));
  if(!base)throw Error('Unrecognised composer base; use a listed, unchanged bundled composer base');
  return {...base,blocks:layouts[base.layout]};
}
export function checkComposerStructure(body,base){
  if(body.length!==base.bodyBytes)throw Error('Unexpected composer body length');
  for(const [family,b] of Object.entries(base.blocks)){
    if(body.readUInt16LE(b.header)!==b.eid||body.readUInt16LE(b.header+42)!==b.words||body.readUInt16LE(b.header+44)!==4)throw Error('Unexpected '+family+' structure');
    if(b.start+8*b.words>body.length)throw Error('Out-of-bounds '+family+' channel region');
    for(let i=0;i<8;i++)if(body.readUInt16LE(b.header+10+2*i)>3||body.readUInt16LE(b.header+26+2*i)>1)throw Error('Invalid '+family+' scene assignment');
  }
}

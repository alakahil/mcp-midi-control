// Narrow offline layout writer, exclusively for the pinned user NewLook export.
// Copy complete measured records, replace existing serial shunts, retain every
// original record and opaque system byte. Hardware roundtrip remains separate.
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {composerBases,layouts,filterDonor,peqDonor,geqDonor,enhancerDonor,checkComposerStructure} from './fm3-composer-bases.mjs';
import {readPinnedComposerFile} from './fm3-composer-components.mjs';
const check=(v,m)=>{if(!v)throw Error(m)},own=(o,k)=>Object.hasOwn(o,k);
// Zero-based row/column; reported coordinates are one-based FM3-Edit positions.
export const newlookSlots=Object.freeze({
  compressor:{row:1,col:1,shunt:1024,donor:'jb-balanced-export'},
  wah:{row:1,col:2,shunt:1025,donor:'jb-balanced-export'},
  phaser:{row:1,col:4,shunt:1026,donor:'jb-balanced-export'},
  pitch:{row:2,col:1,shunt:1031,donor:'jb-pitch'},
  chorus:{row:2,col:2,shunt:1032,donor:'jb-balanced-export'},
  flanger:{row:2,col:3,shunt:1033,donor:'jb-balanced-export'},
  rotary:{row:2,col:4,shunt:1034,donor:'jb-rotary'},
  tremolo:{row:2,col:5,shunt:1035,donor:'jb-tremolo'},
  filter:{row:1,col:8,shunt:1028,donor:'filter-baseline'},
  peq:{row:1,col:9,shunt:1029,donor:'peq-baseline'},
  geq:{row:1,col:10,shunt:1030,donor:'geq-baseline'},
  enhancer:{row:2,col:10,shunt:1038,donor:'enhancer-baseline'}
});
// Filter follows Send and precedes Drive in the supplied export. Its ordering
// alongside Flanger is an offline composition choice, not a device proof.
const order=[58,62,78,46,70,122,186,182,114,82,118,50,37,42,90,110,54,66,86,106,94];
const donorFor=slot=>{if(slot.donor==='filter-baseline')return filterDonor;if(slot.donor==='peq-baseline')return peqDonor;if(slot.donor==='geq-baseline')return geqDonor;if(slot.donor==='enhancer-baseline')return enhancerDonor;const base=composerBases.find(b=>b.id===slot.donor);return {...base,blocks:layouts[base.layout]};};
const core=[[58,4610,144,4],[62,5808,106,4],[70,6702,89,4],[186,7460,6,1],[182,7518,2,1],[118,7568,44,4],[37,7966,10,4],[42,8092,26,4],[66,8346,71,4]];
const gridAt=(row,col)=>260+col*16+row*4;
function record(body,eid,header,words,channels){
  check(body.readUInt16LE(header)===eid&&body.readUInt16LE(header+42)===words&&body.readUInt16LE(header+44)===channels,'NewLook record boundary mismatch');
  const end=header+46+2*words*channels;check(end<=body.length,'NewLook record out of bounds');
  return {eid,words,channels,bytes:Buffer.from(body.subarray(header,end))};
}
export function prepareNewLook(source,target,spec){
  const families=Object.keys(newlookSlots).filter(f=>own(spec,f==='rotary'?'rotaryA':f+'Channels'));
  if(target.layout!=='newlook'){
    check(!own(spec,'addedBlockScenes'),'addedBlockScenes requires jb-newlook and newly inserted blocks');
    return {body:Buffer.from(source),target,insertions:[]};
  }
  checkComposerStructure(source,target);
  if(own(spec,'addedBlockScenes'))check(spec.addedBlockScenes&&typeof spec.addedBlockScenes==='object'&&!Array.isArray(spec.addedBlockScenes),'Invalid addedBlockScenes');
  const requested=spec.addedBlockScenes??{};
  check(Object.keys(requested).every(f=>families.includes(f)),'addedBlockScenes may only address a newly requested block');
  const records=core.map(([eid,h,w,c])=>record(source,eid,h,w,c));
  const prefix=Buffer.from(source.subarray(0,4610)),tail=Buffer.from(source.subarray(8960));
  const insertions=[];
  for(const family of families){
    const slot=newlookSlots[family],base=donorFor(slot),b=base.blocks[family];
    const donor=Buffer.from(inspectStructure(readPinnedComposerFile(base.file,base.sha256)).raw.body);
    checkComposerStructure(donor,base);
    const r=record(donor,b.eid,b.header,b.words,4);
    // Never inherit donor scene activation. Each new block starts bypassed on A.
    r.bytes.fill(0,10,26);for(let s=0;s<8;s++)r.bytes.writeUInt16LE(1,26+s*2);
    const scenes=requested[family]??[];check(Array.isArray(scenes)&&scenes.length<=8,'Expected up to 8 added block scene assignments');
    const seen=new Set(),provided=family==='rotary'?['A']:(Array.isArray(spec[family+'Channels'])?spec[family+'Channels'].map(c=>c?.channel):[]);
    for(const s of scenes){
      check(s&&typeof s==='object'&&!Array.isArray(s)&&Object.keys(s).length===3&&Object.keys(s).every(k=>['scene','channel','bypass'].includes(k)),'Invalid added block scene assignment');
      check(Number.isInteger(s.scene)&&s.scene>=1&&s.scene<=8&&!seen.has(s.scene)&&typeof s.channel==='string'&&/^[ABCD]$/.test(s.channel)&&typeof s.bypass==='boolean','Invalid or duplicate added block scene');
      check(provided.includes(s.channel),'Added block scenes require an explicitly requested channel template');
      seen.add(s.scene);r.bytes.writeUInt16LE('ABCD'.indexOf(s.channel),10+2*(s.scene-1));r.bytes.writeUInt16LE(s.bypass?1:0,26+2*(s.scene-1));
    }
    const at=gridAt(slot.row,slot.col);check(prefix.readUInt16LE(at)===slot.shunt&&prefix.readUInt16LE(at+2)===(1<<slot.row),'NewLook insertion slot is not the expected serial shunt');
    prefix.writeUInt16LE(b.eid,at);records.push(r);
    insertions.push({family,eid:b.eid,row:slot.row+1,column:slot.col+1,replacedShunt:slot.shunt,donor:base.file,donorSha256:base.sha256,recordBytes:r.bytes.length,defaultScenes:'A, bypass',sceneAssignments:scenes,hardware:'Pending generated-layout import/export'});
  }
  records.sort((a,b)=>order.indexOf(a.eid)-order.indexOf(b.eid));
  const body=Buffer.concat([prefix,...records.map(r=>r.bytes),tail]),blocks={};
  const definitions={...target.blocks,...Object.fromEntries(families.map(f=>[f,donorFor(newlookSlots[f]).blocks[f]]))};
  let at=4610;
  for(const r of records){
    const family=Object.keys(definitions).find(f=>definitions[f].eid===r.eid);
    if(family)blocks[family]={...definitions[family],header:at,start:at+46};
    at+=r.bytes.length;
  }
  const adjusted={...target,blocks,bodyBytes:body.length};checkComposerStructure(body,adjusted);
  // Preserve every existing record, including the single-channel Send/Return.
  for(const [eid,h,w,c] of core){const r=records.find(r=>r.eid===eid);check(r.bytes.equals(source.subarray(h,h+46+2*w*c)),'Existing record modified by insertion');}
  const allowedGrid=new Set(insertions.flatMap(x=>{const at=gridAt(x.row-1,x.column-1);return [at,at+1]}));
  for(let i=0;i<4610;i++)check(prefix[i]===source[i]||allowedGrid.has(i),'Collateral prefix change');
  check(body.subarray(at).equals(tail),'System tail changed');
  check(body.length===source.length+insertions.reduce((n,x)=>n+x.recordBytes,0),'Unexpected insertion length');
  return {body,target:adjusted,insertions};
}
export function newlookSignalRows(grid){
  return [1,2].map(row=>grid.filter(g=>g.row===row&&!g.is_shunt).sort((a,b)=>a.col-b.col).map(g=>g.name).join(' → '));
}

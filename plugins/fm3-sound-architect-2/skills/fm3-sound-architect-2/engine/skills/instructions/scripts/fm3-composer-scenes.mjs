// Scene headers use the same observed format in every pinned composer layout.
// Only names and declared effect channel/bypass words are authored here.
const check=(v,m)=>{if(!v)throw Error(m)},own=(o,k)=>Object.hasOwn(o,k);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const legacy={
  scene6Name:[6,'name'],phaserScene6Bypass:[6,'phaser','bypass'],
  reverbScene6:[6,'reverb','channel'],delayScene6Bypass:[6,'delay','bypass'],
  ampScene6:[6,'amp','channel'],delayScene2:[2,'delay','bypass'],reverbScene1:[1,'reverb','channel']
};
export function applyComposerScenes(body,blocks,spec,insertions,allow){
  if(!own(spec,'scenes'))return [];
  check(Array.isArray(spec.scenes)&&spec.scenes.length>=1&&spec.scenes.length<=8,'scenes must contain 1..8 entries');
  const reserved=new Map();
  for(const [key,parts] of Object.entries(legacy))if(own(spec,key))reserved.set(parts.join('.'),key);
  for(const [family,entries] of Object.entries(spec.addedBlockScenes??{}))for(const e of entries)for(const field of ['channel','bypass'])reserved.set([e.scene,family,field].join('.'),'addedBlockScenes');
  const claim=parts=>{const key=parts.join('.');check(!reserved.has(key),'Duplicate scene field '+key+' conflicts with '+reserved.get(key));reserved.set(key,'scenes');};
  const seen=new Set(),operations=[];
  for(const entry of spec.scenes){
    check(object(entry)&&Object.keys(entry).every(k=>['scene','name','blocks'].includes(k)),'Unknown scene entry field');
    check(Number.isInteger(entry.scene)&&entry.scene>=1&&entry.scene<=8&&!seen.has(entry.scene),'Invalid or duplicate scene number');
    seen.add(entry.scene);check(own(entry,'name')||own(entry,'blocks'),'Empty scene entry');
    if(own(entry,'name')){
      check(typeof entry.name==='string'&&/^[ -~]{1,31}$/.test(entry.name)&&entry.name===entry.name.trim(),'Scene name must be 1..31 printable ASCII characters without edge spaces');
      const offset=4+(entry.scene-1)*32;check(body[offset+31]===0,'Unexpected scene name terminator');
      claim([entry.scene,'name']);const bytes=Buffer.alloc(31,32);Buffer.from(entry.name,'ascii').copy(bytes);
      operations.push({scene:entry.scene,field:'name',value:entry.name,offset,bytes});
    }
    if(own(entry,'blocks')){
      check(object(entry.blocks)&&Object.keys(entry.blocks).length>0,'Scene blocks must be a nonempty object');
      for(const [family,state] of Object.entries(entry.blocks)){
        check(own(blocks,family),'Scene block is absent or unsupported: '+family);
        const l=blocks[family];check(object(state)&&Object.keys(state).length>0&&Object.keys(state).every(k=>['channel','bypass'].includes(k)),'Scene block supports only channel and bypass');
        const offset=l.header+10+2*(entry.scene-1);
        if(own(state,'channel'))check(typeof state.channel==='string'&&/^[ABCD]$/.test(state.channel),'Scene channel must be A, B, C or D');
        if(own(state,'bypass'))check(typeof state.bypass==='boolean','Scene bypass must be boolean');
        // New blocks must use explicitly selected templates before activation.
        // A request to bypass an unconfigured new A channel remains harmless.
        if(insertions.some(x=>x.family===family)){
          const channel=state.channel??'ABCD'[body.readUInt16LE(offset)];
          const provided=family==='rotary'?['A']:(spec[family+'Channels']??[]).map(c=>c.channel);
          if(own(state,'channel')||state.bypass===false)check(provided.includes(channel),'New block scene requires an explicitly requested '+family+' channel template');
        }
        for(const field of ['channel','bypass'])if(own(state,field)){
          claim([entry.scene,family,field]);const at=field==='channel'?offset:offset+16,raw=field==='channel'?'ABCD'.indexOf(state.channel):state.bypass?1:0;
          const bytes=Buffer.alloc(2);bytes.writeUInt16LE(raw);
          operations.push({scene:entry.scene,family,field,value:state[field],offset:at,bytes});
        }
      }
    }
  }
  // Validate the complete request first, then apply only declared fields.
  return operations.map(({bytes,...op})=>{
    const before=Buffer.from(body.subarray(op.offset,op.offset+bytes.length));
    bytes.copy(body,op.offset);allow(op.offset,bytes.length);
    return {...op,bytes:bytes.length,changed:!bytes.equals(before)};
  });
}

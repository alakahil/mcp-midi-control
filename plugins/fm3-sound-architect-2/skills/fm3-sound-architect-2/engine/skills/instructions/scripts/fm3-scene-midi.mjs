// Scene MIDI block (FM3 "MIDI" block, effect 190, 257 x 1 words). Offline.
// Layout decoded on the user's FM3 Mk II Turbo, fw 13, 2026-10-24 (references/fm3-scene-midi-20261024.json):
// one front-panel change per step, block 190 read back with fn=0x1F after each; every step changed
// exactly one word. Command index k = (scene-1)*8 + (command-1), 8 scenes x 8 commands:
//   word k        type      0 = none, 1 = CC, 2 = PC
//   word 64 + k   channel   channel - 1 (MIDI channel 1..16)
//   word 128 + k  number    CC number, stored as shown; unused by PC (the FM3 shows "Number --")
//   word 192 + k  value     CC value, or the PC program, stored as shown in the Value field
//   word 256      not changed by any step; never written here.
// PC semantics (references/fm3-scene-midi-pc-20261024.json): with type PC the FM3 shows "Number --",
// refuses edits to Number, and the Value field changes word 192 + k; switching the type to CC shows the
// kept number word again. A type change touches only the type word, so a PC leaves the number word as is.
// Measured points: types none/CC/PC; channel 1..3; number 0, 1, 5, 20; value 0, 10, 64; commands
// S1C1, S2C1, S2C2, S8C1, S8C7. Ranges beyond those follow MIDI (channel 1..16, number/value 0..127).
const check=(v,m)=>{if(!v)throw Error(m)};
export const SCENE_MIDI_EID=190;
export const SCENE_MIDI_TYPES=Object.freeze({NONE:0,CC:1,PC:2});
const TYPE_NAME=Object.fromEntries(Object.entries(SCENE_MIDI_TYPES).map(([k,v])=>[v,k]));
const FIELDS=['scene','command','type','channel','number','value','program'];
const index=(scene,command)=>(scene-1)*8+(command-1);

// Validate the spec list: [{scene, command, type, channel?, program (PC) | number + value? (CC)}]
export function validateSceneMidi(list){
  check(Array.isArray(list)&&list.length>0&&list.length<=64,'sceneMidi must be a list of 1..64 commands');
  const seen=new Set(),byte=(v,i,f,what)=>check(Number.isInteger(v)&&v>=0&&v<=127,`sceneMidi[${i}]: ${f} must be 0..127 (${what})`);
  return list.map((c,i)=>{
    check(c&&typeof c==='object'&&!Array.isArray(c),'sceneMidi entry must be an object');
    for(const k of Object.keys(c))check(FIELDS.includes(k),`sceneMidi[${i}]: unknown field ${k}`);
    check(Number.isInteger(c.scene)&&c.scene>=1&&c.scene<=8,`sceneMidi[${i}]: scene must be 1..8`);
    check(Number.isInteger(c.command)&&c.command>=1&&c.command<=8,`sceneMidi[${i}]: command must be 1..8`);
    check(Object.hasOwn(SCENE_MIDI_TYPES,c.type),`sceneMidi[${i}]: type must be PC, CC or NONE`);
    const k=index(c.scene,c.command);check(!seen.has(k),`sceneMidi: scene ${c.scene} command ${c.command} given twice`);seen.add(k);
    if(c.type==='NONE'){for(const f of ['channel','number','value','program'])check(c[f]===undefined,`sceneMidi[${i}]: ${f} with type NONE`);return {scene:c.scene,command:c.command,type:'NONE',index:k};}
    const channel=c.channel??1;check(Number.isInteger(channel)&&channel>=1&&channel<=16,`sceneMidi[${i}]: channel must be 1..16`);
    if(c.type==='PC'){
      check(c.number===undefined,`sceneMidi[${i}]: PC takes program, not number (the FM3 shows Number "--" for PC and keeps the program in the Value field)`);
      check(c.value===undefined,`sceneMidi[${i}]: PC takes program, not value`);
      byte(c.program,i,'program','PC program, as shown in the FM3 Value field');
      return {scene:c.scene,command:c.command,type:'PC',channel,program:c.program,index:k};}
    check(c.program===undefined,`sceneMidi[${i}]: program applies to PC only`);
    byte(c.number,i,'number','CC number');const value=c.value??0;byte(value,i,'value','CC value');
    return {scene:c.scene,command:c.command,type:'CC',channel,number:c.number,value,index:k};
  });
}
// Words a command writes: [base, raw]. A type change on the device touches only the type word, and PC
// never touches the number word, so neither is written here.
const wordsOf=c=>c.type==='NONE'?[[0,0]]:c.type==='PC'?[[0,2],[64,c.channel-1],[192,c.program]]:[[0,1],[64,c.channel-1],[128,c.number],[192,c.value]];
// Write commands into the Scene MIDI record (record from scanRecords). allow(offset, bytes) marks writes.
export function applySceneMidi(body,record,list,allow=()=>{}){
  check(record&&record.eid===SCENE_MIDI_EID&&record.words===257&&record.channels===1,'sceneMidi needs the Scene MIDI block in the preset (insert: ["scenemidi"])');
  const cmds=validateSceneMidi(list),writes=[];
  for(const c of cmds)for(const [base,v] of wordsOf(c)){
    const o=record.start+2*(base+c.index);writes.push({word:base+c.index,before:body.readUInt16LE(o),raw:v});body.writeUInt16LE(v,o);allow(o,2);}
  return {commands:cmds.map(({index,...c})=>c),writes};
}
// Decode every command whose type is set (for the final .txt / report), as the FM3 shows it.
export function describeSceneMidi(body,record){
  const out=[];
  for(let k=0;k<64;k++){const w=b=>body.readUInt16LE(record.start+2*(b+k)),t=w(0);if(!t)continue;
    const c={scene:Math.floor(k/8)+1,command:k%8+1,type:TYPE_NAME[t]??`unknown(${t})`,channel:w(64)+1};
    out.push(t===2?{...c,program:w(192)}:{...c,number:w(128),value:w(192)});}
  return out;
}
export function sceneMidiCapabilities(){
  return {field:'sceneMidi',block:'scenemidi (insert in grid mode; placed unconnected, no input, feeds nothing)',
    entry:'{scene 1..8, command 1..8, type PC|CC|NONE, channel 1..16 (default 1); PC: program 0..127 (FM3 Value field); CC: number 0..127, value 0..127 (default 0)}',
    evidence:'decoded on FM3 fw 13, 2026-10-24: 11 single-field front-panel changes, each one word (references/fm3-scene-midi-20261024.json); PC program = Value field (references/fm3-scene-midi-pc-20261024.json)',
    notVerified:'other message types, range ends beyond the measured points, MIDI actually transmitted on scene change, whether the sent PC equals the shown value or one less (display offset)'};
}

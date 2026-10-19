// FM3 two-row layout composer (0.75.0). Offline only; no device I/O.
// Row 2: In 1 (col 1) → blocks → Send (col 12). Row 3: Return (col 1) → blocks → Out 1 (col 12).
// Rows 1 and 4 stay empty. Block records carry no grid position, so placing a block
// is a grid-only edit; every record byte and the system tail are preserved.
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {loadDictionary,findParam,encodeValue,decodeValue,FAMILY_BY_SLUG,assertFields,channelIndex,validateControl,validateOptions} from './fm3-table-encoder.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
export const GRID={start:260,end:452,rows:4,cols:12};
export const IO=Object.freeze({in1:37,out1:42,send:182,ret:186});
export const SHUNT_MIN=1024;
const RECORDS_START=4610;
const gridAt=(row,col)=>GRID.start+col*16+row*4; // zero-based row/col
export const SLUG_BY_EID=Object.freeze({58:'amp',62:'cab',118:'drive',70:'delay',66:'reverb',90:'phaser',46:'compressor',78:'chorus',82:'flanger',94:'wah',106:'tremolo',86:'rotary',110:'pitch',114:'filter',54:'peq',50:'geq',122:'enhancer'});
const EID_BY_SLUG=Object.fromEntries(Object.entries(SLUG_BY_EID).map(([e,s])=>[s,+e]));

// Sequential effect records from 4610; stops at the first non-record (system tail).
export function scanRecords(body){
  const d=loadDictionary(),words=new Map();
  for(const p of d.params)words.set(p.block,Math.max(words.get(p.block)??0,p.param+1));
  const out=[];let at=RECORDS_START;
  for(;;){
    if(at+46>body.length)break;
    const eid=body.readUInt16LE(at),w=body.readUInt16LE(at+42),ch=body.readUInt16LE(at+44);
    const io=eid===IO.send||eid===IO.ret;
    if(!(io?ch===1:(ch===4&&words.get(eid)===w)))break;
    const size=46+2*w*ch;check(at+size<=body.length,'Record out of bounds');
    out.push({eid,family:SLUG_BY_EID[eid]??(eid===IO.in1?'in1':eid===IO.out1?'out1':eid===IO.send?'send':eid===IO.ret?'return':'eid'+eid),header:at,start:at+46,words:w,channels:ch,size});
    at+=size;
  }
  check(out.some(r=>r.eid===58)&&out.some(r=>r.eid===62),'Amp/Cab records not found');
  return {records:out,tail:at};
}
export function readGrid(body){
  const cells=[];
  for(let r=0;r<GRID.rows;r++)for(let c=0;c<GRID.cols;c++){const o=gridAt(r,c);cells.push({row:r,col:c,id:body.readUInt16LE(o),mask:body.readUInt16LE(o+2)})}
  return cells;
}
// Even spread of n blocks over the 10 inner columns (zero-based cols 1..10).
export function spreadColumns(n){check(n<=10,'Max 10 blocks per row');return Array.from({length:n},(_,k)=>1+Math.floor((k+0.5)*10/n))}

// layout: {row2:[slug...], row3:[slug...], columns?:{slug:1-based col}}
export function planGrid(body,layout){
  assertFields(layout,['row2','row3','columns'],'layout');
  check(Array.isArray(layout.row2)&&Array.isArray(layout.row3),'layout.row2 and row3 must be arrays');
  if(layout.columns!==undefined)assertFields(layout.columns,[...layout.row2,...layout.row3],'layout.columns');
  const grid=readGrid(body),placed=grid.filter(g=>g.id&&g.id<SHUNT_MIN&&!Object.values(IO).includes(g.id));
  const fixed=[[1,0,IO.in1],[1,11,IO.send],[2,0,IO.ret],[2,11,IO.out1]];
  for(const [r,c,id] of fixed)check(grid.find(g=>g.row===r&&g.col===c).id===id,'Base is not a two-row In/Send/Return/Out layout');
  check(grid.filter(g=>g.row===0||g.row===3).every(g=>g.id===0&&g.mask===0),'Rows 1 and 4 must be empty');
  const rows=[layout.row2??[],layout.row3??[]];
  const want=rows.flat();check(new Set(want).size===want.length,'A block appears twice');
  for(const s of want)check(EID_BY_SLUG[s],'Unknown block '+s);
  const have=new Set(placed.map(g=>g.id)),need=new Set(want.map(s=>EID_BY_SLUG[s]));
  check(have.size===need.size&&[...have].every(e=>need.has(e)),`Layout must list exactly the placed blocks: ${[...have].map(e=>SLUG_BY_EID[e]).join(', ')}`);
  check(rows[0].includes('amp')&&rows[0].includes('cab')&&rows[0].indexOf('amp')<rows[0].indexOf('cab'),'Amp must precede Cab in row 2');
  const target=new Map();
  rows.forEach((list,ri)=>{
    const cols=layout.columns?list.map(s=>{const c=layout.columns[s];check(Number.isInteger(c)&&c>=2&&c<=11,'Column for '+s+' must be 2..11');return c-1}):spreadColumns(list.length);
    for(let i=1;i<cols.length;i++)check(cols[i]>cols[i-1],'Columns must increase along the row');
    list.forEach((s,i)=>target.set(`${ri+1}:${cols[i]}`,EID_BY_SLUG[s]));
  });
  // Shunt IDs: a cell that stays a shunt keeps its ID; freed IDs go to new shunt cells in reading order.
  const inner=[];for(const r of [1,2])for(let c=1;c<=10;c++)inner.push({r,c});
  const oldId=Object.fromEntries(grid.map(g=>[`${g.row}:${g.col}`,g.id]));
  const shuntIds=grid.filter(g=>g.id>=SHUNT_MIN).map(g=>g.id);
  check(shuntIds.length+placed.length===20,'Expected 20 inner cells');
  const keep=new Set(),out=new Map();
  for(const {r,c} of inner){const k=`${r}:${c}`;if(target.has(k))out.set(k,target.get(k));else if(oldId[k]>=SHUNT_MIN){out.set(k,oldId[k]);keep.add(oldId[k])}}
  const free=shuntIds.filter(i=>!keep.has(i)).sort((a,b)=>a-b);
  for(const {r,c} of inner){const k=`${r}:${c}`;if(!out.has(k))out.set(k,free.shift())}
  check(free.length===0,'Shunt accounting failed');
  return {cells:inner.map(({r,c})=>({row:r,col:c,id:out.get(`${r}:${c}`),mask:1<<r})),rows};
}
export function writeGrid(body,plan){
  const b=Buffer.from(body);
  for(const x of plan.cells){const o=gridAt(x.row,x.col);b.writeUInt16LE(x.id,o);b.writeUInt16LE(x.mask,o+2)}
  return b;
}
export function describeRows(body){
  const g=readGrid(body),nm=id=>id===IO.in1?'In 1':id===IO.out1?'Out 1':id===IO.send?'Send':id===IO.ret?'Return':SLUG_BY_EID[id]??null;
  return [1,2].map(r=>g.filter(x=>x.row===r&&x.id&&x.id<SHUNT_MIN).sort((a,b)=>a.col-b.col).map(x=>`${nm(x.id)}(${x.col+1})`).join(' → '));
}

// Table controls on any record layout (positions found by scanning records).
export function applyTableControls(body,controls,opts={},allow=()=>{}){
  validateOptions(opts);
  check(!opts.experimental,'Sound controls do not allow experimental writes');
  check(Array.isArray(controls),'controls must be an array');
  const {records}=scanRecords(body),writes=[],seen=new Set();
  for(const c of controls){
    validateControl(c);
    const r=records.find(x=>x.family===c.block);check(r,`Block ${c.block} is not placed in this preset`);
    const p=findParam(c.block,c.param);check(p.block===r.eid&&p.param<r.words,'Parameter/record mismatch');
    const ch=channelIndex(c.channel);check(ch<r.channels,'Channel absent in block');
    const offset=r.start+ch*r.words*2+p.param*2;check(!seen.has(offset),'Duplicate control');seen.add(offset);
    const raw=encodeValue(p,c.value,opts);
    writes.push({block:c.block,channel:c.channel,name:p.name,label:p.label,status:p.status,kind:p.kind,value:c.value,raw,before:body.readUInt16LE(offset),offset,display:decodeValue(p,raw)});
    body.writeUInt16LE(raw,offset);allow(offset,2);
  }
  return writes;
}
// Scene channel/bypass for any placed block: {block:[{scene,channel,bypass}]}
export function applyBlockScenes(body,blockScenes,allow=()=>{}){
  assertFields(blockScenes,Object.keys(SLUG_BY_EID).map(k=>SLUG_BY_EID[k]),'blockScenes');
  const {records}=scanRecords(body),edits=[];
  for(const [family,list] of Object.entries(blockScenes)){
    const r=records.find(x=>x.family===family);check(r&&r.channels===4,`Block ${family} is not placed`);
    check(Array.isArray(list)&&list.length<=8,'Up to 8 scene entries');const seen=new Set();
    for(const s of list){
      assertFields(s,['scene','channel','bypass'],'block scene');
      check(Object.hasOwn(s,'channel')||Object.hasOwn(s,'bypass'),'Empty block scene');
      check(Number.isInteger(s.scene)&&s.scene>=1&&s.scene<=8&&!seen.has(s.scene),'Invalid scene');seen.add(s.scene);
      if(s.channel!==undefined){channelIndex(s.channel);const o=r.header+10+2*(s.scene-1);body.writeUInt16LE('ABCD'.indexOf(s.channel),o);allow(o,2)}
      if(s.bypass!==undefined){check(typeof s.bypass==='boolean','bypass must be boolean');const o=r.header+26+2*(s.scene-1);body.writeUInt16LE(s.bypass?1:0,o);allow(o,2)}
      edits.push({family,...s});
    }
  }
  return edits;
}

// Re-encode a modified body into the given SYX; verify readback and that only allowed bytes changed.
export function finalizeBody(syx,original,body,allowed){
  const before=inspectStructure(syx);check(Buffer.from(before.raw.body).equals(original),'Stage input mismatch');
  check(body.length===original.length,'Layout/control stages never change body length');
  for(let i=0;i<body.length;i++)if(body[i]!==original[i])check(allowed.has(i),'Collateral change at '+i);
  const out=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(before.raw.rawPatch,body)));
  const after=inspectStructure(out),actual=Buffer.from(after.raw.body);
  check(actual.equals(body),'Body readback mismatch');
  check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
  check(after.decoded.preset_name===before.decoded.preset_name,'Name changed');
  const raw=Buffer.from(after.raw.rawPatch);check(raw.readUInt16LE(72)===actual.length&&raw.readUInt16LE(74)===after.raw.compSize,'Invalid encoded size');
  check(raw.subarray(76+after.raw.compSize).every(v=>v===0),'Nonzero output padding');
  return out;
}

// Stage: arrange grid, then optional scenes and table controls, on an already composed SYX.
export function arrangeSound(syx,spec,opts={}){
  const original=Buffer.from(inspectStructure(syx).raw.body),body=Buffer.from(original),allowed=new Set();
  const allow=(s,n)=>{for(let i=s;i<s+n;i++)allowed.add(i)};
  const recordsBefore=scanRecords(original);
  const plan=planGrid(body,spec.layout);const g=writeGrid(body,plan);g.copy(body);allow(GRID.start,GRID.end-GRID.start);
  const sceneEdits=spec.blockScenes?applyBlockScenes(body,spec.blockScenes,allow):[];
  const writes=spec.controls?applyTableControls(body,spec.controls,opts,allow):[];
  if(spec.selectedScene!==undefined){check(Number.isInteger(spec.selectedScene)&&spec.selectedScene>=1&&spec.selectedScene<=8,'selectedScene must be 1..8');body[0]=spec.selectedScene-1;allow(0,1)}
  const recordsAfter=scanRecords(body);
  check(recordsAfter.tail===recordsBefore.tail&&body.subarray(recordsAfter.tail).equals(original.subarray(recordsBefore.tail)),'System tail changed');
  check(recordsAfter.records.length===recordsBefore.records.length,'Record set changed');
  const out=finalizeBody(syx,original,body,allowed);
  const grid=readGrid(Buffer.from(inspectStructure(out).raw.body));
  for(const r of [1,2])for(let c=1;c<=11;c++){const x=grid.find(g=>g.row===r&&g.col===c);check(x.id&&x.mask===1<<r,`Broken chain at row ${r+1} col ${c+1}`)}
  return {syx:out,rows:describeRows(body),sceneEdits,writes,report:{stage:'fm3-layout 0.75.0',outputSha256:sha(out),bytes:out.length,
    checks:{twoRows:true,chainContinuous:true,recordsUnchanged:spec.controls||spec.blockScenes?'only declared control/scene bytes':'all',systemTailPreserved:true,frameChecksums:true,presetCrc:true,footer:true,bodyReadback:true}}};
}

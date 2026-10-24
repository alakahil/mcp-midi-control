// Audit point 5: general 4 x 12 grid, parallel rows, block removal and second instances. Offline.
//
// Grid words (body 260..451): cell (row r, col c) = u16 id + u16 input mask at 260 + c*16 + r*4.
// Evidence, FW10 factory banks (grid bytes survive the device's FW10->FW13 conversion unchanged):
// 384 presets, 4801 occupied cells. Mask bit k = input from row k of the previous column; every set
// bit (0..3) points to an occupied cell; column 1 never has inputs; 144 fan-outs and 140 merges.
// Cells without input in columns > 1 are sources only (In 1/In 2, Feedback Return, Synth).
// Bit 4 occurs on 8 merge cells with no known meaning: never written here. Shunts: ids 1024+, unique.
// Instance records differ from instance 1 only in the effect ID (8 factory pairs), so a second
// instance is the instance-1 record with eid = base + instance - 1 and fresh scenes (A, bypass).
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {scanRecords,readGrid,blockOf,SLUG_BY_EID,IO,SHUNT_MIN,GRID,applyBlockScenes,applyTableControls,finalizeBody} from './fm3-layout.mjs';
import {INSERTABLE,GATED,insertDonor} from './fm3-insert-blocks.mjs';
import {applySceneMidi,SCENE_MIDI_EID,sceneMidiCapabilities} from './fm3-scene-midi.mjs';
import {baseSlug,assertFields} from './fm3-table-encoder.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
const RECORDS_START=4610,ROWS=4,COLS=12;
const gridAt=(row,col)=>GRID.start+col*16+row*4;
const IO_SLUG={in1:IO.in1,out1:IO.out1,send:IO.send,return:IO.ret};
const SOURCES=new Set(['in1','return']),OPTIONAL_INPUT=new Set(['synth']),SINKS=new Set(['out1','send']);
// Instances seen in the FW10 factory banks / FW13 exports (effect ID = base + n - 1).
export const INSTANCE_LIMIT=Object.freeze({compressor:2,geq:2,peq:2,delay:2,chorus:2,flanger:2,phaser:2,wah:2,formant:2,volpan:2,tremolo:2,filter:4,drive:2,enhancer:2,resonator:2});
const eidOfSlug=slug=>{
  if(IO_SLUG[slug])return IO_SLUG[slug];
  const base=baseSlug(slug),eid=Object.entries(SLUG_BY_EID).find(([,s])=>s===base)?.[0];if(!eid)return null;
  const n=base===slug?1:Number(slug.slice(base.length));return Number(eid)+n-1;
};
const slugOf=r=>r.eid===IO.in1?'in1':r.eid===IO.out1?'out1':r.eid===IO.send?'send':r.eid===IO.ret?'return':r.family;

function reencode(syx,before,body){
  let raw;try{raw=reencodeRawPatch(before.raw.rawPatch,body)}catch{throw Error('Preset too large for one FM3 dump')}
  const out=Buffer.from(reencodeDumpFromRawPatch(syx,raw)),rb=inspectStructure(out);
  check(Buffer.from(rb.raw.body).equals(body),'Body readback mismatch');
  check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(rb.parsed.headerPayload)),'Dump header changed');
  check(rb.decoded.preset_name===before.decoded.preset_name,'Name changed');
  const rp=Buffer.from(rb.raw.rawPatch);check(rp.readUInt16LE(72)===body.length&&rp.readUInt16LE(74)===rb.raw.compSize,'Invalid encoded size');
  check(rp.subarray(76+rb.raw.compSize).every(v=>v===0),'Nonzero output padding');
  return out;
}

// Blocks the grid mode may add from the device-default donor: the point-6 set plus the two
// parallel-routing blocks (Mixer 126, Multiplexer 191; same donor export, all channels identical).
export const GRID_ADDABLE=Object.freeze({...INSERTABLE,mixer:126,multiplexer:191,scenemidi:190});

// Remove records, add donor blocks and second instances. Grid cells of removed blocks become
// empty; added records get no cell. The grid stage then writes the whole layout.
export function editRecords(syx,{remove=[],duplicate=[],add=[]}={}){
  check(Array.isArray(remove)&&Array.isArray(duplicate)&&Array.isArray(add),'remove, duplicate and insert must be arrays');
  const before=inspectStructure(syx),original=Buffer.from(before.raw.body),{records,tail}=scanRecords(original);
  const keep=[],removed=[],added=[];const prefix=Buffer.from(original.subarray(0,RECORDS_START));
  for(const slug of remove){check(typeof slug==='string'&&slug!=='in1'&&slug!=='out1','Cannot remove '+slug+' (In 1 and Out 1 stay)');check(!['amp','cab'].includes(slug),'Amp and Cab stay (composer base contract)');
    const r=records.find(x=>x.family===slug);check(r,'Not placed: '+slug);removed.push(r);}
  check(new Set(remove).size===remove.length,'A block is removed twice');
  check(remove.includes('send')===remove.includes('return'),'Send and Return are removed as a pair');
  for(const slug of add){
    check(typeof slug==='string'&&Object.hasOwn(GRID_ADDABLE,slug),`${slug}: not addable${GATED[slug]&&!['mixer','multiplexer','scenemidi'].includes(slug)?' — '+GATED[slug]:''}`);
    const eid=GRID_ADDABLE[slug];check(!records.some(r=>r.eid===eid),slug+' is already placed');
    const rec=Buffer.from(insertDonor().byEid.get(eid));
    // Scene MIDI is engaged in every scene (channel A), as in the device's own fresh block; effect blocks start bypassed.
    for(let s=0;s<8;s++){rec.writeUInt16LE(0,10+2*s);rec.writeUInt16LE(slug==='scenemidi'?0:1,26+2*s);}
    added.push({slug,eid,rec,from:'device-default donor'});
  }
  check(new Set(add).size===add.length,'A block is inserted twice');
  for(const r of records)if(!removed.includes(r))keep.push(Buffer.from(original.subarray(r.header,r.header+r.size)));
  for(const g of readGrid(original))if(removed.some(r=>r.eid===g.id)){prefix.writeUInt16LE(0,gridAt(g.row,g.col));prefix.writeUInt16LE(0,gridAt(g.row,g.col)+2);}
  for(const slug of duplicate){
    const base=baseSlug(slug);check(base!==slug,'Duplicate needs an instance name such as drive2: '+slug);
    const n=Number(slug.slice(base.length));check(n<=(INSTANCE_LIMIT[base]??1),`${slug}: instance ${n} not evidenced on FM3 (limit ${INSTANCE_LIMIT[base]??1})`);
    const src=records.find(x=>x.family===(n===2?base:base+(n-1)))??records.find(x=>x.family===base);check(src&&!removed.includes(src),`${slug} needs ${base} in the preset`);
    const eid=eidOfSlug(slug);check(!records.some(r=>r.eid===eid)&&!added.some(a=>a.eid===eid),slug+' already exists');
    const rec=Buffer.from(original.subarray(src.header,src.header+src.size));rec.writeUInt16LE(eid,0);
    for(let s=0;s<8;s++){rec.writeUInt16LE(0,10+2*s);rec.writeUInt16LE(1,26+2*s);}
    added.push({slug,eid,rec,from:src.family});
  }
  check(new Set(duplicate).size===duplicate.length,'A block is duplicated twice');
  const body=Buffer.concat([prefix,...keep,...added.map(a=>a.rec),original.subarray(tail)]);
  const after=scanRecords(body);
  check(after.records.length===records.length-removed.length+added.length,'Record count after edit');
  check(body.subarray(after.tail).equals(original.subarray(tail)),'System tail changed');
  for(const a of added)check(after.records.some(r=>r.eid===a.eid&&r.family===a.slug),'Record not scanned as '+a.slug);
  keep.forEach((k,i)=>{const n=after.records[i];check(body.subarray(n.header,n.header+n.size).equals(k),'Kept record modified');});
  const out=reencode(syx,before,body);
  return {syx:out,removed:removed.map(r=>r.family),
    inserted:added.filter(a=>a.from==='device-default donor').map(a=>({block:a.slug,effectId:a.eid,defaultScenes:a.slug==='scenemidi'?'A, engaged (all 8 scenes)':'A, bypass (all 8 scenes)'})),
    duplicated:added.filter(a=>a.from!=='device-default donor').map(a=>({block:a.slug,effectId:a.eid,from:a.from,defaultScenes:'A, bypass (all 8 scenes)'})),
    report:{stage:'fm3-grid records 0.1.0',outputSha256:sha(out),bodyBytes:body.length,
      checks:{keptRecordsByteIdentical:true,systemTailPreserved:true,instanceRecordsDifferOnlyInEffectIdAndScenes:true,bodyReadback:true}}};
}

// Pure graph stage: cells (4 x 12 of null | '-' | name), links, role(name) -> 'source'|'sink'|'optional'|'block'.
// Returns every occupied cell with its input rows; throws on any broken or dangling path.
export function planCells(cellAt,links,role){
  const inputs=new Map(),seen=new Set();
  for(const l of links){
    assertFields(l,['row','col','from'],'link');
    check(Number.isInteger(l.row)&&l.row>=1&&l.row<=ROWS&&Number.isInteger(l.col)&&l.col>=2&&l.col<=COLS,'Link row 1..4, col 2..12');
    check(Array.isArray(l.from)&&l.from.every(x=>Number.isInteger(x)&&x>=1&&x<=ROWS)&&new Set(l.from).size===l.from.length,'Link from: distinct rows 1..4');
    const k=`${l.row-1}:${l.col-1}`;check(!seen.has(k),'Duplicate link for one cell');seen.add(k);
    check(cellAt(l.row-1,l.col-1),`Link targets an empty cell (row ${l.row}, col ${l.col})`);
    for(const f of l.from)check(cellAt(f-1,l.col-2),`Link from row ${f} col ${l.col-1}: empty cell`);
    inputs.set(k,l.from.map(f=>f-1));
  }
  const cells=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const v=cellAt(r,c);if(!v)continue;const kind=v==='-'?'block':role(v);
    let ins=inputs.get(`${r}:${c}`)??(c>0&&cellAt(r,c-1)?[r]:[]);
    if(kind==='source'){check(!inputs.has(`${r}:${c}`)||!inputs.get(`${r}:${c}`).length,`${v} is a source and takes no input`);ins=[];}
    // Scene MIDI carries no audio: no input, and nothing may take its output (as in the device's own export).
    if(kind==='standalone'){check(!inputs.get(`${r}:${c}`)?.length,`${v} carries no audio and takes no input`);ins=[];}
    if(c===0)check(ins.length===0,'Column 1 has no inputs');
    if(kind!=='source'&&kind!=='optional'&&kind!=='standalone')check(ins.length>0,`${v==='-'?'Shunt':v} at row ${r+1}, col ${c+1} has no input`);
    cells.push({r,c,v,kind,ins});
  }
  // Every cell lies on a source -> sink path.
  const key=(r,c)=>`${r}:${c}`,fromSrc=new Set(),toSink=new Set();
  for(const x of [...cells].sort((a,b)=>a.c-b.c))if(x.kind==='source'||(x.kind==='optional'&&!x.ins.length)||x.ins.some(i=>fromSrc.has(key(i,x.c-1))))fromSrc.add(key(x.r,x.c));
  for(const x of [...cells].sort((a,b)=>b.c-a.c)){
    const outs=cells.filter(y=>y.c===x.c+1&&y.ins.includes(x.r));
    if(x.kind==='sink'||outs.some(y=>toSink.has(key(y.r,y.c))))toSink.add(key(x.r,x.c));
  }
  for(const x of cells)for(const i of x.ins){const s=cells.find(y=>y.r===i&&y.c===x.c-1);check(!s||s.kind!=='standalone',`${x.v==='-'?'Shunt':x.v} at row ${x.r+1}, col ${x.c+1} takes input from ${s?.v}, which carries no audio (leave the next cell empty or link it from another row)`);}
  for(const x of cells.filter(x=>x.kind!=='standalone')){check(fromSrc.has(key(x.r,x.c)),`${x.v} at row ${x.r+1}, col ${x.c+1} is not fed from an input`);
    check(toSink.has(key(x.r,x.c)),`${x.v} at row ${x.r+1}, col ${x.c+1} does not reach Out 1 or Send`);}
  return cells.map(x=>({...x,mask:x.ins.reduce((m,i)=>m|1<<i,0)}));
}
const STANDALONE=new Set(['scenemidi']);
const roleOf=v=>STANDALONE.has(v)?'standalone':SOURCES.has(v)?'source':SINKS.has(v)?'sink':OPTIONAL_INPUT.has(baseSlug(v))?'optional':'block';

// grid: {rows:[[12 cells] x 4], links?:[{row,col,from:[rows]}]} with 1-based row/col; a cell is
// null|'' (empty), '-' (shunt) or a block name (in1, out1, send, return, amp, drive2, mixer ...).
// Default input: the same row of the previous column when that cell is occupied.
export function planGeneralGrid(body,grid){
  assertFields(grid,['rows','links'],'grid');
  check(Array.isArray(grid.rows)&&grid.rows.length===ROWS&&grid.rows.every(r=>Array.isArray(r)&&r.length===COLS),'grid.rows must be 4 rows of 12 cells');
  const links=grid.links??[];check(Array.isArray(links),'grid.links must be an array');
  const cellAt=(r,c)=>{const v=grid.rows[r][c];check(v===null||typeof v==='string','Cell must be a name, "-" or empty');return v===null||v===''||v==='.'?null:v;};
  const {records}=scanRecords(body),present=new Map(records.map(r=>[slugOf(r),r]));
  const placed=new Map();
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const v=cellAt(r,c);if(!v||v==='-')continue;
    check(present.has(v),`Grid names ${v}, which is not in the preset`);check(!placed.has(v),`${v} placed twice`);placed.set(v,{r,c});}
  for(const k of present.keys())check(placed.has(k),`${k} is in the preset but not on the grid (remove it or place it)`);
  check(placed.has('in1')&&placed.has('out1'),'In 1 and Out 1 must be placed');
  const cells=planCells(cellAt,links,roleOf),byKey=new Map(cells.map(x=>[`${x.r}:${x.c}`,x]));
  let shunt=SHUNT_MIN;const words=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=byKey.get(`${r}:${c}`);
    if(!x){words.push({r,c,id:0,mask:0});continue;}
    words.push({r,c,id:x.v==='-'?shunt++:present.get(x.v).eid,mask:x.mask});}
  return {words,cells};
}
// True for the composer's serial two-row shape (rows 2/3 only, every cell fed from its own row).
export function isTwoRowSerial(body){
  return readGrid(body).every(g=>(g.row===1||g.row===2)?(g.col===0?g.mask===0:g.id===0||g.mask===1<<g.row):g.id===0&&g.mask===0);
}
export function gridCapabilities(){
  return {field:'grid',rows:ROWS,columns:COLS,cell:'"" or null = empty, "-" = shunt, otherwise a placed block (in1, out1, send, return, amp, drive2, mixer ...)',
    links:'[{row,col,from:[rows]}] (1-based); default input is the same row of the previous column when occupied',
    sources:[...SOURCES],sinks:[...SINKS],inputOptional:[...OPTIONAL_INPUT],remove:'spec.remove: block names (not In 1/Out 1/Amp/Cab; Send+Return together)',
    duplicate:{field:'spec.duplicate',instances:INSTANCE_LIMIT,record:'copy of the previous instance, own effect ID, all 8 scenes A/bypass'},
    insert:{field:'spec.insert',blocks:Object.keys(GRID_ADDABLE),record:'device-default donor, all 8 scenes A/bypass, no grid cell until placed'},
    evidence:'384 FW10 factory presets / 4801 cells: mask bit k = input from row k of the previous column (0 violations), 144 splits, 140 merges; instance records = instance 1 with its own effect ID (8 factory pairs)',
    neverWritten:'grid mask bit 4 (seen on 8 factory merge cells, meaning unknown)',sceneMidi:sceneMidiCapabilities(),hardware:'confirmed 2026-10-23: 7 generated grids (splits, merges, 4 rows, Mixer, Multiplexer, Synth source, Send/Return, instances, removals) read back identical in all 48 cells (references/fm3-grid-check-20261023.json); the FM3 screen showed the encoded branch',linkSemantics:'a link names its target cell; its source is the previous column. The report lists every split/merge source by block and warns when an Amp path reaches Out 1/Send without a Cab'};
}
const nameOf=id=>id===IO.in1?'In 1':id===IO.out1?'Out 1':id===IO.send?'Send':id===IO.ret?'Return':id>=SHUNT_MIN?'-':(()=>{const b=blockOf(id);return b?(SLUG_BY_EID[b.block]??'eid'+id)+(b.instance>1?b.instance:''):'eid'+id})();
export function describeGrid(body){
  const g=readGrid(body);
  return [0,1,2,3].map(r=>g.filter(x=>x.row===r).map(x=>x.id?nameOf(x.id)+(x.mask&&x.mask!==1<<r?'<'+[0,1,2,3].filter(k=>x.mask>>k&1).map(k=>k+1).join('+'):''):'.').join(' | '));
}
// Every split and merge in plain words, traced back through single-input shunts to the block that
// actually feeds it (a branch fed from the cell left of Cab is fed from Amp: the link column is the
// target, its source is the previous column). 1-based rows/columns, as on the FM3 screen.
export function describeLinks(body){
  const g=readGrid(body),at=(r,c)=>g.find(x=>x.row===r&&x.col===c),ins=x=>[0,1,2,3].filter(k=>x.mask>>k&1);
  const origin=(r,c)=>{let x=at(r,c);while(x.id>=SHUNT_MIN&&x.col>0&&ins(x).length===1)x=at(ins(x)[0],x.col-1);return x.id>=SHUNT_MIN?`shunt (rida ${x.row+1}, veerg ${x.col+1})`:`${nameOf(x.id)} (rida ${x.row+1}, veerg ${x.col+1})`;};
  const out=[];
  for(const x of g){if(!x.id||x.col===0)continue;const k=ins(x);
    if(k.length>1||(k.length===1&&k[0]!==x.row))out.push(`rida ${x.row+1}, veerg ${x.col+1} (${nameOf(x.id)}) ← ${k.map(r=>origin(r,x.col-1)).join(' + ')}`);}
  return out;
}
// Sound-design warnings (not refusals): an Amp output that reaches Out 1/Send without a Cab.
export function gridWarnings(body){
  const g=readGrid(body),at=(r,c)=>g.find(x=>x.row===r&&x.col===c),warn=[];
  const isAmp=id=>blockOf(id)?.block===58,isCab=id=>blockOf(id)?.block===62,sink=id=>id===IO.out1||id===IO.send;
  const bad=(x,seen)=>{ // path from x (exclusive) to a sink that meets no Cab
    if(sink(x.id))return true;if(x.col===11)return false;
    return g.filter(y=>y.col===x.col+1&&y.id&&y.mask>>x.row&1).some(y=>!isCab(y.id)&&(sink(y.id)||bad(y,seen)));
  };
  for(const x of g)if(x.id&&isAmp(x.id)&&bad(x))warn.push(`${nameOf(x.id)} (rida ${x.row+1}, veerg ${x.col+1}) jõuab Out 1/Send-ini vähemalt ühe haru kaudu ilma Cabita`);
  return warn;
}
// Stage: write the general grid, then scenes, controls and the selected scene (same rules as arrangeSound).
export function arrangeGrid(syx,spec,opts={}){
  const original=Buffer.from(inspectStructure(syx).raw.body),body=Buffer.from(original),allowed=new Set();
  const allow=(s,n)=>{for(let i=s;i<s+n;i++)allowed.add(i)};
  const recordsBefore=scanRecords(original),plan=planGeneralGrid(body,spec.grid);
  for(const w of plan.words){const o=gridAt(w.r,w.c);body.writeUInt16LE(w.id,o);body.writeUInt16LE(w.mask,o+2);}allow(GRID.start,GRID.end-GRID.start);
  const sceneEdits=spec.blockScenes?applyBlockScenes(body,spec.blockScenes,allow):[];
  const writes=spec.controls?applyTableControls(body,spec.controls,opts,allow):[];
  const sceneMidi=spec.sceneMidi===undefined?null:applySceneMidi(body,scanRecords(body).records.find(r=>r.eid===SCENE_MIDI_EID),spec.sceneMidi,allow);
  if(spec.selectedScene!==undefined){check(Number.isInteger(spec.selectedScene)&&spec.selectedScene>=1&&spec.selectedScene<=8,'selectedScene must be 1..8');body[0]=spec.selectedScene-1;allow(0,1)}
  const recordsAfter=scanRecords(body);
  check(recordsAfter.tail===recordsBefore.tail&&body.subarray(recordsAfter.tail).equals(original.subarray(recordsBefore.tail)),'System tail changed');
  check(recordsAfter.records.length===recordsBefore.records.length,'Record set changed');
  const out=finalizeBody(syx,original,body,allowed);
  const back=readGrid(Buffer.from(inspectStructure(out).raw.body));
  for(const w of plan.words){const g=back.find(x=>x.row===w.r&&x.col===w.c);check(g.id===w.id&&g.mask===w.mask,'Grid readback')}
  return {syx:out,rows:describeGrid(body),links:describeLinks(body),warnings:gridWarnings(body),sceneEdits,writes,sceneMidi,expectedGrid:plan.words.filter(w=>w.id),report:{stage:'fm3-grid 0.1.0',outputSha256:sha(out),bytes:out.length,
    checks:{generalGrid:true,everyCellOnInputToOutputPath:true,maskBitsWithinRows:true,recordsUnchanged:spec.controls||spec.blockScenes?'only declared control/scene bytes':'all',systemTailPreserved:true,frameChecksums:true,presetCrc:true,footer:true,bodyReadback:true}}};
}

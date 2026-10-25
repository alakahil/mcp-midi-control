// Read-only grid inspection. Raw words are preserved, unknown bits are never cables.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {readGrid,scanRecords,blockOf,SLUG_BY_EID,SHUNT_MIN} from './fm3-layout.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const TAIL_SHA='ed7f69e7c6201a7aedda97f3ca1d188ae833bfb6dd147eceed8bd13a20b9483a';
const check=(v,m)=>{if(!v)throw Error(m)};
const integer=(v,max)=>Number.isInteger(v)&&v>=0&&v<=max;
const key=(r,c)=>r*12+c;
const endpointNames={37:'in1',38:'in2',42:'out1',43:'out2',182:'send',186:'return',190:'scenemidi'};
function identity(id){
 if(!id)return {name:null,role:'empty'};
 if(id>=SHUNT_MIN)return {name:'shunt',role:'block'};
 const b=blockOf(id),slug=SLUG_BY_EID[b?.block];
 const name=endpointNames[id]??(slug?slug+(b.instance>1?b.instance:''):'eid'+id);
 const role=[37,38,186].includes(id)?'source':[42,43,182].includes(id)?'sink':id===190?'standalone':
  [130,131].includes(id)?'optional':b&&(slug||b.block>=46&&b.block<=178)?'block':'unknown';
 return {name,role};
}
export function decodeGridMask(raw){
 check(integer(raw,65535),'Grid mask must be a uint16 integer');
 return {raw,knownMask:raw&15,unknownMask:raw&65520,inputRows:[1,2,3,4].filter(r=>(raw&(2**(r-1)))!==0)};
}

// Captured 590-byte FM3 fn=01/sub=2E response, decoded without opening a MIDI port.
// Other response lengths remain unsupported until separately evidenced.
export function decodeGridReply(frame){
 check(Buffer.isBuffer(frame)||frame instanceof Uint8Array,'Grid reply must be bytes');
 const f=Buffer.from(frame);
 check(f.length===590&&f.subarray(0,7).toString('hex')==='f000017411012e'&&f.at(-1)===247,'Unsupported grid reply framing');
 check([...f.subarray(1,-1)].every(v=>v<128),'Grid reply is not 7-bit data');
 check((f.subarray(0,-2).reduce((v,b)=>v^b,0)&127)===f.at(-2),'Grid reply checksum mismatch');
 const region=f.subarray(-228,-2),read=(at,n)=>{let value=0;for(let i=0;i<n;i++){const k=at+i;value=value*2+((region[Math.floor(k/7)]>>(6-k%7))&1);}return value;};
 const cells=[];for(let row=0;row<4;row++)for(let col=0;col<12;col++){
  const at=45+col*128+row*32;
  cells.push({row,col,id:read(at,8)+256*read(at+8,8),mask:read(at+16,8)+256*read(at+24,8)});
 }
 return cells;
}

// Cells are zero-based here, matching readGrid; all public report coordinates are one-based.
// This checks the author's graph rules, not whether an arbitrary preset is valid on hardware.
export function analyzeGridCells(input){
 check(Array.isArray(input)&&input.length===48,'Expected all 48 grid cells');
 const cells=Array(48),violations=[],unresolved=[];
 for(const x of input){
  check(x&&integer(x.row,3)&&integer(x.col,11)&&integer(x.id,65535)&&integer(x.mask,65535),'Invalid grid cell');
  const k=key(x.row,x.col);check(!cells[k],'Duplicate grid coordinate');
  cells[k]={row:x.row+1,col:x.col+1,effectId:x.id,...identity(x.id),...decodeGridMask(x.mask)};
 }
 check(cells.every(Boolean),'Missing grid coordinate');
 const add=(list,code,x,extra={})=>list.push({code,row:x.row,col:x.col,...extra});
 const byId=new Map(),edges=[];
 for(const x of cells){
  if(x.unknownMask)add(unresolved,'unknown-mask-bits',x,{mask:x.unknownMask,bit4:Boolean(x.unknownMask&16)});
  if(!x.effectId){if(x.raw)add(violations,'empty-cell-has-mask',x);continue;}
  if(byId.has(x.effectId))add(violations,'duplicate-effect-or-shunt-id',x,{effectId:x.effectId,first:byId.get(x.effectId)});
  else byId.set(x.effectId,{row:x.row,col:x.col});
  if(x.role==='unknown')add(unresolved,'unknown-cell-role',x,{effectId:x.effectId});
  if(x.col===1&&x.knownMask)add(violations,'first-column-has-input',x);
  if(['source','standalone'].includes(x.role)&&x.knownMask)add(violations,'non-audio-input',x,{role:x.role});
  if(x.col===1)continue;
  for(const r of x.inputRows){
   const from=cells[key(r-1,x.col-2)];
   if(!from.effectId)add(violations,'input-from-empty-cell',x,{from:{row:r,col:x.col-1}});
   else if(from.role==='standalone')add(violations,'input-from-scene-midi',x,{from:{row:r,col:x.col-1}});
   else edges.push({from:{row:r,col:x.col-1,effectId:from.effectId},to:{row:x.row,col:x.col,effectId:x.effectId}});
  }
 }
 const incoming=Array.from({length:48},()=>[]),outgoing=Array.from({length:48},()=>[]);
 for(const e of edges){const f=key(e.from.row-1,e.from.col-1),t=key(e.to.row-1,e.to.col-1);incoming[t].push(f);outgoing[f].push(t);}
 const ordered=cells.map((x,i)=>({x,i})).sort((a,b)=>a.x.col-b.x.col||a.x.row-b.x.row);
 const origins=Array.from({length:48},()=>new Set()),sinks=Array.from({length:48},()=>new Set());
 for(const {x,i} of ordered){
  if(x.role==='source'||x.role==='optional'&&x.knownMask===0)origins[i].add(i);
  if(!['source','standalone','empty'].includes(x.role))for(const f of incoming[i])for(const o of origins[f])origins[i].add(o);
 }
 for(const {x,i} of [...ordered].reverse()){
  if(x.role==='sink')sinks[i].add(i);
  if(!['standalone','empty'].includes(x.role))for(const t of outgoing[i])for(const s of sinks[t])sinks[i].add(s);
 }
 const position=i=>({row:cells[i].row,col:cells[i].col,effectId:cells[i].effectId,name:cells[i].name});
 const paths=[];
 for(const {x,i} of ordered){
  if(!x.effectId||x.role==='standalone')continue;
  if(!origins[i].size)add(violations,'not-reached-from-known-source',x);
  if(!sinks[i].size)add(violations,'does-not-reach-known-sink',x);
  if(x.role==='source'||x.role==='optional'&&x.knownMask===0)paths.push({source:position(i),sinks:[...sinks[i]].sort((a,b)=>a-b).map(position)});
 }
 // Track both Cab-present and Cab-absent paths; a merge must not hide the latter.
 const ampRoutes=[];
 for(const {x:amp,i:start} of ordered.filter(({x})=>blockOf(x.effectId)?.block===58)){
  const states=Array(48).fill(0);states[start]=1;
  for(const {x,i} of ordered){
   if(!states[i])continue;
   if(x.role==='sink')ampRoutes.push({amp:position(start),sink:position(i),withoutCab:Boolean(states[i]&1),withCab:Boolean(states[i]&2)});
   for(const t of outgoing[i]){
    if(['source','standalone'].includes(cells[t].role))continue;
    states[t]|=blockOf(cells[t].effectId)?.block===62?2:states[i];
   }
  }
 }
 return {coordinateBase:1,rows:4,columns:12,cells,edges,paths,ampRoutes,violations,unresolved,
  summary:{occupiedCells:cells.filter(c=>c.effectId).length,shunts:cells.filter(c=>c.effectId>=SHUNT_MIN).length,
   edges:edges.length,splits:outgoing.filter(a=>a.length>1).length,merges:incoming.filter(a=>a.length>1).length,
   standalone:cells.filter(c=>c.role==='standalone').length,unknownMaskCells:cells.filter(c=>c.unknownMask).length,
   bit4Cells:cells.filter(c=>c.unknownMask&16).length,violations:violations.length,unresolved:unresolved.length}};
}

export function auditGrid(bytes){
 const data=Buffer.from(bytes),snapshot=Buffer.from(data),s=inspectStructure(data),body=Buffer.from(s.raw.body);
 const grid=analyzeGridCells(readGrid(body));
 let scan;try{scan=scanRecords(body,{requireAmpCab:false});}catch(e){scan={records:[],tail:null,error:e.message};}
 const complete=scan.tail!==null&&sha(body.subarray(scan.tail))===TAIL_SHA;
 const gridIds=new Set(grid.cells.filter(c=>c.effectId&&c.effectId<SHUNT_MIN).map(c=>c.effectId));
 const recordIds=scan.records.map(r=>r.eid),uniqueIds=new Set(recordIds);
 const links={complete,tailFingerprintMatched:complete,scanStoppedAt:scan.tail,error:scan.error??null,
  duplicateRecordIds:[...uniqueIds].filter(id=>recordIds.filter(v=>v===id).length>1),
  gridIdsWithoutParsedRecord:[...gridIds].filter(id=>!uniqueIds.has(id)).sort((a,b)=>a-b),
  parsedRecordIdsWithoutCell:[...uniqueIds].filter(id=>!gridIds.has(id)).sort((a,b)=>a-b)};
 check(data.equals(snapshot),'Read-only grid audit changed its input');
 return {schemaVersion:1,mode:'read-only-grid-audit',sourceSha256:sha(data),bytes:data.length,
  format:'0x0146',firmwareDetected:null,metadataFirmware:13,
  envelope:{frameChecksums:true,presetCrc:true,footer:true},grid,recordAssociation:links,
  structuralStatus:grid.violations.length?'violations-of-authoring-rules':grid.unresolved.length||!complete||links.duplicateRecordIds.length||links.gridIdsWithoutParsedRecord.length||links.parsedRecordIdsWithoutCell.length?'unresolved':'consistent-known-edges',
  generatorEligibility:'not-evaluated',
  limits:['Only explicit previous-column grid cables (mask bits 0..3) are traced. Unknown bits, including bit 4, remain raw and unresolved.',
   'Send and Return are separate endpoints here. No implicit feedback, physical cable, USB or global I/O connection is inferred.',
   'In 2 / Out 2 can be identified for reading; this does not enable writing them or validate FOH+monitor or 4CM.',
   'An isolated effect may be intentional. Authoring-rule violations are not a hardware-validity verdict.',
   'Cab paths describe node presence, not channel/bypass, selected IR, block internals or audible routing. Mixer/Multiplexer input selection is not simulated.',
   'A partial record scan cannot establish block absence. The format word does not identify firmware.',
   'No authoring permission, import/STORE, audio, CPU or device behavior is proved. The generator still requires a supported base and complete request.'],
  deviceIO:false,networkIO:false,presetWrites:false};
}

export function readGridPreset(file){
 const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const st=fs.fstatSync(fd);check(st.isFile()&&st.size===24680,'Expected one regular 24680-byte FM3 preset');
  const bytes=Buffer.alloc(st.size);check(fs.readSync(fd,bytes,0,bytes.length,0)===bytes.length&&fs.fstatSync(fd).size===st.size,'Preset changed during read');
  return auditGrid(bytes);
 }finally{fs.closeSync(fd);}
}

export function renderGridAuditText(a){
 const g=a.grid;
 return ['FM3 RUUDUSTIKU LUGEMISAUDIT',`SHA-256: ${a.sourceSha256}`,`Staatus: ${a.structuralStatus}`,
  `Lahtrid: ${g.summary.occupiedCells}/48; kaablid: ${g.summary.edges}; hargnemised: ${g.summary.splits}; liitmised: ${g.summary.merges}`,
  ...g.cells.filter(c=>c.effectId||c.raw).map(c=>`Rida ${c.row}, veerg ${c.col}: ${c.name??'tühi'} (ID ${c.effectId}); mask ${c.raw}; eelmise veeru read ${c.inputRows.join(', ')||'puuduvad'}; tundmatu mask ${c.unknownMask}`),
  ...g.paths.map(p=>`Tee ${p.source.name} (${p.source.row},${p.source.col}) → ${p.sinks.map(s=>`${s.name} (${s.row},${s.col})`).join(', ')||'tuntud lõpp puudub'}`),
  ...g.ampRoutes.filter(p=>p.withoutCab).map(p=>`HOIATUS: ${p.amp.name} → ${p.sink.name} vähemalt ühe haru kaudu ilma Cab-plokita.`),
  ...g.violations.map(v=>`KONTROLL: ${v.code} (${v.row},${v.col})`),...g.unresolved.map(v=>`LAHTINE: ${v.code} (${v.row},${v.col})`),
  `Kirjete täielik lugemine: ${a.recordAssociation.complete}; kirjutusõigus: kontrollimata.`,
  'Piirid:',...a.limits.map(l=>'- '+l),'Seadet ei kasutatud; presetifaili ei muudetud.',''].join('\n');
}

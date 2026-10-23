// Regression for fm3-grid (audit point 5: general 4 x 12 grid, removal, second instances). Offline.
import fs from 'node:fs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords,readGrid,GRID,SHUNT_MIN} from './fm3-layout.mjs';
import {editRecords,arrangeGrid,planCells,describeGrid,describeLinks,gridWarnings,isTwoRowSerial,INSTANCE_LIMIT,GRID_ADDABLE} from './fm3-grid.mjs';
import {composeSound} from './fm3-sound.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
const rd=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const NL=rd('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),body=b=>Buffer.from(inspectStructure(b).raw.body);
const refuse=(f,re,why)=>{let m='';try{f()}catch(e){m=e.message}check(re.test(m),why+': expected '+re+' got '+(m||'success'))};
const E=()=>Array(12).fill('');
let refusals=0;const no=(f,re,why)=>{refuse(f,re,why);refusals++};

// 1. factory receipt: every FW10 factory grid passes planCells and its masks are reproduced
const ev=JSON.parse(rd('references/fm3-factory-grid-evidence.json')).grid;
check(ev.presets===384&&ev.plannerAccepted===384&&ev.masksReproduced===ev.cells&&ev.cells===4801&&ev.maskBitsToEmptyCell===0&&ev.column1Inputs===0,'Factory grid receipt');
check(Object.keys(ev.noInputBeyondColumn1).every(k=>['37','38','130','186'].includes(k)),'Inputless cells are sources or Synth only');
// every instance the generator allows was seen in a factory preset (effect ID = base + n - 1)
const BASE={compressor:46,geq:50,peq:54,delay:70,chorus:78,flanger:82,phaser:90,wah:94,formant:98,volpan:102,tremolo:106,filter:114,drive:118,enhancer:122,resonator:162};
check(Object.keys(INSTANCE_LIMIT).every(k=>BASE[k]),'Instance bases');
for(const [k,n] of Object.entries(INSTANCE_LIMIT))for(let i=2;i<=n;i++)check(ev.instanceEffectIds[BASE[k]+i-1],`${k}${i} not seen in factory presets`);

// device receipt 2026-10-23: 7 generated grids read back identical in all 48 cells
const hw=JSON.parse(rd('references/fm3-grid-check-20261023.json'));
check(hw.tests.length===7&&hw.tests.every(t=>t.gridMatches&&t.cells===48),'Device grid-check receipt');
check(hw.tests.some(t=>t.effectIds.includes(186)&&t.effectIds.includes(182))&&hw.tests.some(t=>t.effectIds.includes(191))&&hw.tests.some(t=>t.effectIds.includes(130)),'Receipt covers ids > 127');

// 2. split/merge masks, factory style
const role=v=>v==='in'?'source':v==='out'?'sink':'block';
const rows=[E(),['in','a','b','-','c','out',...Array(6).fill('')],['','','-','x','-','',...Array(6).fill('')],E()];
const at=(r,c)=>rows[r][c]||null;
const cells=planCells(at,[{row:3,col:3,from:[2]},{row:2,col:6,from:[2,3]}],role),mask=(r,c)=>cells.find(x=>x.r===r-1&&x.c===c-1).mask;
check(mask(2,3)===2&&mask(3,3)===2&&mask(3,4)===4&&mask(2,6)===6&&mask(2,1)===0,'Split/merge masks');
no(()=>planCells(at,[{row:3,col:3,from:[1]}],role),/empty cell/,'link from an empty cell');
no(()=>planCells(at,[{row:3,col:3,from:[2]}],role),/does not reach/,'dangling branch');
no(()=>planCells(at,[],role),/has no input/,'unlinked branch');
no(()=>planCells(at,[{row:1,col:2,from:[2]}],role),/empty cell/,'link to an empty cell');
no(()=>planCells((r,c)=>r===1&&c===0?'a':at(r,c),[],role),/row 2, col 1 has no input/,'chain that starts without a source');

// 3. record edits: removal and duplication are exact
const nb=body(NL),ns=scanRecords(nb);
const rm=editRecords(NL,{remove:['send','return','delay']}),rb=body(rm.syx),rs=scanRecords(rb);
check(rs.records.map(r=>r.family).join()===ns.records.filter(r=>!['send','return','delay'].includes(r.family)).map(r=>r.family).join(),'Removed records');
for(const r of rs.records){const o=ns.records.find(x=>x.eid===r.eid);check(rb.subarray(r.header,r.header+r.size).equals(nb.subarray(o.header,o.header+o.size)),'Kept record bytes '+r.family)}
check(rb.subarray(rs.tail).equals(nb.subarray(ns.tail))&&rb.length===nb.length-['send','return','delay'].reduce((n,f)=>n+ns.records.find(r=>r.family===f).size,0),'Tail and length after removal');
check(readGrid(rb).every(g=>![70,182,186].includes(g.id))&&readGrid(rb).filter(g=>g.id).length===readGrid(nb).filter(g=>g.id).length-3,'Removed cells emptied');
const du=editRecords(NL,{duplicate:['drive2'],add:['mixer','multiplexer']}),db=body(du.syx),ds=scanRecords(db);
const d1=ds.records.find(r=>r.family==='drive'),d2=ds.records.find(r=>r.family==='drive2');
check(d2&&d2.eid===119&&d2.size===d1.size,'Drive 2 record');
const a=Buffer.from(db.subarray(d1.header,d1.header+d1.size)),b=Buffer.from(db.subarray(d2.header,d2.header+d2.size));
for(let s=0;s<8;s++){check(b.readUInt16LE(10+2*s)===0&&b.readUInt16LE(26+2*s)===1,'Drive 2 scenes A/bypass');b.writeUInt16LE(a.readUInt16LE(10+2*s),10+2*s);b.writeUInt16LE(a.readUInt16LE(26+2*s),26+2*s)}
b.writeUInt16LE(118,0);check(a.equals(b),'Drive 2 = Drive 1 apart from effect ID and scenes');
check(ds.records.some(r=>r.eid===126&&r.family==='mixer')&&ds.records.some(r=>r.eid===191&&r.family==='multiplexer'),'Mixer and Multiplexer added');
check(Buffer.concat([db.subarray(0,ds.records[ns.records.length].header),db.subarray(ds.tail)]).equals(nb),'Dropping the added records restores the base');
no(()=>editRecords(NL,{remove:['amp']}),/Amp and Cab stay/,'remove amp');
no(()=>editRecords(NL,{remove:['in1']}),/In 1 and Out 1 stay/,'remove In 1');
no(()=>editRecords(NL,{remove:['send']}),/as a pair/,'Send without Return');
no(()=>editRecords(NL,{remove:['chorus']}),/Not placed/,'remove absent block');
no(()=>editRecords(NL,{duplicate:['delay3']}),/not evidenced/,'Delay 3');
no(()=>editRecords(NL,{duplicate:['chorus2']}),/needs chorus/,'instance without base');
no(()=>editRecords(NL,{duplicate:['drive']}),/instance name/,'duplicate without number');
no(()=>editRecords(NL,{add:['scenemidi']}),/not addable/,'Scene MIDI');
no(()=>editRecords(NL,{remove:['drive'],duplicate:['drive2']}),/needs drive/,'duplicate a removed block');

// 4. the base's own two-row grid through the general planner reproduces the base byte for byte
const names={37:'in1',42:'out1',182:'send',186:'return',58:'amp',62:'cab',70:'delay',66:'reverb',118:'drive'};
const g0=readGrid(nb),own=[0,1,2,3].map(r=>Array.from({length:12},(_,c)=>{const x=g0.find(g=>g.row===r&&g.col===c);return !x.id?'':x.id>=SHUNT_MIN?'-':names[x.id]}));
const shuntsSequential=g0.filter(g=>g.id>=SHUNT_MIN).every((g,i,l)=>i===0||g.id>l[i-1].id);
const same=arrangeGrid(NL,{grid:{rows:own}});check(isTwoRowSerial(nb)&&isTwoRowSerial(body(same.syx)),'Two-row shape');
if(shuntsSequential)check(body(same.syx).equals(nb),'Own grid reproduces the base body');

// 5. parallel grid: split after Cab, Delay || Reverb, merged by the Mixer, then Out 1.
// A link names its TARGET cell; the source is the previous column (row 3 col 6 <- row 2 col 5 = Cab).
const P=[E(),['in1','drive','drive2','amp','cab','delay','-','mixer','-','-','-','out1'],['','','','','','-','reverb','','','','',''],E()];
const links=[{row:3,col:6,from:[2]},{row:2,col:8,from:[2,3]}];
const pg=arrangeGrid(editRecords(NL,{remove:['send','return'],duplicate:['drive2'],add:['mixer']}).syx,{grid:{rows:P,links}});
const pe0=()=>editRecords(NL,{remove:['send','return'],duplicate:['drive2'],add:['mixer']}).syx;
const pb=body(pg.syx),G=readGrid(pb),cell=(r,c)=>G.find(g=>g.row===r-1&&g.col===c-1);
check(cell(2,8).id===126&&cell(2,8).mask===6&&cell(3,6).mask===2&&cell(3,6).id>=SHUNT_MIN&&cell(2,3).id===119&&cell(2,1).mask===0,'Parallel grid words');
check(G.every(g=>g.mask<16),'Mask bit 4 never written');
check(new Set(G.filter(g=>g.id>=SHUNT_MIN).map(g=>g.id)).size===G.filter(g=>g.id>=SHUNT_MIN).length,'Shunt IDs unique');
check(!isTwoRowSerial(pb)&&describeGrid(pb)[1].includes('mixer<2+3'),'Grid description');
check(describeLinks(pb).join('|')==='rida 2, veerg 8 (mixer) ← delay (rida 2, veerg 6) + reverb (rida 3, veerg 7)|rida 3, veerg 6 (-) ← cab (rida 2, veerg 5)','Links traced to blocks: '+describeLinks(pb).join('|'));
check(gridWarnings(pb).length===0,'Split after Cab: no warning');
// the 2026-10-23 G02 mistake: the branch fed from the column left of Cab is fed from Amp -> warning
const amp=arrangeGrid(pe0(),{grid:{rows:P.map((r,i)=>i===2?['','','','','-','reverb','-','','','','','']:r),links:[{row:3,col:5,from:[2]},{row:2,col:8,from:[2,3]}]}});
const ab=body(amp.syx);check(describeLinks(ab).some(l=>l.includes('← amp (rida 2, veerg 4)'))&&gridWarnings(ab).length===1&&amp.warnings.length===1,'Amp-fed branch is named and warned');
const pe=editRecords(NL,{remove:['send','return'],duplicate:['drive2'],add:['mixer']}).syx;
no(()=>arrangeGrid(pe,{grid:{rows:P}}),/has no input/,'missing split link');
no(()=>arrangeGrid(pe,{grid:{rows:P.map((r,i)=>i===1?r.map(v=>v==='drive2'?'-':v):r),links}}),/not on the grid/,'record without cell');
no(()=>arrangeGrid(pe,{grid:{rows:P.map((r,i)=>i===2?r.map(v=>v==='reverb'?'drive':v):r),links}}),/placed twice/,'block twice');
no(()=>arrangeGrid(pe,{grid:{rows:P.map((r,i)=>i===1?r.map(v=>v==='mixer'?'chorus':v):r),links}}),/not in the preset/,'unknown cell');
no(()=>arrangeGrid(pe,{grid:{rows:P.slice(0,3),links}}),/4 rows of 12/,'grid shape');
no(()=>arrangeGrid(pe,{grid:{rows:P,links:[...links,{row:2,col:1,from:[2]}]}}),/col 2\.\.12/,'column 1 link');

// 6. full pipeline in grid mode: controls on an instance and on the Mixer, scenes, report text
// the composer adds a Compressor record; the grid must place it (here between Delay and Mixer)
const PC=P.map((r,i)=>i===1?r.map((v,c)=>c===6?'compressor':v):r);
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'FM3 GRID TEST',compressorChannels:[{channel:'A',type:'Optical Compressor'}]},
  remove:['send','return'],duplicate:['drive2'],insert:['mixer'],grid:{rows:PC,links},
  blockScenes:{mixer:[{scene:1,bypass:false}],drive2:[{scene:1,bypass:false}]},
  controls:[{block:'mixer',channel:'A',param:'MIXER_GAIN3',value:50},{block:'drive2',channel:'A',param:'FUZZ_DRIVE',value:3}]};
no(()=>composeSound(NL,{...spec,grid:{rows:P,links}}),/compressor is in the preset but not on the grid/,'composer block left off the grid');
const s=composeSound(NL,spec),sb=body(s.syx),ss=scanRecords(sb);
const mx=ss.records.find(r=>r.family==='mixer'),dv2=ss.records.find(r=>r.family==='drive2'),dv1=ss.records.find(r=>r.family==='drive');
check(sb.readUInt16LE(mx.header+26)===0&&sb.readUInt16LE(dv2.header+26)===0&&sb.readUInt16LE(dv1.header+26)===body(NL).readUInt16LE(scanRecords(body(NL)).records.find(r=>r.family==='drive').header+26),'Scene 1 engages Mixer and Drive 2 only');
const w=s.report.stages.layout.writes;
check(w.some(x=>x.instanceBlock==='drive2'&&x.instanceEid===119&&x.block==='drive')&&w.some(x=>x.block==='mixer'),'Instance and Mixer writes');
{const plain=composeSound(NL,{...spec,controls:[spec.controls[0]]}),pb2=body(plain.syx),p1=scanRecords(pb2).records.find(r=>r.family==='drive');
  check(pb2.subarray(p1.header,p1.header+p1.size).equals(sb.subarray(dv1.header,dv1.header+dv1.size)),'Drive 1 untouched by a Drive 2 write');}
check(s.txt.includes('Ruudustik (4 × 12')&&s.txt.includes('mixer<2+3')&&s.txt.includes('← cab (rida 2, veerg 5)')&&!s.txt.includes('HOIATUS')&&s.report.signalLayout==='grid','Grid text');
check(s.report.stages.records.duplicated[0].block==='drive2'&&s.report.stages.layout.expectedGrid.length===readGrid(sb).filter(g=>g.id).length,'Report stages');
check(s.report.cpu&&Array.isArray(s.report.cpu.scenes??s.report.cpu),'CPU estimate present');
check(s.report.scenes[0].blocks.drive2?.bypass===false&&s.report.parameters.some(p=>p.block==='drive2'&&p.name==='FUZZ_DRIVE'),'Drive 2 final scenes and parameters');
check(s.txt.includes('drive2 A Drive (FUZZ_DRIVE):')&&!s.txt.includes('drive A Drive (FUZZ_DRIVE):'),'TXT identifies the written instance');
no(()=>composeSound(NL,{...spec,layout:{row2:[],row3:[]}}),/exactly one of spec.layout/,'layout and grid together');
no(()=>composeSound(NL,{composer:spec.composer,layout:{row2:['drive','amp','cab'],row3:['delay','reverb']},remove:['delay']}),/need grid mode/,'remove in layout mode');
no(()=>composeSound(NL,{composer:spec.composer,layout:{row2:['drive','amp','cab'],row3:['delay','reverb']},insert:['mixer']}),/grid mode/,'mixer in layout mode');
check(Object.keys(GRID_ADDABLE).length===12,'Addable blocks');
console.log(JSON.stringify({factoryGrids:ev.plannerAccepted,masks:ev.masksReproduced,ownGridReproduced:shuntsSequential,refusals,parallel:describeGrid(pb).filter((r,i)=>i===1||i===2)}));

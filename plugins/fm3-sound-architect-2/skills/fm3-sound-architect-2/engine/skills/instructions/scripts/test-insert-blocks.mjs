// Regression for fm3-insert-blocks (audit point 6). Offline.
import fs from 'node:fs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {insertBlocks,insertDonor,INSERTABLE,GATED} from './fm3-insert-blocks.mjs';
import {scanRecords,readGrid,GRID} from './fm3-layout.mjs';
import {composeSound} from './fm3-sound.mjs';
import {insertTempoLocks} from './fm3-insert-tempo.mjs';
import {estimateCpu} from './fm3-cpu.mjs';
import {placeRecords,knownOrder} from './fm3-record-order.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
const rd=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const NL=rd('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),body=b=>Buffer.from(inspectStructure(b).raw.body);
const refuse=(f,re,why)=>{let m='';try{f()}catch(e){m=e.message}check(re.test(m),why+': expected '+re+' got '+(m||'success'))};
// 1. donors: both export pairs reconstruct, 14 + 1 records, device defaults
const d=insertDonor();check(d.records.length===15&&d.records.find(r=>r.eid===74)?.words===121&&d.records.find(r=>r.eid===190)?.channels===1,'Donor records');
// 2. every insertable block at once: structure, reconstruction, default scenes (pre-0.3.58 placement: appended)
const all=Object.keys(INSERTABLE).filter(b=>b!=='multidelay'),r=insertBlocks(NL,all,{recordOrder:'append'}),a=body(NL),b=body(r.syx);
check(r.inserted.length===all.length&&all.length===10&&b.length===a.length+r.inserted.reduce((n,x)=>n+x.recordBytes,0),'All 10 inserted');
const sb=scanRecords(b),sa=scanRecords(a);
check(sb.records.slice(sa.records.length).map(x=>x.family).join()===all.join(),'Appended in request order');
for(const x of sb.records.slice(sa.records.length))for(let s=0;s<8;s++)check(b.readUInt16LE(x.header+10+2*s)===0&&b.readUInt16LE(x.header+26+2*s)===1,'Default scenes A/bypass: '+x.family);
const back=Buffer.concat([b.subarray(0,sb.records[sa.records.length].header),b.subarray(sb.tail)]);
for(const x of r.inserted)back.writeUInt16LE(x.replacedShunt,GRID.start+(x.column-1)*16+(x.row-1)*4);
check(back.equals(a),'Removing the inserted records restores the base byte for byte');
check(readGrid(b).every((g,i)=>g.mask===readGrid(a)[i].mask),'Grid masks unchanged');
// 3. refusals
for(const g of Object.keys(GATED))refuse(()=>insertBlocks(NL,[g]),/not insertable/,g);
refuse(()=>insertBlocks(NL,['plex','plex']),/twice/,'duplicate');refuse(()=>insertBlocks(NL,['tonestack']),/Unknown/,'unknown');
refuse(()=>insertBlocks(insertBlocks(NL,['gate']).syx,['gate']),/already placed/,'already placed');
// 4. full pipeline: layout, scenes, controls, tempo locks, channel limits
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'FM3 P6 TEST',compressorChannels:[{channel:'A',type:'Optical Compressor'}]},
  insert:['gate','multiband','plex','looper','ringmod'],
  layout:{row2:['gate','compressor','drive','amp','cab','multiband'],row3:['delay','plex','ringmod','reverb','looper']},
  blockScenes:{plex:[{scene:1,bypass:false}]},allow:['linear-by-structure','enum-labels'],
  controls:[{block:'plex',channel:'A',param:'PLEX_MIX',value:25},{block:'plex',channel:'A',param:'PLEX_TIME1',value:350},{block:'plex',channel:'A',param:'PLEX_TEMPO1',value:'NONE'}]};
const s=composeSound(NL,spec),fb=body(s.syx),pl=scanRecords(fb).records.find(x=>x.family==='plex');
check(fb.readUInt16LE(pl.start+2*18)===11441&&fb.readUInt16LE(pl.start+2*26)===0&&fb.readUInt16LE(pl.header+26)===0,'Plex writes and scene 1 engaged');
check(s.txt.includes('plex A: Plex Delay; sees'),'Report names the inserted type');
refuse(()=>composeSound(NL,{...spec,controls:spec.controls.slice(0,2)}),/tempo-controlled by PLEX_TEMPO1/,'tempo lock');
refuse(()=>composeSound(NL,{...spec,controls:[{block:'looper',channel:'B',param:'LOOPER_PLAYLEVEL',value:0}]}),/Channel absent/,'looper has one channel');
refuse(()=>composeSound(NL,{...spec,blockScenes:{ringmod:[{scene:2,channel:'C'}]}}),/only channels A\/B/,'ring mod has two channels');
refuse(()=>composeSound(NL,{...spec,insert:['mixer']}),/audit point 5/,'mixer gated');
check(insertTempoLocks.length===17,'Tempo locks (Plex 9, Ten-Tap 1, Multi Delay 7)');
// 4b. Multi Delay (0.3.47 T26, 0.3.49 T27): own donor pair, device-default record, scenes engage; parameters and Base
// Type writable, the Multi Delay preset word (Type, pid 114) refused
const md=insertBlocks(NL,['multidelay']),mb=body(md.syx),mr=scanRecords(mb).records.find(x=>x.family==='multidelay');
check(md.inserted[0].effectId===74&&md.inserted[0].recordBytes===46+2*121*4&&mr.channels===4&&md.report.multidelayDonorSha256,'Multi Delay inserted from its donor');
const mdDonor=body(rd('references/fm3-multidelay-fresh-20261103.syx')),dr=scanRecords(mdDonor,{requireAmpCab:false}).records[0];
check(mb.subarray(mr.start,mr.start+2*121*4).equals(mdDonor.subarray(dr.start,dr.start+2*121*4)),'Multi Delay words = device defaults');
check(Object.keys(INSERTABLE).length===11,'11 insertable');
const mspec={...spec,insert:['multidelay'],layout:{row2:['compressor','drive','amp','cab'],row3:['delay','multidelay','reverb']},blockScenes:{multidelay:[{scene:1,bypass:false}]},controls:[]};
const ms=composeSound(NL,mspec),msb=body(ms.syx),msr=scanRecords(msb).records.find(x=>x.family==='multidelay');
check(msb.readUInt16LE(msr.header+26)===0&&msb.readUInt16LE(msr.header+28)===1,'Multi Delay scene 1 engaged, scene 2 bypassed');
{const w=composeSound(NL,{...mspec,controls:[{block:'multidelay',channel:'A',param:'MULTITAP_MIX',value:30},{block:'multidelay',channel:'B',param:'MULTITAP_BASETYPE',value:'Quad Series Delay'},{block:'multidelay',channel:'B',param:'MULTITAP_RINGFREQ1',value:100}]});
 const wb=body(w.syx),wr=scanRecords(wb).records.find(x=>x.family==='multidelay'),at=(c,p)=>wb.readUInt16LE(wr.start+2*(c*121+p));
 check(at(0,31)===19660&&at(1,0)===2&&at(1,87)===3277&&at(0,0)===0&&at(1,114)===0,'Multi Delay Mix, Base Type and Ring Freq written (T27)');}
refuse(()=>composeSound(NL,{...mspec,controls:[{block:'multidelay',channel:'A',param:'MULTITAP_RINGFREQ1',value:100}]}),/not applicable to final type 0/,'Multi Delay visibility policy');
refuse(()=>composeSound(NL,{...mspec,controls:[{block:'multidelay',channel:'A',param:'MULTITAP_TIME1',value:300}]}),/tempo-controlled by MULTITAP_TEMPO1 = 1\/4/,'Multi Delay tempo lock (device default Tempo 1 = 1/4)');
refuse(()=>composeSound(NL,{...mspec,controls:[{block:'multidelay',channel:'A',param:'MULTITAP_PRESETS',value:3}]}),/preset selection \(Type\) is not writable/,'Multi Delay preset word refused');
const mcpu=estimateCpu(ms.syx).scenes[0];check(mcpu.parts.multidelay===5.5&&!mcpu.unknown.includes('multidelay'),'Multi Delay CPU counted (T26: Quad-Tap Delay 5.5 points)');
console.log(JSON.stringify({inserted:all.length,multidelay:true,reconstructed:true,refusals:12,pipeline:s.report.signalRows}));
// 5. hardware roundtrip 2026-10-23: the device's exports of FM3_P6_INSERT_A/B hold the same prefix
// (grid, scenes), the same system tail and byte-identical records; only the record order is
// normalised by the device. CPU: A 82.5 %, B "CPU LIMIT EXCEEDED" (reported by the user).
for(const t of ['A','B']){
  const g=body(rd(`examples/FM3_P6_INSERT_${t}.syx`)),e=body(rd(`examples/FM3_P6_INSERT_${t}_export.syx`)),G=scanRecords(g),E=scanRecords(e);
  check(g.length===e.length&&g.subarray(0,4610).equals(e.subarray(0,4610))&&g.subarray(G.tail).equals(e.subarray(E.tail)),'Roundtrip prefix/tail '+t);
  const bytes=(b,s)=>s.records.map(r=>b.subarray(r.header,r.header+r.size).toString('hex')).sort().join();
  check(G.records.length===E.records.length&&bytes(g,G)===bytes(e,E),'Roundtrip records '+t);
}
console.log(JSON.stringify({hardwareRoundtrip:['A','B'],recordOrder:'device-normalised'}));
// 6. device record order (0.3.58, fm3-record-order): inserted records go where the FM3 stores them.
const eids=s=>scanRecords(body(s)).records.map(x=>x.eid);
// The P6 presets also carried Compressor (46) and Volume/Pan (102, own inserter); the NewLook base has neither.
const exp=t=>eids(rd(`examples/FM3_P6_INSERT_${t}_export.syx`)).filter(e=>e!==46&&e!==102);
{const A=insertBlocks(NL,['gate','multiband','plex','looper']);check(JSON.stringify(eids(A.syx))===JSON.stringify(exp('A')),'P6 A: device order = the device export');
 check(A.inserted.every(x=>x.recordOrder==='device order')&&A.report.recordOrder.mode==='device','P6 A placed by evidence');
 const B=insertBlocks(NL,['formant','megatap','resonator','ringmod','synth','tentap']);check(JSON.stringify(eids(B.syx))===JSON.stringify(exp('B')),'P6 B: device order = the device export');
 // Same bytes as the append build, only the record order differs.
 const Bx=insertBlocks(NL,['formant','megatap','resonator','ringmod','synth','tentap'],{recordOrder:'append'}),rec=s=>{const b=body(s);return scanRecords(b).records.map(r=>b.subarray(r.header,r.header+r.size).toString('hex')).sort().join()};
 check(rec(B.syx)===rec(Bx.syx)&&body(B.syx).length===body(Bx.syx).length,'device and append builds hold the same records');
 const M=insertBlocks(NL,['multidelay']);check(JSON.stringify(eids(M.syx))==='[58,62,70,186,182,118,74,37,42,66]','Multi Delay after Drive, before Input 1 (T38 stored dump)');
 check(JSON.stringify(eids(insertBlocks(NL,['multidelay'],{recordOrder:'append'}).syx))==='[58,62,70,186,182,118,37,42,66,74]','append keeps it last');}
// unknown pairs fall back to appending; a base order is never changed
{const mod=[58,62,78,46,70,82,118,37,42,90,66,94];
 check(knownOrder(178,90)===0&&knownOrder(162,94)===-1,'Plex vs Phaser has no evidence; Resonator before Wah does (via Volume/Pan)');
 const p=placeRecords(mod,[178,74]);check(JSON.stringify(p.order)===JSON.stringify([58,62,78,46,70,82,118,74,37,42,90,66,94,178])&&p.placed[0].by==='appended'&&p.placed[1].by==='device order','Unknown pair appended, known placed');
 check(JSON.stringify(placeRecords(mod,[74],'append').order)===JSON.stringify([...mod,74]),'append mode');
 refuse(()=>placeRecords(mod,[74],'sorted'),/recordOrder must be/,'mode');
 refuse(()=>composeSound(NL,{...mspec,recordOrder:'sorted'}),/recordOrder needs insert/,'spec recordOrder value');
 refuse(()=>composeSound(NL,{...mspec,insert:undefined,layout:{row2:['compressor','drive','amp','cab'],row3:['delay','reverb']},blockScenes:{},recordOrder:'device'}),/recordOrder needs insert/,'recordOrder without insert');}
console.log(JSON.stringify({recordOrder:'device',p6:['A','B'],t38:true}));

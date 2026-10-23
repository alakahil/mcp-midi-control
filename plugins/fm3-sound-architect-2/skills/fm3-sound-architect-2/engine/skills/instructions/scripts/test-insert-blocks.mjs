// Regression for fm3-insert-blocks (audit point 6). Offline.
import fs from 'node:fs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {insertBlocks,insertDonor,INSERTABLE,GATED} from './fm3-insert-blocks.mjs';
import {scanRecords,readGrid,GRID} from './fm3-layout.mjs';
import {composeSound} from './fm3-sound.mjs';
import {insertTempoLocks} from './fm3-insert-tempo.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
const rd=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const NL=rd('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),body=b=>Buffer.from(inspectStructure(b).raw.body);
const refuse=(f,re,why)=>{let m='';try{f()}catch(e){m=e.message}check(re.test(m),why+': expected '+re+' got '+(m||'success'))};
// 1. donor: export pair reconstructs, 14 records, device defaults
const d=insertDonor();check(d.records.length===14&&d.records.find(r=>r.eid===190)?.channels===1,'Donor records');
// 2. every insertable block at once: structure, reconstruction, default scenes
const all=Object.keys(INSERTABLE),r=insertBlocks(NL,all),a=body(NL),b=body(r.syx);
check(r.inserted.length===11&&b.length===a.length+r.inserted.reduce((n,x)=>n+x.recordBytes,0),'All 11 inserted');
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
check(insertTempoLocks.length===10,'Tempo locks');
console.log(JSON.stringify({inserted:all.length,reconstructed:true,refusals:9,pipeline:s.report.signalRows}));

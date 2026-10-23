import assert from 'node:assert/strict';
import fs from 'node:fs';
import {volumeChannelText} from './fm3-volume-text.mjs';
const captured=JSON.parse(fs.readFileSync(new URL('../references/fm3-volume-donor.json',import.meta.url)));
const donorWords=Buffer.from(captured.recordHex,'hex').subarray(46);
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords,readGrid,spreadColumns} from './fm3-layout.mjs';
import {findParam,encodeValue,decodeValue} from './fm3-table-encoder.mjs';
import {describeVolumePan,volumeCaptureHash,volumeRecordHash} from './fm3-volume.mjs';
import {validateVolumeWrites,volumeUnits} from './fm3-volume-policy.mjs';
export function verifyVolumeOutput(report,syx,txt,spec){
 const requested=(spec?.controls??[]).filter(c=>c.block==='volpan'),reported=(report.controls??[]).filter(c=>c.block==='volpan');
 if(!spec?.volumePan&&!report.volumePan&&!requested.length&&!reported.length)return;
 assert.equal(spec.volumePan,true,'Volume requires explicit insertion request');
 const body=Buffer.from(inspectStructure(syx).raw.body),records=scanRecords(body).records,matches=records.filter(r=>r.eid===102);assert.equal(matches.length,1,'Volume record must be unique');const r=matches[0];
 const state=describeVolumePan(body,r);assert.deepEqual(report.volumePan,state,'Volume final state differs');
 assert.equal(report.stages?.volumePan?.recordSha256,volumeRecordHash);assert.equal(report.stages.volumePan.captureSha256,volumeCaptureHash);
 const cells=readGrid(body).filter(g=>g.id===102);assert.equal(cells.length,1,'Volume grid must be unique');
 let expectedCell=null;
 for(const [row,key] of [[1,'row2'],[2,'row3']]){const items=spec.layout[key],i=items.indexOf('volpan');if(i>=0){assert.equal(expectedCell,null,'Volume duplicated in layout');expectedCell={row,col:spec.layout.columns?spec.layout.columns.volpan-1:spreadColumns(items.length)[i]};}}
 assert.ok(expectedCell);assert.equal(cells[0].row,expectedCell.row);assert.equal(cells[0].col,expectedCell.col);assert.equal(cells[0].mask,1<<expectedCell.row);
 const planned=new Map(),seen=new Set();assert.equal(requested.length,reported.length,'Volume controls count');
 for(const c of requested){
  const p=findParam('volpan',c.param),ch='ABCD'.indexOf(c.channel);assert.ok(ch>=0&&c.channel.length===1);const key=ch+':'+p.param;assert.ok(!seen.has(key));seen.add(key);
  const offset=r.start+ch*30+p.param*2,raw=body.readUInt16LE(offset),display=decodeValue(p,raw),expected=encodeValue(p,c.value,{allow:spec.allow??[]});assert.equal(raw,expected,'Volume SYX differs from spec');planned.set(key,raw);
  const matches=reported.filter(w=>w.channel===c.channel&&w.pid===p.param);assert.equal(matches.length,1);const w=matches[0];
  assert.equal(w.offset,offset);assert.equal(w.effectId,102);assert.equal(w.raw,raw);assert.equal(w.value,c.value);assert.equal(w.name,p.name);assert.equal(w.display,display);assert.equal(w.unit,volumeUnits[p.name]??'');validateVolumeWrites(body,[{...w}]);
  const fmt=v=>typeof v==='number'?String(Number(v.toFixed(4))):String(v);
  assert.ok(txt.includes(`volpan ${c.channel} ${w.label??w.name} (${p.name}): ${fmt(display)} ${w.unit}; küsitud ${fmt(c.value)}; raw ${raw};`),'Volume TXT differs');
 }
 // Every unrequested word must still be the captured default, including inactive
 // Auto-Swell words, the meter, TYPE and the channel BYPASS slot.
 for(let ch=0;ch<4;ch++)for(let pid=0;pid<15;pid++)assert.equal(body.readUInt16LE(r.start+ch*30+pid*2),planned.get(ch+':'+pid)??donorWords.readUInt16LE(ch*30+pid*2),'Undeclared Volume word changed');
 for(const s of state.states){assert.equal(s.typeRaw,0,'Volume TYPE is not captured VOLUME');assert.ok(txt.includes(volumeChannelText(s)),'Volume retained TXT values differ');}
 const scenePlan=spec.blockScenes?.volpan??[];
 for(const scene of state.scenes){const edit=scenePlan.find(x=>x.scene===scene.scene);assert.equal(scene.channel,edit?.channel??'A','Volume scene channel differs');assert.equal(scene.bypassRaw,edit?.bypass?1:0,'Volume scene bypass differs');assert.ok(txt.includes(`Volume/Pan 1 Scene ${scene.scene}: kanal ${scene.channel}; bypass raw ${scene.bypassRaw}.`));}
 assert.ok(txt.includes('VOLUME/PAN 1 — LÕPPFAILIST'));
}

// Re-read the saved four-file bundle. Check raw grid, instance scenes and requested
// controls against the spec, rather than accepting refreshed artifact hashes alone.
import assert from 'node:assert/strict';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords,readGrid,SLUG_BY_EID} from './fm3-layout.mjs';
import {findParam,encodeValue,decodeValue} from './fm3-table-encoder.mjs';
import {estimateCpu,renderCpuText} from './fm3-cpu.mjs';
export function verifyGridOutput(report,syx,txt,spec){
  if(!spec?.composer)return;
  const cpu=estimateCpu(syx);
  assert.deepEqual(report.cpu,cpu,'CPU report differs from final SYX');
  assert.ok(txt.includes(renderCpuText(cpu)),'CPU TXT differs');
  if(!spec.grid)return;
  const body=Buffer.from(inspectStructure(syx).raw.body),{records}=scanRecords(body),cells=readGrid(body);
  for(const c of cells){
    const name=spec.grid.rows[c.row][c.col];
    if(!name||name==='.')assert.equal(c.id,0,'Grid empty cell differs');
    else if(name==='-')assert.ok(c.id>=1024,'Grid shunt differs');
    else assert.equal(c.id,records.find(r=>r.family===name)?.eid,'Grid block differs');
    const link=spec.grid.links?.find(l=>l.row===c.row+1&&l.col===c.col+1);
    const source=['in1','return'].includes(name);
    const from=!c.id||source||!c.col?[]:link?.from??(cells.some(g=>g.row===c.row&&g.col===c.col-1&&g.id)?[c.row+1]:[]);
    assert.equal(c.mask,from.reduce((v,row)=>v|1<<(row-1),0),'Grid input mask differs');
  }
  assert.deepEqual(report.stages.layout.expectedGrid,cells.filter(c=>c.id).map(c=>({r:c.row,c:c.col,id:c.id,mask:c.mask})),'Grid report differs');
  for(const r of records.filter(r=>SLUG_BY_EID[r.block]))for(let i=0;i<8;i++){
    const channel='ABCD'[body.readUInt16LE(r.header+10+2*i)],bypass=body.readUInt16LE(r.header+26+2*i)===1;
    assert.ok(channel&&'ABCD'.indexOf(channel)<r.channels,'Invalid scene channel');
    const b=report.scenes[i].blocks[r.family];assert.ok(b,'Missing instance scene');
    assert.equal(b.channel,channel,'Scene channel report differs');assert.equal(b.bypass,bypass,'Scene bypass report differs');
    const edit=spec.blockScenes?.[r.family]?.find(e=>e.scene===i+1);
    if(edit?.channel!==undefined)assert.equal(channel,edit.channel,'Scene channel differs from spec');
    if(edit?.bypass!==undefined)assert.equal(bypass,edit.bypass,'Scene bypass differs from spec');
    assert.ok(txt.includes(`  ${r.family} ${channel}:`),'Instance scene missing from TXT');
  }
  assert.equal(report.controls.length,(spec.controls??[]).length,'Control count differs');
  for(const c of spec.controls??[]){
    const r=records.find(r=>r.family===c.block),p=findParam(c.block,c.param),ch='ABCD'.indexOf(c.channel);
    assert.ok(r&&ch>=0&&ch<r.channels,'Control record/channel missing');
    const offset=r.start+2*(ch*r.words+p.param),raw=body.readUInt16LE(offset),display=decodeValue(p,raw);
    assert.equal(raw,encodeValue(p,c.value,{allow:spec.allow??[]}),'Control SYX differs from spec');
    const matches=report.controls.filter(w=>(w.instanceBlock??w.block)===c.block&&w.channel===c.channel&&w.pid===p.param);
    assert.equal(matches.length,1,'Missing/duplicate instance control');const w=matches[0];
    assert.equal(w.offset,offset);assert.equal(w.instanceEid,r.eid);assert.equal(w.raw,raw);assert.equal(w.display,display);assert.equal(w.value,c.value);
    const fmt=v=>typeof v==='number'?String(Number(v.toFixed(4))):String(v);
    assert.ok(txt.includes(`${c.block} ${c.channel} ${w.label??w.name} (${p.name}): ${fmt(display)} ${w.unit}; küsitud ${fmt(c.value)}; raw ${raw};`),'Instance control TXT differs');
  }
}

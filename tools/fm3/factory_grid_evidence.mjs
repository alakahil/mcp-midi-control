// Read-only research adapter (audit point 5): FW10 factory grids vs the general-grid planner.
// Keeps STRUCTURE only (counts, effect IDs, mask statistics), never parameter values or layouts.
// For every factory preset the grid is turned into a planner spec (cell names + explicit links only
// where the input differs from the same-row default) and planCells must accept it and reproduce
// every input mask exactly (bit 4 excluded: the generator never writes it).
// Usage: node tools/fm3/factory_grid_evidence.mjs FACTORY_DIR [--write]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {banks} from './factory_structure_evidence.mjs';
const ENGINE='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const {parsePresetDump,decodeRawPatch}=await import(new URL(ENGINE+'scripts/drive-collector/fm3-codec.mjs',import.meta.url));
const {planCells}=await import(new URL(ENGINE+'scripts/fm3-grid.mjs',import.meta.url));
const {blockOf}=await import(new URL(ENGINE+'scripts/fm3-layout.mjs',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const SOURCES=[37,38,186],SINKS=[42,43,182],OPTIONAL=[130,131];
const role=v=>{const id=+v.slice(1);return SOURCES.includes(id)?'source':SINKS.includes(id)?'sink':OPTIONAL.includes(id)?'optional':'block'};

export function extract(factoryDir){
  const st={presets:0,cells:0,shunts:0,splits:0,merges:0,rowsUsed:{},bit4Cells:0,maskBitsToEmptyCell:0,column1Inputs:0,
    noInputBeyondColumn1:{},plannerAccepted:0,masksReproduced:0,explicitLinks:0,instanceEffectIds:{}};
  for(const [f,h] of Object.entries(banks)){
    const b=fs.readFileSync(path.join(factoryDir,f));assert.equal(sha(b),h);
    for(let i=0;i<128;i++){
      const raw=decodeRawPatch(parsePresetDump(b.subarray(i*24680,(i+1)*24680),0,17).chunkPayloads);assert.ok(raw.crcValid);
      const body=Buffer.from(raw.body);st.presets++;
      const g=(r,c)=>{const o=260+c*16+r*4;return {id:body.readUInt16LE(o),m:body.readUInt16LE(o+2)}};
      const cellAt=(r,c)=>{const x=g(r,c);return !x.id?null:x.id>=1024?'-':'e'+x.id};
      const rows=new Set(),links=[];
      for(let r=0;r<4;r++)for(let c=0;c<12;c++){
        const x=g(r,c);if(!x.id){assert.equal(x.m,0,'empty cell with mask');continue}
        st.cells++;rows.add(r);if(x.id>=1024)st.shunts++;
        else{const bo=blockOf(x.id);if(bo&&bo.instance>1)st.instanceEffectIds[x.id]=(st.instanceEffectIds[x.id]??0)+1;}
        if(x.m&16)st.bit4Cells++;
        const m=x.m&15,bits=[0,1,2,3].filter(k=>m>>k&1);
        if(c===0){if(m)st.column1Inputs++;continue}
        for(const k of bits)if(!g(k,c-1).id)st.maskBitsToEmptyCell++;
        if(bits.length>1)st.merges++;
        if(!m)st.noInputBeyondColumn1[x.id>=1024?'shunt':x.id]=(st.noInputBeyondColumn1[x.id>=1024?'shunt':x.id]??0)+1;
        const def=g(r,c-1).id?1<<r:0,src=x.id<1024&&role('e'+x.id)==='source';
        if(m!==def&&!(src&&m===0))links.push({row:r+1,col:c+1,from:bits.map(k=>k+1)});
      }
      for(let c=0;c<11;c++)for(let r=0;r<4;r++)if(g(r,c).id&&[0,1,2,3].filter(k=>g(k,c+1).id&&(g(k,c+1).m>>r&1)).length>1)st.splits++;
      st.rowsUsed[rows.size]=(st.rowsUsed[rows.size]??0)+1;st.explicitLinks+=links.length;
      const cells=planCells(cellAt,links,role);st.plannerAccepted++;
      for(const x of cells)if(x.mask===(g(x.r,x.c).m&15))st.masksReproduced++;
    }
  }
  assert.equal(st.maskBitsToEmptyCell,0);assert.equal(st.column1Inputs,0);assert.equal(st.masksReproduced,st.cells);
  return {schemaVersion:1,source:{url:'https://www.fractalaudio.com/downloads/firmware-presets/fm3/10p0/FM3_Factory_Presets_10p0.zip',banks},
    scope:'Structure only: grid cell counts, input-mask statistics and effect IDs of block instances. No parameter values or preset layouts are stored.',
    findings:['Mask bit k (0..3) = input from row k of the previous column; no set bit points to an empty cell; column 1 never has inputs.',
      'Every factory grid passes the general-grid planner (fm3-grid.mjs planCells) and every input mask is reproduced exactly from cell names plus explicit links.',
      'Cells without input beyond column 1 are only In 1/In 2 (37/38), Feedback Return (186) and Synth (130).',
      'Bit 4 (value 16) appears on a few merge cells; its meaning is unknown and the generator never writes it.'],
    grid:st};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [factoryDir]=process.argv.slice(2);assert.ok(factoryDir,'Usage: factory_grid_evidence.mjs FACTORY_DIR [--write]');
  const out=new URL(ENGINE+'references/fm3-factory-grid-evidence.json',import.meta.url),content=JSON.stringify(extract(factoryDir),null,1)+'\n';
  if(process.argv.includes('--write'))fs.writeFileSync(out,content);else assert.equal(fs.readFileSync(out,'utf8'),content);
  console.log(JSON.stringify({presets:384,deviceIO:false,valuesStored:false}));
}

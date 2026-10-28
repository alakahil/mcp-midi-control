// Aggregate grid-mask and modifier-record statistics from the user's OWN FM3 preset files (for example a
// purchased tonepack). Offline, read only. Prints JSON with counts only: no preset names, files or parameter
// values. Used for references/fm3-grid-bit4-fw13-20261028.json and references/fm3-modifier-removal-20261028.json.
// Usage: node tools/fm3/tonepack-structure-evidence.mjs FILE...   (each FILE a multiple of 24680 bytes)
import fs from 'node:fs';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {readGrid}=await imp('scripts/fm3-layout.mjs');
const {readModifiers}=await imp('scripts/fm3-parameter-dependencies.mjs');
const files=process.argv.slice(2);assert.ok(files.length,'Usage: tonepack-structure-evidence.mjs FILE...');
const SIZE=24680,FIELDS0=1584,RECORD=96;
const g={presets:0,occupiedCells:0,maskBit4Cells:0,maskBits5to15Cells:0,mergeCells:0,mergePresets:0,splits:0,crossRowSingleInputs:0};
const m={presets:0,activeRecords:0,inactiveRecords:0,unusedRecords:0,initialisedInactiveRecords:0,initialisedInactiveWithTargetCleared:0,initialisedInactiveWithTargetKept:0,
  initialisedInactiveBetweenActive:0,initialisedInactiveAfterLastActive:0,initialisedInactiveKeepingNonDefaultMinMax:0,activeRecordsAllContiguousFrom0or1:0,presetsWithActive:0};
for(const f of files){const all=fs.readFileSync(f);assert.ok(all.length%SIZE===0,f+': not a multiple of 24680 bytes');
  for(let i=0;i<all.length/SIZE;i++){let body;try{const st=inspectStructure(all.subarray(i*SIZE,(i+1)*SIZE));if(!st.raw.crcValid)continue;body=Buffer.from(st.raw.body);}catch{continue;}
    g.presets++;const grid=readGrid(body);let merged=false;
    for(const x of grid){if(!x.id)continue;g.occupiedCells++;if(x.mask&16)g.maskBit4Cells++;if(x.mask&~31)g.maskBits5to15Cells++;
      const ins=[0,1,2,3].filter(k=>x.mask>>k&1);if(x.col>0&&ins.length>1){g.mergeCells++;merged=true;}if(ins.length===1&&ins[0]!==x.row)g.crossRowSingleInputs++;
      if(grid.filter(y=>y.col===x.col+1&&y.id&&y.mask>>x.row&1).length>1)g.splits++;}
    if(merged)g.mergePresets++;
    let mods;try{mods=readModifiers(body);}catch{continue;}m.presets++;
    const act=mods.filter(x=>x.active).map(x=>x.record),last=Math.max(-1,...act);m.activeRecords+=act.length;
    if(act.length){m.presetsWithActive++;const s=[...act].sort((a,b)=>a-b);if(s.every((r,k)=>r===s[0]+k)&&s[0]<=1)m.activeRecordsAllContiguousFrom0or1++;}
    for(const x of mods.filter(x=>!x.active)){m.inactiveRecords++;const w=Array.from({length:25},(_,k)=>body.readUInt16LE(FIELDS0+RECORD*x.record+2*k));
      if(w.slice(0,21).every(v=>v===0)){m.unusedRecords++;continue;}
      m.initialisedInactiveRecords++;if(w[8]===0&&w[9]===0)m.initialisedInactiveWithTargetCleared++;else m.initialisedInactiveWithTargetKept++;
      if(x.record<last)m.initialisedInactiveBetweenActive++;else m.initialisedInactiveAfterLastActive++;
      if(!(w[1]===0&&w[2]===65534))m.initialisedInactiveKeepingNonDefaultMinMax++;}
  }}
console.log(JSON.stringify({grid:g,modifiers:m},null,1));

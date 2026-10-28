// Build the modifier display pack (FM3_MOD_READ.py, test T7) from the user's OWN preset files. Offline.
// Goal: pair stored modifier words (25-word records) with what the FM3 Modify page shows, for the cases a
// discriminating corpus contains: a default binding, an inverted switch range, a partial switch range, a
// continuous range, a non-default curve, an auto-engage Wah and the unidentified word 17. Presets are
// chosen by these STRUCTURAL criteria only (no preset names in this code); the pack is written to OUT_DIR
// on the user's machine and never into the repository. Each picked preset is copied with its dump header
// set to the edit buffer (body and CRC unchanged).
// Usage: node tools/fm3/modifier-display-build.mjs OUT_DIR [--cases=id,id] FILE...
// --cases builds only the named cases (2026-10-28 repeat pack: continuous,curve).
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {auditModifiers}=await imp('scripts/fm3-modifier-audit.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {toEditBuffer}=await import(new URL('./cpu-check-edit-buffer.mjs',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const args=process.argv.slice(2),caseArg=args.find(a=>a.startsWith('--cases=')),[out,...files]=args.filter(a=>a!==caseArg);
assert.ok(out&&files.length,'Usage: modifier-display-build.mjs OUT_DIR [--cases=id,id] FILE...');
const SIZE=24680,BLOCK={DISTORT:'Amp',WAH:'Wah',ROTARY:'Rotary',FLANGER:'Flanger',PITCH:'Pitch',DELAY:'Delay',VOLUME:'Volume/Pan'};
// Modify-page fields as the Axe-Fx III/FM3 Owner's Manual names them; the user types "-" for a field the page lacks.
const FULL=['Channel','Min','Max','Start','Mid','End','Slope','Scale','Offset','Damping','Attack','Release','Auto-Engage','Off Value','PC Reset','Update Rate'];
const SHORT=['Min','Max'];
const DEF={1:0,2:65534,3:0,4:32767,5:65534,6:32767,10:0,12:0,13:32767,14:32767,17:0};
const isDefault=w=>Object.entries(DEF).every(([i,v])=>w[i]===v);
const CASES=[
  {id:'baseline',fields:FULL,why:'default binding (reference screen for every field)',match:x=>/^Control Switch/.test(x.sourceName)&&x.targetName==='DISTORT_BOOST'&&isDefault(x.words)},
  {id:'inverted',fields:SHORT,why:'switch with Min 65534 / Max 0',match:x=>x.targetName==='DISTORT_BRIGHT'&&x.words[1]===65534&&x.words[2]===0},
  {id:'partial',fields:SHORT,why:'switch with a partial Max',match:x=>x.targetName==='DISTORT_BRIGHT'&&x.words[1]===65534&&x.words[2]===1707},
  {id:'continuous',fields:FULL,why:'continuous target with Min and Max inside the range',
   hint:'Rotary plokk, esimene leht: parameeter Rate (mitte Amp). Kontrolli enne ENTER-it, et ekraani pealkiri on Rotary.',match:x=>x.targetFamily==='ROTARY'&&x.words[1]>0&&x.words[1]<65534&&x.words[2]>0&&x.words[2]<65534},
  {id:'curve',fields:FULL,why:'Mid / Slope / Scale away from the default',
   hint:'Amp plokk, graafilise EQ leht (EQ), 3. riba vasakult. See EI ole Tone lehe Treble. Riba nimi sõltub EQ tüübist; kirjuta see märkusesse.',match:x=>x.words[4]!==32767||x.words[6]!==32767||x.words[13]!==32767},
  {id:'autoengage',fields:FULL,why:'Wah with Auto-Engage and Off Value set',match:x=>x.targetName==='WAH_CONTROL'&&x.words[10]!==0&&x.words[12]!==0},
  {id:'word17',fields:FULL,why:'word 17 = 4 (field not yet identified)',match:x=>x.words[17]===4&&x.targetName==='DISTORT_BRIGHT'}];
const CHOSEN=caseArg?caseArg.slice(8).split(','):null;if(CHOSEN)assert.ok(CHOSEN.every(id=>CASES.some(c=>c.id===id)),'unknown case');
const ACTIVE=CHOSEN?CASES.filter(c=>CHOSEN.includes(c.id)):CASES;
const found=new Map();
for(const f of files){const all=fs.readFileSync(f);assert.ok(all.length%SIZE===0,f+': not a multiple of 24680 bytes');
  for(let i=0;i<all.length/SIZE&&found.size<ACTIVE.length;i++){const syx=all.subarray(i*SIZE,(i+1)*SIZE);let a,st;
    try{st=inspectStructure(syx);if(!st.raw.crcValid)continue;a=auditModifiers(syx);}catch{continue;}
    for(const c of ACTIVE){if(found.has(c.id))continue;const x=a.modifiers.find(m=>m.active&&c.match(m));if(!x)continue;
      const cell=x.targetContext?.gridCells?.[0];if(!cell)continue;
      found.set(c.id,{c,syx,name:String(st.decoded.preset_name).trim(),source:`${path.basename(f)} #${i+1}`,x,cell});}}}
for(const c of ACTIVE)assert.ok(found.has(c.id),'no preset matches case '+c.id);
fs.mkdirSync(out,{recursive:true});
const items=ACTIVE.map((c,k)=>{const h=found.get(c.id),file=`M${k+1}.syx`,b=toEditBuffer(h.syx);fs.writeFileSync(path.join(out,file),b);
  return {id:c.id,file,sha256:sha(b),name:h.name,source:h.source,why:c.why,
    binding:{record:h.x.record,source:h.x.sourceName,block:BLOCK[h.x.targetFamily]??h.x.targetFamily,param:/^DISTORT_EQ\d$/.test(h.x.targetName)?`graafilise EQ ${h.x.targetName.slice(-1)}. riba (failis ${h.x.targetLabel})`:h.x.targetLabel??h.x.targetName,paramName:h.x.targetName,
      grid:{row:h.cell.row,column:h.cell.column},channelScope:h.x.channelScope,words:h.x.words},fields:c.fields,expectSource:`${h.x.words[0]+1} ${h.x.sourceName}`,...(c.hint?{hint:c.hint}:{})};});
const manifest={kind:'fm3-modifier-display',version:1,date:'2026-10-28',sourceNumbering:'FM3 Source list number = stored code + 1 (T7, references/fm3-modifier-display-20261028.json)',note:'User-owned presets; keep this pack outside the repository.',
  method:'Edit-buffer loads (7F 00) only. The user opens the named parameter, presses ENTER and reads the Source and Modify pages on the FM3 front panel. No store, no SET.',items};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify(items.map(i=>[i.id,i.binding.source,i.binding.block,i.binding.param,'w1='+i.binding.words[1],'w2='+i.binding.words[2]])));

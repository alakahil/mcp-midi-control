// Synchronize only the generated current summary, never historical receipts.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {evidenceSummaryText} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-evidence-summary.mjs';
const file=new URL('../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/SKILL.md',import.meta.url);
const old=fs.readFileSync(file,'utf8');
const start='<!-- CURRENT-EVIDENCE:START -->',end='<!-- CURRENT-EVIDENCE:END -->';
assert.ok(old.includes(start)&&old.includes(end));
const next=old.slice(0,old.indexOf(start)+start.length)+'\n'+evidenceSummaryText()+'\n'+old.slice(old.indexOf(end));
assert.ok(process.argv.slice(2).every(x=>x==='--write'));
if(process.argv.includes('--write'))fs.writeFileSync(file,next);else assert.equal(old,next,'Current guide summary is stale');
console.log(JSON.stringify({passed:true,deviceIO:false}));

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {evidenceSummary,evidenceSummaryText} from './fm3-evidence-summary.mjs';
import {getSoundCapabilities} from './fm3-sound.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL('../references/'+f,import.meta.url)));
const s=evidenceSummary(),c=getSoundCapabilities();
const imports=new Set([...read('fm3-t36-multidelay-types-20261107.json').types.map(x=>x.type),
 ...read('fm3-t38-multidelay-store-20261107.json').types.map(x=>x.type),...read('fm3-t49-multidelay-types-20261113.json').types]);
const stored=new Set([...read('fm3-t38-multidelay-store-20261107.json').types.map(x=>x.type),
 ...read('fm3-h1-h2-h4-20261110.json').display.H2.scenes.map(x=>x.type)]);
assert.equal(s.multiDelay.generatedImports,imports.size);assert.equal(imports.size,39);
assert.equal(s.multiDelay.storeReload,stored.size);assert.equal(stored.size,8);
const switches=new Set(['drive1','delay1',...read('fm3-t47-20261112.json').promotedToSwitchConfirmed,...read('fm3-t48-20261113.json').promotedToSwitchConfirmed]);
assert.equal(s.footswitches.switchConfirmed,switches.size);assert.equal(switches.size,27);
assert.equal(s.footswitches.addedAfterDriveAndDelay,25);assert.deepEqual(s.footswitches.displayOnly,['resonator2']);
assert.deepEqual(s.modifierCurves.measuredConfigurations,read('fm3-t50-20261113.json').targets);
assert.equal(s.modifierCurves.measuredConfigurations.length,3);assert.equal(s.parallelLevels.automaticMixerTrim,false);
assert.ok(read('fm3-t51-20261113.json').cases.some(x=>x.case==='T51B'&&x.note.includes('clippis')));
assert.deepEqual(c.currentEvidence,s);assert.deepEqual(c.multidelayTypes.evidence,s.multiDelay);
const guide=fs.readFileSync(new URL('../../../../SKILL.md',import.meta.url),'utf8');
assert.ok(guide.includes('<!-- CURRENT-EVIDENCE:START -->\n'+evidenceSummaryText()+'\n<!-- CURRENT-EVIDENCE:END -->'));
assert.equal(s.liveV13.storeReload,'not-measured');assert.equal(s.plexTemplates.writer,false);
console.log(JSON.stringify({passed:true,imports:39,stored:8,switches:27,curves:3,deviceIO:false}));

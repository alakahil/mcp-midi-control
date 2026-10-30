// Keep repository and packaged hardware evidence byte-identical, then run the portable regression.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const published=new URL('../../docs/fm3/hardware-results/2026-10-30/p3-modifier-reuse/',import.meta.url);
const packaged=new URL('../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/p3-modifier-reuse-20261030/',import.meta.url);
const names=fs.readdirSync(published).sort();
assert.equal(names.length,6);
assert.deepEqual(fs.readdirSync(packaged).sort(),names);
for(const name of names)assert.deepEqual(fs.readFileSync(new URL(name,packaged)),fs.readFileSync(new URL(name,published)),name);
await import('../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/test-p3-modifier-reuse.mjs');

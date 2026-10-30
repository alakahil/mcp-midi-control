// Repository entry point for the packaged, fixed historical P3 replay.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runCLI} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-p3-modifier-reuse.mjs';
export * from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-p3-modifier-reuse.mjs';
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))runCLI(process.argv.slice(2));

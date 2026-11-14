// Repository alias for the portable packaged workflow.
import {build,candidateSpecs} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-sound-candidates.mjs';
export {build,candidateSpecs};
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3)throw Error('Usage: sound-candidates-build.mjs EMPTY_OUTPUT');
 console.log(JSON.stringify({presets:build(path.resolve(process.argv[2])).candidates.length,deviceIO:false}));
}

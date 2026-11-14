// Repository alias for the portable packaged acceptance checker.
import {acceptance} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-sound-acceptance.mjs';
export {acceptance};
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.length!==4)throw Error('Usage: sound-acceptance.mjs OUTPUT_STEM OBSERVATIONS.json');
 console.log(JSON.stringify(acceptance(path.resolve(process.argv[2]),path.resolve(process.argv[3])),null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}

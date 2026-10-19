// Regression for fm3-layout / fm3-sound (0.75.0). Offline.
import fs from 'node:fs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords,planGrid,writeGrid,arrangeSound} from './fm3-layout.mjs';
import {composeSound} from './fm3-sound.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};const rd=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const body=b=>Buffer.from(inspectStructure(b).raw.body);
const NL=rd('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),LY=rd('references/layout-example-20261014.syx');
// 1. grid writer reproduces both user device exports byte-exactly
check(writeGrid(body(NL),planGrid(body(NL),{row2:['drive','amp','cab'],row3:['delay','reverb'],columns:{drive:4,amp:6,cab:8,delay:9,reverb:10}})).equals(body(NL)),'NewLook grid not reproduced');
check(writeGrid(body(LY),planGrid(body(LY),{row2:['drive','amp','cab','peq'],row3:['delay','reverb'],columns:{drive:4,amp:6,cab:8,peq:10,delay:9,reverb:10}})).equals(body(LY)),'Layout example grid not reproduced');
check(scanRecords(body(NL)).tail===8960&&scanRecords(body(LY)).tail===9270,'Record scan');
// 2. all three previously hardware-confirmed NewLook insertion exports parse
for(const t of ['INSERT','FILTER','PITCH'])scanRecords(body(rd(`examples/FM3_NEWLOOK_${t}_TEST_export.syx`)));
// 3. refusals
const bad=[[{row2:['cab','amp','drive'],row3:['delay','reverb']},/Amp must precede/],[{row2:['amp','cab'],row3:['delay','reverb']},/exactly the placed/],
 [{row2:['drive','amp','cab'],row3:['delay','reverb','drive']},/twice/],[{row2:['drive','amp','cab'],row3:['delay','reverb'],columns:{drive:4,amp:3,cab:8,delay:9,reverb:10}},/increase/]];
for(const [l,re] of bad){let m='';try{arrangeSound(NL,{layout:l})}catch(e){m=e.message}check(re.test(m),'Expected refusal '+re+' got '+m)}
// 4. full pipeline equals the published move test
const spec=JSON.parse(rd('examples/FM3_LAYOUT_MOVE_TEST.spec.json'));delete spec.purpose;
const r=composeSound(NL,spec);check(r.syx.equals(rd('examples/FM3_LAYOUT_MOVE_TEST.syx')),'Move test not reproducible');
console.log(JSON.stringify({gridReproduced:2,exportsParsed:3,refusals:bad.length,moveTest:r.layoutReport.rows}));

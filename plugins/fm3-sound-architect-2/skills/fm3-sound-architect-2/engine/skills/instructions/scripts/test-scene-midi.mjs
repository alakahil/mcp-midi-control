// Regression for Scene MIDI support (fm3-scene-midi.mjs, audit point 6). Offline.
import fs from 'node:fs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords,readGrid} from './fm3-layout.mjs';
import {composeSound} from './fm3-sound.mjs';
import {validateSceneMidi,describeSceneMidi,SCENE_MIDI_TYPES} from './fm3-scene-midi.mjs';
import {insertBlocks} from './fm3-insert-blocks.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
const rd=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const NL=rd('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),body=b=>Buffer.from(inspectStructure(b).raw.body);
const refuse=(f,re,why)=>{let m='';try{f()}catch(e){m=e.message}check(re.test(m),why+': expected '+re+' got '+(m||'success'))};
let refusals=0;const no=(f,re,why)=>{refuse(f,re,why);refusals++};
// 1. device receipt: every one of the 11 front-panel steps changed one word and the encoder reproduces them
const rc=JSON.parse(rd('references/fm3-scene-midi-20261024.json'));
check(rc.steps.length===11&&rc.checks.everyStepOneWord&&rc.checks.encoderReproducesEveryStep&&rc.checks.finalWordsEqual,'Scene MIDI receipt');
const pc=JSON.parse(rd('references/fm3-scene-midi-pc-20261024.json'));
check(pc.steps.length===5&&pc.checks.encoderReproducesEveryStep&&pc.checks.decodeMatchesFrontPanel&&pc.steps[2].changed[0].word===192&&pc.checks.generatorConfirmedOnDevice&&pc.generatorVerify.presets.every(x=>x.allMatch&&x.gridMatches),'PC follow-up receipt: program is the Value word');
check(rc.layout.type.values[1]==='CC'&&rc.layout.type.values[2]==='PC'&&SCENE_MIDI_TYPES.CC===1&&SCENE_MIDI_TYPES.PC===2,'type codes');
// 2. pipeline: grid mode, block unconnected in row 1, commands written to the right words
const e=()=>Array(12).fill('');
const rows=[['scenemidi','','','','','','','','','','',''],['in1','-','compressor','drive','-','amp','-','cab','-','-','-','send'],['return','-','-','-','-','-','-','-','delay','reverb','-','out1'],e()];
const composer={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'SCENE MIDI TEST',compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const cmds=[{scene:1,command:1,type:'PC',channel:2,program:5},{scene:2,command:1,type:'CC',channel:16,number:127,value:127},{scene:8,command:8,type:'CC',number:0}];
const spec={composer,insert:['scenemidi'],grid:{rows},sceneMidi:cmds};
const s=composeSound(NL,spec),b=body(s.syx),r=scanRecords(b).records.find(x=>x.eid===190);
check(r&&r.words===257&&r.channels===1,'Scene MIDI record');
const w=k=>b.readUInt16LE(r.start+2*k);
check(w(0)===2&&w(64)===1&&w(128)===0&&w(192)===5,'S1C1 PC ch2 program 5 in the Value word, number word untouched');
check(w(8)===1&&w(72)===15&&w(136)===127&&w(200)===127,'S2C1 CC ch16 #127 =127');
check(w(63)===1&&w(127)===0&&w(191)===0&&w(255)===0&&w(256)===0,'S8C8 CC ch1 #0, word 256 untouched');
let other=0;for(let k=0;k<257;k++)if(![0,64,192,8,72,136,200,63,127,191,255].includes(k)&&w(k))other++;check(other===0,'no other words written');
for(let sc=0;sc<8;sc++)check(b.readUInt16LE(r.header+10+2*sc)===0&&b.readUInt16LE(r.header+26+2*sc)===0,'Scene MIDI engaged on channel A in every scene');
const g=readGrid(b).find(x=>x.row===0&&x.col===0);check(g.id===190&&g.mask===0,'unconnected cell');
check(JSON.stringify(describeSceneMidi(b,r))===JSON.stringify([{scene:1,command:1,type:'PC',channel:2,program:5},{scene:2,command:1,type:'CC',channel:16,number:127,value:127},{scene:8,command:8,type:'CC',channel:1,number:0,value:0}]),'decode');
check(s.txt.includes('SCENE MIDI')&&s.txt.includes('Scene 1, käsk 1: PC kanal 2, programm 5 (FM3 Value väli)')&&s.txt.includes('Scene 2, käsk 1: CC kanal 16, CC 127, väärtus 127'),'report text');
check(s.report.stages.layout.sceneMidi.commands.length===3,'report stage');
// 3. without commands the block stays all zero (device default)
const z=body(composeSound(NL,{composer,insert:['scenemidi'],grid:{rows}}).syx),zr=scanRecords(z).records.find(x=>x.eid===190);
let nz=0;for(let k=0;k<257;k++)if(z.readUInt16LE(zr.start+2*k))nz++;check(nz===0,'default block all zero');
// 4. refusals
no(()=>composeSound(NL,{...spec,grid:{rows:[['scenemidi','-','','','','','','','','','',''],...rows.slice(1)]}}),/carries no audio/,'shunt fed from Scene MIDI');
no(()=>composeSound(NL,{...spec,grid:{rows:[['','scenemidi','','','','','','','','','',''],...rows.slice(1)],links:[{row:1,col:2,from:[2]}]}}),/takes no input/,'link into Scene MIDI');
no(()=>composeSound(NL,{composer,layout:{row2:['compressor','drive','amp','cab'],row3:['delay','reverb']},sceneMidi:cmds}),/needs grid mode/,'sceneMidi in layout mode');
no(()=>insertBlocks(NL,['scenemidi']),/not insertable.*grid mode/,'serial insert of Scene MIDI');
no(()=>composeSound(NL,{composer,grid:{rows:[e(),...rows.slice(1)]},sceneMidi:cmds}),/needs the Scene MIDI block/,'commands without the block');
for(const [bad,re] of [[{scene:9,command:1,type:'PC',program:0},/scene must be 1..8/],[{scene:1,command:0,type:'PC',program:0},/command must be 1..8/],
  [{scene:1,command:1,type:'NOTE',number:0},/type must be PC, CC or NONE/],[{scene:1,command:1,type:'PC',channel:17,program:0},/channel must be 1..16/],
  [{scene:1,command:1,type:'PC',program:128},/program must be 0..127/],[{scene:1,command:1,type:'PC'},/program must be 0..127/],
  [{scene:1,command:1,type:'CC',number:128},/number must be 0..127/],[{scene:1,command:1,type:'CC',number:1,value:128},/value must be 0..127/],
  [{scene:1,command:1,type:'PC',number:1},/PC takes program, not number/],[{scene:1,command:1,type:'PC',program:1,value:5},/PC takes program, not value/],
  [{scene:1,command:1,type:'CC',number:1,program:2},/program applies to PC only/],[{scene:1,command:1,type:'NONE',program:1},/program with type NONE/],
  [{scene:1,command:1,type:'PC',program:1,extra:1},/unknown field/]])no(()=>validateSceneMidi([bad]),re,JSON.stringify(bad));
no(()=>validateSceneMidi([{scene:1,command:1,type:'PC',program:0},{scene:1,command:1,type:'CC',number:0}]),/given twice/,'duplicate command');
no(()=>validateSceneMidi([]),/1..64/,'empty list');
console.log(JSON.stringify({deviceSteps:rc.steps.length,commandsWritten:3,refusals}));

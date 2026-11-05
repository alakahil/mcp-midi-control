// Build the T28 Controllers pack. Offline; writes measurement presets, never device I/O.
// Question: the Controllers record (effect id 2, 130 words x 4 copies) sits in the preset prefix at body offset 452
// (46-byte header, data 498..1538, before the modifier records). Is word n the dictionary param n (as for the block
// records), which values does FM3-Edit show for them, and which of the four copies is the one FM3-Edit and the
// device use? The 798 corpus bodies hold only device defaults here, so there is no user oracle yet.
//   CT1: distinctive values on copy A for 26 params across LFO 1/2, ADSR 1, Envelope, Sequencer, Scene Controllers
//        and Manual; copies B/C/D differ from A only in LFO 1 Rate and Scene Controller 1 / Scene 1, so a reading
//        names the copy that is shown.
//   CT0: the unchanged base (device defaults) for the optional FM3-Edit edit (part 2).
// FM3_SHOT_LOAD.py --load sends one preset to the edit buffer (7F 00) and reads the record back with fn=0x1F
// (effect id 2; a failed or short read is a result here); Claude reads FM3-Edit's Controllers pages.
// Nothing is stored or set.
// Usage: node tools/fm3/t28-controllers-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as R from './fm3-read-requests.mjs';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {loadDictionary,encodeValue,OPT_IN_STATUSES}=await imp('scripts/fm3-table-encoder.mjs');
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump,reencodeRawPatch,reencodeDumpFromRawPatch}=await imp('scripts/fm3-codec.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t28-controllers-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const NEWLOOK=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const COMPOSER={schemaVersion:1,firmware:13,baseProfile:'jb-composer',compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const HEADER=452,DATA=498,WORDS=130,COPIES=4,EID=2,CH='ABCD';
const dict=loadDictionary().params.filter(p=>p.family==='CONTROLLERS');assert.equal(dict.length,WORDS);
const P=name=>{const p=dict.find(p=>p.name==='CONTROLLERS_'+name);assert.ok(p,name);return p;};
const opts={allow:[...OPT_IN_STATUSES]};

function base(name){
  const syx=Buffer.from(composeSound(NEWLOOK,{composer:{...COMPOSER,name},layout:{row2:['compressor','drive','amp','cab'],row3:['delay','reverb']}}).syx);
  const body=Buffer.from(inspectStructure(syx).raw.body);
  assert.equal(body.readUInt16LE(HEADER),EID,'Controllers id');assert.equal(body.readUInt16LE(HEADER+42),WORDS,'Controllers words');
  assert.equal(body.readUInt16LE(HEADER+44),COPIES,'Controllers copies');assert.ok(body.subarray(HEADER+2,HEADER+42).every(x=>x===0),'Controllers header');
  return {syx,body};
}
const wordsOf=body=>[...Array(WORDS*COPIES).keys()].map(i=>body.readUInt16LE(DATA+2*i));
function patch(syx,body,writes){
  const st=inspectStructure(syx),b=Buffer.from(body);
  for(const w of writes)b.writeUInt16LE(w.raw,DATA+2*(CH.indexOf(w.channel)*WORDS+w.pid));
  const o=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(st.raw.rawPatch,b)));
  assert.deepEqual([...parsePresetDump(o,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
  assert.ok(Buffer.from(inspectStructure(o).raw.body).equals(b),'re-encode round trip');
  return o;
}
const w=(channel,name,value,shows)=>{const p=P(name),raw=encodeValue(p,value,opts);
  return {param:p.name,channel,pid:p.param,label:p.label,value,raw,shows:shows??String(value)};};
const A=[w('A','LFO1TYPE',2,'SQUARE'),w('A','LFO1FREQ',2.5,'2.500 Hz'),w('A','LFO1DEPTH',75,'75.0 %'),w('A','LFO1DUTY',25,'25.0 %'),
 w('A','LFO2TYPE',1,'TRIANGLE'),w('A','LFO2FREQ',0.8,'0.800 Hz'),w('A','LFO2DEPTH',40,'40.0 %'),
 w('A','ADSR1MODE',1,'LOOP'),w('A','ADSR1ATTACK',250,'250 ms'),w('A','ADSR1DECAY',500,'500 ms'),w('A','ADSR1LEVEL',60,'60.0 %'),w('A','ADSR1RELEASE',1000,'1000 ms'),w('A','ADSR1THRESH',-30,'-30.0 dB'),
 w('A','ENVATTACK',20,'20.0 ms'),w('A','ENVRELEASE',300,'300 ms'),w('A','ENVGAIN',2,'2.00'),
 w('A','SEQFREQ',4,'4.00 Hz'),w('A','SEQSTAGES',12,'12'),w('A','SEQ1',25,'25.0 %'),w('A','SEQ2',50,'50.0 %'),
 w('A','SCENE1_VAL1',10,'10.0 %'),w('A','SCENE1_VAL2',20,'20.0 %'),w('A','SCENE1_VAL8',80,'80.0 %'),w('A','SCENE2_VAL1',33,'33.0 %'),
 w('A','MANUAL1',40,'40.0 %'),w('A','MANUAL5',90,'90.0 %')];
const copies=[1,2,3].flatMap(c=>[w(CH[c],'LFO1FREQ',[1,1.5,2][c-1],[1,1.5,2][c-1]+' Hz'),w(CH[c],'SCENE1_VAL1',10+c,(10+c)+'.0 %')]);
for(const x of [...A,...copies]){const p=P(x.param.slice(12));if(p.kind!=='enum'&&p.kind!=='integer')assert.notEqual(x.raw,encodeValue(p,p.min*(p.displayMultiplier||1),opts),'distinct from minimum '+x.param);}

const items=[];
function add(id,name,writes,question){
  const {syx:s0,body:b0}=base(name),def=wordsOf(b0);
  const syx=writes.length?patch(s0,b0,writes):s0,body=Buffer.from(inspectStructure(syx).raw.body),exp=wordsOf(body);
  const changed=exp.map((v,i)=>v!==def[i]?i:-1).filter(i=>i>=0);
  assert.deepEqual(changed,writes.filter(x=>x.raw!==def[CH.indexOf(x.channel)*WORDS+x.pid]).map(x=>CH.indexOf(x.channel)*WORDS+x.pid).sort((a,b)=>a-b),'only declared words '+id);
  assert.ok(body.subarray(0,HEADER).equals(b0.subarray(0,HEADER))&&body.subarray(DATA+2*WORDS*COPIES).equals(b0.subarray(DATA+2*WORDS*COPIES)),'nothing outside the record '+id);
  items.push({id,file:id+'.syx',sha256:sha(syx),name,syx,question,
    blocks:[{family:'controllers',effectId:EID,words:WORDS,channels:COPIES,request:hex(R.bulkReadPoll(EID)),expected:exp,writes}]});
}
add('CT1','T28 CONTROLLERS',[...A,...copies],'Which values does FM3-Edit show on the Controllers pages, and which copy (A: LFO1 Rate 2.5 Hz / Scene Ctrl 1 Scene 1 = 10 %; B 1 Hz / 11; C 1.5 Hz / 12; D 2 Hz / 13)?');
add('CT0','T28 CONTROLLERS DEF',[],'Device-default baseline for the optional FM3-Edit edit (part 2).');
assert.notEqual(items[0].sha256,items[1].sha256);

const dir=path.join(out,'FM3_T28_CTRL');fs.mkdirSync(dir,{recursive:true});
for(const it of items)fs.writeFileSync(path.join(dir,it.file),it.syx);
for(const f of ['FM3_SHOT_LOAD.py','FM3_SHOT_READ.py','FM3_CPU_SWEEP.py','FM3_READ_PROBE.py'])fs.copyFileSync(new URL(f,COLLECT),path.join(dir,f));
const manifest={kind:'fm3-shot-check',version:1,date:'2026-11-05',test:'T28',title:'Controllers: salvestuskoht, näidud ja koopiad',experimental:false,observeOnly:true,
  record:{header:HEADER,data:DATA,words:WORDS,copies:COPIES,effectId:EID,headerWords:'id 2, 20 zero words, words 130, copies 4'},
  method:'FM3_SHOT_LOAD.py --load sends one preset to the edit buffer (7F 00) and reads the Controllers record with fn=0x1F (effect id 2; read-only); Claude reads FM3-Edit Controllers pages without saving. Nothing is stored or set.',
  items:items.map(({syx,...it})=>it)};
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
const L=['FM3 katse T28: Controllers (ainult laadimine ja lugemine)','='.repeat(58),
 'Skriptid EI salvesta ega sea midagi. STORE-i pole vaja. FM3-Editis EI vajutata Save.',
 'Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse). "ERINEB" on siin tulemus, mitte viga.','',
 'OSA 1 (Remote Control): FM3-Edit ja Fractal-Bot kinni.',
 '  cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T28_CTRL && python3 FM3_SHOT_LOAD.py --self-test',
 '  python3 FM3_SHOT_LOAD.py --load --pack . --session ../FM3_T28_CTRL_SESSION --preset CT1',
 '  python3 FM3_SHOT_READ.py --pack . --session ../FM3_T28_CTRL_SESSION --preset CT1 --label after-load','',
 'OSA 2 (Claude, arvuti juhtimine): FM3-Edit lahti, Controllers lehed (LFO 1/2, ADSR 1, Envelope, Sequencer,',
 '  Scene Controllers, Manual) ekraanipildid. Valikuline: CT0 laadimine, FM3-Editis üks muudatus, FM3-Edit kinni,',
 '  python3 FM3_SHOT_READ.py --pack . --session ../FM3_T28_CTRL_SESSION --preset CT0 --label editor-NN',''];
fs.writeFileSync(path.join(dir,'LOE_MIND.txt'),L.join('\n'));
console.log(JSON.stringify({manifest:sha(fs.readFileSync(path.join(dir,'manifest.json'))),items:items.map(i=>({id:i.id,sha256:i.sha256,writes:i.blocks[0].writes.length}))}));

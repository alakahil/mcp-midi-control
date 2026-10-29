// Receipt for the 2026-10-29 modifier field step check (FM3_MOD_STEPS.py v2, test T12, pack revision 2). Offline.
// The pack is rebuilt (tools/fm3/mod-steps-build.mjs) to the manifest the device run used: External 1 -> Volume/Pan 1
// Volume (record 0). The user changed ONE Modify-page field per step on the FM3 front panel, typed the value the
// screen showed and STOREd to his test location; after each STORE the script read that location (fn=0x03, read
// only). Consecutive stored bodies are compared word for word: each step must change exactly the expected record
// word (plus, where stated, the Volume/Pan Scene 1 bypass word), which pairs every modifier word with its display.
// Usage: node tools/fm3/mod-steps-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-10-29/');
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const {scanRecords}=await import(path.join(ENG,'scripts/fm3-layout.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=path.join(RAW,'fm3-mod-steps-20261029-results.json'),res=JSON.parse(fs.readFileSync(file,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t12-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/mod-steps-build.mjs'),tmp],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'manifest.json')),m=JSON.parse(mb),ref=fs.readFileSync(path.join(tmp,m.preset.file));
assert.equal(sha(mb),res.packSha256,'pack rebuilt identically');assert.equal(m.revision,2);
assert.ok(res.userConfirmedName,'edit-buffer load confirmed');assert.equal(res.index,res.shownLocation-1,'Display Offset 1');
assert.deepEqual(res.steps.map(s=>s.id),m.steps.map(s=>s.id),'every step done, none skipped');
const bodyOf=(fr,name)=>{const s=inspectStructure(Buffer.concat(fr.map(h=>Buffer.from(h,'hex'))));assert.ok(s.raw.crcValid,'CRC '+name);assert.equal(s.decoded.preset_name,m.confirmName);return Buffer.from(s.raw.body);};
const gen=Buffer.from(inspectStructure(ref).raw.body),R0=1584,W=w=>R0+2*w;
const vol=scanRecords(gen).records.find(r=>r.family==='volpan'),BYP=vol.header+26;
const diff=(a,b)=>{const d=[];for(let o=0;o<a.length;o+=2)if(a.readUInt16LE(o)!==b.readUInt16LE(o))d.push([o,a.readUInt16LE(o),b.readUInt16LE(o)]);return d;};
// Expected change per step: [word, before, after] and the optional Volume/Pan Scene 1 bypass word change.
const expect={base:[],start:[[3,0,13107]],end:[[5,65534,52427]],mid:[[4,32767,16384]],slope:[[6,32767,49151]],scale:[[13,32767,42623]],scale2:[[13,42623,22911]],
  offset:[[14,32767,36044]],attack:[[7,66,655]],release:[[15,66,3277]],damping:[[24,0,1]],autoengage:[[10,0,1]],offvalue:[[12,0,32767]],updaterate:[[16,0,1]],pcreset:[[11,0,1]],remove:[[0,14,0],[8,102,0]]};
const bypass={autoengage:[0,1],remove:[1,0]};
let prev=gen;const steps=[];
for(const st of res.steps){const b=bodyOf(st.storedDumpFrames,st.id),d=diff(prev,b);
  const want=[...expect[st.id].map(([w,p,q])=>[W(w),p,q]),...(bypass[st.id]?[[BYP,...bypass[st.id]]]:[])].sort((x,y)=>x[0]-y[0]);
  assert.deepEqual(d,want,st.id+': only the expected word(s) change');
  steps.push({id:st.id,field:st.field,shown:String(st.shown).trim(),words:expect[st.id].map(([word,before,after])=>({word,before,after})),
    ...(bypass[st.id]?{volumePanScene1Bypass:{before:bypass[st.id][0],after:bypass[st.id][1]}}:{}),note:st.note||''});prev=b;}
const after=prev;assert.equal(after.readUInt16LE(W(9)),0,'target PID already 0 (Volume)');
// Display formulas checked against every non-default reading.
const num=s=>Number(String(s).replace(',','.').replace(/[^0-9.\-]/g,''));
const shown=Object.fromEntries(steps.map(s=>[s.id,s.shown]));
const pct=w=>Math.round(w/65534*1000)/10, scale=w=>10**((w-32767)/32767), offs=w=>Math.round((w-32767)/32767*1000)/10, ms=w=>w*10000/65534;
for(const [id,w] of [['start',13107],['end',52427],['mid',16384],['slope',49151],['offvalue',32767]])assert.equal(pct(w),num(shown[id]),id);
for(const [id,w] of [['scale',42623],['scale2',22911]])assert.equal(scale(w).toFixed(3),num(shown[id]).toFixed(3),id);
assert.equal(offs(36044),num(shown.offset),'offset');
for(const [id,w] of [['attack',655],['release',3277]])assert.equal(Math.floor(ms(w)*10)/10,num(shown[id]),id);
// Earlier two-point readings of the same time scale (T7/T7b): 66 -> 10.1 ms, 65 -> 9.9 ms.
assert.equal(ms(66).toFixed(1),'10.1');assert.equal(ms(65).toFixed(1),'9.9');
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-29',test:'T12',
  preset:{name:m.confirmName,sha256:m.preset.sha256,binding:m.binding,packRevision:m.revision},
  method:'Edit-buffer load (7F 00) once by the script; per step the user changed one Modify-page field on the FM3 front panel, typed the shown value and STOREd to his test location; the script then read that location with fn=0x03 (read-only). The script never stored or set anything. Consecutive stored bodies compared word for word.',
  storedLocation:{shown:res.shownLocation,index:res.index},
  steps,
  decoded:{
    word3:{field:'Start',display:'word / 65534 x 100 %',points:{0:'0.0%',13107:'20.0%'}},
    word4:{field:'Mid',display:'word / 65534 x 100 %',points:{32767:'50%',16384:'25.0%'}},
    word5:{field:'End',display:'word / 65534 x 100 %',points:{65534:'100%',52427:'80.0%'}},
    word6:{field:'Slope',display:'word / 65534 x 100 %',points:{32767:'50%',49151:'75.0%'}},
    word7:{field:'Attack',display:'word x 10000 / 65534 ms (0..10000 ms), shown to 0.1 ms',points:{65:'9.9 ms',66:'10.1 ms',655:'99.9 ms'}},
    word10:{field:'Auto-Engage',display:'enum',points:{0:'OFF',1:'SLOW SPD',5:'MED POS (T7)'}},
    word11:{field:'PC Reset',display:'enum',points:{0:'OFF',1:'ON'}},
    word12:{field:'Off Value',display:'word / 65534 x 100 % (one non-default point)',points:{32767:'50.0%'},open:'T7 read 5.0% for word 0; not explained by this formula'},
    word13:{field:'Scale',display:'10^((word - 32767) / 32767), 0.100..10.000',points:{32767:'1.000',42623:'1.999',22911:'0.500'}},
    word14:{field:'Offset',display:'(word - 32767) / 32767 x 100 %',points:{32767:'0.0%',36044:'10.0%'}},
    word15:{field:'Release',display:'same scale as Attack',points:{66:'10.1 ms',3277:'500.0 ms'}},
    word16:{field:'Update Rate',display:'enum',points:{0:'SLOW',1:'MEDIUM'}},
    word24:{field:'Damping',display:'enum',points:{0:'EXPONENTIAL',1:'LINEAR'}}},
  findings:['Every step changed exactly one modifier word (record 0), so all thirteen Modify-page fields are now paired with their record words; words 11 (PC Reset) and 16 (Update Rate) were not named before.',
    'Start, Mid, End, Slope and Off Value are word / 65534; Offset is centred at 32767 (+/-100 %); Scale is 10^((word - 32767) / 32767), confirmed at 2.000 and 0.500 (the FM3 offered 1.999 for 2.000).',
    'Attack and Release use word x 10000 / 65534 ms, which also fits the earlier 65 / 66 readings.',
    'Setting Auto-Engage to SLOW SPD also stored the Volume/Pan Scene 1 bypass word as bypassed (0 -> 1); removing the binding stored it engaged again. The FM3 stores the live bypass state that Auto-Engage produces (as in T9).',
    'Setting Source 1 to NONE stored the FM3 removal form on the device: words 0 and 8 -> 0 (word 9 was already 0), every other word kept, no compaction. This matches references/fm3-modifier-removal-20261028.json.'],
  notMeasured:['audio','Auto-Engage labels other than OFF / SLOW SPD / MED POS','Update Rate and Damping options beyond the second','Off Value word 0'],
  resultsSha256:sha(fs.readFileSync(file))};
const target=path.join(ENG,'references/fm3-mod-steps-20261029.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'modifier steps receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});console.log(JSON.stringify({steps:steps.length,decodedWords:Object.keys(out.decoded).length,storedLocation:res.shownLocation}));

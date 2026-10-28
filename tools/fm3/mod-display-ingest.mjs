// Receipt for the 2026-10-28 modifier display reading (FM3_MOD_READ.py, test T7). Offline.
// The pack held seven user-owned commercial presets (not in the repository; manifest pinned by hash only).
// Per case this receipt keeps only the structural modifier words that the case is about (generic codes such
// as 0 / 65534 / 1707 / 65 / 66 / 4), the user's front-panel readings and the decoded pairing. Preset names,
// files and the other values of those presets stay outside the repository.
// Usage: node tools/fm3/mod-display-ingest.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const REF=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-10-28/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=path.join(RAW,'fm3-mod-read-20261028-results.json'),res=JSON.parse(fs.readFileSync(file,'utf8'));
const PACK_MANIFEST_SHA256='5eb975ce333fc58782559f6452058ac453aeb089a3b606afb68e247db7813675';
const norm=s=>String(s).trim().replace(/Swich/i,'Switch').replace(/\s+-\s+/g,' ').replace(/\s+/g,' ');
// Chat correction (2026-10-28 14:24): for the first item the user first typed "NONE" for Source 1 and then
// wrote that the screen showed "52 Control Switch 2".
const CORRECTIONS={baseline:{source1:'52 Control Switch 2',why:'user correction in the conversation, 2026-10-28 14:24 (first answer "NONE" was a misread)'}};
// Structural words per case (word index -> stored value). Source codes are 0-based (policy sources table).
const CASES={
  baseline:{binding:'Control Switch 2 (51) -> Amp DISTORT_BOOST, channels ALL',words:{0:51,1:0,2:65534,3:0,4:32767,5:65534,6:32767,7:66,10:0,11:0,12:0,13:32767,14:32767,15:66,16:0,17:0,18:0,19:0,20:0}},
  inverted:{binding:'Control Switch 4 (53) -> Amp DISTORT_BRIGHT, ALL',words:{0:53,1:65534,2:0}},
  partial:{binding:'Control Switch 4 (53) -> Amp DISTORT_BRIGHT, ALL',words:{0:53,1:65534,2:1707}},
  continuous:{binding:'External 2 (15) -> Rotary ROTARY_RATE, CHAN A, Min/Max inside the range',words:{0:15,17:1}},
  curve:{binding:'Pitch Follower (9) -> Amp DISTORT_EQ3, ALL, Mid/Slope/Scale away from the default',words:{0:9}},
  autoengage:{binding:'External 1 (14) -> Wah WAH_CONTROL, ALL',words:{0:14,1:0,2:65534,7:65,10:5,12:65534,15:65,17:0}},
  word17:{binding:'Control Switch 4 (53) -> Amp DISTORT_BRIGHT',words:{0:53,1:0,2:65534,17:4}}};
assert.deepEqual(res.items.map(i=>i.id),Object.keys(CASES),'all seven cases read');
const items=res.items.map(i=>{const c=CORRECTIONS[i.id],fields=Object.fromEntries(Object.entries(i.fields).map(([k,v])=>[k,norm(v)]));
  if(i.id==='baseline')fields.Channel='ALL';  // the user typed the whole page into the first prompt; its first entry is "Channel ALL"
  return {id:i.id,binding:CASES[i.id].binding,words:CASES[i.id].words,source1:c?c.source1:norm(i.source1),...(c?{source1AsTyped:norm(i.source1),correction:c.why}:{}),fields,note:norm(i.note)};});
const by=Object.fromEntries(items.map(i=>[i.id,i]));
// Validity: a reading belongs to its binding only if Source 1 names the stored source.
const display=code=>({9:'10 Pitch Follower',14:'15 External 1',15:'16 External 2',51:'52 Control Switch 2',53:'54 Control Switch 4'})[code];
for(const i of items)i.validReading=i.source1===display(i.words[0]);
assert.deepEqual(items.filter(i=>!i.validReading).map(i=>i.id),['continuous','curve'],'continuous and curve were read on a different parameter');
assert.equal(by.inverted.fields.Min,'ON');assert.equal(by.inverted.fields.Max,'OFF');
assert.equal(by.partial.fields.Min,'ON');assert.equal(by.partial.fields.Max,'OFF');
assert.equal(by.word17.fields.Channel,'CHAN D');
assert.equal(by.autoengage.fields['Auto-Engage'],'MED POS');
assert.equal(by.baseline.fields.Attack,'10.1 ms');assert.equal(by.baseline.fields.Release,'10.1 ms');
assert.equal(by.autoengage.fields.Attack,'9.9 ms');assert.equal(by.autoengage.fields.Release,'9.9 ms');
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-28',
  pack:{presets:7,source:'user-owned commercial FW13 tonepack presets, chosen by structural criteria (tools/fm3/modifier-display-build.mjs); files and names not in the repository',manifestSha256:PACK_MANIFEST_SHA256},
  method:'Edit-buffer loads (7F 00) only. The user opened the bound parameter on the FM3 front panel, pressed ENTER (Modifier menu), read Source 1, then PAGE RIGHT (Modify page) and typed every field. No store, no SET.',
  items,
  decoded:{
    sourceDisplayNumber:'The Source list number shown on the FM3 is the stored source code + 1: 51 -> "52 Control Switch 2", 53 -> "54 Control Switch 4", 14 -> "15 External 1"; 0 -> "1 NONE".',
    switchMinMax:'Switch targets: word 1 (Min) / word 2 (Max) 0 -> OFF, 65534 -> ON; 1707 (2.6 % of 65534) displays OFF. Inverted 65534/0 shows Min ON, Max OFF.',
    channelWord17:'Word 17 = 4 displays Channel "CHAN D" (0 ALL, 1..4 CHAN A..D, as the policy table).',
    autoEngageWord10:'Word 10 = 5 displays Auto-Engage "MED POS"; 0 displays OFF.',
    attackReleaseWords7and15:'Words 7 and 15 = 66 display Attack 10.1 ms and Release 10.1 ms; 65 displays 9.9 ms for both. Both words changed together in this corpus, so which word is Attack and which is Release is not separated.',
    defaultsOfTheModifyPage:'Default binding page: Min OFF, Max ON, Start 0.0 %, Mid 50 %, End 100 %, Slope 50 %, Scale 1.000, Offset 0.0 %, Damping EXPONENTIAL, Auto-Engage OFF, Off Value 5.0 %, PC Reset OFF, Update Rate SLOW.',
    offValueWord12:'Word 12 = 0 and 65534 both displayed Off Value 5.0 %: word 12 is not Off Value (unresolved).'},
  notResolved:['continuous Min/Max display (the Rotary Rate reading was taken on another parameter)','Mid / Slope / Scale curve words (the Pitch Follower case showed Source NONE; the Modify page could not be opened)','which of words 7 / 15 is Attack','word 12'],
  findings:['The FM3 default template written by controlSwitches displays as the default Modify page: Min OFF, Max ON, full curve defaults, channel ALL.',
    'Source numbers on the FM3 screen are 1-based (stored code + 1).',
    'Switch Min/Max are stored 0 / 65534; an inverted binding stores 65534 / 0.'],
  resultsSha256:sha(fs.readFileSync(file))};
const target=path.join(REF,'fm3-modifier-display-20261028.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'modifier display receipt stale');
assert.ok(!/'26|\.syx"|Petrucci|LiveGold|Satriani/.test(content),'no third-party names');
console.log(JSON.stringify({items:items.length,valid:items.filter(i=>i.validReading).length}));

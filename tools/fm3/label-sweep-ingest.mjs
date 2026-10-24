// Receipt for the 2026-10-24 FM3 list-label checks (audit point 3). Offline.
// Usage: node tools/fm3/label-sweep-ingest.mjs [--write]
// Label probe: the value-field encodings of the fn=0x01 sub=0x1F request; the integer form returns
// the label of that list index. Label sweep: every list parameter of every generator family, all
// in-range words, compared with the generator dictionary by STORED WORD (word w = enum[w - enumBase]).
// Both packs are rebuilt and must hash to the manifests the device runs used.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const REF=path.join(ENG,'references/');
const {loadDictionary,dictionaryHash}=await import(path.join(ENG,'scripts/fm3-table-encoder.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex'),rd=f=>JSON.parse(fs.readFileSync(path.join(REF,f),'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-ls-'));
const build=(tool,dir)=>{execFileSync('node',[path.join(ROOT,'tools/fm3',tool),path.join(tmp,dir)],{stdio:'ignore'});return JSON.parse(fs.readFileSync(path.join(tmp,dir,'manifest.json'),'utf8'));};
const hashOf=dir=>sha(fs.readFileSync(path.join(tmp,dir,'manifest.json')));
// 1. label probe
const probe=rd('fm3-label-probe-20261024-results.json'),pm=build('label-probe-build.mjs','probe');
assert.equal(hashOf('probe'),probe.packSha256,'label probe pack rebuilt identically');
assert.ok(probe.baselineMatchesPack.grid&&probe.baselineMatchesPack.blocks&&probe.finalUnchanged&&probe.variants.every(v=>v.unchanged),'probe: preset unchanged after every request');
const variants=pm.variants.map(v=>{const got=probe.variants.find(x=>x.id===v.id);assert.ok(got&&got.parsed,'reply '+v.id);
  const integer=v.field.slice(2).every(b=>b===0)&&v.field[1]===0&&v.field[0]>0,zero=v.field.every(b=>b===0);
  if(zero||integer)assert.equal(got.parsed.text,v.dictionaryLabel,'label of '+v.id);
  assert.deepEqual(got.parsed.valueField,zero||integer?[0,0,0,0,0]:got.parsed.valueField);
  return {id:v.id,what:v.what,field:zero?'zero':integer?'integer':'float32',deviceText:got.parsed.text,dictionaryLabel:v.dictionaryLabel,matches:got.parsed.text===v.dictionaryLabel};});
assert.ok(variants.filter(v=>v.field==='float32').every(v=>!v.matches),'float32 form does not return the label');
// 2. label sweep
const res=rd('fm3-label-sweep-20261024-results.json'),sm=build('label-sweep-build.mjs','sweep');
assert.equal(hashOf('sweep'),res.packSha256,'label sweep pack rebuilt identically');
assert.equal(sm.dictionarySha256,dictionaryHash,'same dictionary as the sweep');
assert.ok(res.userConfirmedName&&res.pilot.unchanged&&res.finalUnchanged&&res.baselineMatchesPack.grid&&res.baselineMatchesPack.blocks,'sweep safety reads');
assert.ok(!res.stoppedAt&&res.families.length===sm.families.length&&res.families.every(f=>f.unchanged&&!f.skipped),'every family swept, preset unchanged after each');
const d=loadDictionary(),trim=s=>String(s).replace(/\s+$/,'');
const tally={exact:0,trailingSpaceOnly:0,deviceOnlyWord:[],notRequested:[],mismatch:[]};const families=[];
for(const f of res.families){const mf=sm.families.find(x=>x.effectId===f.effectId);let n=0,ok=0;
  assert.equal(f.params.length,mf.params.length,f.slug+' parameters');
  for(const p of f.params){const dp=d.byKey.get(f.effectId+':'+p.paramId),base=dp.enumBase??0;
    assert.ok(!p.noReply.length&&!p.stopped&&p.texts.length===p.count&&p.count===dp.enum.length,f.slug+'.'+p.name+' complete');
    p.texts.forEach((t,w)=>{if(w<base){tally.deviceOnlyWord.push({param:`${f.slug}.${p.name}`,word:w,deviceText:t});return}
      const e=dp.enum[w-base];n++;if(t===e){tally.exact++;ok++}else if(trim(t)===trim(e)){tally.trailingSpaceOnly++;ok++}
      else tally.mismatch.push({param:`${f.slug}.${p.name}`,word:w,dictionary:e,device:t});});
    for(let k=dp.enum.length;k<dp.enum.length+base;k++)tally.notRequested.push({param:`${f.slug}.${p.name}`,word:k,dictionary:dp.enum[k-base]});}
  families.push({slug:f.slug,effectId:f.effectId,inPreset:f.present,listParams:f.params.length,entries:n,match:ok});}
assert.equal(tally.mismatch.length,0,'device labels equal the dictionary: '+JSON.stringify(tally.mismatch.slice(0,3)));
const entries=tally.exact+tally.trailingSpaceOnly;
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-24',auditPoint:3,dictionarySha256:dictionaryHash,
  request:{shape:'fn=0x01 sub=0x1F 00 eid(14b) pid(14b) index(14b) 00*7',meaning:'label of list index n; reply value field zero; sub-action 1F 00 is not a SET sub-action',
    probe:variants,probeResultsSha256:sha(fs.readFileSync(path.join(REF,'fm3-label-probe-20261024-results.json')))},
  sweep:{families:families.length,listParams:families.reduce((a,f)=>a+f.listParams,0),entriesCompared:entries,exact:tally.exact,
    trailingSpaceOnly:tally.trailingSpaceOnly,trailingSpaceNote:'the dictionary label ends in a space; the reply text is read with trailing spaces trimmed, so a device trailing space cannot be seen',
    mismatches:0,deviceOnlyWords:tally.deviceOnlyWord,notRequested:tally.notRequested,blocksNotInPreset:'answered too: labels do not need the block in the preset',
    families,resultsSha256:sha(fs.readFileSync(path.join(REF,'fm3-label-sweep-20261024-results.json')))},
  safety:['Edit-buffer loads only; grid + every block of the preset re-read after the first request and after every block: unchanged.',
    'A first sweep (float32 form) stopped at the pilot without a label. A second sweep (integer form, two words past every list end, no pacing) froze the FM3 after the amp block; the user power-cycled it. The third sweep (in-range words only, 20 ms pacing, health check every 50 requests) completed. Which of the two changes avoided the freeze is not known: never request words past a list end.'],
  notMeasured:['words past the dictionary end (deliberately not requested)','the last entry of the enumBase-1 lists above','labels of knob parameters (short reply without text)']};
const target=path.join(REF,'fm3-label-sweep-20261024.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'label sweep receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});
console.log(JSON.stringify({families:families.length,entries,exact:tally.exact,trailingSpaceOnly:tally.trailingSpaceOnly,mismatches:0,probeVariants:variants.length}));

// Regression for the FM3_LABEL_SWEEP.py collector against a simulated FM3 (fake_label_fm3.py).
// Offline: no serial port, no device. Builds the real pack (tools/fm3/label-sweep-build.mjs), then
// checks that the collector sends only one edit-buffer dump and read-only requests, sweeps every
// list parameter of the blocks in the preset, skips silent absent blocks, and stops at the first
// device change (grid or block), at a missing echo, or when the user does not see the name.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const check=(v,m)=>{if(!v)throw Error(m)};
const root=fileURLToPath(new URL('../../',import.meta.url));
const here=path.join(root,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts');
const harness=path.join(here,'cpu-sweep-collector/fake_label_fm3.py');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-labels-'));
const run=(pack,session,...args)=>{
  const out=execFileSync('python3',['-B',harness,pack,session,...args],{encoding:'utf8'});
  const fake=JSON.parse(out.split('\n').find(l=>l.startsWith('FAKE ')).slice(5));
  const f=path.join(session,'label-results.json');
  return {fake,out,res:fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):null};
};
try{
  const pack=path.join(tmp,'pack');execFileSync('node',[path.join(root,'tools/fm3/label-sweep-build.mjs'),pack],{stdio:'ignore'});
  const m=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'),'utf8'));
  const present=m.families.filter(f=>f.present),swept=present.reduce((n,f)=>n+f.params.reduce((a,p)=>a+p.count+m.extra,0),0);
  // 1. normal run: every present list parameter swept with echoed indexes; absent blocks skipped
  const a=run(pack,path.join(tmp,'s1'));
  check(a.fake.exit==='ok'&&a.fake.dumpsReceived===1&&a.fake.otherFrames===0&&a.fake.refusedShapes===0,'normal run: '+JSON.stringify(a.fake));
  const absent=m.families.length-present.length;
  check(a.fake.labelRequests===1+swept+2*absent,'request count '+a.fake.labelRequests+' vs '+(1+swept+2*absent));
  check(a.res.pilot.unchanged&&a.res.finalUnchanged&&a.res.baselineMatchesPack.grid&&a.res.baselineMatchesPack.blocks,'safety reads');
  const sw=a.res.families.filter(f=>!f.skipped);check(sw.length===present.length&&a.res.families.filter(f=>f.skipped).length===absent,'present swept, absent skipped');
  for(const f of sw)for(const p of f.params){check(p.texts.length===p.count+m.extra&&!p.noReply.length,'complete '+f.slug+'.'+p.name);
    check(p.texts.every((t,i)=>t===((f.effectId===m.pilot.effectId&&p.paramId===m.pilot.paramId&&i===m.pilot.index)?m.pilot.label:`L${f.effectId}.${p.paramId}.${i}`)),'texts '+f.slug+'.'+p.name);}
  // 2. absent blocks that do answer are swept too
  const b=run(pack,path.join(tmp,'s2'),'--absent-text');
  check(b.fake.exit==='ok'&&b.res.families.every(f=>!f.skipped)&&b.fake.labelRequests===1+m.requests+2*absent,'absent blocks with text are swept');
  // 3. a grid change after the pilot request stops before the sweep
  const c=run(pack,path.join(tmp,'s3'),'--change-after','0');
  check(c.fake.exit.includes('PEATUS: ruudustik muutus pärast esimest päringut')&&c.fake.labelRequests===1&&c.res.families.length===0,'grid change stops: '+c.fake.exit);
  // 4. a block change during the sweep stops after that block
  const d=run(pack,path.join(tmp,'s4'),'--block-change-after','5');
  check(d.fake.exit.includes('PEATUS: plokk amp muutus')&&!d.res.finalUnchanged,'block change stops: '+d.fake.exit);
  // 5. a pilot reply with the wrong label stops after the re-read
  const e=run(pack,path.join(tmp,'s5'),'--wrong-label');
  check(e.fake.exit.includes('Esimene päring ei andnud oodatud silti')&&e.fake.labelRequests===1&&e.res.pilot.unchanged,'wrong pilot label stops');
  // 6. the user does not see the name: stop after the dump, nothing else sent
  const g=run(pack,path.join(tmp,'s6'),'--answer','e');
  check(g.fake.exit.includes('redaktsioonipuhvrisse')&&g.fake.labelRequests===0&&g.fake.bulkReads===0,'name refusal stops');
  // 7. a list parameter that never answers is given up after three requests
  const sp=present.find(f=>f.effectId===m.pilot.effectId).params.find(p=>p.paramId!==m.pilot.paramId&&p.count>3);
  const q=run(pack,path.join(tmp,'s8'),'--silent-param',String(sp.paramId)),qp=q.res.families.find(f=>f.effectId===m.pilot.effectId).params.find(p=>p.paramId===sp.paramId);
  check(q.fake.exit==='ok'&&qp.stopped&&qp.texts.length===3&&q.fake.labelRequests===a.fake.labelRequests-(sp.count+m.extra-3),'silent parameter given up');
  // 8. tampered preset refused before any device write
  const t=path.join(tmp,'tampered');fs.cpSync(pack,t,{recursive:true});const s=fs.readFileSync(path.join(t,'SWEEP.syx'));s[100]^=1;fs.writeFileSync(path.join(t,'SWEEP.syx'),s);
  const h=run(t,path.join(tmp,'s7'));check(h.fake.exit.includes('SHA-256 mismatch')&&h.fake.dumpsReceived===0,'tampered refused');
  // 9. the FM3 stops answering mid-sweep: stop with the position saved; the same session resumes
  const hs=path.join(tmp,'s9'),hn=400,hg=run(pack,hs,'--hang-after',String(hn));
  check(hg.fake.exit.includes('PEATUS: FM3 lakkas vastamast')&&hg.res.stoppedAt&&hg.res.families[0].params.length>0,'hang stops with progress saved: '+hg.fake.exit);
  const kept=hg.res.families.flatMap(f=>f.params).length,rs=run(pack,hs);
  check(rs.fake.exit==='ok'&&rs.res.finalUnchanged&&rs.res.resumedParams===kept&&rs.fake.labelRequests<a.fake.labelRequests,'resume: '+JSON.stringify(rs.fake));
  check(JSON.stringify(rs.res.families.map(f=>f.params.map(p=>p.texts)))===JSON.stringify(a.res.families.map(f=>f.params.map(p=>p.texts))),'resumed texts equal an uninterrupted run');
  check(a.fake.gridReads>=Math.floor(swept/50),'health checks during the sweep');
  // 10. the encoding probe: one request per variant, each followed by a full re-read
  const lp=path.join(tmp,'probe');execFileSync('node',[path.join(root,'tools/fm3/label-probe-build.mjs'),lp],{stdio:'ignore'});
  const pm=JSON.parse(fs.readFileSync(path.join(lp,'manifest.json'),'utf8'));
  const pr=execFileSync('python3',['-B',harness,lp,path.join(tmp,'sp'),'--probe'],{encoding:'utf8'}),pf=JSON.parse(pr.split('\n').find(l=>l.startsWith('FAKE ')).slice(5));
  const pres=JSON.parse(fs.readFileSync(path.join(tmp,'sp','label-probe-results.json'),'utf8'));
  check(pf.exit==='ok'&&pf.refusedShapes===0&&pf.otherFrames===0&&pf.labelRequests===pm.variants.length&&pres.finalUnchanged&&pres.variants.every(v=>v.unchanged),'probe run: '+JSON.stringify(pf));
  check(pf.bulkReads===pm.families.length*(1+pm.variants.length),'probe re-reads every block after every variant');
  const pc=execFileSync('python3',['-B',harness,lp,path.join(tmp,'sp2'),'--probe','--change-after','0'],{encoding:'utf8'});
  const pcf=JSON.parse(pc.split('\n').find(l=>l.startsWith('FAKE ')).slice(5));
  check(pcf.exit.includes('PEATUS: ruudustik muutus pärast päringut A0')&&pcf.labelRequests===1,'probe stops on a change: '+pcf.exit);
  for(const sc of ['FM3_LABEL_SWEEP.py','FM3_READ_PROBE.py','FM3_LABEL_PROBE.py'])
    check(JSON.parse(execFileSync('python3',['-B',path.join(here,'cpu-sweep-collector',sc),'--self-test'],{encoding:'utf8'}).trim().split('\n').pop()).selfTest==='passed',sc+' self-test');
  console.log(JSON.stringify({scenarios:11,requestsSimulated:a.fake.labelRequests,deviceIO:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

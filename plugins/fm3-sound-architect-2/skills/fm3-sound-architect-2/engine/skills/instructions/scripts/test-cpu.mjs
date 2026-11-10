// Regression for fm3-cpu (audit point 7). Offline.
import fs from 'node:fs';
import {estimateCpu,renderCpuText,cpuMeasurements,cpuTypes,qualityDelta,MULTIDELAY_TEMPLATE_COSTS} from './fm3-cpu.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
const rd=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
// 1. hand subtractive readings are internally consistent
const A=cpuMeasurements.sessions.A.readings,c=cpuMeasurements.costs;
for(let i=1;i<A.length;i++)check(Math.abs((A[i-1][2]-A[i][2])-c[A[i][1]].cpu)<0.05,'Cost of '+A[i][1]);
// 2. sweep table: 342 types in 16 families, quality deltas measured on three algorithms
check(Object.values(cpuTypes.families).reduce((n,f)=>n+Object.keys(f).length,0)===342,'342 measured types');
check(qualityDelta('Room: Large Room','HIGH').delta===9&&qualityDelta('Room: Large Room','HIGH').exact,'measured quality delta');
const x=qualityDelta('Hall: Small Hall','ULTRA-HIGH');check(!x.exact&&x.delta===13,'same-category extrapolation is conservative');
// 3. hardware cross-checks: P6 A measured 82.5 %, P6 B exceeded the limit, Satriani V1 Scene 4 measured 61 %
const a=estimateCpu(rd('examples/FM3_P6_INSERT_A.syx'));check(a.exactAllScenes&&Math.abs(a.scenes[0].percent-82.5)<=1,'P6 A within 1 %: '+a.scenes[0].percent);
const b=estimateCpu(rd('examples/FM3_P6_INSERT_B.syx'));check(b.exactAllScenes&&b.scenes[0].percent>cpuMeasurements.limit.safe&&b.scenes[0].warning==='over the safe limit','P6 B over the limit');
const v=estimateCpu(rd('examples/SATRIANI_SOAP_ON_A_ROPE.syx'));check(v.exactAllScenes&&Math.abs(v.scenes[3].percent-61)<=1.5,'Satriani V1 Scene 4: '+v.scenes[3].percent);
const t=renderCpuText(v);check(/Scene 3/.test(t)&&/Amp ja Delay/.test(t)&&/ei taga presetipõhist veapiiri/.test(t)&&!t.includes('±1 %'),'text');
const g=JSON.parse(rd('references/fm3-grid-check-20261023.json')).tests.find(t=>t.id==='G06');
check(Math.abs((g.cpuEstimate-g.cpuMeasured)-2.8)<1e-8&&v.measuredTypeCoverageAllScenes,'Measured-type coverage cannot guarantee a 1-point model bound');
// 4. T31 insert-block types (0.2.4 behaviour kept for voices 2/3 OFF): per-type costs, Synth voice 1 with voices 2/3 OFF, Legacy Cab = Dyna-Cab cost.
import('./fm3-sound.mjs').then(({composeSound})=>{
  const NL=rd('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),C={schemaVersion:1,firmware:13,baseProfile:'jb-composer',compressorChannels:[{channel:'A',type:'Optical Compressor'}],name:'CPU T31'};
  const est=b=>estimateCpu(Buffer.from(composeSound(NL,{composer:C,insert:[b],layout:{row2:['compressor','drive','amp','cab'],row3:['delay',b,'reverb']},blockScenes:{[b]:[{scene:1,bypass:false}]}}).syx)).scenes[0];
  const base=estimateCpu(Buffer.from(composeSound(NL,{composer:C,layout:{row2:['compressor','drive','amp','cab'],row3:['delay','reverb']}}).syx)).scenes[0];
  for(const [b,cost] of [['plex',9.5],['megatap',9.5],['tentap',4.5],['resonator',7.5],['ringmod',2.5],['gate',4],['synth',7.5]]){
    const s=est(b);check(s.parts[b]===cost&&!s.notes.some(n=>n.startsWith(b)),'T31 '+b+' '+s.parts[b]);check(Math.abs(s.percent-base.percent-cost)<0.05,'T31 sum '+b);}
  check(base.parts.cab===2.9&&!base.notes.some(n=>/cab/.test(n)),'Dyna-Cab measured');
  // 5. T37 Synth voices (0.2.5): voices 2/3 priced like voice 1 and summed; every T37 item replayed from its voice words.
  return Promise.all([import('./drive-collector/fm3-prototype.mjs'),import('./fm3-codec.mjs'),import('./fm3-layout.mjs')]).then(([P,K,L])=>{
    const t37=JSON.parse(rd('references/fm3-t37-synth-cpu-20261107.json')),TY=['SINE','TRIANGLE','SQUARE','SAWTOOTH','RANDOM','WHT NOISE','PINK NOISE','OFF'];
    const syn=Buffer.from(composeSound(NL,{composer:C,insert:['synth'],layout:{row2:['compressor','drive','amp','cab'],row3:['delay','synth','reverb']},blockScenes:{synth:[{scene:1,bypass:false}]}}).syx);
    for(const it of t37.items.filter(x=>x.voices)){
      const st=P.inspectStructure(syn),bd=Buffer.from(st.raw.body),r=L.scanRecords(bd,{requireAmpCab:false}).records.find(x=>x.family==='synth');
      [0,11,29].forEach((pid,k)=>bd.writeUInt16LE(TY.indexOf(it.voices[k]),r.start+2*pid));
      const o=Buffer.from(K.reencodeDumpFromRawPatch(syn,K.reencodeRawPatch(st.raw.rawPatch,bd))),e=estimateCpu(o).scenes[0];
      check(e.parts.synth===it.summedPoints&&!e.notes.length,'T37 '+it.id+' '+e.parts.synth);check(it.costPoints<=e.parts.synth+1,'T37 sum conservative '+it.id);
      check(estimateCpu(o,{model:'fm3-cpu 0.2.4'}).scenes[0].parts.synth===(it.voices[1]==='OFF'&&it.voices[2]==='OFF'&&it.voices[0]!=='OFF'||it.id==='default'?it.costPoints:13.5),'0.2.4 kept '+it.id);
    }
    // 6. H2 Multi Delay Type templates (0.2.6): the H2 preset shape replays the settled scene readings; 0.2.5 is unchanged.
    const h2=JSON.parse(rd('references/fm3-h1-h2-h4-20261110.json')).display.H2.scenes,TYPES=h2.map(x=>x.type);
    const md=(extra={})=>Buffer.from(composeSound(NL,{composer:{...C,reverbChannels:[{channel:'A',type:'Room: Recording Studio A'}]},insert:['multidelay'],
      layout:{row2:['compressor','drive','amp','cab'],row3:['delay','multidelay','reverb']},multidelayTypes:TYPES.map((type,i)=>({channel:'ABCD'[i],type})),
      blockScenes:{multidelay:[0,1,2,3].map(i=>({scene:i+1,channel:'ABCD'[i],bypass:false}))},...extra}).syx);
    const m6=estimateCpu(md()),m5=estimateCpu(md(),{model:'fm3-cpu 0.2.5'});
    h2.forEach((x,i)=>{check(m6.scenes[i].parts.multidelay===MULTIDELAY_TEMPLATE_COSTS[i].costPoints&&!m6.scenes[i].notes.length,'0.2.6 template '+x.type);
      check(Math.abs((m6.scenes[i].percent-m5.scenes[i].percent)-(x.cpuAfter-x.cpuEstimate))<0.06,'0.2.6 residual '+x.type);});
    check(m6.model==='fm3-cpu 0.2.6'&&m6.multidelayTemplatesSha256&&!m5.multidelayTemplatesSha256,'0.2.6 is the default and names its source');
    check(MULTIDELAY_TEMPLATE_COSTS.find(t=>t.type==='Pealing Bells').costPoints===17.9,'Pealing Bells 6.5 + 11.4');
    // Output edits on top keep the Type price (Mix 30 % in H2); a device-default channel keeps its Base Type price.
    check(estimateCpu(md({controls:[{block:'multidelay',channel:'A',param:'MULTITAP_MIX',value:30}]})).scenes[0].parts.multidelay===17.9,'Mix edit keeps the template');
    // An unmeasured Type keeps its Base Type price (Pealing Bells' Algorithm, Quad Series, is 6.5 by T26).
    const other=MULTIDELAY_TEMPLATE_COSTS.length&&estimateCpu(md({multidelayTypes:[{channel:'A',type:'Quad-Tap Delay'}]})).scenes[0].parts.multidelay;
    check(other===5.5,'unmeasured Type keeps the Base Type price: '+other);
    console.log(JSON.stringify({p6a:a.scenes[0].percent,p6b:b.scenes[0].percent,v1s4:v.scenes[3].percent,t31:'insert types',t37:t37.items.filter(x=>x.voices).length,mdTemplates:h2.length}));
  });
});

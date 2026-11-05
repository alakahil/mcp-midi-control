// Regression for fm3-cpu (audit point 7). Offline.
import fs from 'node:fs';
import {estimateCpu,renderCpuText,cpuMeasurements,cpuTypes,qualityDelta} from './fm3-cpu.mjs';
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
// 4. T31 insert-block types: per-type costs, Synth voice 1 with voices 2/3 OFF, Legacy Cab = Dyna-Cab cost.
import('./fm3-sound.mjs').then(({composeSound})=>{
  const NL=rd('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),C={schemaVersion:1,firmware:13,baseProfile:'jb-composer',compressorChannels:[{channel:'A',type:'Optical Compressor'}],name:'CPU T31'};
  const est=b=>estimateCpu(Buffer.from(composeSound(NL,{composer:C,insert:[b],layout:{row2:['compressor','drive','amp','cab'],row3:['delay',b,'reverb']},blockScenes:{[b]:[{scene:1,bypass:false}]}}).syx)).scenes[0];
  const base=estimateCpu(Buffer.from(composeSound(NL,{composer:C,layout:{row2:['compressor','drive','amp','cab'],row3:['delay','reverb']}}).syx)).scenes[0];
  for(const [b,cost] of [['plex',9.5],['megatap',9.5],['tentap',4.5],['resonator',7.5],['ringmod',2.5],['gate',4],['synth',7.5]]){
    const s=est(b);check(s.parts[b]===cost&&!s.notes.some(n=>n.startsWith(b)),'T31 '+b+' '+s.parts[b]);check(Math.abs(s.percent-base.percent-cost)<0.05,'T31 sum '+b);}
  check(base.parts.cab===2.9&&!base.notes.some(n=>/cab/.test(n)),'Dyna-Cab measured');
  console.log(JSON.stringify({p6a:a.scenes[0].percent,p6b:b.scenes[0].percent,v1s4:v.scenes[3].percent,t31:'insert types'}));
});

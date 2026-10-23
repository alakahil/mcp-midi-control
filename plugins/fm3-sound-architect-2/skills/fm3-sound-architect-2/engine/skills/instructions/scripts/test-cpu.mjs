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
console.log(JSON.stringify({p6a:a.scenes[0].percent,p6b:b.scenes[0].percent,v1s4:v.scenes[3].percent}));

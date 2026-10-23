// Regression for fm3-cpu (audit point 7). Offline.
import fs from 'node:fs';
import {estimateCpu,renderCpuText,cpuMeasurements} from './fm3-cpu.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
const rd=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
// 1. subtractive readings are internally consistent and reproduce the measured totals
const A=cpuMeasurements.sessions.A.readings,c=cpuMeasurements.costs;
for(let i=1;i<A.length;i++)check(Math.abs((A[i-1][2]-A[i][2])-c[A[i][1]].cpu)<0.05,'Cost of '+A[i][1]);
check(c.baseline.cpu===A.at(-1)[2],'Baseline');
const a=estimateCpu(rd('examples/FM3_P6_INSERT_A.syx'));
check(a.scenes[0].floorPercent===82.5&&a.scenes[0].exact,'Session A start reproduced exactly in Scene 1');
// 2. B exceeded the limit; Synth is unmeasured, so the floor stays below and says so
const b=estimateCpu(rd('examples/FM3_P6_INSERT_B.syx'));
check(b.scenes[0].unmeasuredFamily.includes('synth')&&!b.scenes[0].exact&&b.scenes[0].floorPercent>70,'B: unmeasured Synth reported');
// 3. Satriani V1 (61 % measured in Scene 4): other types are flagged, the floor is not presented as exact
const v=estimateCpu(rd('examples/SATRIANI_SOAP_ON_A_ROPE.syx'));
check(v.scenes[3].otherType.length>0&&!v.exactAllScenes&&v.scenes[3].floorPercent<=61,'V1 floor below measurement, types flagged');
check(/ALAMPIIR/.test(renderCpuText(v))&&/Amp ja Delay/.test(renderCpuText(v)),'Text states floor and amp-core limit');
console.log(JSON.stringify({sessionA:a.scenes[0].floorPercent,sessionB:b.scenes[0].floorPercent,v1Scene4:v.scenes[3].floorPercent}));

// FM3 Sound Architect: empirical scene edits restricted to the SHA-checked base.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {generate,inspect} from './fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
export function generateScenes(base,spec){
 const check=(v,m)=>{if(!v)throw Error(m)};
 check(spec&&typeof spec==='object'&&!Array.isArray(spec),'Expected object');
 check(Object.keys(spec).every(k=>['name','gainB','bassB','delayScene2','reverbScene1'].includes(k)),'Unsupported field');
 check(spec.delayScene2!==undefined||spec.reverbScene1!==undefined,'Scene change required');
 if(spec.delayScene2!==undefined)check(typeof spec.delayScene2==='boolean','delayScene2 must be boolean (true = engaged)');
 if(spec.reverbScene1!==undefined)check(['A','B'].includes(spec.reverbScene1),'reverbScene1 must be A or B');
 // The restricted amp writer independently checks the original base hash.
 const ampSpec={name:spec.name,gainB:spec.gainB??5};if(spec.bassB!==undefined)ampSpec.bassB=spec.bassB;
 const initial=generate(base,ampSpec),before=inspect(initial.syx),body=before.raw.body.slice();
 check(body[7374]===1&&body[7375]===0,'Unexpected base Delay scene word');
 const reverb=before.decoded.blocks.find(b=>b.block==='Reverb');
 check(reverb?.offset===9530&&body[9528]===0&&body[9529]===0,'Unexpected Reverb anchor');
 if(spec.delayScene2!==undefined)body[7374]=spec.delayScene2?0:1;
 if(spec.reverbScene1!==undefined)body[9528]=spec.reverbScene1==='B'?1:0;
 const syx=Buffer.from(reencodeDumpFromRawPatch(initial.syx,reencodeRawPatch(before.raw.rawPatch,body))),after=inspect(syx);
 check(Buffer.from(body).equals(Buffer.from(after.raw.body)),'Body verification failed');
 const diff=[];for(let i=0;i<body.length;i++)if(before.raw.body[i]!==after.raw.body[i])diff.push(i);
 check(diff.every(i=>[7374,9528].includes(i)),'Unexpected collateral scene edit');
 check(after.decoded.blocks.find(b=>b.block==='Reverb').scene_channels[0]===(spec.reverbScene1??'A'),'Reverb readback failed');
 check(after.decoded.preset_name===spec.name,'Name mismatch');
 const hash=createHash('sha256').update(syx).digest('hex');
 const report={prototype:'scenes-0.1.0',spec:{...ampSpec,...spec},sha256:hash,sceneBodyDiff:diff,bodyBytes:body.length,checks:'frame checksums, CRC, footer, exact body, Reverb decode',delayEvidence:'independent S2_Delay_Bypass/Engaged exports; broad block decoder omits this Delay record',firmwareTarget:'13 (user confirmed)',hardwareImport:'pending for this scene candidate',audio:'unconfirmed'};
 const txt=['FM3 SOUND ARCHITECT — STSEENIDE ARENDUSKATSE',`Nimi: ${spec.name}`,'Siht: FM3 Mk II Turbo, kasutaja firmware 13.',`Amp B Gain: ${ampSpec.gainB.toFixed(2)}; mõjutab Scene 2 ja 6.`,...(ampSpec.bassB!==undefined?[`Amp B Bass: ${ampSpec.bassB.toFixed(2)}`]:[]),`Scene 1 Reverb kanal: ${spec.reverbScene1??'A'}.`,`Scene 2 Delay: ${spec.delayScene2===true?'sisse lülitatud':'bypass'}.`,'Ülejäänud lahtipakitud sisu säilitati baasist; muudatused piirduvad nimetatud parameetritega.','Cab/IR, routing, muud efektid, lülitid ja expression pärinevad kasutaja Baaspreset.syx-ist.','Failikontrollid läbitud; selle uue kombinatsiooni import ja heli ootavad kasutaja kontrolli.','','Säilita senine töö. Impordi FM3-Editis olemasolevat presetikohta üle kirjutamata.','Kontrolli Scene 1 Reverb kanalit B; Scene 2 Delay aktiivsust ja Amp B Gain 5.00.','Kuula madalal helitugevusel. Ekspordi preset tagasi ning lisa võrdluseks vestlusse.',`SHA-256: ${hash}`].join('\n')+'\n';
 return {syx,txt,report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [base,spec,stem]=process.argv.slice(2);const r=generateScenes(fs.readFileSync(base),JSON.parse(fs.readFileSync(spec,'utf8')));fs.mkdirSync(path.dirname(stem),{recursive:true});for(const [ext,data] of [['.syx',r.syx],['.txt',r.txt],['.validation.json',JSON.stringify(r.report,null,2)]])fs.writeFileSync(stem+ext,data,{flag:'wx'});console.log(JSON.stringify(r.report));}catch(e){console.error(e.message);process.exitCode=1;}
}

import {findParam,decodeValue} from './fm3-table-encoder.mjs';
import {volumeUnits} from './fm3-volume-policy.mjs';
const fmt=v=>typeof v==='number'?String(Number(v.toFixed(4))):String(v);
export function volumeChannelText(state){
 if(state.typeRaw!==0&&state.typeRaw!==1)throw Error('Unsupported Volume TYPE');
 const visible=state.typeRaw===1?[9,10,11,12,13,1,2,6,7,8]:[9,0,1,2,4,5,6,7,8];
 return `Volume/Pan 1 kanal ${state.channel}: `+visible.map(pid=>{const p=findParam('volpan',pid);return `${p.name.replace('VOLUME_','')}=${fmt(decodeValue(p,state.words[pid]))}${volumeUnits[p.name]?' '+volumeUnits[p.name]:''}`;}).join('; ')+'.';
}

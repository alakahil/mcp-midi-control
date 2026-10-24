// Read-only FM3 (model 0x11) request frames for the probe/value-check packs, without the
// fractal-midi build: byte-identical to buildRequestGridLayout / buildBlockBulkReadPoll /
// buildRequestPresetDump / buildRequestEditBufferDump / buildRequestCurrentTypeName
// (checked against those builders in tools/fm3/test-read-requests.mjs when dist exists).
const MODEL=0x11;
const env=(fn,payload)=>{const f=[0xf0,0x00,0x01,0x74,MODEL,fn,...payload];return [...f,f.reduce((a,b)=>a^b,0)&0x7f,0xf7];};
const s14=v=>[v&0x7f,(v>>7)&0x7f];
export const gridRequest=()=>env(0x01,[0x2e,0x00,...Array(13).fill(0)]);
export const bulkReadPoll=eid=>env(0x1f,s14(eid));
export const storedDumpRequest=index=>env(0x03,[(index>>7)&0x7f,index&0x7f,0x00]);
export const editBufferDumpRequest=()=>env(0x43,[]);
export const displayRequest=(eid,pid)=>env(0x01,[0x1f,0x00,...s14(eid),...s14(pid),...Array(9).fill(0)]);
// Label read for one value: the display read with float32(index) in the value field (5 septets, LSB
// first, = encode5SeptetFloat32 of the gen-3 SET frame; sub-action 1F 00 is not a SET sub-action).
// On FM3 fw 13 the reply to a type parameter carries the label of the value in the request
// (references/fm3-read-probe-20261023.json); index 0 is byte-identical to displayRequest.
export const floatSeptets=v=>{const d=new DataView(new ArrayBuffer(4));d.setFloat32(0,v,true);const u=d.getUint32(0,true);return [0,7,14,21,28].map(s=>(u>>>s)&0x7f);};
const septetsFloat=b=>{const u=b.reduce((a,x,i)=>a+((x&0x7f)*2**(7*i)),0)>>>0,d=new DataView(new ArrayBuffer(4));d.setUint32(0,u,true);return d.getFloat32(0,true);};
export const labelRequest=(eid,pid,index)=>{if(!(Number.isInteger(index)&&index>=0&&index<=4095))throw Error('label index must be 0..4095');
  return env(0x01,[0x1f,0x00,...s14(eid),...s14(pid),...floatSeptets(index),0,0,0,0]);};
// 7-to-8 bit unpacking of the display string (= fractal-midi unpackValue / unpackValueChunked).
const unpack=(w,n)=>{const o=new Array(n).fill(0);for(let i=0;i<w.length;i++){const k=i+1,b=w[i]&0x7f;
  if(i>0&&i-1<n)o[i-1]|=((~(0x7f>>k)&b)>>(8-k))&0xff;if(i<n)o[i]=(b<<k)&0xff;}return o;};
const unpackChunked=(w,n)=>{const o=[];let r=0,p=0;while(r<n){const c=Math.min(7,n-r),cw=c===7?8:c+1;o.push(...unpack(w.slice(p,p+cw),c));r+=c;p+=cw;}return o;};
// Parse an fn=0x01 sub 1F reply: {effectId, paramId, value, text} (text '' for the short knob reply), else null.
export function parseLabelReply(frame){
  const f=[...frame];if(f.length<23||f[0]!==0xf0||f[4]!==MODEL||f[5]!==0x01||f.at(-1)!==0xf7)return null;
  const p=f.slice(6,-2);if(p[0]!==0x1f||p[1]!==0)return null;
  const n=(p[13]&0x7f)|((p[14]&0x7f)<<7);let t=n?unpackChunked(p.slice(15),n):[];
  while(t.length&&(t.at(-1)===0||t.at(-1)===0x20))t.pop();
  return {effectId:p[2]|(p[3]<<7),paramId:p[4]|(p[5]<<7),value:septetsFloat(p.slice(6,11)),text:String.fromCharCode(...t)};
}

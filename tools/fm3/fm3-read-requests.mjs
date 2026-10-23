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

// Independent graph reachability, exhaustive adjacent-column masks, and row permutation.
import assert from 'node:assert/strict';
import {planCells} from './fm3-grid.mjs';
import {decodeGridMask} from './fm3-grid-audit.mjs';
const rows=()=>Array.from({length:4},()=>Array(12).fill(null));
const role=v=>v.startsWith('in')?'source':v.startsWith('out')?'sink':v==='midi'?'standalone':'block';
const bits=m=>[0,1,2,3].filter(i=>Math.floor(m/(2**i))%2===1);
let masks=0,matrix=0,accepted=0,rejected=0,graphs=0,permutations=0;
for(let raw=0;raw<65536;raw++){
 const d=decodeGridMask(raw);
 assert.equal(d.raw,raw);assert.equal(d.knownMask,raw%16);assert.equal(d.unknownMask,raw-raw%16);
 assert.deepEqual(d.inputRows,bits(raw%16).map(i=>i+1));masks++;
}
for(const bad of [-1,65536,0.1,NaN,Infinity,'2',null,true,{},[]])assert.throws(()=>decodeGridMask(bad),/uint16/);
// All source occupancies and target masks, in each row at each of the eleven column boundaries.
// Other sinks receive all occupied sources so an unused source does not obscure the target test.
for(let col=1;col<12;col++)for(let occ=0;occ<16;occ++)for(let mask=0;mask<16;mask++)for(let target=0;target<4;target++){
 const r=rows(),links=[];
 for(let i=0;i<4;i++){
  if(bits(occ).includes(i))r[i][col-1]='in'+i;
  r[i][col]='out'+i;links.push({row:i+1,col:col+1,from:bits(i===target?mask:occ).map(k=>k+1)});
 }
 const valid=mask!==0&&bits(mask).every(i=>bits(occ).includes(i));matrix++;
 if(valid){const result=planCells((i,c)=>r[i][c],links,role);assert.equal(result.find(x=>x.r===target&&x.c===col).mask,mask);accepted++;}
 else{assert.throws(()=>planCells((i,c)=>r[i][c],links,role));rejected++;}
}
// Oracle deliberately traverses an adjacency list with BFS, not the planner's column sweeps.
function oracle(r,links){
 const all=[],edges=new Map(),reverse=new Map();
 for(let row=0;row<4;row++)for(let col=0;col<12;col++)if(r[row][col]){const id=row*12+col;all.push(id);edges.set(id,[]);reverse.set(id,[]);}
 for(const l of links)for(const row of l.from){const from=(row-1)*12+l.col-2,to=(l.row-1)*12+l.col-1;edges.get(from).push(to);reverse.get(to).push(from);}
 const traverse=(seeds,map)=>{const seen=new Set(seeds),queue=[...seeds];while(queue.length)for(const k of map.get(queue.shift()))if(!seen.has(k)){seen.add(k);queue.push(k);}return seen;};
 const sources=all.filter(i=>role(r[Math.floor(i/12)][i%12])==='source'),sinks=all.filter(i=>role(r[Math.floor(i/12)][i%12])==='sink');
 const a=traverse(sources,edges),b=traverse(sinks,reverse);
 return all.every(i=>a.has(i)&&b.has(i));
}
let seed=0x5a0325;const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const perms=[];function perm(a,rest){if(!rest.length)perms.push(a);else for(const n of rest)perm([...a,n],rest.filter(x=>x!==n));}perm([],[0,1,2,3]);
for(let n=0;n<512;n++){
 const r=rows(),links=[],cols=3+rnd(10);
 for(let c=0;c<cols;c++)for(let row=0;row<4;row++){
  r[row][c]=c===0?'in'+row:c===cols-1?'out'+row:'node'+row+'_'+c;
  if(c)links.push({row:row+1,col:c+1,from:bits(1+rnd(15)).map(i=>i+1)});
 }
 const valid=oracle(r,links);let result;
 if(valid){result=planCells((i,c)=>r[i][c],links,role);for(const x of result.filter(x=>x.c))assert.deepEqual([...x.ins].sort(),links.find(l=>l.row===x.r+1&&l.col===x.c+1).from.map(i=>i-1));}
 else assert.throws(()=>planCells((i,c)=>r[i][c],links,role));graphs++;
 if(n<16)for(const p of perms){
  const rr=rows();for(let i=0;i<4;i++)rr[p[i]]=r[i];
  const ll=links.map(l=>({row:p[l.row-1]+1,col:l.col,from:l.from.map(i=>p[i-1]+1)}));
  assert.equal(oracle(rr,ll),valid);
  if(valid){const got=planCells((i,c)=>rr[i][c],ll,role);for(const x of result){const y=got.find(t=>t.r===p[x.r]&&t.c===x.c);assert.deepEqual([...y.ins].sort(),x.ins.map(i=>p[i]).sort());}}
  else assert.throws(()=>planCells((i,c)=>rr[i][c],ll,role));permutations++;
 }
}
// An adjacent standalone MIDI block never inherits or provides audio, in every row.
for(let row=0;row<4;row++)for(let c=2;c<12;c++){
 const r=rows();r[row][c-2]='in';r[row][c-1]='out';r[row][c]='midi';
 const a=planCells((i,j)=>r[i][j],[],role);assert.equal(a.find(x=>x.v==='midi').mask,0);
 assert.throws(()=>planCells((i,j)=>r[i][j],[{row:row+1,col:c+1,from:[row+1]}],role),/takes no input/);
}
console.log(JSON.stringify({passed:true,uint16Masks:masks,adjacentColumnCases:matrix,accepted,rejected,bfsOracleGraphs:graphs,rowPermutations:permutations,standalonePlacements:40,deviceIO:false}));

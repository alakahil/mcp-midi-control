// Minimal JSON Schema (2020-12 subset) validator for the bundled spec schemas. Offline; no dependencies.
// Covers exactly the keywords fm3-sound.schema.json and fm3-spec.schema.json use; an unknown keyword throws,
// so a schema change cannot silently skip a rule. $ref resolves sibling schema files by name.
import fs from 'node:fs';
const KNOWN=new Set(['$schema','$ref','title','description','type','enum','const','properties','required','additionalProperties','items','minItems','maxItems','uniqueItems',
  'minimum','maximum','minLength','maxLength','pattern','minProperties','oneOf','anyOf','allOf','not','if','then','contains','minContains','maxContains','dependentRequired']);
const load=name=>JSON.parse(fs.readFileSync(new URL('./'+name,import.meta.url)));
const typeOk=(t,v)=>t==='object'?v!==null&&typeof v==='object'&&!Array.isArray(v):t==='array'?Array.isArray(v):t==='integer'?Number.isInteger(v):t==='number'?typeof v==='number'&&Number.isFinite(v):t==='null'?v===null:typeof v===t;
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function errors(s,v,path,out){
  if(s===true)return;if(s===false){out.push(path+': not allowed');return;}
  for(const k of Object.keys(s))if(!KNOWN.has(k))throw Error('schema keyword not supported by the checker: '+k);
  if(s.$ref){errors(load(s.$ref),v,path,out);}
  if(s.type&&!(Array.isArray(s.type)?s.type.some(t=>typeOk(t,v)):typeOk(s.type,v))){out.push(`${path}: expected ${s.type}`);return;}
  if(s.enum&&!s.enum.some(x=>eq(x,v)))out.push(`${path}: not one of the allowed values`);
  if('const' in s&&!eq(s.const,v))out.push(`${path}: must be ${JSON.stringify(s.const)}`);
  if(typeof v==='number'){if(s.minimum!==undefined&&v<s.minimum)out.push(`${path}: below ${s.minimum}`);if(s.maximum!==undefined&&v>s.maximum)out.push(`${path}: above ${s.maximum}`);}
  if(typeof v==='string'){if(s.minLength!==undefined&&v.length<s.minLength)out.push(path+': too short');if(s.maxLength!==undefined&&v.length>s.maxLength)out.push(path+': too long');
    if(s.pattern&&!new RegExp(s.pattern,'u').test(v))out.push(path+': pattern');}
  if(typeOk('object',v)){
    for(const r of s.required??[])if(!Object.hasOwn(v,r))out.push(`${path}: missing ${r}`);
    if(s.minProperties!==undefined&&Object.keys(v).length<s.minProperties)out.push(path+': too few properties');
    for(const [k,x] of Object.entries(v)){if(s.properties&&Object.hasOwn(s.properties,k))errors(s.properties[k],x,path+'.'+k,out);
      else if(s.additionalProperties!==undefined&&!(s.properties&&Object.hasOwn(s.properties,k)))errors(s.additionalProperties,x,path+'.'+k,out);}
    for(const [k,deps] of Object.entries(s.dependentRequired??{}))if(Object.hasOwn(v,k))for(const d of deps)if(!Object.hasOwn(v,d))out.push(`${path}: ${k} requires ${d}`);
  }
  if(Array.isArray(v)){
    if(s.minItems!==undefined&&v.length<s.minItems)out.push(path+': too few items');if(s.maxItems!==undefined&&v.length>s.maxItems)out.push(path+': too many items');
    if(s.uniqueItems&&new Set(v.map(x=>JSON.stringify(x))).size!==v.length)out.push(path+': duplicate items');
    if(s.items)v.forEach((x,i)=>errors(s.items,x,`${path}[${i}]`,out));
    if(s.contains){const n=v.filter(x=>valid(s.contains,x)).length;if(n<(s.minContains??1))out.push(path+': contains');if(s.maxContains!==undefined&&n>s.maxContains)out.push(path+': maxContains');}
  }
  for(const x of s.allOf??[])errors(x,v,path,out);
  if(s.anyOf&&!s.anyOf.some(x=>valid(x,v)))out.push(path+': no anyOf branch matches');
  if(s.oneOf&&s.oneOf.filter(x=>valid(x,v)).length!==1)out.push(path+': must match exactly one oneOf branch');
  if(s.not&&valid(s.not,v))out.push(path+': matches a forbidden form');
  if(s.if&&valid(s.if,v)&&s.then)errors(s.then,v,path,out);
}
const valid=(s,v)=>{const o=[];errors(s,v,'$',o);return o.length===0;};
export function checkSchema(name,value){const out=[];errors(load(name),value,'$',out);return out;}

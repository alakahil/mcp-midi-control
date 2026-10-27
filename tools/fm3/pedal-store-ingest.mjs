// Receipt for the 2026-10-26 Volume pedal STORE/reload check (FM3_PEDAL_STORE.py, test T2). Offline.
// The pack is rebuilt to the manifest the device run used. The user read the Volume knob in FM3-Edit at
// five pedal positions, STOREd the preset himself, reloaded it and read again; the script then read the
// stored location (fn=0x03) and the stored body is compared with the generated one word by word.
// Usage: node tools/fm3/pedal-store-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
// Raw device results live outside the packaged plugin (package entry budget); receipts stay in references/.
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-10-26/');
const REF=path.join(ENG,'references/');
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=path.join(RAW,'fm3-pedal-store-20261026-results.json'),loadFile=path.join(RAW,'fm3-pedal-store-20261026-load.json');
const res=JSON.parse(fs.readFileSync(file,'utf8')),load=JSON.parse(fs.readFileSync(loadFile,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-pst-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/pedal-store-build.mjs'),tmp],{stdio:'ignore'});
const m=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8')),ref=fs.readFileSync(path.join(tmp,m.preset.file));
for(const r of [res,load])assert.equal(sha(fs.readFileSync(path.join(tmp,'manifest.json'))),r.packSha256,'pack rebuilt identically');
assert.ok(load.userConfirmedName,'edit-buffer load confirmed');
const num=s=>{const v=Number(String(s).trim().replace(',','.'));assert.ok(Number.isFinite(v),'reading '+s);return v;};
const ids=m.positions.map(p=>p.id),before=Object.fromEntries(ids.map(k=>[k,num(res.beforeStore[k])])),after=Object.fromEntries(ids.map(k=>[k,num(res.afterReload[k])]));
assert.deepEqual(before,after,'same readings before STORE and after reload');
assert.ok(ids.every((k,i)=>i===0||before[k]>before[ids[i-1]]),'Volume rises from heel to toe');
assert.ok(/^j/i.test(res.modifierAfterReload),'External 1 modifier mark after reload');
assert.equal(res.index,res.shownLocation-1,'Display Offset 1');
const dev=Buffer.concat(res.storedDumpFrames.map(h=>Buffer.from(h,'hex'))),a=inspectStructure(ref),b=inspectStructure(dev);
assert.ok(b.raw.crcValid&&b.decoded.preset_name===m.confirmName,'stored dump: CRC valid, same name');
const A=Buffer.from(a.raw.body),B=Buffer.from(b.raw.body);assert.equal(A.length,B.length);
const diff=[];for(let o=0;o<A.length;o+=2){const x=A.readUInt16LE(o),y=B.readUInt16LE(o);if(x!==y)diff.push({byteOffset:o,generated:x,stored:y});}
assert.deepEqual(diff.map(d=>d.byteOffset),[0],'only body word 0 (selected scene) differs');
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-26',
  preset:{name:m.confirmName,binding:'0.3.17 volumePedal: External 1 -> Volume/Pan 1 Gain, Channels ALL',sha256:m.preset.sha256},
  pedal:'Valeton expression pedal on External 1 (global setting unchanged)',
  method:'Edit-buffer load (7F 00) by the script; the user read the Volume knob in FM3-Edit at heel / about 25 / 50 / 75 % / toe, STOREd the preset himself, selected another preset and back, and read again. The script then read the stored location with fn=0x03 (read-only). The script never stored or set anything.',
  readings:{units:'Volume (0..10) as FM3-Edit shows it; intermediate pedal positions are approximate',beforeStore:before,afterReload:after},
  modifierAfterReload:true,storedLocation:{shown:res.shownLocation,index:res.index},
  storedVsGenerated:{bodyWords:A.length/2,differingWords:diff.map(d=>({...d,meaning:'selected scene (body word 0): stored with the scene active at STORE time'}))},
  findings:['The volumePedal binding survives STORE and reload: modifier mark on Volume, identical readings (heel 0.00, toe 10.00) before and after.',
    'The stored preset equals the generated one word for word (6485 body words) except body word 0, the selected scene, which the FM3 stores as the scene active at STORE time.',
    'The readings rise monotonically heel -> toe (0.00, 1.94, 5.00, 7.85, 10.00 at approximate pedal positions); the gain curve is not determined because the pedal positions are estimates.'],
  notMeasured:['exact pedal positions / the Volume taper','audio level','other modifier sources or ranges'],
  resultsSha256:sha(fs.readFileSync(file)),loadSha256:sha(fs.readFileSync(loadFile))};
const target=path.join(REF,'fm3-pedal-store-20261026.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'pedal store receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});console.log(JSON.stringify({readings:before,differingWords:diff.length,storedLocation:res.shownLocation}));

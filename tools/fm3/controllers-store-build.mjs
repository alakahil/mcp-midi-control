// Prepare ONLY the three outstanding T34 source STORE tests. Offline builder; never touches a port.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {verifyPresetOutputs}=await import(path.join(E,'scripts/fm3-preset.mjs'));
const {parsePresetDump}=await import(path.join(E,'scripts/fm3-codec.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const historical=JSON.parse(fs.readFileSync(path.join(E,'references/fm3-t34-controllers-sources-20261107.json')));
assert.equal(process.versions.node.split('.')[0],'22','Use Node 22');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: controllers-store-build.mjs OUT_DIR');
fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Use an empty output directory');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-k1-'));
const cases=[['B','SCENECTRL','Scene Controller 1','Stseenid 1-4 kasvavad vaiksest valjemaks.'],['C','SEQ','Sequencer','Pikk noot katkeb rütmiliselt umbes kaks korda sekundis.'],['D','ADSR','ADSR 1','Iga eraldi löödud noot paisub sisse umbes 0,8 sekundi jooksul.']];
const packs=[];
try{
 execFileSync(process.execPath,[path.join(ROOT,'tools/fm3/t34-controllers-sources-build.mjs'),tmp],{stdio:'pipe'});
 for(const [id,suffix,source,expect] of cases){
  const oldDir=path.join(tmp,`FM3_T34${id}_${suffix}`),dir=`K1_${id}`,dest=path.join(out,dir);
  fs.cpSync(oldDir,dest,{recursive:true});
  const old=JSON.parse(fs.readFileSync(path.join(dest,'manifest.json')));
  const stem=path.join(dest,old.preset.file.replace(/\.syx$/,''));verifyPresetOutputs(stem);
  const bytes=fs.readFileSync(stem+'.syx');assert.equal(sha(bytes),old.preset.sha256);
  assert.equal(sha(bytes),historical.files[id.toLowerCase()].preset.sha256,'preserve the exact measured T34 preset');
  assert.deepEqual([...parsePresetDump(bytes,0,17).headerPayload],[127,0,0,64,0],'edit buffer only');
  const manifest={...old,kind:'fm3-bind-store',test:`K1-${id}-STORE`,date:'2026-11-08',
   originalTest:`T34${id}`,originalPresetSha256:old.preset.sha256,
   purpose:`Only the missing STORE/reload evidence for ${source}; T34 already confirmed edit-buffer behavior.`,
   storeLocationPolicy:'User chooses an expendable or backed-up location. No fixed slot is assumed and no script performs STORE.',
   checks:[{id:'source',text:`Mis on Volume/Pan -> Volume modifikaatori Source? Oodatud: ${source}. Kui ei kontrollinud, kirjuta -.`},
    {id:'behavior',text:`${expect} Kas see käitumine vastab? Kirjuta jah / ei / mõõtmata.`}],
   method:'Preset bytes are the already measured T34 source preset. --load sends only to the edit buffer. User STOREs, selects another preset and returns. --verify asks observations and reads the user-reported location; no automatic STORE or SET.'};
  fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  packs.push({id,dir,source,expectedBehavior:expect,preset:manifest.preset,manifestSha256:sha(fs.readFileSync(path.join(dest,'manifest.json'))),fourFilesVerified:true,hardwareStoreTested:false});
 }
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
const runner=`#!/bin/bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if [ "\${1:-}" = "--self-test" ]; then
  for part in K1_B K1_C K1_D; do python3 "$part/FM3_BIND_STORE.py" --self-test; done
  exit 0
fi
session="SESSION_$(date +%Y%m%dT%H%M%S)"
mkdir -- "$session"
echo 'Sulge FM3-Edit ja Fractal-Bot. STORE-i teeb kasutaja FM3-l; skript ei salvesta.'
echo 'Vali enda testikoht, mille sisu võib asendada või on varundatud. Ühte kohta võib korduskasutada alles pärast eelneva osa tagasilugemist.'
for part in K1_B K1_C K1_D; do
  echo "Katse $part"
  python3 "$part/FM3_BIND_STORE.py" --load --pack "$part" --session "$session/$part"
  echo 'Kuula ja kontrolli Source. Seejärel STORE FM3-l, vali teine preset ja tule salvestatud presetile tagasi. Kuula uuesti.'
  echo 'Kui vaatasid FM3-Editit, sulge see nüüd. Alles siis kirjuta STORE; muu vastus lõpetab.'
  read -r answer
  [ "$answer" = STORE ] || exit 1
  python3 "$part/FM3_BIND_STORE.py" --verify --pack "$part" --session "$session/$part"
done
python3 - "$session" <<'PY'
import shutil, sys
shutil.make_archive(sys.argv[1], 'zip', '.', sys.argv[1])
print('Saada vestlusesse fail ' + sys.argv[1] + '.zip')
PY
`;
fs.writeFileSync(path.join(out,'ALUSTA.command'),runner,{mode:0o755});
fs.writeFileSync(path.join(out,'LOE_MIND.txt'),[
 'FM3 K1: kolme Controllersi allika STORE-kontroll (ette valmistatud 08.11.2026)',
 '', 'See pakk ei sisalda uut seadmetõendit. T34 allikapresetite SYX-baidid on säilitatud muutmata.',
 'Kontrollime ainult veel puudu olevat salvestamist: Scene Controller 1, Sequencer, ADSR 1.',
 'Vaja: FM3 FW13, USB, Maci Python 3. Node ei ole kasutaja arvutis vajalik.',
 '', '1. Paki kaust lahti. Sulge FM3-Edit ja Fractal-Bot.',
 '2. Ava Terminal selles kaustas ja käivita: bash ALUSTA.command',
 '3. Igas osas laaditakse preset edit bufferisse. Kontrolli nime, allikat ja juhendis kirjeldatud heli.',
 '4. Salvesta FM3-l enda valitud testikohta. Ära kasuta asukohta, mille sisu vajad ja pole varundanud.',
 '5. Vali teine preset ja tule tagasi; kontrolli allikat ja heli uuesti. Sulge FM3-Edit enne jätkamist.',
 '6. Kirjuta Terminali STORE ja vasta enne/pärast küsimustele ning asukoha numbrile.',
 '7. Skript loeb salvestise tagasi; pärast kolme osa tekib SESSION_....zip. Saada see üks ZIP vestlusesse.',
 '', 'Kohaliku skripti kontroll ilma seadmeta: bash ALUSTA.command --self-test',
 'Automaatne andmevõrdlus tehakse arenduskeskkonnas käsuga:',
 'node tools/fm3/controllers-store-compare.mjs PAKI_KAUST SESSION_KAUST',
 'Võrdlus eristab andmete säilimist ja kasutaja kuuldud/nähtud tulemust. Mõõtmata vastus ei muutu edukaks katseks.',
 '',...packs.map(p=>`${p.dir}: ${p.source}. ${p.expectedBehavior}`),''].join('\n'));
const files=[];function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else files.push({path:path.relative(out,p),sha256:sha(fs.readFileSync(p))});}}walk(out);
const summary={schemaVersion:1,kind:'fm3-controllers-store-preparation',date:'2026-11-08',packs,files,deviceIO:false,newHardwareMeasurements:false};
fs.writeFileSync(path.join(out,'pack.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({passed:true,presets:packs.length,verifiedFiles:12,deviceIO:false}));

#!/usr/bin/env python3
"""T48A-F per-preset Effect Bypass footswitch check (blocks mapped from the FM3-Edit display). Uses the unchanged guarded collectors; STORE is manual."""
import argparse, hashlib, json, shutil, sys, tempfile
from pathlib import Path
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import FM3_CPU_SWEEP as S
import FM3_SHOT_LOAD as Q
import FM3_BIND_STORE as B
CASES = ['T48A', 'T48B', 'T48C', 'T48D', 'T48E', 'T48F']

def preflight():
    pack = json.loads((ROOT / 'pack.json').read_text())
    S.check(pack['kind'] == 'fm3-t48-preparation', 'Wrong pack')
    S.check([p['id'] for p in pack['packs']] == CASES, 'Wrong cases')
    for f in pack['files']:
        p = (ROOT / f['path']).resolve()
        S.check(ROOT in p.parents and p.is_file(), 'Invalid/missing pack file')
        S.check(hashlib.sha256(p.read_bytes()).hexdigest() == f['sha256'], 'Pack changed: ' + f['path'])
    for p in pack['packs']:
        Q.preflight(ROOT / p['id'] / 'shot', p['id'])
        d = ROOT / p['id'] / 'store'
        mb = (d / 'manifest.json').read_bytes(); m = json.loads(mb)
        S.check(m['kind'] == 'fm3-bind-store', 'Wrong STORE manifest')
        S.check(hashlib.sha256(mb).hexdigest() == p['storeManifestSha256'], 'STORE manifest changed')
        data = (d / m['preset']['file']).read_bytes()
        S.check(hashlib.sha256(data).hexdigest() == m['preset']['sha256'] == p['presetSha256'], 'STORE preset changed')
        S.dump_frames(data)
    Q.self_test(); B.self_test()
    print('Eelkontroll läbitud. USB-porti ei avatud.')
    return pack

def hold_probe(dest, port_path):
    """Hold probe: the user assigns a Hold function in FM3-Edit and stores by hand; one more read-only stored dump."""
    print('\nHOLD-proov (ainult T48A). Ava FM3-Edit -> FC Per-Prst, vali PP#1 ja määra Hold Function: Scene, Select, Scene 2.')
    print('Claude pildistab kaardi. FM3-Editi Save-nuppu ei vajutata. Sulge FM3-Edit, tee FM3-l käsitsi STORE samasse kohta.')
    print('Proovi: lüliti 1 lühike vajutus = Cab 1 bypass, pikk hoidmine = stseen 2.')
    ans = input('Kui STORE on tehtud ja FM3-Edit suletud, kirjuta HOLD (vahelejätmiseks Enter): ').strip()
    if ans != 'HOLD':
        S.write_json_new(dest / 'hold-probe.json', {'kind': 'fm3-t48-hold-probe', 'skipped': True}); return
    res = {'kind': 'fm3-t48-hold-probe', 'skipped': False,
           'holdWorked': input('  Kas pikk hoidmine valis stseeni 2 ja lühike vajutus lülitas Cab 1? Kirjelda > ').strip()}
    loc = input('  Mis asukohta (1-512) salvestasid? > ').strip()
    S.check(loc.isdigit() and 1 <= int(loc) <= 512, 'Asukoht peab olema 1..512')
    index = int(loc) - 1; res['shownLocation'] = int(loc); res['index'] = index
    req = B.stored_request(index); S.check(B.read_only_shape(req) == 'storedDump', 'stored dump request shape')
    port = S.Port(port_path)
    try:
        B.require_fm3(port, port_path)
        port.framer.frames.clear(); B.send_read(port, req, 'storedDump'); res['storedDumpFrames'] = B.collect(port, quiet=0.4, max_wait=6.0)
    finally:
        port.close()
    S.write_json_new(dest / 'hold-probe.json', res)
    print('Hold-proovi salvestis loetud (%d kaadrit).' % len(res['storedDumpFrames']))

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--preflight', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--case', choices=CASES)
    ap.add_argument('--port')
    a = ap.parse_args(); pack = preflight()
    if a.preflight or a.self_test: return
    print('Laadimine asendab salvestamata tööpuhvri. Säilita vajalik töö.')
    print('Sulge FM3-Edit ja Fractal-Bot. STORE-i, stseeni- ja presetivahetused teed sina.')
    print('Vali enda varundatud või kasutuseta testikoht. Üldseadeid ei muudeta.')
    S.check(input('Alustamiseks kirjuta LAADI: ').strip() == 'LAADI', 'Katse katkestatud')
    session = Path(tempfile.mkdtemp(prefix='SESSION_', dir=ROOT))
    try:
        for p in pack['packs']:
            if a.case and p['id'] != a.case: continue
            case = p['id']; dest = session / case
            print('\n' + case + ': ' + p['expected'])
            port = a.port or S.find_port()
            Q.run(ROOT / case / 'shot', dest, case, port)
            ans = input('Kas FM3-l on nimi "' + p['name'] + '"? j/e: ').strip().lower()
            S.write_json_new(dest / 'load-confirmation.json', {'kind':'fm3-audit-load-confirmation',
                'presetSha256':p['presetSha256'], 'userConfirmedName':ans == 'j'})
            S.check(ans == 'j', 'Vale nimi; ära salvesta')
            print((ROOT / case / 'VAATLUSED.txt').read_text())
            if p.get('loadOnly'):
                print('Ava FM3-Edit -> FC Per-Prst. Claude pildistab PP-kaardid. STORE-i EI tehta.')
                S.check(input('Kui Claude on pildid teinud ja FM3-Edit on suletud, kirjuta VALMIS: ').strip() == 'VALMIS', 'Katse peatatud')
                continue
            print('Ava FM3-Edit; Claude pildistab FC Per-Prst lehe. Vajuta FM3 jalglüliteid päris kitarriga ENNE STORE-i.')
            print('Seejärel STORE sinu valitud kohta, vali teine preset, tule tagasi ning vajuta lüliteid uuesti.')
            print('Sulge FM3-Edit/Fractal-Bot enne jätkamist. Ära sulge Terminali.')
            S.check(input('Kui ring on tehtud ja rakendused suletud, kirjuta STORE: ').strip() == 'STORE', 'Katse peatatud')
            B.run('verify', ROOT / case / 'store', dest, port)
            if case == 'T48A': hold_probe(dest, port)
            print('Toorvastus kogutud. Tervikpreseti sisuline võrdlus tehakse eraldi; see ei ole veel läbimise otsus.')
    finally:
        archive = shutil.make_archive(str(session), 'zip', ROOT, session.name)
        print('Saada vestlusesse tulemuste ZIP: ' + archive)

if __name__ == '__main__': main()

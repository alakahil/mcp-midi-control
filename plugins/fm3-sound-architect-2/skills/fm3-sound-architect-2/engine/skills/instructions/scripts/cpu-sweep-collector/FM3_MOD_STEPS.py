#!/usr/bin/env python3
"""FM3 modifier field step check (test T12). macOS/Linux, POSIX serial, no pyserial.

Loads one generated preset (one modifier binding) into the edit buffer (0x77 header 7F 00 00 40 00, SHA-256
checked). Then, step by step, the USER changes ONE field of that binding on the FM3 front panel (Modifier menu,
Modify page), types the value the screen shows, and STOREs the preset to the SAME test location each time.
After each STORE the script reads that location with the read-only stored-dump request (fn=0x03 hi lo 00) and
saves the frames; the changed words are found offline by comparing consecutive steps.
The script never stores and never sets. Results are saved after every step, so a stopped run resumes.
Display Offset 1: shown location N is index N-1.

Usage:
  python3 FM3_MOD_STEPS.py --check-port [--port /dev/cu.usbmodemXXXX]
  python3 FM3_MOD_STEPS.py --pack DIR --session DIR [--port ...]
  python3 FM3_MOD_STEPS.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
from FM3_READ_PROBE import read_only_shape, collect
from FM3_BIND_STORE import stored_request, require_fm3, check_port

def read_location(port, path, index):
    req = stored_request(index); S.check(read_only_shape(req) == 'storedDump', 'stored dump request shape')
    for attempt in range(3):
        port.framer.frames.clear(); port.write(req); frames = collect(port, quiet=0.4, max_wait=6.0)
        kinds = [bytes.fromhex(h)[5] for h in frames if len(h) > 12]
        if [k for k in kinds if k in (0x77, 0x78, 0x79)] == [0x77] + [0x78] * 8 + [0x79]: return frames
        time.sleep(0.5)
    S.check(False, 'Asukoha %d lugemine jäi mittetäielikuks; proovi sama sammu uuesti.' % (index + 1))

def run(pack, session, port_path):
    mb = (pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-mod-steps', 'Not a modifier steps pack')
    data = (pack / manifest['preset']['file']).read_bytes()
    S.check(hashlib.sha256(data).hexdigest() == manifest['preset']['sha256'], 'SHA-256 mismatch: preset')
    frames = S.dump_frames(data)
    session.mkdir(parents=True, exist_ok=True); out = session / 'mod-steps-results.json'
    res = json.loads(out.read_text()) if out.exists() else None
    if res: S.check(res['packSha256'] == hashlib.sha256(mb).hexdigest(), 'Sessioon kuulub teisele pakile')
    port = S.Port(port_path)
    try:
        require_fm3(port, port_path)
        if not res:
            S.send_preset(port, frames); time.sleep(1.0)
            ans = input('\nFM3 ekraanil peaks olema nimi "%s". Kas on? (j/e): ' % manifest['confirmName']).strip().lower()
            S.check(ans.startswith('j'), 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
            loc = input('Mis TÜHJA või katsetamiseks mõeldud asukohta (number FM3 ekraanil, 1-512) salvestad iga sammu? > ').strip()
            S.check(loc.isdigit() and 1 <= int(loc) <= 512, 'Asukoht peab olema 1..512')
            res = {'kind': 'fm3-mod-steps-results', 'packSha256': hashlib.sha256(mb).hexdigest(), 'time': time.strftime('%Y-%m-%dT%H:%M:%S'),
                   'shownLocation': int(loc), 'index': int(loc) - 1, 'userConfirmedName': True, 'steps': []}
            out.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n')
        else:
            print('Jätkan: tehtud %d sammu, asukoht %d. FM3-l peab olema selle asukoha preset (viimane salvestus).' % (len(res['steps']), res['shownLocation']))
        done = {s['id'] for s in res['steps']}
        print('\nAva: %s' % manifest['open'])
        for n, st in enumerate(manifest['steps'], 1):
            if st['id'] in done: continue
            print('\n[%d/%d] %s' % (n, len(manifest['steps']), st['text']))
            shown = input('  Mida ekraan selle välja kohta nüüd näitab? (täpselt) > ').strip() if st.get('ask', True) else ''
            input('  Nüüd STORE asukohta %d (kinnita FM3-l). Kui salvestatud, vajuta Enter. ' % res['shownLocation'])
            rec = {'id': st['id'], 'field': st.get('field'), 'shown': shown, 'storedDumpFrames': read_location(port, port_path, res['index'])}
            rec['note'] = input('  Kas midagi muud muutus või oli märkimisväärne? (Enter = ei) > ').strip()
            res['steps'].append(rec); out.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n')
            print('  Loetud ja salvestatud.')
    finally:
        port.close()
    print('\nValmis. Tulemused: %s\nKirjuta vestlusesse "valmis". Asukoha võid hiljem tühjendada.' % out)

def self_test():
    S.check(read_only_shape(stored_request(423)) == 'storedDump', 'request')
    print(json.dumps({'selfTest': 'passed'}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--check-port', action='store_true'); ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    if a.self_test: self_test()
    elif a.check_port: check_port(a.port)
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())

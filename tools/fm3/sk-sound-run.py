#!/usr/bin/env python3
"""SK1-SK4 V1.3 Cab-filter comparison (15.11.2026). Uses the unchanged guarded collectors; STORE is manual.

--case ID (default: all three in order): load the candidate into the edit buffer (SHA-256 checked), read the blocks
back, then for each scene the user selects the scene by hand (M-Wave/FM3), plays the same riff and the script records
the FM3 USB audio (ch 1-2 processed, 3-4 dry) with ffmpeg while polling the read-only CPU meter (fn=0x01 sub=0x2E).
--store ID (SK4): after the user has stored the chosen file and reloaded it, reads that location back.
Never sets, stores, switches scenes/presets or changes global/Mac audio settings."""
import argparse, hashlib, json, shutil, subprocess, sys, tempfile, time
from pathlib import Path
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import FM3_CPU_SWEEP as S
import FM3_SHOT_LOAD as Q
import FM3_BIND_STORE as B
import FM3_L1_LOUDNESS as L
CASES = ['BASELINE_V13', 'CAB_LOW80', 'CAB_HIGH6500']

def preflight():
    pack = json.loads((ROOT / 'pack.json').read_text())
    S.check(pack['kind'] == 'fm3-sk-sound-preparation', 'Wrong pack')
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
    print('Eelkontroll läbitud. USB-porti ega heliseadet ei avatud.')
    return pack

def record_with_cpu(port, device, seconds, wav):
    """ffmpeg records the FM3 USB input; meanwhile the read-only CPU meter is polled about twice a second."""
    proc = subprocess.Popen([L.ffmpeg(), '-hide_banner', '-loglevel', 'error', '-y', '-f', 'avfoundation', '-i', ':' + device,
        '-t', str(seconds), '-ac', '4', '-ar', '48000', '-c:a', 'pcm_s24le', str(wav)], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    cpu = []
    while proc.poll() is None:
        raw = S.read_cpu(port, timeout=0.6)
        if raw is not None: cpu.append(S.cpu_from_raw(raw))
        time.sleep(0.4)
    err = proc.stderr.read()
    S.check(proc.returncode == 0 and wav.exists(), 'Salvestus ebaõnnestus: ' + err[-300:])
    return cpu

def run_case(p, session, port, a):
    case = p['id']; dest = session / case; dest.mkdir(parents=True)
    print('\n=== %s: %s' % (case, p['name'])); print('Ootus: ' + p['expected'])
    Q.run(ROOT / case / 'shot', dest, case, None, port=port)
    ans = input('Kas FM3 ekraanil on nimi "%s"? j/e: ' % p['name']).strip().lower()
    S.write_json_new(dest / 'load-confirmation.json', {'kind': 'fm3-audit-load-confirmation', 'presetSha256': p['presetSha256'], 'userConfirmedName': ans == 'j'})
    S.check(ans == 'j', 'Vale nimi; katse peatatud, midagi ei salvestatud')
    rows = []
    for s in a.scenes:
        while True:
            k = input('\n%s stseen %d (%s): vali FM3-l/M-Wave\'iga see stseen. Enter = salvesta, s = jäta vahele > ' % (case, s, p['scenes'][s - 1])).strip().lower()
            if k == 's': break
            for n in (3, 2, 1): print('  %d...' % n); time.sleep(1)
            print('  MÄNGI (%d s): sama riff kui teistes kandidaatides' % a.seconds)
            wav = dest / ('scene-%d.wav' % s); cpu = record_with_cpu(port, a.device, a.seconds, wav)
            row = {'scene': s, 'name': p['scenes'][s - 1], 'file': wav.name, 'wet': L.measure(wav, 0), 'dry': L.measure(wav, 1),
                   'cpuReadings': cpu, 'cpuPeakPercent': max(cpu) if cpu else None, 'cpuEstimatePercent': p['cpuEstimate']['scenes'][s - 1]}
            print('  Valjus %s LUFS, tipp %s dBFS, CPU tipp %s %% (hinnang %s %%)' % (row['wet']['lufs'], row['wet']['peakDb'], row['cpuPeakPercent'], row['cpuEstimatePercent']))
            if input('  Enter = sobib, k = korda > ').strip().lower() != 'k':
                rows.append(row)
                # Persist each accepted scene at once: CPU readings cannot be rebuilt from the WAV after an interruption.
                with (dest / 'sk-scenes.jsonl').open('a', encoding='utf-8') as f: f.write(json.dumps(row, ensure_ascii=False) + '\n')
                break
            wav.unlink()
    ref = a.reference if any(r['scene'] == a.reference for r in rows) else (rows[0]['scene'] if rows else None)
    if ref is not None:
        try: rows = L.summarize(rows, ref); print('\n' + L.table(rows, ref))
        except SystemExit as e: print('Kokkuvõte jäi tegemata (%s); stseenide mõõtmised on failis sk-scenes.jsonl.' % e)
    note = input('\nKuidas %s kõlas võrreldes lähtega (bass, kõrged, rünnak, läbikostvus)? Enter = ei oska öelda > ' % case).strip()
    S.write_json_new(dest / 'sk-audio-results.json', {'kind': 'fm3-sk-audio', 'version': 1, 'case': case, 'presetSha256': p['presetSha256'],
        'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'seconds': a.seconds, 'reference': ref, 'device': a.device,
        'channels': {'wet': 'USB 1-2', 'dry': 'USB 3-4'}, 'cpuDecode': 'piecewise-20261023', 'userNote': note, 'scenes': rows})

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--preflight', action='store_true'); ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--case', choices=CASES); ap.add_argument('--store', choices=CASES)
    ap.add_argument('--scenes', default='1-8'); ap.add_argument('--seconds', type=int, default=15)
    ap.add_argument('--reference', type=int, default=1); ap.add_argument('--device', default='FM3'); ap.add_argument('--port')
    a = ap.parse_args(); pack = preflight()
    if a.self_test: L.self_test()
    if a.preflight or a.self_test: return
    a.scenes = L.parse_scenes(a.scenes); S.check(5 <= a.seconds <= 60, 'Kestus 5..60 s')
    print('Sulge FM3-Edit ja Fractal-Bot. Laadimine asendab salvestamata tööpuhvri.')
    print('STORE-i, stseeni- ja presetivahetused teed sina. Üldseadeid ega Maci heliseadeid ei muudeta.')
    session = Path(tempfile.mkdtemp(prefix='SESSION_SK_', dir=ROOT))
    port_path = a.port or S.find_port()
    try:
        if a.store:
            p = next(x for x in pack['packs'] if x['id'] == a.store); dest = session / a.store
            print('\nSK4 lõppfail: %s (%s)' % (p['name'], p['presetSha256'][:12]))
            S.check(input('Laadimiseks kirjuta LAADI: ').strip() == 'LAADI', 'Katse katkestatud')
            port = S.Port(port_path)
            try: S.require_fm3(port, port_path); Q.run(ROOT / a.store / 'shot', dest / 'load', a.store, None, port=port)
            finally: port.close()
            print('Nüüd: 1) STORE FM3-l oma kohta (424–427); 2) vali mõni teine preset; 3) tule tagasi;')
            print('4) mängi kõik 8 stseeni üle, vaheta stseene mängu ajal ja M-Wave\'iga. FM3-Edit jäägu suletuks.')
            S.check(input('Kui see on tehtud, kirjuta STORE: ').strip() == 'STORE', 'Katse peatatud')
            B.run('verify', ROOT / a.store / 'store', dest, port_path)
            return
        S.check(input('Alustamiseks kirjuta LAADI: ').strip() == 'LAADI', 'Katse katkestatud')
        port = S.Port(port_path)
        try:
            S.require_fm3(port, port_path)
            for p in pack['packs']:
                if a.case and p['id'] != a.case: continue
                run_case(p, session, port, a)
        finally:
            port.close()
        print('\nValmis. Vali FM3-l mõni muu preset, kui sa ei salvesta (tööpuhver tühistub).')
    finally:
        small = Path(tempfile.mkdtemp()) / session.name
        shutil.copytree(session, small, ignore=shutil.ignore_patterns('*.wav'))
        archive = shutil.make_archive(str(session), 'zip', small.parent, small.name)
        print('Sessioon: %s\nWAV-id jäävad sessioonikausta; Claude toob need ise. Kirjuta vestlusesse "valmis".' % session.name)

if __name__ == '__main__': main()

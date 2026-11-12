#!/usr/bin/env python3
"""L1: scene loudness from the FM3 USB audio (12.11.2026). Records with ffmpeg and measures; it never talks to the FM3.

No MIDI/serial port is opened, nothing is loaded, set or stored and no system audio setting is changed. The user loads
the preset and selects each scene by hand, plays the same short riff, and the script records the FM3 USB input
(channels 1-2 = processed output by FM3 default, 3-4 = dry input) and reports integrated loudness per scene.
The dry pair shows how evenly the riff was played; "corrected" loudness removes that playing difference.
Usage: l1-loudness.py [--scenes 1-8] [--seconds 12] [--reference 1] [--device FM3] [--out DIR] | --self-test | --analyze DIR
Requires Python 3.9+ and ffmpeg."""
import argparse, json, re, shutil, subprocess, sys, tempfile, time
from pathlib import Path
sys.dont_write_bytecode = True

def check(ok, msg):
    if not ok: raise SystemExit('VIGA: ' + msg)

def ffmpeg():
    exe = shutil.which('ffmpeg') or ('/opt/homebrew/bin/ffmpeg' if Path('/opt/homebrew/bin/ffmpeg').exists() else None)
    check(exe, 'ffmpeg puudub (brew install ffmpeg)'); return exe

def parse_scenes(text):
    out = []
    for part in text.split(','):
        a, _, b = part.partition('-'); a = int(a); b = int(b or a)
        check(1 <= a <= b <= 8, 'Stseenid peavad olema 1..8'); out += range(a, b + 1)
    check(len(set(out)) == len(out) and out, 'Vigane stseeniloend'); return out

def measure(wav, pair):
    """Integrated loudness (EBU R128, LUFS), RMS and peak (dBFS) of one stereo pair (0 = ch 1-2, 1 = ch 3-4)."""
    l, r = 2 * pair, 2 * pair + 1
    p = subprocess.run([ffmpeg(), '-hide_banner', '-nostats', '-i', str(wav), '-filter_complex',
        '[0:a]pan=stereo|c0=c%d|c1=c%d,astats=measure_perchannel=none:measure_overall=RMS_level+Peak_level,ebur128=peak=none[o]' % (l, r),
        '-map', '[o]', '-f', 'null', '-'], capture_output=True, text=True)
    check(p.returncode == 0, 'ffmpeg ei saanud faili mõõta: ' + p.stderr[-300:])
    def last(pattern):
        m = re.findall(pattern, p.stderr); return None if not m else (None if m[-1] in ('-inf', 'nan') else float(m[-1]))
    return {'lufs': last(r'I:\s+(-?[\d.]+|-inf|nan) LUFS'), 'rmsDb': last(r'RMS level dB: (-?[\d.]+|-inf|nan)'),
            'peakDb': last(r'Peak level dB: (-?[\d.]+|-inf|nan)')}

def summarize(rows, reference):
    """Per-scene difference to the reference scene; corrected = wet difference minus dry (playing) difference."""
    ref = next((r for r in rows if r['scene'] == reference), None)
    check(ref and ref['wet']['lufs'] is not None and ref['wet']['lufs'] > -60, 'Võrdlusstseenil puudub signaal (USB 1-2 vaikne)')
    for r in rows:
        w, d = r['wet']['lufs'], r['dry']['lufs']
        r['silent'] = w is None or w < -60
        r['clipRisk'] = r['wet']['peakDb'] is not None and r['wet']['peakDb'] > -1.0
        r['deltaDb'] = None if r['silent'] else round(w - ref['wet']['lufs'], 1)
        r['playingDeltaDb'] = None if d is None or ref['dry']['lufs'] is None or d < -70 or ref['dry']['lufs'] < -70 else round(d - ref['dry']['lufs'], 1)
        r['correctedDeltaDb'] = None if r['deltaDb'] is None else round(r['deltaDb'] - (r['playingDeltaDb'] or 0), 1)
        r['suggestedTrimDb'] = None if r['correctedDeltaDb'] is None else round(-r['correctedDeltaDb'], 1)
    return rows

def table(rows, reference):
    out = ['Stseen  Valjus LUFS  Tipp dBFS  Vahe  Mäng  Korrigeeritud  Soovitus (sama valjuse jaoks)']
    for r in rows:
        f = lambda v, u='': '   -' if v is None else '%+.1f%s' % (v, u)
        w = r['wet']
        out.append('%4d    %10s  %9s  %5s %5s  %12s   %s%s' % (r['scene'], '-' if w['lufs'] is None else '%.1f' % w['lufs'],
            '-' if w['peakDb'] is None else '%.1f' % w['peakDb'], f(r['deltaDb']), f(r['playingDeltaDb']), f(r['correctedDeltaDb']),
            'võrdlus' if r['scene'] == reference else ('SIGNAAL PUUDUB' if r['silent'] else f(r['suggestedTrimDb'], ' dB')),
            '  (tipp üle -1 dBFS!)' if r['clipRisk'] else ''))
    out.append('Vahe = stseen miinus võrdlusstseen. Mäng = kuiva kitarri (USB 3-4) vahe ehk kui erinevalt mängisid.')
    out.append('Soovitus on stseeni taseme muutus, et valjus võrduks võrdlusstseeniga; lead-stseen jäta teadlikult valjemaks.')
    return '\n'.join(out)

def analyze(folder, reference):
    rows = []
    for wav in sorted(Path(folder).glob('scene-*.wav')):
        rows.append({'scene': int(wav.stem.split('-')[1]), 'file': wav.name, 'wet': measure(wav, 0), 'dry': measure(wav, 1)})
    check(rows, 'Kaustas pole scene-N.wav faile')
    return summarize(rows, reference if any(r['scene'] == reference for r in rows) else rows[0]['scene'])

def record(device, seconds, wav):
    p = subprocess.run([ffmpeg(), '-hide_banner', '-loglevel', 'error', '-y', '-f', 'avfoundation', '-i', ':' + device,
        '-t', str(seconds), '-ac', '4', '-ar', '48000', '-c:a', 'pcm_s24le', str(wav)], capture_output=True, text=True)
    check(p.returncode == 0 and wav.exists(), 'Salvestus ebaõnnestus: ' + p.stderr[-300:])

def self_test():
    with tempfile.TemporaryDirectory() as d:
        d = Path(d)
        for scene, wet, dry in ((1, 0.10, 0.05), (2, 0.20, 0.05), (3, 0.10, 0.10), (4, 0.0, 0.05)):
            subprocess.run([ffmpeg(), '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
                'sine=frequency=440:duration=4:sample_rate=48000', '-filter_complex',
                '[0:a]asplit=4[a][b][c][e];[a]volume=%f[a1];[b]volume=%f[b1];[c]volume=%f[c1];[e]volume=%f[e1];[a1][b1][c1][e1]amerge=inputs=4[o]' % (wet, wet, dry, dry),
                '-map', '[o]', '-c:a', 'pcm_s24le', str(d / ('scene-%d.wav' % scene))], check=True)
        rows = {r['scene']: r for r in analyze(d, 1)}
        check(abs(rows[2]['deltaDb'] - 6.0) <= 0.2 and rows[2]['suggestedTrimDb'] == -rows[2]['correctedDeltaDb'], 'self-test: +6 dB scene')
        check(abs(rows[3]['deltaDb']) <= 0.2 and abs(rows[3]['playingDeltaDb'] - 6.0) <= 0.2 and abs(rows[3]['correctedDeltaDb'] + 6.0) <= 0.3, 'self-test: playing correction')
        check(rows[4]['silent'] and rows[4]['suggestedTrimDb'] is None, 'self-test: silent scene')
        check(parse_scenes('1-3,8') == [1, 2, 3, 8], 'self-test: scene list')
        try: summarize([rows[4]], 4); check(False, 'self-test: silent reference accepted')
        except SystemExit as e: check('puudub signaal' in str(e), 'self-test: silent reference message')
    print(json.dumps({'passed': True, 'selfTest': True, 'deviceIO': False}))

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--scenes', default='1-8'); ap.add_argument('--seconds', type=int, default=12)
    ap.add_argument('--reference', type=int, default=1); ap.add_argument('--device', default='FM3')
    ap.add_argument('--out'); ap.add_argument('--label', default='')
    ap.add_argument('--self-test', action='store_true'); ap.add_argument('--analyze')
    a = ap.parse_args()
    if a.self_test: return self_test()
    if a.analyze:
        rows = analyze(a.analyze, a.reference); print(table(rows, a.reference)); return
    scenes = parse_scenes(a.scenes); check(5 <= a.seconds <= 60, 'Kestus 5..60 s'); check(a.reference in scenes, 'Võrdlusstseen peab olema loendis')
    out = Path(a.out) if a.out else Path.cwd() / time.strftime('SESSION_L1_%Y%m%d_%H%M%S')
    out.mkdir(parents=True, exist_ok=False)
    print('L1 stseenide valjus. Skript ainult salvestab FM3 USB-heli; FM3-le ei saadeta midagi.')
    print('Laadi preset ise. Igas stseenis mängi SAMA riffi sama tugevusega (%d s). Kitarri helitugevuse nupp jäägu paika.' % a.seconds)
    name = input('Preseti nimi (märkmeks) > ').strip()
    rows = []
    for s in scenes:
        while True:
            ans = input('\nVali FM3-l stseen %d. Enter = alusta salvestust, s = jäta vahele > ' % s).strip().lower()
            if ans == 's': break
            for n in (3, 2, 1): print('  %d...' % n); time.sleep(1)
            print('  MÄNGI (%d s)' % a.seconds); wav = out / ('scene-%d.wav' % s); record(a.device, a.seconds, wav)
            row = {'scene': s, 'file': wav.name, 'wet': measure(wav, 0), 'dry': measure(wav, 1)}
            print('  Valjus %s LUFS, tipp %s dBFS' % (row['wet']['lufs'], row['wet']['peakDb']))
            if input('  Enter = sobib, k = korda > ').strip().lower() != 'k': rows.append(row); break
    check(any(r['scene'] == a.reference for r in rows), 'Võrdlusstseen jäi salvestamata')
    rows = summarize(rows, a.reference); text = table(rows, a.reference); print('\n' + text)
    (out / 'l1-loudness-results.json').write_text(json.dumps({'kind': 'fm3-l1-scene-loudness', 'version': 1, 'preset': name, 'label': a.label,
        'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'seconds': a.seconds, 'reference': a.reference, 'device': a.device,
        'channels': {'wet': 'USB 1-2', 'dry': 'USB 3-4'}, 'method': 'ffmpeg ebur128 integrated loudness', 'fm3IO': False,
        'note': input('\nMärkus (Enter = puudub) > ').strip(), 'scenes': rows}, indent=1, ensure_ascii=False) + '\n')
    (out / 'l1-loudness.txt').write_text(text + '\n')
    print('Tulemused: %s\nKirjuta vestlusesse kausta nimi.' % out)

if __name__ == '__main__': main()

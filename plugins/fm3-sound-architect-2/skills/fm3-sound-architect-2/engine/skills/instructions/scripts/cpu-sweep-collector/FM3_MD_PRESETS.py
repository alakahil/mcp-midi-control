#!/usr/bin/env python3
"""FM3 Multi Delay preset sweep (T35). macOS/Linux, POSIX serial, no pyserial. Interactive.

For every Multi Delay preset ("Type", 39 choices) in the pack manifest:
  1. loads the pack preset (device-default Multi Delay) into the edit buffer (0x77 header 7F 00 00 40 00, SHA-256
     checked) and reads the Multi Delay block back (fn=0x1F, read only); it must equal the default words;
  2. closes the port and waits: the user chooses that Type on channel A (FM3 front panel or FM3-Edit; FM3-Edit is
     closed again without Save) and presses Enter;
  3. reopens the port, reads the block again (fn=0x1F) and saves all 484 words to SESSION/md-preset-NN.json.
The port is open only while this script talks to the FM3, so FM3-Edit can be used between the steps.
Existing result files are skipped, so a run can be stopped (q) and resumed.
This script never stores and never sets: it sends only the edit-buffer load and read requests.

Usage:
  python3 FM3_MD_PRESETS.py --self-test
  python3 FM3_MD_PRESETS.py --run --pack . --session ../SESSION [--port /dev/cu.usbmodemXXXX]
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
from FM3_READ_PROBE import read_only_shape
from FM3_SHOT_LOAD import read_block, require_fm3

WORDS = 121

def judge(default, device, index):
    """Classify one read after the user's choice. Channel A must carry preset word `index`; B..D must stay default."""
    if len(device) != 4 * WORDS: return {'status': 'incomplete', 'values': len(device)}
    a = device[:WORDS]; others = [i for i in range(WORDS, 4 * WORDS) if device[i] != default[i]]
    changed = [{'pid': p, 'from': default[p], 'to': a[p]} for p in range(WORDS) if a[p] != default[p]]
    if others: return {'status': 'other-channels-changed', 'otherChannelWords': len(others), 'changedA': changed}
    if a[114] != index: return {'status': 'wrong-preset', 'presetWord': a[114], 'changedA': changed}
    return {'status': 'ok', 'presetWord': a[114], 'algorithm': a[0], 'changedA': changed}

def with_port(port_path, fn):
    port = S.Port(port_path)
    try:
        require_fm3(port, port_path); return fn(port)
    finally:
        port.close()

def run(pack, session, port_path, ask=input):
    mb = (pack / 'manifest.json').read_bytes(); m = json.loads(mb)
    S.check(m.get('kind') == 'fm3-md-presets', 'Not a Multi Delay preset sweep pack')
    data = (pack / m['preset']['file']).read_bytes()
    S.check(hashlib.sha256(data).hexdigest() == m['preset']['sha256'], 'SHA-256 mismatch: ' + m['preset']['file'])
    blk = m['block']; S.check(read_only_shape(bytes.fromhex(blk['request'])) == 'bulk', 'bulk request only')
    frames = S.dump_frames(data); default = blk['expected']; S.check(len(default) == 4 * WORDS, 'default words')
    session.mkdir(parents=True, exist_ok=True); pack_sha = hashlib.sha256(mb).hexdigest()
    todo = [p for p in m['presets'] if not (session / ('md-preset-%02d.json' % p['index'])).exists()]
    print('Mõõta jäänud %d / %d presetti.' % (len(todo), len(m['presets'])))
    for n, p in enumerate(todo, 1):
        out = session / ('md-preset-%02d.json' % p['index'])
        def load(port):
            S.send_preset(port, frames); time.sleep(1.2); return read_block(port, blk)
        base = with_port(port_path, load)
        if base != default:
            print('HOIATUS: vaikimisi Multi Delay ei laadinud täpselt (%d sõna erineb). Lõpetan; saada Claude\'ile sessioonikaust.'
                  % sum(1 for x, y in zip(base, default) if x != y)); sys.exit(2)
        while True:
            print('\n[%d/%d] Vali Multi Delay kanalil A: Type = "%s" (nimekirjas nr %d).' % (n, len(todo), p['label'], p['index'] + 1))
            r = ask('  Kui valitud (FM3-Edit suletud, Save-ta), vajuta Enter. v = jäta vahele, q = lõpeta > ').strip().lower()
            if r == 'q': print('Lõpetatud. Sama käsk jätkab hiljem.'); return
            if r == 'v': res = {'status': 'skipped'}; vals = None; break
            vals = with_port(port_path, lambda port: read_block(port, blk)); res = judge(default, vals, p['index'])
            if res['status'] == 'ok': break
            print('  Ei klapi: %s. Kontrolli, et Type on "%s" ja kanal A.' % (res['status'], p['label']))
            if ask('  Enter = loe uuesti, s = salvesta nii nagu on > ').strip().lower() == 's': break
        rec = {'kind': 'fm3-md-preset', 'packSha256': pack_sha, 'index': p['index'], 'label': p['label'],
               'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'loadMatchedDefault': True, **res}
        if vals is not None: rec['device'] = vals
        out.write_text(json.dumps(rec, indent=1) + '\n')
        print('  %s: %s%s' % (p['label'], res['status'], (', %d sõna muutus' % len(res.get('changedA', []))) if 'changedA' in res else ''))
    print('\nValmis. Kirjuta vestlusesse "valmis".')

def self_test():
    d = [0] * (4 * WORDS)
    a = list(d); a[0] = 2; a[114] = 12; a[13] = 5
    S.check(judge(d, a, 12) == {'status': 'ok', 'presetWord': 12, 'algorithm': 2,
            'changedA': [{'pid': 0, 'from': 0, 'to': 2}, {'pid': 13, 'from': 0, 'to': 5}, {'pid': 114, 'from': 0, 'to': 12}]}, 'judge ok')
    S.check(judge(d, a, 11)['status'] == 'wrong-preset', 'judge wrong preset')
    b = list(a); b[WORDS + 3] = 1; S.check(judge(d, b, 12)['status'] == 'other-channels-changed', 'judge other channels')
    S.check(judge(d, a[:10], 12)['status'] == 'incomplete', 'judge incomplete')
    S.check(judge(d, d, 0) == {'status': 'ok', 'presetWord': 0, 'algorithm': 0, 'changedA': []}, 'judge preset 0 unchanged')
    run_test()
    print(json.dumps({'selfTest': 'passed'}))

def run_test():
    """run() against a simulated FM3: load, user choice, retry on a wrong preset, skip, quit and resume."""
    import tempfile, builtins
    g = globals(); saved = {k: g[k] for k in ('read_block', 'require_fm3')}; saved_port, saved_send, saved_dump = S.Port, S.send_preset, S.dump_frames
    default = [7] * (4 * WORDS); state = {'words': list(default), 'reads': 0}
    class P:
        def __init__(self, path): pass
        def close(self): pass
    def send(port, frames): state['words'] = list(default)
    def read(port, blk): state['reads'] += 1; return list(state['words'])
    def choose(index):
        w = list(default); w[0] = index % 6; w[114] = index; w[10] = 100 + index; state['words'] = w
    try:
        S.Port, S.send_preset, S.dump_frames = P, send, (lambda d: [d])
        g['read_block'] = read; g['require_fm3'] = lambda port, path: None
        with tempfile.TemporaryDirectory() as t:
            pack = Path(t) / 'pack'; ses = Path(t) / 'ses'; pack.mkdir(); (pack / 'D.syx').write_bytes(b'x')
            rq = [0xf0, 0, 1, 0x74, S.MODEL, 0x1f, 74, 0]; rq = bytes(rq + [S.checksum(rq), 0xf7])
            man = {'kind': 'fm3-md-presets', 'preset': {'file': 'D.syx', 'sha256': hashlib.sha256(b'x').hexdigest()},
                   'block': {'request': rq.hex(), 'expected': default},
                   'presets': [{'index': 0, 'label': 'P0'}, {'index': 1, 'label': 'P1'}, {'index': 2, 'label': 'P2'}]}
            (pack / 'manifest.json').write_text(json.dumps(man))
            S.check(read_only_shape(bytes.fromhex(man['block']['request'])) == 'bulk', 'test request shape')
            answers = iter(['', '', 's', 'q'])
            def ask(q):
                a = next(answers)
                if a == '' and state['reads'] in (1,): choose(0)
                elif a == '' and state['reads'] == 3: choose(5)
                return a
            run(pack, ses, 'fake', ask)
            r0 = json.loads((ses / 'md-preset-00.json').read_text()); r1 = json.loads((ses / 'md-preset-01.json').read_text())
            S.check(r0['status'] == 'ok' and r0['device'][114] == 0 and [c['pid'] for c in r0['changedA']] == [0, 10, 114], 'run: preset 0 ok')
            S.check(r1['status'] == 'wrong-preset' and r1['presetWord'] == 5, 'run: wrong preset saved on s')
            S.check(not (ses / 'md-preset-02.json').exists(), 'run: q stops before saving')
            answers = iter(['v']); run(pack, ses, 'fake', lambda q: next(answers))
            S.check(json.loads((ses / 'md-preset-02.json').read_text())['status'] == 'skipped', 'run: resume skips done presets')
            state['words'] = [0] * (4 * WORDS); S.send_preset = lambda port, frames: None
            (ses / 'md-preset-02.json').unlink()
            try: run(pack, ses, 'fake', lambda q: ''); raise AssertionError('accepted a load that did not match the default')
            except SystemExit: pass
    finally:
        g.update(saved); S.Port, S.send_preset, S.dump_frames = saved_port, saved_send, saved_dump

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--run', action='store_true'); ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.run and a.pack and a.session, 'Anna --run, --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())

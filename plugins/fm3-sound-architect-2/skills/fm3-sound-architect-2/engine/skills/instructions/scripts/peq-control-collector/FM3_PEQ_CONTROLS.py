#!/usr/bin/env python3
"""Jätkatav PEQ Band 3 Frequency/Q/Gain ja Leveli kogumine; üks kinnitatud GET sammus."""
import argparse, datetime, hashlib, json, math, shlex, shutil, subprocess, sys, uuid, zipfile
from pathlib import Path
import peq_transport as core

HERE = Path(__file__).resolve().parent
PLAN = json.loads((HERE / 'plan.json').read_text())
BASE_SHA = 'c1a706b9078793dd3c8db4873e329f06d2a5f96a1f4be201a4501477821277be'

def dump(path, data):
    temp = path.with_suffix('.tmp')
    core.check(not path.is_symlink() and not temp.is_symlink(), 'Sümbollink ei sobi')
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    temp.replace(path)

def offline(*args):
    r = subprocess.run(['node', str(HERE / 'control-check.mjs'), *map(str, args)], capture_output=True, text=True)
    core.check(r.returncode == 0, r.stderr.strip() or 'Failikontroll ebaõnnestus')
    return json.loads(r.stdout)

def display_value(answer, step):
    value = step['value'] if not answer.strip() else float(answer.strip().replace(',', '.'))
    core.check(math.isfinite(value), 'Sisesta lõplik arv')
    if step['parameter'] in ('Frequency', 'Q'):
        core.check(value > 0, 'Frequency ja Q peavad olema positiivsed')
    # This is a capture-target tolerance, not an asserted device parameter range.
    tolerance = max(0.01, abs(step['value']) * 0.005)
    core.check(abs(value - step['value']) <= tolerance,
               'Ekraaniväärtus erineb sihist rohkem kui ümardus lubab. Kontrolli juhti, sihti ja ühikut; GET-i ei saadetud.')
    return value

def resume(root, incomplete=None):
    core.check(not root.is_symlink(), 'Sessioonikausta sümbollink ei sobi')
    root.mkdir(parents=True, exist_ok=True)
    expected = {'schemaVersion': 1, 'kind': 'FM3_PEQ_CONTROLS', 'collector': '0.1.0',
                'firmwareDeclared': 13, 'baselineSha256': BASE_SHA,
                'planSha256': hashlib.sha256((HERE / 'plan.json').read_bytes()).hexdigest()}
    manifest = root / 'session.json'
    core.check(not manifest.is_symlink(), 'Sümbollink ei sobi')
    if manifest.exists():
        core.check(json.loads(manifest.read_text()) == expected, 'Sessiooni plaan või alus erineb')
    else:
        core.check(not list(root.iterdir()), 'Uus sessioonikaust peab olema tühi')
        dump(manifest, expected)
    core.check(hashlib.sha256((HERE / 'baseline.syx').read_bytes()).hexdigest() == BASE_SHA, 'Algfail muutus')
    offline('preflight', HERE / 'baseline.syx')
    setup_file = root / 'setup.json'
    core.check(not setup_file.is_symlink(), 'Sümbollink ei sobi')
    setup = json.loads(setup_file.read_text()) if setup_file.exists() else None
    if setup is not None:
        core.check(isinstance(setup, dict) and isinstance(setup.get('band3TypeLabel'), str) and setup['band3TypeLabel'].strip(), 'Band 3 Type ekraanitekst puudub')
    index, previous = 0, HERE / 'baseline.syx'
    for folder in sorted(root.glob('step-*')):
        core.check(folder.is_dir() and not folder.is_symlink(), 'Vigane katsekaust')
        for name in ['result.json', 'donor.syx', 'capture.json']:
            core.check(not (folder / name).is_symlink(), 'Sümbollink ei sobi')
        try:
            result = json.loads((folder / 'result.json').read_text())
        except (FileNotFoundError, json.JSONDecodeError, UnicodeDecodeError):
            if incomplete is not None: incomplete.append(str(folder))
            continue
        if not isinstance(result, dict) or result.get('status') in (None, 'pending'):
            if incomplete is not None: incomplete.append(str(folder))
            continue
        if result.get('status') in ('failed', 'cancelled'): continue
        core.check(result.get('status') in ('passed', 'skipped'), 'Tundmatu katse olek')
        core.check(index < len(PLAN) and result.get('index') == index and result.get('step') == PLAN[index], 'Katsete järjekord või ülesanne on vigane')
        if result['status'] == 'passed':
            core.check(setup and result.get('band3TypeLabel') == setup['band3TypeLabel'], 'Type ekraanikirje erineb')
            core.check(result.get('displayConfirmed') is True, 'Ekraaniväärtuse kinnitus puudub')
            value = result.get('displayValue')
            core.check(type(value) in (int, float) and math.isfinite(value), 'Ekraaniväärtus on vigane')
            display_value(str(value), PLAN[index])
            comparison = offline('compare', previous, folder / 'donor.syx', index)
            core.check(comparison == result.get('comparison'), 'Salvestatud võrdlus erineb failidest')
            pair = offline('pair', folder)
            core.check(pair == result.get('pair'), 'Salvestatud GET/SYX raport erineb tõenditest')
            previous = folder / 'donor.syx'
        else:
            core.check(isinstance(result.get('reason'), str) and result['reason'].strip(), 'Vahelejätmise põhjus puudub')
        index += 1
    return index, previous, setup

def export_zip(root):
    core.check(not root.is_symlink(), 'Sümbollink ei sobi')
    out = root.parent / ('FM3_PEQ_CONTROLS_' + datetime.datetime.now().strftime('%Y%m%dT%H%M%S') + '_' + uuid.uuid4().hex[:8] + '.zip')
    # Preserve failed/incomplete evidence without treating it as validated data.
    with zipfile.ZipFile(out, 'x', zipfile.ZIP_DEFLATED, strict_timestamps=False) as archive:
        for name in ['plan.json', 'baseline.syx']:
            archive.write(HERE / name, name)
        for p in sorted(root.rglob('*')):
            core.check(not p.is_symlink(), 'Sümbollink ei sobi')
            if p.is_file(): archive.write(p, str(p.relative_to(root)))
    print('\nSaada vestlusse tulemuste ZIP: ' + str(out))
    return out

def capture(folder, port):
    report = {'schemaVersion': 1, 'collectorVersion': 'peq-controls-0.1.0', 'firmwareDeclared': 13,
              'date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'port': port,
              'txHex': core.GET.hex(), 'txCalls': 0, 'rxChunks': [], 'status': 'pending',
              'syxSha256': hashlib.sha256((folder / 'donor.syx').read_bytes()).hexdigest()}
    dump(folder / 'capture.json', report)
    try:
        print('TX (üks GET): ' + core.GET.hex(), flush=True)
        report['decoded'] = core.collect(port, report)
        report['status'] = 'captured'
    except (Exception, KeyboardInterrupt) as error:
        report.update(status='failed', error=str(error) or 'Katkestatud')
    finally:
        dump(folder / 'capture.json', report)
    core.check(report['status'] == 'captured', report.get('error', 'GET ebaõnnestus'))
    return offline('pair', folder)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--session', default=str(HERE / 'FM3_PEQ_CONTROLS_SESSION'))
    parser.add_argument('--port')
    parser.add_argument('--export-only', action='store_true')
    args = parser.parse_args()
    core.check(shutil.which('node'), 'Node puudub')
    root = Path(args.session).expanduser().absolute()
    try:
        incomplete = []
        index, previous, setup = resume(root, incomplete)
        if incomplete: print('Poolikud katsed säilivad ZIP-is; neid ei loeta mõõtmisteks.')
        if args.export_only or index == len(PLAN):
            if index == len(PLAN): print('Plaan on juba läbitud. Uut GET-i ei saadeta.')
            return
        core.check(args.port and args.port.startswith('/dev/cu.'), 'Anna kinnitatud macOS port --port /dev/cu.…')
        print('PEQ: 12 mõõtepunkti. q = ZIP ja lõpeta; s = jäta punkt mõõtmata, salvesta põhjus.')
        print('Algpaar 132/132 on juba kinnitatud; algkontrolli ei korrata.')
        print('Lähteolek / viimane edukas fail: ' + str(previous))
        print('Jätkamisel taasta selle faili olek tööpuhvrisse. Hoia Scene 2 ja PEQ 1 kanal A bypass.')
        print('Muutused on järjestikused. Type, teised ribad/plokid/stseenid jäta samaks. Save/Store pole vajalik.')
        if setup is None:
            label = input('Kirjuta Band 3 Type täpne ekraanitekst (kui välja ei näe: ei näe; q = lõpeta). Ära Type-i muuda: ').strip()
            if label.lower() == 'q': return
            core.check(bool(label), 'Kirjuta ekraanitekst või ei näe')
            setup = {'band3TypeLabel': label, 'source': 'user-screen-observation-not-enum-validation'}
            dump(root / 'setup.json', setup)
        while index < len(PLAN):
            step = PLAN[index]
            print('\nKatse %d/%d: %s\n%s' % (index + 1, len(PLAN), step['id'], step['instruction']))
            answer = input('Lohista eksporditud terve SYX siia [q/s]: ').strip()
            if answer.lower() == 'q': break
            if answer.lower() == 's':
                reason = input('Põhjus (väärtus juba sama / juht puudub; täpsusta): ').strip()
                core.check(bool(reason), 'Põhjus on vajalik')
                folder = root / ('step-%02d-%s' % (index, uuid.uuid4().hex[:10])); folder.mkdir()
                dump(folder / 'result.json', {'index': index, 'step': step, 'status': 'skipped', 'reason': reason})
                print('Enne jätkamist peab olek vastama viimasele edukale failile: ' + str(previous))
                index += 1
                continue
            parts = shlex.split(answer)
            core.check(len(parts) == 1, 'Lohista üks fail')
            data = Path(parts[0]).expanduser().read_bytes()
            folder = root / ('step-%02d-%s' % (index, uuid.uuid4().hex[:10])); folder.mkdir()
            (folder / 'donor.syx').write_bytes(data)
            result = {'index': index, 'step': step, 'status': 'pending', 'band3TypeLabel': setup['band3TypeLabel']}
            dump(folder / 'result.json', result)
            try:
                result['comparison'] = offline('compare', previous, folder / 'donor.syx', index)
                names = result['comparison']['presetNameChange']
                if names: print('Preseti nime muutus salvestati: %s → %s.' % (names['before'], names['after']))
                print('Failikontroll OK: muutus üks oodatud PEQ A sõna; muu preset säilis.')
                shown = input('Kontrolli %s ekraanilt. Enter = %s %s; ümarduse korral tegelik arv samas ühikus (q = lõpeta): ' % (step['parameter'], step['value'], step['unit'])).strip()
                if shown.lower() == 'q':
                    result['status'] = 'cancelled'; dump(folder / 'result.json', result); break
                result['displayValue'] = display_value(shown, step)
                confirm = input('Muutsid ainult nimetatud juhti? Sulge FM3-Edit ja Fractal-Bot. Lubad ühe PEQ GET-lugemise? [jah/q]: ').strip().lower()
                if confirm != 'jah':
                    result['status'] = 'cancelled'; dump(folder / 'result.json', result); break
                result['displayConfirmed'] = True
                dump(folder / 'result.json', result)
                result['pair'] = capture(folder, args.port)
                result['status'] = 'passed'; dump(folder / 'result.json', result)
            except (Exception, KeyboardInterrupt) as error:
                result.update(status='failed', error=str(error) or 'Katkestatud')
                dump(folder / 'result.json', result)
                raise
            print('PASS: GET/SYX 132/132. Ekraaniväärtus salvestatud; skaala kinnitamine järgneb analüüsis.')
            previous = folder / 'donor.syx'; index += 1
            if index < len(PLAN): print('Ava FM3-Edit ja jätka samast olekust järgmise sammuga.')
        if index == len(PLAN): print('Plaan läbitud. Vahele jäetud punkte ei loeta mõõdetuks. Saada ZIP analüüsiks.')
    finally:
        if root.is_dir() and (root / 'session.json').exists(): export_zip(root)

if __name__ == '__main__':
    try: main()
    except (Exception, KeyboardInterrupt) as error:
        print('PEATATUD: ' + (str(error) or 'Katkestatud') + '\nAndmed säilivad; automaatset korduspäringut ei tehta. Käivita sama käsk jätkamiseks.', file=sys.stderr)
        sys.exit(1)

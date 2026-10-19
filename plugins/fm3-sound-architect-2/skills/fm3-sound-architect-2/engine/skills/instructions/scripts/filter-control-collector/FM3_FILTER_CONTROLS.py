#!/usr/bin/env python3
"""Jätkatav Filteri juhtide mõõtmine. Ainult käsitsi kinnitatud üks GET katse kohta."""
import argparse, datetime, hashlib, json, math, shlex, shutil, subprocess, sys, uuid, zipfile
from pathlib import Path
import filter_transport as core

HERE = Path(__file__).resolve().parent
PLAN = json.loads((HERE / 'plan.json').read_text())

def dump(path, data):
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    temp.replace(path)

def offline(*args):
    result = subprocess.run(['node', str(HERE / 'control-check.mjs'), *map(str, args)], capture_output=True, text=True)
    core.check(result.returncode == 0, result.stderr.strip() or 'Failikontroll ebaõnnestus')
    return json.loads(result.stdout)

def consistency(observations, comparison):
    """Detect a changed single-word identity; never infer a scale or enable writing."""
    step = comparison['step']
    pids = [v['pid'] for v in comparison['changedWords']]
    for old in observations:
        old_step = old['step']
        old_pids = [v['pid'] for v in old['changedWords']]
        if old_step['channel'] != step['channel'] or len(pids) != 1 or len(old_pids) != 1:
            continue
        if old_step['parameter'] == step['parameter']:
            core.check(pids == old_pids, 'Sama juhi asemel muutus teine parameetrisõna. Taasta viimane edukas fail ja kontrolli juhi nime.')
        else:
            core.check(pids != old_pids, 'Eri juhtide nime all muutus sama parameetrisõna. Kontrolli juhi nime; GET-i ei saadetud.')

def resume(root):
    core.check(not root.is_symlink(), 'Sessioonikausta sümbollink ei sobi')
    root.mkdir(parents=True, exist_ok=True)
    expected = {'kind': 'FM3_FILTER_CONTROLS', 'version': 1, 'firmware': 13,
                'planSha256': hashlib.sha256((HERE / 'plan.json').read_bytes()).hexdigest(),
                'baselineSha256': hashlib.sha256((HERE / 'baseline.syx').read_bytes()).hexdigest()}
    path = root / 'session.json'
    core.check(not path.is_symlink(), 'Sümbollink ei sobi')
    if path.exists():
        core.check(json.loads(path.read_text()) == expected, 'Sessiooni plaan või alus erineb')
    else:
        core.check(not list(root.iterdir()), 'Uus sessioonikaust peab olema tühi')
        dump(path, expected)
    offline('preflight', HERE / 'baseline.syx')
    previous, index, observations = HERE / 'baseline.syx', 0, []
    for folder in sorted(root.glob('step-*')):
        core.check(folder.is_dir() and not folder.is_symlink(), 'Vigane katsekaust')
        for name in ['result.json', 'donor.syx', 'capture.json']:
            core.check(not (folder / name).is_symlink(), 'Sümbollink ei sobi')
        if not (folder / 'result.json').exists():
            continue  # Interrupted attempts are retained, never accepted as evidence.
        result = json.loads((folder / 'result.json').read_text())
        if result.get('status') not in ('passed', 'skipped'):
            continue
        core.check(index < len(PLAN) and result.get('index') == index and result.get('step') == PLAN[index], 'Katsete järjekord või ülesanne on vigane')
        if result['status'] == 'passed':
            core.check(result.get('displayConfirmed') is True, 'Ekraaniväärtuse kinnitus puudub')
            value = result.get('displayValue')
            core.check(type(value) in (int, float) and math.isfinite(value), 'Ekraaniväärtus on vigane')
            comparison = offline('compare', previous, folder / 'donor.syx', index)
            core.check(comparison == result.get('comparison'), 'Salvestatud võrdlus erineb failidest')
            consistency(observations, comparison)
            pair = offline('pair', folder)
            core.check(pair == result.get('pair'), 'Salvestatud GET/SYX raport erineb tõenditest')
            observations.append(comparison)
            previous = folder / 'donor.syx'
        else:
            core.check(isinstance(result.get('reason'), str) and result['reason'].strip(), 'Vahelejätmise põhjus puudub')
        index += 1
    return index, previous, observations

def export_zip(root):
    resume(root)
    out = root.parent / ('FM3_FILTER_CONTROLS_' + datetime.datetime.now().strftime('%Y%m%dT%H%M%S') + '_' + uuid.uuid4().hex[:8] + '.zip')
    with zipfile.ZipFile(out, 'x', zipfile.ZIP_DEFLATED, strict_timestamps=False) as archive:
        for name in ['plan.json', 'baseline.syx']:
            archive.write(HERE / name, name)
        for path in sorted(root.rglob('*')):
            core.check(not path.is_symlink(), 'Sümbollink ei sobi')
            if path.is_file():
                archive.write(path, str(path.relative_to(root)))
    print('\nSaada vestlusse tulemuste ZIP: ' + str(out))
    return out

def capture(folder, port):
    report = {'schemaVersion': 1, 'collectorVersion': 'filter-controls-0.1.1', 'firmwareDeclared': 13,
              'date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'port': port,
              'txHex': core.GET.hex(), 'txCalls': 0, 'rxChunks': [], 'status': 'pending'}
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

def display_value(answer, step):
    value = step['value'] if not answer.strip() else float(answer.strip().replace(',', '.'))
    core.check(math.isfinite(value), 'Sisesta lõplik arv')
    if step['parameter'] in ('Frequency', 'Q'):
        core.check(value > 0, 'Frequency ja Q peavad olema positiivsed')
    return value

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--session', default=str(HERE / 'FM3_FILTER_CONTROLS_SESSION'))
    parser.add_argument('--port')
    parser.add_argument('--export-only', action='store_true')
    args = parser.parse_args()
    core.check(shutil.which('node'), 'Node puudub')
    root = Path(args.session).expanduser().absolute()
    index, previous, observations = resume(root)
    if args.export_only:
        export_zip(root)
        return
    core.check(args.port and args.port.startswith('/dev/cu.'), 'Anna kinnitatud macOS port --port /dev/cu.…')
    print('Filter: 18 sihitud mõõtepunkti. q = tulemuste ZIP ja lõpeta; s = jäta mõõtmata (põhjus salvestatakse).')
    print('Algne import/tagasieksport on juba kinnitatud; uut algkontrolli ei küsita.')
    print('FM3-Editis peab lähteolek vastama sellele failile: ' + str(previous))
    print('Jätkamisel impordi viimane edukas fail. Hoia Scene2 ja Filter bypass; Type, Order, muud plokid/stseenid ja expression jäta samaks.')
    print('Muutused on järjestikused: ära nulli eelmiste sammude väärtusi. Save/Store pole vajalik.')
    try:
        while index < len(PLAN):
            step = PLAN[index]
            print('\nKatse %d/%d: %s\n%s' % (index + 1, len(PLAN), step['id'], step['instruction']))
            answer = input('Lohista eksporditud terve SYX siia [q/s]: ').strip()
            if answer.lower() == 'q':
                break
            if answer.lower() == 's':
                reason = input('Põhjus (väärtus juba sama / juht puudub; täpsusta): ').strip()
                core.check(reason, 'Põhjus on vajalik')
                print('Taasta enne järgmist sammu viimase eduka faili olek: ' + str(previous))
                folder = root / ('step-%02d-%s' % (index, uuid.uuid4().hex[:10]))
                folder.mkdir()
                dump(folder / 'result.json', {'index': index, 'step': step, 'status': 'skipped', 'reason': reason})
                index += 1
                continue
            parts = shlex.split(answer)
            core.check(len(parts) == 1, 'Lohista üks fail')
            data = Path(parts[0]).expanduser().read_bytes()
            folder = root / ('step-%02d-%s' % (index, uuid.uuid4().hex[:10]))
            folder.mkdir()
            (folder / 'donor.syx').write_bytes(data)
            result = {'index': index, 'step': step, 'status': 'pending'}
            try:
                comparison = offline('compare', previous, folder / 'donor.syx', index)
                consistency(observations, comparison)
                result['comparison'] = comparison
                if comparison.get('presetNameChange'):
                    names = comparison['presetNameChange']
                    print('MÄRKUS: preseti nimi muutus: %s → %s. Nimevälja erinevus salvestatakse raportisse.' % (names['before'], names['after']))
                print('Filter %s: muutus %d parameetrisõna; teised kanalid, Type ja bypass säilisid.' % (step['channel'], len(comparison['changedWords'])))
                if len(comparison['changedWords']) > 1:
                    print('Seotud sõnade muudatus salvestatakse analüüsiks; seda ei loeta valmis parameetriskaalaks.')
                shown = input('Kontrolli ekraanilt %s. Enter = %s %s; ümarduse korral sisesta tegelik arv samas ühikus (q = lõpeta): ' % (step['parameter'], step['value'], step['unit'])).strip()
                if shown.lower() == 'q':
                    result['status'] = 'cancelled'
                    dump(folder / 'result.json', result)
                    break
                result['displayValue'] = display_value(shown, step)
                confirm = input('Muutsid ainult nimetatud juhti? Sulge FM3-Edit ja Fractal-Bot. Lubad ühe Filter GET-lugemise? [jah/q]: ').strip().lower()
                if confirm != 'jah':
                    result['status'] = 'cancelled'
                    dump(folder / 'result.json', result)
                    break
                result['displayConfirmed'] = True
                result['pair'] = capture(folder, args.port)
                result['status'] = 'passed'
                dump(folder / 'result.json', result)
            except (Exception, KeyboardInterrupt) as error:
                result.update(status='failed', error=str(error) or 'Katkestatud')
                dump(folder / 'result.json', result)
                raise
            print('PASS: GET/SYX 148/148. Ekraaniväärtus salvestatud; skaala kinnitamine järgneb analüüsis.')
            previous = folder / 'donor.syx'
            observations.append(comparison)
            index += 1
            if index < len(PLAN):
                print('Ava FM3-Edit ja jätka samast seisundist järgmise sammuga.')
        if index == len(PLAN):
            print('Plaan läbitud. Vahele jäetud samme ei loeta mõõdetuks; generaatori kirjutustugi lisandub alles tõendite analüüsi järel.')
    finally:
        export_zip(root)

if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        print('PEATATUD: ' + (str(error) or 'Katkestatud') + '\nAndmed säilivad; automaatset korduspäringut ei tehta. Käivita sama käsk jätkamiseks.', file=sys.stderr)
        sys.exit(1)

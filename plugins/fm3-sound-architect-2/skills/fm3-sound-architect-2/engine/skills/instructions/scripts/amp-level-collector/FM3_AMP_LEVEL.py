#!/usr/bin/env python3
"""FM3 FW13.0 Amp A-D Level evidence collector. Python 3.9+, stdlib only.
Five manual preset exports; one operator-confirmed read-only GET per attempt.
No SET/SAVE, automatic retry, scale assumption, or generated device preset.
"""
import argparse
import datetime
import fcntl
import hashlib
import json
import os
import shlex
import shutil
import subprocess
import sys
import uuid
import zipfile
from pathlib import Path
import amp_transport

HERE = Path(__file__).resolve().parent
BASE = HERE / 'ALUSTA_SIIT.syx'
PLAN = json.loads((HERE / 'plan.json').read_text(encoding='utf-8'))
VERSION = '1.0.0'
TOOLS = ['FM3_AMP_LEVEL.py', 'amp_transport.py', 'level-check.mjs',
         'fm3-prototype.mjs', 'fm3-codec.mjs', 'plan.json', 'ALUSTA_SIIT.syx']


class Paused(Exception):
    pass


def check(ok, message):
    if not ok:
        raise ValueError(message)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def write_json(path, value):
    path = Path(path)
    tmp = path.with_name(path.name + '.' + uuid.uuid4().hex + '.tmp')
    with tmp.open('x', encoding='utf-8') as out:
        json.dump(value, out, ensure_ascii=False, indent=2)
        out.write('\n')
        out.flush()
        os.fsync(out.fileno())
    os.replace(str(tmp), str(path))


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def offline(*args):
    check(shutil.which('node'), 'Node puudub. Paigalda Node.js ja käivita uuesti.')
    run = subprocess.run(['node', str(HERE / 'level-check.mjs'), *map(str, args)],
                         text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    check(run.returncode == 0, run.stderr.strip() or 'Offline-kontroll ebaõnnestus')
    return json.loads(run.stdout)


def hashes():
    return {name: digest(HERE / name) for name in TOOLS}


def initialize(session):
    check(digest(BASE) == PLAN['baselineSha256'], 'Algfaili räsi ei vasta plaanile')
    offline('preflight', BASE)
    check(not (session / 'session.json').exists(), 'Sessioon on juba olemas')
    check(not list(session.glob('attempt-*')), 'Sessioonimärgis puudub; säilita see kaust uurimiseks ja vali uus --session')
    shutil.copyfile(BASE, session / 'baseline.syx')
    shutil.copyfile(HERE / 'plan.json', session / 'plan.json')
    write_json(session / 'session.json', {
        'kind': PLAN['kind'], 'collectorVersion': VERSION, 'createdAt': now(),
        'firmwareDeclared': '13.0', 'packageHashes': hashes(),
        'monitoringMutedConfirmed': True,
        'scope': 'Candidate measurements, not new generator support'})


def resume(session):
    marker = read_json(session / 'session.json')
    check(marker.get('kind') == PLAN['kind'] and marker.get('collectorVersion') == VERSION,
          'Vale sessioon või koguri versioon')
    check(marker.get('firmwareDeclared') == '13.0' and marker.get('monitoringMutedConfirmed') is True,
          'Sessiooni seadistuskinnitus puudub')
    check(marker.get('packageHashes') == hashes(), 'Pakett on sessiooni algusest muutunud')
    check(digest(session / 'baseline.syx') == PLAN['baselineSha256'], 'Sessiooni algfail muutus')
    check(digest(session / 'plan.json') == digest(HERE / 'plan.json'), 'Sessiooni plaan muutus')
    passed, retained = {}, []
    for folder in sorted(session.glob('attempt-*')):
        check(folder.is_dir() and not folder.is_symlink(), 'Vigane katsekaust')
        file = folder / 'attempt.json'
        if not file.exists():
            retained.append(folder.name)
            continue
        item = read_json(file)
        if item.get('status') != 'passed':
            retained.append(folder.name)
            continue
        index = item.get('index')
        check(type(index) is int and 0 <= index < len(PLAN['steps']), 'Vigane edukas sammunumber')
        check(index not in passed, 'Sama sammu jaoks leidub mitu edukat katset')
        check(item.get('step') == PLAN['steps'][index] and item.get('labelsConfirmed') is True,
              'Sammu väärtuste käsitsi kinnitus puudub')
        passed[index] = (folder, item)
    check(sorted(passed) == list(range(len(passed))), 'Edukas mõõteseeria on katkendlik')
    previous = session / 'baseline.syx'
    for index in range(len(passed)):
        folder, item = passed[index]
        comparison = offline('compare', previous, folder / 'donor.syx', index)
        check(read_json(folder / 'comparison.json') == comparison, 'Varasem võrdlusraport muutus')
        paired = offline('pair', folder)
        check(read_json(folder / 'pair.json') == paired, 'Varasem GET/SYX raport muutus')
        check(item.get('syxSha256') == paired['syxSha256'], 'Varasema katse SYX-räsi muutus')
        previous = folder / 'donor.syx'
    return len(passed), previous, retained


def prepare(session, donor, index, previous):
    # No serial access occurs until BOTH independent offline comparisons pass.
    comparison = offline('compare', previous, donor, index)
    folder = session / ('attempt-%02d-%s' % (index + 1, uuid.uuid4().hex[:12]))
    folder.mkdir()
    shutil.copyfile(donor, folder / 'donor.syx')
    copied = offline('compare', previous, folder / 'donor.syx', index)
    check(copied == comparison, 'Ekspordifail muutus kopeerimise ajal; GET-i ei saadetud')
    item = {'index': index, 'step': PLAN['steps'][index], 'createdAt': now(),
            'status': 'prepared', 'syxSha256': comparison['syxSha256'], 'labelsConfirmed': False}
    write_json(folder / 'comparison.json', comparison)
    write_json(folder / 'attempt.json', item)
    return folder, item


def capture(folder, item, port):
    check(item.get('labelsConfirmed') is True, 'Leveli väärtused pole kinnitatud')
    check(item.get('status') == 'prepared' and not (folder / 'capture.json').exists(),
          'Sama katse korduvat GET-i ei lubata')
    check(digest(folder / 'donor.syx') == item['syxSha256'], 'SYX muutus enne GET-i')
    item['status'] = 'capturing'
    write_json(folder / 'attempt.json', item)
    report = {'schemaVersion': 1, 'collectorVersion': VERSION, 'date': now(),
              'firmwareDeclared': '13.0', 'port': port, 'syxSha256': item['syxSha256'],
              'txHex': amp_transport.GET.hex(), 'txCalls': 0, 'rxChunks': [], 'status': 'pending'}
    write_json(folder / 'capture.json', report)
    try:
        report['decoded'] = amp_transport.collect(port, report)
        report['status'] = 'captured'
        write_json(folder / 'capture.json', report)
        paired = offline('pair', folder)
        write_json(folder / 'pair.json', paired)
        item['status'] = 'passed'
        item['completedAt'] = now()
    except (Exception, KeyboardInterrupt) as exc:
        if report['status'] != 'captured':
            report['status'] = 'failed'
        report['error'] = str(exc) or 'Katkestatud'
        item['status'] = 'failed'
        item['error'] = report['error']
        raise
    finally:
        write_json(folder / 'capture.json', report)
        write_json(folder / 'attempt.json', item)


def export_session(session):
    target = session.parent / (session.name + '_TULEMUSED.zip')
    temp = target.with_name(target.name + '.' + uuid.uuid4().hex + '.tmp')
    with zipfile.ZipFile(temp, 'w', zipfile.ZIP_DEFLATED) as out:
        for file in sorted(session.rglob('*')):
            if file.is_file() and not file.is_symlink() and file.name != '.collector.lock' and not file.name.endswith('.tmp'):
                out.write(file, str(Path('session') / file.relative_to(session)))
    os.replace(str(temp), str(target))
    return target


def ask(prompt):
    try:
        value = input(prompt).strip()
    except EOFError:
        raise Paused()
    if value.lower() == 'q':
        raise Paused()
    return value


def confirm(prompt):
    while ask(prompt).lower() != 'jah':
        print('Kirjuta jah või q. GET-i pole saadetud.')


def donor_path(value):
    # Finder drag-and-drop escapes and quoted paths are accepted without a shell.
    direct = Path(value).expanduser()
    if direct.is_file():
        return direct.resolve()
    parts = shlex.split(value)
    check(len(parts) == 1, 'Lohista üks SYX-fail või sisesta selle täielik tee')
    file = Path(parts[0]).expanduser().resolve()
    check(file.is_file() and file.suffix.lower() == '.syx', 'SYX-faili ei leitud')
    return file


def run(session, port):
    if not (session / 'session.json').exists():
        print('Uus 5-sammuline Amp Leveli katse. Iga sammu kohta üks eksport ja üks GET.')
        print('Laadi ALUSTA_SIIT.syx FM3-Editi kaudu, vali Scene 2 ja Amp B.')
        print('Vaigista füüsiline kuulamisahel: katse sisaldab +20 dB. Ära muuda presetis selleks väljundtaset.')
        check(ask('FM3 firmware versioon (vajalik 13.0; q = paus): ') == '13.0',
              'See mõõteplaan on ainult kinnitatud firmware 13.0 jaoks')
        confirm('Algpreset laetud ja füüsiline kuulamisahel vaigistatud? [jah/q]: ')
        initialize(session)
    index, previous, retained = resume(session)
    print('Kontrollitud samme: %d/5. Säilitatud pooleli/ebaõnnestunud katseid: %d.' % (index, len(retained)))
    if index == 5:
        print('Kõik viis paari kogutud. Uusi päringuid ei saadeta.')
        return
    print('Jätkamise alus: ' + str(previous))
    print('Kui seadme olek muutus, taasta see fail FM3-Editis. Kogu katse ajal hoia kuulamisahel vaigistatud.')
    while index < 5:
        step = PLAN['steps'][index]
        print('\nSAMM %d/5 — Amp Level: %s' % (index + 1, ', '.join('%s = %+g dB' % (ch, db) for ch, db in step['levelDb'].items())))
        print('Muuda A, B, C ja D Levelit. Naase Scene 2 / Amp B juurde ning ekspordi üks SYX.')
        file = donor_path(ask('Lohista siia eksporditud SYX-fail [q = paus]: '))
        folder, item = prepare(session, file, index, previous)
        print('Failikontroll läbitud: muutusid ainult neli Level-sõna; muu presetisisu säilis.')
        print('Kontrolli nelja dB-näitu ekraanilt: ' + ', '.join('%s=%+g' % pair for pair in step['levelDb'].items()))
        print('SYX ei kinnita dB-silte. Sulge FM3-Edit pärast kontrolli, säilitades seadme oleku.')
        try:
            confirm('Näidud vastavad; luban ühe Amp GET-i sellelt seadmelt? [jah/q]: ')
        except Paused:
            item['status'] = 'cancelled'
            write_json(folder / 'attempt.json', item)
            raise
        item['labelsConfirmed'] = True
        item['confirmedAt'] = now()
        write_json(folder / 'attempt.json', item)
        capture(folder, item, port)
        print('GET ja SYX kattuvad kõigis 576 Amp-sõnas. Samm salvestatud.')
        index, previous, _ = resume(session)
        print('Tulemus: ' + str(export_session(session)))
        if index < 5:
            print('Järgmise muutmise jaoks ava FM3-Edit uuesti; ära laadi vana presetti.')
    print('Valmis: 5 paari / 20 kandidaatmõõtepunkti. Laadi tulemuste ZIP vestlusse.')
    print('Taasta oma muusikaline preset enne kuulamisahela sisselülitamist.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', help='Kinnitatud macOS /dev/cu.* seade')
    parser.add_argument('--session', type=Path, default=HERE / 'FM3_AMP_LEVEL_session')
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--status', action='store_true', help='Ainult failikontroll; seadet ei avata')
    modes.add_argument('--export-only', action='store_true', help='Paki olemasolevad tõendid; seadet ei avata')
    modes.add_argument('--list-ports', action='store_true', help='Näita /dev/cu.* nimesid; seadet ei avata')
    args = parser.parse_args()
    if args.list_ports:
        print('\n'.join(str(p) for p in sorted(Path('/dev').glob('cu.*'))) or 'Ühtegi /dev/cu.* porti ei leitud.')
        return 0
    if not args.status and not args.export_only:
        check(args.port and args.port.startswith('/dev/cu.'), 'Vali --port /dev/cu.... ; nime vaatamiseks kasuta --list-ports')
    session = args.session.expanduser().resolve()
    if (args.status or args.export_only) and not (session / 'session.json').exists():
        print('Sellel teel ei ole alustatud sessiooni: ' + str(session))
        return 1
    session.mkdir(parents=True, exist_ok=True)
    with (session / '.collector.lock').open('a') as lock:
        try:
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError('See sessioon on teises protsessis avatud')
        status = 0
        try:
            if args.status or args.export_only:
                index, previous, retained = resume(session)
                print(json.dumps({'passed': index, 'total': 5, 'previous': str(previous), 'retainedAttempts': retained}, ensure_ascii=False, indent=2))
            else:
                run(session, args.port)
        except (Paused, KeyboardInterrupt):
            print('Paus. Jätka hiljem sama käsuga ja sama sessioonikaustaga.')
        except Exception as exc:
            print('Peatatud: %s. Automaatset korduspäringut ei tehta.' % exc, file=sys.stderr)
            status = 1
        finally:
            if not args.status and (session / 'session.json').exists():
                print('Laadi vestlusse: ' + str(export_session(session)))
        return status


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (Exception, KeyboardInterrupt) as exc:
        print(str(exc) or 'Katkestatud', file=sys.stderr)
        sys.exit(1)

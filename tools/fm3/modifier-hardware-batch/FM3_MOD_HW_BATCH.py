#!/usr/bin/env python3
"""One bounded, resumable-evidence FM3 experiment; never resumes device writes."""
import argparse
import datetime
import glob
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import uuid
import zipfile
from transport import Journal, Serial, require

HERE = Path(__file__).resolve().parent


def write_json(path, obj):
    tmp = path.with_suffix(path.suffix+'.tmp')
    with tmp.open('w', encoding='utf8') as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write('\n')
        f.flush()
        os.fsync(f.fileno())
    tmp.replace(path)


def offline(*args):
    p = subprocess.run(['node', str(HERE/'check.mjs'), *map(str, args)],
                       capture_output=True, text=True, timeout=30)
    require(p.returncode == 0, p.stderr.strip() or 'Offline check failed')
    return json.loads(p.stdout)


def run_steps(link, plan, baseline, report, checkpoint):
    # All 25 MOD words and all four Wah channels are checked before the first SET.
    current = link.get(3, 25, 'preflight-mod')
    report['preflightModWords'] = current
    require(current == baseline['modWords'], 'MOD algseis ei vasta lähtefailile; 0 SET')
    wah = link.get(94, 100, 'preflight-wah')
    report['preflightWahWords'] = wah
    require(wah == baseline['wahWords'], 'Wah algseis ei vasta lähtefailile; 0 SET')
    require(link.get(3, 25, 'preflight-mod-repeat') == current, 'Unstable initial MOD words; 0 SET')
    report['preflightPassed'] = True
    checkpoint()
    for step in plan['steps']:
        row = dict(step, beforeWords=current.copy(), status='write-intent')
        report['steps'].append(row)
        checkpoint()
        link.set(step)
        row['status'] = 'set-sent-awaiting-independent-read'
        checkpoint()
        after = link.get(3, 25, step['id']+'-read-1')
        row['afterWords'] = after
        checkpoint()
        require(len(after) == 25, 'Wrong MOD vector length')
        require(all(a == b for i, (a, b) in enumerate(zip(current, after)) if i != step['pid']),
                'Unrequested modifier field changed; stopped')
        repeat = link.get(3, 25, step['id']+'-read-2')
        row['repeatWords'] = repeat
        require(repeat == after, 'Independent reads disagree; stopped')
        require(after[step['pid']] <= 65534, 'Unexpected numeric sentinel')
        if step.get('allowedModelWords') is not None:
            require(after[step['pid']] in step['allowedModelWords'], 'Observation outside bounded models; stopped')
        row['observedRaw'] = after[step['pid']]
        row['changed'] = after != current
        # A no-op step is not credited as proof that SET executed.
        row['conversionWitness'] = row['changed']
        row['status'] = 'captured'
        current = after
        report['lastVerifiedWords'] = current
        checkpoint()
        print('%s: PID %d, op %d, %s -> raw %d%s' %
              (step['id'], step['pid'], step['operation'], step['inputBits'], row['observedRaw'],
               '' if row['changed'] else ' (no change; not an execution witness)'), flush=True)
    report['finalWahWords'] = link.get(94, 100, 'final-wah')
    require(report['finalWahWords'] == wah, 'Wah parameter storage changed; stopped')
    report['status'] = 'captured-awaiting-final-export'
    checkpoint()


def bundle(folder):
    dest = folder.with_suffix('.zip')
    temporary = dest.with_suffix('.zip.tmp')
    with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in sorted(folder.rglob('*')):
            if path.is_file():
                z.write(path, str(Path(folder.name)/path.relative_to(folder)))
    temporary.replace(dest)
    print('\nTULEMUSED: '+str(dest), flush=True)
    return dest


def attach_export(folder, report):
    require(report['status'] in ('captured-awaiting-final-export', 'final-export-check-failed'),
            'Incomplete run: keep the existing evidence; do not repeat hardware writes')
    print('\nPort on suletud. Ava FM3-Edit ja lase sel lugeda seadme praegune edit buffer.')
    print('Ära impordi, vali teist presetti ega muuda midagi. Ekspordi kogu preset:')
    print('FM3_MOD_HW_FINAL_export.syx')
    print('STORE pole vajalik. Lohista eksport siia ja vajuta Enter; q jätab ZIP-i ilma ekspordita.')
    value = input('SYX: ').strip()
    if value.lower() == 'q':
        return
    paths = shlex.split(value)
    require(len(paths) == 1, 'Expected one dragged file path')
    path = Path(paths[0]).expanduser().resolve()
    require(path.is_file(), 'Export file not found: '+str(path))
    dest = folder/'FM3_MOD_HW_FINAL_export.syx'
    if path != dest:
        shutil.copyfile(path, dest)
    try:
        report['exportCheck'] = offline('final', folder)
        report['status'] = 'complete-bounded-hardware-capture'
    except Exception as exc:
        report['status'] = 'final-export-check-failed'
        report['exportError'] = str(exc)
        raise


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--port')
    ap.add_argument('--offline', action='store_true', help='validate package; no device I/O')
    ap.add_argument('--finish', type=Path, help='attach final export to existing session; no device I/O')
    ap.add_argument('--pack-only', type=Path, help='repack existing evidence; no device I/O')
    a = ap.parse_args()
    require(sum(bool(x) for x in (a.offline, a.finish, a.pack_only)) <= 1, 'Choose one mode')
    if a.pack_only:
        bundle(a.pack_only.resolve())
        return
    if a.finish:
        folder = a.finish.resolve()
        report = json.loads((folder/'report.json').read_text())
        try:
            attach_export(folder, report)
        finally:
            write_json(folder/'report.json', report)
            bundle(folder)
        return
    baseline = offline('baseline')
    plan = json.loads((HERE/'plan.json').read_text())
    require(plan['schemaVersion'] == 1 and plan['target']['wireEffectId'] == 3, 'Wrong plan')
    require(hashlib.sha256((HERE/'plan.json').read_bytes()).hexdigest() == baseline['planSha256'], 'Plan changed')
    if a.offline:
        print(json.dumps(dict(status='offline-ok', steps=len(plan['steps']), **baseline)))
        return
    print('FM3 FW13 MOD koondkatse — '+str(len(plan['steps']))+' automaatset SET-sammu.')
    print('Loe esmalt LOE_MIND.md. Impordi kaasasolev BASELINE.syx edit bufferisse,')
    print('vali Scene 2 / Wah 1 A (bypass), sulge FM3-Edit ja Fractal-Bot.')
    print('Muudetakse ainult olemasoleva Wah Control modifikaatori arvuvälju.')
    print('Modifikaatori kanaliseos jääb ALL. STORE, presetivalikut ja taastuskirjutust ei saadeta.')
    require(input('Kirjuta seadme firmware versioon (ainult 13.00): ').strip() in ('13.00', '13.0'),
            'Only declared FW13.00 is in scope')
    ports = sorted(glob.glob('/dev/cu.usbmodem*'))
    if a.port:
        port = a.port
    elif len(ports) == 1:
        port = ports[0]
    else:
        print('Leitud pordid: '+(', '.join(ports) or '(puuduvad)'))
        port = input('FM3 täpne /dev/cu.usbmodem... port: ').strip()
    require(port in ports, 'Choose an existing /dev/cu.usbmodem* port')
    require(input('Alus imporditud, FW13.00, editor suletud; käivita katse? [jah/q]: ').strip().lower() == 'jah',
            'Cancelled before device I/O')
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    folder = HERE/('FM3_MOD_HW_RESULTS_'+stamp+'_'+uuid.uuid4().hex[:6])
    folder.mkdir()
    shutil.copyfile(HERE/'plan.json', folder/'plan.json')
    report = dict(schemaVersion=1, status='pending', firmwareDeclared='13.00', firmwareDetected=None,
                  port=port, baseline=baseline, steps=[], preflightPassed=False,
                  fullRangeEncodingProven=False, generatorWriteSupportAdded=False,
                  durableStoreTested=False, newReaAnalysis=False)
    checkpoint = lambda: write_json(folder/'report.json', report)
    checkpoint()
    failed = False
    try:
        with Serial(port, Journal(folder/'wire.jsonl')) as link:
            run_steps(link, plan, baseline, report, checkpoint)
        attach_export(folder, report)
    except (Exception, KeyboardInterrupt) as exc:
        failed = True
        report['error'] = type(exc).__name__+': '+str(exc)
        if report['status'] not in ('captured-awaiting-final-export', 'final-export-check-failed'):
            report['status'] = 'stopped-no-retry'
        print('\nPEATATUD: '+report['error'], file=sys.stderr)
        print('Ära korda katset. Saada tulemuste ZIP; salvestatud osatulemus jääb alles.', file=sys.stderr)
    finally:
        checkpoint()
        bundle(folder)
    if failed:
        sys.exit(2)


if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as exc:
        print(type(exc).__name__+': '+str(exc), file=sys.stderr)
        sys.exit(2)

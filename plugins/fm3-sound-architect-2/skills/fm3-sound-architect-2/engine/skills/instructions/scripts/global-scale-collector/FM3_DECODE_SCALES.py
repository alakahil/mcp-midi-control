#!/usr/bin/env python3
"""Decode an existing global-scale capture ZIP. Offline only; no serial access.

Display/value agreement is an observation, not device authentication, a new
hardware range test, or permission to write global settings into a preset.
"""
import argparse
import datetime
import hashlib
import io
import json
import math
from pathlib import Path
import re
import stat
import struct
import sys
import tempfile
import zipfile

sys.dont_write_bytecode = True
import FM3_GLOBAL_SCALES as collector

COLLECTOR_SHA = '246114c37e53525a6445857042407b88dd4994a4849b8d664f8a604bc1ce0ad4'
MAX_ZIP = 64 * 1024 * 1024
MAX_JSON = 4 * 1024 * 1024
require = collector.require
sha = collector.sha
ASSESSMENT = {
    'status': 'display-value-crosschecked', 'unit': 'semitones',
    'numericInterpretation': 'float32 crosschecked with device display text',
    'contentsVerified': False, 'liveGetEncodingVerified': False,
    'deviceIO': False, 'newHardwareRangeValidation': False,
    'limits': 'Capture-time observations only. Hashes are integrity references, not device authentication. '
              'Static/synthetic codec checks do not prove a hardware range. Global contents are not in preset SYX.',
}


def strict_json(raw):
    require(len(raw) <= MAX_JSON, 'JSON exceeds size limit')
    def pairs(items):
        obj = {}
        for key, value in items:
            require(key not in obj, 'Duplicate JSON key: ' + key)
            obj[key] = value
        return obj
    def bad(value):
        raise ValueError('Non-finite JSON number: ' + value)
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=bad)


def timestamp(value):
    require(isinstance(value, str), 'Missing capture timestamp')
    t = datetime.datetime.fromisoformat(value.replace('Z', '+00:00'))
    require(t.tzinfo is not None, 'Capture timestamp requires timezone')
    return t


def decode_frame(frame, pid):
    require(type(pid) is int and 902 <= pid <= 1285, 'Invalid observation PID')
    require(len(frame) == 60, 'Observation must contain exactly one 60-byte frame')
    require(collector.matching_frame(frame, pid) == frame, 'Noncanonical observation frame')
    require(frame[17:19] == b'\0\0', 'Unsupported parameter-info flags')
    # Text: continuous MSB-first septets (seven raw bytes per eight septets).
    value = 0
    for octet in frame[21:58]:
        value = (value << 7) | octet
    raw_text = (value >> 3).to_bytes(32, 'big')
    text = raw_text.rstrip(b'\0').decode('ascii')
    require(re.fullmatch(r'(0|[+-]?[1-9][0-9]*) semi', text) is not None,
            'Unrecognized global-scale display text')
    shift = int(text.split(' ')[0])
    require(-24 <= shift <= 24, 'Displayed shift outside -24..24 semitones')
    bits = sum(frame[12+i] << (7*i) for i in range(5))
    number = struct.unpack('<f', struct.pack('<I', bits))[0]
    require(math.isfinite(number) and number == shift, 'Numeric value and display text disagree')
    return {'pid': pid, 'note': collector.NOTES[(pid-902) % 12],
            'shiftSemitones': shift, 'displayText': text, 'valueBitsHex': f'{bits:08x}',
            'frameHex': frame.hex(), 'frameSha256': sha(frame)}


def document(source, frames):
    require(isinstance(source, dict), 'Missing observation provenance')
    expected = {'archiveSha256', 'sessionSha256', 'summarySha256', 'collectorSha256',
                'nativeMappingEvidenceSha256', 'firmwareMapping', 'startedAt', 'endedAt',
                'firmwareIdentityVerified', 'deviceSerialVerified', 'atomicSnapshot'}
    require(set(source) == expected, 'Unexpected observation provenance fields')
    for key in ('archiveSha256', 'sessionSha256', 'summarySha256', 'collectorSha256', 'nativeMappingEvidenceSha256'):
        require(isinstance(source[key], str) and re.fullmatch('[0-9a-f]{64}', source[key]), 'Invalid provenance hash: ' + key)
    require(source['collectorSha256'] == COLLECTOR_SHA, 'Unknown collector revision')
    require(source['nativeMappingEvidenceSha256'] == collector.EVIDENCE_SHA and source['firmwareMapping'] == '13.0', 'Unknown native mapping')
    require(all(source[k] is False for k in ('firmwareIdentityVerified', 'deviceSerialVerified', 'atomicSnapshot')), 'Unproven device identity/snapshot claim')
    require(timestamp(source['startedAt']) <= timestamp(source['endedAt']), 'Capture timestamps are reversed')
    require(frames and len(frames) <= 384, 'Expected 1..384 observations')
    require(len({pid for pid, _ in frames}) == len(frames), 'Duplicate observation PID')
    groups = {}
    for pid, frame in sorted(frames):
        note = decode_frame(frame, pid)
        groups.setdefault(1 + (pid-902)//12, []).append(note)
    for scale, notes in groups.items():
        require([n['pid'] for n in notes] == list(range(902+12*(scale-1), 914+12*(scale-1))), 'Missing notes in captured scale')
    return {'schemaVersion': 1, 'kind': 'fm3-global-scale-observations', 'source': source,
            'assessment': ASSESSMENT.copy(),
            'scales': [{'scale': scale, 'notes': notes} for scale, notes in groups.items()]}


def validate_document(obj):
    require(isinstance(obj, dict) and obj.get('kind') == 'fm3-global-scale-observations', 'Not a global-scale observation document')
    frames = []
    require(isinstance(obj.get('scales'), list), 'Missing observation scales')
    for scale in obj['scales']:
        require(isinstance(scale, dict) and isinstance(scale.get('notes'), list), 'Invalid observation scale')
        for row in scale['notes']:
            require(isinstance(row, dict) and isinstance(row.get('frameHex'), str), 'Missing observation frame')
            frames.append((row.get('pid'), bytes.fromhex(row['frameHex'])))
    rebuilt = document(obj.get('source'), frames)
    # Every decoded field and confidence flag is regenerated from retained frames.
    require(json.dumps(obj, sort_keys=True) == json.dumps(rebuilt, sort_keys=True), 'Observation document differs from retained evidence')
    return rebuilt


def decode_archive(path):
    path = Path(path)
    require(path.is_file() and path.stat().st_size <= MAX_ZIP, 'Capture ZIP missing or too large')
    raw = path.read_bytes()
    with zipfile.ZipFile(io.BytesIO(raw)) as z, tempfile.TemporaryDirectory(prefix='fm3-scales-decode-') as temp:
        entries = z.infolist()
        names = [e.filename for e in entries]
        require(3 <= len(entries) <= 2050 and len(names) == len(set(names)), 'Invalid/duplicate ZIP members')
        require(sum(e.file_size for e in entries) <= MAX_ZIP, 'Expanded ZIP exceeds size limit')
        require('session.json' in names and 'summary.json' in names, 'Missing session or summary')
        objects = {}
        for entry in entries:
            name = entry.filename
            require(name in ('session.json', 'summary.json') or re.fullmatch(r'attempt-[0-9]{6}\.json', name), 'Unexpected ZIP member')
            require(not entry.is_dir() and not stat.S_ISLNK(entry.external_attr >> 16), 'ZIP directory/symlink is not allowed')
            require(entry.file_size <= MAX_JSON, 'ZIP member too large')
            payload = z.read(entry)  # zipfile checks CRC; no archive paths are extracted.
            objects[name] = strict_json(payload)
            (Path(temp)/name).write_bytes(payload)
        require(sha(Path(collector.__file__).read_bytes()) == COLLECTOR_SHA, 'Bundled collector revision changed')
        session, completed = collector.audit(temp)
        summary = objects['summary.json']
        count = len(session['plan']['requests'])
        require(summary.get('captureComplete') is True and summary.get('error') is None and len(completed) == count, 'Capture is incomplete or failed')
        require(type(summary.get('completedRequests')) is int and summary['completedRequests'] == count and
                type(summary.get('expectedRequests')) is int and summary['expectedRequests'] == count, 'Capture summary count mismatch')
        for key in ('contentsVerified', 'liveGetEncodingVerified', 'atomicSnapshot'):
            require(summary.get(key) is False, 'Unexpected capture confidence flag')
        for key in ('selectorWrites', 'parameterWrites'):
            require(type(summary.get(key)) is int and summary[key] == 0, 'Capture includes a write claim')
        seen = set()
        for name in sorted(n for n in names if n.startswith('attempt-')):
            a = objects[name]
            require(a.get('purpose') in ('capture', 'resume-recheck'), 'Unknown attempt purpose')
            if a['status'] == 'captured':
                require((a['pid'] in seen) == (a['purpose'] == 'resume-recheck'), 'Duplicate capture or invalid resume evidence')
                seen.add(a['pid'])
        source = {'archiveSha256': sha(raw), 'sessionSha256': sha(z.read('session.json')),
                  'summarySha256': sha(z.read('summary.json')), 'collectorSha256': session['collectorSha256'],
                  'nativeMappingEvidenceSha256': session['plan']['nativeMappingEvidenceSha256'],
                  'firmwareMapping': session['plan']['nativeMappingFirmware'],
                  'startedAt': session['createdAt'], 'endedAt': summary['endedAt'],
                  'firmwareIdentityVerified': session['firmwareIdentityVerified'],
                  'deviceSerialVerified': session['deviceSerialVerified'], 'atomicSnapshot': False}
        return document(source, list(completed.items()))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--zip', type=Path, help='Existing collector results.zip')
    action.add_argument('--validate', help='Observation JSON path, or - for stdin')
    parser.add_argument('--out', type=Path, help='New JSON file; existing files are never overwritten')
    args = parser.parse_args()
    if args.zip:
        result = decode_archive(args.zip)
    else:
        if args.validate == '-':
            raw = sys.stdin.buffer.read(MAX_JSON+1)
        else:
            path = Path(args.validate)
            require(path.stat().st_size <= MAX_JSON, 'Observation JSON too large')
            raw = path.read_bytes()
        result = validate_document(strict_json(raw))
    encoded = json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False)+'\n'
    if args.out:
        with args.out.open('x', encoding='utf-8') as f:
            f.write(encoded)
    else:
        sys.stdout.write(encoded)


if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as exc:
        print(f'{type(exc).__name__}: {exc}', file=sys.stderr)
        sys.exit(1)

#!/usr/bin/env python3
"""Bounded FM3 parameter-info capture. No SET/SAVE/selector/preset commands.
A structurally valid response is research evidence, NOT a verified scale value.
Python standard library; macOS/Linux serial transport. Offline audit everywhere.
"""
import argparse
import datetime
import glob
import hashlib
import json
import os
from pathlib import Path
import select
import stat
import sys
import time
import zipfile

VERSION = 1
NOTES = ['A', 'A#/Bb', 'B', 'C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab']
EVIDENCE_SHA = '3d184e65494dbb74ee225a8eaf03a115ffa71e746902a2e88a86b0f1d5eb1aa7'
MAX_RX = 131072


def require(ok, message):
    if not ok:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def checksum(data):
    value = 0
    for b in data:
        value ^= b
    return value & 127


def request(pid):
    require(type(pid) is int and 902 <= pid <= 1285, 'Only global-scale PIDs 902..1285 are allowed')
    # fn 01, sub 1A (parameter-info READ), virtual GLOBAL effect 1.
    data = bytes([240, 0, 1, 116, 17, 1, 26, 0, 1, 0, pid & 127, pid >> 7] + [0] * 9)
    return data + bytes([checksum(data), 247])


def plan(scales):
    require(scales and all(type(s) is int and 1 <= s <= 32 for s in scales), 'Scales must be integers 1..32')
    scales = sorted(set(scales))
    return {'schemaVersion': VERSION, 'nativeMappingEvidenceSha256': EVIDENCE_SHA,
            'nativeMappingFirmware': '13.0', 'scales': scales,
            'requests': [{'effectId': 1, 'pid': 902 + 12 * (s - 1) + n,
                          'scale': s, 'noteIndex': n, 'note': note,
                          'txHex': request(902 + 12 * (s - 1) + n).hex()}
                         for s in scales for n, note in enumerate(NOTES)],
            'operation': 'parameter-info-read', 'selectorWrites': 0,
            'contentsVerified': False, 'liveGetEncodingVerified': False}


def load_plan(path):
    obj = json.loads(Path(path).read_text())
    expected = plan(obj.get('scales', []))
    # Accept ONLY the earlier data-only plan, never arbitrary commands from JSON.
    require(obj.get('schemaVersion') == 1 and obj.get('evidenceSha256') == EVIDENCE_SHA,
            'Unsupported native read plan or evidence hash')
    expected_requests = [{k: row[k] for k in ('effectId', 'pid', 'scale', 'noteIndex', 'note')} | {'operation': 'GET'}
                         for row in expected['requests']]
    require(obj.get('requests') == expected_requests and obj.get('requestCount') == len(expected_requests),
            'Read plan addresses/order do not match the pinned native mapping')
    return expected


class Framer:
    def __init__(self):
        self.partial = bytearray()
        self.frames = []

    def feed(self, data):
        for b in data:
            if b >= 248:  # preserve in raw RX, strip realtime only for framing
                continue
            if b == 240:
                require(not self.partial, 'Nested SysEx start')
                self.partial.append(b)
            elif self.partial:
                require(b == 247 or b < 128, 'Non-data byte inside SysEx')
                self.partial.append(b)
                require(len(self.partial) <= 8192, 'Frame too large')
                if b == 247:
                    self.frames.append(bytes(self.partial))
                    self.partial.clear()


def matching_frame(raw, pid):
    framer = Framer()
    framer.feed(raw)
    require(not framer.partial, 'Incomplete SysEx frame')
    matches = []
    for frame in framer.frames:
        require(len(frame) >= 8 and frame[-1] == 247 and checksum(frame[:-2]) == frame[-2],
                'Bad frame envelope/checksum')
        if frame[:12] == request(pid)[:12]:
            # FM9 primary capture gives 60 bytes for this action; FM3 is gated
            # on the same shape, never silently interpreted on an unknown shape.
            require(len(frame) == 60, 'Unsupported parameter-info response length (expected 60); raw RX retained')
            require(frame[16] <= 15, 'value32 exceeds 32 bits')
            require((frame[19] | frame[20] << 7) == 32, 'Expected a 32-byte decoded info tail')
            # 32*8 bits across 37 MSB-first septets leaves three padding bits.
            require(frame[57] & 7 == 0, 'Noncanonical info-tail padding')
            matches.append(frame)
    require(len(matches) == 1, 'Expected exactly one matching FM3 sub-1A/effect-1/PID response')
    return matches[0]


def atomic_json(path, value):
    tmp = path.with_suffix(path.suffix + '.tmp')
    with tmp.open('w') as f:
        json.dump(value, f, indent=2, ensure_ascii=False, allow_nan=False)
        f.write('\n')
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def archive(directory):
    tmp = directory / 'results.zip.tmp'
    with zipfile.ZipFile(tmp, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for path in [directory/'session.json', directory/'summary.json', *sorted(directory.glob('attempt-*.json'))]:
            z.write(path, path.name)
    os.replace(tmp, directory/'results.zip')


class Serial:
    """Only transaction() can transmit, and only request(pid) is accepted."""
    def __init__(self, port):
        self.port = port
        self.fd = None
        self.old = None

    def __enter__(self):
        import fcntl
        import termios
        import tty
        self.fd = os.open(self.port, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
        try:
            require(stat.S_ISCHR(os.fstat(self.fd).st_mode), 'Serial port must be a character device')
            self.old = termios.tcgetattr(self.fd)
            fcntl.flock(self.fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            if hasattr(termios, 'TIOCEXCL'):
                fcntl.ioctl(self.fd, termios.TIOCEXCL)
            tty.setraw(self.fd, termios.TCSANOW)
            attrs = termios.tcgetattr(self.fd)
            attrs[4] = attrs[5] = termios.B115200
            attrs[2] |= termios.CLOCAL | termios.CREAD
            termios.tcsetattr(self.fd, termios.TCSANOW, attrs)
        except BaseException:
            self.__exit__(None, None, None)
            raise
        return self

    def __exit__(self, *_):
        import termios
        if self.fd is not None:
            try:
                if self.old is not None:
                    termios.tcsetattr(self.fd, termios.TCSANOW, self.old)
            finally:
                os.close(self.fd)
                self.fd = None

    def transaction(self, pid, report, timeout):
        start = time.monotonic()
        raw = bytearray()
        pending = bytearray()
        try:
            # Drain before send, retaining all pre-existing traffic separately.
            deadline = start + timeout
            while select.select([self.fd], [], [], .10)[0]:
                data = os.read(self.fd, 4096)
                require(data, 'Serial EOF before request')
                pending.extend(data)
                require(len(pending) <= MAX_RX and time.monotonic() < deadline,
                        'Port is busy; close FM3-Edit and other MIDI tools')
            report['txCalls'] = 1
            report['txStartedAt'] = now()
            sent = os.write(self.fd, request(pid))  # sole device write, allowlisted GET only
            report['txBytesWritten'] = sent
            require(sent == 23, 'Partial GET write; no retry')
            start = time.monotonic()
            last_data = start
            framer = Framer()
            found = False
            while time.monotonic() - start < timeout:
                ready = select.select([self.fd], [], [], .05)[0]
                if ready:
                    data = os.read(self.fd, 4096)
                    require(data, 'Serial EOF')
                    raw.extend(data)
                    report['rxChunks'].append({'afterMs': round((time.monotonic()-start)*1000, 3), 'bytes': len(data)})
                    require(len(raw) <= MAX_RX, 'Response too large')
                    framer.feed(data)
                    last_data = time.monotonic()
                    found = any(f[:12] == request(pid)[:12] for f in framer.frames)
                if found and time.monotonic() - last_data >= .10:
                    return matching_frame(bytes(raw), pid)
            raise TimeoutError('No complete matching response; raw RX retained, no retry')
        finally:
            report['preRxHex'] = pending.hex()
            report['rawRxHex'] = raw.hex()
            report['rawRxSha256'] = sha(raw)


def audit(directory):
    directory = Path(directory)
    manifest = json.loads((directory / 'session.json').read_text())
    expected = plan(manifest['plan']['scales'])
    require(manifest['plan'] == expected, 'Session plan changed')
    require(manifest['collectorSha256'] == sha(Path(__file__).read_bytes()), 'Collector changed; use a new session')
    rows = {r['pid']: r for r in expected['requests']}
    completed = {}
    for path in sorted(directory.glob('attempt-*.json')):
        obj = json.loads(path.read_text())
        pid = obj['pid']
        require(pid in rows and obj['txHex'] == request(pid).hex(), 'Attempt has an unapproved request')
        raw = bytes.fromhex(obj['rawRxHex'])
        require(sha(raw) == obj['rawRxSha256'], 'Raw response checksum changed')
        require(obj['txCalls'] in (0, 1), 'Invalid transmit count')
        if obj['status'] == 'captured':
            require(obj['txCalls'] == 1 and obj['txBytesWritten'] == 23, 'Unsent/partial request marked captured')
            frame = matching_frame(raw, pid)
            require(frame.hex() == obj['matchedFrameHex'], 'Matched frame changed')
            if pid in completed:
                require(completed[pid] == frame, 'State changed across attempts; start a new session')
            completed[pid] = frame
        else:
            require(obj['status'] == 'failed', 'Unknown attempt status')
    require(list(completed) == [r['pid'] for r in expected['requests'][:len(completed)]],
            'Completed responses have a gap or unexpected order; inspect session evidence')
    return manifest, completed


def capture(directory, selected_plan, port, timeout=3, resume=False, factory=Serial):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    import fcntl
    with (directory / 'session.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        require(not any(directory.glob('attempt-*.json.tmp')), 'Interrupted journal write: inspect .tmp evidence before resuming')
        manifest_path = directory / 'session.json'
        if manifest_path.exists():
            require(resume, 'Session exists: use --resume or a new --out directory')
            manifest, completed = audit(directory)
            require(manifest['plan'] == selected_plan, 'Resume plan differs')
            require(manifest['port'] == port, 'Resume port differs; start a new session')
        else:
            require(not resume and not any(directory.glob('attempt-*.json')), 'No resumable manifest / orphan evidence')
            manifest = {'schemaVersion': VERSION, 'createdAt': now(), 'collectorSha256': sha(Path(__file__).read_bytes()),
                        'plan': selected_plan, 'port': port, 'platform': sys.platform,
                        'firmwareIdentityVerified': False, 'deviceSerialVerified': False}
            atomic_json(manifest_path, manifest)
            completed = {}
        summary = {'captureComplete': False, 'contentsVerified': False, 'liveGetEncodingVerified': False,
                   'semanticStatus': 'unverified-parameter-info; no semitone interpretation',
                   'atomicSnapshot': False, 'selectorWrites': 0, 'parameterWrites': 0,
                   'revalidatedOnResume': 0, 'completedRequests': len(completed),
                   'expectedRequests': len(selected_plan['requests']), 'error': None}
        seq = max([int(p.stem.split('-')[1]) for p in directory.glob('attempt-*.json')] or [0])
        try:
            with factory(port) as wire:
                # Revalidate ALL old frames before capturing new addresses. This
                # costs reads, but never mixes an old session silently with new state.
                for row in selected_plan['requests']:
                    pid = row['pid']
                    seq += 1
                    report = {'schemaVersion': VERSION, 'pid': pid, 'startedAt': now(), 'txHex': request(pid).hex(),
                              'txCalls': 0, 'txBytesWritten': 0, 'rawRxHex': '', 'rawRxSha256': sha(b''),
                              'rxChunks': [], 'purpose': 'resume-recheck' if pid in completed else 'capture',
                              'status': 'failed', 'error': None}
                    try:
                        frame = wire.transaction(pid, report, timeout)
                        require(frame == matching_frame(bytes.fromhex(report['rawRxHex']), pid), 'Transport result differs from raw RX')
                        if pid in completed:
                            require(frame == completed[pid], 'State changed since earlier read; start a new --out session')
                            summary['revalidatedOnResume'] += 1
                        report['matchedFrameHex'] = frame.hex()
                        report['status'] = 'captured'
                        completed[pid] = frame
                    except BaseException as exc:
                        report['error'] = f'{type(exc).__name__}: {exc}'
                        raise
                    finally:
                        report['endedAt'] = now()
                        atomic_json(directory / f'attempt-{seq:06d}.json', report)
                    summary['completedRequests'] = len(completed)
                    atomic_json(directory / 'summary.json', summary)
                    print(f'{len(completed)}/{len(selected_plan["requests"])} PID {pid}: raw response captured', flush=True)
            summary['captureComplete'] = len(completed) == len(selected_plan['requests'])
        except BaseException as exc:
            summary['error'] = f'{type(exc).__name__}: {exc}'
            raise
        finally:
            summary['endedAt'] = now()
            atomic_json(directory / 'summary.json', summary)
            archive(directory)
        return summary


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--dry-run', action='store_true')
    action.add_argument('--capture', action='store_true')
    action.add_argument('--audit', type=Path)
    action.add_argument('--list-ports', action='store_true')
    choice = parser.add_mutually_exclusive_group()
    choice.add_argument('--scales', help='1-based scale numbers, e.g. 1,32')
    choice.add_argument('--plan', type=Path, help='Data-only plan from fm3-pitch-custom-scales.mjs')
    choice.add_argument('--all', action='store_true')
    parser.add_argument('--port', help='macOS /dev/cu.usbmodem… or Linux /dev/ttyACM…')
    parser.add_argument('--out', type=Path)
    parser.add_argument('--resume', action='store_true')
    parser.add_argument('--timeout', type=float, default=3)
    args = parser.parse_args(argv)
    if args.audit:
        manifest, done = audit(args.audit)
        print(json.dumps({'rawResponsesValidated': len(done), 'expected': len(manifest['plan']['requests']),
                          'allRequestedRawResponsesPresent': len(done) == len(manifest['plan']['requests']),
                          'contentsVerified': False, 'liveGetEncodingVerified': False}, indent=2))
        return
    ports = sorted(glob.glob('/dev/cu.usbmodem*') + glob.glob('/dev/ttyACM*'))
    if args.list_ports:
        print(json.dumps({'candidatePorts': ports, 'deviceIdentityVerified': False}, indent=2))
        return
    require(sum(bool(x) for x in (args.scales, args.plan, args.all)) == 1, 'Choose --scales, --plan or --all')
    selected = load_plan(args.plan) if args.plan else plan(list(range(1, 33)) if args.all else [int(x) for x in args.scales.split(',')])
    if args.dry_run:
        print(json.dumps(selected, indent=2, ensure_ascii=False))
        return
    require(args.out is not None, '--capture requires --out')
    require(0.2 <= args.timeout <= 10, '--timeout must be 0.2..10 seconds')
    require(os.name == 'posix', 'Capture requires macOS/Linux; audit/dry-run are portable')
    # Do not auto-select an arbitrary USB device based on a generic port name.
    require(args.port, 'Choose the FM3 port with --port; --list-ports lists candidates')
    result = capture(args.out, selected, args.port, args.timeout, args.resume)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as exc:
        print(f'{type(exc).__name__}: {exc}', file=sys.stderr)
        sys.exit(1)

#!/usr/bin/env python3
"""Synthetic decoder/failure cases; no hardware observations are bundled here."""
import contextlib
import copy
import io
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
import warnings
import zipfile
sys.dont_write_bytecode = True
import FM3_DECODE_SCALES as d
import FM3_GLOBAL_SCALES as c
from test_global_scales import FakeWire


def frame(pid, value=0, text=None, bits=None):
    bits = struct.unpack('<I', struct.pack('<f', value))[0] if bits is None else bits
    data = bytearray(c.request(pid)[:-2])
    data[12:17] = bytes((bits >> (7*i)) & 127 for i in range(5))
    data[19] = 32
    raw = (f'{value} semi' if text is None else text).encode('ascii').ljust(32, b'\0')
    packed = int.from_bytes(raw, 'big') << 3
    data.extend((packed >> (7*i)) & 127 for i in reversed(range(37)))
    return bytes(data)+bytes([c.checksum(data), 247])


class DisplayWire(FakeWire):
    def transaction(self, pid, report, timeout):
        if self.fail == pid:
            raise TimeoutError('synthetic failure')
        raw = frame(pid, (pid-902) % 49 - 24)
        report.update(txCalls=1, txBytesWritten=23, rawRxHex=raw.hex(), rawRxSha256=c.sha(raw))
        return raw


def fixture(root, scales=(1, 32), resume=False):
    with contextlib.redirect_stdout(io.StringIO()):
        if resume:
            try:
                c.capture(root, c.plan(list(scales)), 'SYNTHETIC-NO-DEVICE', factory=DisplayWire(fail=904))
            except TimeoutError:
                pass
        c.capture(root, c.plan(list(scales)), 'SYNTHETIC-NO-DEVICE', factory=DisplayWire(), resume=resume)
    return d.decode_archive(Path(root)/'results.zip')


class Tests(unittest.TestCase):
    def test_all_values_and_known_bit_anchors(self):
        for value in range(-24, 25):
            self.assertEqual(d.decode_frame(frame(902, value), 902)['shiftSemitones'], value)
        for value, expected in [(-24, '0000000e0c'), (-1, '0000007c0b'), (0, '0000000000'), (1, '0000007c03'), (24, '0000000e04')]:
            self.assertEqual(frame(902, value)[12:17].hex(), expected)
        self.assertEqual(d.decode_frame(frame(902, 1, '+1 semi'), 902)['shiftSemitones'], 1)

    def test_full_capture_and_resume(self):
        with tempfile.TemporaryDirectory() as root:
            obj = fixture(root, range(1, 33), resume=True)
            self.assertEqual(len(obj['scales']), 32)
            self.assertEqual(sum(len(s['notes']) for s in obj['scales']), 384)
            self.assertEqual(d.validate_document(obj), obj)
            self.assertFalse(obj['assessment']['liveGetEncodingVerified'])
            self.assertFalse(obj['assessment']['newHardwareRangeValidation'])
            self.assertNotIn('port', json.dumps(obj))

    def test_text_numeric_identity_and_checksum_failures(self):
        bads = [frame(902, 0, text='unknown'), frame(902, 0, text='1 semi'), frame(902, 25),
                frame(902, 0, bits=0x7fc00000), frame(902, 0, bits=0x7f800000), frame(903),
                frame(902, 0, text='0 semi\0junk'), frame(902, 0, text='0.0 semi')]
        for offset, value in [(4, 18), (6, 9), (8, 2), (16, 16), (17, 1), (19, 31), (57, 1)]:
            b = bytearray(frame(902)); b[offset] = value; b[-2] = c.checksum(b[:-2]); bads.append(bytes(b))
        b = bytearray(frame(902)); b[-2] ^= 1; bads.append(bytes(b))
        bads.extend([frame(902)[:-1], frame(902)*2])
        for b in bads:
            with self.subTest(raw=b.hex()), self.assertRaises(ValueError):
                d.decode_frame(b, 902)

    def test_document_recomputes_values_and_confidence(self):
        with tempfile.TemporaryDirectory() as root:
            obj = fixture(root)
        mutations = [lambda x: x['scales'][0]['notes'][0].update(shiftSemitones=0),
                     lambda x: x['scales'][0]['notes'][0].update(frameSha256='0'*64),
                     lambda x: x['scales'][0]['notes'].pop(),
                     lambda x: x['scales'].append(x['scales'][0]),
                     lambda x: x['scales'][0].update(scale=2),
                     lambda x: x['assessment'].update(contentsVerified=True),
                     lambda x: x['source'].update(firmwareIdentityVerified=True),
                     lambda x: x['source'].update(endedAt='2020-01-01T00:00:00Z'),
                     lambda x: x['source'].update(collectorSha256='0'*64)]
        for mutate in mutations:
            changed = copy.deepcopy(obj); mutate(changed)
            with self.assertRaises(ValueError): d.validate_document(changed)

    def test_archive_missing_duplicate_wrong_pid_hash_and_summary(self):
        with tempfile.TemporaryDirectory() as root:
            fixture(root)
            with zipfile.ZipFile(Path(root)/'results.zip') as z:
                original = {n: z.read(n) for n in z.namelist()}
            def reject(mutator):
                entries = copy.deepcopy(original); mutator(entries)
                with zipfile.ZipFile(Path(root)/'bad.zip', 'w') as z:
                    for name, raw in entries.items(): z.writestr(name, raw)
                with self.assertRaises((ValueError, KeyError)): d.decode_archive(Path(root)/'bad.zip')
            def change(entries, name, key, value):
                obj = json.loads(entries[name]); obj[key] = value; entries[name] = json.dumps(obj).encode()
            reject(lambda x: x.pop('attempt-000012.json'))
            reject(lambda x: x.update({'../escape.json': b'{}'}))
            reject(lambda x: x.update({'attempt-000025.json': x['attempt-000001.json']}))
            for key, value in [('pid', 903), ('rawRxSha256', '0'*64), ('txHex', c.request(904).hex())]:
                reject(lambda x, k=key, v=value: change(x, 'attempt-000001.json', k, v))
            for key, value in [('captureComplete', False), ('completedRequests', 1), ('parameterWrites', 1), ('error', 'interrupted')]:
                reject(lambda x, k=key, v=value: change(x, 'summary.json', k, v))
            with warnings.catch_warnings():
                warnings.simplefilter('ignore', UserWarning)
                with zipfile.ZipFile(Path(root)/'duplicate.zip', 'w') as z:
                    for name, raw in original.items(): z.writestr(name, raw)
                    z.writestr('session.json', original['session.json'])
            with self.assertRaises(ValueError): d.decode_archive(Path(root)/'duplicate.zip')

    def test_incomplete_capture(self):
        with tempfile.TemporaryDirectory() as root, contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(TimeoutError): c.capture(root, c.plan([1]), 'SYNTHETIC', factory=DisplayWire(fail=904))
            with self.assertRaises(ValueError): d.decode_archive(Path(root)/'results.zip')

    def test_json_duplicate_keys_and_nonfinite(self):
        for raw in [b'{"schemaVersion":1,"schemaVersion":2}', b'{"x":NaN}', b'{"x":Infinity}']:
            with self.assertRaises(ValueError): d.strict_json(raw)

    def test_cli_preserves_existing_output_and_rejects_bad_input(self):
        with tempfile.TemporaryDirectory() as root:
            fixture(root)
            output = Path(root)/'observations.json'
            cmd = [sys.executable, str(Path(d.__file__)), '--zip', str(Path(root)/'results.zip'), '--out', str(output)]
            self.assertEqual(subprocess.run(cmd, capture_output=True).returncode, 0)
            before = output.read_bytes()
            self.assertNotEqual(subprocess.run(cmd, capture_output=True).returncode, 0)
            self.assertEqual(output.read_bytes(), before)
            result = subprocess.run([sys.executable, str(Path(d.__file__)), '--validate', '-'], input=b'{}', capture_output=True)
            self.assertNotEqual(result.returncode, 0)


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--fixture':
        with tempfile.TemporaryDirectory() as root:
            Path(sys.argv[2]).write_text(json.dumps(fixture(root), indent=2)+'\n')
    else:
        unittest.main()

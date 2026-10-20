#!/usr/bin/env python3
"""Synthetic failure tests + POSIX pseudo-terminal transport; no FM3 required."""
import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
import zipfile
import sys
sys.dont_write_bytecode = True
import FM3_GLOBAL_SCALES as c


def reply(pid, value=0, length=60):
    data = bytearray(c.request(pid)[:-2])
    data[12:17] = bytes((value >> (7 * n)) & 127 for n in range(5))
    data[19] = 32
    data.extend(bytes(length - 2 - len(data)))
    return bytes(data) + bytes([c.checksum(data), 247])


def repair(frame):
    frame = bytearray(frame)
    frame[-2] = c.checksum(frame[:-2])
    return bytes(frame)


class FakeWire:
    def __init__(self, fail=None, mutate=None):
        self.fail, self.mutate, self.sent = fail, mutate, []

    def __call__(self, port):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *_):
        pass

    def transaction(self, pid, report, timeout):
        self.sent.append(c.request(pid))
        raw = reply(pid, 1 if pid == self.mutate else 0)
        report.update(txCalls=1, txBytesWritten=23, rawRxHex=raw.hex(), rawRxSha256=c.sha(raw))
        if pid == self.fail:
            report.update(rawRxHex=raw[:15].hex(), rawRxSha256=c.sha(raw[:15]))
            raise TimeoutError('synthetic interruption')
        return raw


class Tests(unittest.TestCase):
    def test_mapping_and_allowlist(self):
        p = c.plan([32, 1, 32])
        self.assertEqual(len(p['requests']), 24)
        self.assertEqual([r['pid'] for r in p['requests']], list(range(902, 914)) + list(range(1274, 1286)))
        for r in c.plan(list(range(1, 33)))['requests']:
            tx = bytes.fromhex(r['txHex'])
            self.assertEqual(tx[:10], bytes.fromhex('f000017411011a000100'))
            self.assertEqual(tx[12:21], bytes(9))
            self.assertEqual(c.checksum(tx[:-2]), tx[-2])
        for bad in [96, 901, 1286, -1, True, 902.0]:
            with self.assertRaises(ValueError): c.request(bad)
        for bad in [[], [0], [33], [True], [1.0]]:
            with self.assertRaises(ValueError): c.plan(bad)

    def test_response_identity_and_shape(self):
        good = reply(902)
        self.assertEqual(c.matching_frame(good, 902), good)
        # Realtime interleaving and unrelated *valid* frames are retained/ignored.
        raw = reply(903) + good[:20] + b'\xf8' + good[20:]
        self.assertEqual(c.matching_frame(raw, 902), good)
        bads = [good[:-1], c.request(902), reply(903), good + good, good + b'\xf0', b'\xf0' + good]
        for offset, value in [(4, 18), (6, 9), (8, 2), (16, 16), (19, 31), (57, 1)]:
            bad = bytearray(good); bad[offset] = value; bads.append(repair(bad))
        bad = bytearray(good); bad[-2] ^= 1; bads.append(bytes(bad))
        bad = bytearray(good); bad[25] = 128; bads.append(bytes(bad))
        for bad in bads:
            with self.subTest(hex=bad.hex()), self.assertRaises(ValueError): c.matching_frame(bad, 902)

    def test_no_semantic_promotion_for_zero_or_negative_bits(self):
        for bits in [0, 0xC1C00000, 0xFFFFFFFF, 0x7FC00000]:
            self.assertEqual(c.matching_frame(reply(902, bits), 902), reply(902, bits))
        # No numeric decoder: even NaN-looking bits remain opaque evidence.
        self.assertFalse(c.plan([1])['contentsVerified'])
        self.assertFalse(c.plan([1])['liveGetEncodingVerified'])

    def test_native_plan_is_data_not_arbitrary_wire(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'plan.json'
            expected = c.plan([1])
            obj = {'schemaVersion': 1, 'evidenceSha256': c.EVIDENCE_SHA, 'scales': [1], 'requestCount': 12,
                   'requests': [{k: r[k] for k in ('effectId','pid','scale','noteIndex','note')} | {'operation':'GET'} for r in expected['requests']]}
            path.write_text(json.dumps(obj))
            self.assertEqual(c.load_plan(path), expected)
            obj['requests'][0]['pid'] = 96
            path.write_text(json.dumps(obj))
            with self.assertRaises(ValueError): c.load_plan(path)

    def test_interruption_resume_and_raw_audit(self):
        with tempfile.TemporaryDirectory() as d, contextlib.redirect_stdout(io.StringIO()):
            first = FakeWire(fail=904)
            with self.assertRaises(TimeoutError): c.capture(d, c.plan([1]), 'fake', factory=first)
            self.assertEqual(len(first.sent), 3)
            with zipfile.ZipFile(Path(d)/'results.zip') as z:
                self.assertIn('attempt-000003.json', z.namelist())
                self.assertFalse(json.loads(z.read('summary.json'))['captureComplete'])
            self.assertEqual(len(c.audit(d)[1]), 2)
            raw = json.loads((Path(d)/'attempt-000003.json').read_text())
            self.assertEqual(raw['status'], 'failed')
            self.assertTrue(raw['rawRxHex'])
            second = FakeWire()
            result = c.capture(d, c.plan([1]), 'fake', resume=True, factory=second)
            self.assertTrue(result['captureComplete'])
            self.assertEqual(result['revalidatedOnResume'], 2)
            self.assertEqual(len(second.sent), 12)
            self.assertEqual(len(c.audit(d)[1]), 12)
            with zipfile.ZipFile(Path(d)/'results.zip') as z:
                self.assertTrue(json.loads(z.read('summary.json'))['captureComplete'])
            self.assertFalse(result['contentsVerified'])
            self.assertFalse(result['liveGetEncodingVerified'])
            self.assertFalse(result['atomicSnapshot'])
            self.assertEqual(result['parameterWrites'], 0)
            with self.assertRaises(ValueError): c.capture(d, c.plan([1]), 'fake', factory=FakeWire())
            with self.assertRaises(ValueError): c.capture(d, c.plan([2]), 'fake', resume=True, factory=FakeWire())
            with self.assertRaises(ValueError): c.capture(d, c.plan([1]), 'different', resume=True, factory=FakeWire())
            # Mutated raw data with an old hash cannot satisfy offline audit.
            path = Path(d)/'attempt-000001.json'
            obj = json.loads(path.read_text()); obj['rawRxHex'] = reply(902, 1).hex(); path.write_text(json.dumps(obj))
            with self.assertRaises(ValueError): c.audit(d)

    def test_resume_rejects_state_drift_before_new_reads(self):
        with tempfile.TemporaryDirectory() as d, contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(TimeoutError): c.capture(d, c.plan([1]), 'fake', factory=FakeWire(fail=904))
            wire = FakeWire(mutate=902)
            with self.assertRaisesRegex(ValueError, 'State changed'):
                c.capture(d, c.plan([1]), 'fake', resume=True, factory=wire)
            self.assertEqual(len(wire.sent), 1)
            self.assertFalse(json.loads((Path(d)/'summary.json').read_text())['captureComplete'])

    def test_open_failure_and_partial_send_retained(self):
        class Broken(FakeWire):
            def transaction(self, pid, report, timeout):
                report.update(txCalls=1, txBytesWritten=4)
                raise OSError('short write')
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(OSError): c.capture(d, c.plan([1]), 'fake', factory=Broken())
            record = json.loads((Path(d)/'attempt-000001.json').read_text())
            self.assertEqual(record['txBytesWritten'], 4)
            self.assertEqual(len(c.audit(d)[1]), 0)

    @unittest.skipUnless(os.name == 'posix', 'POSIX serial integration')
    def test_real_transport_over_pseudo_terminal(self):
        import pty
        master, slave = pty.openpty()
        path = os.ttyname(slave)
        received, errors = [], []
        def device():
            try:
                data = bytearray()
                while len(data) < 23: data.extend(os.read(master, 23-len(data)))
                received.append(bytes(data))
                os.write(master, reply(903) + reply(902)[:19])
                os.write(master, b'\xf8' + reply(902)[19:])
            except BaseException as exc: errors.append(exc)
        report = {'rxChunks': []}
        worker = threading.Thread(target=device, daemon=True)
        try:
            with c.Serial(path) as wire:
                worker.start()
                frame = wire.transaction(902, report, 1)
            worker.join(2)
            self.assertFalse(worker.is_alive())
            self.assertFalse(errors)
            self.assertEqual(received, [c.request(902)])
            self.assertEqual(frame, reply(902))
            self.assertEqual(c.sha(bytes.fromhex(report['rawRxHex'])), report['rawRxSha256'])
        finally:
            os.close(master); os.close(slave)

    def test_dry_run_no_files_and_no_serial(self):
        with tempfile.TemporaryDirectory() as d, contextlib.redirect_stdout(io.StringIO()) as out:
            c.main(['--dry-run', '--scales', '1,32', '--out', d, '--port', '/not-a-port'])
            self.assertEqual(len(json.loads(out.getvalue())['requests']), 24)
            self.assertEqual(list(Path(d).iterdir()), [])


if __name__ == '__main__':
    unittest.main()

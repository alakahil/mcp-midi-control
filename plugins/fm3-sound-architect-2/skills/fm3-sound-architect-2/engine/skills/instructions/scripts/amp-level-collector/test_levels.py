#!/usr/bin/env python3
"""Synthetic tests only. No physical FM3 and no validated dB scale."""
import copy
import hashlib
import json
import os
import pty
import select
import subprocess
import tempfile
import threading
import time
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch
import FM3_AMP_LEVEL as c
import amp_transport as t


def frame(fn, data=()):
    values = [240, 0, 1, 116, 17, fn, *data]
    return values + [t.checksum(values), 247]


def reply(words):
    frames = [frame(116, [58, 0, 64, 4])]
    for offset in range(0, 576, 256):
        chunk = words[offset:offset + 256]
        payload = [len(chunk) & 127, len(chunk) >> 7]
        for v in chunk:
            payload.extend([v & 127, (v >> 7) & 127, v >> 14])
        frames.append(frame(117, payload))
    frames.append(frame(118))
    return frames


def synthetic_collect(port, report):
    # Test adapter deliberately never opens a serial port.
    frames = reply(SYNTHETIC_WORDS[report['syxSha256']])
    report.update(txCalls=1, txBytesWritten=10, inputFlushedBeforeGet=True,
                  responseCompleteBeforeClose=True, partialFrameHex='', frames=frames,
                  rawRxHex=b''.join(bytes(f) for f in frames).hex())
    return t.decode(frames)


SYNTHETIC_WORDS = {}


class CollectorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='FM3 synthetic tests ')
        cls.root = Path(cls.temp.name)
        script = r"""
        import fs from 'node:fs'; import path from 'node:path';
        import {inspectStructure} from './fm3-prototype.mjs';
        import {reencodeDumpFromRawPatch,reencodeRawPatch} from './fm3-codec.mjs';
        const dest=process.argv[1],seed=fs.readFileSync('ALUSTA_SIIT.syx'),s=inspectStructure(seed);
        const write=(name,b,raw=s.raw.rawPatch)=>fs.writeFileSync(path.join(dest,name+'.syx'),Buffer.from(reencodeDumpFromRawPatch(seed,reencodeRawPatch(raw,b))));
        for(let step=0;step<5;step++){
          const b=Buffer.from(s.raw.body);
          // Arbitrary values, intentionally NOT a dB conversion formula.
          for(let ch=0;ch<4;ch++)b.writeUInt16LE(1000+step*2100+ch*137,4658+288*ch);
          write('step '+step,b);
        }
        const b=Buffer.from(s.raw.body);
        for(let ch=0;ch<4;ch++)b.writeUInt16LE(1000+ch*137,4658+288*ch);
        for(const [name,offset] of [['other',4670],['model',4668],['scene',0],['selector',4624]]){
          const bad=Buffer.from(b);bad[offset]^=1;write(name,bad);
        }
        const raw=Buffer.from(s.raw.rawPatch);raw[40]^=1;write('header',b,raw);
        const named=Buffer.from(s.raw.rawPatch);named[8]=88;write('named',b,named);
        b.writeUInt16LE(Buffer.from(s.raw.body).readUInt16LE(5522),5522);write('unchangedD',b);
        """
        subprocess.run(['node', '--input-type=module', '-e', script, str(cls.root)], cwd=c.HERE, check=True)
        for i in range(5):
            file = cls.root / ('step %d.syx' % i)
            state = c.offline('preflight', file)
            SYNTHETIC_WORDS[state['sha256']] = state['words']

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.session = Path(tempfile.mkdtemp(dir=self.root))
        c.initialize(self.session)

    def step(self, index):
        return self.root / ('step %d.syx' % index)

    def accept(self, index):
        count, prev, _ = c.resume(self.session)
        self.assertEqual(index, count)
        folder, item = c.prepare(self.session, self.step(index), index, prev)
        item['labelsConfirmed'] = True
        with patch.object(t, 'collect', side_effect=synthetic_collect) as transport:
            c.capture(folder, item, '/dev/cu.TEST-NOT-A-DEVICE')
        self.assertEqual(transport.call_count, 1)
        return folder

    def test_complete_pause_resume_and_zip(self):
        self.accept(0)
        self.assertEqual(c.resume(self.session)[0], 1)
        for i in range(1, 5):
            self.accept(i)
        self.assertEqual(c.resume(self.session)[0], 5)
        with patch.object(t, 'collect', side_effect=AssertionError('Unexpected GET')):
            c.run(self.session, '/dev/cu.TEST-NOT-A-DEVICE')
        with zipfile.ZipFile(c.export_session(self.session)) as saved:
            self.assertEqual(len([n for n in saved.namelist() if n.endswith('/capture.json')]), 5)
            self.assertEqual(len([n for n in saved.namelist() if n.endswith('/donor.syx')]), 5)

    def test_invalid_presets_block_before_any_get(self):
        with patch.object(t, 'collect', side_effect=AssertionError('Unexpected GET')) as transport:
            for name in ['other', 'model', 'scene', 'selector', 'header', 'unchangedD']:
                with self.subTest(name=name), self.assertRaises(ValueError):
                    c.prepare(self.session, self.root / (name + '.syx'), 0, self.session / 'baseline.syx')
            self.assertEqual(transport.call_count, 0)
        bad = self.session / 'corrupt.syx'
        data = bytearray(self.step(0).read_bytes()); data[100] ^= 1; bad.write_bytes(data)
        with self.assertRaisesRegex(ValueError, 'checksum'):
            c.offline('preflight', bad)

    def test_name_change_reported(self):
        result = c.offline('compare', c.BASE, self.root / 'named.syx', 0)
        self.assertIsNotNone(result['presetNameChange'])
        self.assertTrue(result['allOtherBodyBytesPreserved'])

    def test_cancel_does_not_get_or_advance(self):
        with patch('builtins.input', side_effect=[str(self.step(0)), 'q']), \
                patch.object(t, 'collect', side_effect=AssertionError('Unexpected GET')) as transport:
            with self.assertRaises(c.Paused):
                c.run(self.session, '/dev/cu.TEST-NOT-A-DEVICE')
        self.assertEqual(transport.call_count, 0)
        count, _, retained = c.resume(self.session)
        self.assertEqual(count, 0); self.assertEqual(len(retained), 1)

    def test_get_mismatch_fails_without_retry_and_retains(self):
        folder, item = c.prepare(self.session, self.step(0), 0, self.session / 'baseline.syx')
        item['labelsConfirmed'] = True
        def wrong(port, report):
            other = copy.deepcopy(report)
            other['syxSha256'] = c.digest(self.step(1))
            decoded = synthetic_collect(port, other)
            for key in ['txCalls', 'txBytesWritten', 'inputFlushedBeforeGet', 'responseCompleteBeforeClose', 'partialFrameHex', 'frames', 'rawRxHex']:
                report[key] = other[key]
            return decoded
        with patch.object(t, 'collect', side_effect=wrong) as transport:
            with self.assertRaisesRegex(ValueError, 'GET/SYX mismatch'):
                c.capture(folder, item, '/dev/cu.TEST-NOT-A-DEVICE')
            self.assertEqual(transport.call_count, 1)
        self.assertEqual(c.resume(self.session)[0], 0)
        self.assertEqual(c.read_json(folder / 'attempt.json')['status'], 'failed')
        self.assertTrue((folder / 'capture.json').exists())
        with self.assertRaises(ValueError):
            c.capture(folder, item, '/dev/cu.TEST-NOT-A-DEVICE')

    def test_resume_revalidates_all_evidence(self):
        folder = self.accept(0)
        for filename, modify in [
            ('pair.json', lambda r: r.update(matchedWords=1)),
            ('comparison.json', lambda r: r.update(allOtherBodyBytesPreserved=False)),
            ('capture.json', lambda r: r.update(rawRxHex=r['rawRxHex'][:-2])),
            ('capture.json', lambda r: r.update(txBytesWritten=9)),
            ('capture.json', lambda r: r.update(inputFlushedBeforeGet=False)),
            ('capture.json', lambda r: r.update(firmwareDeclared='14.0')),
            ('attempt.json', lambda r: r.update(labelsConfirmed=False))]:
            file = folder / filename
            original = file.read_bytes()
            r = c.read_json(file); modify(r); c.write_json(file, r)
            with self.subTest(filename=filename), self.assertRaises(ValueError):
                c.resume(self.session)
            file.write_bytes(original)
        self.assertEqual(c.resume(self.session)[0], 1)

    def test_status_export_and_lock_have_no_transport(self):
        self.accept(0)
        for flag in ['--status', '--export-only']:
            with patch('sys.argv', ['FM3_AMP_LEVEL.py', flag, '--session', str(self.session)]), \
                    patch.object(t, 'collect', side_effect=AssertionError('Unexpected GET')):
                self.assertEqual(c.main(), 0)
        with (self.session / '.collector.lock').open('a') as lock:
            c.fcntl.flock(lock.fileno(), c.fcntl.LOCK_EX | c.fcntl.LOCK_NB)
            with patch('sys.argv', ['FM3_AMP_LEVEL.py', '--status', '--session', str(self.session)]):
                with self.assertRaisesRegex(ValueError, 'teises protsessis'):
                    c.main()

    def test_quoted_and_escaped_paths(self):
        file = self.step(0)
        for text in [str(file), "'" + str(file) + "'", str(file).replace(' ', '\\ ')]:
            self.assertEqual(c.donor_path(text), file.resolve())

    def test_real_transport_on_synthetic_pty_one_get(self):
        master, slave = pty.openpty()
        received, errors = [], []
        wire = b''.join(bytes(f) for f in reply(SYNTHETIC_WORDS[c.digest(self.step(0))]))
        def device():
            try:
                req = b''; end = time.monotonic() + 3
                while len(req) < 10 and time.monotonic() < end:
                    if select.select([master], [], [], 0.1)[0]:
                        req += os.read(master, 10 - len(req))
                received.append(req)
                for at in range(0, len(wire), 97):
                    os.write(master, wire[at:at + 97]); time.sleep(.001)
            except Exception as exc:
                errors.append(str(exc))
        thread = threading.Thread(target=device, daemon=True); thread.start()
        report = {'txCalls': 0, 'rxChunks': []}
        try:
            result = t.collect(os.ttyname(slave), report, timeout=3)
            thread.join(4)
            self.assertFalse(errors); self.assertEqual(received, [t.GET])
            self.assertEqual(report['txCalls'], 1); self.assertEqual(report['txBytesWritten'], 10)
            self.assertTrue(report['inputFlushedBeforeGet'])
            self.assertEqual(result['values'], SYNTHETIC_WORDS[c.digest(self.step(0))])
            self.assertEqual(len(bytes.fromhex(report['rawRxHex'])), 1778)
        finally:
            os.close(master); os.close(slave)

    def test_partial_write_never_retries(self):
        master, slave = pty.openpty()
        report = {'txCalls': 0, 'rxChunks': []}
        try:
            with patch.object(t.os, 'write', return_value=4) as write:
                with self.assertRaisesRegex(ValueError, 'Partial GET'):
                    t.collect(os.ttyname(slave), report, timeout=.01)
                self.assertEqual(write.call_count, 1)
            self.assertEqual(report['txCalls'], 1)
            self.assertEqual(report['txBytesWritten'], 4)
        finally:
            os.close(master); os.close(slave)


if __name__ == '__main__':
    unittest.main(verbosity=2)

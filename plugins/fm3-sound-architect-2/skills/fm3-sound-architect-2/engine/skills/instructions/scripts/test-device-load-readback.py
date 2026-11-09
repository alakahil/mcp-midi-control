#!/usr/bin/env python3
"""Offline transport simulation: edit-buffer loads and read-only requests only."""
import contextlib
import copy
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / 'cpu-sweep-collector'))
import FM3_CPU_SWEEP as S
import FM3_READ_PROBE as P
import FM3_BIND_STORE as B
import FM3_SHOT_LOAD as L
import FM3_SHOT_READ as R


def frame(fn, payload):
    data = bytes([240, 0, 1, 116, 17, fn] + payload)
    return data + bytes([S.checksum(data), 247])


def reply(values, eid=58):
    payload = [0, 0]
    for v in values:
        payload.extend([v & 127, (v >> 7) & 127, (v >> 14) & 3])
    return [frame(0x74, [eid & 127, eid >> 7, len(values) & 127, len(values) >> 7]),
            frame(0x75, payload), frame(0x76, [])]


class FakePort:
    def __init__(self, responds=True, values=None):
        self.framer = S.Framer()
        self.sent = []
        self.pending = []
        self.responds = responds
        self.values = list(range(8)) if values is None else values
        self.closed = False
        self.stored = []
        self.bulk = None

    def write(self, data):
        self.sent.append(bytes(data))
        if P.read_only_shape(data) == 'grid' and self.responds:
            payload = [0x2e] + [0] * 40
            payload[31] = 41
            self.pending = [frame(1, payload)]
        elif P.read_only_shape(data) == 'bulk':
            self.pending = self.bulk if self.bulk is not None else reply(self.values)
        elif P.read_only_shape(data) == 'storedDump':
            self.pending = self.stored

    def drain(self, seconds):
        for f in self.pending:
            self.framer.feed(f)
        self.pending = []

    def close(self):
        self.closed = True


class LoadReadback(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.pack = self.root / 'pack'
        self.pack.mkdir()
        self.session = self.root / 'session'
        self.data = (HERE.parent / 'examples/FM3_P6_INSERT_A.syx').read_bytes()
        (self.pack / 'A.syx').write_bytes(self.data)
        self.block = {'family': 'amp', 'effectId': 58, 'words': 2, 'channels': 4,
                      'expected': list(range(8)), 'request': frame(0x1f, [58, 0]).hex(),
                      'writes': [{'param': 'X', 'channel': 'B', 'pid': 1, 'raw': 3}]}
        self.item = {'id': 'A', 'file': 'A.syx', 'name': 'TEST', 'family': 'amp',
                     'sha256': hashlib.sha256(self.data).hexdigest(), 'blocks': [self.block]}
        self.shot = {'kind': 'fm3-shot-check', 'items': [self.item]}
        self.bind = {'kind': 'fm3-bind-store', 'preset': self.item, 'confirmName': 'TEST', 'checks': []}
        self.probe = {'kind': 'fm3-read-probe', 'preset': self.item, 'confirmName': 'TEST',
                      'requests': [{'label': 'amp', 'kind': 'bulk', 'request': self.block['request']}]}
        self.clock = 0
        self.stack = contextlib.ExitStack()
        self.stack.enter_context(patch.object(S.time, 'sleep', lambda _: None))
        self.stack.enter_context(patch.object(S.time, 'monotonic', self.tick))
        self.stack.enter_context(contextlib.redirect_stdout(io.StringIO()))
        self.addCleanup(self.stack.close)
        self.addCleanup(self.tmp.cleanup)

    def test_preflight_never_opens_or_discovers_port(self):
        self.manifest(self.shot)
        with patch.object(S, 'Port', side_effect=AssertionError('port opened')), patch.object(S, 'find_port', side_effect=AssertionError('port discovered')):
            result = L.preflight(self.pack, 'A')
            self.assertTrue(result['passed'])
            self.assertFalse(result['portOpened'])
            self.assertEqual((result['frames'], result['blocks'], result['comparedWords']), (10, 1, 8))
            (self.pack / 'A.syx').write_bytes(b'bad')
            with self.assertRaises(SystemExit): L.preflight(self.pack, 'A')

    def tick(self):
        self.clock += 0.1
        return self.clock

    def manifest(self, obj):
        (self.pack / 'manifest.json').write_text(json.dumps(obj))

    def run_shot(self, port):
        self.manifest(self.shot)
        return L.run(self.pack, self.session, None, 'FAKE', port=port)

    def test_valid_load_then_read_only(self):
        port = FakePort()
        result = self.run_shot(port)
        self.assertTrue(result['allMatch'])
        self.assertEqual(port.sent, [S.cpu_request()] + S.dump_frames(self.data) + [bytes.fromhex(self.block['request'])])
        self.assertEqual(result['blocks'][0]['testWords'][0]['device'], 3)

    def test_mismatch_is_failure_and_keeps_result(self):
        port = FakePort(values=[0, 1, 2, 99, 4, 5, 6, 7])
        with self.assertRaises(SystemExit) as err:
            self.run_shot(port)
        self.assertEqual(err.exception.code, 2)
        result = json.loads((self.session / 'shot-load-A.json').read_text())
        self.assertFalse(result['allMatch'])
        self.assertEqual(result['blocks'][0]['mismatches'], [{'channel': 'B', 'pid': 1, 'expected': 3, 'device': 99}])

    def test_failed_read_retains_error(self):
        port = FakePort(); port.bulk = reply(list(range(8)))[:-1]
        with self.assertRaises(SystemExit):
            self.run_shot(port)
        result = json.loads((self.session / 'shot-load-A.json').read_text())
        self.assertFalse(result['allMatch']); self.assertIn('error', result)
        self.assertEqual(sum(P.read_only_shape(f) == 'bulk' for f in port.sent), 3)

    def test_all_loaders_require_response(self):
        for name, manifest, run in [
            ('shot', self.shot, lambda: L.run(self.pack, self.session, None, 'FAKE')),
            ('bind', self.bind, lambda: B.run('load', self.pack, self.session, 'FAKE')),
            ('probe', self.probe, lambda: P.run(self.pack, self.session, 'FAKE')),
            ('cpu', self.shot, lambda: S.run(self.pack, self.session, 'FAKE'))]:
            with self.subTest(name=name):
                self.session = self.root / name
                self.manifest(manifest); port = FakePort(responds=False)
                with patch.object(S, 'Port', return_value=port), self.assertRaises(SystemExit):
                    run()
                self.assertEqual(port.sent, [S.cpu_request()]); self.assertTrue(port.closed)
                if name == 'probe':
                    result = json.loads((self.session / 'probe-results.json').read_text())
                    self.assertEqual(result['sentDumpHex'], [])
                    self.assertFalse(result['loadAttempted']); self.assertFalse(result['loadCompleted'])
                    self.assertIn('error', result)

    def test_all_loaders_reject_sha_before_open(self):
        for manifest, run in [
            (self.shot, lambda: L.run(self.pack, self.session, None, 'FAKE')),
            (self.bind, lambda: B.run('load', self.pack, self.session, 'FAKE')),
            (self.probe, lambda: P.run(self.pack, self.session, 'FAKE')),
            (self.shot, lambda: S.run(self.pack, self.session, 'FAKE'))]:
            self.manifest(manifest)
            (self.pack / 'A.syx').write_bytes(self.data[:-1])
            with patch.object(S, 'Port') as port, self.assertRaises(SystemExit):
                run()
            port.assert_not_called()

    def test_dump_refusals_send_nothing(self):
        good = S.dump_frames(self.data)
        cases = [self.data[:-1], self.data + b'\0', b'\0' * len(self.data)]
        for index, offset, value in [(0, 6, 1), (0, 4, 16), (1, 5, 3), (1, 10, 128)]:
            frames = [bytearray(f) for f in good]
            frames[index][offset] = value
            frames[index][-2] = S.checksum(frames[index][:-2])
            cases.append(b''.join(frames))
        bad = bytearray(self.data); bad[-2] ^= 1; cases.append(bytes(bad))
        for data in cases:
            port = FakePort()
            with self.assertRaises(SystemExit):
                S.send_preset(port, [data])
            self.assertEqual(port.sent, [])

    def test_every_read_shape_and_refusal(self):
        P.self_test()
        allowed = [(S.cpu_request(), 'grid'), (frame(31, [58, 0]), 'bulk'),
                   (B.stored_request(511), 'storedDump'), (frame(67, []), 'editBufferDump')]
        for req, kind in allowed:
            port = FakePort(); P.send_read(port, req, kind); self.assertEqual(port.sent, [req])
            bad = bytearray(req); bad[-2] ^= 1
            with self.assertRaises(SystemExit): P.send_read(port, bad, kind)
            self.assertEqual(port.sent, [req])
        for sub in [9, 0x52, 0x26]:
            req = frame(1, [sub] + [0] * 14); port = FakePort()
            with self.assertRaises(SystemExit): P.send_read(port, req, None)
            self.assertEqual(port.sent, [])
        self.assertIsNone(P.read_only_shape(frame(3, [4, 0, 0])))
        for index in [-1, 512, True, '1']:
            with self.assertRaises(SystemExit): B.stored_request(index)

    def test_cpu_request_validated_at_send(self):
        port = FakePort()
        with patch.object(S, 'cpu_request', return_value=frame(1, [0x26] + [0] * 14)), self.assertRaises(SystemExit):
            S.read_cpu(port)
        self.assertEqual(port.sent, [])

    def test_probe_cannot_claim_unknown_kind(self):
        self.probe['requests'] = [{'kind': None, 'request': frame(1, [9] + [0] * 14).hex(), 'label': 'bad'}]
        self.manifest(self.probe)
        with patch.object(S, 'Port') as port, self.assertRaises(SystemExit): P.run(self.pack, self.session, 'FAKE')
        port.assert_not_called()

    def test_bad_blocks_before_open(self):
        cases = [[], [copy.deepcopy(self.block)]]
        cases[1][0]['effectId'] = 59
        for field, value in [('expected', []), ('channels', 2), ('words', 0), ('request', frame(1, [9] + [0] * 14).hex())]:
            b = copy.deepcopy(self.block); b[field] = value; cases.append([b])
        b = copy.deepcopy(self.block); b['writes'][0]['pid'] = 99; cases.append([b])
        for blocks in cases:
            self.item['blocks'] = blocks; self.manifest(self.shot)
            with patch.object(S, 'Port') as port, self.assertRaises(SystemExit): L.run(self.pack, self.session, None, 'FAKE')
            port.assert_not_called()

    def test_result_collision_before_device_load(self):
        self.session.mkdir()
        for name, manifest, run in [
            ('shot-load-A.json', self.shot, lambda: L.run(self.pack, self.session, None, 'FAKE')),
            ('bind-store-load.json', self.bind, lambda: B.run('load', self.pack, self.session, 'FAKE')),
            ('probe-results.json', self.probe, lambda: P.run(self.pack, self.session, 'FAKE'))]:
            out = self.session / name; out.write_text('previous result'); self.manifest(manifest)
            with patch.object(S, 'Port') as port, self.assertRaises(SystemExit): run()
            port.assert_not_called(); self.assertEqual(out.read_text(), 'previous result')
        with self.assertRaises(SystemExit): S.write_json_new(out, {})
        self.assertEqual(out.read_text(), 'previous result')

    def test_bulk_corruption_and_order(self):
        good = reply(list(range(8)))
        bad_checksum = bytearray(good[1]); bad_checksum[-2] ^= 1
        high_word = bytearray(good[1]); high_word[10] = 4; high_word[-2] = S.checksum(high_word[:-2])
        cases = [[b'\xf0'], good[:-1], good[1:], [good[0], good[0]] + good[1:],
                 [good[1], good[0], good[2]], good + [good[1]],
                 [good[0], bytes(bad_checksum), good[2]], [good[0], bytes(high_word), good[2]],
                 reply(list(range(8)), 59), [good[0], frame(117, [0, 0, 1]), good[2]]]
        for frames in cases:
            with self.assertRaises(SystemExit): L.bulk_values(frames, 58)

    def test_read_only_success_and_mismatch(self):
        self.manifest(self.shot)
        for label, values, ok in [('same', list(range(8)), True), ('different', [9] * 8, False)]:
            port = FakePort(values=values)
            argv = ['FM3_SHOT_READ.py', '--pack', str(self.pack), '--session', str(self.session), '--label', label, '--port', 'FAKE']
            with patch.object(S, 'Port', return_value=port), patch.object(sys, 'argv', argv):
                if ok: R.main()
                else:
                    with self.assertRaises(SystemExit) as err: R.main()
                    self.assertEqual(err.exception.code, 2)
            self.assertEqual([P.read_only_shape(f) for f in port.sent], ['grid', 'bulk'])
            self.assertTrue(port.closed)
            result = json.loads((self.session / ('shot-read-A-%s.json' % label)).read_text())
            self.assertEqual(result['allMatch'], ok)

    def test_label_cannot_escape_session(self):
        for value in ['../out', '', '/out', 'x/y', 'x.y', 'x' * 81]:
            with self.assertRaises(SystemExit): L.safe_label(value)

    def test_stored_verification_never_stores(self):
        self.manifest(self.bind); port = FakePort()
        frames = S.dump_frames(self.data)
        port.stored = [frame(0x77, [3, 39, 0, 64, 0])] + frames[1:]  # shown slot 424
        with patch.object(S, 'Port', return_value=port), patch('builtins.input', side_effect=['', '424']):
            B.run('verify', self.pack, self.session, 'FAKE')
        self.assertEqual([P.read_only_shape(f) for f in port.sent], ['grid', 'storedDump'])
        result = json.loads((self.session / 'bind-store-results.json').read_text())
        self.assertEqual(result['index'], 423)

    def test_incomplete_stored_dump_is_not_success(self):
        self.manifest(self.bind); port = FakePort()
        with patch.object(S, 'Port', return_value=port), patch('builtins.input', side_effect=['', '424']), self.assertRaises(SystemExit):
            B.run('verify', self.pack, self.session, 'FAKE')
        self.assertTrue((self.session / 'bind-store-results.json').exists())

    def test_recorded_bulk_replies_still_decode(self):
        raw = json.loads((HERE.parent / 'references/fm3-read-probe-20261023-results.json').read_text())
        count = 0
        for rec in raw['replies']:
            if rec['kind'] != 'bulk': continue
            req = bytes.fromhex(rec['request'])
            eid = req[6] | req[7] << 7
            vals = L.bulk_values([bytes.fromhex(h) for h in rec['frames']], eid)
            self.assertGreater(len(vals), 0)
            count += 1
        self.assertGreater(count, 0)

    def test_stored_wrong_location_or_checksum_refused(self):
        self.manifest(self.bind)
        for mode in ['wrong-location', 'bad-checksum']:
            self.session = self.root / mode
            port = FakePort()
            port.stored = [frame(0x77, [3, 38 if mode == 'wrong-location' else 39, 0, 64, 0])] + S.dump_frames(self.data)[1:]
            if mode == 'bad-checksum':
                f = bytearray(port.stored[1]); f[-2] ^= 1; port.stored[1] = bytes(f)
            with patch.object(S, 'Port', return_value=port), patch('builtins.input', side_effect=['', '424']), self.assertRaises(SystemExit):
                B.run('verify', self.pack, self.session, 'FAKE')
            self.assertTrue((self.session / 'bind-store-results.json').exists())

    def test_framer_and_port_selection(self):
        req = S.cpu_request(); f = S.Framer()
        f.feed(req[:5] + b'\xf8' + req[5:]); self.assertEqual(f.frames, [list(req)])
        f = S.Framer(); f.feed(req[:5] + b'\x90' + req[5:]); self.assertEqual(f.frames, [])
        for paths in [[], ['/dev/ttyACM0', '/dev/ttyACM1']]:
            with patch.object(S.glob, 'glob', side_effect=[paths, []]), self.assertRaises(SystemExit): S.find_port()
        with patch.object(S.glob, 'glob', side_effect=[['/dev/cu.usbmodem1'], []]):
            self.assertEqual(S.find_port(), '/dev/cu.usbmodem1')


if __name__ == '__main__':
    unittest.main(verbosity=2)

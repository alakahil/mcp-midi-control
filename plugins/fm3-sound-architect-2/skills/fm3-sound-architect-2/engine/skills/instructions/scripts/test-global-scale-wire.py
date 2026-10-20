#!/usr/bin/env python3
"""Actual bounded ARM opcodes with synthetic inputs; never hardware evidence."""
import copy
import importlib.util
import json
from pathlib import Path
import random
import struct
import sys
import tempfile
import unittest
sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('wire', HERE/'fm3-global-scale-wire.py')
w = importlib.util.module_from_spec(spec); spec.loader.exec_module(w)
sys.path.insert(0, str(HERE/'global-scale-collector'))
import FM3_DECODE_SCALES as decoder
import FM3_GLOBAL_SCALES as collector
from test_global_scale_decode import frame


class WireTests(unittest.TestCase):
    def setUp(self):
        self.proof = w.load()
        self.code = bytes.fromhex(self.proof['spans']['pack32']['hex'])

    def test_pack32_known_bits_and_unsigned_shift(self):
        anchors = {0: '0000000000', 0xffffffff: '7f7f7f7f0f', 0x80000000: '0000000008',
                   0x3f800000: '0000007c03', 0xbf800000: '0000007c0b',
                   0x41c00000: '0000000e04', 0xc1c00000: '0000000e0c'}
        for word, expected in anchors.items():
            self.assertEqual(w.replay_pack32(self.code, word).hex(), expected)
        rng = random.Random(13)
        words = [1 << i for i in range(32)] + [rng.getrandbits(32) for _ in range(1024)]
        for word in words:
            packed = w.replay_pack32(self.code, word)
            self.assertTrue(all(v < 128 for v in packed))
            self.assertLessEqual(packed[4], 15)
            self.assertEqual(sum(v << (7*i) for i, v in enumerate(packed)), word)

    def test_actual_instruction_output_into_decoder_all_49_assumed_floats(self):
        for value in range(-24, 25):
            bits = struct.unpack('<I', struct.pack('<f', value))[0]
            raw = bytearray(frame(902, value))
            raw[12:17] = w.replay_pack32(self.code, bits)
            raw[-2] = collector.checksum(raw[:-2])
            self.assertEqual(decoder.decode_frame(bytes(raw), 902)['shiftSemitones'], value)
        # Transport accepts any bits; interpretation must still reject NaN/Inf
        # and a nonzero display paired with an unchanged zero numeric cache.
        for bits in (0x7fc00000, 0x7f800000, 0xff800000, 0):
            raw = bytearray(frame(902, 24))
            raw[12:17] = w.replay_pack32(self.code, bits)
            raw[-2] = collector.checksum(raw[:-2])
            with self.assertRaises(ValueError): decoder.decode_frame(bytes(raw), 902)

    def test_evidence_and_confidence_tampering(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root)/'proof.json'
            for name in self.proof['spans']:
                changed = copy.deepcopy(self.proof)
                raw = bytearray.fromhex(changed['spans'][name]['hex']); raw[0] ^= 1
                changed['spans'][name]['hex'] = raw.hex()
                path.write_text(json.dumps(changed))
                with self.assertRaises(ValueError): w.load(path)
            for key in ('scaleToNumericCacheProducerTraced', 'endToEndStaticVerified',
                        'nonzeroHardwareVerified', 'newHardwareRangeValidation'):
                changed = copy.deepcopy(self.proof); changed['assessment'][key] = True
                path.write_text(json.dumps(changed))
                with self.assertRaises(ValueError): w.load(path)

    def test_replay_fails_closed(self):
        for offset, data in [(0, b'\0\0'), (54, b'\x05\x2b'), (46, b'\xff\xe7')]:
            changed = bytearray(self.code); changed[offset:offset+2] = data
            with self.assertRaises(ValueError): w.replay_pack32(bytes(changed), 0xffffffff)
        for value in (-1, 0x100000000, True, 1.0):
            with self.assertRaises(ValueError): w.replay_pack32(self.code, value)


if __name__ == '__main__': unittest.main()

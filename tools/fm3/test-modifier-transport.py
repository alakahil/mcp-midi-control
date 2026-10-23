#!/usr/bin/env python3
"""Checks that distinguish precision/rounding modes and preserve packet bits."""
import math
import random
import struct
import unittest

from modifier_transport_audit import bits, join_word, split_word, op82, rounded
from modifier_drag_audit import word_model


class TransportPrecision(unittest.TestCase):
    def test_raw_payload_preserves_bits_including_non_numbers(self):
        # Float conversion would destroy some NaN payloads and could lose -0.
        for word in [0, 0x80000000, 0x7f800000, 0xff800000, 0x7fa12345,
                     0xffffffff, 0x3e7fdec5, 0x3f40084e, 0x3f0010cf]:
            self.assertEqual(join_word(split_word(word)), word)
        self.assertEqual(split_word(0x3e7fdec5), bytes.fromhex('45 3d 7f 73 03'))
        with self.assertRaises(ValueError):
            join_word(bytes.fromhex('00 00 00 00 10'))

    def test_distinguishes_precision_and_staged_rounding(self):
        word = 0x37000100  # Below the exact 0.5/65534 boundary.
        value = struct.unpack('<f', struct.pack('<I',word))[0]
        self.assertEqual(math.floor(value*65534+.5), 0)
        self.assertEqual(op82(word,24,False),1)
        self.assertEqual(op82(word,32,False),0)
        self.assertEqual(op82(word,24,True),0)
        self.assertEqual(op82(word,32,True),0)

    def test_round_to_even_and_zero_are_separate(self):
        for precision in (24,32):
            even, odd = 1 << (precision-1), (1 << (precision-1))+1
            self.assertEqual(rounded(2*even+1,0,precision), (even,1))
            self.assertEqual(rounded(2*odd+1,0,precision), (odd+1,1))
            self.assertEqual(rounded(2*odd+1,0,precision,True), (odd,1))

    def test_integer_model_agrees_with_independent_float32_operations(self):
        rng = random.Random(20261022)
        words = [0,1,0x7fffff,0x800000,0x37000100,0x3f000000,0x3f800000]
        words += [rng.randrange(0x3f800001) for _ in range(4096)]
        for word in words:
            value = struct.unpack('<f', struct.pack('<I',word))[0]
            self.assertEqual(op82(word),word_model(value))

    def test_scope_and_canonical_anchors(self):
        for value,raw in [(0,0),(.25,16384),(.5,32767),(.75,49151),(1,65534)]:
            self.assertEqual(op82(bits(value)),raw)
        for word in (-1,0x3f800001,0x7f800000,0x7fc00000,0x80000000):
            with self.assertRaises(ValueError):
                op82(word)


if __name__ == '__main__':
    unittest.main()

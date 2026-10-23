#!/usr/bin/env python3
"""Checks task-frame identity, SHARC+ register semantics and the 6.47 boundary."""
from fractions import Fraction
import struct
import unittest

from modifier_scheduler_audit import (initial_mode,system_register,byte_direct,frame_slot,
                                     cent_grid,exact_float32,RND32,TRUNCATE,PEYEN)
from modifier_op82_candidate import candidate_word,ModeDependentValue


class SchedulerResearch(unittest.TestCase):
    def test_initial_context_forces_precision_and_scalar_mode(self):
        for creator in [0,0xffffffff]+[1<<i for i in range(32)]+[0xffffffff^(1<<i) for i in range(32)]:
            self.assertEqual(initial_mode(creator)&(RND32|TRUNCATE|PEYEN),RND32)

    def test_bad_creator_words_are_rejected(self):
        for value in (True,-1,1<<32,1.0,'0x10000'):
            with self.assertRaises(ValueError):
                initial_mode(value)

    def test_stack_coordinates_agree_and_one_missing_postmodify_breaks_them(self):
        # Restore traversal: initial increment, 3 header reads, 45 register words,
        # then status word 37. Independent of the initializer's negative offsets.
        restored=4+12+180+148
        self.assertEqual(frame_slot(),restored)
        self.assertNotEqual(frame_slot(zero_posts=5),restored)
        self.assertNotEqual(frame_slot(store_delta=-57),restored)  # byte/word confusion

    def test_mode1stk_does_not_mean_immediate_live_mode_write(self):
        self.assertEqual(system_register(2),'MODE1')
        self.assertEqual(system_register(13),'MODE1STK')
        for code in (-1,16,True):
            with self.assertRaises(ValueError):
                system_register(code)

    def test_byte_direct_decoder_rejects_other_widths_and_exclusive_access(self):
        self.assertEqual(byte_direct(struct.pack('<3H',0x1a02,0x2008,0x5808)),
                         (False,2,0x20085808))
        self.assertEqual(byte_direct(struct.pack('<3H',0x1b00,0x31,0x7bb6)),
                         (True,0,0x317bb6))
        for p in (0x1a10,0x1a20,0x1a40,0x1a80,0x1072):
            with self.assertRaises(ValueError):
                byte_direct(struct.pack('<3H',p,0,0))

    def test_proposed_cent_grid_has_exactly_one_ambiguous_point(self):
        result=cent_grid()
        self.assertEqual((result['points'],result['modeIndependent']),(1001,1000))
        self.assertEqual(result['ambiguous'],[dict(display='6.47',normalizedBits='0x3f25a1cb',
                         results={'32-nearest':42401,'40-nearest':42400,'32-zero':42400,'40-zero':42400})])
        with self.assertRaises(ModeDependentValue):
            candidate_word(0x3f25a1cb)

    def test_647_disagreement_is_caused_by_intermediate_float32_rounding(self):
        word=0x3f25a1cb
        exact=exact_float32(word)
        self.assertLess(exact*65534,Fraction(84801,2))  # below raw 42400.5
        value=struct.unpack('<f',struct.pack('<I',word))[0]
        rounded_product=struct.unpack('<f',struct.pack('<f',value*65534))[0]
        self.assertEqual(rounded_product,42400.5)
        self.assertEqual(int(rounded_product+.5),42401)
        self.assertEqual(int(exact*65534+Fraction(1,2)),42400)


if __name__ == '__main__':
    unittest.main()

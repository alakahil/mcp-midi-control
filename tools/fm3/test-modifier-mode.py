#!/usr/bin/env python3
"""Guard wrong memory aliases, missing restore delay slots and ambiguous inputs."""
import struct
import unittest

from modifier_mode_audit import (visa_byte, bitop, move_with_compute, short_branch,
                                symbolic_restore, restoration_cases, RND32, TRUNCATE)
from modifier_op82_candidate import candidate_word, ModeDependentValue
from modifier_transport_audit import bits


class ModeCertificate(unittest.TestCase):
    def test_l1_alias_and_reject_external_guess_or_region_crossing(self):
        self.assertEqual(visa_byte(0x1cb91c,46),0x28397238)
        self.assertEqual(visa_byte(0x1cb13a,158),0x28396274)
        for start,end,base in [(0x120000,0x138000,0x28240000),
                               (0x160000,0x178000,0x282c0000),
                               (0x180000,0x190000,0x28300000),
                               (0x1c0000,0x1d0000,0x28380000)]:
            self.assertEqual(visa_byte(start,2),base)
            self.assertEqual(visa_byte(end-1,2),base+2*(end-start)-2)
            with self.assertRaises(ValueError):
                visa_byte(end-1,4)
        for a,n in [(0x9cb91c,2),(0x138000,2),(0x178000,2),(0x190000,2),
                    (0x1d0000,2),(0x1cb91c,1),(0x1cb91c,0)]:
            with self.assertRaises(ValueError):
                visa_byte(a,n)

    def test_synthetic_system_operands_reveal_mask_or_register_mutation(self):
        self.assertEqual(bitop(struct.pack('<3H',0x1482,1,0)),('test',2,RND32))
        self.assertNotEqual(bitop(struct.pack('<3H',0x1422,0,0x8000)),('clear',2,RND32))
        # Construct Type5a transfer fields from Ureg IDs; compute is irrelevant here.
        for dest,source in [(2,0x72),(0x72,2),(1,0x72),(0x72,1)]:
            p = 0x703e | ((source >> 2) << 6) | ((source >> 1) & 1)
            q = ((source & 1) << 15) | (dest << 7)
            self.assertEqual(move_with_compute(struct.pack('<3H',p,q,0)),(dest,source))
        with self.assertRaises(ValueError):
            move_with_compute(struct.pack('<3H',0x7000,0,0))

    def test_relative_branch_sign_condition_and_delay(self):
        # Synthesized relative jump with NOT TF, DB, ELSE and a negative displacement.
        v = (4 << 41)|(1 << 40)|(29 << 33)|(60 << 27)|(1 << 26)|(1 << 25)
        data = struct.pack('<3H',v >> 32,(v >> 16)&65535,v&65535)
        self.assertEqual(short_branch(data,0x100),(29,0xfc,True,True))

    def test_all_reviewed_return_routes_restore_symbolically(self):
        cases = restoration_cases()
        self.assertEqual(len(cases),5)
        self.assertTrue(all(c['proof']['equalsIncomingForEveryMatchingWord'] for c in cases))
        self.assertEqual({c['returnAt'] for c in cases},{'0x1cb92d','0x1cb17a','0x1cb181'})

    def test_missing_delay_restore_and_lost_btf_are_detected(self):
        # Returning before the first RTS delay slot would leave RND32 cleared.
        lost = symbolic_restore([('clear',RND32),('save',1),('set_saved',(1,RND32))],RND32,RND32)
        self.assertFalse(lost['equalsIncomingForEveryMatchingWord'])
        # A clobbered TF could choose the restore-bit branch for an incoming zero.
        wrong = symbolic_restore([('clear',RND32),('save',1),('set_saved',(1,RND32)),
                                  ('restore',1)],RND32,0)
        self.assertFalse(wrong['equalsIncomingForEveryMatchingWord'])
        self.assertFalse(symbolic_restore([('set',TRUNCATE)])['equalsIncomingForEveryMatchingWord'])
        with self.assertRaises(ValueError):
            symbolic_restore([('save',2),('restore',1)])


class OfflineCandidate(unittest.TestCase):
    def test_three_drag_candidates_and_display_values_are_distinct_inputs(self):
        for normalized,raw in [(0x3e7fdec5,16375),(0x3f40084e,49159),(0x3f0010cf,32784)]:
            self.assertEqual(candidate_word(normalized),raw)
        for normalized,raw in [(.25,16384),(.75,49151),(.5,32767)]:
            self.assertEqual(candidate_word(bits(normalized)),raw)

    def test_mode_sensitive_value_is_rejected_not_silently_rounded(self):
        with self.assertRaises(ModeDependentValue):
            candidate_word(0x37000100)

    def test_every_word_center_has_mode_independent_candidate(self):
        # This covers all 65535 codes, not all float32 inputs or all UI displays.
        for raw in range(65535):
            self.assertEqual(candidate_word(bits(raw/65534)),raw)

    def test_exact_input_contract_rejects_display_float_and_invalid_bits(self):
        for value in (2.5,'2.50',True,-1,0x80000000,0x3f800001,0x7f800000,0x7fc00000):
            with self.assertRaises(ValueError):
                candidate_word(value)


if __name__ == '__main__':
    unittest.main()

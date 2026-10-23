#!/usr/bin/env python3
"""Reject misleading opcode matches, missing delay instructions and partial evidence."""
import struct
import unittest

from modifier_return_audit import (compact_return_hypothesis, short_add,
                                   reviewed_delay_slots, cross_binary_equal)


def parcel(value):
    return struct.pack('<H',value)


class ReturnEvidence(unittest.TestCase):
    def test_subroutine_interrupt_and_delay_are_separate_bits(self):
        for opcode,kind,delayed in [(0x0abe,'RTS',False),(0x0afe,'RTS',True),
                                    (0x0bbe,'RTI',False),(0x0bfe,'RTI',True)]:
            r=compact_return_hypothesis(parcel(opcode))
            self.assertEqual((r['kind'],r['delayed'],r['condition']),(kind,delayed,31))

    def test_conflicting_figure_and_unreviewed_variants_are_rejected(self):
        for opcode in (0xc0be,0xc0fe,0xc1be,0xc1fe,0x0abf,0x0aff,0x0a80,
                       0x0a3e,0x0b3e,0x1afe,0x00fe):
            with self.assertRaises(ValueError):
                compact_return_hypothesis(parcel(opcode))

    def test_a_raw_hit_inside_a_memory_operand_is_not_a_return(self):
        # Real ADI LED instruction: I5=DM(-2,I6). Last parcel is fe0a.
        memory_instruction=bytes.fromhex('089cfe0a')
        with self.assertRaises(ValueError):
            compact_return_hypothesis(memory_instruction)

    def test_delay_area_counts_instructions_not_parcels(self):
        self.assertEqual(reviewed_delay_slots(0x1cb17a,parcel(0x0afe),[6,2]),
                         [0x1cb17b,0x1cb17e])
        self.assertEqual(reviewed_delay_slots(0x1cbc0c,parcel(0x0bfe),[4,4]),
                         [0x1cbc0d,0x1cbc0f])
        for sizes in ([6],[6,2,2],[6,1],[6,True]):
            with self.assertRaises(ValueError):
                reviewed_delay_slots(0x1cb17a,parcel(0x0afe),sizes)
        with self.assertRaises(ValueError):
            reviewed_delay_slots(0x830c8c,parcel(0x0abe),[2,2])

    def test_manual_return_figure_has_specific_alu_collisions(self):
        for opcode,dest,src in [(0xc080,8,0),(0xc0be,11,14),(0xc0fe,15,14),
                               (0xc0c8,12,8)]:
            self.assertEqual(short_add(parcel(opcode)),
                             dict(destination=dest,left=dest,right=src))
        for opcode in (0x0abe,0x0afe,0xc1be):
            with self.assertRaises(ValueError):
                short_add(parcel(opcode))

    def test_cross_binary_equality_rejects_one_changed_byte_and_shortened_tail(self):
        # The actual RTI and its two restored pointer operands, not just fe0b.
        tail=bytes.fromhex('fe0b2898850b2898010e')
        self.assertEqual(cross_binary_equal(tail,tail,10)['bytes'],10)
        bad=bytearray(tail);bad[4]^=1
        for left,right,count in [(tail,bytes(bad),10),(tail,tail[:-2],10),
                                 (tail,tail,8),(b'',b'',0)]:
            with self.assertRaises(ValueError):
                cross_binary_equal(left,right,count)


if __name__ == '__main__':
    unittest.main()

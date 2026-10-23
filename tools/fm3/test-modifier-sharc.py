#!/usr/bin/env python3
"""Synthetic ISA distinctions and diagnostic-model guards, no vendor bytes."""
import math
import struct
import unittest
from modifier_sharc_audit import indirect_jump, memory_move, physical_model


class Tests(unittest.TestCase):
    def test_delayed_branch_and_register_fields(self):
        # Synthetic JUMP(M10,I15), with and without DB; no native excerpt.
        for delayed in (False,True):
            b = struct.pack('<HH',0x083f,0xc000 | 2<<11 | int(delayed)<<10 | 0x3f)
            self.assertEqual(indirect_jump(b),(10,15,delayed))

    def test_branch_rejects_call_and_condition(self):
        for p in (0x08be,0x083c):
            with self.assertRaises(ValueError): indirect_jump(struct.pack('<HH',p,0x3f))

    def test_memory_width_is_not_old_long_word_bit(self):
        # DM(M2,I3)=R9, same l bit with sw vs unsupported lw encoding.
        p = 0x4000 | 3<<9 | 2<<6 | 31<<1
        for width,flags in ((1,0),(2,0x4000),(4,3)):
            d=memory_move(struct.pack('<HH',p,0x8000 | 9<<7 | 0x3c | flags))
            self.assertEqual((d['width'],d['store'],d['postmodify']),(width,True,False))
        with self.assertRaises(ValueError): memory_move(struct.pack('<HH',p,0xc4bf))

    def test_postmodify_and_sign_extension(self):
        p=0x4000 | 0x1000 | 2<<9 | 3<<6 | 31<<1
        d=memory_move(struct.pack('<HH',p,7<<7 | 0x403d))
        self.assertEqual(d,dict(store=False,index=2,modifier=3,postmodify=True,
                               register=7,width=2,signExtend=True))

    def test_diagnostic_model_guards_and_known_anchors(self):
        self.assertEqual([physical_model(v) for v in (-1,0,.25,.5,.75,1,2)],
                         [0,0,16384,32767,49151,65534,65534])
        for v,lo,hi in ((math.nan,0,1),(math.inf,0,1),(0,1,1),(0,2,1)):
            with self.assertRaises(ValueError): physical_model(v,lo,hi)


if __name__ == '__main__': unittest.main()

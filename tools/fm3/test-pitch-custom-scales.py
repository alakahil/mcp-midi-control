#!/usr/bin/env python3
"""Evidence coordinates, opcodes and derived rules; no firmware/device execution."""
import copy
import unittest
from pitch_custom_scales import load, check_spans, CODE


class CustomScaleTests(unittest.TestCase):
    def setUp(self):
        self.d=load()
        self.spans={k:v['hex'] for k,v in self.d['spans'].items()}

    def test_scope_and_rules(self):
        r=check_spans(self.spans)
        self.assertEqual(r['notes']['pids'],list(range(64,71)))
        self.assertEqual(r['notes']['types'],[4,5,10,13])
        self.assertEqual(r['global']['lastPid']-r['global']['firstPid']+1,384)
        self.assertEqual(r['global']['noteOrder'],['A','A#/Bb','B','C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab'])
        self.assertEqual(self.d['observedDefaultWords'],112)

    def test_critical_instruction_tampering(self):
        for key,pc in [('noteDispatch',0x81a2ad),('noteBounds',0x8198a3),('noteBounds',0x8198b1),
                       ('noteBounds',0x8198b9),('integerWriter',0x8237b6),('globalAddress',0x80f98f),
                       ('globalAddress',0x80f997),('globalAddress',0x80f9a3),('globalRead',0x80f9c7),('tonic',0x81a401)]:
            bad=copy.deepcopy(self.spans);b=bytearray.fromhex(bad[key]);b[(pc-CODE[key][0])*2]^=1;bad[key]=b.hex()
            with self.assertRaises(ValueError,msg=key+'/'+hex(pc)):check_spans(bad)

    def test_dispatch_and_descriptor_tampering(self):
        for key,offset in [('pidTable',64*4),('noteDescriptors',36),('noteDescriptors',0)]:
            bad=copy.deepcopy(self.spans);b=bytearray.fromhex(bad[key]);b[offset]^=1;bad[key]=b.hex()
            with self.assertRaises(ValueError):check_spans(bad)


if __name__=='__main__':unittest.main()

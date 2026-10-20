#!/usr/bin/env python3
"""Negative controls for the bounded firmware display receipt."""
import copy
import unittest
from pitch_display import load, check_spans


class PitchDisplayTests(unittest.TestCase):
    def test_domains_and_mapping(self):
        d=load();fields=d['fields']
        self.assertEqual(set(fields),{'71','72','74'})
        for pid in ('71','72'):
            self.assertEqual([i+fields[pid]['displayOffset'] for i in range(32)],list(range(1,33)))
        self.assertEqual(fields['74']['infiniteCode'],31)

    def test_opcode_threshold_label_and_dispatch_mutations_rejected(self):
        original={k:v['hex'] for k,v in load()['spans'].items()}
        for key,offset in [('scale1',10),('scale2',10),('repeats',8),('repeats',10),('repeats',12),('repeats',22),('table',74*4),('infinite',0),('dispatch',2)]:
            with self.subTest(key=key,offset=offset):
                spans=copy.deepcopy(original);b=bytearray.fromhex(spans[key]);b[offset]^=1;spans[key]=b.hex()
                with self.assertRaises(ValueError):check_spans(spans)


if __name__=='__main__':unittest.main()

#!/usr/bin/env python3
"""Regression checks for false-hit handling, scan exclusions and mode guards."""
import json
from pathlib import Path
import struct
import tempfile
import unittest

from modifier_init_audit import prove_mode
from modifier_writers_audit import (candidate, classify, readable_intervals,
                                    reviewed_inventory, RND32, SYX_SHA, LDR_SHA)
from six_field_resolution import sha


def parcels(*words): return struct.pack('<'+'H'*len(words),*words)


class WriterEvidence(unittest.TestCase):
    def test_toggle_writes_but_xor_and_test_only_compare(self):
        for opcode,operation,write in [(0x1402,'set',True),(0x1422,'clear',True),
                                      (0x1442,'toggle',True),(0x1482,'test',False),
                                      (0x14a2,'compare',False)]:
            hit = candidate(parcels(opcode,1,0),0)
            self.assertEqual((hit['operation'],hit['relevantWrite']),(operation,write))
        for opcode in (0x1462,0x14c2,0x14e2):
            self.assertIsNone(candidate(parcels(opcode,1,0),0))

    def test_mode_stack_and_unrelated_bits_are_not_confused(self):
        stack = candidate(parcels(0x140d,0,0x8000),0)
        self.assertEqual(stack['register'],'MODE1STK')
        self.assertTrue(stack['relevantWrite'])
        broadcast = candidate(parcels(0x1402,0x80,0),0)
        self.assertTrue(broadcast['writesRegister'])
        self.assertFalse(broadcast['relevantWrite'])
        self.assertIsNone(candidate(parcels(0x1403,1,0),0))

    def test_short_and_long_conditional_register_candidates(self):
        short = candidate(parcels(0x703e,0x393f),0)
        self.assertEqual((short['family'],short['condition'],short['sourceRegister']),('Type5b',31,'0x0'))
        conditional = candidate(parcels(0x7000,0x393f),0)
        self.assertEqual(conditional['condition'],0)
        long = candidate(parcels(0x71fe,0xb90a,0x5000),0)
        self.assertEqual((long['family'],long['sourceRegister']),('Type5a','0x1d'))

    def test_immediates_and_incomplete_tail_are_not_zero_padded(self):
        self.assertEqual(candidate(parcels(0x0ff2,0xffff),0)['value'],'0xffffffff')
        self.assertEqual(candidate(parcels(0x0f72,1,0),0)['value'],'0x10000')
        for raw in (parcels(0x0f72,1),parcels(0x1402,1),parcels(0x71fe,0xb90a),parcels(0x0ff2)):
            self.assertIsNone(candidate(raw,0))

    def test_duplicate_boot_rows_remain_ambiguous(self):
        rows=[(0,8,16,False,0),(0,8,16,False,0),(8,4,24,False,0)]
        self.assertEqual(readable_intervals(rows,0,16),
                         [(0,8,'ambiguous',2),(8,12,'scan',1),(12,16,'unmapped',0)])

    def test_contiguous_unique_blocks_allow_cross_block_prefix(self):
        rows=[(0,4,16,False,0),(4,4,36,False,0)]
        self.assertEqual(readable_intervals(rows,0,8),[(0,8,'scan',1)])
        self.assertEqual(readable_intervals(rows,0,8,((2,6),)),
                         [(0,2,'scan',1),(2,6,'excluded-format',1),(6,8,'scan',1)])

    def test_operand_hit_and_size_mismatch_are_never_promoted(self):
        owners={100:(100,6),101:(100,6),102:(100,6)}
        self.assertEqual(classify(100,6,owners)['status'],'reviewed-boundary')
        self.assertEqual(classify(101,6,owners)['status'],'inside-reviewed-instruction')
        self.assertEqual(classify(100,4,owners)['status'],'reviewed-boundary-size-conflict')
        self.assertEqual(classify(103,6,owners)['status'],'unreviewed')

    def test_hash_bound_partial_inventory_does_not_fill_review_gaps(self):
        raw=parcels(0x0001,0x0001,0x0001)
        m=dict(firmwareSyxSha256=SYX_SHA,firmwareLdrSha256=LDR_SHA,
               spans=[dict(start='0x64',size=6,sha256=sha(raw),reviewedInstructions=2)],
               instructions=[['0x64',2,'plain'],['0x66',2,'plain']])
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'review.json';p.write_text(json.dumps(m))
            owners,_=reviewed_inventory(lambda a,n:raw,[p])
            self.assertEqual(classify(101,2,owners)['status'],'unreviewed')
            with self.assertRaisesRegex(ValueError,'span drift'):
                reviewed_inventory(lambda a,n:raw[:-1]+b'\xff',[p])

    def test_overlapping_instruction_claims_are_rejected(self):
        raw=bytes(6)
        m=dict(firmwareSyxSha256=SYX_SHA,firmwareLdrSha256=LDR_SHA,
               spans=[dict(start='0x64',size=6,sha256=sha(raw),reviewedInstructions=2)],
               instructions=[['0x64',4,'plain'],['0x65',4,'plain']])
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'review.json';p.write_text(json.dumps(m))
            with self.assertRaisesRegex(ValueError,'Conflicting'):
                reviewed_inventory(lambda a,n:raw,[p])

    def test_early_return_is_safe_only_before_rounding_change(self):
        def node(ops=(),succ=(),ret=False):
            return dict(actions=list(ops),successors=list(succ),**{'return':ret})
        g={0:node([('save',29)],[1,2]),1:node(ret=True),
           2:node([('clear',RND32),('restore',29)],ret=True)}
        self.assertEqual(len(prove_mode(g,0,set())['returnSites']),2)
        g[0]['actions'].append(('clear',RND32))
        with self.assertRaisesRegex(ValueError,'changes incoming'):prove_mode(g,0,set())


if __name__=='__main__': unittest.main()

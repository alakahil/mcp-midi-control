#!/usr/bin/env python3
"""Reject wrong frame geometry and missing no-alias premises."""
import struct
import unittest

from modifier_frame_audit import (ENTRY,MODE_SET,compact_dm,call_frame,
                                  frame_layout,store_fields,prove_slot)


def words(*p):return struct.pack('<'+'H'*len(p),*p)


def node(actions=(),successors=(),ret=False):
    return dict(actions=list(actions),successors=list(successors),**{'return':ret})


def example():
    # Either bypass MODE1 changes, or save -> enable SIMD -> zero/more
    # buffer stores -> restore. The aliasing loop is not assumed to terminate.
    return {0:node(successors=[1,4]),
            1:node([('save-slot',-52),('set',MODE_SET)],[2,3]),
            2:node([('possible-alias',20)],[2,3]),
            3:node([('load-slot',-52)],[4]),4:node(ret=True)}


class FrameControls(unittest.TestCase):
    def test_compact_push_and_nonstack_store(self):
        self.assertEqual(compact_dm(words(0x9ff5)),dict(store=True,index=7,
            modifier=7,postmodify=True,register=5,width=4,signExtend=False))
        other=compact_dm(words(0x9572))
        self.assertEqual((other['index'],other['modifier'],other['register']),(2,5,2))
        self.assertFalse(compact_dm(words(0x9552))['store'])
        for p in (0x8ff5,0xaff5,0x9fe5):
            with self.assertRaises(ValueError):compact_dm(words(p))
        with self.assertRaises(ValueError):compact_dm(words(0x9ff5,0))

    def test_cjump_counts_instructions_not_parcels(self):
        at=0x1000
        raw=words(0x1804,ENTRY>>16,ENTRY&65535,0x9ff2,0x9fc0,0,at+6)
        r=call_frame(raw,at)
        self.assertEqual((r['delayInstructions'],r['calleeI7MinusI6Bytes']), (2,-8))
        self.assertEqual(r['continuationWithM14One'],'0x1007')
        self.assertFalse(r['runtimeAbiValidityProven'])
        for pos in (0,4,6,8,12):
            changed=bytearray(raw);changed[pos]^=1
            with self.subTest(pos=pos):
                with self.assertRaises(ValueError):call_frame(changed,at)
        with self.assertRaises(ValueError):call_frame(raw[:-2],at)

    def test_eleven_pushes_match_minus_thirteen_words(self):
        registers=[5,6,9,10,11,13,14,0x49,0x19,0x28,8]
        r=frame_layout(registers)
        self.assertEqual([p['offsetBytes'] for p in r['pushes']],list(range(-8,-52,-4)))
        self.assertTrue(r['sameAddress']);self.assertEqual(r['afterModeSaveOffsetBytes'],-56)
        for args in ((registers[:-1],-8,-1),(registers,-4,-1),(registers,-8,1)):
            self.assertFalse(frame_layout(*args)['sameAddress'])

    def test_store_prefix_keeps_conditional_pe_and_compute_limits(self):
        r=store_fields(words(0x58b6,0xaa3f))
        self.assertEqual((r['index'],r['modifier'],r['register'],r['condition']),
                         (4,2,'0x54',27))
        self.assertTrue(r['computeLegalityIndependentlyProven'])
        self.assertFalse(store_fields(words(0x5abe,0x8658,0xdc02))['computeLegalityIndependentlyProven'])
        for raw in (words(0x58b6,0x2a3f),words(0x58b7,0xaa3f),words(0x58b6,0xea3f)):
            with self.assertRaises(ValueError):store_fields(raw)

    def test_bypass_and_loop_with_explicit_nonalias_contract(self):
        r=prove_slot(example(),0,{20})
        self.assertTrue(r['allFiniteNormalReturnsPreserveModeUnderPremises'])
        self.assertEqual(r['liveSlotStoreSites'],['0x14'])
        self.assertFalse(r['aliasPremisesDischarged']);self.assertFalse(r['terminationProven'])

    def test_unknown_write_cannot_restore_a_trusted_word(self):
        with self.assertRaisesRegex(ValueError,'clobbered'):prove_slot(example(),0,set())

    def test_restore_requires_matching_saved_address_on_every_path(self):
        g=example();g[0]['successors'].append(3)
        with self.assertRaises(ValueError):prove_slot(g,0,{20})
        g=example();g[3]['actions']=[('load-slot',-48)]
        with self.assertRaises(ValueError):prove_slot(g,0,{20})

    def test_changed_mode_cannot_return_without_restore(self):
        g=example();g[3]['actions']=[]
        with self.assertRaisesRegex(ValueError,'changes MODE1'):prove_slot(g,0,{20})

    def test_open_edges_and_unreviewed_actions_are_rejected(self):
        g=example();g[2]['successors'].append(99)
        with self.assertRaises(ValueError):prove_slot(g,0,{20})
        g=example();g[2]['actions'].append(('call',123))
        with self.assertRaises(ValueError):prove_slot(g,0,{20})
        g=example();g[2]['successors']=[]
        with self.assertRaises(ValueError):prove_slot(g,0,{20})


if __name__=='__main__':unittest.main()

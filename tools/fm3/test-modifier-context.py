#!/usr/bin/env python3
"""Check memory operand distinctions and pre-mask status preservation."""
import struct
import unittest

from modifier_context_audit import (ALL, CONFIGURED_MMASK, RND32, TRUNCATE,
    context_candidate, memory_operand, stack_status, status_trace)


def words(*values):return struct.pack('<'+'H'*len(values),*values)


class ContextEvidence(unittest.TestCase):
    def test_signed_memory_offset_and_store_direction(self):
        load=memory_operand(words(0x9c08,0x3973))
        self.assertEqual((load['register'],load['index'],load['displacementWords'],load['store']),
                         (0x72,6,-13,False))
        self.assertEqual(context_candidate(words(0x9c08,0x3973),0)['register'],'MODE1')
        self.assertTrue(memory_operand(words(0x9d08,0x3973))['store'])
        self.assertIsNone(context_candidate(words(0x9d08,0x3973),0))

    def test_pm_selector_is_bit5_and_index_selects_dag2(self):
        pm=memory_operand(words(0x9828,0x0b85))
        self.assertEqual((pm['pm'],pm['index'],pm['register'],pm['displacementWords']),
                         (True,12,23,5))
        with self.assertRaises(ValueError):memory_operand(words(0x9848,0x0b85))
        with self.assertRaises(ValueError):memory_operand(words(0x9c08,0xb973))

    def test_type15b_reserved_bits_are_not_register_aliases(self):
        # PRM Figure16-4 fixes instruction bits15:14 to zero. Mutate the
        # native MODE1 restore, plus its PM/LW/store operand variants.
        for p in (0x9c08,0x9c28,0x9c88,0x9d08):
            for reserved in (0x4000,0x8000,0xc000):
                raw=words(p,0x3973|reserved)
                with self.subTest(p=hex(p),reserved=hex(reserved)):
                    with self.assertRaises(ValueError):memory_operand(raw)
                    self.assertIsNone(context_candidate(raw,0))

    def test_direct_and_long_immediate_forms_do_not_mix_addresses(self):
        direct=context_candidate(words(0x1072,0x1234,0x5678),0)
        indexed=context_candidate(words(0xac72,0xffff,0xffcc),0)
        self.assertEqual(direct['memoryAddress'],'0x12345678')
        self.assertEqual((indexed['index'],indexed['displacementEncoded']),(6,'0xffffffcc'))
        self.assertNotIn('displacementWords',indexed)
        self.assertIsNone(context_candidate(words(0x1172,0x1234,0x5678),0))

    def test_mmask_destination_rewrite_preserves_other_operands(self):
        immediate=context_candidate(words(0x0f73,0x00e0,0xb003),0)
        self.assertEqual((immediate['register'],immediate['value']),('MMASK','0xe0b003'))
        transfer=context_candidate(words(0x773e,0x39bf),0)
        self.assertEqual((transfer['register'],transfer['sourceRegister']),('MMASK','0x70'))
        self.assertEqual(context_candidate(words(0x1443,0,0x8000),0)['operation'],'toggle')
        self.assertIsNone(context_candidate(words(0x14a3,0,0x8000),0))

    def test_type3_prefixes_do_not_imply_compute_legality(self):
        for q,size,family in [(0x393f,4,'Type3b-prefix'),(0x3934,6,'Type3d-prefix'),
                              (0x3901,6,'Type3a-prefix')]:
            raw=words(0x4c3e,q,0)[:size];r=context_candidate(raw,0)
            self.assertEqual((r['size'],r['family']),(size,family))
            self.assertFalse(r['computeOrWidthLegalityProven'])
            self.assertIsNone(context_candidate(raw[:-2],0))

    def test_status_stack_bits_and_contradictory_controls(self):
        self.assertEqual(stack_status(words(0x1728,0,0))['operation'],'push-status')
        self.assertTrue(stack_status(words(0x1728,0,0))['pushPc'])
        self.assertEqual(stack_status(words(0x1710,0,0))['operation'],'pop-status')
        for raw in (words(0x1730,0,0),words(0x172c,0,0),words(0x17e0,0,0),
                    words(0x1722,0,0),words(0x1720,0x8000,0),words(0x1720,0,1)):
            with self.assertRaises(ValueError):stack_status(raw)

    def test_return_hypothesis_and_native_long_form_stay_distinct(self):
        short=context_candidate(words(0x0bfe),0)
        self.assertFalse(short['nativeSemanticsProven'])
        long=context_candidate(words(0x0b3e,0x0400,0),0)
        self.assertEqual(long['family'],'Type11a-RTI-prefix')
        self.assertIsNone(context_candidate(words(0x0a3e,0x0400,0),0))
        self.assertIsNone(context_candidate(words(0x0b3e,0x0400),0))

    def test_push_saves_original_before_clearing_live_mode(self):
        r=status_trace(['push','pop'])
        event=r['events'][0]
        self.assertEqual(event['live']['keepMask'],hex(ALL&~CONFIGURED_MMASK))
        self.assertEqual(event['stack'][-1]['keepMask'],hex(ALL))
        self.assertTrue(r['restoresIncoming']);self.assertTrue(r['preservesOuterStatus'])
        self.assertFalse(CONFIGURED_MMASK&RND32)
        self.assertTrue(CONFIGURED_MMASK&TRUNCATE)
        for bits in (0,TRUNCATE,RND32,TRUNCATE|RND32):
            after=bits&~CONFIGURED_MMASK
            self.assertEqual(after&RND32,bits&RND32)
            self.assertEqual(after&TRUNCATE,0)

    def test_selected_mode_restores_even_if_push_clears_every_bit(self):
        r=status_trace(['push','selected','rts','rts','rti-assumed'],ALL)
        self.assertEqual(r['events'][0]['live']['keepMask'],'0x0')
        self.assertTrue(r['restoresSelected']);self.assertFalse(r['restoresIncoming'])
        self.assertFalse(r['nativePathProven'])
        self.assertFalse(status_trace(['push','selected','rts'])['restoresSelected'])

    def test_nested_stack_clobber_underflow_and_invalid_mask(self):
        r=status_trace(['push','push','pop','pop'])
        self.assertTrue(r['restoresIncoming']);self.assertTrue(r['preservesOuterStatus'])
        self.assertFalse(status_trace(['push','selected','clobber','rti-assumed'])['restoresSelected'])
        for actions in (['pop'],['selected'],['push','pop','pop']):
            with self.assertRaises(ValueError):status_trace(actions)
        for mask in (-1,ALL+1,True):
            with self.assertRaises(ValueError):status_trace(['push'],mask)


if __name__=='__main__':unittest.main()

#!/usr/bin/env python3
"""Guard the address spaces, loop sign bit and conditional status-stack proof."""
import struct
import unittest

from modifier_interrupt_audit import (isa_to_visa, l2_visa_byte, immediate_loop,
                                      registration_layout, status_bridge)
from modifier_caller_audit import direct_control


class InterruptEvidence(unittest.TestCase):
    def test_packed_isa_is_not_visa_parcel_order(self):
        packed=bytes.fromhex('7fbb1c043e06')
        decoded=direct_control(isa_to_visa(packed),0x9003c)
        self.assertEqual(decoded,dict(condition=31,call=False,target=0x1cbb7f,delayed=True))
        with self.assertRaises(ValueError):
            direct_control(packed,0x9003c)
        for short in (packed[:-1],packed+b'\0'):
            with self.assertRaises(ValueError):
                isa_to_visa(short)

    def test_l2_alias_and_instruction_crossing_boundary(self):
        self.assertEqual(l2_visa_byte(0xbb8000,10),0x200b0000)
        self.assertEqual(l2_visa_byte(0xbbffff,2),0x200bfffe)
        for address,size in [(0xb9ffff,2),(0xbbffff,4),(0xbc0000,2),
                             (0xbb8000,3),(0xbb8000,0),(True,2)]:
            with self.assertRaises(ValueError):
                l2_visa_byte(address,size)

    def test_f1_flag_does_not_make_forward_loop_negative(self):
        self.assertEqual(immediate_loop(bytes.fromhex('000c80024500'),0x8343a1),
                         dict(count=2,target=0x8343e6,modeF1=True))
        # A signed 23-bit -2 displacement with F1 clear; full 16-bit count.
        self.assertEqual(immediate_loop(struct.pack('<3H',0x0cff,0xff7f,0xfffe),100),
                         dict(count=65535,target=98,modeF1=False))
        with self.assertRaises(ValueError):
            immediate_loop(bytes.fromhex('000d80024500'),0x8343a1)

    def test_map_halfwords_and_callback_words_use_different_strides(self):
        a=registration_layout(50,21);b=registration_layout(51,22)
        self.assertEqual(a,dict(mapEntry=0x2e4984,handler=0x2e4bd0,argument=0x2e4bd4))
        self.assertEqual(b['mapEntry']-a['mapEntry'],2)
        self.assertEqual(b['handler']-a['handler'],8)
        self.assertEqual(registration_layout(255,276)['argument'],0x2e53cc)
        for sid,index in [(-1,1),(256,1),(50,0),(50,277),(True,1),(50,False)]:
            with self.assertRaises(ValueError):
                registration_layout(sid,index)

    def test_selected_context_is_not_the_interrupted_mode(self):
        result=status_bridge(['push','selected','rts','rts','rti'])
        self.assertTrue(result['restoresSelectedTaskMode'])
        self.assertTrue(result['preservesOuterStatus'])
        self.assertFalse(result['provesIncomingInterruptedModePreserved'])
        self.assertEqual(result['events'][-2]['mode'],'scheduler-mode')
        self.assertEqual(result['events'][-1]['mode'],'selected-task-mode')

    def test_missing_push_clobber_and_rts_substitution_do_not_pass(self):
        for actions in (['selected','rts','rts','rti'],
                        ['push','selected','clobber','rts','rti'],
                        ['push','selected','rts','rts','rts'],
                        ['push','selected','rts','rti','rti']):
            with self.assertRaises(ValueError):
                status_bridge(actions)


if __name__ == '__main__':
    unittest.main()

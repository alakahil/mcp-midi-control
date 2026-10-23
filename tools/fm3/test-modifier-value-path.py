#!/usr/bin/env python3
"""Controls for boot-memory reconstruction and native branch/source identity."""
import struct
import unittest

from modifier_value_path_audit import BootMemory, BASE, bl_target, check


def block(address, payload):
    return struct.pack('<4I', 0xad000000, address, len(payload), 0)+payload


def fill(address, size, value):
    return struct.pack('<4I', 0xad000100, address, size, value)


class ValuePathControls(unittest.TestCase):
    def test_crosses_data_fill_and_next_data_without_reading_headers(self):
        memory = BootMemory(block(0x1000,b'ab') + fill(0x1002,8,0x44332211)
                            + block(0x100a,b'yz'))
        self.assertEqual(memory.read(0x1001,11), b'b\x11\x22\x33\x44\x11\x22\x33\x44yz')

    def test_unaligned_fill_preserves_word_phase(self):
        memory = BootMemory(fill(0x2000,9,0x04030201))
        self.assertEqual(memory.read(0x2003,6),b'\x04\x01\x02\x03\x04\x01')

    def test_gaps_overlaps_truncation_and_empty_reads_fail_closed(self):
        for data,start,size in [
            (block(0x1000,b'abc'),0x1002,2),
            (block(0x1000,b'abcd')+block(0x1002,b'xy'),0x1000,4),
            (fill(0x1000,8,0)+fill(0x1000,8,0),0x1000,4),
            (block(0x1000,b'abc'),0x1000,0),
        ]:
            with self.subTest(start=start,size=size):
                with self.assertRaises(ValueError): BootMemory(data).read(start,size)
        for data in (b'\0'*15, block(0x1000,b'abc')[:-1]):
            with self.assertRaises(ValueError): BootMemory(data)

    def test_bl_sign_extension_and_opcode_rejection(self):
        self.assertEqual(bl_target(struct.pack('<I',0x97ffffff),BASE),BASE-4)
        self.assertEqual(bl_target(struct.pack('<I',0x94000002),BASE),BASE+8)
        with self.assertRaises(ValueError): bl_target(struct.pack('<I',0x14000002),BASE)

    def test_wrong_original_is_rejected_before_firmware_analysis(self):
        with self.assertRaisesRegex(ValueError,'Wrong original ARM64 editor'):
            check(b'not the original',b'not firmware')


if __name__ == '__main__':
    unittest.main()

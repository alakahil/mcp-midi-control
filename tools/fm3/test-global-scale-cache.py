#!/usr/bin/env python3
"""Synthetic decoder controls; optionally cross-check the pinned owner firmware."""
import argparse
import copy
import json
from pathlib import Path
import struct
import sys
import unittest

sys.dont_write_bytecode = True
import global_scale_cache as cache


def parcels(*values):
    return struct.pack('<'+'H'*len(values), *values)


def jump(address, target, condition, delayed=False):
    displacement = (target-address) & 0xffffff
    value = displacement | (int(delayed) << 26)
    return parcels(0x0700 | (condition << 1), value >> 16, value & 65535)


def synthetic_gate(lower=134, upper=1653):
    return (parcels(0x0f82,lower,0xc3f2) + jump(0x80f7c5,0x810355,1,True)
            + parcels(0x018c,0xdba0,0x0f82,upper,0xc3f2)
            + jump(0x80f7cd,0x810355,18))


class DecoderControls(unittest.TestCase):
    def test_signed_offsets_and_dag_bank(self):
        # I3 -> I4, then I11 -> I12: DAG bank is bit 38, not bit 39.
        self.assertEqual(cache.modify(parcels(0x163b,0,304)),(4,3,304))
        self.assertEqual(cache.modify(parcels(0x167b,65535,65532)),(12,11,-4))
        with self.assertRaises(ValueError): cache.modify(parcels(0x16bb,0,304))

    def test_constructor_byte_offsets(self):
        self.assertEqual(cache.dm7(parcels(0x9b08,(28<<7)|97)),(True,5,28,-124))
        self.assertEqual(0x1d4 + cache.dm7(parcels(0x9b08,(28<<7)|97))[3],0x158)
        with self.assertRaises(ValueError): cache.dm7(parcels(0x9b88,(28<<7)|97))

    def test_immediate_sign_and_parcel_order(self):
        self.assertEqual(cache.immediate(parcels(0x0f82,0xffe8)),(2,-24))
        self.assertEqual(cache.immediate(parcels(0x0f1c,0xc200,0x8550)),(28,0xc2008550))
        with self.assertRaises(ValueError): cache.immediate(parcels(0x0f9c,0xc200,0x8550))

    def test_branch_sign_and_delayed_flag(self):
        self.assertEqual(cache.relative_branch(jump(0x810000,0x80f000,18,True),0x810000),
                         (18,0x80f000,True))
        with self.assertRaises(ValueError): cache.relative_branch(parcels(0x0782,0,1),0x810000)

    def test_all_scale_pids_and_nearest_gate_boundaries(self):
        lo,hi = cache.gate(synthetic_gate())
        bypass = [p for p in range(902,1286) if lo <= p <= hi]
        self.assertEqual(bypass,list(range(902,1286)))
        self.assertEqual([lo <= p <= hi for p in (133,134,1653,1654)], [False,True,True,False])

    def test_wrong_branch_condition_delay_and_compare_rejected(self):
        data=synthetic_gate()
        for index in (4,6,8,12,20,22):
            with self.subTest(index=index):
                changed=bytearray(data); changed[index]^=2
                with self.assertRaises(ValueError): cache.gate(bytes(changed))

    def test_boot_regions_reject_ambiguity_and_cross_boundary_reads(self):
        rows=[(0x1000,16,0,False,0),(0x2000,32,0,True,0)]
        self.assertTrue(cache.region(rows,0x2004,28)[3])
        for start,size in [(0x100f,2),(0x3000,1),(0x1000,0)]:
            with self.assertRaises(ValueError): cache.region(rows,start,size)
        with self.assertRaises(ValueError): cache.region(rows+[rows[0]],0x1000,4)

    def test_truncated_boot_and_unsupported_thumb_fail_closed(self):
        with self.assertRaises(ValueError): cache.boot_blocks(bytes(15))
        with self.assertRaises(ValueError): cache.boot_blocks(struct.pack('<4I',0,0x1000,4,0))
        with self.assertRaises(ValueError): cache.bridge(parcels(0xffff),{},1)


def firmware_controls(path):
    """Real firmware stays outside the repository; no raw bytes in result."""
    result=cache.build(path)
    receipt=Path(__file__).resolve().parents[2]/'docs/fm3/parameter-evidence/global-scale-cache-fw13.json'
    if result != json.loads(receipt.read_text()): raise AssertionError('Receipt drift')
    data=cache.unpack(path.read_bytes())
    spans={k:data[o:o+n] for k,(_,_,o,n,_) in cache.SPANS.items()}
    mutations=0
    for name in spans:
        for at in range(len(spans[name])):
            changed=copy.copy(spans); b=bytearray(spans[name]);b[at]^=1;changed[name]=bytes(b)
            try: cache.check(changed)
            except ValueError: mutations+=1
            else: raise AssertionError('Accepted changed firmware: '+name)
    # Vary the synthetic frame's effect ID; the actual Thumb instructions must
    # publish distinct pointers at the correct entry stride and field offsets.
    fields={0x158:0xc2008550,0x160:0xc2016dd0}
    for effect in (1,2,199,319):
        for name,field,slot in [('sharedNumericPointer',0x158,0x10),('sharedDisplayPointer',0x160,0x14)]:
            assert cache.bridge(spans[name],fields,effect) == (0xc1857ac0+effect*0x44+slot,fields[field])
    for key in ('scaleToNumericCacheProducerTraced','endToEndStaticVerified','nonzeroHardwareVerified',
                'newHardwareRangeValidation','allRuntimeCacheWritersExcluded','deviceIO'):
        assert result['assessment'][key] is False
    assert result['additionalFirmwareBytesRetained']==0
    assert all('hex' not in row for row in result['spans'].values())
    print(json.dumps({'firmwareCrosscheck':True,'rejectedSpanMutations':mutations,
                      'pointerBridgeCases':8,'newHardwareValidation':False}))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--firmware',type=Path)
    args=parser.parse_args()
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(DecoderControls)
    if not unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful(): raise SystemExit(1)
    if args.firmware: firmware_controls(args.firmware)

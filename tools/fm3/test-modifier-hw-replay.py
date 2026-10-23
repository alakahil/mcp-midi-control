import copy
import json
import subprocess
import unittest
from functools import reduce
import operator

from modifier_hw_replay import load_capture, CHECK, ROOT, replay, frames, build


class WireEvidence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        f=load_capture();cls.plan=json.loads(f['plan.json']);cls.report=json.loads(f['report.json'])
        cls.lines=[json.loads(x) for x in f['wire.jsonl'].splitlines()]
        cls.baseline=json.loads(subprocess.check_output(['node',str(CHECK),'baseline'],cwd=ROOT))
    def run_capture(self,lines=None,report=None):
        return replay(self.plan,report or self.report,lines or self.lines,self.baseline)
    def test_complete_capture_and_independent_checks(self):
        r=self.run_capture()
        self.assertEqual((r['setCalls'],r['getCalls'],r['rxFrames']),(44,92,320))
        self.assertEqual(len(r['observations']),44)
        self.assertTrue(all(x['twoRawReadsAgree'] for x in r['observations']))
    def test_tx_with_correct_checksum_but_different_float_is_rejected(self):
        lines=copy.deepcopy(self.lines)
        row=next(x for x in lines if x['kind']=='tx-intent' and x['label']=='07')
        b=bytearray.fromhex(row['hex']);b[12]^=1;b[-2]=reduce(operator.xor,b[:-2],0)&127;row['hex']=b.hex()
        with self.assertRaisesRegex(ValueError,'input bits'):self.run_capture(lines)
    def test_checksum_corruption_and_missing_frame_rejected(self):
        good=frames(bytes.fromhex(next(x['hex'] for x in self.lines if x['kind']=='rx')))[0]
        with self.assertRaisesRegex(ValueError,'checksum'):frames(good[:-2]+bytes([good[-2]^1,247]))
        with self.assertRaisesRegex(ValueError,'Truncated'):frames(good[:-1])
    def test_stale_or_swapped_transaction_labels_rejected(self):
        lines=copy.deepcopy(self.lines)
        row=next(x for x in lines if x['kind']=='rx' and x['label']=='07-read-1');row['label']='05-read-1'
        with self.assertRaisesRegex(ValueError,'wrong transaction'):self.run_capture(lines)
    def test_report_pass_flag_cannot_substitute_for_wire(self):
        r=copy.deepcopy(self.report);r['steps'][6]['observedRaw']=42400
        with self.assertRaisesRegex(ValueError,'Report does not match'):self.run_capture(report=r)
    def test_partial_or_extra_tx_rejected(self):
        lines=copy.deepcopy(self.lines)
        next(x for x in lines if x['kind']=='tx-result')['written']=1
        with self.assertRaisesRegex(ValueError,'Partial'):self.run_capture(lines)
        with self.assertRaises(ValueError):self.run_capture(self.lines+self.lines[-3:])
    def test_full_audit_distinguishes_modes_and_keeps_limits(self):
        r=build()
        self.assertEqual(r['op82']['modeScores'],{'32-nearest':29,'40-nearest':24,'32-zero':24,'40-zero':24})
        self.assertEqual(r['uniqueInputPoints'],37)
        self.assertTrue(all(all(p['matches'].values()) for p in r['ordinaryOp9']))
        self.assertTrue(r['finalExport']['allUnrequestedBodyBytesPreserved'])
        self.assertFalse(r['runtimeModeGloballyProven']);self.assertFalse(r['generatorWriteSupportAdded'])


if __name__=='__main__':unittest.main()

#!/usr/bin/env python3
"""Check return-delay restoration, signed size guards and visible dependencies."""
import struct
import unittest

from modifier_buffer_audit import SIMD, delayed_return48, graph, prove
from modifier_init_audit import prove_mode
from modifier_table_audit import BDCST1, RND32, dependency_diagnostic, large_count


def parcels(value,size=6):
    return b''.join(struct.pack('<H',(value>>shift)&65535) for shift in range(8*size-16,-1,-16))


def node(actions=(),successors=(),ret=False):
    return dict(actions=list(actions),successors=list(successors),**{'return':ret,'nonreturn':False})


class TableEvidence(unittest.TestCase):
    def test_native_return_accepts_compute_but_rejects_other_control_forms(self):
        self.assertEqual(delayed_return48(parcels(0x0a3e04130008)),
                         dict(kind='RTS',delayed=True,condition=31,compute=0x130008))
        for value in (0x0b3e04130008,0x0a3e00130008,0x0a3e06130008,
                      0x0a3e05130008,0x0a0004130008,0xc0fe00000000):
            with self.assertRaises(ValueError):delayed_return48(parcels(value))
        with self.assertRaises(ValueError):delayed_return48(bytes.fromhex('fe0a'))

    def test_restore_in_first_delay_slot_is_executed_before_return(self):
        data={100:parcels(0x0a3e04130008),103:parcels(0x71fe390a5000),106:bytes.fromhex('0100')}
        inv={100:(6,'return48'),103:(6,'plain'),106:(2,'plain')}
        actions={100:[('save',28),('set',BDCST1),('clear',RND32)],103:[('restore',28)]}
        g=graph(lambda a,n:data[a],inv,actions,100)
        self.assertEqual(g[100]['successors'],[])
        self.assertTrue(prove_mode(g,100,set())['allReturningPathsPreserveIncomingMode1'])
        del actions[103]
        with self.assertRaisesRegex(ValueError,'changes incoming'):prove_mode(graph(lambda a,n:data[a],inv,actions,100),100,set())

    def test_two_delay_instructions_are_required_not_two_parcels(self):
        data={100:parcels(0x0a3e04000000),103:bytes.fromhex('0100'),104:bytes.fromhex('0100')}
        inv={100:(6,'return48'),103:(2,'plain'),104:(2,'plain')}
        for bad in ({100:inv[100],103:inv[103]},{**inv,104:(2,'branch')}):
            with self.assertRaisesRegex(ValueError,'delay slot'):graph(lambda a,n:data[a],bad,{},100)

    def test_clobbered_shared_register_cannot_restore_saved_mode(self):
        g={0:node([('save',28),('clear',RND32),('clobber',28),('restore',28)],ret=True)}
        with self.assertRaisesRegex(ValueError,'clobbered'):prove_mode(g,0,set())

    def test_simd_table_call_requires_a_leaf_contract_valid_in_simd(self):
        g={0:node([('set',SIMD),('call',100),('clear',SIMD)],ret=True)}
        self.assertTrue(prove(g,0,{100:dict(zeroMask=0)})['conditionalMode1Identity'])
        with self.assertRaisesRegex(ValueError,'entry-mode guard'):prove(g,0,{100:dict(zeroMask=SIMD)})

    def test_large_count_guard_uses_signed_comparison(self):
        for value in (4,0x4c00,0xcafbc0,0x7fffffff):self.assertEqual(large_count(value),value)
        for value in (True,3,0,-1,0x80000000,0xffffffff,4.0):
            with self.assertRaises(ValueError):large_count(value)

    def test_diagnostic_lists_all_open_calls_without_promoting_closure(self):
        g={0:node([('call',10)],[1]),1:node([('call',20)],[2]),2:node([('call',30)],ret=True)}
        result=dependency_diagnostic(g,0,{10:dict(zeroMask=SIMD)})
        self.assertFalse(result['closed'])
        self.assertEqual(result['knownDirectCallees'],['0xa'])
        self.assertEqual(result['unresolvedDirectCallees'],['0x14','0x1e'])
        self.assertEqual(result['conditionalDiagnostic']['assumedCallees'],['0x14','0x1e'])
        with self.assertRaisesRegex(ValueError,'open dependency set'):
            dependency_diagnostic(g,0,{v:dict(zeroMask=SIMD) for v in (10,20,30)})

    def test_second_delay_slot_cannot_change_mode_after_restoration(self):
        data={100:parcels(0x0a3e04000000),103:parcels(0x71fe390a5000),106:parcels(0x142200010000)}
        inv={100:(6,'return48'),103:(6,'plain'),106:(6,'plain')}
        actions={100:[('save',28),('clear',RND32)],103:[('restore',28)],106:[('clear',RND32)]}
        g=graph(lambda a,n:data[a],inv,actions,100)
        with self.assertRaisesRegex(ValueError,'changes incoming'):prove_mode(g,100,set())


if __name__=='__main__':unittest.main()

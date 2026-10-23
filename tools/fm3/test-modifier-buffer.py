#!/usr/bin/env python3
"""Fail closed on returning error paths, missing guards and open dependencies."""
import copy
import unittest

from modifier_buffer_audit import SIMD, graph, no_return, prove


def node(actions=(),successors=(),ret=False,stop=False):
    return dict(actions=list(actions),successors=list(successors),**{'return':ret,'nonreturn':stop})


class BufferEvidence(unittest.TestCase):
    def test_nonreturn_cycle_with_opaque_calls(self):
        nodes={0:node([('call',100)],[1]),1:node([], [2]),2:node([], [1])}
        result=no_return(nodes,0)
        self.assertFalse(result['normalReturnReachable'])
        self.assertEqual(result['opaqueCalls'],['0x64'])
        nodes[2]['successors'].append(3);nodes[3]=node(ret=True)
        with self.assertRaises(ValueError):no_return(nodes,0)

    def test_open_endpoint_is_not_a_nonreturn_certificate(self):
        for nodes in ({0:node()}, {0:node([], [1])}):
            with self.assertRaises(ValueError):no_return(nodes,0)

    def test_fatal_only_call_can_be_opaque_but_returning_call_cannot(self):
        nodes={0:node([], [1,2]),1:node(ret=True),2:node([('call',100)],[3]),
               3:node([('noreturn',200)],stop=True)}
        result=prove(nodes,0,{})
        self.assertEqual(result['nonreturnOnlyNodes'],2)
        nodes[3]=node([], [1])
        with self.assertRaisesRegex(ValueError,'Unproved synchronous callee'):prove(nodes,0,{})

    def test_set_clear_is_identity_only_for_scalar_entry(self):
        nodes={0:node([('set',SIMD),('clear',SIMD)],ret=True)}
        self.assertTrue(prove(nodes,0,{})['conditionalMode1Identity'])
        with self.assertRaisesRegex(ValueError,'changes incoming'):prove(nodes,0,{},zero_mask=0)

    def test_unknown_branch_cannot_skip_clear(self):
        nodes={0:node([('set',SIMD)],[1,2]),1:node([('clear',SIMD)],ret=True),2:node(ret=True)}
        with self.assertRaisesRegex(ValueError,'changes incoming'):prove(nodes,0,{})

    def test_scalar_callee_guard_is_checked_at_call_site(self):
        nodes={0:node([('set',SIMD),('call',20),('clear',SIMD)],ret=True)}
        with self.assertRaisesRegex(ValueError,'entry-mode guard'):prove(nodes,0,{20:dict(zeroMask=SIMD)})
        self.assertEqual(prove(nodes,0,{20:dict(zeroMask=0)})['assumedCallees'],[])

    def test_explicit_assumption_cannot_silently_become_closed(self):
        nodes={0:node([('call',20)],ret=True)}
        with self.assertRaisesRegex(ValueError,'Unproved synchronous callee'):prove(nodes,0,{})
        result=prove(nodes,0,{20:dict(zeroMask=SIMD,assumed=True)})
        self.assertEqual(result['assumedCallees'],['0x14'])

    def test_noreturn_call_cuts_fallthrough_only_after_certificate(self):
        data={100:bytes.fromhex('04180000c800'),103:bytes.fromhex('0100'),104:bytes.fromhex('0100')}
        inv={100:(6,'ccall'),103:(2,'plain'),104:(2,'plain')}
        read=lambda a,n:data[a]
        with self.assertRaisesRegex(ValueError,'leaves reviewed inventory'):graph(read,inv,{},100)
        g=graph(read,inv,{},100,{200})
        self.assertTrue(g[100]['nonreturn']);self.assertEqual(g[100]['successors'],[])
        self.assertFalse(no_return(g,100)['normalReturnReachable'])
        bad=copy.deepcopy(inv);bad[104]=(2,'branch')
        with self.assertRaisesRegex(ValueError,'delay slot'):graph(read,bad,{},100,{200})

    def test_specialized_gate_requires_exact_native_target_and_condition(self):
        # Synthetic conditional Type8 jump: target120, fallthrough103.
        data={100:bytes.fromhex('020600007800'),103:bytes.fromhex('3f083f34'),
              105:bytes.fromhex('0100'),106:bytes.fromhex('0100')}
        inv={100:(6,'branch'),103:(4,'abi-return'),105:(2,'plain'),106:(2,'plain')}
        read=lambda a,n:data[a]
        with self.assertRaises(ValueError):graph(read,inv,{},100)
        g=graph(read,inv,{},100,gates={100:(1,120,False,False)})
        self.assertTrue(prove(g,100,{})['conditionalMode1Identity'])
        for gate in [(2,120,False,False),(1,121,False,False),(1,120,True,False)]:
            with self.assertRaisesRegex(ValueError,'gate drift'):graph(read,inv,{},100,gates={100:gate})

    def test_register_loop_repeat_edge_and_endpoint_are_checked(self):
        data={100:bytes.fromhex('020d80000300'),103:bytes.fromhex('0100'),
              104:bytes.fromhex('3f083f34'),106:bytes.fromhex('0100'),107:bytes.fromhex('0100')}
        inv={100:(6,'loop-reg'),103:(2,'plain'),104:(4,'abi-return'),106:(2,'plain'),107:(2,'plain')}
        read=lambda a,n:data[a]
        g=graph(read,inv,{},100)
        self.assertEqual(set(g[103]['successors']),{103,104})
        self.assertFalse(prove(g,100,{})['terminationProven'])
        data[100]=bytes.fromhex('020d80000600')
        with self.assertRaises(ValueError):graph(read,inv,{},100)


if __name__=='__main__':unittest.main()

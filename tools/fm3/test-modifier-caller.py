#!/usr/bin/env python3
"""Catch width/stride mistakes and unsound return-path MODE1 proofs."""
import copy
import struct
import unittest

from modifier_caller_audit import (subword_immediate, direct_subword,
                                  direct_control, register_loop, prove_graph)


def synthetic_branch(address, target, condition=31, call=False, delayed=False,
                     relative=True):
    p = 0x0600 | (0x100 if relative else 0) | (0x80 if call else 0) | condition*2
    target = (target-address)&0xffffff if relative else target
    value = target | (0x4000000 if delayed else 0)
    return struct.pack('<3H',p,value >> 16,value & 65535)


def sample_graph():
    return {0:dict(actions=['save','set'],successors=[1,2]),
            1:dict(actions=['clobber','load'],successors=[3]),
            2:dict(actions=['clobber','load'],successors=[3]),
            3:dict(actions=['restore'],successors=[],**{'return':True})}


class CallerCertificate(unittest.TestCase):
    def test_subword_immediate_width_direction_condition_and_signed_modifier(self):
        # Independently construct fields from the SHARC+ Type4b diagram.
        p = 0x6000 | 5<<9 | 1<<6 | 31<<1
        q = 28<<11 | 2<<7 | 0x38
        row = subword_immediate(struct.pack('<2H',p,q))
        self.assertEqual((row['index'],row['modifier'],row['postmodify'],row['width'],row['register']),
                         (5,28,True,1,2))
        p = 0x6000 | 6<<9 | 1<<7 | 31<<1 | 1
        q = 29<<11 | 2<<7 | 0x3c
        row = subword_immediate(struct.pack('<2H',p,q))
        self.assertEqual((row['store'],row['postmodify'],row['modifier'],row['width']),
                         (True,False,-3,2))
        # A conditional, sign-extending PM load must not become an unconditional DM store.
        row = subword_immediate(struct.pack('<2H',0x6102,0x39))
        self.assertEqual((row['condition'],row['programMemory'],row['index'],row['signExtend']),
                         (1,True,8,True))

    def test_subword_decoder_rejects_compute_normal_word_and_store_sign_extension(self):
        for data in [b'',struct.pack('<3H',0x6a7e,0x1131,0),
                     struct.pack('<2H',0x6a7e,0x1131),
                     struct.pack('<2H',0x6a7e,0xe13f),
                     struct.pack('<2H',0x6afe,0xe139)]:
            with self.subTest(data=data.hex()),self.assertRaises(ValueError):
                subword_immediate(data)

    def test_direct_subword_is_limited_to_zero_extended_nonexclusive_access(self):
        for store in [False,True]:
            for short in [False,True]:
                p=0x1a03 | (0x100 if store else 0) | (0x40 if short else 0)
                r=direct_subword(struct.pack('<3H',p,0x1234,0x5678))
                self.assertEqual((r['store'],r['width'],r['register'],r['address']),
                                 (store,2 if short else 1,3,0x12345678))
        for p in (0x1a10,0x1a20,0x1a80,0x1072):
            with self.assertRaises(ValueError):
                direct_subword(struct.pack('<3H',p,0,0))

    def test_direct_control_preserves_target_condition_call_and_delay(self):
        for rel in [False,True]:
            for call in [False,True]:
                for delay in [False,True]:
                    for target in [0x80fff0,0x810080]:
                        data=synthetic_branch(0x810000,target,condition=2,call=call,delayed=delay,relative=rel)
                        self.assertEqual(direct_control(data,0x810000),
                            dict(condition=2,call=call,target=target,delayed=delay))
        with self.assertRaises(ValueError):
            direct_control(struct.pack('<3H',0x073e,0x0200,0),0)  # unsupported ELSE

    def test_both_regular_and_exceptional_branches_restore_all_input_bits(self):
        result=prove_graph(sample_graph(),0)
        self.assertTrue(result['preservesEveryIncomingMode1Word'])
        self.assertEqual(result['returns'],['0x3'])
        # Backedges cannot silently stop analysis before checking a reachable exit.
        graph=sample_graph();graph[2]['successors']=[2,3]
        self.assertTrue(prove_graph(graph,0)['preservesEveryIncomingMode1Word'])

    def test_loop_mode_is_not_displacement_sign_and_unknown_forms_fail(self):
        for fast in (False,True):
            for displacement in (6,-6,0x3fffff,-0x400000):
                value=(displacement & 0x7fffff) | (int(fast)<<23)
                data=struct.pack('<3H',0x0d0c,value>>16,value & 65535)
                self.assertEqual(register_loop(data,0x1c0b20),
                    dict(counter=12,target=0x1c0b20+displacement,modeF1=fast))
        for data in (b'',struct.pack('<3H',0x0c0c,0x80,6),
                     struct.pack('<3H',0x0d8c,0x80,6),
                     struct.pack('<3H',0x0d0c,0x180,6)):
            with self.assertRaises(ValueError):register_loop(data,0x1c0b20)

    def test_missing_exceptional_reload_lost_restore_and_r12_clobber_fail(self):
        mutations=[(2,['clobber']),(3,[]),(3,['clobber','restore']),
                   (3,['restore','set'])]
        for at,actions in mutations:
            graph=sample_graph();graph[at]['actions']=actions
            with self.subTest(at=at,actions=actions),self.assertRaises(ValueError):
                prove_graph(graph,0)

    def test_unknown_actions_missing_edges_and_nonreturning_graphs_fail_closed(self):
        cases=[]
        graph=sample_graph();graph[1]['actions']=['unknown-call'];cases.append(graph)
        graph=sample_graph();graph[2]['successors']=[99];cases.append(graph)
        graph=sample_graph();graph[2]['successors']=[];cases.append(graph)
        graph=sample_graph();graph[3]['successors']=[1];cases.append(graph)
        cases.append({0:dict(actions=[],successors=[0])})
        for graph in cases:
            original=copy.deepcopy(graph)
            with self.assertRaises(ValueError):prove_graph(graph,0)
            self.assertEqual(graph,original)


if __name__ == '__main__':
    unittest.main()

#!/usr/bin/env python3
"""Reject incomplete MODE1 proofs and mixed ELF/VISA address conventions."""
import copy
import struct
import unittest

from modifier_init_audit import AdiDxe, swap_parcels, prove_mode, native_graph


def node(actions=(),successors=(),ret=False):
    return dict(actions=list(actions),successors=list(successors),**{'return':ret})


def tiny_dxe():
    # ELF32 LE header with a BE-parcel VISA code payload. This intentionally
    # contains no compiler/debug evidence and cannot pass the full hash audit.
    names=b'\0.strtab\0dxe_block3_sw_code\0dxe_iv_code\0'
    payload=b'\x0a\xfe\x00\x01\x00\x01'
    offset=52+len(names);table_offset=offset+len(payload)
    h=struct.pack('<16sHHIIIIIHHHHHH',b'\x7fELF\x01\x01\x01'+bytes(9),
                  2,0x85,1,0x1c0000,0,table_offset,0,52,0,0,40,4,1)
    sections=[(0,0,0,0,0,0,0,0,0,0),
              (1,3,0,0,52,len(names),0,0,1,0),
              (9,1,6,0x1c0000,offset,len(payload),0,0,2,0),
              (28,1,6,0x90000,offset,len(payload),0,0,1,0)]
    return h+names+payload+b''.join(struct.pack('<10I',*s) for s in sections)


class InitEvidence(unittest.TestCase):
    def test_all_unknown_branch_arms_must_restore(self):
        graph={0:node([('save',15),('clear',0x1000)],[1,2]),
               1:node([('restore',15)],ret=True),2:node([('restore',15)],ret=True)}
        self.assertEqual(len(prove_mode(graph,0,set())['returnSites']),2)
        graph[2]=node(ret=True)
        with self.assertRaises(ValueError):prove_mode(graph,0,set())

    def test_saved_token_clobber_is_not_mode_restore(self):
        graph={0:node([('save',0),('set',0x800000),('clobber',0),('restore',0)],ret=True)}
        with self.assertRaises(ValueError):prove_mode(graph,0,set())

    def test_open_call_and_saved_token_across_call_are_rejected(self):
        graph={0:node([('call',20)],ret=True)}
        with self.assertRaises(ValueError):prove_mode(graph,0,set())
        self.assertTrue(prove_mode(graph,0,{20})['allReturningPathsPreserveIncomingMode1'])
        graph[0]=node([('save',15),('call',20),('restore',15)],ret=True)
        with self.assertRaises(ValueError):prove_mode(graph,0,{20})

    def test_loop_is_checked_without_claiming_termination(self):
        graph={0:node([], [0,1]),1:node(ret=True)}
        r=prove_mode(graph,0,set());self.assertFalse(r['terminationProven'])
        graph[0]['successors'].append(9)
        with self.assertRaises(ValueError):prove_mode(graph,0,set())

    def test_f1_hardware_loop_repeat_is_in_the_native_graph(self):
        data={100:bytes.fromhex('000c80020300'),103:bytes.fromhex('0100'),
              104:bytes.fromhex('3f083f34'),106:bytes.fromhex('0100'),107:bytes.fromhex('0100')}
        inv={100:(6,'loop-imm'),103:(2,'plain'),104:(4,'abi-return'),106:(2,'plain'),107:(2,'plain')}
        graph=native_graph(lambda a,n:data[a],inv,{},100,52)
        self.assertEqual(set(graph[103]['successors']),{103,104})
        self.assertTrue(prove_mode(graph,100,set())['allReturningPathsPreserveIncomingMode1'])
        for raw in ('000c80020600','000c80020500'):
            # First: endpoint in a return delay slot. Second: missing boundary.
            data[100]=bytes.fromhex(raw)
            with self.assertRaises(ValueError):native_graph(lambda a,n:data[a],inv,{},100,52)

    def test_abi_return_executes_both_delay_instructions(self):
        data={10:bytes.fromhex('3f083f34'),12:bytes.fromhex('ff703fb9'),14:bytes.fromhex('0100')}
        inv={10:(4,'abi-return'),12:(4,'plain'),14:(2,'plain')}
        actions={10:[('save',15),('clear',0x1000)],12:[('restore',15)]}
        graph=native_graph(lambda a,n:data[a],inv,actions,10,52)
        self.assertTrue(prove_mode(graph,10,set())['allReturningPathsPreserveIncomingMode1'])
        for bad in ({10:inv[10],12:inv[12]},{**inv,14:(2,'branch')}):
            with self.assertRaises(ValueError):native_graph(lambda a,n:data[a],bad,actions,10,52)
        with self.assertRaises(ValueError):native_graph(lambda a,n:data[a],inv,actions,10,51)

    def test_elf_header_endian_does_not_determine_code_parcel_endian(self):
        e=AdiDxe(tiny_dxe())
        self.assertEqual(e.visa(0x1c0000,2),bytes.fromhex('fe0a'))
        self.assertEqual(e.visa(0x1c0002,2),bytes.fromhex('0100'))
        for a,n in [(0x1c0002,4),(0x1c0000,3),(0x90000,2),(0x1bffff,2)]:
            with self.assertRaises(ValueError):e.visa(a,n)
        with self.assertRaises(ValueError):swap_parcels(b'\x0a')

    def test_elf_truncation_and_ambiguous_section_are_rejected(self):
        with self.assertRaises(ValueError):AdiDxe(tiny_dxe()[:-1])
        e=AdiDxe(tiny_dxe());e.sections.append(copy.deepcopy(e.sections[2]))
        with self.assertRaises(ValueError):e.visa(0x1c0000,2)
        with self.assertRaises(ValueError):e.symbol('not_present')


if __name__=='__main__':unittest.main()

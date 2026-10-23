#!/usr/bin/env python3
"""Check argument specialization cannot silently drop unknown control paths."""
import struct
import unittest
from modifier_op10_audit import integer_compare, compare_condition, operation_target, trace, control


def branch(at,target,condition=0,delay=False):
    v=((target-at)&0xffffff)|(int(delay)<<26)
    return struct.pack('<3H',0x0700|condition*2,v>>16,v&65535)


def fixture():
    # Independent field construction: immediate R2=PID, compare R15,R2,
    # equal branch to scalar ABI return with both delay instructions present.
    code={0x100:struct.pack('<2H',0x0f82,0x3a16),0x102:struct.pack('<H',0xc3f2),
          0x103:branch(0x103,0x109),0x109:struct.pack('<2H',0x083f,0x343f),
          0x10b:struct.pack('<H',1),0x10c:struct.pack('<H',1)}
    rows=[(a,len(b)) for a,b in code.items()]
    guards=[dict(at='0x103',load='0x100',compare='0x102',lhs='pid')]
    return code,rows,guards


def reader(code):
    def read(a,n):
        b=code[a]
        if len(b)!=n:raise ValueError('Instruction size mismatch')
        return b
    return read


class Specialization(unittest.TestCase):
    def test_integer_comparison_preserves_signedness(self):
        self.assertEqual(integer_compare(struct.pack('<H',0xc3f2)),(15,2,False))
        self.assertEqual(integer_compare(struct.pack('<2H',0x0180,0xb0f8)),(15,8,True))
        self.assertTrue(compare_condition(1,0xffffffff,0))
        self.assertFalse(compare_condition(1,0xffffffff,0,True))
        for cond,expected in [(0,True),(1,False),(2,True),(16,False),(17,True),(18,False)]:
            self.assertEqual(compare_condition(cond,9,9),expected)
        for data in (b'',struct.pack('<H',0xcbf2),struct.pack('<2H',0x0181,0xb0f8)):
            with self.assertRaises(ValueError):integer_compare(data)
        with self.assertRaises(ValueError):compare_condition(7,0,0)

    def test_known_gate_prunes_only_its_proven_alternative(self):
        code,rows,guards=fixture()
        result=trace(reader(code),rows,guards,10,entry=0x100)
        self.assertEqual(result['instructionCount'],6)
        self.assertEqual(result['returns'],['0x109'])
        self.assertTrue(result['decisions'][0]['taken'])
        self.assertEqual(result['calls'],[])

    def test_changed_bound_or_condition_exposes_missing_path(self):
        for which in ('bound','condition'):
            code,rows,guards=fixture()
            if which=='bound':code[0x100]=struct.pack('<2H',0x0f82,0x3a17)
            else:code[0x103]=branch(0x103,0x109,16)
            with self.assertRaisesRegex(ValueError,'outside reviewed partition'):
                trace(reader(code),rows,guards,10,entry=0x100)

    def test_unknown_branch_keeps_both_paths(self):
        code,rows,guards=fixture()
        # Removing the guard cannot silently choose the convenient branch.
        with self.assertRaisesRegex(ValueError,'outside reviewed partition'):
            trace(reader(code),rows,[],10,entry=0x100)

    def test_missing_delay_duplicate_boundary_or_bad_guard_fails(self):
        code,rows,guards=fixture()
        with self.assertRaisesRegex(ValueError,'delay'):
            trace(reader(code),rows[:-1],guards,9,entry=0x100)
        with self.assertRaisesRegex(ValueError,'Duplicate'):
            trace(reader(code),rows+rows[:1],guards,9,entry=0x100)
        guards[0]['lhs']='operation'
        with self.assertRaisesRegex(ValueError,'operand mismatch'):
            trace(reader(code),rows,guards,9,entry=0x100)

    def test_other_pid_operations_and_indirect_targets_are_rejected(self):
        code,rows,guards=fixture()
        for op,pid in [(8,0x3a16),(82,0x3a16),(True,0x3a16),(10,0x3a17)]:
            with self.assertRaises(ValueError):trace(reader(code),rows,guards,op,pid,0x100)
        with self.assertRaisesRegex(ValueError,'indirect'):
            control(struct.pack('<2H',0x083f,0x2c3f),0x100) # M13/I12 is not ABI return

    def test_table_selection_is_not_unbounded_or_negative_indexing(self):
        table=[100,200,300,400,500,600]
        self.assertEqual(operation_target(table,9),100)
        self.assertEqual(operation_target(table,10),200)
        for op in (8,11,82,True,'10'):
            with self.assertRaises(ValueError):operation_target(table,op)
        with self.assertRaises(ValueError):operation_target(table[:2],10)


if __name__=='__main__':unittest.main()

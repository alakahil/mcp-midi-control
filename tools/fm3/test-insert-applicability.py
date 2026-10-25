#!/usr/bin/env python3
import copy
import json
import unittest
from insert_applicability import OUT, verify, compile_family, extract, CONFIG


class InsertPolicyTests(unittest.TestCase):
    def setUp(self):
        self.policy = json.loads(OUT.read_text())

    def test_replay_and_fixed_scope(self):
        verify(self.policy)
        self.assertEqual(sum(len(f['parameters']) for f in self.policy['families'].values()), 242)
        gate = self.policy['families']['GATE']['parameters']
        self.assertEqual(sorted({t for c in gate['4']['cases'] for t in c['types']}), [0, 3])
        self.assertEqual(sorted({t for c in gate['18']['cases'] for t in c['types']}), [3])
        self.assertFalse(self.policy['families']['TENTAP']['parameters']['46']['cases'])

    def test_source_and_compiled_rule_drift(self):
        for mutate in [lambda p: p['sources'].update(layoutSha256='0'*64),
                       lambda p: p['families']['GATE']['parameters']['4']['cases'].clear()]:
            p = copy.deepcopy(self.policy)
            mutate(p)
            with self.assertRaises(ValueError):
                verify(p)

    def test_unknown_symbols_and_overlapping_variants_fail(self):
        f = self.policy['families']['PLEX']
        for mutate in [lambda v: v.append(copy.deepcopy(v[0])),
                       lambda v: v[0]['pages'][0]['controls'][0].update(name='PLEX_GUESSED')]:
            variants = copy.deepcopy(f['variants'])
            mutate(variants)
            with self.assertRaises(ValueError):
                compile_family('PLEX', variants, f['excludedControls'])

    def test_dynamic_controls_and_unknown_ui_fail(self):
        for attr in ['dynamicParamId="0"', 'controllingParamName="GATE_TYPE"', 'type="newKnob"']:
            xml = '<root><EffectLayouts><EditorControls name="GateExpander"><EffectVariants><EffectVariant><Page pageNum="0"><EditorControl parameterName="GATE_RATIO" '+attr+'/></Page></EffectVariant></EffectVariants></EditorControls></EffectLayouts></root>'
            with self.assertRaises(ValueError):
                extract(xml, CONFIG['GATE'])


if __name__ == '__main__':
    unittest.main()

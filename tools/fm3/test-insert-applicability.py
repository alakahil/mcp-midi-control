#!/usr/bin/env python3
import copy
import json
import unittest
from insert_applicability import OUT, verify, compile_family, extract, CONFIG
from point6_native_bindings import OUT as NATIVE_OUT, verify as verify_native


class InsertPolicyTests(unittest.TestCase):
    def setUp(self):
        self.policy = json.loads(OUT.read_text())

    def test_replay_and_fixed_scope(self):
        verify(self.policy)
        self.assertEqual(sum(len(f['parameters']) for f in self.policy['families'].values()), 515)
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

    def test_point6_exclusions_and_runtime_page_dependency(self):
        f = self.policy['families']
        self.assertEqual([x['name'] for x in f['MIXER']['excludedControls']],
                         [])
        for family, pids in [('LOOPER', [7, 8, 9, 10, 11, 12, 14, 22]),
                             ('MULTITAP', [59, 60, 114]), ('MIXER', [4, 5, 10, 11])]:
            for pid in pids:
                self.assertFalse(f[family]['parameters'][str(pid)]['cases'])
        xml = '''<root><EffectLayouts><EffectLayout name="Looper" parameters="LOOPER_DUB"><EffectVariants><EffectVariant>
        <Page pageNum="0" parameterName="LOOPER_DUB" value="0"><EditorControl type="knob" parameterName="LOOPER_PLAYLEVEL"/></Page>
        <Page pageNum="0" parameterName="LOOPER_DUB" value="1"><EditorControl type="knob" parameterName="LOOPER_DUBLEVEL"/></Page>
        </EffectVariant></EffectVariants></EffectLayout></EffectLayouts></root>'''
        with self.assertRaisesRegex(ValueError, 'depend on runtime DUB'):
            extract(xml, CONFIG['LOOPER'])

    def test_runtime_messages_cannot_be_scalar_controls(self):
        xml = '<root><EffectLayouts><EffectLayout name="Formant"><EffectVariants><EffectVariant><Page><EditorControl parameterName="FORMANT_Q" type="knob" message="MESSAGE_EXECUTE"/></Page></EffectVariant></EffectVariants></EffectLayout></EffectLayouts></root>'
        with self.assertRaisesRegex(ValueError, 'Runtime message'):
            extract(xml, CONFIG['FORMANT'])

    def test_native_mixer_bindings_and_tampering(self):
        native = json.loads(NATIVE_OUT.read_text())
        verify_native(native)
        self.assertEqual(native['rows'][17]['name'], 'MIXER_DELAY1')
        self.assertIsNone(native['rows'][21]['cacheRecord'])
        for mutate in [lambda p: p.update(editorSha256='0'*64),
                       lambda p: p['rows'][17].update(descriptorHex='00'*16),
                       lambda p: p['rows'][17].update(name='MIXER_DELAY4'),
                       lambda p: p['rows'][17]['cacheRecord']['numeric_fields'].__setitem__(1,128)]:
            changed=copy.deepcopy(native);mutate(changed)
            with self.assertRaises(ValueError):
                verify_native(changed)


if __name__ == '__main__':
    unittest.main()

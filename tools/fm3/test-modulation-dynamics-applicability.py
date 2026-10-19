#!/usr/bin/env python3
"""Variant/alias regressions using existing metadata; no device access."""
import copy
import json
import unittest
from modulation_dynamics_applicability import OUT, CONFIG, compile_variants, extract, verify


def control(name, kind='knob', conditions=None):
    return {'name': name, 'label': name, 'uiType': kind, 'conditions': conditions or []}


def variant(types, controls, page_types=None):
    return {'types': types, 'pages': [{'page': 0, 'types': page_types, 'controls': controls}]}


class ModulationDynamicsTests(unittest.TestCase):
    def test_variants_and_control_predicates_intersect(self):
        v = [variant([0, 1], [control('X_A', conditions=[{'name': 'X_TYPE', 'values': [1, 2]}])]),
             variant([2], [control('X_B')])]
        c = compile_variants(v, ['X_A', 'X_B'], 'X_TYPE', [0, 1, 2], {'X_TYPE': 12})
        self.assertEqual(c['X_A'], [{'types': [1], 'when': {}, 'label': 'X_A'}])
        self.assertEqual(c['X_B'][0]['types'], [2])

    def test_missing_overlapping_and_unknown_domains_fail(self):
        for v in [[variant([0], [control('X_A')])],
                  [variant(None, [control('X_A')]), variant([0], [control('X_A')])],
                  [variant([0, 1, 2], [control('X_A')])],
                  [variant(None, [control('X_A')], [2])],
                  [variant(None, [control('X_A', conditions=[{'name': 'X_OTHER', 'values': [0]}])])]]:
            with self.assertRaises(ValueError):
                compile_variants(v, ['X_A'], 'X_TYPE', [0, 1], {'X_TYPE': 12})

    def test_meter_is_not_a_write_control(self):
        c = compile_variants([variant(None, [control('X_GAIN', 'meterGainVert'), control('X_LEVEL')])],
                             ['X_GAIN', 'X_LEVEL'], 'X_TYPE', [0, 1], {'X_TYPE': 12})
        self.assertEqual(c['X_GAIN'], [])
        self.assertEqual(c['X_LEVEL'][0]['types'], [0, 1])

    def test_xml_firmware_comments_and_implicit_page_numbers(self):
        xml = '<Root><EffectLayouts><Layout name="Compressor"><EffectVariants><EffectVariant value="0" version_lt="13"><Page><EditorControl parameterName="COMP_OLD" type="knob"/></Page></EffectVariant><EffectVariant value="0" version_gtet="13"><Page name="Basic"><EditorControl parameterName="COMP_RATIO" type="knob"/><!-- <EditorControl parameterName="COMP_BAD" type="knob"/> --></Page><Page name="Sidechain"><EditorControl parameterName="COMP_Q" type="knob"/></Page></EffectVariant></EffectVariants></Layout></EffectLayouts></Root>'
        v = extract(xml, CONFIG['COMP'])
        self.assertEqual(len(v), 1)
        self.assertEqual([p['page'] for p in v[0]['pages']], [0, 1])
        self.assertEqual([c['name'] for c in v[0]['pages'][0]['controls']], ['COMP_RATIO'])
        for attribute in ['dynamicParamId="1"', 'controllingParamName="COMP_TYPE"', 'version_gte="13"']:
            with self.assertRaises(ValueError):
                extract(xml.replace('parameterName="COMP_RATIO"', 'parameterName="COMP_RATIO" '+attribute), CONFIG['COMP'])
        with self.assertRaisesRegex(ValueError, 'kind'):
            extract(xml.replace('type="knob"', 'type="unknownWidget"'), CONFIG['COMP'])

    def test_receipt_aliases_and_tampering(self):
        receipt = json.loads(OUT.read_text())
        verify(copy.deepcopy(receipt))
        f = receipt['families']['FLANGER']['parameters']
        self.assertEqual((f['5']['name'], f['5']['nativeName']), ('OLD_FLANGER_DELAYTIME', 'FLANGER_MANUAL'))
        self.assertEqual((f['6']['name'], f['6']['nativeName']), ('OLD_FLANGER_MANUAL', 'FLANGER_DRYDELAY'))
        for mutate in [lambda d: d['families']['FLANGER']['nativeDescriptors'][5].__setitem__('pid', 6),
                       lambda d: d['families']['COMP'].__setitem__('modelPid', 0),
                       lambda d: d['families']['PHASER']['models']['7'].__setitem__('selectorValue', 0),
                       lambda d: d['families']['COMP']['parameters']['25'].__setitem__('cases', [{'types': [0], 'when': {}, 'label': 'Gain'}]),
                       lambda d: d['families']['PHASER']['selectors']['17']['values'].append(3)]:
            bad = copy.deepcopy(receipt)
            mutate(bad)
            with self.assertRaises(ValueError):
                verify(bad)

    def test_wah_explicit_page_excludes_paragon_from_fallback(self):
        f = json.loads(OUT.read_text())['families']['WAH']
        allowed = lambda pid: sorted({t for c in f['parameters'][str(pid)]['cases'] for t in c['types']})
        for pid in [4, 9, 13]:
            self.assertEqual(allowed(pid), list(range(8)))
        for pid in [5, 15, *range(16, 24)]:
            self.assertEqual(allowed(pid), list(range(9)))
        self.assertEqual(f['models']['8']['name'], 'Paragon')

    def test_tremolo_special_pages_and_unused_slots(self):
        f = json.loads(OUT.read_text())['families']['TREMOLO']
        allowed = lambda pid: sorted({t for c in f['parameters'][str(pid)]['cases'] for t in c['types']})
        for pid in [12, 13]:
            self.assertEqual(allowed(pid), [1])
        for pid in [16, 17]:
            self.assertEqual(allowed(pid), [3])
        for pid in [1, 4]:
            self.assertEqual(allowed(pid), list(range(6)))
        self.assertEqual(allowed(20), [0, 2, 4, 5])
        for pid in [6, 10]:
            self.assertEqual(allowed(pid), [])

    def test_slider_and_explicit_page_complement(self):
        xml = '<Root><EffectLayouts><Layout name="Wah"><EffectVariants><EffectVariant><Page pageNum="0" parameterName="WAH_TYPE" value="8"><EditorControl parameterName="WAH_CONTROL" type="knob"/></Page><Page pageNum="0"><EditorControl parameterName="WAH_BIAS" type="knob"/></Page><Page pageNum="1"><EditorControl parameterName="WAH_EQ1" type="slider"/></Page></EffectVariant></EffectVariants></Layout></EffectLayouts></Root>'
        names = ['WAH_CONTROL', 'WAH_BIAS', 'WAH_EQ1']
        cases = compile_variants(extract(xml, CONFIG['WAH']), names, 'WAH_TYPE', list(range(9)), {'WAH_TYPE': 0})
        self.assertEqual(cases['WAH_BIAS'][0]['types'], list(range(8)))
        self.assertEqual(cases['WAH_EQ1'][0]['types'], list(range(9)))


if __name__ == '__main__':
    unittest.main()

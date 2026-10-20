#!/usr/bin/env python3
"""Negative and semantic checks for the bounded XML compiler, no device access."""
import copy
import json
import unittest
import xml.etree.ElementTree as ET
from type_applicability import OUT, active, compile_pages, extract, verify


class PolicyTests(unittest.TestCase):
    def test_firmware_boundaries(self):
        self.assertFalse(active(ET.fromstring('<Page version_lt="13,00"/>')))
        self.assertTrue(active(ET.fromstring('<Page version_gtet="13,00"/>')))
        self.assertFalse(active(ET.fromstring('<EditorControl version_gtet="19,05"/>')))
        with self.assertRaisesRegex(ValueError, 'comparator'):
            active(ET.fromstring('<Page version_gte="13"/>'))

    def test_fallback_is_per_page_not_universal(self):
        pages = [{'page': 0, 'types': [1], 'fallback': False, 'controls': {'X_A': []}},
                 {'page': 0, 'types': None, 'fallback': True, 'controls': {'X_B': []}},
                 {'page': 1, 'types': None, 'fallback': False, 'controls': {'X_C': []}}]
        rules = compile_pages(pages, ['X_TYPE', 'X_A', 'X_B', 'X_C'], 3, 'X_TYPE')
        self.assertEqual(rules, {'X_TYPE': [0, 1, 2], 'X_A': [1], 'X_B': [0, 2], 'X_C': [0, 1, 2]})
        pages.append({'page': 0, 'types': [1], 'fallback': False, 'controls': {'X_B': []}})
        with self.assertRaisesRegex(ValueError, 'Ambiguous'):
            compile_pages(pages, rules, 3, 'X_TYPE')

    def test_comments_and_inactive_controls_excluded(self):
        xml = b'<CONFIG><EffectLayouts><EditorControls name="Chorus"><EffectVariants><EffectVariant><Page pageNum="0"><EditorControl parameterName="CHORUS_RATE"/><EditorControl parameterName="CHORUS_BASS" version_lt="13"/><!-- <EditorControl parameterName="CHORUS_TREBLE"/> --></Page></EffectVariant></EffectVariants></EditorControls></EffectLayouts></CONFIG>'
        _, rules = extract(xml, 'CHORUS', 'Chorus', 2, ['CHORUS_TYPE', 'CHORUS_RATE', 'CHORUS_BASS', 'CHORUS_TREBLE'])
        self.assertEqual(rules['CHORUS_RATE'], [0, 1])
        self.assertEqual(rules['CHORUS_BASS'], [])
        self.assertEqual(rules['CHORUS_TREBLE'], [])
        with self.assertRaisesRegex(ValueError, 'dynamic'):
            extract(xml.replace(b'parameterName="CHORUS_RATE"', b'parameterName="CHORUS_RATE" controllingParamName="CHORUS_TEMPO"'), 'CHORUS', 'Chorus', 2, list(rules))

    def test_receipt_and_tampering(self):
        receipt = json.loads(OUT.read_text())
        verify(copy.deepcopy(receipt))
        for change in [lambda d: d['families']['CHORUS']['types'].reverse(),
                       lambda d: d['families']['FUZZ']['parameters']['2']['allowedTypes'].append(19),
                       lambda d: d['families']['FUZZ']['descriptor']['bindings'][2].__setitem__(1, 'WRONG_TONE')]:
            bad = copy.deepcopy(receipt)
            change(bad)
            with self.assertRaises(ValueError):
                verify(bad)


if __name__ == '__main__':
    unittest.main()

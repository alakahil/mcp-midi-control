#!/usr/bin/env python3
"""Compiler semantic/negative tests, no device access."""
import copy
import json
import unittest
from delay_reverb_applicability import OUT, CONFIG, compile_pages, extract, verify


def control(name, conditions=None):
    return {'name': name, 'label': name, 'conditions': conditions or []}


class DelayReverbTests(unittest.TestCase):
    def test_unqualified_fallback_and_predicate_intersection(self):
        pages = [{'page': 4, 'types': [5], 'controls': [control('X_SWEEP')]},
                 {'page': 4, 'types': None, 'controls': [control('X_STACK')]},
                 {'page': 5, 'types': [5], 'controls': [control('X_STACK')]},
                 {'page': 6, 'types': None, 'controls': [control('X_SPREAD', [{'name': 'X_TYPE', 'values': [1, 5]}])]}]
        c = compile_pages(pages, ['X_SWEEP', 'X_STACK', 'X_SPREAD'], 'X_TYPE', {'X_TYPE': list(range(8))}, {'X_TYPE': 7})
        self.assertEqual(c['X_SWEEP'][0]['types'], [5])
        self.assertEqual(set().union(*(set(x['types']) for x in c['X_STACK'])), set(range(8)))
        self.assertEqual(c['X_SPREAD'][0]['types'], [1, 5])

    def test_secondary_predicate_and_xml_only_values(self):
        pages = [{'page': 0, 'types': [0, 5, 9, 10], 'controls': [control('X_DIFF', [{'name': 'X_TANK', 'values': [1]}])]}]
        c = compile_pages(pages, ['X_DIFF'], 'X_BASE', {'X_BASE': list(range(9)), 'X_TANK': [0, 1]}, {'X_BASE': 45, 'X_TANK': 66})
        self.assertEqual(c['X_DIFF'], [{'types': [0, 5], 'when': {'66': [1]}, 'label': 'X_DIFF'}])
        pages[0]['controls'][0]['conditions'][0]['values'] = [2]
        with self.assertRaisesRegex(ValueError, 'domain'):
            compile_pages(pages, ['X_DIFF'], 'X_BASE', {'X_BASE': list(range(9)), 'X_TANK': [0, 1]}, {'X_BASE': 45, 'X_TANK': 66})

    def test_ambiguous_pages_fail(self):
        pages = [{'page': 1, 'types': [1], 'controls': [control('X_A')]}, {'page': 1, 'types': [1], 'controls': [control('X_B')]}]
        with self.assertRaisesRegex(ValueError, 'Ambiguous'):
            compile_pages(pages, ['X_A', 'X_B'], 'X_TYPE', {'X_TYPE': [0, 1]}, {'X_TYPE': 7})

    def test_xml_comments_versions_and_unknown_conditions(self):
        xml = '<Root><EffectLayouts><Layout name="Delay"><EffectVariant><Page pageNum="0"><EditorControl parameterName="DELAY_TIME"/><EditorControl parameterName="DELAY_OLD" version_lt="13"/><!-- <EditorControl parameterName="DELAY_COMMENT"/> --></Page></EffectVariant></Layout></EffectLayouts></Root>'
        pages = extract(xml, CONFIG['DELAY'])
        self.assertEqual([c['name'] for c in pages[0]['controls']], ['DELAY_TIME'])
        for attribute in ['dynamicParamId="1"', 'controllingParamName="DELAY_TYPE"', 'version_gte="13"']:
            with self.assertRaises(ValueError):
                extract(xml.replace('parameterName="DELAY_TIME"', 'parameterName="DELAY_TIME" '+attribute), CONFIG['DELAY'])

    def test_receipt_and_tampering(self):
        receipt = json.loads(OUT.read_text())
        verify(copy.deepcopy(receipt))
        for mutate in [lambda d: d['families']['DELAY']['models']['5'].__setitem__('selectorValue', 6),
                       lambda d: d['families']['REVERB']['selectors']['45']['values'].append(9),
                       lambda d: d['families']['REVERB']['selectors'].pop('66'),
                       lambda d: d['families']['REVERB']['parameters']['4']['cases'].clear(),
                       lambda d: d['families']['DELAY']['parameters']['88'].__setitem__('nativeName', 'UNKNOWN')]:
            bad = copy.deepcopy(receipt)
            mutate(bad)
            with self.assertRaises(ValueError):
                verify(bad)


if __name__ == '__main__':
    unittest.main()

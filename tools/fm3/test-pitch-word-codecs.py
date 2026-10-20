#!/usr/bin/env python3
"""Boundary regressions for the 27-field, preset-only Pitch overlay."""
import copy
import json
import unittest
from unittest.mock import patch
from pitch_word_codecs import REF, OUT, PIDS, SIGNED, build, load, apply_override, sha


class PitchWordTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.receipt = load()
        cls.params = json.loads((REF/'fm3-param-dictionary.json').read_text())['params']

    def test_original_dictionary_and_overlay_scope(self):
        self.assertEqual(sha((REF/'fm3-param-dictionary.json').read_bytes()), 'a54e0ba251d380d5fe2de952d18a0f9aeedd22c093984ed130720c0fa664d730')
        self.assertEqual(len(self.params), 2892)
        changed = [p for p in self.params if apply_override(p, self.receipt) != p]
        self.assertEqual(sorted((p['family'], p['param']) for p in changed), [('PITCH', pid) for pid in PIDS])

    def test_signed_domain_and_nonzero_enums(self):
        fields = {f['pid']: f['effective'] for f in self.receipt['fields']}
        self.assertEqual(len(SIGNED), 20)
        for pid in SIGNED:
            self.assertEqual((fields[pid]['kind'], fields[pid]['signedWord'], fields[pid]['min'], fields[pid]['max']), ('integer', True, -24, 24))
        self.assertEqual(fields[35]['enum'], ['NOTES', 'CHORDS'])
        self.assertEqual((fields[35]['enumBase'], fields[76]['enumBase']), (1, 1))
        self.assertEqual(fields[76]['enum'][7].strip(), '1/16')
        self.assertNotIn('NONE', fields[76]['enum'])

    def test_original_definition_change_is_rejected(self):
        p = copy.deepcopy(next(p for p in self.params if p['name']=='PITCH_SHIFT1'))
        for key, value in [('block',111), ('min',-12), ('kind','enum')]:
            bad = {**p, key:value}
            with self.assertRaises(ValueError): apply_override(bad, self.receipt)

    def test_factory_negative_words_are_fm3_coordinates(self):
        facts = json.loads((REF/'fm3-pitch-factory-evidence.json').read_text())
        capo = next(s for s in facts['specimens'] if s['name']=='Virtual Capo')
        self.assertEqual([capo['channels'][ch]['words']['15'] for ch in 'ABCD'], [65535,65534,65533,65532])
        octave = next(s for s in facts['specimens'] if s['name']=='5-Octave Lead')
        self.assertEqual([octave['channels']['A']['words'][str(pid)] for pid in [15,16,17,18]], [65512,65524,12,24])

    def test_display_and_global_dependencies_are_not_promoted(self):
        fields = {f['pid']: f['effective'] for f in self.receipt['fields']}
        self.assertIn('code 31 displays INFINITE', fields[74]['storedDependency'])
        self.assertIn('global scale contents are not included', fields[71]['storedDependency'])
        self.assertIn('scale-degree', fields[77]['storedDependency'])
        self.assertIn('NOTE2..NOTE8', fields[63]['storedDependency'])

    def test_changed_receipt_and_factory_facts_fail_closed(self):
        bad = copy.deepcopy(self.receipt)
        bad['fields'][0]['effective']['min'] = -25
        original = type(OUT).read_text
        with patch.object(type(OUT), 'read_text', lambda path, *a, **kw: json.dumps(bad) if path==OUT else original(path,*a,**kw)):
            with self.assertRaises(ValueError): load()
        original_bytes = type(OUT).read_bytes
        with patch.object(type(OUT), 'read_bytes', lambda path, *a, **kw: b'{}' if path.name=='fm3-pitch-factory-evidence.json' else original_bytes(path,*a,**kw)):
            with self.assertRaises(ValueError): build()


if __name__ == '__main__': unittest.main()

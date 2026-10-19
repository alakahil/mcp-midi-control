#!/usr/bin/env python3
"""Reject misleading metadata inputs; no editor execution or device access."""
import json
import unittest
from six_field_resolution import OUT, verify, controls, mine_editor
from fm3_cache import decode


class ResolutionTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(OUT.read_text())

    def test_cache_record_mutation_is_rejected(self):
        self.data['fields'][0]['cacheRecord']['numeric_fields'][2] = 100
        with self.assertRaisesRegex(ValueError, 'Cache record drift'):
            verify(self.data)

    def test_other_device_name_binding_is_rejected(self):
        self.data['fields'][2]['name'] = 'OTHER_DEVICE_DELAY'
        with self.assertRaisesRegex(ValueError, 'Binding drift'):
            verify(self.data)

    def test_commented_widget_is_not_active(self):
        xml = b'<Layout><!-- <EditorControl name="Oversampling" parameterName="FUZZ_OVERSAMPLE"/> --><Page><EditorControl name="Low" parameterName="CHORUS_BASS"/></Page></Layout>'
        self.assertEqual(controls(xml, 'FUZZ_OVERSAMPLE'), {'active': [], 'commentedOccurrences': 1})
        self.assertEqual(len(controls(xml, 'CHORUS_BASS')['active']), 1)

    def test_hidden_widget_cannot_be_promoted_by_receipt(self):
        self.data['fields'][5]['editorUI']['active'] = [{'control': {'name': 'Oversampling'}}]
        with self.assertRaisesRegex(ValueError, 'Hidden control'):
            verify(self.data)

    def test_non_pe_input_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Not a PE'):
            mine_editor(b'not an executable')

    def test_cache_truncation_and_trailing_data_are_rejected(self):
        import zipfile
        from six_field_resolution import ARCHIVE, MEMBER
        with zipfile.ZipFile(ARCHIVE) as z:
            data = z.read(MEMBER)
        for bad in (data[:-1], data+b'\0'):
            with self.assertRaises(ValueError):
                decode(bad)


if __name__ == '__main__':
    unittest.main()

#!/usr/bin/env python3
"""Source/binding regression checks; synthetic XML is not hardware evidence."""
import copy
import json
import unittest
from parameter_dependencies import OUT, extract, verify


class DependencyTests(unittest.TestCase):
    def test_fw_comments_and_non_tempo_locks(self):
        controls = ''.join(f'<EditorControl parameterName="CHORUS_TEST{i}" lock="CHORUS_TEMPO{i}"/>' for i in range(20))
        xml = '<Root>'+controls+'<Page version_lt="13"><EditorControl parameterName="CHORUS_OLD" lock="CHORUS_TEMPO"/></Page><!-- <EditorControl parameterName="CHORUS_COMMENT" lock="CHORUS_TEMPO"/> --><EditorControl parameterName="FILTER_FREQ" lock="FILTER_FREQRANGE"/></Root>'
        self.assertEqual(len(extract(xml)), 20)
        with self.assertRaisesRegex(ValueError, 'coverage'):
            extract(xml.replace('version_lt="13"', 'version_gtet="13"'))

    def test_cross_family_lock_refused(self):
        with self.assertRaisesRegex(ValueError, 'Cross-family'):
            extract('<Root><EditorControl parameterName="CHORUS_RATE" lock="DELAY_TEMPO"/></Root>')

    def test_receipt_and_tampering(self):
        receipt = json.loads(OUT.read_text())
        verify(copy.deepcopy(receipt))
        for mutate in [lambda d: d['tempoLocks'][0].__setitem__('targetPid', 1),
                       lambda d: d['tempoLocks'][0].__setitem__('noneRaw', 1),
                       lambda d: d['modifiers']['sources'].reverse(),
                       lambda d: d['descriptors']['MOD']['bindings'][8].__setitem__(1, 'MOD_PARAM')]:
            bad = copy.deepcopy(receipt)
            mutate(bad)
            with self.assertRaises(ValueError):
                verify(bad)

    def test_alias_and_distinct_reverb_provenance(self):
        receipt = json.loads(OUT.read_text())
        pairs = receipt['tempoLocks']
        f = next(r for r in pairs if r['family'] == 'FLANGER')
        self.assertEqual((f['target'], f['nativeTarget'], f['targetPid'], f['tempoPid']), ('OLD_FLANGER_RATE', 'FLANGER_RATE', 1, 2))
        self.assertEqual(sum(r['source'] == 'active-FW13-XML-lock' for r in pairs), 20)
        self.assertNotEqual(next(r['source'] for r in pairs if r['family'] == 'REVERB'), 'active-FW13-XML-lock')


if __name__ == '__main__':
    unittest.main()

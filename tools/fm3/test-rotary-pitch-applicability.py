#!/usr/bin/env python3
"""Independent FW13 model expectations and fail-closed parser/metadata regressions."""
import copy
import json
import unittest
from rotary_pitch_applicability import OUT, verify, prepare_xml, block_reason


class RotaryPitchTests(unittest.TestCase):
    def setUp(self):
        self.r = json.loads(OUT.read_text())

    def test_rotary_has_no_type_selector(self):
        f = self.r['families']['ROTARY']
        self.assertIsNone(f['modelPid'])
        self.assertEqual(f['parameters']['0']['name'], 'ROTARY_RATE')
        self.assertEqual(len([p for p in f['parameters'].values() if p['cases']]), 20)
        self.assertEqual(f['parameters']['9']['cases'], [])

    def test_pitch_voice_and_algorithm_cases(self):
        f = self.r['families']['PITCH']['parameters']
        types = lambda pid: sorted({t for c in f[str(pid)]['xmlCases'] for t in c['types']})
        self.assertEqual(types(97), [0])  # short dual-detune Time1, not Delay1
        self.assertEqual(types(47), [8])  # Crystal Splice Time1
        self.assertEqual(types(1), [6])   # Classic Whammy Mode
        self.assertEqual(types(3), [6, 9])
        self.assertEqual(types(77), [10])
        self.assertEqual(types(71), [11])
        self.assertIn(15, types(33))      # cross-feedback on two-voice delay
        self.assertNotIn(3, types(31))    # Quad Chromatic has no feedback
        self.assertIn(12, types(31))

    def test_discrete_and_enum_conflicts_use_scoped_overlay(self):
        f = self.r['families']['PITCH']['parameters']
        expected = {15,16,17,18,35,63,71,72,73,74,76,*range(77,93)}
        self.assertEqual({int(pid) for pid,p in f.items() if p['metadataConflict']}, set())
        for pid in expected:
            self.assertTrue(f[str(pid)]['cases'])
            self.assertIsNone(f[str(pid)]['blockedReason'])
        self.assertEqual(f['35']['cache']['labels'], ['NOTES', 'CHORDS'])
        self.assertEqual(f['35']['cache']['numeric_fields'][:2], [1,2])
        self.assertEqual(f['76']['cache']['numeric_fields'][:2], [1,78])
        for pid in [*range(64,71),107]:
            self.assertFalse(f[str(pid)]['cases'])
            self.assertTrue(f[str(pid)]['blockedReason'])

    def test_known_dynamic_notes_only(self):
        controls = ''.join('<EffectVariant value="'+v+'"><Page>'+''.join('<EditorControl name="Note '+str(i)+'" parameterName="PITCH_NOTE'+str(i)+'" dynamicParamInfo="true" type="dropdownMini" positionExact="1,2"/>' for i in range(2,9))+'</Page></EffectVariant>' for v in ['4','5','10','13'])
        xml = '<Root><EffectLayouts><Layout name="Pitch"><EffectVariants>'+controls+'</EffectVariants></Layout></EffectLayouts></Root>'
        clean, removed = prepare_xml(xml)
        self.assertEqual(len(removed),28)
        self.assertNotIn(b'dynamicParamInfo',clean)
        for bad in [xml.replace('PITCH_NOTE2','PITCH_UNKNOWN',1),xml.replace('dynamicParamInfo="true"','dynamicParamInfo="false"',1),xml.replace('type="dropdownMini"','dynamicParamId="2" type="dropdownMini"',1),xml.replace('value="13"','value="12"')]:
            with self.assertRaises(ValueError):prepare_xml(bad)

    def test_receipt_tampering_fails(self):
        verify(copy.deepcopy(self.r))
        for mutate in [lambda r:r['families']['ROTARY'].__setitem__('modelPid',0),
                       lambda r:r['families']['PITCH']['parameters']['35'].__setitem__('blockedReason','stale'),
                       lambda r:r['families']['PITCH']['parameters']['63'].__setitem__('cases',[{'types':[4],'when':{},'label':'Notes'}]),
                       lambda r:r['families']['PITCH']['nativeDescriptors'][15].__setitem__('pid',16),
                       lambda r:r['families']['PITCH']['excludedDynamicControls'].pop()]:
            bad=copy.deepcopy(self.r);mutate(bad)
            with self.assertRaises(ValueError):verify(bad)


if __name__ == '__main__':unittest.main()

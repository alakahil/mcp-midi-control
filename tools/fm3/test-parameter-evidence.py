#!/usr/bin/env python3
"""Failure-mode tests for coverage accounting and stored GET replay."""
import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('evidence', Path(__file__).with_name('parameter-evidence.py'))
evidence = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evidence)


def frame(function, payload):
    data = [240, 0, 1, 116, 17, function, *payload]
    checksum = 0
    for byte in data:
        checksum ^= byte
    return bytes([*data, checksum & 127, 247])


def response(effect=54, values=(0, 32767, 65534, 65535)):
    count = len(values)
    payload = [count & 127, count >> 7]
    for value in values:
        payload.extend([value & 127, value >> 7 & 127, value >> 14])
    return (frame(116, [effect & 127, effect >> 7, count & 127, count >> 7]) +
            frame(117, payload) + frame(118, []))


class ReplayTests(unittest.TestCase):
    def test_uint16_endpoints_and_realtime(self):
        raw = response()
        self.assertEqual(evidence.parse_get(raw[:20] + b'\xf8' + raw[20:], 54, 4), [0, 32767, 65534, 65535])

    def test_rejects_corruption_truncation_wrong_block_and_count(self):
        damaged = bytearray(response())
        damaged[20] ^= 1
        for raw, effect, count in [(damaged, 54, 4), (response()[:-1], 54, 4),
                                   (response(), 50, 4), (response(), 54, 5),
                                   (response() + b'\x00', 54, 4)]:
            with self.subTest(effect=effect, count=count, length=len(raw)):
                with self.assertRaises(ValueError):
                    evidence.parse_get(raw, effect, count)

    def test_valid_checksum_does_not_allow_out_of_range_word(self):
        raw = frame(116, [54, 0, 1, 0]) + frame(117, [1, 0, 0, 0, 4]) + frame(118, [])
        with self.assertRaisesRegex(ValueError, 'uint16'):
            evidence.parse_get(raw, 54, 1)


class AccountingTests(unittest.TestCase):
    def setUp(self):
        self.catalog = [{'family': 'FLANGER', 'paramId': 20, 'name': 'FLANGER_DRIVE'},
                        {'family': 'FLANGER', 'paramId': 20, 'name': 'OLD_FLANGER_DRIVE'}]
        self.dictionary = [{'family': 'FLANGER', 'param': 20, 'name': 'FLANGER_DRIVE',
                            'block': 82, 'status': 'taper-class-verified', 'kind': 'knob'}]
        self.runtime = {'defaultStatuses': ['taper-class-verified'], 'optInStatuses': ['linear-by-structure'],
                        'composerBases': [{'id': 'base', 'layout': 'known'}],
                        'layouts': {'known': {'flanger': {'eid': 82, 'words': 33}}},
                        'familyBySlug': {'flanger': 'FLANGER'}}

    def rows(self):
        return evidence.join_parameters(self.catalog, self.dictionary, self.runtime)

    def test_aliases_count_once_and_taper_claim_is_not_measurement(self):
        rows = self.rows()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['catalogRows'], [0, 1])
        self.assertEqual(rows[0]['observations'], [])
        self.assertTrue(rows[0]['tableEncoder']['available'])

    def test_duplicate_dictionary_and_symbol_conflict_fail_closed(self):
        self.dictionary.append(copy.deepcopy(self.dictionary[0]))
        with self.assertRaisesRegex(ValueError, 'Duplicate dictionary'):
            self.rows()
        self.dictionary.pop()
        self.dictionary[0]['name'] = 'OTHER'
        with self.assertRaisesRegex(ValueError, 'Conflicting symbol'):
            self.rows()

    def test_metadata_gate_alone_does_not_make_a_parameter_writable(self):
        for field, value in [('kind', 'unused'), ('status', 'n/a'), ('block', 90), ('param', 90)]:
            with self.subTest(field=field):
                old = self.dictionary[0][field]
                self.dictionary[0][field] = value
                self.assertFalse(any(r.get('tableEncoder', {}).get('available') for r in self.rows()))
                self.dictionary[0][field] = old

    def test_opt_in_and_missing_dictionary_remain_distinct(self):
        self.dictionary[0]['status'] = 'linear-by-structure'
        self.assertEqual(self.rows()[0]['tableEncoder']['policy'], 'opt-in')
        self.dictionary.clear()
        row = self.rows()[0]
        self.assertEqual(row['join'], 'catalog-only')
        self.assertNotIn('tableEncoder', row)


if __name__ == '__main__':
    unittest.main()

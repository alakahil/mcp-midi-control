#!/usr/bin/env python3
"""Exact requests must never silently become rounded historical display claims."""
import copy
import unittest

from modifier_minmax_plan import plan_request, POLICY
from modifier_op82_candidate import ModeDependentValue


class ExactRequestPlan(unittest.TestCase):
    def test_explicit_points_differ_from_historical_drag_words(self):
        for field, value, bits, raw, measured in [
                ('min', '2.50', '0x3e800000', 16384, 16375),
                ('max', '7.50', '0x3f400000', 49151, 49159),
                ('max', '5.00', '0x3f000000', 32767, 32784)]:
            request = dict(policy=POLICY, **{field: value})
            row = plan_request(request)['changes'][0]
            self.assertEqual((row['normalizedBits'], row['raw']), (bits, raw))
            self.assertNotEqual(row['raw'], measured)
            self.assertEqual(set(row['modes'].values()), {raw})

    def test_all_1001_cent_requests_reject_only_mode_ambiguous_point(self):
        rejected = []
        for n in range(1001):
            value = f'{n//100}.{n%100:02}'
            try:
                row = plan_request(dict(policy=POLICY, min=value))['changes'][0]
                self.assertEqual(set(row['modes'].values()), {row['raw']})
            except ModeDependentValue:
                rejected.append(value)
        self.assertEqual(rejected, ['6.47'])

    def test_both_endpoints_and_independent_offsets(self):
        changes = plan_request(dict(policy=POLICY, min='0.00', max='10.00'))['changes']
        self.assertEqual([(c['pid'], c['bodyOffset'], c['raw']) for c in changes],
                         [(1, 1586, 0), (2, 1588, 65534)])

    def test_no_display_coercion_clamping_rounding_or_unknown_fields(self):
        for value in [2.5, 0, True, None, '2.5', '02.50', '2.500', ' 2.50', '2.50\n',
                      '-0.00', '10.01', '11.00', 'NaN', 'Infinity', '6.4701']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                plan_request(dict(policy=POLICY, min=value))
        for request in [{}, {'min': '2.50'}, {'policy': POLICY}, [], None,
                        {'policy': 'measured-display', 'min': '2.50'},
                        {'policy': POLICY, 'min': '2.50', 'channel': 'A'},
                        {'policy': POLICY, 'min': '2.50', 'raw': 16384}]:
            with self.subTest(request=request), self.assertRaises(ValueError):
                plan_request(request)

    def test_batch_rejects_ambiguous_second_field_without_mutation(self):
        request = dict(policy=POLICY, min='2.50', max='6.47')
        original = copy.deepcopy(request)
        with self.assertRaises(ModeDependentValue):
            plan_request(request)
        self.assertEqual(request, original)

    def test_plan_remains_research_and_does_not_fill_omitted_fields(self):
        result = plan_request(dict(policy=POLICY, max='5.00'))
        self.assertEqual([c['field'] for c in result['changes']], ['max'])
        self.assertFalse(result['runtimeModeAtStoreProven'])
        self.assertFalse(result['fullRangeEncodingProven'])


if __name__ == '__main__':
    unittest.main()

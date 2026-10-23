#!/usr/bin/env python3
"""Discriminating research-model checks; no device I/O or production codec."""
import itertools
import unittest

from modifier_drag_audit import bounds, drag, display_candidates, partition_bounds


class DragModel(unittest.TestCase):
    def test_display_selects_motion_before_raw_comparison(self):
        for start, target, motion, raw in [(0,2.5,157,16375), (65534,7.5,-157,49159),
                                           (49159,5.0,-157,32784)]:
            candidates = display_candidates(start, target, bounds())
            self.assertEqual([(c['displacement'], c['predictedWord']) for c in candidates], [(motion,raw)])

    def test_constructor_default_is_not_the_factory_sweep(self):
        # 270 degrees is a real constructor default, but the later factory
        # overwrites it with 300. This check detects that tempting wrong model.
        self.assertEqual(display_candidates(0, 2.5, bounds(270)), [])

    def test_partition_extrema_against_exhaustive_compositions(self):
        limits = bounds()
        for direction in (-1, 1):
            start = direction * .123456
            results = []
            for cuts in itertools.product((False,True), repeat=7):
                parts, length = [], 1
                for cut in cuts:
                    if cut:
                        parts.append(length)
                        length = 1
                    else:
                        length += 1
                parts.append(length)
                angle = start
                for part in parts:
                    angle = drag(angle, direction*part, limits)
                results.append(angle)
            result = partition_bounds(start, direction*8, limits)
            self.assertEqual((result['minAngle'], result['maxAngle']), (min(results),max(results)))

    def test_coarse_and_fine_are_not_interchangeable(self):
        limits = bounds()
        self.assertNotEqual(drag(limits[0],157,limits), drag(limits[0],157,limits,.1))
        self.assertEqual(drag(limits[0],800,limits), limits[1])
        self.assertEqual(drag(limits[1],-800,limits), limits[0])


if __name__ == '__main__':
    unittest.main()

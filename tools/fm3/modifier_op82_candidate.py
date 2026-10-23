#!/usr/bin/env python3
"""Offline, non-writing op82 candidate. Not imported by the shipped generator.

Input is the exact normalized float32 bit pattern, never a rounded display label.
Return a raw-word candidate only when all four modeled arithmetic modes agree.
MODE1 consensus is not proof of device execution or complete Min/Max support.
"""
from modifier_transport_audit import compare_modes


class ModeDependentValue(ValueError):
    pass


def candidate_word(normalized_float32_bits):
    results = compare_modes(normalized_float32_bits)
    words = set(results.values())
    if len(words) != 1:
        raise ModeDependentValue('Unknown runtime MODE1 changes this candidate: '+str(results))
    return words.pop()

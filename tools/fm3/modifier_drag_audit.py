#!/usr/bin/env python3
"""Conditional forward replay of FM3-Edit mouse dragging, not a preset encoder.

Derive candidate motion from the requested display WITHOUT using the measured
after-word. Keep user-reported input method separate from unrecorded events.
"""
import argparse
import json
import math
from pathlib import Path
import struct

from modifier_quantization_audit import DOC, REF, EDITOR_SHA, f32, build as corpus
from six_field_resolution import require, sha

MANIFEST = DOC / 'modifier-drag-checkpoints.json'
OUT = DOC / 'modifier-drag-audit.json'


def bounds(degrees=300.0):
    require(math.isfinite(degrees) and 0 <= degrees <= 360, 'Invalid angle extent')
    hi = f32(f32(f32(f32(degrees) * f32(.5)) * f32(math.pi)) / f32(180))
    return -hi, hi


def angle_from_word(raw, limits):
    require(isinstance(raw, int) and 0 <= raw <= 65534, 'Invalid normalized word')
    lo, hi = limits
    # Conditional readback reconstruction; actual response float was not recorded.
    return f32(lo + f32(f32(raw / 65534) * f32(hi - lo)))


def drag(angle, displacement, limits, sensitivity=1.5):
    require(isinstance(displacement, int) and abs(displacement) < 2**24,
            'Model only accepts exactly representable, bounded integer displacement')
    require(math.isfinite(angle) and math.isfinite(sensitivity), 'Nonfinite model input')
    # displacement = newX-oldX-newY+oldY; actual ARM code uses its negation.
    delta = f32(f32(f32(sensitivity) * f32(-displacement)) / f32(-180))
    return max(limits[0], min(limits[1], f32(f32(angle) + delta)))


def normalized(angle, limits):
    lo, hi = limits
    return f32(f32(angle - lo) / f32(hi - lo))


def word_model(t):
    require(math.isfinite(t), 'Nonfinite normalized input')
    return min(65534, max(0, math.trunc(f32(f32(f32(t) * 65534) + .5))))


def display_candidates(start_raw, target_display, limits):
    """Search 1,601 integer endpoint displacements, using only a display bin."""
    start = angle_from_word(start_raw, limits)
    candidates = []
    for displacement in range(-800, 801):
        a = drag(start, displacement, limits)
        t = normalized(a, limits)
        word = word_model(t)
        display = word * 10 / 65534
        if target_display - .005 <= display < target_display + .005:
            candidates.append(dict(displacement=displacement, angle=a, normalized=t,
                                   normalizedBits=hex(struct.unpack('<I', struct.pack('<f', t))[0]),
                                   predictedWord=word, impliedDisplay=display))
    return candidates


def partition_bounds(start, displacement, limits):
    """Exact extrema over all monotonic integer partitions, with no intervening feedback.

    Each transition is monotone in the prior float32 angle, so keeping only
    minimum/maximum at every displacement preserves the attainable extrema.
    This covers event segmentation, not reversals, mode changes or readbacks.
    """
    direction = 1 if displacement >= 0 else -1
    states = [(start, start)]
    for total in range(1, abs(displacement) + 1):
        low, high = math.inf, -math.inf
        for previous in range(total):
            step = direction * (total - previous)
            low = min(low, drag(states[previous][0], step, limits))
            high = max(high, drag(states[previous][1], step, limits))
        states.append((low, high))
    low, high = states[-1]
    return dict(minAngle=low, maxAngle=high,
                minWord=word_model(normalized(low, limits)),
                maxWord=word_model(normalized(high, limits)))


def build(editor):
    require(sha(editor) == EDITOR_SHA, 'Wrong editor binary')
    manifest = json.loads(MANIFEST.read_text())
    for span in manifest['spans']:
        off = int(span['address'], 16) - 0x100000000
        require(sha(editor[off:off+span['size']]) == span['sha256'], 'Native span differs: '+span['name'])
    # The factory's 300.0f input and virtual range setter are independent of raw samples.
    require(struct.unpack_from('<I', editor, 0xb48b8)[0] == 0x52a872c9, 'Factory angle changed')
    require(struct.unpack_from('<Q', editor, 0xdb3a48 + 0x188)[0] == 0x10025d890, 'Range setter binding')
    limits = bounds()
    c = corpus()
    points = {(p['pid'], p['requestedTarget']): p for p in c['points'] if p['pid'] in (1,2)}
    source = json.loads((REF / 'wah-min-evidence.json').read_text())
    cases = [(1, 2.5, source['pair'][0]['code'])]
    for name, display in [('modifier-batch-a-evidence.json', 7.5), ('modifier-max-5-evidence.json', 5.0)]:
        fields = json.loads((DOC / name).read_text())['fields']
        cases.append((2, display, next(f['beforeRaw'] for f in fields if f['word'] == 2)))
    rows = []
    for pid, display, start in cases:
        candidates = display_candidates(start, display, limits)
        require(len(candidates) == 1, 'Expected exactly one coarse linear display candidate')
        prediction = candidates[0]
        # Only AFTER selecting motion from the display do we compare the after-word.
        measured = points[pid, display]['raw']
        partition = partition_bounds(angle_from_word(start, limits), prediction['displacement'], limits)
        rows.append(dict(pid=pid, display=display, startRaw=start, measuredRaw=measured,
                         candidate=prediction, match=prediction['predictedWord'] == measured,
                         monotonicPartitionBounds=partition,
                         everyMonotonicPartitionMatches=(partition['minWord'] == partition['maxWord'] == measured)))
    roundtrip = all(word_model(f32(r / 65534)) == r for r in range(65535))
    return dict(schemaVersion=1, date='2026-10-22', productionVersion='0.3.13',
                mode='conditional-forward-research-not-generator', newPhysicalExports=0,
                editorSha256=EDITOR_SHA, checkpointCount=len(manifest['spans']),
                inputMethodEvidenceSha256=sha((DOC/'modifier-input-method-evidence.json').read_bytes()),
                inputMethodKnown=True, exactHistoricalMouseEventsKnown=False,
                factorySweepDegrees=300, angularLimits=list(limits),
                rangeSetter='0x10025d890', factoryCall='0x1000b48c4',
                minMaxTextEditingDisabled=dict(pids=[1,2], branch='0x10017ba20..0x10017ba40',
                                              rotaryFlag='root+0x3b0', readoutFlag='readout+0x38a'),
                conditions=['Linear mouse mode 0 and coarse sensitivity 1.5.',
                            'Existing baseline raw is reconstructed through float32 normalized readback.',
                            'Ideal two-decimal display bin; native formatter not fully replayed.',
                            'Float32 arithmetic model for operation 82; not SHARC 40-bit execution.',
                            'Monotonic integer event partitions with no feedback during an active drag.'],
                points=rows, matches=sum(r['match'] for r in rows),
                normalizedWordCenterRoundtrip=dict(codes=65535, passed=roundtrip, scope='software model only'),
                retiredHypothesis='Constant raw step 655 via wheel/arrow operations is not supported by the reported mouse input.',
                exactDisplayModelComparison='0/3 remains a counterfactual typed-input comparison, not a contradiction of normalized linear encoding.',
                generatorWriteSupportAdded=False, fullRangeEncodingProven=False,
                nextStep='Audit operation-82 float transport and SHARC arithmetic mode; distinguish a canonical requested-value codec from preserved measured drag words.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--editor', type=Path, required=True)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    result = build(args.editor.read_bytes())
    if args.write:
        OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    else:
        require(json.loads(OUT.read_text()) == result, 'Stale drag audit')
    print(json.dumps({key:result[key] for key in ['matches','checkpointCount','normalizedWordCenterRoundtrip','fullRangeEncodingProven']}))

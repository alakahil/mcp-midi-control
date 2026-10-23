#!/usr/bin/env python3
"""Research-only exact WAH cent requests. JSON plans only; no preset/device I/O.

This proposed contract is NOT a recovered keyboard or mouse input rule.
Unrequested fields remain raw; historical display labels must not be inferred
as requests. Every requested normalized float32 must have four-mode consensus.
"""
from fractions import Fraction
import json
import re
import sys

from modifier_op82_candidate import candidate_word
from modifier_scheduler_audit import exact_float32
from modifier_transport_audit import bits, compare_modes

POLICY = 'exact-wah-cent-v1'
FIELDS = {'min': (1, 1586), 'max': (2, 1588)}


def normalize_fields(request, policy=POLICY):
    """Validate the explicit contract and derive bits without choosing a raw codec."""
    if (type(request) is not dict or request.get('policy') != policy or
            not set(request) <= {'policy', 'min', 'max'} or len(request) < 2):
        raise ValueError('Explicit '+policy+' request with min and/or max required')
    changes = []
    for field, (pid, offset) in FIELDS.items():
        if field not in request:
            continue
        value = request[field]
        if type(value) is not str or not re.fullmatch(r'(?:[0-9]\.[0-9]{2}|10\.00)', value):
            raise ValueError('Expected exact decimal string 0.00..10.00, step 0.01')
        whole, hundredths = value.split('.')
        target = Fraction(100 * int(whole) + int(hundredths), 1000)
        word = bits(float(target))
        distance = abs(exact_float32(word) - target)
        for neighbor in (word - 1, word + 1):
            if neighbor < 0:
                continue
            other = abs(exact_float32(neighbor) - target)
            if not (distance < other or distance == other and word % 2 == 0):
                raise ValueError('Normalization is not nearest-even float32')
        changes.append(dict(field=field, pid=pid, bodyOffset=offset,
                            exactDecimal=value, normalizedBits=f'0x{word:08x}'))
    return changes


def plan_request(request):
    changes = normalize_fields(request)
    for row in changes:
        word = int(row['normalizedBits'],16)
        row.update(raw=candidate_word(word), modes=compare_modes(word))
        # v1 still rejects 6.47. The measured extension is a distinct policy.
    return dict(policy=POLICY, changes=changes,
                interpretation='Proposed exact request, not an observed display-to-word lookup',
                runtimeModeAtStoreProven=False, fullRangeEncodingProven=False)


if __name__ == '__main__':
    try:
        requests = json.load(sys.stdin)
        if type(requests) is not list or not requests:
            raise ValueError('Expected nonempty request array')
        plans = [plan_request(request) for request in requests]
        print(json.dumps(plans, separators=(',', ':')))
    except (ValueError, TypeError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(2)

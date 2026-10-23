#!/usr/bin/env python3
"""Unpublished generator candidate: exact-cent Wah contract plus captured inputs.

The old policy and historical mouse words retain their meaning. This module
returns a plan, not a preset. Measurement support is keyed by PID AND exact
input bits; it is not permission to use 32-nearest for arbitrary float inputs.
"""
from functools import lru_cache
import json
import sys

from modifier_minmax_plan import normalize_fields
from modifier_op82_candidate import ModeDependentValue
from modifier_transport_audit import compare_modes
from modifier_hw_replay import build, CAPTURE_SHA

POLICY = 'exact-wah-cent-fw13-hw1'


@lru_cache(maxsize=1)
def evidence():
    audit = build()  # Recompute raw TX/RX and SYX checks, not the report's PASS flag.
    table = {}
    for row in audit['wire']['observations']:
        if row['operation'] != 82 or row['pid'] not in (1,2):
            continue
        key = row['pid'], int(row['inputBits'],16)
        entry = table.setdefault(key, dict(raw=row['observedRaw'],steps=[]))
        if entry['raw'] != row['observedRaw']:
            raise ValueError('Inconsistent exact-input measurements')
        entry['steps'].append(row['id'])
    return table


def choose_word(pid, word):
    if pid not in (1,2):
        raise ValueError('Candidate is only MOD_MIN/MOD_MAX for Wah Control')
    modes = compare_modes(word)
    measured = evidence().get((pid,word))
    if measured:
        if measured['raw'] not in modes.values():
            raise ValueError('Observation requires a new model review')
        return dict(raw=measured['raw'],modes=modes,
                    evidenceBasis='hardware-exact-input',captureSha256=CAPTURE_SHA,
                    measuredSteps=list(measured['steps']),fourModeConsensus=len(set(modes.values()))==1)
    if len(set(modes.values())) != 1:
        raise ModeDependentValue('Unmeasured mode-dependent input remains blocked')
    return dict(raw=next(iter(modes.values())),modes=modes,
                evidenceBasis='four-mode-consensus-only',measuredSteps=[],fourModeConsensus=True)


def plan_request(request):
    rows = normalize_fields(request,POLICY)
    for row in rows:
        row.update(choose_word(row['pid'],int(row['normalizedBits'],16)))
    return dict(policy=POLICY,changes=rows,
                targetScope=dict(firmware='13.00',modifierRecord=0,source=14,targetEffectId=94,
                                 targetPid=5,modifierChannel=0,modifierChannelScope='ALL',
                                 targetDescriptorType=50,low=0,high=1,multiplier=10),
                interpretation='Exact requested values, not rounded display lookup or recovered mouse/keyboard input',
                runtimeModeAtStoreProven=False,fullRangeEncodingProven=False,
                allRequestedInputsHardwareMeasured=all(r['evidenceBasis']=='hardware-exact-input' for r in rows),
                publishedGeneratorSupport=False,generatedPresetImported=False)


if __name__=='__main__':
    try:
        requests=json.load(sys.stdin)
        if type(requests) is not list or not requests:
            raise ValueError('Expected nonempty request array')
        print(json.dumps([plan_request(r) for r in requests],separators=(',',':')))
    except (ValueError,TypeError,KeyError) as exc:
        print(str(exc),file=sys.stderr);sys.exit(2)

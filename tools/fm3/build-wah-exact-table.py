#!/usr/bin/env python3
"""Replay the hardware audit and materialize the bounded policy for Node-only use."""
import hashlib
import json
import sys
from pathlib import Path
from modifier_minmax_hw_candidate import plan_request, POLICY, CAPTURE_SHA

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/wah-minmax-exact.json'

def build():
    rows = []
    for cent in range(1001):
        value = f'{cent // 100}.{cent % 100:02d}'
        plan = plan_request(dict(policy=POLICY, min=value, max=value))
        a, b = plan['changes']
        assert (a['raw'], a['normalizedBits'], a['modes'], a['evidenceBasis']) == (b['raw'], b['normalizedBits'], b['modes'], b['evidenceBasis'])
        rows.append([value, a['normalizedBits'], a['raw'], a['evidenceBasis'], a['measuredSteps'], b['measuredSteps']])
    assert sum(r[3] == 'hardware-exact-input' for r in rows) == 6
    return dict(schemaVersion=1, policy=POLICY, targetScope=plan['targetScope'],
                captureSha256=CAPTURE_SHA,
                auditSha256=hashlib.sha256((ROOT/'docs/fm3/parameter-evidence/modifier-hardware-measurement-audit.json').read_bytes()).hexdigest(),
                columns=['exactDecimal','normalizedBits','raw','evidenceBasis','minSteps','maxSteps'],
                fullRangeEncodingProven=False, runtimeModeAtStoreProven=False,
                countsPerField=dict(hardwareExactInput=6, fourModeConsensusOnly=995), rows=rows)

if __name__ == '__main__':
    data = build()
    encoded = (json.dumps(data, ensure_ascii=False, separators=(',', ':'))+'\n').encode()
    if sys.argv[1:] == ['--write']:
        OUT.write_bytes(encoded)
    elif sys.argv[1:]:
        raise SystemExit('Only --write is supported')
    else:
        assert OUT.read_bytes() == encoded, 'Stale exact-input table'
    print(json.dumps(dict(pointsPerField=len(data['rows']), sha256=hashlib.sha256(encoded).hexdigest())))

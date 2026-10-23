#!/usr/bin/env python3
"""Verify this backup's complete file inventory without contacting hardware."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'snapshot.json').read_text())
expected = manifest['files']
actual = {}
for path in root.rglob('*'):
    if path.is_symlink():
        raise SystemExit('Unexpected symlink: ' + str(path))
    if path.is_dir():
        continue
    name = path.relative_to(root).as_posix()
    if name == 'snapshot.json':
        continue
    data = path.read_bytes()
    actual[name] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
if actual != expected:
    raise SystemExit(json.dumps({
        'missing': sorted(set(expected) - set(actual)),
        'extra': sorted(set(actual) - set(expected)),
        'different': sorted(k for k in actual.keys() & expected.keys()
                            if actual[k] != expected[k]),
    }))
print(json.dumps({'passed': True, 'filesVerified': len(actual),
                  'version': manifest['version'],
                  'sourceCommit': manifest['releaseSourceCommit']}))

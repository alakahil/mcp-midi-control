#!/usr/bin/env python3
"""Build the packaged point-4 evidence summary, without native binaries or I/O.

This freshness check is not a repeat of native replay. Run modifier_lifecycle_audit.py
with the pinned firmware and editor to repeat the separate native checks.
"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
DOC=ROOT/'docs/fm3/parameter-evidence'
OUT=ROOT/'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-modifier-lifecycle-evidence.json'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources=['modifier-lifecycle-checkpoints.json','modifier-lifecycle-audit.json','modifier-corpus-audit.json','volume-pedal-rea-result.json','volume-pedal-legacy.json']
data={name:json.loads((DOC/name).read_text()) for name in sources}
native=data['modifier-lifecycle-audit.json'];corpus=data['modifier-corpus-audit.json']
assert native['checkpointSha256']==sha(DOC/sources[0])
assert native['priorREAReceiptSha256']==sha(DOC/'volume-pedal-rea-result.json')
assert native['allocationRuleStaticallyLocated'] and not native['serializedInitializationFullyProven']
assert not native['arbitraryWriterSupported'] and not native['deviceIO'] and not native['presetWrites']
report=dict(schemaVersion=1,metadataFirmware=13,
 sources={str((DOC/n).relative_to(ROOT)):sha(DOC/n) for n in sources},
 replayToolSha256=sha(ROOT/'tools/fm3/modifier_lifecycle_audit.py'),
 firmwareSha256=native['firmwareSha256'],editorSha256=native['editorSha256'],
 nativeSpansVerified=native['nativeSpansVerified'],editorSpansVerified=native['editorSpansVerified'],
 method=native['method'],findings=native['findings'],
 corpus=dict(files=corpus['files'],unique=corpus['unique'],accepted=corpus['accepted'],unsupported=len(corpus['unsupported']),
  scope=corpus['scope'],summary=corpus['summary'],legacyScope='The ten unsupported older files have a separate legacy report; they are not FW13 Gain donors.'),
 allocationRuleStaticallyLocated=True,serializedInitializationFullyProven=False,
 arbitraryAllocationSupported=False,simultaneousWahVolumeWriterSupported=False,removalWriterSupported=False,
 globalAssignments='Preset source references are readable; current pedal/MIDI assignments and values require separate global state and are unknown here.',
 limits=native['limits']+corpus['limits'],newREAInvocation=False,newHardwareMeasurements=False,deviceIO=False,presetWrites=False)
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--write',action='store_true');a=p.parse_args()
if a.write:OUT.write_text(json.dumps(report,indent=2)+'\n')
else:assert report==json.loads(OUT.read_text()),'Packaged point-4 evidence is stale'
print(json.dumps(dict(passed=True,packagedSha256=sha(OUT),nativeReplayPerformed=False,deviceIO=False)))

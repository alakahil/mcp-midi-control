# FM3 Volume pedal research handoff — 2026-10-23

Public recovery backup, explicitly authorized by the user on 2026-10-23.

The report is the exact saved version 44 snapshot, including its historical
pre-approval status. The user subsequently authorized publishing the complete
report and analysis ZIP in the public repository. This README and the
publication authorization in `completion.json` supersede that pending-status
paragraph when this directory is read from the repository. The report and
analysis ZIP bytes are preserved unchanged.

Research/package source: `c8280183ec80cefbd18dc1d2aa1a5f673893dc23`.
PR #24 merge: `3cd1fc8df45438001313f1632b4901ae1d56c657`.
This backup is not a plugin release. The private plugin remains 0.3.16,
engine `a11d8e44d0df339411d7e45ad6bea126b0bf89d5`.

`completion.json` records source/tree/archive identity, evidence hashes and
four passing pre-merge CI workflows. The offline log contains 59 production
checks plus 5 legacy-reader and 10 collector checks. The earlier failed log
is diagnostic history: adding four root-level research scripts required
refreshing the registry and two dependent source manifests. All other
top-level JSON data stayed unchanged.

The Mac ZIP contains the targeted Volume creation/assignment analysis plan,
standalone launcher/collector, tests, guide, validation and hashes. No new
Mac REA run or hardware export is claimed. Original editor/firmware binaries
are not included. Wah Min/Max scope and `fullRangeEncodingProven=false`
remain unchanged.

Restore the ZIP directly here, or rebuild it from the pinned commit:

```sh
python3 tools/fm3/build-volume-pedal-package.py --commit c8280183ec80cefbd18dc1d2aa1a5f673893dc23 --output /ABS/FM3_REA_VOLUME_PEDAL_2026-10-23.zip
```

Expected archive SHA-256:
`410cc6e6bbef3295912c0ce24eb1f8e86e505baa053849fb5571c4f29936bdbd`.
All backup payload hashes are in `SHA256SUMS` (excluding itself).

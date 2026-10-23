# FM3 0.3.15 release checkpoint — not yet published

Source commit: `981806a528934d2196a3f29f98fb38328693f705`.
The complete 53/53 offline suite, package runtime checks under escaped paths,
fresh-context guide use and byte-identical Git reconstruction have passed.
This checkpoint records development evidence. The published private plugin is
still 0.3.14 until a separate publication receipt explicitly says otherwise.
GitHub macOS arm64 CI is queued; no device work or new REA analysis is needed.

`review/` preserves superseded tests, interruption and diagnosed failures.
`offline/` is the final exact-source suite. `publication/` contains local package
checks and source/PR tree equivalence. `forward-initial/` and `forward-final/`
keep both guide-use outcomes. No full original user capture is added here.

Run `python3 verify-backup.py` from this directory to verify the inventory.
The published release, launcher and full updated work report will be added only
after their actual verification. No snapshot field implies publication.

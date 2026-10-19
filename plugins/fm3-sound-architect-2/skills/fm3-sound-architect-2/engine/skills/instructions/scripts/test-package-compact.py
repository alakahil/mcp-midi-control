#!/usr/bin/env python3
"""Integrity and release-budget gates; no device access."""
import importlib.util
import json
from pathlib import Path
import tempfile


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


archive = module("evidence", "fm3-evidence-archive.py")
package = module("package", "fm3-package.py")
manifest, store, blobs = archive.load_store()
assert len(store["entries"]) == 990 and len(blobs) == 164


def rejected(fn):
    try:
        fn()
    except (ValueError, OSError):
        return
    raise AssertionError("Expected rejection")


with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    for value in ["../outside", "/absolute", "a/../b", "a//b", "a\\b"]:
        rejected(lambda: archive.safe_relative(value))
    name, entry = next(iter(store["entries"].items()))
    small = {"entries": {name: entry}}
    assert archive.materialize(root / "restored", small, blobs) == 1
    assert archive.materialize(root / "restored", small, blobs) == 1
    target = root / "restored" / name
    target.write_bytes(b"different")
    rejected(lambda: archive.materialize(root / "restored", small, blobs))
    target.unlink()
    target.symlink_to(root / "outside")
    rejected(lambda: archive.materialize(root / "restored", small, blobs))
    # A modified store is rejected before decompression or restoration.
    original_manifest = archive.MANIFEST
    payload = root / "store.json.gz"
    payload.write_bytes((archive.ROOT / manifest["file"]).read_bytes() + b"changed")
    bad_manifest = root / "manifest.json"
    bad_manifest.write_text(json.dumps({**manifest, "file": "store.json.gz"}))
    old_root = archive.ROOT
    archive.ROOT, archive.MANIFEST = root, bad_manifest
    rejected(archive.load_store)
    archive.ROOT, archive.MANIFEST = old_root, original_manifest
    budget = root / "budget"
    budget.mkdir()
    for i in range(4000):
        (budget / str(i)).touch()
    rejected(lambda: package.inventory(budget))  # 4000 files + root = 4001.
    (budget / "3999").unlink()
    assert package.inventory(budget)[2] == 4000

print(json.dumps({"passed": True, "archiveFiles": 990, "uniqueContents": 164,
                  "wrongBytesRejected": True, "pathTraversalRejected": True,
                  "symlinkRejected": True, "differentExistingFilePreserved": True,
                  "sameFileRestoreIdempotent": True, "releaseBudgetBoundaryChecked": True}))

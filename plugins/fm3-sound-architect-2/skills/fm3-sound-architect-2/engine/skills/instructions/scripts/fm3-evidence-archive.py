#!/usr/bin/env python3
"""Read and restore the lossless, deduplicated historical Amp evidence store.

No MIDI/device access. Existing different files and symlink paths are refused.
Paths in the store retain their original plugin-root-relative identities.
"""
import argparse
import base64
import gzip
import hashlib
import json
from pathlib import Path, PurePosixPath
import sys


ROOT = Path(__file__).resolve().parents[3]
MANIFEST = ROOT / "skills/instructions/references/amp-history-manifest.json"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_relative(value):
    if not isinstance(value, str) or not value or "\\" in value:
        raise ValueError("Invalid evidence path")
    parts = value.split("/")
    if any(p in ("", ".", "..") for p in parts) or PurePosixPath(value).is_absolute():
        raise ValueError("Unsafe evidence path")
    return value


def load_store():
    manifest = json.loads(MANIFEST.read_text())
    payload = (ROOT / safe_relative(manifest["file"])).read_bytes()
    if digest(payload) != manifest["sha256"]:
        raise ValueError("Evidence store checksum mismatch")
    store = json.loads(gzip.decompress(payload))
    if store["schemaVersion"] != 1 or store["kind"] != "FM3_AMP_HISTORY":
        raise ValueError("Unsupported evidence store")
    blobs = {}
    for key, value in store["blobs"].items():
        data = base64.b64decode(value, validate=True)
        if digest(data) != key:
            raise ValueError("Evidence content hash mismatch")
        blobs[key] = data
    for name, entry in store["entries"].items():
        safe_relative(name)
        if not name.startswith("skills/instructions/references/batch-"):
            raise ValueError("Unexpected evidence scope")
        if len(blobs[entry["sha256"]]) != entry["bytes"]:
            raise ValueError("Evidence size mismatch")
    if len(store["entries"]) != manifest["originalFiles"] or len(blobs) != manifest["uniqueContents"]:
        raise ValueError("Evidence inventory mismatch")
    return manifest, store, blobs


def check_destination(root, relative):
    current = root
    for part in Path(root).parents:
        if part.is_symlink():
            raise ValueError("Symlink destination ancestor")
    if root.is_symlink():
        raise ValueError("Symlink destination")
    for part in PurePosixPath(relative).parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("Symlink destination component")
    return current


def materialize(root, store, blobs):
    root = Path(root).absolute()
    targets = []
    for name, entry in store["entries"].items():
        target = check_destination(root, name)
        data = blobs[entry["sha256"]]
        if target.exists() and (not target.is_file() or target.read_bytes() != data):
            raise ValueError("Refusing to overwrite different evidence: " + name)
        targets.append((target, data))
    for target, data in targets:
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open("xb") as stream:
                stream.write(data)
    return len(targets)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["verify", "list", "read", "materialize"])
    parser.add_argument("path", nargs="?")
    parser.add_argument("--output")
    args = parser.parse_args()
    manifest, store, blobs = load_store()
    if args.command == "verify":
        print(json.dumps({"verified": True, "originalFiles": len(store["entries"]), "uniqueContents": len(blobs), "sha256": manifest["sha256"]}))
    elif args.command == "list":
        print("\n".join(store["entries"]))
    elif args.command == "read":
        if not args.path or args.path not in store["entries"] or not args.output:
            raise ValueError("read requires an exact listed path and --output NEW_FILE")
        target = Path(args.output).absolute()
        check_destination(target.parent, target.name)
        with target.open("xb") as stream:
            stream.write(blobs[store["entries"][args.path]["sha256"]])
        print(target)
    else:
        if not args.output:
            raise ValueError("materialize requires --output TEMP_PLUGIN_ROOT")
        print(json.dumps({"restoredFiles": materialize(args.output, store, blobs), "root": str(Path(args.output).absolute())}))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)

#!/usr/bin/env python3
"""Build a full plugin ZIP with conservative file+directory entry accounting."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

HARD_LIMIT = 5000
RELEASE_BUDGET = 4000
SKIP_PARTS = {"__pycache__", ".git"}


def inventory(root):
    files = []
    dirs = set()
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if any(p in SKIP_PARTS for p in relative.parts) or path.name == ".DS_Store" or path.suffix == ".pyc":
            continue
        if path.is_symlink():
            raise ValueError("Symlinks are not packaged: " + str(relative))
        if path.is_file():
            files.append(path)
            for parent in relative.parents:
                if str(parent) != ".":
                    dirs.add(parent.as_posix())
    # Include the single top-level package directory, even if the ZIP omits
    # explicit directory records; the server may recreate them in its archive.
    count = len(files) + len(dirs) + 1
    if count > RELEASE_BUDGET:
        raise ValueError(f"Release budget exceeded: {count} > {RELEASE_BUDGET}; platform limit {HARD_LIMIT}")
    if sum(p.stat().st_size for p in files) > 512 * 1024 * 1024:
        raise ValueError("Uncompressed package exceeds 512 MiB")
    return files, dirs, count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path)
    parser.add_argument("output", type=Path, nargs="?")
    args = parser.parse_args()
    root = args.root.resolve()
    portable = json.loads((root / "plugin.json").read_text())
    legacy = json.loads((root / ".codex-plugin/plugin.json").read_text())
    if portable["name"] != legacy["name"] or portable["version"] != legacy["version"]:
        raise ValueError("Manifest identity/version conflict")
    name = portable["name"]
    if not name or "/" in name or "\\" in name or name in (".", ".."):
        raise ValueError("Invalid plugin name")
    files, dirs, count = inventory(root)
    report = {"files": len(files), "directories": len(dirs), "conservativeArchiveEntries": count,
              "releaseBudget": RELEASE_BUDGET, "platformEntryLimit": HARD_LIMIT,
              "headroomToPlatformLimit": HARD_LIMIT-count, "version": portable["version"]}
    if args.output:
        output = args.output.absolute()
        if output.is_relative_to(root) or output.exists():
            raise ValueError("Output must be a new path outside the plugin")
        # Server tarballs can use a reproducible 1970 timestamp. Clamp it to
        # ZIP's 1980 minimum; file contents and permissions remain unchanged.
        with zipfile.ZipFile(output, "x", compression=zipfile.ZIP_DEFLATED, strict_timestamps=False) as archive:
            for path in files:
                archive.write(path, name + "/" + path.relative_to(root).as_posix())
        if output.stat().st_size > 100 * 1024 * 1024:
            output.unlink()
            raise ValueError("Compressed package exceeds 100 MiB")
        with zipfile.ZipFile(output) as archive:
            if archive.testzip() is not None:
                raise ValueError("ZIP integrity failure")
        report.update(archive=str(output), archiveBytes=output.stat().st_size,
                      sha256=hashlib.sha256(output.read_bytes()).hexdigest())
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

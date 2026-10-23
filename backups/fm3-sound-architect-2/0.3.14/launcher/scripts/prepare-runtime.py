#!/usr/bin/env python3
"""Verify the pinned release before extracting or running any package code."""
import argparse
import hashlib
import json
import shutil
import tarfile
from pathlib import Path, PurePosixPath

SKILL_ROOT = Path(__file__).resolve().parents[1]
PIN = json.loads((SKILL_ROOT / 'references/release.json').read_text())
MAX_BYTES = 512 * 1024 * 1024


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_archive(archive):
    if archive.stat().st_size > 100 * 1024 * 1024:
        raise ValueError('Archive exceeds release limit')
    files = {}
    total = 0
    with tarfile.open(archive, 'r:gz') as tar:
        for count, member in enumerate(tar, 1):
            if count > 4000 or not (member.isdir() or member.isfile()):
                raise ValueError('Unexpected archive entry')
            name = member.name
            prefix = 'fm3-sound-architect-2/'
            if name.startswith(prefix):
                name = name[len(prefix):]
            path = PurePosixPath(name)
            if path.is_absolute() or '..' in path.parts or '\\' in name:
                raise ValueError('Unsafe archive path')
            if member.isdir():
                continue
            if str(path) != name or name in files:
                raise ValueError('Noncanonical or duplicate archive path')
            total += member.size
            if total > MAX_BYTES:
                raise ValueError('Expanded archive exceeds release limit')
            files[name] = tar.extractfile(member).read()
    return files


def read_directory(root):
    if root.is_symlink() or not root.is_dir():
        raise ValueError('Package must be a real directory')
    files = {}
    total = 0
    for path in root.rglob('*'):
        if path.is_symlink():
            raise ValueError('Unexpected symlink')
        if path.is_dir():
            continue
        if not path.is_file():
            raise ValueError('Unexpected filesystem entry')
        total += path.stat().st_size
        if total > MAX_BYTES or len(files) >= 4000:
            raise ValueError('Package exceeds release limits')
        files[path.relative_to(root).as_posix()] = path.read_bytes()
    return files


def verify(files):
    manifest_bytes = files.get('release-manifest.json', b'')
    if digest(manifest_bytes) != PIN['manifestSha256']:
        raise ValueError('Release manifest hash mismatch')
    manifest = json.loads(manifest_bytes)
    for key in ('pluginId', 'version', 'sourceCommit'):
        if manifest[key] != PIN[key]:
            raise ValueError('Release identity mismatch: ' + key)
    expected = manifest['files']
    if set(files) != set(expected) | {'release-manifest.json'}:
        raise ValueError('Package file inventory mismatch')
    for name, entry in expected.items():
        data = files[name]
        if len(data) != entry['bytes'] or digest(data) != entry['sha256']:
            raise ValueError('Package file mismatch: ' + name)
    return len(expected)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument('--archive', type=Path)
    source.add_argument('--directory', type=Path)
    parser.add_argument('--destination', type=Path)
    args = parser.parse_args()
    if args.directory:
        if args.destination:
            parser.error('--destination is only valid with --archive')
        files = read_directory(args.directory)
        root = args.directory.resolve()
    else:
        if not args.destination:
            parser.error('--archive requires --destination')
        root = args.destination.resolve()
        if root == SKILL_ROOT or SKILL_ROOT in root.parents:
            raise ValueError('Runtime must be outside the saved launcher skill')
        if root.exists():
            raise ValueError('Destination already exists; verify it with --directory')
        files = read_archive(args.archive)
    verified = verify(files)
    if args.archive:
        root.mkdir(parents=True, exist_ok=False)
        try:
            for name, data in files.items():
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
        except Exception:
            shutil.rmtree(root)
            raise
    skill = root / 'skills/fm3-sound-architect-2'
    scripts = skill / 'engine/skills/instructions/scripts'
    print(json.dumps({'verified': True, 'version': PIN['version'],
                      'sourceCommit': PIN['sourceCommit'], 'filesVerified': verified,
                      'package': str(root), 'skill': str(skill / 'SKILL.md'),
                      'selfCheck': str(scripts / 'fm3-self-check.mjs'),
                      'generator': str(scripts / 'fm3-preset.mjs')}))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, tarfile.TarError) as error:
        raise SystemExit(str(error))

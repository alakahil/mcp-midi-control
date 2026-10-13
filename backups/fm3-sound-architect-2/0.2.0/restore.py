#!/usr/bin/env python3
"""Restore the exact FM3 plugin files after verifying archive and file hashes."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import sys
import tarfile
import tempfile


def digest_file(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    if len(sys.argv) != 2:
        raise ValueError('Usage: python3 restore.py /new/destination')
    root = Path(__file__).resolve().parent
    destination = Path(sys.argv[1]).absolute()
    if destination.exists() or destination.is_symlink():
        raise ValueError('Destination already exists; choose a new directory')
    snapshot = json.loads((root / 'snapshot.json').read_text(encoding='utf-8'))
    manifest = json.loads((root / 'files.sha256.json').read_text(encoding='utf-8'))
    if digest_file(root / 'files.sha256.json') != snapshot['files_manifest_sha256']:
        raise ValueError('File manifest hash mismatch')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.fm3-restore-', dir=str(destination.parent)) as temporary:
        temp = Path(temporary)
        archive = temp / 'plugin.tar.xz'
        with archive.open('wb') as output:
            for part in snapshot['parts']:
                name = PurePosixPath(part['path'])
                if name.is_absolute() or '..' in name.parts:
                    raise ValueError('Invalid part path')
                source = root / str(name)
                if source.stat().st_size != part['bytes'] or digest_file(source) != part['sha256']:
                    raise ValueError('Archive part mismatch: ' + str(name))
                with source.open('rb') as stream:
                    shutil.copyfileobj(stream, output)
        if digest_file(archive) != snapshot['archive_sha256']:
            raise ValueError('Archive hash mismatch')
        restored = temp / 'restored'
        restored.mkdir()
        seen = set()
        expected = {entry['path']: entry for entry in manifest}
        with tarfile.open(archive, 'r:xz') as tar:
            for member in tar:
                name = PurePosixPath(member.name)
                if name.is_absolute() or '..' in name.parts:
                    raise ValueError('Invalid archive path')
                target = restored.joinpath(*name.parts)
                if member.isdir():
                    target.mkdir(parents=True, exist_ok=True)
                elif member.isfile():
                    if member.name not in expected or member.name in seen:
                        raise ValueError('Unexpected or duplicate file: ' + member.name)
                    seen.add(member.name)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with tar.extractfile(member) as source, target.open('xb') as output:
                        shutil.copyfileobj(source, output)
                    entry = expected[member.name]
                    if target.stat().st_size != entry['size'] or digest_file(target) != entry['sha256']:
                        raise ValueError('Restored file mismatch: ' + member.name)
                    os.chmod(target, member.mode & 0o777)
                else:
                    raise ValueError('Unsupported archive entry: ' + member.name)
        if seen != set(expected) or len(seen) != snapshot['file_count']:
            raise ValueError('Restored file list is incomplete')
        restored.rename(destination)
    print('Verified and restored {} files to {}'.format(len(seen), destination))


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, tarfile.TarError) as exc:
        print('Restore failed: {}'.format(exc), file=sys.stderr)
        sys.exit(1)

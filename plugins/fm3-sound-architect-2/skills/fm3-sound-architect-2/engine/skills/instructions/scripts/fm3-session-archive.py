#!/usr/bin/env python3
"""Lossless release-only storage for historical GEQ/PEQ/Enhancer sessions.

The Git checkout stays expanded. Restore a complete, byte-identical plugin
source tree to a NEW directory when a development task needs the raw sessions.
The launcher restores all runtime evidence before any generator is invoked.
No network or device access; never modify the installed release.
"""
import argparse
import base64
import gzip
import hashlib
import io
import json
import shutil
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[6]
REFERENCES = 'skills/fm3-sound-architect-2/engine/skills/instructions/references/'
SCOPES = tuple(REFERENCES + name + '/' for name in (
    'geq-full-20261010-194115',
    'peq-full-20261009-152606',
    'enhancer-full-20261012-122507',
))
ARCHIVE = REFERENCES + 'session-history.json.gz'
FORMAT = 'fm3-evidence-sessions-v1'
MAX_BYTES = 512 * 1024 * 1024


def sha(data):
    return hashlib.sha256(data).hexdigest()


def tree_hash(files):
    return sha(''.join(p + ':' + sha(b) + '\n' for p, b in sorted(files.items())).encode())


def safe_path(name):
    if (not isinstance(name, str) or not name or '\\' in name
            or PurePosixPath(name).is_absolute()
            or any(p in ('', '.', '..') for p in name.split('/'))):
        raise ValueError('Unsafe package path')
    return name


def pack_files(source):
    """Pure deterministic transformation; leave the caller's source untouched."""
    if ARCHIVE in source or 'release-manifest.json' in source:
        raise ValueError('Source already contains generated release files')
    selected = {p: b for p, b in source.items() if p.startswith(SCOPES)}
    if any(not any(p.startswith(scope) for p in selected) for scope in SCOPES):
        raise ValueError('Required historical session is missing')
    entries = {safe_path(p): {'sha256': sha(b), 'bytes': len(b)} for p, b in sorted(selected.items())}
    blobs = {sha(b): base64.b64encode(b).decode('ascii') for b in selected.values()}
    payload = json.dumps({'format': FORMAT, 'entries': entries, 'blobs': blobs},
                         sort_keys=True, separators=(',', ':')).encode()
    packed = {p: b for p, b in source.items() if p not in selected}
    buffer = io.BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode='wb', filename='', mtime=0) as stream:
        stream.write(payload)
    packed[ARCHIVE] = buffer.getvalue()
    return packed, {'format': FORMAT, 'archive': ARCHIVE, 'archivedFiles': len(entries)}


def unpack_sessions(payload):
    with gzip.GzipFile(fileobj=io.BytesIO(payload)) as stream:
        decoded = stream.read(MAX_BYTES + 1)
    if len(decoded) > MAX_BYTES:
        raise ValueError('Historical session store exceeds limit')
    store = json.loads(decoded)
    if store['format'] != FORMAT:
        raise ValueError('Unsupported historical session format')
    blobs = {}
    for digest, encoded in store['blobs'].items():
        data = base64.b64decode(encoded, validate=True)
        if sha(data) != digest:
            raise ValueError('Historical content hash mismatch')
        blobs[digest] = data
    files = {}
    for name, entry in store['entries'].items():
        if not safe_path(name).startswith(SCOPES):
            raise ValueError('Unexpected historical session scope')
        data = blobs[entry['sha256']]
        if len(data) != entry['bytes']:
            raise ValueError('Historical content size mismatch')
        files[name] = data
    if sum(map(len, files.values())) > MAX_BYTES:
        raise ValueError('Expanded historical sessions exceed limit')
    if set(blobs) != {e['sha256'] for e in store['entries'].values()}:
        raise ValueError('Unreferenced historical content')
    return files


def restore_files(package, manifest):
    """Verify the compact release, then reconstruct its exact Git source tree."""
    layout = manifest['packaging']
    if layout['format'] != FORMAT or layout['archive'] != ARCHIVE:
        raise ValueError('Unsupported package layout')
    if ARCHIVE not in package:
        source = {p: b for p, b in package.items() if p != 'release-manifest.json'}
        for name in source:
            safe_path(name)
        if tree_hash(source) != manifest['sourcePluginTreeSha256']:
            raise ValueError('Restored source tree hash mismatch')
        return source
    if set(package) != set(manifest['files']) | {'release-manifest.json'}:
        raise ValueError('Package file inventory mismatch')
    for name, entry in manifest['files'].items():
        data = package[safe_path(name)]
        if len(data) != entry['bytes'] or sha(data) != entry['sha256']:
            raise ValueError('Package file mismatch: ' + name)
    sessions = unpack_sessions(package[ARCHIVE])
    if len(sessions) != layout['archivedFiles'] or set(sessions) & set(package):
        raise ValueError('Historical session inventory mismatch')
    if set(manifest['generatedFiles']) != {'release-manifest.json', ARCHIVE}:
        raise ValueError('Unexpected generated files')
    source = {p: b for p, b in package.items() if p not in manifest['generatedFiles']}
    source.update(sessions)
    if tree_hash(source) != manifest['sourcePluginTreeSha256']:
        raise ValueError('Restored source tree hash mismatch')
    return source


def read_package(root):
    files = {}
    total = 0
    for path in root.rglob('*'):
        if path.is_symlink() or not (path.is_dir() or path.is_file()):
            raise ValueError('Unexpected package filesystem entry')
        if path.is_file():
            total += path.stat().st_size
            if total > MAX_BYTES:
                raise ValueError('Package exceeds limit')
            files[path.relative_to(root).as_posix()] = path.read_bytes()
    return files


def write_new_tree(destination, files):
    destination = Path(destination).absolute()
    for part in (destination, *destination.parents):
        if part.is_symlink():
            raise ValueError('Symlink destination')
    for name in files:
        safe_path(name)
    destination.mkdir(parents=True, exist_ok=False)
    try:
        for name, data in files.items():
            target = destination / name
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open('xb') as stream:
                stream.write(data)
    except Exception:
        shutil.rmtree(destination)
        raise
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['verify', 'list', 'materialize', 'prepare'])
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    package = read_package(ROOT)
    manifest = json.loads(package['release-manifest.json'])
    source = restore_files(package, manifest)
    if args.command == 'prepare':
        destination = ROOT
        if ARCHIVE in package:
            if not args.output:
                parser.error('prepare requires --output NEW_RUNTIME_DIRECTORY')
            destination = write_new_tree(args.output, {**source, 'release-manifest.json': package['release-manifest.json']})
        skill = destination / 'skills/fm3-sound-architect-2'
        scripts = skill / 'engine/skills/instructions/scripts'
        print(json.dumps({'verified': True, 'package': str(destination), 'skill': str(skill / 'SKILL.md'),
                          'selfCheck': str(scripts / 'fm3-self-check.mjs'),
                          'generator': str(scripts / 'fm3-preset.mjs')}))
        return
    if args.command == 'list':
        print('\n'.join(sorted(p for p in source if p.startswith(SCOPES))))
    elif args.command == 'materialize':
        if not args.output:
            parser.error('materialize requires --output NEW_PLUGIN_SOURCE_DIRECTORY')
        destination = write_new_tree(args.output, source)
        print(json.dumps({'restoredFiles': len(source), 'sourcePluginTreeSha256': tree_hash(source),
                          'path': str(destination)}))
    else:
        print(json.dumps({'verified': True, 'archivedFiles': manifest['packaging']['archivedFiles'],
                          'restoredFiles': len(source), 'sourcePluginTreeSha256': tree_hash(source)}))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError) as error:
        raise SystemExit(str(error))

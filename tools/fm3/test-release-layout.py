#!/usr/bin/env python3
"""Verify reversible packaging against real source bytes and hostile failures."""
import copy
import gzip
import json
import runpy
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLUGIN = ROOT / 'plugins/fm3-sound-architect-2'
API = runpy.run_path(str(PLUGIN / 'skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-session-archive.py'))


def manifest_for(source, packed, layout):
    return {'packaging': layout, 'sourcePluginTreeSha256': API['tree_hash'](source),
            'generatedFiles': ['release-manifest.json', API['ARCHIVE']],
            'files': {p: {'sha256': API['sha'](b), 'bytes': len(b)} for p, b in packed.items()}}


class ReleaseLayout(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = {p.relative_to(PLUGIN).as_posix(): p.read_bytes()
                      for p in PLUGIN.rglob('*') if p.is_file()}
        cls.packed, cls.layout = API['pack_files'](cls.source)
        cls.manifest = manifest_for(cls.source, cls.packed, cls.layout)
        cls.package = {**cls.packed, 'release-manifest.json': json.dumps(cls.manifest).encode()}

    def test_complete_source_round_trip(self):
        restored = API['restore_files'](self.package, self.manifest)
        self.assertEqual(restored, self.source)
        self.assertEqual(self.layout['archivedFiles'], 1080)
        with tempfile.TemporaryDirectory() as temp:
            root = API['write_new_tree'](Path(temp) / 'restored', restored)
            self.assertEqual(API['read_package'](root), self.source)

    def test_prepare_command_and_repeated_verification(self):
        with tempfile.TemporaryDirectory() as temp:
            compact = API['write_new_tree'](Path(temp) / 'compact', self.package)
            destination = Path(temp) / 'runtime'
            relative = 'skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-session-archive.py'
            result = subprocess.run(['python3', str(compact / relative), 'prepare', '--output', str(destination)],
                                    check=True, capture_output=True, text=True)
            self.assertEqual(json.loads(result.stdout)['package'], str(destination))
            expanded = API['read_package'](destination)
            self.assertEqual(API['restore_files'](expanded, self.manifest), self.source)
            result = subprocess.run(['python3', str(destination / relative), 'prepare'],
                                    check=True, capture_output=True, text=True)
            self.assertEqual(json.loads(result.stdout)['package'], str(destination))
            expanded[next(p for p in self.source if p.startswith(API['SCOPES']))] += b'bad'
            with self.assertRaisesRegex(ValueError, 'source tree hash'):
                API['restore_files'](expanded, self.manifest)

    def test_only_three_raw_session_directories_are_compacted(self):
        removed = set(self.source) - set(self.packed)
        self.assertEqual(removed, {p for p in self.source if p.startswith(API['SCOPES'])})
        self.assertEqual(set(self.packed) - set(self.source), {API['ARCHIVE']})
        for p in set(self.source) & set(self.packed):
            self.assertEqual(self.source[p], self.packed[p], p)
        dirs = {str(d) for p in self.package for d in Path(p).parents if str(d) != '.'}
        self.assertLess(len(self.package) + len(dirs) + 1, 2600)

    def test_deterministic_pack_and_unchanged_source(self):
        before = API['tree_hash'](self.source)
        self.assertEqual(API['pack_files'](dict(reversed(list(self.source.items())))),
                         (self.packed, self.layout))
        self.assertEqual(API['tree_hash'](self.source), before)

    def test_corruption_and_missing_or_extra_files_rejected(self):
        archive = API['ARCHIVE']
        for damaged in ({**self.package, archive: self.package[archive] + b'bad'},
                        {p: b for p, b in self.package.items() if p != archive},
                        {**self.package, 'extra': b'unexpected'}):
            with self.assertRaises(ValueError):
                API['restore_files'](damaged, self.manifest)

    def test_rehashed_data_cannot_change_original_source(self):
        store = json.loads(gzip.decompress(self.package[API['ARCHIVE']]))
        del store['entries'][next(iter(store['entries']))]
        used = {entry['sha256'] for entry in store['entries'].values()}
        store['blobs'] = {k: v for k, v in store['blobs'].items() if k in used}
        packed = {**self.packed, API['ARCHIVE']: gzip.compress(json.dumps(store).encode())}
        layout = {**self.layout, 'archivedFiles': self.layout['archivedFiles'] - 1}
        manifest = manifest_for(self.source, packed, layout)
        with self.assertRaisesRegex(ValueError, 'source tree hash'):
            API['restore_files']({**packed, 'release-manifest.json': b'{}'}, manifest)

    def test_path_and_symlink_protection(self):
        for path in ('../escape', '/absolute', 'a//b', 'a/./b', 'a/../b', 'a\\b'):
            with self.assertRaises(ValueError):
                API['safe_path'](path)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'existing').mkdir()
            (root / 'link').symlink_to(root / 'existing', target_is_directory=True)
            with self.assertRaises(FileExistsError):
                API['write_new_tree'](root / 'existing', {'x': b'x'})
            with self.assertRaises(ValueError):
                API['write_new_tree'](root / 'link' / 'new', {'x': b'x'})
            self.assertEqual(list((root / 'existing').iterdir()), [])

    def test_store_scope_and_content_hashes(self):
        original = json.loads(gzip.decompress(self.package[API['ARCHIVE']]))
        for fault in ('scope', 'hash', 'length'):
            store = copy.deepcopy(original)
            first = next(iter(store['entries']))
            if fault == 'scope':
                store['entries']['other/path'] = store['entries'].pop(first)
            elif fault == 'hash':
                store['blobs'][store['entries'][first]['sha256']] = 'YmFk'
            else:
                store['entries'][first]['bytes'] += 1
            with self.assertRaises(ValueError):
                API['unpack_sessions'](gzip.compress(json.dumps(store).encode()))


if __name__ == '__main__':
    unittest.main(verbosity=2)

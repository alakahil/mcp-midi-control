#!/usr/bin/env python3
"""Check the 2026-10-22 static checkpoints; never encode a modifier value.

Requires hash-pinned original editor and firmware. No network, MIDI, executable
execution, firmware output, or new native byte excerpts. The manifest records
coordinates/digests, not a claim of complete control-flow or runtime coverage.
"""
import argparse
import json
from pathlib import Path
import struct

from modifier_quantization_audit import build as quantization, EDITOR_SHA, DOC
from pitch_display import unpack, SYX_SHA, LDR_SHA
from six_field_resolution import require, sha

BASE = 0x100000000
MANIFEST = DOC / 'modifier-value-path-checkpoints.json'
OUT = DOC / 'modifier-value-path-audit.json'


class BootMemory:
    """Byte-addressed boot view, including fills and adjacent block boundaries."""
    def __init__(self, data):
        self.data, self.rows = data, []
        pos = 0
        while pos < len(data):
            require(pos+16 <= len(data), 'Truncated boot header')
            flags, start, size, fill = struct.unpack_from('<4I', data, pos)
            payload = pos+16
            pos = payload + (0 if flags & 0x100 else size)
            require(pos <= len(data), 'Truncated boot payload')
            self.rows.append((start, size, payload, bool(flags & 0x100), fill))

    def read(self, address, size):
        require(size > 0, 'Empty boot read')
        result = bytearray()
        while size:
            rows = [r for r in self.rows if r[0] <= address < r[0]+r[1]]
            require(len(rows) == 1, 'Ambiguous/unmapped boot address')
            start, count, offset, is_fill, value = rows[0]
            take = min(size, start+count-address)
            # Reject overlap anywhere in the requested interval, not only at start.
            require(not any(r != rows[0] and r[1] and
                            r[0] < address+take and r[0]+r[1] > address
                            for r in self.rows), 'Overlapping boot regions')
            delta = address-start
            if is_fill:
                word = struct.pack('<I', value)
                result.extend(word[(delta+i) % 4] for i in range(take))
            else:
                result.extend(self.data[offset+delta:offset+delta+take])
            address += take
            size -= take
        return bytes(result)


def bl_target(data, address):
    opcode, = struct.unpack_from('<I', data, address-BASE)
    require(opcode >> 26 == 0b100101, 'Expected AArch64 BL')
    imm = opcode & 0x3ffffff
    if imm & 0x2000000:
        imm -= 0x4000000
    return address + 4*imm


def stub_symbol(data, address):
    """Resolve LC_SYMTAB + LC_DYSYMTAB, never infer a symbol from its address."""
    require(struct.unpack_from('<I', data)[0] == 0xfeedfacf, 'Expected Mach-O 64')
    pos = 32
    sym = indirect = section = None
    for _ in range(struct.unpack_from('<I', data, 16)[0]):
        cmd, size = struct.unpack_from('<II', data, pos)
        require(size >= 8 and pos+size <= len(data), 'Malformed Mach-O load command')
        if cmd == 2:
            sym = struct.unpack_from('<4I', data, pos+8)
        if cmd == 11:
            indirect = struct.unpack_from('<2I', data, pos+56)
        if cmd == 0x19:
            for i in range(struct.unpack_from('<I', data, pos+64)[0]):
                p = pos+72+80*i
                va, length = struct.unpack_from('<QQ', data, p+32)
                flags, reserved1, reserved2 = struct.unpack_from('<III', data, p+64)
                if flags & 255 == 8 and va <= address < va+length:
                    section = va, reserved1, reserved2
        pos += size
    require(sym is not None and indirect is not None and section is not None,
            'Stub/symbol metadata missing')
    start, first, width = section
    require(width > 0 and (address-start) % width == 0, 'Stub alignment')
    index = first+(address-start)//width
    require(index < indirect[1], 'Indirect symbol index')
    symbol, = struct.unpack_from('<I', data, indirect[0]+4*index)
    require(symbol < sym[1], 'Non-symbol stub')
    name, = struct.unpack_from('<I', data, sym[0]+16*symbol)
    require(name < sym[3], 'Symbol string offset')
    begin = sym[2]+name
    return data[begin:data.index(b'\0', begin)].decode('ascii')


def check(editor, firmware):
    require(sha(editor) == EDITOR_SHA, 'Wrong original ARM64 editor')
    ldr = unpack(firmware)
    memory = BootMemory(ldr)
    manifest = json.loads(MANIFEST.read_text())
    require(manifest['editorSha256'] == EDITOR_SHA and
            manifest['firmwareSyxSha256'] == SYX_SHA and
            manifest['firmwareLdrSha256'] == LDR_SHA, 'Manifest source drift')
    for s in manifest['spans']:
        address, size = int(s['address'], 16), s['size']
        raw = (editor[address-BASE:address-BASE+size] if s['source'] == 'editor'
               else memory.read(address, size))
        require(len(raw) == size and sha(raw) == s['sha256'], 'Checkpoint drift: '+s['name'])
    def u64(a): return struct.unpack_from('<Q', editor, a-BASE)[0]
    def rtti(vtable):
        name = u64(u64(vtable-8)+8)-BASE
        return editor[name:editor.index(b'\0', name)].decode('ascii')
    require(rtti(0x100db84c8) == '12AxeFxReadout', 'Readout identity')
    require(u64(0x100db84c8+0x188) == 0x10023c220 and
            u64(0x100db84c8+0x190) == 0x10023c494, 'Readout virtual bindings')
    require(bl_target(editor, 0x10025d610) == 0x10023e0c8 and
            bl_target(editor, 0x10023c3cc) == 0x10002e0fc and
            bl_target(editor, 0x10002f208) == 0x100510a84, 'Getter call chain')
    symbol = stub_symbol(editor, 0x100510a84)
    require(symbol == '_strtod_l', 'Numeric parser import')
    require(rtti(0x100dcb4b8) == '16FM3EffectManager' and
            u64(0x100dcb4b8+0x18) == 0x10029ba78, 'Metadata provider binding')
    # Table is (family, effect ID), starting at 0x100539358. Do not
    # shift it by four bytes and mistakenly report MOD IDs 2..33.
    mapping = dict((effect, family) for family, effect in
                   struct.iter_unpack('<II', editor[0x539358:0x539478]))
    require([k for k,v in mapping.items() if v == 3] == list(range(3,35)), 'MOD family mapping')
    read_gate, = struct.unpack('<I', memory.read(0xc441c628+4*(9-3), 4))
    dispatch, = struct.unpack('<I', memory.read(0xc441c060+4*9, 4))
    require(read_gate == 0xc441cad7 and dispatch == 0xc441c0eb, 'FW op9 jump tables')
    corpus = quantization()
    special = [p for p in corpus['points'] if p['pid'] in (1,2)]
    exact = []
    for p in special:
        v = p['requestedTarget']
        single = struct.unpack('<f', struct.pack('<f', v))[0]
        require(v == single, 'Input not binary-exact float32')
        exact.append({'field': p['field'], 'input': v, 'raw': p['raw'],
                      'float32HexLE': struct.pack('<f', v).hex(),
                      'linearNearestHypothesis': p['predictions']['nearestFloat64'],
                      'rawError': p['nearestFloat64RawError']})
    return {
        'schemaVersion': 1, 'date': '2026-10-22', 'mode': 'offline-static-research',
        'baseCommit': '5238ebc5c4cd19c0ea412cd964e5e770c09930e7',
        'productionVersion': '0.3.13', 'newPhysicalExports': 0, 'deviceIO': False,
        'sources': {k: manifest[k] for k in ('editorSha256','firmwareSyxSha256','firmwareLdrSha256')},
        'checkpointCount': len(manifest['spans']), 'bootBlockCount': len(memory.rows),
        'getter': {'class': 'AxeFxReadout', 'function': '0x10023c220',
                   'parserImport': symbol, 'returnConversion': 'float64 to float32',
                   'historicalTypedInputOrWireTraceAvailable': False},
        'metadata': {'provider': 'FM3EffectManager', 'lookup': '0x10029ba78 -> 0x10007c544',
                     'modFamily': 3, 'effectIds': list(range(3,35)),
                     'minMaxCachedFields': [0,0,0,0],
                     'runtimeBoundsAndMultiplierResolved': False,
                     'rotary3cc3d0': 'angular endpoints in radians, not numeric Min/Max bounds'},
        'firmware': {'operation': 9, 'genericReadGateTargetThumb': hex(read_gate),
                     'mainDispatchTargetThumb': hex(dispatch), 'callbackCall': '0xc441c1d0',
                     'callbackSlot': 'object+0x14c', 'valueArgument': 's0 float32',
                     'modSpecificCallbackBindingResolved': False,
                     'uint16StoreResolved': False},
        'corpusSummary': corpus['summary'], 'minMaxComparison': exact,
        'rea': {'cliVersion': '6.4.0', 'newFunctionAttempt': 'provider_unavailable',
                'newDecompilationSucceeded': False, 'oldResultsReused': True,
                'diagnostics': 'modifier-rea-availability-20261022.json'},
        'generatorWriteSupport': False,
        'nextStep': 'Resolve MOD callback ownership and op9 normalization/store; trace target-dependent reply/metadata bounds. No new device export requested.'}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--editor', required=True, type=Path)
    p.add_argument('--firmware', required=True, type=Path)
    p.add_argument('--write', action='store_true', help='Regenerate research JSON only')
    args = p.parse_args()
    result = check(args.editor.read_bytes(), args.firmware.read_bytes())
    if args.write:
        OUT.write_text(json.dumps(result, indent=2)+'\n')
    else:
        require(json.loads(OUT.read_text()) == result, 'Research report drift')
    print(json.dumps({'status': 'passed', 'checkpoints': result['checkpointCount'],
                      'corpus': result['corpusSummary'], 'generatorWriteSupport': False}))


if __name__ == '__main__':
    main()

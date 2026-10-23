#!/usr/bin/env python3
"""Bounded op82 transport/precision research. Never send MIDI or emit a preset.

The arithmetic model uses exact dyadic integers, with a separate rounding step
after MULTIPLY and ADD. It does not assume that boot MODE1 proves runtime MODE1.
"""
import argparse
import json
import struct

from global_scale_cache import immediate, dm7
from modifier_drag_audit import normalized, bounds
from modifier_quantization_audit import DOC, EDITOR_SHA
from modifier_value_path_audit import BootMemory, BASE, bl_target
from pitch_display import unpack, SYX_SHA, LDR_SHA, instruction
from six_field_resolution import require, sha

MANIFEST = DOC / 'modifier-transport-checkpoints.json'
OUT = DOC / 'modifier-transport-audit.json'
MODES = {'32-nearest': (24, False), '40-nearest': (32, False),
         '32-zero': (24, True), '40-zero': (32, True)}


def bits(value):
    return struct.unpack('<I', struct.pack('<f', value))[0]


def split_word(word):
    """Native serializer's five little-significance 7-bit groups; no float cast."""
    require(type(word) is int and 0 <= word <= 0xffffffff, 'Expected uint32 bits')
    return bytes((word >> shift) & 127 for shift in (0, 7, 14, 21, 28))


def join_word(data):
    require(len(data) == 5 and all(x < 128 for x in data) and data[4] < 16,
            'Expected canonical 32-bit payload')
    return sum(x << (7*i) for i, x in enumerate(data))


def rounded(mantissa, exponent, precision, toward_zero=False):
    """Round nonnegative m*2**e to p significant bits, exactly; no float math."""
    require(mantissa >= 0 and precision in (24, 32), 'Unsupported arithmetic')
    shift = max(0, mantissa.bit_length() - precision)
    if not shift:
        return mantissa, exponent
    q, rem = divmod(mantissa, 1 << shift)
    halfway = 1 << (shift-1)
    if not toward_zero and (rem > halfway or (rem == halfway and q & 1)):
        q += 1
    return q, exponent + shift


def op82(word, precision=24, toward_zero=False):
    """Conditional SHARC arithmetic model for nonnegative float32 bits in [0,1]."""
    require(type(word) is int and 0 <= word <= 0x3f800000,
            'Research model accepts only positive float32 [0,1]')
    require(precision in (24, 32), 'Unsupported precision')
    ef = word >> 23
    # The SHARC manual specifies flushing subnormal inputs to zero.
    if ef == 0:
        return 0
    m, e = (word & 0x7fffff) | 0x800000, ef - 150
    m, e = rounded(m*65534, e, precision, toward_zero)
    common = min(e, -1)
    m = (m << (e-common)) + (1 << (-1-common))  # exact addition of 0.5
    m, e = rounded(m, common, precision, toward_zero)
    result = m << e if e >= 0 else m >> -e  # TRUNC, independent of MODE1.TRUNCATE
    return min(65534, max(0, result))


def compare_modes(word):
    return {name: op82(word, *mode) for name, mode in MODES.items()}


def boundary_audit():
    counts = {name: 0 for name in MODES if name != '32-nearest'}
    samples = []
    unique_inputs = set()
    for lower in range(65534):
        center = bits((lower+.5)/65534)
        for word in (center-1, center, center+1):
            unique_inputs.add(word)
            results = compare_modes(word)
            different = False
            for name in counts:
                if results[name] != results['32-nearest']:
                    counts[name] += 1
                    different = True
            if different and (len(samples) < 3 or lower in (16383, 32766, 49150)):
                samples.append(dict(lowerWord=lower, inputBits=hex(word), results=results))
    centers = {name: all(op82(bits(r/65534), *mode) == r for r in range(65535))
               for name, mode in MODES.items()}
    return dict(thresholds=65534, inputs=len(unique_inputs),
                scope='Nearest float32 to each mathematical half-word boundary and its two neighbors; not every float32 input.',
                differencesFrom32Nearest=counts, examples=samples,
                wordCenterRoundtrip=dict(codes=65535, passedByMode=centers))


def mode_bitop(data):
    """VISA Type18a BIT SET/CLR MODE1 only, independently of SLEIGH."""
    p, hi, lo = struct.unpack('<3H', data)
    require(p in (0x1402, 0x1422), 'Expected MODE1 bit set/clear')
    return ('set' if p == 0x1402 else 'clear'), (hi << 16) | lo


def build(editor, firmware):
    require(sha(editor) == EDITOR_SHA, 'Wrong editor')
    mem = BootMemory(unpack(firmware))
    manifest = json.loads(MANIFEST.read_text())
    require((manifest['editorSha256'], manifest['firmwareSyxSha256'],
             manifest['firmwareLdrSha256']) == (EDITOR_SHA, SYX_SHA, LDR_SHA), 'Source drift')
    def visa(a, n): return mem.read(0x80a00000 + (a-0x800000)*2, n)
    for span in manifest['spans']:
        a, n = int(span['address'], 16), span['size']
        data = (editor[a-BASE:a-BASE+n] if span['source'] == 'editor' else
                visa(a,n) if span['source'] == 'visa' else mem.read(a,n))
        require(len(data) == n and sha(data) == span['sha256'], 'Span drift: '+span['name'])
    require(bl_target(editor, 0x1000af314) == 0x100237874, 'Serializer call')
    require(bl_target(editor, 0x100237b00) == 0x100239c18, 'Envelope call')
    # No numerical conversion: LDR W24,[X23,#12], five bit-slices and byte stores.
    require(struct.unpack_from('<I', editor, 0x237994)[0] == 0xb9400ef8, 'Raw uint32 serializer load')
    require(struct.unpack('<I', mem.read(0xc44526cc,4))[0] == 0xc44528c9,
            'SysEx function 1 must select the parameter packet handler')
    # ARM wrapper routes op82 to the shared-memory fallback on an unhandled result.
    require(struct.unpack('<I', mem.read(0xc441b99c+4*(82-2),4))[0] == 0xc441bf39,
            'ARM op82 fallback table')
    require(immediate(visa(0x82e07f,6)) == (4,0x20084000), 'Mailbox argument')
    require(instruction(visa(0x82e082,6),0) == (0x1804 << 32 | 0x82959a), 'Mailbox consumer')
    require(struct.unpack('<I', mem.read(0x282e7958+4*82,4))[0] == 0x829624,
            'SHARC op82 dispatch table')
    # The input value is loaded at byte offset 12, callback at object byte offset 0x14c.
    require(dm7(visa(0x8295e1,4)) == (False,3,13,12), 'Mailbox value load')
    # Type15a: normal-word displacement 0x53 = byte offset 0x14c, I5 -> I12.
    require(instruction(visa(0x8296f4,6),0) == 0xaa1c00000053, 'Callback field load')
    clear_op, clear = mode_bitop(visa(0x8343e9,6))
    set_op, set_bits = mode_bitop(visa(0x8343ec,6))
    require((clear_op,clear,set_op,set_bits) == ('clear',0xa078,'set',0x1011800), 'Startup mode')
    require(clear & 0x8000 and set_bits & 0x10000 and not set_bits & 0x8000,
            'Startup must select 32-nearest')
    require(immediate(visa(0x8343ef,6)) == (0x73,0xe0b003), 'Startup MMASK')
    require(not 0xe0b003 & 0x10000, 'MMASK must preserve RND32')
    # Basis-vector identity is sufficient for this disjoint bit-slicing map;
    # all-ones also guards the top 4-bit group and accidental truncation.
    vectors = [0, 0xffffffff] + [1 << i for i in range(32)]
    require(all(join_word(split_word(x)) == x for x in vectors), '32-bit payload loss')
    drag = json.loads((DOC/'modifier-drag-audit.json').read_text())
    cases = []
    for row in drag['points']:
        word = int(row['candidate']['normalizedBits'],16)
        partition = row['monotonicPartitionBounds']
        endpoints = [bits(normalized(partition[k], bounds())) for k in ('minAngle','maxAngle')]
        results = compare_modes(word)
        cases.append(dict(pid=row['pid'], display=row['display'], measuredWord=row['measuredRaw'],
                          hypotheticalInputBits=hex(word), hypotheticalPayload=split_word(word).hex(' '),
                          results=results, allModesMatch=all(r == row['measuredRaw'] for r in results.values()),
                          everyMonotonicPartitionMatchesAllModes=all(
                              op82(x,*mode)==row['measuredRaw'] for x in endpoints for mode in MODES.values())))
    return dict(schemaVersion=1,date='2026-10-22',productionVersion='0.3.13',
                mode='bounded-static-transport-and-exact-dyadic-model',newPhysicalExports=0,
                newReaDecompilation=False,checkpointCount=len(manifest['spans']),
                dragAuditSha256=sha((DOC/'modifier-drag-audit.json').read_bytes()),
                sources={k:manifest[k] for k in ('editorSha256','firmwareSyxSha256','firmwareLdrSha256')},
                transport=dict(editorSerializer='0x100237874',firmwareWordDecoder='0xc44515aa',
                               armPacketHandler='0xc4454990',sharedMailbox='0x20084000',
                               sharcPacketHandler='0x82959a',valueByteOffset=12,
                               callbackByteOffset=332,modifierCallback='0x813f86',
                               boundedBitPreservingPathLinked=True,wholeProgramExecutionProven=False,
                               historicalPacketsCaptured=False,basisChecks=len(vectors)),
                startup=dict(clearMask=hex(clear),setMask=hex(set_bits),mmask='0xe0b003',
                             mode='32-nearest',runtimeModeAtStoreProven=False,
                             reason='Boot and bounded paths checked; external math callees and all runtime mode writes are not closed.'),
                dragCases=cases,boundaryAudit=boundary_audit(),
                generatorWriteSupportAdded=False,fullRangeEncodingProven=False,
                limits=['Payload examples are calculated from conditional drag candidates, not measured MIDI packets.',
                        'Editor immediate-send path is linked; pending-request coalescing copies bits, but its scheduler is not fully traced.',
                        'Shared-mailbox path is traced for an unhandled ARM request and valid SHARC object/PID.',
                        'Static field-flow plus selected operand checks is not a full firmware emulator.',
                        'Model scope is finite nonnegative float32 [0,1]; subnormal inputs flush to zero.',
                        'Other Min/Max descriptor types, op9 RECIPS and canonical displayed-value policy remain separate.'],
                nextStep='Resolve MODE1 preservation across external math calls 0x1cb91c and 0x1cb13a and the dispatcher entry; then prepare a narrow canonical op82 codec candidate, retaining measured raw drag words.')


if __name__ == '__main__':
    from pathlib import Path
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--editor',type=Path,required=True)
    ap.add_argument('--firmware',type=Path,required=True)
    ap.add_argument('--write',action='store_true')
    args = ap.parse_args()
    result = build(args.editor.read_bytes(),args.firmware.read_bytes())
    if args.write:
        OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    else:
        require(json.loads(OUT.read_text())==result, 'Stale transport audit')
    print(json.dumps({k:result[k] for k in ('checkpointCount','startup','boundaryAudit','fullRangeEncodingProven')}))

#!/usr/bin/env python3
"""Bounded MODE1 restoration certificate; no firmware execution or preset output.

Native spans and selected operands anchor a reviewed control-flow witness.
Symbolic masks check its restoration algebra for every incoming MODE1 word.
This is not an instruction emulator or a proof of the caller's runtime mode.
"""
import argparse
import json
import struct
from pathlib import Path

from global_scale_cache import immediate, signed
from modifier_quantization_audit import DOC
from modifier_sharc_audit import indirect_jump
from modifier_value_path_audit import BootMemory
from pitch_display import instruction, unpack, SYX_SHA, LDR_SHA
from six_field_resolution import require, sha

MANIFEST = DOC / 'modifier-mode-checkpoints.json'
OUT = DOC / 'modifier-mode-audit.json'
ALL = 0xffffffff
RND32 = 1 << 16
TRUNCATE = 1 << 15


def visa_byte(address, size):
    """SHARC1 private VISA -> multiprocessor byte address, bounded per L1 block.

    ADSP-SC58x/2158x datasheet Rev C, p11, Tables 4 and 6. External code
    mapping is the independently pinned FW13 boot-section mapping.
    """
    require(type(address) is int and type(size) is int and size > 0 and size % 2 == 0,
            'Expected a nonempty whole-parcel code span')
    regions = ((0x120000, 0x138000, 0x28240000),
               (0x160000, 0x178000, 0x282c0000),
               (0x180000, 0x190000, 0x28300000),
               (0x1c0000, 0x1d0000, 0x28380000),
               (0x800000, 0x83804a, 0x80a00000))
    for start, end, base in regions:
        if start <= address and address + size//2 <= end:
            return base + 2*(address-start)
    raise ValueError('Unmapped, cross-region, or non-SHARC1 VISA span')


def bitop(data):
    """SHARC+ Type18a system-register SET/CLR/TST; no SLEIGH dependency."""
    require(len(data) == 6, 'Expected Type18a size')
    p, hi, lo = struct.unpack('<3H', data)
    require(p & 0xff10 == 0x1400 and (p >> 5) & 7 in (0, 1, 4),
            'Unsupported system bit operation')
    return ({0:'set', 1:'clear', 4:'test'}[(p >> 5) & 7], p & 15, hi << 16 | lo)


def move_with_compute(data):
    """Type5a unconditional register-transfer operands, excluding compute semantics."""
    require(len(data) == 6, 'Expected Type5a size')
    p, q, _ = struct.unpack('<3H', data)
    require(p >> 11 == 14 and (p >> 1) & 31 == 31,
            'Expected unconditional register transfer')
    source = ((p >> 6) & 31)*4 + (p & 1)*2 + (q >> 15)
    return (q >> 7) & 127, source


def short_branch(data, address):
    """Type9a relative JUMP, optional ELSE compute, delayed or immediate."""
    require(len(data) == 6, 'Expected Type9a size')
    v = instruction(data, 0)
    require(v >> 41 == 4 and v & (1 << 40) and not v & ((1 << 39)|(1 << 38)|(1 << 24)),
            'Expected relative JUMP without call/LA/CI')
    return ((v >> 33) & 31, address + signed((v >> 27) & 63, 6),
            bool(v & (1 << 26)), bool(v & (1 << 25)))


def symbolic_restore(actions, known_mask=0, known_value=0):
    """Prove output == input under a bit guard using (input & keep) | force.

    Actions are the reviewed MODE1 slice, NOT decoded firmware instructions.
    Other registers/arithmetic are intentionally outside this proof.
    """
    require(known_value & ~known_mask == 0, 'Invalid guard')
    mode, saved = (ALL, 0), {}
    for action in actions:
        op, value = action
        if op == 'save':
            saved[value] = mode
        elif op == 'restore':
            require(value in saved, 'Restore without a saved value')
            mode = saved[value]
        elif op == 'clear':
            mode = (mode[0] & ~value, mode[1] & ~value)
        elif op == 'set':
            mode = (mode[0] & ~value, mode[1] | value)
        elif op == 'set_saved':
            register, mask = value
            require(register in saved, 'Update without a saved value')
            keep, force = saved[register]
            saved[register] = (keep & ~mask, force | mask)
        else:
            raise ValueError('Unknown symbolic action')
    keep, force = mode
    variable = ALL ^ known_mask
    equal = ((keep & variable) == variable and not force & variable and
             (((known_value & keep) | force) & known_mask) == known_value)
    return dict(keepMask=hex(keep), forceMask=hex(force),
                knownMask=hex(known_mask), knownValue=hex(known_value),
                equalsIncomingForEveryMatchingWord=equal)


def restoration_cases():
    trunc = [('save',2), ('set',TRUNCATE), ('restore',2)]
    cases = [dict(function='0x1cb91c', returnAt='0x1cb92d',
                  restoreAt='0x1cb924', proof=symbolic_restore(trunc))]
    # NE's two paths rejoin before saving MODE1. Neither path writes MODE1,
    # BTF, or calls another function. Both are retained in the certificate.
    for ne in (False, True):
        for rnd in (False, True):
            actions = [('clear',RND32), ('save',1)]
            if rnd:
                actions += [('set_saved',(1,RND32)), ('restore',1)]
            cases.append(dict(function='0x1cb13a', initialNeBranch=ne,
                              incomingRnd32=rnd,
                              returnAt='0x1cb17a' if rnd else '0x1cb181',
                              restoreInDelaySlot='0x1cb17b' if rnd else None,
                              proof=symbolic_restore(actions,RND32,RND32 if rnd else 0)))
    return cases


def build(firmware):
    mem = BootMemory(unpack(firmware))
    manifest = json.loads(MANIFEST.read_text())
    require((manifest['firmwareSyxSha256'],manifest['firmwareLdrSha256']) ==
            (SYX_SHA,LDR_SHA), 'Source drift')
    def code(a,n): return mem.read(visa_byte(a,n),n)
    for span in manifest['spans']:
        a, n = int(span['address'],16), span['size']
        raw = code(a,n) if span['source'] == 'visa' else mem.read(a,n)
        require(sha(raw) == span['sha256'], 'Native span drift: '+span['name'])
    for a,expected in ((0x1cb13a,('test',2,RND32)),
                       (0x1cb13d,('clear',2,RND32)),
                       (0x1cb91f,('set',2,TRUNCATE)),
                       (0x1cb927,('test',6,0x20))):
        require(bitop(code(a,6)) == expected, 'System bit operand drift')
    # Ureg 0x72 is MODE1. The source register must survive until restoration.
    for a,expected in ((0x1cb91c,(2,0x72)), (0x1cb924,(0x72,2)),
                       (0x1cb162,(1,0x72)), (0x1cb17b,(0x72,1))):
        require(move_with_compute(code(a,6)) == expected, 'MODE1 save/restore register')
    require(short_branch(code(0x1cb143,6),0x1cb143) == (16,0x1cb15b,True,False),
            'Division NE branch')
    require(short_branch(code(0x1cb16b,6),0x1cb16b) == (29,0x1cb17f,True,True),
            'Division saved-BTF branch')
    require(instruction(code(0x1cb174,6),0) == 0x023e00301011, 'R1 BSET bit16')
    require(instruction(code(0x1cb17a,2),0,1) == 0x0afe, 'First delayed RTS')
    require(instruction(code(0x1cb181,6),0) == 0x0a3e040ad800, 'Second delayed RTS')
    require(indirect_jump(code(0x1cb92d,4)) == (14,12,True), 'Truncation helper return')
    # Call links from the actual selected packet and MOD paths.
    for a,target in ((0x8295fa,0x8232dc),(0x82960b,0x823892),(0x82968f,0x1c8aa2),
                     (0x813fbb,0x8244fb),(0x814220,0x823ae7),(0x81427c,0x823ae7),
                     (0x823b3d,0x1cb91c),(0x823b59,0x1cb91c)):
        require(instruction(code(a,6),0) == (0x1804 << 32 | target), 'CJUMP target drift')
    call = instruction(code(0x823b4e,6),0)
    require(call >> 24 == 0x07be00 and
            0x823b4e + signed(call & 0xffffff,24) == 0x1cb13a, 'Relative division CALL')
    def word(a): return struct.unpack('<I',mem.read(a,4))[0]
    require(word(0x282e76c0) == 0x824638, 'Generic type0 must go directly to epilogue')
    for pid in (1,2):
        require(word(0x8090c290+pid*36+4) == 0, 'Static MOD Min/Max type')
    require(word(0x809aa530+5*36+4) == 0x32, 'WAH PID5 type3')
    require(word(0x282e6220) == 0x8141fa and word(0x282e6224) == 0x814256,
            'MOD PID1/2 branches')
    require(word(0x282e61e8+8) == 0x81420e and word(0x282e61b0+8) == 0x81426a,
            'WAH type3 branches')
    require(immediate(code(0x82460f,6)) == (0x14,0x2e76c0), 'Generic table operand')
    cases = restoration_cases()
    require(all(c['proof']['equalsIncomingForEveryMatchingWord'] for c in cases),
            'Restoration certificate failed')
    return dict(schemaVersion=1,date='2026-10-22',productionVersion='0.3.13',
                method='hash-pinned static paths plus symbolic MODE1 slice; not CPU emulation',
                sources={k:manifest[k] for k in ('firmwareSyxSha256','firmwareLdrSha256')},
                checkpointCount=len(manifest['spans']),
                l1Mapping=[dict(visa=hex(a),sharc1Byte=hex(visa_byte(a,2)))
                           for a in (0x1cb91c,0x1cb13a,0x1c8aa2)],
                restorationCases=cases,
                helperPreservation=dict(truncation=True,division=None,timestamp=True,
                                        divisionRestorationAlgebra=True,
                                        divisionNativeReturnSemanticsProven=False,
                                        scope='Reviewed scalar ABI paths; division preservation is conditional on unresolved compact-return opcode/delay semantics. External interrupts/exceptions excluded.'),
                btf=dict(setAt='0x1cb13a',consumedAt='0x1cb16b',
                         interveningBtfOverwriteFound=False,
                         basis='Type18a and ASTATX.BTF; reviewed arithmetic updates other flags, not BTF.'),
                selectedPath=dict(entry='0x82959a',store='0x823bb4',operation=82,
                                  modifierPids=[1,2],targetFamily='WAH',targetPid=5,
                                  targetType=3,genericType=0,
                                  genericType0Target='0x824638',
                                  modePreservedFromEntryToStore=None,
                                  conditionalRestorationModelPreservesMode=True,
                                  nativeReturnSemanticsIndependentlyProven=False,
                                  conditions=['Valid MOD object and target descriptor, standard scalar ABI.',
                                              'Selected successful op82 path, no external interrupt/exception effects.',
                                              'The 0x0afe parcel at 0x1cb17a is treated as delayed RTS by the legacy decoder; reconcile with the SHARC+ Type11c figure before claiming native closure.',
                                              'Reviewed callees and tables; not a general firmware interpreter.']),
                runtimeModeAtEntryProven=False,fullRangeEncodingProven=False,
                generatorWriteSupportAdded=False,newPhysicalExports=0,newReaDecompilation=False,
                nextStep='Trace caller/scheduler MODE1 invariant before 0x82959a; retain consensus-only offline candidate until scope and exact-display input policy are resolved.')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--firmware',type=Path,required=True)
    ap.add_argument('--write',action='store_true')
    args = ap.parse_args()
    result = build(args.firmware.read_bytes())
    if args.write:
        OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    else:
        require(json.loads(OUT.read_text()) == result, 'Stale MODE1 audit')
    print(json.dumps({k:result[k] for k in ('checkpointCount','helperPreservation',
                                         'runtimeModeAtEntryProven','generatorWriteSupportAdded')}))

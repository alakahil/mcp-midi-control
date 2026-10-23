#!/usr/bin/env python3
"""Research-only task context and proposed WAH cent-grid audit. No device I/O.

Proves selected initialization/stack operands, not every call in coreTask.
The cent-grid is an explicit candidate policy, not a recovered UI input rule.
"""
import argparse
from fractions import Fraction
import json
from pathlib import Path
import struct

from global_scale_cache import immediate, dm7, modify, register_move
from modifier_mode_audit import visa_byte, bitop, RND32, TRUNCATE
from modifier_quantization_audit import DOC
from modifier_transport_audit import bits, compare_modes
from modifier_value_path_audit import BootMemory
from pitch_display import unpack, instruction, SYX_SHA, LDR_SHA
from six_field_resolution import require, sha

MANIFEST = DOC/'modifier-scheduler-checkpoints.json'
OUT = DOC/'modifier-scheduler-audit.json'
INIT_AND = 0xff1f1b00
INIT_OR = 0x01010000
SAFE_CLEAR = 0x00e0f4ff
PEYEN = 1 << 21


def initial_mode(creator_mode):
    require(type(creator_mode) is int and 0 <= creator_mode <= 0xffffffff, 'Expected MODE1 word')
    return (creator_mode & INIT_AND) | INIT_OR


def system_register(code):
    """SHARC+ SYSREG class, manual §27-12. Legacy LRPTL label is misleading here."""
    require(type(code) is int and 0 <= code < 16, 'Expected SYSREG code')
    return ('USTAT1','USTAT2','MODE1','MMASK','MODE2','FLAGS','ASTATX','ASTATY',
            'STKYX','STKYY','IRPTL','IMASK','IMASKP','MODE1STK','USTAT3','USTAT4')[code]


def byte_direct(data):
    """Type14d, only nonexclusive zero-extended byte load/store (w/ex/l/x=0)."""
    require(len(data) == 6, 'Expected Type14d size')
    p,hi,lo = struct.unpack('<3H',data)
    require(p & 0xfef0 == 0x1a00, 'Unsupported Type14d variant')
    return bool(p & 0x100), p & 15, hi << 16 | lo


def frame_slot(index_delta=-96, zero_posts=6, final_post_words=35,
               store_delta=-228, returned_delta=-552):
    """Byte coordinates relative to the stack-builder's final I4 anchor."""
    stored = index_delta - 4*zero_posts + 4*final_post_words + store_delta
    return stored - returned_delta


def exact_float32(word):
    require(type(word) is int and 0 <= word <= 0x3f800001, 'Positive float32 scope')
    exponent = word >> 23
    mantissa = word & 0x7fffff
    if exponent:
        mantissa |= 0x800000
    shift = exponent-150 if exponent else -149
    return Fraction(mantissa << max(shift,0), 1 << max(-shift,0))


def cent_grid():
    rows, ambiguous = [], []
    for hundredths in range(1001):
        target = Fraction(hundredths,1000)  # proposed value/10, exactly
        word = bits(hundredths/1000)
        # Independently certify nearest-even float32 against exact rational
        # neighbors; this guards a double-rounding shortcut in the initial cast.
        distance = abs(exact_float32(word)-target)
        for neighbor in (word-1,word+1):
            if neighbor < 0:
                continue
            other = abs(exact_float32(neighbor)-target)
            require(distance < other or (distance == other and word % 2 == 0),
                    'Not the nearest-even float32 to the exact cent-grid target')
        modes = compare_modes(word)
        row = dict(display=f'{hundredths//100}.{hundredths%100:02}',
                   normalizedBits=hex(word),results=modes)
        rows.append(row)
        if len(set(modes.values())) > 1:
            ambiguous.append(row)
    return dict(policy='Proposed exact decimal 0.00..10.00 by 0.01, divided by 10 then rounded to nearest-even float32; not a recovered editor rule.',
                points=len(rows),modeIndependent=len(rows)-len(ambiguous),ambiguous=ambiguous,
                rationalNormalizationChecked=True,
                rowsSha256=sha(json.dumps(rows,sort_keys=True,separators=(',',':')).encode()),
                generatorPolicyEnabled=False)


def build(firmware):
    mem = BootMemory(unpack(firmware))
    manifest = json.loads(MANIFEST.read_text())
    require((manifest['firmwareSyxSha256'],manifest['firmwareLdrSha256']) ==
            (SYX_SHA,LDR_SHA),'Source drift')
    def code(a,n): return mem.read(visa_byte(a,n),n)
    for s in manifest['spans']:
        a,n = int(s['address'],16),s['size']
        raw = code(a,n) if s['source']=='visa' else mem.read(a,n)
        require(sha(raw)==s['sha256'],'Native span drift: '+s['name'])
    def imm(a,n=6): return immediate(code(a,n))
    for a,expected in [(0x82e14d,(12,0x82ded0)),(0x82e150,(8,0x809ce680)),
                       (0x82e153,(4,0x809cc940)),(0x830d94,(1,INIT_AND)),
                       (0x830d98,(1,INIT_OR))]:
        require(imm(a)==expected,'Task creation/initialization operand')
    require(mem.read(0x809ce680,9)==b'coreTask\0','Task name')
    for a,target in [(0x82e156,0x83254e),(0x8325ff,0x830d26),
                     (0x82e075,0x82959a),(0x82e082,0x82959a),
                     (0x82df4f,0x82c78a),(0x82c791,0x1c8aa2)]:
        require(instruction(code(a,6),0)==(0x1804<<32|target),'Task call target')
    require(register_move(code(0x830d90,4))==(2,0x72),'Initial MODE1 source')
    require(instruction(code(0x830d97,2),0,1)==0xcc21 and
            instruction(code(0x830d9b,2),0,1)==0xcd21,'Initial mask AND/OR')
    require(dm7(code(0x832612,4))==(True,3,0,-36),'Created stack pointer publication')
    delta = modify(code(0x830d52,6)); returned = modify(code(0x830d87,6))
    require(delta[:2]==(3,4) and returned[:2]==(5,4),'Frame index identities')
    require(imm(0x830d41,4)==(0x23,35),'Final initialization postmodifier')
    for a in (0x830d7d,0x830d7f,0x830d81,0x830d83,0x830d85,0x830d8a):
        require(instruction(code(a,4),0,2)==0x97c40000,'Zero store with M7 postmodifier')
    require(instruction(code(0x830d8e,4),0,2)==0x96c40000,'Zero store with M3 postmodifier')
    store = dm7(code(0x830da5,4))
    require(store[:3]==(True,3,2),'Initial MODE1 frame store')
    slot = frame_slot(delta[2],6,35,store[3],returned[2])
    restore_slot = 4+3*4+45*4+37*4  # empty loop/PC stacks, full task frame
    require(slot==restore_slot==344,'Initial/restore MODE1 frame coordinates differ')
    require(register_move(code(0x83081d,4))==(0x70,0x7d),'Save MODE1STK to USTAT1')
    require(bitop(code(0x83081f,6))==('clear',13,SAFE_CLEAR) and
            bitop(code(0x830822,6))==('set',13,INIT_OR),'Temporary scheduler mode')
    require(dm7(code(0x83083e,4))==(True,7,0x70,148),'Save original status word')
    require(dm7(code(0x830ae3,4))==(False,7,0x70,148),'Restore original status word')
    require(register_move(code(0x830c43,4))==(0x7d,0x70),'Restore MODE1STK, not MODE1')
    require(instruction(code(0x83082e,6),0)==0x171000000000 and
            instruction(code(0x830c40,6),0)==0x172000000000,'POP/PUSH STS')
    require(byte_direct(code(0x82df12,6))==(False,2,0x20085808),'Early-loop gate byte')
    require(byte_direct(code(0x8307a3,6))==(True,0,0x317bb6),'Task status byte store')
    require(INIT_OR & RND32 and not INIT_AND & (TRUNCATE|PEYEN) and
            not INIT_OR & (TRUNCATE|PEYEN),'Initial scalar 32-nearest invariant')
    require(SAFE_CLEAR & (TRUNCATE|PEYEN)==(TRUNCATE|PEYEN) and
            INIT_OR & RND32,'Scheduler safe-mode precision')
    return dict(schemaVersion=1,date='2026-10-22',productionVersion='0.3.13',
                sources={k:manifest[k] for k in ('firmwareSyxSha256','firmwareLdrSha256')},
                method='bounded static operands and frame coordinates; no scheduler/CPU execution',
                checkpointCount=len(manifest['spans']),
                task=dict(name='coreTask',entry='0x82ded0',controlBlock='0x809cc940',
                          creator='0x83254e',stackBuilder='0x830d26',
                          initialModeExpression='(creator MODE1 & 0xff1f1b00) | 0x01010000',
                          initialPrecision='32-nearest',initialScalarMode=True,
                          initialModeFrameByteOffset=slot),
                context=dict(registerCode='0x7d',sharcPlusName=system_register(13),
                             legacyDecoderLabel='LRPTL',save='0x83081d -> 0x83083e',
                             restore='0x830ae3 -> 0x830c43',
                             originalWordStoredSeparatelyFromSafeSchedulerMode=True,
                             wholeInterruptReturnPathProven=False),
                packetCalls=[dict(call='0x82e082',phase='early gate loop'),
                             dict(call='0x82e075',phase='normal work loop')],
                immediatePrePollHelper=dict(function='0x82c78a',modePreserving=True,
                                           callees=['0x1c8aa2','0x82c6e4']),
                openCallScope=dict(initializers=['0x82c228','0x82fe42','0x80f1ba','0x8289bc',
                                                 '0x825e21','0x8304ab','0x1c8b15'],
                                   loopCallees=['0x82b193','0x811a83','0x80ea77','0x82c97d'],
                                   indirectCall='0x82e05a via object+0x14c, op86/PID0x3fad',
                                   otherPacketOperationsAndPostStoreReturn=True,
                                   meaning='These are explicit unresolved transitive call scopes, not observed mode leaks.'),
                proposedCentGrid=cent_grid(),runtimeModeAtStoreProven=False,
                fullRangeEncodingProven=False,generatorWriteSupportAdded=False,
                newPhysicalExports=0,newReaDecompilation=False,
                nextStep='Prepare an offline in-memory preset byte-diff candidate for explicit mode-consensus inputs; keep 6.47 blocked. Resolve caller scope or use a known-float batch before supporting that ambiguous point; display-only dragging cannot distinguish it.')


if __name__ == '__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--firmware',type=Path,required=True)
    ap.add_argument('--write',action='store_true')
    args=ap.parse_args();result=build(args.firmware.read_bytes())
    if args.write:
        OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    else:
        require(json.loads(OUT.read_text())==result,'Stale scheduler audit')
    print(json.dumps({k:result[k] for k in ('checkpointCount','task','proposedCentGrid','runtimeModeAtStoreProven')}))

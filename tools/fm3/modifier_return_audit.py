#!/usr/bin/env python3
"""Hash-bound return-opcode corroboration, NOT an independent ISA oracle.

The SHARC+ manual's Type11c figure collides with its Type2c definition.
Legacy compact-return fields are a named hypothesis, checked against native
FM3 and independently published ADI code. Binary equality proves equality;
it does not turn this decoder into an assembler or an execution trace.
"""
import argparse
import json
import struct
from pathlib import Path

from global_scale_cache import immediate
from modifier_mode_audit import visa_byte, move_with_compute, bitop, RND32
from modifier_quantization_audit import DOC
from modifier_value_path_audit import BootMemory
from pitch_display import instruction, unpack, SYX_SHA, LDR_SHA
from six_field_resolution import require, sha

MANIFEST = DOC/'modifier-return-checkpoints.json'
OUT = DOC/'modifier-return-audit.json'


def compact_return_hypothesis(data):
    """Legacy Type11c fields, explicitly conditional for SHARC+.

    Restrict to documented unconditional, non-loop-return variants. Never
    accept c0xx/c1xx from the conflicting SHARC+ figure as a return opcode.
    """
    require(len(data) == 2, 'Expected one VISA parcel')
    v, = struct.unpack('<H', data)
    require(v & 0xfebe == 0x0abe and not v & 1,
            'Outside reviewed unconditional compact-return hypothesis')
    return dict(kind='RTI' if v & 0x100 else 'RTS',
                delayed=bool(v & 0x40), condition=31, loopReturn=False)


def short_add(data):
    """SHARC+ Fig14-5, Fig18-2 and short-compute opcode table (0000)."""
    require(len(data) == 2, 'Expected one short-compute parcel')
    v, = struct.unpack('<H', data)
    require(v & 0xff00 == 0xc000, 'Not short integer ADD')
    return dict(destination=v >> 4 & 15, left=v >> 4 & 15, right=v & 15)


def reviewed_delay_slots(address, data, sizes):
    """Require both following reviewed instructions, not two 16-bit parcels."""
    ret = compact_return_hypothesis(data)
    require(ret['delayed'], 'No delay area on this return')
    require(len(sizes) == 2 and all(type(n) is int and n in (2,4,6) for n in sizes),
            'Expected exactly two reviewed instructions')
    return [address+1, address+1+sizes[0]//2]


def cross_binary_equal(left, right, count):
    require(type(count) is int and count > 0 and len(left) == len(right) == count,
            'Cross-binary comparison must be complete')
    require(left == right, 'Independent binary span differs')
    return dict(bytes=count, sha256=sha(left))


def build(firmware, led, audio):
    m = json.loads(MANIFEST.read_text())
    require((m['firmwareSyxSha256'],m['firmwareLdrSha256']) == (SYX_SHA,LDR_SHA),
            'Firmware identity drift')
    require(sha(firmware) == SYX_SHA, 'Wrong firmware')
    inputs = {'fm3':BootMemory(unpack(firmware))}
    for name,data in [('adiLed',led),('adiAudio',audio)]:
        source = m['sources'][name]
        require(len(data) == source['size'] and sha(data) == source['sha256'],
                'Wrong independent source: '+name)
        inputs[name] = BootMemory(data)
    def code(source, at, size):
        return inputs[source].read(visa_byte(at,size),size)
    for s in m['spans']:
        require(sha(code(s['source'],int(s['address'],16),s['size'])) == s['sha256'],
                'Pinned span changed: '+s['name'])

    # These are actual instruction boundaries selected by review. A scan for
    # fe0a also finds immediate operands; raw hit counts are NOT instruction counts.
    returns = []
    for row in m['returnSites']:
        at = int(row['address'],16)
        data = code(row['source'],at,2)
        got = compact_return_hypothesis(data)
        require(got['kind'] == row['kind'] and got['delayed'] == row['delayed'],
                'Return-site field mismatch')
        slots = reviewed_delay_slots(at,data,row['delaySizes']) if got['delayed'] else []
        returns.append(dict(source=row['source'],at=hex(at),
                            opcode=hex(instruction(data,0,1)),
                            hypothesis=got,delaySlots=[hex(a) for a in slots]))

    # Exact full span, not a match of a return opcode in isolation.
    epilogue = cross_binary_equal(code('fm3',0x1cbbe6,86),
                                  code('adiLed',0x1c0427,86),86)
    division = cross_binary_equal(code('fm3',0x1cb13a,80),
                                  code('adiAudio',0x1c01fc,80),80)
    require(code('fm3',0x1cb13a,158) != code('adiAudio',0x1c01fc,158),
            'Do not claim the whole division helper is identical')

    # Independent ADI division uses a 48-bit delayed return. It corroborates
    # the restoration convention, not the compact return's instruction identity.
    require(bitop(code('adiAudio',0x1c01fc,6)) == ('test',2,RND32), 'ADI BTF save')
    require(bitop(code('adiAudio',0x1c01ff,6)) == ('clear',2,RND32), 'ADI RND32 clear')
    require(move_with_compute(code('adiAudio',0x1c0233,6)) == (1,0x72), 'ADI save')
    require(instruction(code('adiAudio',0x1c0236,6),0) == 0x023e00301081, 'ADI R8 BSET')
    require(instruction(code('adiAudio',0x1c0239,6),0) == 0x0a3e04081424, 'ADI Type11a')
    require(move_with_compute(code('adiAudio',0x1c023c,6)) == (0x72,8), 'ADI restore')

    # Native constants link the new dispatcher to the already located callback
    # table. They do not prove its dynamic contents or the active interrupt vector.
    for at,expected in [(0x1cbba6,(12,0x2e4920)),
                        (0x1cbbb5,(0x64,0x1cbbe6)),
                        (0x1cbbb8,(12,0x2e4b28))]:
        require(immediate(code('fm3',at,6)) == expected, 'Dispatcher link changed')
    require(short_add(code('fm3',0x1cbbc3,2)) ==
            dict(destination=12,left=12,right=8), 'Callback address addition')
    require(instruction(code('fm3',0x1cbbce,4),0,2) == 0x98283200, 'PCSTK target load')
    require(instruction(code('fm3',0x1cbbe1,4),0,2) == 0x98280601, 'Callback argument delay load')
    require(move_with_compute(code('fm3',0x1cb17b,6)) == (0x72,1), 'FM3 MODE1 restore')
    require(instruction(code('fm3',0x1cb17e,2),0,1) == 1, 'FM3 second delay slot')

    collision = []
    for value in (0xc080,0xc0be,0xc0fe):
        collision.append(dict(opcode=hex(value),shortAdd=short_add(struct.pack('<H',value))))
    return dict(schemaVersion=1,date='2026-10-22',productionVersion='0.3.13',
                method='Independent ADI binary comparison, official-manual consistency check, bounded native operands; no CPU execution or new REA decompilation.',
                checkpointCount=len(m['spans']),
                manual=dict(type11cFigureConflictsWithType2c=True,
                            proposedTypoCorrection='0xc080 -> 0x0a80',
                            proposedCorrectionOfficiallyConfirmed=False,
                            collisionExamples=collision),
                returnSites=returns,
                exactInterruptEpilogueMatch=epilogue,
                exactDivisionPrefixMatch=division,
                wholeDivisionHelpersIdentical=False,
                adiDivisionRestore=dict(returnAt='0x1c0239',encodingBits=48,
                                        restoreAt='0x1c023c',sourceRegister='R8',
                                        provesFm3CompactOpcode=False),
                dispatcher=dict(entry='0x1cbb7f',continuation='0x1cbbe6',
                                callbackTable='0x2e4b28',mapTable='0x2e4920',
                                callbackTransfer='0x1cbbe0',finalReturn='0x1cbc0c',
                                finalReturnCandidateLocated=True,
                                activeVectorAndAllRuntimeRegistrationsProven=False),
                compactReturnInterpretation='strongly-corroborated-static-hypothesis',
                independentAssemblerOrExecutionWitnessObtained=False,
                divisionNativeReturnSemanticsProven=False,
                wholeInterruptReturnPathProven=False,runtimeModeAtStoreProven=False,
                fullRangeEncodingProven=False,generatorWriteSupportAdded=False,
                newPhysicalExports=0,newReaDecompilation=False,
                nextStep='Trace the existing interrupt vector to 0x1cbb7f and the known callback/MODE1STK path. Seek an independent SHARC+ assembler listing or corrected opcode table for final compact-opcode confirmation; no preset export required.')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    for arg in ('firmware','adi-led','adi-audio'):
        ap.add_argument('--'+arg,type=Path,required=True)
    ap.add_argument('--write',action='store_true')
    args = ap.parse_args()
    result = build(args.firmware.read_bytes(),args.adi_led.read_bytes(),args.adi_audio.read_bytes())
    if args.write:
        OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    else:
        require(json.loads(OUT.read_text()) == result, 'Stale return audit')
    print(json.dumps({k:result[k] for k in ('checkpointCount','exactInterruptEpilogueMatch',
                                         'exactDivisionPrefixMatch','compactReturnInterpretation',
                                         'generatorWriteSupportAdded')}))

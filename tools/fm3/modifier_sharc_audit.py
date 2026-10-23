#!/usr/bin/env python3
"""Bounded FW13 MOD writer audit. Research only; never emit a preset or MIDI.

Requires the pinned owner-supplied binaries. Hash checkpoints preserve the
reviewed regions without redistributing native bytes. Selected operand checks
are independent of the exploratory SLEIGH decoder, not a complete CPU emulator.
"""
import argparse
import json
import math
from pathlib import Path
import struct

from global_scale_cache import immediate, modify, dm7, register_move
from modifier_value_path_audit import BootMemory, BASE
from modifier_quantization_audit import EDITOR_SHA, DOC, build as corpus, f32
from pitch_display import unpack, SYX_SHA, LDR_SHA, instruction
from six_field_resolution import require, sha

MANIFEST = DOC / 'modifier-sharc-checkpoints.json'
OUT = DOC / 'modifier-sharc-audit.json'


def indirect_jump(data):
    """SHARC+ VISA Type 9b, unconditional indirect JUMP, no LA/CI/call."""
    require(len(data) == 4, 'Type 9b size')
    p, q = struct.unpack('<HH', data)
    require(p & 0xfffe == 0x083e and not q & 0x03c0 and q & 0x3f == 0x3f,
            'Unsupported Type 9b branch')
    return (8 + (q >> 11 & 7), 8 + ((p & 1) << 2 | q >> 14 & 3), bool(q & 0x400))


def memory_move(data):
    """SHARC+ Type 3b unconditional DM transfer; byte/short/normal widths."""
    require(len(data) == 4, 'Type 3b size')
    p, q = struct.unpack('<HH', data)
    require(p >> 13 == 2 and (p >> 1) & 31 == 31 and not p & 1
            and q & 0x7c == 0x3c, 'Unsupported Type 3b transfer')
    l, x, w = q >> 14 & 1, q & 1, q >> 1 & 1
    require(not w or (x and not l), 'Unsupported width')
    return {'store': bool(q & 0x8000), 'index': p >> 9 & 7,
            'modifier': p >> 6 & 7, 'postmodify': bool(p & 0x1000),
            'register': q >> 7 & 127, 'width': 4 if w else 2 if l else 1,
            'signExtend': bool(x and not w)}


def physical_model(value, lo=0.0, hi=1.0):
    """Diagnostic float32 model, NOT a bit-exact general RECIPS emulation."""
    require(all(math.isfinite(v) for v in (value, lo, hi)) and hi > lo,
            'Finite nonempty range required')
    n = f32(f32(f32(value)-f32(lo)) / f32(f32(hi)-f32(lo)))
    return min(65534, max(0, math.trunc(f32(f32(n*65534)+0.5))))


def check(editor, firmware):
    require(sha(editor) == EDITOR_SHA, 'Wrong editor')
    mem = BootMemory(unpack(firmware))
    manifest = json.loads(MANIFEST.read_text())
    require((manifest['editorSha256'], manifest['firmwareSyxSha256'],
             manifest['firmwareLdrSha256']) == (EDITOR_SHA, SYX_SHA, LDR_SHA), 'Source drift')
    def visa(a, n): return mem.read(0x80a00000+(a-0x800000)*2, n)
    for s in manifest['spans']:
        a, n = int(s['address'],16), s['size']
        b = (editor[a-BASE:a-BASE+n] if s['source'] == 'editor' else
             visa(a,n) if s['source'] == 'visa' else mem.read(a,n))
        require(len(b) == n and sha(b) == s['sha256'], 'Span drift: '+s['name'])
    def words(a,n): return list(struct.unpack('<'+'I'*n, mem.read(a,n*4)))
    def imm(a,n=6): return immediate(visa(a,n))
    def call(a,target):
        require(instruction(visa(a,6),0) == (0x1804 << 32 | target), 'Call drift')

    # ABI modifier constants are visible in the firmware startup fragment.
    mods = dict(immediate(visa(a,4)) for a in range(0x8343a6,0x8343b0,2))
    require(mods == {0x27:-1,0x2e:1,0x26:1,0x2d:0,0x25:0}, 'Modifier constants')
    require(imm(0x813e08) == (1,0x8090cd38) and mem.read(0x8090cd38,4) == b'MOD\0', 'MOD name')
    require(imm(0x813e16,4) == (8,3), 'MOD family')
    require(modify(visa(0x813e22,6)) == (5,5,0x135), 'MOD object base')
    post = memory_move(visa(0x813e25,4))
    require(post['store'] and post['index'] == 5 and post['modifier'] == 7
            and post['postmodify'] and post['width'] == 1, 'MOD postmodify')
    object_offset = 0x135 + mods[0x27]
    require(imm(0x813e4e) == (0x1b,0x813f86) and
            dm7(visa(0x813e61,4)) == (True,5,0x1b,24), 'MOD callback publication')
    require(object_offset+24 == 0x14c, 'Callback field')
    require(imm(0x813e51) == (0x1e,0x8090c290) and
            dm7(visa(0x813e63,4)) == (True,5,0x1e,48), 'MOD descriptors')
    require(imm(0x813e54,4) == (0x1f,25), 'MOD parameter count')
    require(imm(0x813fb8) == (12,0x8090c290), 'Callback definition argument')
    call(0x813fbb,0x8244fb)
    call(0x814220,0x823ae7); call(0x81427c,0x823ae7)
    pid_table = words(0x282e6220,9)
    min_types, max_types = words(0x282e61e8,14), words(0x282e61b0,14)
    require(pid_table[:2] == [0x8141fa,0x814256], 'Min/Max PID switch')
    require(min_types[2] == 0x81420e and max_types[2] == 0x81426a, 'Type 3 branch')
    mod_defs = [words(0x8090c290+36*i,9) for i in range(25)]
    require(all(mod_defs[i][:4] == [0,0,0,0] and mod_defs[i][5:8] == [0,0,0]
                for i in (1,2)), 'Static MOD Min/Max placeholders')
    wah = words(0x809aa530+5*36,9)
    require(wah == [1080,50,0,0x3f800000,0,0x41200000,0x3a83126f,0,1], 'WAH PID5 descriptor')
    require(words(0x809aa290,4) == [94,95,96,97] and
            imm(0x822c76,4) == (8,20), 'WAH family/IDs')
    require(imm(0x822cae) == (0x1b,0x809aa530) and
            dm7(visa(0x822ccb,4)) == (True,4,0x1b,48), 'WAH descriptor publication')

    # The indirect jump executes BOTH following instructions before branching.
    require(words(0x282e75f8,5) == [0x823b88,0x823bfe,0x823c03,0x823c08,0x823c12],
            'Operation 9..13 table')
    require(indirect_jump(visa(0x823bf8,4)) == (13,12,True), 'Delayed operation dispatch')
    require(register_move(visa(0x823bfa,4)) == (2,0x26), 'Delay slot R2=M6')
    slot = memory_move(visa(0x823bfc,4))
    require(slot == dict(store=False,index=6,modifier=6,postmodify=False,
                         register=0,width=4,signExtend=False), 'Delay slot input load')
    store = memory_move(visa(0x823bb4,4))
    require(store == dict(store=True,index=5,modifier=5,postmodify=False,
                          register=2,width=2,signExtend=False), 'Actual uint16 store')
    require(imm(0x823b93) == (12,0x477ffe00) and
            imm(0x823b51) == (5,0x3f000000), 'Scale and half constants')
    require(imm(0x823ba6) == (2,65534), 'Clamp upper bound')
    require(imm(0x823b23) == (15,0x37800100), 'Raw decode reciprocal')

    event = editor[0x536a00:0x536a09]
    event_targets = {str(i+2):hex(0x100179a24+4*v) for i,v in enumerate(event)}
    require(event_targets['10'] == '0x100179ae4' and
            '0x100179a24' in event_targets.values(), 'Editor event paths')
    # MOV W8,#0x52 and FDIV S0,S0,S1 in the rotary branch.
    require(struct.unpack_from('<I',editor,0x17ae0c)[0] == 0x52800a48 and
            struct.unpack_from('<I',editor,0x17ae30)[0] == 0x1e211800, 'Normalized editor path')
    data = corpus()
    points = []
    for p in data['points']:
        if p['pid'] not in (1,2): continue
        v, raw = p['requestedTarget'], p['raw']
        candidates = [r for r in range(65535) if v-.005 <= r*10/65534 < v+.005]
        points.append(dict(field=p['field'],display=v,raw=raw,
                           physicalInputModel=physical_model(v/10),
                           rawImpliedNormalized=raw/65534,rawImpliedDisplay=raw*10/65534,
                           idealDisplayBinCodes=[candidates[0],candidates[-1]],
                           idealDisplayBinCount=len(candidates)))
    return dict(schemaVersion=1,date='2026-10-22',mode='bounded-static-research',
                productionVersion='0.3.13',newPhysicalExports=0,deviceIO=False,
                checkpointCount=len(manifest['spans']),sources={k:manifest[k] for k in
                    ('editorSha256','firmwareSyxSha256','firmwareLdrSha256')},
                modCallback='0x813f86',callbackField='object+0x14c',
                targetDescriptorField='object+0x1fc',targetLookup='sharedRegistry[targetEffect].descriptors + targetPID * 36',
                wahControl=dict(family=20,pid=5,type=50,low=0,high=1,multiplier=10,step=f32(.001)),
                minHelper='0x814220 -> 0x823ae7',maxHelper='0x81427c -> 0x823ae7',
                uint16Store='0x823bb4',op9DelaySlots=['R2=M6 (1)','R0=DM(M6,I6) (input float)'],
                editorEventTargets=event_targets,
                inputPaths=dict(op9='text getter / nonzero metadata multiplier',
                                op82='(current angle - lower angle) / (upper angle - lower angle)'),
                minMaxComparison=points,exactRequestedInputMatches=sum(p['raw']==p['physicalInputModel'] for p in points),
                generatorWriteSupport=False,fullRangeEncodingProven=False,
                historicalOperationAndInputKnown=False,armToSharcTransportFullyTraced=False,
                editorDynamicMultiplierProducerResolved=False,
                reaNewDecompilation=False,
                limits=['Selected static code and operand checks; not full firmware execution.',
                        'Diagnostic model uses float32 division, not general SHARC RECIPS/40-bit emulation.',
                        'Display bins assume ideal decimal rounding; not a replay of the native formatter.',
                        'Raw-implied inputs are inverse compatibility calculations, not independent measured inputs.',
                        'Jump-table boot aliases checked at explicit coordinates; not a generic address-space emulator.'])


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--editor', type=Path, required=True)
    ap.add_argument('--firmware', type=Path, required=True)
    ap.add_argument('--write', action='store_true')
    a = ap.parse_args()
    result = check(a.editor.read_bytes(),a.firmware.read_bytes())
    if a.write: OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    else: require(json.loads(OUT.read_text()) == result, 'Stale SHARC report')
    print(json.dumps({k:result[k] for k in ('checkpointCount','exactRequestedInputMatches','generatorWriteSupport')}))


if __name__ == '__main__': main()

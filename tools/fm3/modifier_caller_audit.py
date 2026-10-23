#!/usr/bin/env python3
"""Bounded MODE1 caller certificate. No CPU emulation, device I/O or presets.

Hashes bind reviewed instruction partitions/negative inventories. Independent
operand decoders bind control flow and the MODE1 slice; a symbolic graph checks
every branch alternative, including exceptional math paths and delay slots.
This does not establish whole-program reachability or the live runtime mode.
"""
import argparse
import json
from pathlib import Path
import struct

from global_scale_cache import immediate, dm7, register_move, signed, modify
from modifier_mode_audit import visa_byte, bitop, ALL
from modifier_quantization_audit import DOC
from modifier_sharc_audit import indirect_jump, memory_move
from modifier_value_path_audit import BootMemory
from pitch_display import instruction, unpack, SYX_SHA, LDR_SHA
from six_field_resolution import require, sha

MANIFEST = DOC/'modifier-caller-checkpoints.json'
OUT = DOC/'modifier-caller-audit.json'


def subword_immediate(data):
    """SHARC+ VISA Type4b, BW/SW (optionally sign-extending loads), §14-31/32.

    Returns the encoded modifier, not a guessed normal-word byte displacement.
    Compute-bearing Type4a and normal/long/exclusive forms are not accepted.
    """
    require(len(data) == 4, 'Expected Type4b size')
    p, q = struct.unpack('<2H', data)
    require(p >> 13 == 3 and q & 0x78 == 0x38 and not q & 2,
            'Unsupported Type4b subword variant')
    store = bool(p & 0x80)
    require(not store or not q & 1, 'Sign extension on a store')
    return dict(condition=(p >> 1) & 31, store=store, programMemory=bool(p & 0x100),
                index=((p >> 9) & 7)+(8 if p & 0x100 else 0),
                postmodify=bool(p & 0x40), register=(q >> 7) & 15,
                modifier=signed(((p & 1) << 5)|(q >> 11), 6),
                width=2 if q & 4 else 1, signExtend=bool(q & 1))


def direct_subword(data):
    """Bounded Type14d BW/SW zero-extending DM load/store, §16-5/6."""
    require(len(data) == 6, 'Expected Type14d size')
    p, hi, lo = struct.unpack('<3H', data)
    require(p & 0xfeb0 == 0x1a00, 'Unsupported Type14d variant')
    return dict(store=bool(p & 0x100), register=p & 15,
                width=2 if p & 0x40 else 1, address=hi << 16 | lo)


def direct_control(data, address):
    """Type8 absolute/relative JUMP/CALL, no ELSE/LA/CI; delay flag retained."""
    require(len(data) == 6, 'Expected Type8 size')
    v = instruction(data, 0); p = v >> 32
    require(p & 0xfe41 == 0x0600 and v & 0xff000000 in (0, 1 << 26),
            'Unsupported Type8 variant')
    target = address + signed(v & 0xffffff, 24) if p & 0x100 else v & 0xffffff
    return dict(condition=(p >> 1) & 31, call=bool(p & 0x80), target=target,
                delayed=bool(v & (1 << 26)))


def register_loop(data, address):
    """SHARC+ Type12a_ureg, §15-24/25: bit23 is mode, displacement is signed23.

    Legacy SHARC214xx's signed24 interpretation incorrectly makes an F1 loop
    jump far backwards. No immediate-counter/conditional-loop forms accepted.
    """
    require(len(data) == 6, 'Expected Type12a_ureg size')
    v = instruction(data, 0); p = v >> 32
    require(p & 0xff80 == 0x0d00 and not v & 0xff000000,
            'Unsupported Type12a_ureg variant')
    return dict(counter=p & 127, target=address+signed(v & 0x7fffff, 23),
                modeF1=bool(v & (1 << 23)))


def prove_graph(nodes, entry):
    """Universal bit-mask proof on a reviewed semantic slice, not native execution.

    MODE1 and its saved copies are (input & keep) | force. R12 is tracked only
    while carrying the saved word. Arithmetic writes/calls invalidate that token.
    Both sides of every condition are included; no numerical assumptions used.
    """
    require(entry in nodes, 'Missing graph entry')
    todo = [(entry, (ALL, 0), None, None)]; seen = set(); returns = set()
    for node in nodes.values():
        require(node['successors'] or node.get('return'), 'Open graph endpoint')
        require(not (node.get('return') and node['successors']), 'Return with successors')
        require(all(s in nodes for s in node['successors']), 'Missing successor')
    while todo:
        state = todo.pop()
        if state in seen:
            continue
        seen.add(state)
        require(len(seen) < 10000, 'Symbolic state bound exceeded')
        at, mode, saved, r12 = state
        node = nodes[at]
        for action in node['actions']:
            if action == 'save':
                saved = mode
            elif action == 'set':
                mode = (mode[0] & ~0x2000, mode[1] | 0x2000)
            elif action == 'load':
                require(saved is not None, 'Saved MODE1 unavailable')
                r12 = saved
            elif action == 'restore':
                require(r12 is not None, 'MODE1 restore from untracked R12')
                mode = r12
            elif action == 'clobber':
                r12 = None
            else:
                raise ValueError('Unknown semantic action')
        if node.get('return'):
            require(mode == (ALL, 0), 'Return does not preserve every incoming MODE1 word')
            returns.add(at)
        todo.extend((nxt, mode, saved, r12) for nxt in node['successors'])
    require(returns, 'No reachable return')
    return dict(visitedStates=len(seen), returns=[hex(a) for a in sorted(returns)],
                preservesEveryIncomingMode1Word=True,
                scope='Reviewed graph including both branch alternatives; scalar ABI and ordinary memory/return behavior; asynchronous faults/interrupt effects excluded.')


def reviewed_graph(code, witness, certified_callees):
    """Turn a hash-bound instruction partition into independently checked edges."""
    rows = {int(row['at'], 16): row for row in witness}
    require(len(rows) == len(witness), 'Duplicate instruction boundary')
    cursor = 0x833c86
    for a, row in sorted(rows.items()):
        require(a == cursor and row['size'] in (2, 4, 6), 'Partition gap/overlap')
        cursor += row['size']//2
    require(cursor == 0x833e0e, 'Incomplete reviewed function partition')
    required_actions = {0x833ca8:'save',0x833caa:'set',0x833dab:'load',
                        0x833dd9:'load',0x833db5:'restore'}
    require({a:row['action'] for a,row in rows.items()
             if row.get('action') in ('save','set','load','restore')} == required_actions,
            'MODE1 witness action drift')
    result = {}
    for a, row in rows.items():
        n = row['size']; raw = code(a, n); nxt = a+n//2
        actions = [row['action']] if 'action' in row else []
        flow = row.get('flow'); ctl = None; delayed = False
        try:
            observed_control = direct_control(raw, a)
        except ValueError:
            observed_control = None
        if observed_control:
            require(flow == ('call' if observed_control['call'] else 'branch'),
                    'Omitted/mislabeled native control transfer')
        if n == 4:
            try:
                observed_indirect = indirect_jump(raw)
            except ValueError:
                observed_indirect = None
            if observed_indirect:
                require(flow == 'return' and observed_indirect == (14,12,True),
                        'Unmodeled indirect transfer')
        if flow in ('call', 'branch'):
            ctl = direct_control(raw, a)
            require(ctl['call'] == (flow == 'call'), 'Control kind mismatch')
            delayed = ctl['delayed']
        elif flow == 'return':
            require(indirect_jump(raw) == (14, 12, True), 'Unexpected ABI return')
            delayed = True
        else:
            require(flow is None, 'Unknown flow marker')
        if delayed:
            for _ in range(2):
                require(nxt in rows and 'flow' not in rows[nxt], 'Missing/unsupported delay slot')
                delay = rows[nxt]
                if 'action' in delay:
                    actions.append(delay['action'])
                nxt += delay['size']//2
        if flow == 'call':
            require(ctl['target'] in certified_callees, 'Unproved callee effect')
            actions.append('clobber')
            successors = [nxt]
        elif flow == 'branch':
            successors = [ctl['target']]+([] if ctl['condition'] == 31 else [nxt])
        elif flow == 'return':
            successors = []
        else:
            successors = [nxt]
        # Delay slots are bundled above. They need no outgoing edge when reached
        # only by that branch; the final slot lies at the function boundary.
        result[a] = dict(actions=actions, successors=successors, **({'return': True} if flow == 'return' else {}))
    # Keep only actual control-flow starts, so a return's delay slots cannot
    # accidentally fall through into the next function in the proof graph.
    reachable = set(); work = [0x833c86]
    while work:
        a = work.pop()
        if a in reachable:
            continue
        require(a in result, 'Graph leaves reviewed function')
        reachable.add(a); work += result[a]['successors']
    return {a: result[a] for a in reachable}


def build(firmware):
    mem = BootMemory(unpack(firmware)); manifest = json.loads(MANIFEST.read_text())
    require((manifest['firmwareSyxSha256'], manifest['firmwareLdrSha256']) ==
            (SYX_SHA, LDR_SHA), 'Source identity drift')
    def code(a, n): return mem.read(visa_byte(a, n), n)
    for span in manifest['spans']:
        require(sha(code(int(span['address'],16),span['size'])) == span['sha256'],
                'Native span drift: '+span['name'])
    # Scalar ABI constants M7=-1, M14=1, M6=1, M13=0, M5=0 were independently
    # pinned in modifier_sharc_audit; check again because stack coordinates use them.
    modifiers = dict(immediate(code(a,4)) for a in range(0x8343a6,0x8343b0,2))
    require(modifiers ==
            {0x27:-1,0x2e:1,0x26:1,0x2d:0,0x25:0}, 'ABI modifier constants')
    save = memory_move(code(0x833ca8,4))
    require(save == dict(store=True,index=7,modifier=7,postmodify=True,
                         register=0x72,width=4,signExtend=False), 'MODE1 stack save')
    require(bitop(code(0x833caa,6)) == ('set',2,0x2000), 'Temporary MODE1 mask')
    for a in (0x833dab,0x833dd9):
        require(dm7(code(a,4)) == (False,7,12,4), 'Saved MODE1 reload')
    require(register_move(code(0x833db5,4)) == (0x72,12), 'MODE1 restore register')
    post_delta = modifiers[0x20+save['modifier']] * save['width']
    load_delta = dm7(code(0x833dab,4))[3]
    require(post_delta + load_delta == 0, 'Stack save/load coordinate')
    graph = reviewed_graph(code,manifest['powInstructionWitness'],{0x833522})
    proof = prove_graph(graph,0x833c86)
    clear_loop = register_loop(code(0x1c0b20,6),0x1c0b20)
    require(clear_loop == dict(counter=12,target=0x1c0b26,modeF1=True),
            'Clear-buffer loop leaves reviewed pair of stores')
    require(indirect_jump(code(0x1c0b2d,4)) == (14,12,True), 'Clear-buffer ABI return')
    calls = [(0x825e2d,0x833c86),(0x825e3b,0x833c86),
             (0x82c9a1,0x1c0b10),(0x82c9b8,0x1c0b10),
             (0x80f717,0x82b0dc),(0x80f72d,0x82b0dc),
             (0x80f73e,0x82b116),(0x82b169,0x1c8aa2),
             (0x82b1a2,0x1c8aa2),(0x82b200,0x1c8aa2),
             (0x830e4b,0x8337e2),(0x830e1a,0x8337e2)]
    for a, target in calls:
        require(instruction(code(a,6),0) == (0x1804 << 32 | target), 'Call link drift')
    # Timer table: post-indexed byte load advances I5 by 28; callback read is
    # DM(M7,I5), a normal-word premodifier -4 => row+24. Setter writes row+24 too.
    field = subword_immediate(code(0x82b1c4,4))
    require(field == dict(condition=31,store=False,programMemory=False,index=5,
                          postmodify=True,register=2,modifier=28,width=1,signExtend=False),
            'Timer table byte stride')
    require(memory_move(code(0x82b1cb,4)) == dict(store=False,index=5,modifier=7,
            postmodify=False,register=2,width=4,signExtend=False), 'Timer callback load')
    require(indirect_jump(code(0x82b1ed,4)) == (13,12,True), 'Timer indirect call')
    require(register_move(code(0x82b1e3,4)) == (0x1c,2), 'Timer callback register')
    require(immediate(code(0x82b1bf,6)) == (0x15,0x809cb110) and
            immediate(code(0x82b134,6)) == (0x14,0x809cb110), 'Timer table base')
    require(modify(code(0x82b142,6)) == (5,4,24), 'Setter table field base')
    require(dm7(code(0x82b15d,4)) == (True,5,9,-28), 'Setter callback field')
    require(immediate(code(0x80f73b,6)) == (4,0x80f710), 'Known callback argument')
    require(dm7(code(0x82b0f0,4)) == (True,4,0x2d,24), 'Cancellation callback clear')
    require(mem.read(0x809cb110,112) == bytes(112), 'Initial timer table is not zero')
    sw = direct_subword(code(0x80ea90,6))
    require(sw == dict(store=False,register=13,width=2,address=0xc183931c), 'Direct SW operand')
    require(subword_immediate(code(0x80eaa6,4)) == dict(condition=31,store=True,
            programMemory=False,index=6,postmodify=False,register=2,modifier=-3,
            width=2,signExtend=False), 'Indexed SW operand')
    # Pin the compact parcel, whose RTS label comes from the legacy decoder.
    # The SHARC+ manual's Type11c figure needs reconciliation; do not promote
    # this label to an independently proved RTI/RTS distinction.
    require(register_move(code(0x830c43,4)) == (0x7d,0x70), 'MODE1STK target')
    require(instruction(code(0x830c8c,2),0,1) == 0x0abe and
            instruction(code(0x8307bb,2),0,1) == 0x0abe, 'Compact return parcel drift')
    require(direct_control(code(0x8307ae,6),0x8307ae)['target'] == 0x830a1b,
            'Context restore call')
    for a, value in [(0x830e43,0x830778),(0x830e13,0x830cb4)]:
        require(immediate(code(a,6)) == (8,value), 'Registered interrupt handler')
    simd=[]
    for a, op in [(0x82c2b7,'set'),(0x82c2eb,'clear'),(0x82c30c,'set'),(0x82c315,'clear')]:
        require(bitop(code(a,6)) == (op,2,0x200000), 'SIMD mask changed')
        simd.append(dict(at=hex(a),operation=op,mask='0x200000'))
    return dict(schemaVersion=1,date='2026-10-22',productionVersion='0.3.13',
        sources={k:manifest[k] for k in ('firmwareSyxSha256','firmwareLdrSha256')},
        method='Hash-bound manual path review, independent operands, symbolic MODE1 graph; not CPU emulation',
        checkpointCount=len(manifest['spans']),instructionPartitionCount=len(manifest['powInstructionWitness']),
        powRestore=proof,
        clearLoop=dict(at='0x1c0b20',counter='R12',start='0x1c0b23',
                       end=hex(clear_loop['target']),modeF1=clear_loop['modeF1'],
                       displacementBits=23,legacySigned24TargetRejected=True),
        closedCallerScopes=[dict(entry='0x825e21',callees=['0x833c86','0x833522'],
                                result='MODE1 preserved on reviewed returning scalar-ABI paths'),
                            dict(entry='0x82c97d',callees=['0x1c0b10'],
                                result='No MODE1 writes/calls beyond the reviewed leaf')],
        timer=dict(table='0x809cb110',entries=4,strideBytes=28,callbackByteOffset=24,
                   registration='0x80f729 -> 0x82b116',registeredCallback='0x80f710',
                   indirectCall='0x82b1ed',callbackCancelsVia='0x82b0dc',
                   knownCallbackRouteModePreserving=True,allRuntimeRegistrationsProven=False,
                   initialTableZero=True,
                   limit='One identified registration route; zero boot contents do not prove all runtime pointers or exclude alternate writers/registrations.'),
        interrupt=dict(restoreTail='0x830c43 MODE1STK -> 0x830c8c compact return',
                       schedulerHandler='0x830778 -> CALL 0x830a1b -> 0x8307bb compact return',
                       observedReturnParcel='0x0abe',legacyDecoderLabel='RTS',
                       compactReturnEncodingIndependentlyReconciled=False,
                       registeredAt='0x830e43 -> 0x830e4b/0x8337e2',
                       timerHandler='0x830cb4 registered at 0x830e13 -> 0x830e1a/0x8337e2',
                       finalRtiWrapperLocated=False,wholeInterruptReturnPathProven=False),
        selectedSimdWrites=simd,
        unresolved=dict(initializers=['0x82c228','0x82fe42','0x80f1ba','0x8289bc','0x8304ab','0x1c8b15'],
                        loopCallees=['0x82b193 except identified callback route','0x811a83','0x80ea77'],
                        effectCallback='0x82e05a object+0x14c, op86/PID0x3fad',
                        priorPacketOperationsAndPostStoreReturn=True,interruptWrapper=True),
        runtimeModeAtStoreProven=False,fullRangeEncodingProven=False,generatorWriteSupportAdded=False,
        newPhysicalExports=0,newReaDecompilation=False,
        nextStep='Specialize 0x80ea77 -> 0x80f751 to known op10/PID0x3a16 and resolve the scheduler interrupt dispatch/return wrapper; retain 6.47 exclusion.')


if __name__ == '__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--firmware',type=Path,required=True)
    ap.add_argument('--write',action='store_true')
    args=ap.parse_args(); result=build(args.firmware.read_bytes())
    if args.write:
        OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    else:
        require(json.loads(OUT.read_text()) == result,'Stale caller audit')
    print(json.dumps({k:result[k] for k in ('checkpointCount','powRestore','closedCallerScopes','runtimeModeAtStoreProven')}))

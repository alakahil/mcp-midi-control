#!/usr/bin/env python3
"""Bounded SECI vector/registration/status-return bridge; no runtime execution.

This proves native operands and a conditional status-stack model. It inherits
the explicit compact-return hypothesis from modifier_return_audit, and does
not certify interrupt nesting, all registrations, or a live MODE1 invariant.
"""
import argparse
import json
import struct
from pathlib import Path

from global_scale_cache import immediate, dm7, register_move, signed
from modifier_caller_audit import direct_control, subword_immediate
from modifier_mode_audit import visa_byte, bitop
from modifier_return_audit import compact_return_hypothesis, reviewed_delay_slots
from modifier_sharc_audit import memory_move
from modifier_value_path_audit import BootMemory
from pitch_display import instruction, unpack, SYX_SHA, LDR_SHA
from six_field_resolution import require, sha

DOC = Path(__file__).resolve().parents[2]/'docs/fm3/parameter-evidence'
MANIFEST = DOC/'modifier-interrupt-checkpoints.json'
OUT = DOC/'modifier-interrupt-audit.json'


def l2_visa_byte(address, size):
    """SC58x datasheet Rev C, Table5: L2 RAM VISA BA0000..BBFFFF."""
    require(type(address) is int and type(size) is int and size > 0 and size % 2 == 0,
            'Whole VISA parcels required')
    require(0xba0000 <= address < address+size//2 <= 0xbc0000,
            'Outside bounded L2 RAM VISA space')
    return 0x20080000+2*(address-0xba0000)


def isa_to_visa(data):
    """Packed ISA is a little-endian 48-bit word; VISA has high parcel first.

    This changes serialization for the operand readers, not execution mode or
    instruction addresses. Never apply the VISA parcel decoder to packed ISA.
    """
    require(len(data) == 6, 'Expected one packed ISA instruction')
    v = int.from_bytes(data,'little')
    return struct.pack('<3H',v >> 32,(v >> 16) & 65535,v & 65535)


def immediate_loop(data, address):
    """SHARC+ Type12a_imm, Fig15-7: mode bit23 is NOT a displacement sign."""
    require(len(data) == 6, 'Expected Type12a_imm size')
    v = instruction(data,0)
    require(v >> 40 == 0x0c, 'Not an immediate-counter loop')
    return dict(count=v >> 24 & 65535,target=address+signed(v & 0x7fffff,23),
                modeF1=bool(v & (1 << 23)))


def registration_layout(sid, index, count=277):
    """Successful bounded registration only; no allocation/success assumption."""
    require(type(sid) is int and 0 <= sid < 256, 'SID outside uint8 map')
    require(type(index) is int and 0 < index < count <= 65536, 'Invalid mapped slot')
    return dict(mapEntry=0x2e4920+2*sid,handler=0x2e4b28+8*index,
                argument=0x2e4b28+8*index+4)


def status_bridge(actions):
    """Symbolic status-stack suffix; selected task can differ from interrupted task.

    Native path selection, frame validity and compact-return meaning are
    premises. This deliberately models status only, not the whole PC/DAG state.
    """
    stack=['outer-status'];mode='scheduler-mode';events=[]
    for action in actions:
        if action == 'push':
            stack.append(mode)
        elif action == 'selected':
            require(stack, 'No status entry to replace');stack[-1]='selected-task-mode'
        elif action == 'clobber':
            require(stack, 'No status entry to clobber');stack[-1]='clobbered-mode'
        elif action == 'rts':
            pass
        elif action == 'rti':
            require(stack, 'Status underflow');mode=stack.pop()
        else:
            raise ValueError('Unreviewed status action')
        events.append(dict(action=action,stack=list(stack),mode=mode))
    require(mode == 'selected-task-mode' and stack == ['outer-status'],
            'Selected mode was not restored with outer status preserved')
    return dict(restoresSelectedTaskMode=True,preservesOuterStatus=True,
                provesIncomingInterruptedModePreserved=False,events=events)


def build(firmware):
    m=json.loads(MANIFEST.read_text())
    require((m['firmwareSyxSha256'],m['firmwareLdrSha256']) == (SYX_SHA,LDR_SHA),
            'Source identity drift')
    require(sha(firmware) == SYX_SHA, 'Wrong firmware')
    mem=BootMemory(unpack(firmware))
    def code(a,n):
        return mem.read(l2_visa_byte(a,n) if 0xba0000 <= a < 0xbc0000 else visa_byte(a,n),n)
    for s in m['spans']:
        raw=code(int(s['address'],16),s['size']) if s['source']=='visa' else mem.read(int(s['address'],16),s['size'])
        require(sha(raw)==s['sha256'],'Native span drift: '+s['name'])

    # Exact loaded table. It is not evidence that the live vector selection can
    # never change after startup, nor that an interrupt is currently enabled.
    ivt=mem.read(0x28240000,768)
    sec=direct_control(isa_to_visa(ivt[0x3c*6:0x3d*6]),0x9003c)
    require(sec==dict(condition=31,call=False,target=0x1cbb7f,delayed=True),'SECI vector')
    require(immediate(isa_to_visa(ivt[0x3d*6:0x3e*6]))==(0x76,0x0f000008),'SECI delay ASTATX')
    require(ivt[0x3e*6:0x40*6] == bytes(12),'SECI trailing NOPs')
    require(direct_control(isa_to_visa(ivt[5*6:6*6]),0x90005)['target']==0xbb8000,'Reset entry')
    for at,target,call in [(0xbb8002,0x1c0000,False),(0x1c0027,0xbb8005,False),
                           (0xbb807f,0x834390,True)]:
        require(direct_control(code(at,6),at)==dict(condition=31,call=call,target=target,delayed=False),
                'Startup direct link')
    loop=immediate_loop(code(0x8343a1,6),0x8343a1)
    require(loop==dict(count=2,target=0x8343e6,modeF1=True),'Startup F1 loop')
    require(dict(immediate(code(a,4)) for a in range(0x8343a6,0x8343b0,2)) ==
            {0x27:-1,0x2e:1,0x26:1,0x2d:0,0x25:0},'ABI modifier constants')
    require(bitop(code(0x8343e3,6))==('set',2,0x78),'Select secondary bank in loop')
    require(bitop(code(0x8343e9,6))==('clear',2,0xa078),'Restore primary bank after loop')
    require([instruction(code(a,6),0) for a in (0x8343f2,0x8343f5,0x8343f8)] ==
            [0x100000030024,0x023e00300200,0x110000030024],'Vector-select bit2 sequence')

    # SID is one of 50/51; registration failure and later replacement are not excluded.
    require(immediate(code(0x830e3c,4))==(0x14,51) and immediate(code(0x830e3e,4))==(0x24,50),'SID alternatives')
    require(immediate(code(0x830e43,6))==(8,0x830778),'Registered handler')
    require(register_move(code(0x830e49,4))==(4,0x14),'SID argument')
    require(instruction(code(0x830e4b,6),0)==0x1804008337e2,'Register call')
    require(immediate(code(0x833803,6))==(0x15,0x2e4920),'Registration map base')
    load=memory_move(code(0x833809,4));store=memory_move(code(0x833842,4))
    expected=dict(store=False,index=5,modifier=4,postmodify=False,register=0,width=2,signExtend=False)
    require(load==expected and store==dict(expected,store=True),'Registration 16-bit map operands')
    require(instruction(code(0x833838,6),0)==0x023e00000320,'Registration index times8')
    require(instruction(code(0x833844,6),0)==0x1604002e4b28,'Registration callback base')
    require(instruction(code(0x83384a,2),0,1)==0x99b8 and instruction(code(0x83384b,2),0,1)==0x997c,
            'Handler R8 then argument R12 (M6=1 normal word, M5=0)')
    count,=struct.unpack('<I',mem.read(0x282e4b20,4));require(count==277,'Callback capacity')
    require(immediate(code(0x1cbba6,6))==(12,0x2e4920),'Dispatcher map base')
    require(instruction(code(0x1cbba1,6),0)==0x5ffeb6801844 and
            instruction(code(0x1cbba9,6),0)==0x5ffeb6001c8c,'SID times2 and base addition')
    mapload=subword_immediate(code(0x1cbbbe,4))
    require(mapload==dict(condition=31,store=False,programMemory=True,index=12,
                         postmodify=False,register=8,modifier=0,width=2,signExtend=False),'Dispatcher map load')
    require(instruction(code(0x1cbbc0,6),0)==0x023e00000388 and
            instruction(code(0x1cbbc3,2),0,1)==0xc0c8,'Dispatcher index times8')
    require(immediate(code(0x1cbbb8,6))==(12,0x2e4b28),'Dispatcher handler base')
    require(instruction(code(0x1cbbce,4),0,2)==0x98283200 and
            instruction(code(0x1cbbe1,4),0,2)==0x98280601,'PCSTK target / R12 argument')
    layouts=[registration_layout(sid,j,count) for sid in (50,51) for j in range(1,count)]

    # Link known callback -> restore -> callback return -> dispatcher continuation.
    require(direct_control(code(0x8307ae,6),0x8307ae)==
            dict(condition=31,call=True,target=0x830a1b,delayed=False),'Restore call')
    require(register_move(code(0x830a1e,4))==(0x1d,0x64) and
            register_move(code(0x830a5d,4))==(0x64,0x1d),'Restore-helper return token I13')
    require(immediate(code(0x1cbbb5,6))==(0x64,0x1cbbe6),'Dispatcher continuation')
    for at,value in [(0x8307a8,0x1164000b9572),(0x8307ab,0x170400000000),
                     (0x8307b1,0x170800000000),(0x8307b4,0x1064000b9572)]:
        require(instruction(code(at,6),0)==value,'Caller continuation save/reload')
    require(dm7(code(0x830ae3,4))==(False,7,0x70,148),'Selected frame MODE1 read')
    require(instruction(code(0x830c40,6),0)==0x172000000000,'Push status entry')
    require(register_move(code(0x830c43,4))==(0x7d,0x70),'Selected MODE1STK write')
    for at,kind,delay in [(0x1cbbe0,'RTS',True),(0x830c8c,'RTS',False),(0x8307bb,'RTS',False),
                          (0x1cbc0c,'RTI',True)]:
        r=compact_return_hypothesis(code(at,2))
        require((r['kind'],r['delayed'])==(kind,delay),'Inherited return hypothesis changed')
    slots=reviewed_delay_slots(0x1cbc0c,code(0x1cbc0c,2),[4,4])
    require(slots==[0x1cbc0d,0x1cbc0f],'Final pointer restore delay slots')
    model=status_bridge(['push','selected','rts','rts','rti'])

    return dict(schemaVersion=1,date='2026-10-22',productionVersion='0.3.13',
                method='Native operand checks, reviewed tail and conditional status-stack model; no live CPU or complete scheduler emulation.',
                checkpointCount=len(m['spans']),
                vector=dict(loadedTableSource='0x28240000',privateIsaBase='0x90000',
                            entry='0x9003c',target=hex(sec['target']),delayed=True,
                            directLoadedVectorLinkProven=True,liveVectorSelectionInvariantProven=False),
                startup=dict(resetTarget='0xbb8000',setupCall='0xbb807f',setup='0x834390',
                             loop=loop,bit2SetAt='0x8343f5',mmrAddress='0x30024',
                             sysctlAddressBinding='inferred from startup pattern and documented default CCES IVT setup; exact vendor register-address definition not obtained'),
                registration=dict(sids=[50,51],handler='0x830778',mapBase='0x2e4920',
                                  mapStrideBytes=2,callbackBase='0x2e4b28',callbackStrideBytes=8,
                                  argumentOffsetBytes=4,capacity=count,
                                  checkedAddressPairs=len(layouts),
                                  layoutRowsSha256=sha(json.dumps(layouts,sort_keys=True).encode()),
                                  successfulRegistrationAndDispatchLayoutAgree=True,
                                  registrationSuccessOrAllRuntimeWritesProven=False),
                conditionalReturn=dict(restoreCall='0x8307ae',restore='0x830a1b',
                                       frameRead='0x830ae3',mode1stkWrite='0x830c43',
                                       helperReturn='0x830c8c',callerContinuation='0x8307b1',
                                       handlerReturn='0x8307bb',dispatcherContinuation='0x1cbbe6',
                                       finalRtiCandidate='0x1cbc0c',statusModel=model,
                                       premises=['Legacy compact RTS/RTI interpretation is correct.',
                                                 'Valid selected task frame, PC stack and ABI modifiers; reviewed memory has no external clobber.',
                                                 'Successful matching registration; correct active vector; no interfering nested interrupt or exception.',
                                                 'Hash-bound review establishes no intervening status-stack mutation in the selected return suffix.']),
                compactReturnEncodingIndependentlyProven=False,
                wholeInterruptReturnPathProven=False,runtimeModeAtStoreProven=False,
                fullRangeEncodingProven=False,generatorWriteSupportAdded=False,
                newPhysicalExports=0,newReaDecompilation=False,
                nextStep='Retain this conditional interrupt bridge. Resolve the compact-opcode witness and remaining coreTask callee invariants before promoting live MODE1; no preset export is needed for these questions.')


if __name__ == '__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--firmware',type=Path,required=True);ap.add_argument('--write',action='store_true')
    args=ap.parse_args();result=build(args.firmware.read_bytes())
    if args.write:OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    else:require(json.loads(OUT.read_text())==result,'Stale interrupt audit')
    print(json.dumps({k:result[k] for k in ('checkpointCount','vector','wholeInterruptReturnPathProven',
                                         'runtimeModeAtStoreProven','generatorWriteSupportAdded')}))

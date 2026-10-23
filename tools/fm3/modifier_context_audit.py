#!/usr/bin/env python3
"""Extend MODE1 candidate search to memory, MMASK and status-stack effects.

Prefix matches are not execution evidence. Native checkpoints prove operands;
symbolic stack expressions show MMASK effects under stated path premises.
The compact RTI encoding remains a hypothesis, never a promoted native fact.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import struct

from global_scale_cache import immediate, register_move, signed
from modifier_interrupt_audit import l2_visa_byte, build as interrupt_build
from modifier_mode_audit import visa_byte, bitop, ALL, RND32, TRUNCATE
from modifier_sharc_audit import memory_move
from modifier_value_path_audit import BootMemory
from modifier_writers_audit import (DOC, REGIONS, PACKED_ISA, readable_intervals,
    candidate as register_candidate, reviewed_inventory, classify)
from pitch_display import instruction, unpack, SYX_SHA, LDR_SHA
from six_field_resolution import require, sha

MANIFEST=DOC/'modifier-context-checkpoints.json'
OUT=DOC/'modifier-context-audit.json'
TARGETS={0x72:'MODE1',0x73:'MMASK',0x7d:'MODE1STK'}
CONFIGURED_MMASK=0x00e0b003


def memory_operand(raw):
    """Type14a/15a/15b operands, including stores for save-site witnesses.

    Width/pair legality and effective-address validity are not emulated. The
    signed7 field is in normal-word units, not automatically a byte offset.
    """
    require(len(raw) in (4,6),'Expected memory instruction size')
    p,q=struct.unpack_from('<HH',raw)
    if len(raw)==4:
        require(p&0xf05f==0x9008 and not q&0xc000,'Expected Type15b')
        pm=bool(p&0x20)
        return dict(family='Type15b',size=4,store=bool(p&0x100),pm=pm,
                    longWord=bool(p&0x80),register=q>>7&127,
                    index=(p>>9&7)+(8 if pm else 0),displacementWords=signed(q&127,7))
    r=struct.unpack_from('<H',raw,4)[0]; value=q<<16|r
    if p&0xfc00==0x1000:
        return dict(family='Type14a',size=6,store=bool(p&0x100),pm=bool(p&0x200),
                    longWord=bool(p&0x80),register=p&127,memoryAddress=hex(value))
    require(p>>13==5,'Expected Type14a/15a')
    pm=bool(p&0x1000)
    return dict(family='Type15a',size=6,store=bool(p&0x100),pm=pm,
                longWord=bool(p&0x80),register=p&127,
                index=(p>>9&7)+(8 if pm else 0),displacementEncoded=hex(value))


def stack_status(raw):
    """Type20a status operation, no simultaneous cache or contradictory stack ops.

    Figure17-4: push STS bit37, pop STS bit36, PC/loop operations are independent.
    This is narrower than all possible Type20a encodings.
    """
    require(len(raw)==6,'Expected Type20a size')
    p,q,r=struct.unpack('<3H',raw)
    require(p&0xff03==0x1700 and q==r==0,'Expected status operation without cache')
    require(p&0x30 in (0x10,0x20) and p&0xc0!=0xc0 and p&0x0c!=0x0c,
            'Contradictory/missing stack operation')
    return dict(family='Type20a',size=6,operation='push-status' if p&0x20 else 'pop-status',
                pushPc=bool(p&8),popPc=bool(p&4),pushLoop=bool(p&0x80),popLoop=bool(p&0x40))


def context_candidate(raw,off):
    """Selected raw prefixes; no automatic claim of instruction legality/reachability."""
    if off+2>len(raw):return None
    p=struct.unpack_from('<H',raw,off)[0]
    if p in (0x0bbe,0x0bfe):
        return dict(family='compact-RTI-hypothesis',size=2,delayed=p==0x0bfe,
                    nativeSemanticsProven=False)
    if off+4>len(raw):return None
    q=struct.unpack_from('<H',raw,off+2)[0]
    if p&0xf05f==0x9008 and not q&0xc000:
        hit=memory_operand(raw[off:off+4])
    elif off+6<=len(raw) and (p&0xfc00==0x1000 or p>>13==5):
        hit=memory_operand(raw[off:off+6])
    else:hit=None
    if hit is not None:
        if hit['store'] or hit['register'] not in TARGETS:return None
        hit['register']=TARGETS[hit['register']];return hit
    if p>>13==2 and not q&0x8000 and q>>7&127 in TARGETS:
        low=q&127
        if low&0x7c==0x3c:family,size='Type3b-prefix',4
        elif low&0x78==0x30:family,size='Type3d-prefix',6
        else:family,size='Type3a-prefix',6
        if off+size>len(raw):return None
        return dict(family=family,size=size,register=TARGETS[q>>7&127],
                    condition=p>>1&31,computeOrWidthLegalityProven=False)
    if p&0xff03==0x1700 and p&0x30 and off+6<=len(raw):
        try:return stack_status(raw[off:off+6])
        except ValueError:return None
    if off+6<=len(raw):
        v=instruction(raw[off:off+6],0)
        if v&~0x7fffff in (0x0b3e00000000,0x0b3e04000000):
            return dict(family='Type11a-RTI-prefix',size=6,condition=31,
                        delayed=bool(v&0x4000000),compute=v&0x7fffff)
    # Reuse the prior operand reader by changing only destination selector 73 -> 72.
    patch=None
    if p&0xff10==0x1400 and p&15==3 or p&0xff00==0x0f00 and p&127==0x73:
        patch=struct.pack('<H',p-1)+raw[off+2:off+6]
    elif p>>11==14 and q>>7&127==0x73:
        patch=struct.pack('<HH',p,q-128)+raw[off+4:off+6]
    if patch:
        hit=register_candidate(patch,0)
        if hit and hit['writesRegister']:
            hit['register']='MMASK';hit['family']='MMASK-'+hit['family'];return hit
    return None


def mode_expression(symbol,keep=ALL):return dict(symbol=symbol,keepMask=hex(keep))


def status_trace(actions,mask=CONFIGURED_MMASK):
    """Symbolic MODE1 projection only: PUSH saves before masking the live word.

    Ignores other status fields and pipeline timing. 'rti-assumed' deliberately
    names the unresolved native return premise; RTS never pops status.
    """
    require(type(mask) is int and 0<=mask<=ALL,'Invalid MMASK')
    mode=('incoming',ALL);stack=[('outer',ALL)];events=[]
    for action in actions:
        if action=='push':stack.append(mode);mode=(mode[0],mode[1]&~mask)
        elif action=='selected':
            require(len(stack)>1,'No local status entry');stack[-1]=('selected-task',ALL)
        elif action=='clobber':
            require(len(stack)>1,'No local status entry');stack[-1]=('clobbered',ALL)
        elif action in ('pop','rti-assumed'):
            require(len(stack)>1,'No local status entry');mode=stack.pop()
        elif action=='rts':pass
        else:raise ValueError('Unknown status action')
        events.append(dict(action=action,live=mode_expression(*mode),
                           stack=[mode_expression(*s) for s in stack]))
    return dict(events=events,final=mode_expression(*mode),
                restoresIncoming=mode==('incoming',ALL),restoresSelected=mode==('selected-task',ALL),
                preservesOuterStatus=stack==[('outer',ALL)],nativePathProven=False)


def build(firmware):
    require(sha(firmware)==SYX_SHA,'Wrong firmware')
    ldr=unpack(firmware);require(sha(ldr)==LDR_SHA,'Wrong loader');mem=BootMemory(ldr)
    def code(a,n):return mem.read(l2_visa_byte(a,n) if 0xba0000<=a<0xbc0000 else visa_byte(a,n),n)
    prior=interrupt_build(firmware)
    require(prior==json.loads((DOC/'modifier-interrupt-audit.json').read_text()),'Prior interrupt audit drift')
    owners,sources=reviewed_inventory(code,[DOC/f'modifier-{name}-checkpoints.json'
                                          for name in ('init','buffer','table','writers','context')])
    candidates=[];regions=[]
    for start,end,base in REGIONS:
        segments=[]
        for a,b,status,multiplicity in readable_intervals(mem.rows,base,base+2*(end-start),(PACKED_ISA,)):
            row=dict(byteStart=hex(a),byteEndExclusive=hex(b),status=status,bootRows=multiplicity)
            if status=='scan':
                require((a-base)%2==0 and (b-a)%2==0,'Unaligned scan')
                raw=mem.read(a,b-a);row['sha256']=sha(raw)
                for off in range(0,len(raw),2):
                    hit=context_candidate(raw,off)
                    if hit:
                        pc=start+(a-base+off)//2
                        candidates.append(dict(address=hex(pc),**hit,boundary=classify(pc,hit['size'],owners)))
            segments.append(row)
        regions.append(dict(visaStart=hex(start),visaEndExclusive=hex(end),byteBase=hex(base),segments=segments))
    require(immediate(code(0x8343ef,6))==(0x73,CONFIGURED_MMASK),'Configured MMASK drift')
    require(bitop(code(0x8343e9,6))==('clear',2,0xa078) and
            bitop(code(0x8343ec,6))==('set',2,0x1011800),'Startup rounding mode drift')
    load=memory_operand(code(0x837bad,4))
    require(load==dict(family='Type15b',size=4,store=False,pm=False,longWord=False,
                      register=0x72,index=6,displacementWords=-13),'Direct MODE1 memory read drift')
    save=memory_move(code(0x837b5a,4))
    require(save==dict(store=True,index=7,modifier=7,postmodify=True,
                      register=0x72,width=4,signExtend=False),'DSP MODE1 save drift')
    frame=memory_operand(code(0x830ae3,4))
    require(frame==dict(family='Type15b',size=4,store=False,pm=False,longWord=False,
                       register=0x70,index=7,displacementWords=37),'Selected frame read drift')
    require(stack_status(code(0x83082e,6))['operation']=='pop-status','Scheduler POP drift')
    require(stack_status(code(0x830c40,6))['operation']=='push-status','Scheduler PUSH drift')
    require(register_move(code(0x830c43,4))==(0x7d,0x70),'MODE1STK source drift')
    rounding=[]
    for value,label in [(0,'40-nearest'),(TRUNCATE,'40-truncate'),(RND32,'32-nearest'),
                        (RND32|TRUNCATE,'32-truncate')]:
        rounding.append(dict(incomingBits=hex(value),incomingLabel=label,
                             pushedSavedBits=hex(value),liveAfterPush=hex(value&~CONFIGURED_MMASK),
                             afterPop=hex(value)))
    ordinary=status_trace(['push','pop'])
    selected=status_trace(['push','selected','rts','rts','rti-assumed'])
    require(ordinary['restoresIncoming'] and selected['restoresSelected'] and
            ordinary['preservesOuterStatus'] and selected['preservesOuterStatus'],'Status model failed')
    return dict(schemaVersion=1,date='2026-10-22',productionVersion='0.3.13',
        firmwareSyxSha256=SYX_SHA,firmwareLdrSha256=LDR_SHA,
        method='Additional raw-prefix inventory, native operand checkpoints and symbolic MODE1/status-stack expressions; not firmware execution.',
        manual=dict(sha256='a3edf83beb75b44a77f8366cf54c0353083ab49a1c69d8179d2b727ba7ba1470',
                    sections=['4-29/30 interrupt mask mode','29-49/50 MMASK','16-4/10/12 memory encodings','17-9/11 Type20a']),
        reviewedPartitions=sources,reviewedInstructionBoundaries=len({v[0] for v in owners.values()}),
        regions=regions,candidateCount=len(candidates),
        candidatesByFamily=dict(sorted(Counter(c['family'] for c in candidates).items())),
        candidatesByBoundary=dict(sorted(Counter(c['boundary']['status'] for c in candidates).items())),
        candidates=candidates,
        configuredMask=dict(at='0x8343ef',value=hex(CONFIGURED_MMASK),roundingTruthTable=rounding,
            clearsTruncateOnPush=True,preservesRnd32OnPush=True,setsRnd32OnPush=False,
            ongoingRuntimeMaskInvariantProven=False,
            premise='This configured MMASK remains in force at the modeled PUSH/interrupt. Later writes and active-core execution are not proved.'),
        directMemoryRead=dict(at='0x837bad',operand=load,byteOffsetForNormalByteAddress=-52,
            saveSite='0x837b5a',saveOperand=save,sameSavedWordProven=False,fullFunctionModePreservationProven=False,
            limit='Matching the saved word to I6-52 needs stack-frame/address and alias analysis; a plausible save/read pair is not a preservation certificate.'),
        selectedFrame=dict(at='0x830ae3',operand=frame,byteOffsetForNormalByteAddress=148,
                           destination='USTAT1',thenMode1stkAt='0x830c43'),
        ordinaryPushPopModel=ordinary,selectedTaskReturnModel=selected,
        priorInterruptAuditReplayed=True,priorInterruptAuditSha256=sha((DOC/'modifier-interrupt-audit.json').read_bytes()),
        scopeGaps=[
            'Raw matches, including boundary matches, do not prove reachability or a global writer invariant.',
            'Type3 prefixes retain unresolved compute/width legality; the manual Type3a figure repeats Type1a fields and is not used to certify a full decoder.',
            'Register-pair implicit writes, other memory families and memory-mapped aliases of system registers are not exhaustively covered.',
            'Only unconditional no-LR/no-ELSE Type11a RTI prefixes and two explicit compact RTI hypotheses are searched; conditional return coverage remains open.',
            'Type20a scanner excludes cache activity and contradictory PC/loop operations; it is not a full system-instruction decoder.',
            'Packed ISA vectors, multiply loaded regions and unmapped gaps remain excluded as in the prior writer search.',
            'Compact RTI semantics, live MMASK stability, selected frame validity, interrupt nesting and complete coreTask paths remain unproved.'
        ],
        completeWriterInventory=False,compactReturnEncodingIndependentlyProven=False,
        runtimeModeAtStoreProven=False,fullRangeEncodingProven=False,generatorWriteSupportAdded=False,
        newPhysicalExports=0,newReaDecompilation=False,
        nextStep='Resolve the direct memory restore provenance at 0x837bad and bound remaining MMASK candidates; retain explicit compact-return and task-frame premises. No preset export is needed.')


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--firmware',type=Path,required=True);ap.add_argument('--write',action='store_true')
    a=ap.parse_args();r=build(a.firmware.read_bytes())
    if a.write:OUT.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
    else:require(json.loads(OUT.read_text())==r,'Stale context audit')
    print(json.dumps({k:r[k] for k in ('candidateCount','candidatesByFamily','candidatesByBoundary',
                                      'configuredMask','runtimeModeAtStoreProven')}))

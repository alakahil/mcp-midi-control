#!/usr/bin/env python3
"""Bind a MODE1 save/load to one stack slot, retaining buffer-alias premises.

Native operands and control edges are replayed against hash-bound manual
partitions. The symbolic proof is conditional, not firmware/CPU execution.
"""
import argparse
import json
from pathlib import Path
import struct

from global_scale_cache import immediate
from modifier_buffer_audit import graph, SIMD
from modifier_context_audit import memory_operand, build as context_build
from modifier_mode_audit import ALL, bitop, visa_byte
from modifier_sharc_audit import memory_move
from modifier_value_path_audit import BootMemory
from modifier_writers_audit import DOC, reviewed_inventory
from pitch_display import instruction, unpack, SYX_SHA, LDR_SHA
from six_field_resolution import require, sha

MANIFEST=DOC/'modifier-frame-checkpoints.json'
OUT=DOC/'modifier-frame-audit.json'
ENTRY=0x837b00
SAVE=0x837b5a
LOAD=0x837bad
MODE_SET=0x80600000
PUSHES=((0x837b06,5),(0x837b07,6),(0x837b08,9),(0x837b0b,10),
        (0x837b0c,11),(0x837b0d,13),(0x837b0e,14),(0x837b0f,0x49),
        (0x837b11,0x19),(0x837b13,0x28),(0x837b15,8))
ALIAS_SITES=(0x837b7a,0x837b80,0x837b82,0x837ba4,0x837ba7)


def compact_dm(data):
    """Type3c (PRM Figure14-8): normal DM, postmodify, data register only."""
    require(len(data)==2,'Expected Type3c size')
    p=struct.unpack('<H',data)[0]
    require(p&0xf010==0x9010,'Expected Type3c')
    return dict(store=bool(p&0x20),index=p>>9&7,modifier=p>>6&7,
                postmodify=True,register=p&15,width=4,signExtend=False)


def call_frame(data,at):
    """Exact CJUMP + two delayed stack pushes used at the three witnesses.

    CJUMP itself sets I6=I7, R2=old I6; it does not decrement I7. The
    postmodify stores do that, under the explicit M7=-1/NW-byte premise.
    Only the I7/M7 normal Type16a immediate-store form is accepted here.
    """
    require(len(data)==14,'Expected complete call with two delay instructions')
    require(instruction(data,0)==(0x1804<<32|ENTRY),'Unexpected CJUMP target/form')
    require(compact_dm(data[6:8])==dict(store=True,index=7,modifier=7,
            postmodify=True,register=2,width=4,signExtend=False),'Old frame push drift')
    value=instruction(data[8:14],0)
    require(value>>32==0x9fc0 and value&ALL==at+6,'Return word push drift')
    return dict(at=hex(at),target=hex(ENTRY),delayInstructions=2,
                savedFrameOffsetBytes=0,savedReturnOffsetBytes=-4,
                calleeI7MinusI6Bytes=-8,storedReturnWord=hex(at+6),
                continuationWithM14One=hex(at+7),runtimeAbiValidityProven=False)


def frame_layout(registers,entry_offset=-8,m7=-1):
    """Linear, aligned 32-bit stack in byte address space; no circular wrap."""
    require(type(entry_offset) is int and type(m7) is int,'Integer stack geometry required')
    sp=entry_offset;rows=[]
    for reg in registers:
        rows.append(dict(register=hex(reg),offsetBytes=sp));sp+=4*m7
    return dict(pushes=rows,modeSaveOffsetBytes=sp,afterModeSaveOffsetBytes=sp+4*m7,
                restoreOffsetBytes=-52,sameAddress=sp==-52)


def store_fields(data):
    """Selected Type3 DM store fields; not a full compute/width legality reader.

    Four-byte forms check NW bits. Six-byte Type3a forms retain a manually
    reviewed, hash-bound compute field: the PRM Type3a diagram is defective.
    """
    require(len(data) in (4,6),'Expected reviewed Type3 store size')
    p,q=struct.unpack_from('<HH',data)
    require(p>>13==2 and not p&1 and q&0x8000 and not q&0x4000,
            'Expected reviewed normal DM store')
    if len(data)==4:require(q&127==63,'Expected normal Type3b store')
    return dict(index=p>>9&7,modifier=p>>6&7,postmodify=bool(p&0x1000),
                register=hex(q>>7&127),condition=p>>1&31,
                computeLegalityIndependentlyProven=len(data)==4)


def prove_slot(nodes,entry,excluded_aliases):
    """All finite normal returns, under explicitly supplied no-alias premises.

    The slot holds a symbolic incoming MODE1, not a guessed concrete value.
    Unknown writes invalidate it. CFG branch/loop alternatives are all visited.
    Other memory/MMR effects and asynchronous interference are external premises.
    """
    excluded=set(excluded_aliases);initial=(ALL&~SIMD,0)
    work=[(entry,initial,None)];seen=set();returns=set();visited_aliases=set();loads=0
    for n in nodes.values():
        require(n['successors'] or n['return'],'Open graph endpoint')
        require(all(a in nodes for a in n['successors']),'Open graph edge')
    while work:
        at,mode,saved=work.pop();state=(at,mode,saved)
        if state in seen:continue
        seen.add(state);require(len(seen)<10000,'State bound exceeded')
        require(at in nodes,'Missing graph node');n=nodes[at]
        for op,arg in n['actions']:
            if op=='save-slot':saved=(arg,mode)
            elif op=='set':mode=(mode[0]&~arg,mode[1]|arg)
            elif op=='possible-alias':
                if saved is not None:
                    visited_aliases.add(arg)
                    if arg not in excluded:saved=None
            elif op=='load-slot':
                require(saved is not None and saved[0]==arg,'Unproven or clobbered saved slot')
                mode=saved[1];loads+=1
            else:raise ValueError('Unreviewed frame action')
        if n['return']:
            require(not n['successors'] and mode==initial,'Normal return changes MODE1')
            returns.add(at)
        work.extend((a,mode,saved) for a in n['successors'])
    require(returns and loads,'No restored returning path')
    require(visited_aliases<=excluded,'Missing no-alias premise')
    return dict(states=len(seen),returnSites=[hex(a) for a in sorted(returns)],
                liveSlotStoreSites=[hex(a) for a in sorted(visited_aliases)],
                allFiniteNormalReturnsPreserveModeUnderPremises=True,
                entryZeroMask=hex(SIMD),terminationProven=False,
                aliasPremisesDischarged=False)


def build(firmware):
    require(sha(firmware)==SYX_SHA,'Wrong firmware')
    ldr=unpack(firmware);require(sha(ldr)==LDR_SHA,'Wrong loader');mem=BootMemory(ldr)
    def code(a,n):return mem.read(visa_byte(a,n),n)
    prior=context_build(firmware)
    require(prior==json.loads((DOC/'modifier-context-audit.json').read_text()),'Prior context audit drift')
    _,sources=reviewed_inventory(code,[MANIFEST])
    m=json.loads(MANIFEST.read_text());inv={int(a,16):(n,k) for a,n,k in m['instructions']}
    calls=[call_frame(code(a,14),a) for a in (0x1c95ec,0x1c960d,0x1c962e)]
    require(immediate(code(0x8343a6,4))==(0x27,-1),'Startup M7 drift')
    require(immediate(code(0x8343a8,4))==(0x2e,1),'Startup M14 drift')
    for at,reg in PUSHES:
        raw=code(at,inv[at][0]);op=compact_dm(raw) if len(raw)==2 else memory_move(raw)
        require(op==dict(store=True,index=7,modifier=7,postmodify=True,
                        register=reg,width=4,signExtend=False),'Prologue push drift')
    save=memory_move(code(SAVE,4));load=memory_operand(code(LOAD,4))
    require(save==dict(store=True,index=7,modifier=7,postmodify=True,
                       register=0x72,width=4,signExtend=False),'MODE1 save drift')
    require(load==dict(family='Type15b',size=4,store=False,pm=False,longWord=False,
                       register=0x72,index=6,displacementWords=-13),'MODE1 restore drift')
    require(bitop(code(0x837b5c,6))==('set',2,MODE_SET),'MODE1 set drift')
    require(not MODE_SET&0x18078,'SET changes rounding or DAG bank selection')
    layout=frame_layout([reg for _,reg in PUSHES]);require(layout['sameAddress'],'Frame slot mismatch')
    actions={SAVE:[('save-slot',layout['modeSaveOffsetBytes'])],0x837b5c:[('set',MODE_SET)],
             LOAD:[('load-slot',4*load['displacementWords'])]}
    stores=[]
    expected=[(4,7,True,4,17),(4,2,True,0x54,27),(4,6,True,0x54,11),
              (5,4,False,13,29),(5,2,True,12,31)]
    for at,want in zip(ALIAS_SITES,expected):
        fields=store_fields(code(at,inv[at][0]))
        require((fields['index'],fields['modifier'],fields['postmodify'],
                 int(fields['register'],16),fields['condition'])==want,'Potential store drift')
        stores.append(dict(at=hex(at),**fields,actualAddressesKnown=False,
                           allActivePeWritesMustBeExcluded=True))
        actions[at]=[('possible-alias',at)]
    nodes=graph(code,inv,actions,ENTRY)
    proof=prove_slot(nodes,ENTRY,ALIAS_SITES)
    rejected=[]
    for at in ALIAS_SITES:
        try:prove_slot(nodes,ENTRY,set(ALIAS_SITES)-{at})
        except ValueError:rejected.append(hex(at))
        else:raise ValueError('Missing alias premise was accepted')
    return dict(schemaVersion=1,date='2026-10-22',productionVersion='0.3.13',
        firmwareSyxSha256=SYX_SHA,firmwareLdrSha256=LDR_SHA,
        method='Native frame/control operands plus hash-bound manual negative inventory and a conditional symbolic saved-slot proof; not CPU execution.',
        manual=dict(sha256='a3edf83beb75b44a77f8366cf54c0353083ab49a1c69d8179d2b727ba7ba1470',
                    sections=['14-20/21 Type3c','16-12 Type15b','16-13/14 Type16a','17-15 CJUMP','29-54/55 MODE1']),
        reviewedPartitions=sources,reviewedInstructionBoundaries=len(inv),functionEntry=hex(ENTRY),
        functionEndExclusive='0x837c26',functionInstructions=121,controlNodes=len(nodes),
        nativeCallFrameWitnesses=calls,stackGeometry=layout,
        geometryPremises=['M7=-1 remains valid; startup assignment alone is not a runtime invariant.',
                         'The three CJUMPs execute both reviewed delay instructions with SISD entry and aligned 32-bit NW stack accesses in byte space.',
                         'I6/I7 stack addressing is linear (no circular wrap); stack memory is valid; no asynchronous interference.'],
        sameAddressUnderAbiPremises=True,saveDominatesRestoreInReviewedGraph=True,
        modeSet=dict(at='0x837b5c',mask=hex(MODE_SET),fields=['SELPE','BDCST9','PEYEN'],
                     roundingBitsChanged=False,dagBankBitsChanged=False),
        possibleSlotWriters=stores,conditionalProof=proof,
        rejectedMissingAliasPremises=rejected,
        preservationPremises=['Every possible write at the five listed sites, in every loop iteration and active PE, avoids the saved word and its physical aliases.',
                              'Caller-provided buffers are ordinary valid memory, not system-register/MMR aliases, and cannot corrupt the control frame.',
                              'The hash-bound manual inventory covers all MODE1 and stack-pointer effects on this function path. Type3a compute legality is not independently decoded.',
                              'Normal calls/returns and valid native loop execution; no asynchronous or nonlocal transfer.'],
        unknowns=['Actual I4/I5 buffer addresses, circular spans and non-overlap with the saved slot have not been established.',
                  'Caller ABI validity and reachability from the Min/Max store task are not proved.',
                  'Runtime MMASK stability, compact RTI encoding and the remaining coreTask paths stay open.'],
        sameUnmodifiedSavedWordProven=False,fullFunctionModePreservationProven=False,
        priorContextAuditReplayed=True,runtimeModeAtStoreProven=False,
        fullRangeEncodingProven=False,generatorWriteSupportAdded=False,
        newPhysicalExports=0,newReaDecompilation=False,
        nextStep='Trace the three wrapper callers and the I4/I5 buffer origins to discharge the explicit memory-alias premises. No preset export is needed for this code question.')


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--firmware',type=Path,required=True);ap.add_argument('--write',action='store_true')
    a=ap.parse_args();r=build(a.firmware.read_bytes())
    if a.write:OUT.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
    else:require(json.loads(OUT.read_text())==r,'Stale frame audit')
    print(json.dumps({k:r[k] for k in ('reviewedInstructionBoundaries','stackGeometry',
          'conditionalProof','sameUnmodifiedSavedWordProven','runtimeModeAtStoreProven')}))

#!/usr/bin/env python3
"""Bound the 82fe42 buffer callees; do not promote its open division dependency.

Instruction partitions and negative MODE1 inventories are manually reviewed and
hash-bound. Native readers validate control flow, delay slots, MODE1 actions and
the fixed allocation-size gate. This is not a complete SHARC+ emulator.
"""
import argparse
import json
from pathlib import Path

from global_scale_cache import immediate, register_move
from modifier_caller_audit import direct_control, register_loop
from modifier_init_audit import native_graph as init_graph, prove_mode as init_proof
from modifier_interrupt_audit import immediate_loop, l2_visa_byte
from modifier_mode_audit import ALL, bitop, move_with_compute, visa_byte
from modifier_sharc_audit import indirect_jump
from modifier_value_path_audit import BootMemory
from pitch_display import instruction, unpack, SYX_SHA, LDR_SHA
from six_field_resolution import require, sha

DOC=Path(__file__).resolve().parents[2]/'docs/fm3/parameter-evidence'
MANIFEST=DOC/'modifier-buffer-checkpoints.json'
OUT=DOC/'modifier-buffer-audit.json'
SIMD=0x200000


def delayed_return48(data):
    """Type11a §15-19: unconditional RTS(DB), no ELSE/LR/RTI.

    The low 23 compute bits are returned for inspection, not executed. This
    reader deliberately does not accept any compact return hypothesis.
    """
    require(len(data)==6,'Expected 48-bit return')
    v=instruction(data,0)
    require(v&~0x7fffff==0x0a3e04000000,'Unsupported Type11a return form')
    return dict(kind='RTS',delayed=True,condition=31,compute=v&0x7fffff)


def graph(code,inv,actions,entry,nonreturn=frozenset(),gates=None):
    """Native edges; two delay instructions; explicit nonreturn call terminals."""
    gates=gates or {};loops={}
    for a,(size,kind) in inv.items():
        if kind in ('loop-reg','loop-imm'):
            loop=(register_loop if kind=='loop-reg' else immediate_loop)(code(a,size),a)
            if kind=='loop-imm':require(loop['count']>0,'Zero-count loop not reviewed')
            require(loop['target'] in inv and inv[loop['target']][1]=='plain','Open loop endpoint')
            loops.setdefault(loop['target'],[]).append(a+size//2)
    nodes={};work=[entry]
    while work:
        a=work.pop()
        if a in nodes:continue
        require(a in inv,'Path leaves reviewed inventory')
        size,kind=inv[a];raw=code(a,size);nxt=a+size//2
        ops=list(actions.get(a,[]));ret=stop=delay=False;target=None;cond=31
        if kind=='ccall':
            v=instruction(raw,0);require(v>>32==0x1804,'Unexpected C-call')
            target=v&ALL;delay=True
        elif kind in ('branch','call'):
            ctl=direct_control(raw,a);require(ctl['call']==(kind=='call'),'Control kind mismatch')
            target=ctl['target'];cond=ctl['condition'];delay=ctl['delayed']
        elif kind=='abi-return':
            require(indirect_jump(raw)==(14,12,True),'Unexpected ABI return');ret=delay=True
        elif kind=='return48':
            delayed_return48(raw);ret=delay=True
        else:require(kind in ('plain','loop-reg','loop-imm'),'Unknown inventory class')
        if delay:
            for _ in range(2):
                require(nxt in inv and inv[nxt][1]=='plain','Missing/control-bearing delay slot')
                require(nxt not in loops,'Loop endpoint inside bundled delay slot')
                ops+=actions.get(nxt,[]);nxt+=inv[nxt][0]//2
        if kind in ('ccall','call'):
            require(cond==31,'Conditional call not reviewed')
            stop=target in nonreturn
            ops.append(('noreturn' if stop else 'call',target))
        if ret or stop:successors=[]
        elif kind=='branch':
            successors=[target]+([] if cond==31 else [nxt])
            if a in gates:
                expected_cond,expected_target,expected_delay,take=gates[a]
                require((cond,target,delay)==(expected_cond,expected_target,expected_delay) and
                        type(take) is bool,'Specialized gate drift')
                successors=[target if take else nxt]
        else:successors=[nxt]
        successors+=loops.get(a,[])
        nodes[a]=dict(actions=ops,successors=successors,**{'return':ret,'nonreturn':stop})
        work+=successors
    return nodes


def no_return(nodes,entry):
    """Calls may not return, or return to their normal ABI continuation only."""
    seen=set();work=[entry];calls=set()
    while work:
        a=work.pop()
        if a in seen:continue
        require(a in nodes,'Open nonreturn edge');seen.add(a);n=nodes[a]
        require(not n['return'],'A normal return is reachable')
        require(n['successors'] or n.get('nonreturn'),'Open nonreturn endpoint')
        calls.update(v for op,v in n['actions'] if op=='call')
        work+=n['successors']
    return dict(nodes=len(seen),normalReturnReachable=False,
                opaqueCalls=[hex(a) for a in sorted(calls)],
                scope='Ordinary call continuations only; opaque callees may fail to return. No bound on their MODE1 effects, asynchronous handlers or nonlocal transfers.')


def prove(nodes,entry,contracts,zero_mask=SIMD):
    """Finite normal returns preserve all bits, for entry bits constrained zero.

    First compute nodes that can reach a normal return. Nonreturn-only regions
    do not require a MODE1 contract, but all edges must already be closed by the
    native graph / separately established nonreturn contracts.
    """
    for n in nodes.values():
        require(n['successors'] or n['return'] or n.get('nonreturn'),'Open endpoint')
        require(all(a in nodes for a in n['successors']),'Open edge')
    live={a for a,n in nodes.items() if n['return']}
    while True:
        expanded=live|{a for a,n in nodes.items() if any(b in live for b in n['successors'])}
        if expanded==live:break
        live=expanded
    require(entry in live,'No normal return from entry')
    initial=(ALL&~zero_mask,0);work=[(entry,initial)];seen=set();returns=set();calls=set();assumed=set()
    while work:
        a,mode=work.pop()
        if a not in live or (a,mode) in seen:continue
        seen.add((a,mode));require(len(seen)<10000,'State bound exceeded');n=nodes[a]
        for op,value in n['actions']:
            if op=='set':mode=(mode[0]&~value,mode[1]|value)
            elif op=='clear':mode=(mode[0]&~value,mode[1]&~value)
            elif op=='call':
                require(value in contracts,f'Unproved synchronous callee {value:#x}')
                c=contracts[value];require(not (mode[0]|mode[1])&c['zeroMask'],'Callee entry-mode guard not established')
                calls.add(value)
                if c.get('assumed'):assumed.add(value)
            else:raise ValueError('Unexpected action on returning path')
        if n['return']:
            require(mode==initial,'Normal return changes incoming MODE1');returns.add(a)
        work.extend((b,mode) for b in n['successors'])
    require(returns,'No normal return checked')
    return dict(states=len(seen),entryZeroMask=hex(zero_mask),returnSites=[hex(a) for a in sorted(returns)],
                synchronousCallees=[hex(a) for a in sorted(calls)],
                nonreturnOnlyNodes=len(nodes.keys()-live),
                conditionalMode1Identity=True,assumedCallees=[hex(a) for a in sorted(assumed)],
                terminationProven=False)


def build(firmware):
    m=json.loads(MANIFEST.read_text());require(sha(firmware)==SYX_SHA,'Wrong firmware')
    ldr=unpack(firmware);require(sha(ldr)==LDR_SHA,'Wrong loader image');mem=BootMemory(ldr)
    def code(a,n):return mem.read(l2_visa_byte(a,n) if 0xba0000<=a<0xbc0000 else visa_byte(a,n),n)
    require((m['firmwareSyxSha256'],m['firmwareLdrSha256'])==(SYX_SHA,LDR_SHA),'Identity drift')
    inv={int(a,16):(n,k) for a,n,k in m['instructions']}
    require(len(inv)==len(m['instructions']),'Duplicate instruction')
    for s in m['spans']:
        start=int(s['start'],16);end=int(s['endExclusive'],16)
        require(s['size']==2*(end-start) and sha(code(start,s['size']))==s['sha256'],'Span drift')
        cursor=start;count=0
        while cursor<end:
            require(cursor in inv and inv[cursor][0] in (2,4,6),'Partition gap')
            cursor+=inv[cursor][0]//2;count+=1
        require(cursor==end and count==s['reviewedInstructions'],'Partition overlap/end')
    actions={}
    for a,op in [(0x82fe8b,'set'),(0x82feba,'clear'),(0x82feca,'set'),(0x82fedc,'clear'),
                 (0x82fee4,'set'),(0x82ff24,'clear'),(0x82c8cb,'set'),(0x82c8d5,'clear'),
                 (0x1cbedb,'set'),(0x1cbee5,'clear')]:
        require(bitop(code(a,6))==(op,2,SIMD),'SIMD action drift');actions[a]=[(op,SIMD)]
    nr1=graph(code,inv,actions,0x833668)
    nonreturn1=no_return(nr1,0x833668)
    require(instruction(code(0xbb80b9,2),0,1)==0x0081,'Expected IDLE')
    require(direct_control(code(0xbb80ba,6),0xbb80ba)==
            dict(condition=31,call=False,target=0xbb80b9,delayed=False),'Closed IDLE back edge')
    nr2=graph(code,inv,actions,0x8336c8,{0x833668})
    nonreturn2=no_return(nr2,0x8336c8)
    # Fixed allocation-size provenance: both loop entry/reentry R4 loads,
    # allocator R12=PASS R4, and no intervening R12 write (negative inventory).
    for a in (0x82fe62,0x82fe82):require(immediate(code(a,4))==(4,0x4c00),'Allocation byte count')
    require(instruction(code(0x82e17c,6),0)==0x6cbff7821c40,'R12 size forwarding')
    require(immediate(code(0x1cbe86,4))==(2,4),'memset minimum size')
    require(instruction(code(0x1cbe8d,6),0)==0x707e0000a0c2,'memset signed count compare')
    # The reviewed input is 19456 (>4); only this small-count branch is pruned.
    gates={0x1cbe94:(1,0x1cbf0b,True,False)}
    fill=graph(code,inv,actions,0x1cbe86,gates=gates)
    fill_proof=prove(fill,0x1cbe86,{})
    allocator=graph(code,inv,actions,0x82e179,{0x8336c8})
    allocation_proof=prove(allocator,0x82e179,{0x1cbe86:dict(zeroMask=SIMD)})
    buffer=graph(code,inv,actions,0x82c8a2,{0x8336c8})
    buffer_proof=prove(buffer,0x82c8a2,{})
    # Numeric/layout witnesses; alignment arithmetic itself is hash-bound
    # manual review, not execution of a made-up full instruction decoder.
    for a,expected in [(0x82fe57,(10,0x1300)),(0x82fe59,(11,16)),(0x82fe60,(15,4)),
                       (0x82fe5d,(14,0x3167f0)),(0x82e182,(1,7)),(0x82e187,(1,-8)),
                       (0x82e18f,(1,0x83a316e0))]:
        require(immediate(code(a,inv[a][0]))==expected,'Buffer layout/alignment witness')
    # Replay the previous math leaf proof from its original reviewed bytes.
    old=json.loads((DOC/'modifier-init-checkpoints.json').read_text())
    span=next(s for s in old['spans'] if s['entry']=='0x1cb77a')
    start=int(span['start'],16);end=start+span['size']//2
    require(sha(code(start,span['size']))==span['sha256'],'Math leaf bytes changed')
    math_inv={int(a,16):(n,k) for a,n,k in old['instructions'] if start<=int(a,16)<end}
    require(register_move(code(0x1cb77f,4))==(0x1c,0x72),'Shared I12 save')
    require(bitop(code(0x1cb781,6))==('set',2,0x800000),'Temporary BDCST1')
    require(move_with_compute(code(0x1cb7e0,6))==(0x72,0x1c),'Shared I12 restore')
    math_actions={0x1cb77f:[('save',0x1c)],0x1cb781:[('set',0x800000)],0x1cb7e0:[('restore',0x1c)]}
    math_proof=init_proof(init_graph(code,math_inv,math_actions,0x1cb77a,52),0x1cb77a,set())
    root=graph(code,inv,actions,0x82fe42,{0x8336c8})
    contracts={0x82e179:dict(zeroMask=SIMD),0x82c8a2:dict(zeroMask=SIMD),0x1cb77a:dict(zeroMask=0)}
    try:prove(root,0x82fe42,contracts)
    except ValueError as e:require(str(e)=='Unproved synchronous callee 0x1cb13a','Unexpected root blocker')
    else:raise ValueError('Open division was incorrectly certified')
    # This is an explicit dependency calculation, not a newly closed initializer.
    conditional=prove(root,0x82fe42,{**contracts,0x1cb13a:dict(zeroMask=SIMD,assumed=True)})
    return dict(schemaVersion=1,date='2026-10-22',productionVersion='0.3.13',
        reviewedSpans=len(m['spans']),instructionBoundaries=len(inv),
        method='Native operand readers, hash-bound manual partitions, nonreturn CFGs and guarded symbolic MODE1 identities; no firmware execution.',
        nonreturnCertificates={'0x833668':nonreturn1,'0x8336c8':nonreturn2},
        falseFallthroughsExcluded=['0x82c903 -> 0x82c90a','0x82e1c6 -> 0x82e1ce','0x8336dc -> 0x8336e4'],
        closedBufferContracts={'0x1cbe86_R12_0x4c00':fill_proof,'0x82e179_R4_0x4c00':allocation_proof,'0x82c8a2':buffer_proof},
        layout=dict(bufferCount=4,bytesPerBuffer=0x4c00,normalWordsPerBuffer=0x1300,recordBase='0x3167f0',recordStrideAddressUnits=16,
                    alignmentBytes=8,alignmentExpression='((offset + 7) & 0xfffffff8) + 0x83a316e0, modulo 2^32',
                    memoryCapacityAndNoWrapProven=False),
        mathLeafModeOnly=dict(proof=math_proof,simdSharedRegisterExtension=True,
            basis='Core PRM rev1.5 section 4-59/60 and 14-35: unconditional MODE1/I12 shared-register moves have no implicit PEy destination. Reviewed I12 token is not overwritten before restoration. No SIMD numerical output proof.'),
        initializer82fe42=dict(closed=False,remainingSynchronousDependency='0x1cb13a',conditionalDiagnostic=conditional),
        remainingInitializers=['0x82c228','0x82fe42','0x80f1ba','0x8289bc','0x1c8b15'],
        scope='Normal finite returns; scalar entry for buffer/allocator/root, known allocation size, reviewed ABI/memory integrity and no asynchronous exceptions or nonlocal transfers. Fatal-only calls have unbounded effects. Full arbitrary-input memset correctness and termination are not claimed.',
        compactReturnEncodingIndependentlyProven=False,runtimeModeAtStoreProven=False,
        fullRangeEncodingProven=False,generatorWriteSupportAdded=False,newPhysicalExports=0,newReaDecompilation=False)


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--firmware',required=True,type=Path)
    ap.add_argument('--write',action='store_true');args=ap.parse_args();result=build(args.firmware.read_bytes())
    if args.write:OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    else:require(json.loads(OUT.read_text())==result,'Stale buffer audit')
    print(json.dumps({k:result[k] for k in ('reviewedSpans','instructionBoundaries','initializer82fe42','runtimeModeAtStoreProven')}))

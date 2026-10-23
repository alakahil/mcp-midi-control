#!/usr/bin/env python3
"""Specialize the reviewed global callback to PID 0x3a16, operations 10 and 9.

Native control operands are decoded independently of exploratory SLEIGH. Data
register liveness and the absence of MODE1 writes in non-control instructions
remain hash-bound manual review. This is a route certificate, not CPU execution,
termination proof, full transitive MODE1 closure, or preset-writing support.
"""
import argparse
import json
import struct
from pathlib import Path

from global_scale_cache import immediate, signed, dm7
from modifier_caller_audit import direct_control
from modifier_mode_audit import visa_byte
from modifier_quantization_audit import DOC
from modifier_sharc_audit import indirect_jump, memory_move
from modifier_value_path_audit import BootMemory
from pitch_display import instruction, unpack, SYX_SHA, LDR_SHA
from six_field_resolution import require, sha

MANIFEST = DOC/'modifier-op10-checkpoints.json'
OUT = DOC/'modifier-op10-audit.json'
PID = 0x3a16


def integer_compare(data):
    """Only compact signed COMP and unconditional 32-bit COMP/COMPU."""
    if len(data) == 2:
        v = instruction(data,0,1)
        require(v & 0xff00 == 0xc300, 'Not compact integer COMP')
        return (v >> 4 & 15, v & 15, False)
    require(len(data) == 4, 'Expected bounded integer compare')
    v = instruction(data,0,2)
    require(v & 0xffffff00 in (0x0180a000,0x0180b000), 'Unsupported compare variant')
    return (v >> 4 & 15, v & 15, bool(v & 0x1000))


def compare_condition(condition, left, right, unsigned=False):
    require(condition in (0,1,2,16,17,18), 'Not an integer comparison condition')
    left &= 0xffffffff; right &= 0xffffffff
    if not unsigned:
        left, right = signed(left,32), signed(right,32)
    return {0:left==right,1:left<right,2:left<=right,
            16:left!=right,17:left>=right,18:left>right}[condition]


def control(data, at):
    if len(data) == 6 and instruction(data,0) >> 32 == 0x1804:
        return dict(condition=31,call=True,target=instruction(data,0)&0xffffffff,delayed=True)
    try:
        return direct_control(data,at)
    except ValueError:
        pass
    try:
        m,i,delayed = indirect_jump(data)
    except ValueError:
        return None
    require((m,i,delayed) == (14,12,True), 'Unresolved indirect callback transfer')
    return dict(condition=31,call=False,target=None,delayed=True)


def trace(code, rows, guards, operation, pid=PID, entry=0x80f751):
    """Explore both sides of unknown branches; prune only independently checked gates.

    rows is the manually reviewed native partition. The caller PID/operation and
    literal-register liveness are explicit review premises, not inferred by a CPU
    emulator here. Unknown reachable targets fail; no omitted branch is ignored.
    """
    require(type(operation) is int and operation in (9,10) and type(pid) is int and pid==PID,
            'Outside reviewed PID/operation scope')
    require(len(rows)==len({a for a,_ in rows}), 'Duplicate native boundary')
    sizes=dict(rows); require(all(n in (2,4,6) for n in sizes.values()), 'Invalid instruction size')
    require(len(guards)==len({int(g['at'],16) for g in guards}), 'Duplicate gate')
    gates={int(g['at'],16):g for g in guards}
    todo=[entry];seen=set();covered=set();calls=set();unknown=set();decisions={};returns=set()
    while todo:
        at=todo.pop()
        if at in seen:continue
        require(at in sizes,'Reachable target outside reviewed partition: '+hex(at))
        seen.add(at);covered.add(at)
        n=sizes[at];data=code(at,n);ctl=control(data,at);nxt=at+n//2
        taken=None
        if at in gates:
            g=gates[at]
            require(ctl is not None and not ctl['call'] and ctl['target'] is not None,'Gate without direct branch')
            ca,la=int(g['compare'],16),int(g['load'],16)
            require(ca in sizes and la in sizes,'Missing guard instruction')
            left,right,uns=integer_compare(code(ca,sizes[ca]))
            reg,value=immediate(code(la,sizes[la]))
            require(g['lhs'] in ('pid','operation'),'Unknown guard source')
            require(left==(15 if g['lhs']=='pid' else 9) and right==reg,'Guard operand mismatch')
            require(ca+sizes[ca]//2==at,'Flag-producing COMP must immediately precede branch')
            taken=compare_condition(ctl['condition'],pid if left==15 else operation,value,uns)
            decisions[at]=dict(at=hex(at),source=g['lhs'],bound=value,unsigned=uns,taken=taken)
        if ctl and ctl['delayed']:
            for _ in range(2):
                require(nxt in sizes,'Missing delay instruction')
                require(control(code(nxt,sizes[nxt]),nxt) is None,'Control transfer inside delay slot')
                covered.add(nxt);nxt+=sizes[nxt]//2
        if ctl is None:
            require(at not in gates,'Ignored gate');todo.append(nxt)
        elif ctl['call']:
            calls.add((at,ctl['target']));todo.append(nxt)
        elif ctl['target'] is None:
            returns.add(at)
        elif taken is not None:
            todo.append(ctl['target'] if taken else nxt)
        elif ctl['condition']==31:
            todo.append(ctl['target'])
        else:
            unknown.add(at);todo.extend((nxt,ctl['target']))
    require(returns,'No reachable reviewed return')
    require(set(gates)<=seen,'Unused guard')
    require(covered==set(sizes),'Unused or missing partition instruction')
    return dict(operation=operation,pid=hex(pid),instructionCount=len(covered),
                checkedConstantGates=len(decisions),
                conservativeBranches=[hex(a) for a in sorted(unknown)],
                calls=[dict(at=hex(a),target=hex(t)) for a,t in sorted(calls)],
                returns=[hex(a) for a in sorted(returns)],
                decisions=[decisions[a] for a in sorted(decisions)])


def operation_target(table, op):
    require(type(op) is int and op in (9,10),'Outside selected integer operations')
    require(len(table)==6,'Operation table size')
    return table[op-9]


def build(firmware):
    mem=BootMemory(unpack(firmware));manifest=json.loads(MANIFEST.read_text())
    require((manifest['firmwareSyxSha256'],manifest['firmwareLdrSha256'])==(SYX_SHA,LDR_SHA),'Source drift')
    def code(a,n):return mem.read(visa_byte(a,n),n)
    def words(a,n):return list(struct.unpack('<'+'I'*n,mem.read(a,n*4)))
    for s in manifest['spans']:
        a=int(s['address'],16);raw=code(a,s['size']) if s['source']=='visa' else mem.read(a,s['size'])
        require(sha(raw)==s['sha256'],'Native span drift: '+s['name'])
    require(immediate(code(0x80eadf,4))==(12,10) and immediate(code(0x80eae1,4))==(8,PID),'Caller arguments')
    require(instruction(code(0x80eae3,6),0)==0x18040080f751,'Caller link')
    require(instruction(code(0x80f78a,2),0,1)==0xc2f8,'PID transfer to R15')
    require(instruction(code(0x80f780,6),0)==0x70fe04821c40,'Operation transfer and parallel object move')
    desc=words(0x807d65b8+36*PID,9)
    require(desc==[0x557c,0x10,0,0x477ff000,0,0x3f800000,0x3f800000,0,2],'PID descriptor drift')
    require(words(0x282e76c0+4,1)==[0x824a2a] and words(0x282e7684+4,1)==[0x8248aa],'Type1 dispatch drift')
    # Descriptor word7 is zero. LEFTZ(0)=32 sets ASTATX.SV (SHARC+ §24-14,
    # register reference SV), so the optional label-copy call is skipped.
    require(desc[7]==0 and dm7(code(0x824941,4))==(False,2,2,28),'Null label table load')
    require(instruction(code(0x824943,4),0,2)==0x01a88120,'LEFTZ R1,R2')
    require(direct_control(code(0x824945,6),0x824945)==dict(condition=7,call=False,
            target=0x824638,delayed=False),'Zero label table SV branch')
    table=words(0x282e75b8,6)
    require(operation_target(table,9)==0x8237aa and operation_target(table,10)==0x8237f1,'Operation dispatch drift')
    require(instruction(code(0x8237f1,2),0,1)==0xc511,'Increment is not R1+1')
    require(instruction(code(0x8237aa,4),0,2)==0x018cd100,'Op9 TRUNC input')
    require(memory_move(code(0x8237b6,4))==dict(store=True,index=4,modifier=5,
            postmodify=False,register=2,width=2,signExtend=False),'Integer field store')
    require(instruction(code(0x810260,6),0)==0xaa020000155f,'Wrap guard object field')
    require(desc[0]==0x155f*4 and immediate(code(0x810263,6))==(1,65520),'Wrap threshold')
    require(integer_compare(code(0x810266,4))==(2,1,True),'Unsigned wrap comparison')
    require(direct_control(code(0x810268,6),0x810268)==dict(condition=1,call=False,target=0x80f835,delayed=False),'Wrap branch')
    require(immediate(code(0x810271,4))==(12,9) and immediate(code(0x810273,4))==(8,PID),'Recursive arguments')
    require(instruction(code(0x81026e,6),0)==0x9fc03f800000,'Recursive float argument 1.0')
    for a,target in [(0x810275,0x80f751),(0x81035a,0x8244fb),(0x80ff97,0x80f729),
                     (0x824a3a,0x823785),(0x82492c,0x825ebd),(0x825eff,0x1cbc4a),
                     (0x825f3b,0x833c86),(0x825f86,0x833c86),(0x825f9c,0x833c86),
                     (0x825fcd,0x833650)]:
        require(instruction(code(a,6),0)==(0x1804<<32|target),'Call link drift: '+hex(a))
    for a in (0x825f47,0x825fa8):
        ctl=direct_control(code(a,6),a)
        require(ctl['call'] and ctl['target']==0x1cb13a,'Formatter division dependency')
    routes=[trace(code,[(int(a,16),n) for a,n in manifest['callbackInstructions']],manifest['gates'],op) for op in (10,9)]
    expected=[dict(at='0x80ff97',target='0x80f729'),dict(at='0x810275',target='0x80f751'),dict(at='0x81035a',target='0x8244fb')]
    require(all(r['calls']==expected for r in routes),'Specialized call frontier drift')
    return dict(schemaVersion=1,date='2026-10-22',productionVersion='0.3.13',
        sources={k:manifest[k] for k in ('firmwareSyxSha256','firmwareLdrSha256')},
        method=manifest['method'],checkpointCount=len(manifest['spans']),routes=routes,
        descriptor=dict(address='0x808590d0',objectByteOffset='0x557c',type=1,flags='0x10',
                        minimumFloat=0,maximumFloat=65520,displayScaleFloat=1,precision=0),
        integerRoute=dict(handler='0x823785',op10Target='0x8237f1',op10='R1 + 1, then reviewed MIN/MAX clamp',
                          op9Target='0x8237aa',op9='TRUNC F0, then the same clamp',
                          nativeModeWritesInReviewedIntegerPaths=[],furtherCallsInReviewedIntegerPaths=[]),
        resetRoute=dict(guard='unsigned object[0x557c] >= 0xfff0',recursiveOperation=9,
                        recursivePid=hex(PID),floatInputBits='0x3f800000',
                        terminationAndAllRuntimeMemoryValuesProven=False),
        nativeModeWritesInReviewedCallbackInstructions=[],
        formatter=dict(entry='0x825ebd',noDirectModeWritesInReviewedBody=True,
                       callees=['0x1cbc4a','0x833c86','0x1cb13a','0x833650'],
                       optionalLabelCopyExcludedByNullDescriptorAndLeftzSv=True,
                       priorPowRestoreCertificate='modifier-caller-audit.json',
                       priorDivisionAlgebra='modifier-mode-audit.json',
                       compactDivisionReturnOpcodeIndependentlyReconciled=False),
        selectedCallbackTransitiveClosureProven=False,whole80ea77Proven=False,
        unresolved=['Inherited division return 0x1cb17a/0x0afe: reconcile compact opcode and delay semantics.',
                    'Outer caller 0x80ea77 also calls 0x833a5c, 0x824d84, 0x82b744, 0x1cb1d6.',
                    'Scalar ABI, valid memory, no asynchronous interference; no general recursion-termination proof.',
                    'Other coreTask callers and interrupt dispatch/return remain open.'],
        runtimeModeAtStoreProven=False,fullRangeEncodingProven=False,generatorWriteSupportAdded=False,
        newPhysicalExports=0,newReaDecompilation=False,
        nextStep='Reconcile SHARC+ compact-return encoding, including the existing division certificate; keep 6.47 blocked.')


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--firmware',type=Path,required=True);ap.add_argument('--write',action='store_true')
    args=ap.parse_args();result=build(args.firmware.read_bytes())
    if args.write:OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    else:require(json.loads(OUT.read_text())==result,'Stale op10 audit')
    print(json.dumps(dict(checkpoints=result['checkpointCount'],routes=[{k:r[k] for k in ('operation','instructionCount','checkedConstantGates','calls')} for r in result['routes']],closure=result['selectedCallbackTransitiveClosureProven'])))

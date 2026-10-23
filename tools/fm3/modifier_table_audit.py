#!/usr/bin/env python3
"""Bound 82c228 table-init effects without hiding its remaining call tree.

Six manually reviewed, hash-bound native partitions. Two math leaves restore
MODE1 inside 48-bit return delay slots; their callers require scalar entry.
The direct constructor-call catalog is NOT a callee-effect certificate.
"""
import argparse
import json
from pathlib import Path

from global_scale_cache import immediate
from modifier_buffer_audit import graph, prove, build as buffer_build, SIMD, delayed_return48
from modifier_init_audit import prove_mode
from modifier_mode_audit import visa_byte, bitop, move_with_compute, RND32, TRUNCATE
from modifier_value_path_audit import BootMemory
from pitch_display import instruction, unpack, SYX_SHA, LDR_SHA
from six_field_resolution import require, sha

DOC=Path(__file__).resolve().parents[2]/'docs/fm3/parameter-evidence'
MANIFEST=DOC/'modifier-table-checkpoints.json'
OUT=DOC/'modifier-table-audit.json'
BDCST1=1<<23


def large_count(count):
    """Inputs that exclude the native signed R12 < 4 gate, not a memory bound."""
    require(type(count) is int and 4<=count<=0x7fffffff,'Large-count signed guard not met')
    return count


def callees(nodes):
    return {v for n in nodes.values() for op,v in n['actions'] if op=='call'}


def dependency_diagnostic(nodes,entry,known):
    """Record every remaining direct dependency; fail before assuming any."""
    missing=callees(nodes)-known.keys()
    require(missing,'Expected an open dependency set')
    try:prove(nodes,entry,known)
    except ValueError as e:require(str(e).startswith('Unproved synchronous callee '),'Unexpected proof failure')
    else:raise ValueError('Unproved call scope accepted')
    conditional=prove(nodes,entry,{**known,**{a:dict(zeroMask=SIMD,assumed=True) for a in missing}})
    require(set(conditional['assumedCallees'])=={hex(a) for a in missing},'Hidden dependency')
    return dict(closed=False,directDistinctCallees=len(callees(nodes)),
                knownDirectCallees=[hex(a) for a in sorted(callees(nodes)&known.keys())],
                unresolvedDirectCallees=[hex(a) for a in sorted(missing)],
                conditionalDiagnostic=conditional)


def build(firmware):
    # Reuse only after replaying the prior nonreturn/native-buffer certificates.
    previous=buffer_build(firmware)
    require(previous==json.loads((DOC/'modifier-buffer-audit.json').read_text()),'Prior buffer audit drift')
    m=json.loads(MANIFEST.read_text())
    require((m['firmwareSyxSha256'],m['firmwareLdrSha256'])==(SYX_SHA,LDR_SHA),'Firmware identity drift')
    require(sha(firmware)==SYX_SHA,'Wrong firmware');ldr=unpack(firmware)
    require(sha(ldr)==LDR_SHA,'Wrong loader');mem=BootMemory(ldr)
    def code(a,n):return mem.read(visa_byte(a,n),n)
    inv={int(a,16):(n,k) for a,n,k in m['instructions']}
    require(len(inv)==len(m['instructions']),'Duplicate instruction')
    for s in m['spans']:
        start=int(s['start'],16);end=int(s['endExclusive'],16)
        require(s['size']==2*(end-start) and sha(code(start,s['size']))==s['sha256'],'Reviewed span drift')
        cursor=start;count=0
        while cursor<end:
            require(cursor in inv and inv[cursor][0] in (2,4,6),'Instruction partition gap')
            cursor+=inv[cursor][0]//2;count+=1
        require(cursor==end and count==s['reviewedInstructions'],'Instruction partition boundary')
    actions={}
    for a,op in [(0x82c2b7,'set'),(0x82c2eb,'clear'),(0x82c30c,'set'),(0x82c315,'clear'),
                 (0x82f8af,'set'),(0x82f8e2,'clear'),(0x82f8e8,'set'),(0x82f916,'clear'),
                 (0x82f91c,'set'),(0x82f94a,'clear'),(0x82f950,'set'),(0x82f97e,'clear'),
                 (0x82f984,'set'),(0x82f9b2,'clear'),(0x82f9b8,'set'),(0x82f9e6,'clear'),
                 (0x82f9ec,'set'),(0x82fa1a,'clear')]:
        require(bitop(code(a,6))==(op,2,SIMD),'SIMD mask action');actions[a]=[(op,SIMD)]
    math=[]
    for entry,save,sett,clear,ret,restore in [
            (0x1cb5b4,0x1cb5c0,0x1cb5c3,0x1cb5c6,0x1cb60d,0x1cb610),
            (0x834632,0x83463a,0x83463d,0x834640,0x834689,0x83468c)]:
        require(move_with_compute(code(save,6))==(0x1c,0x72),'MODE1 shared I12 save')
        require(move_with_compute(code(restore,6))==(0x72,0x1c),'Shared I12 MODE1 restore')
        require(bitop(code(sett,6))==('set',2,BDCST1),'Broadcast mask')
        require(bitop(code(clear,6))==('clear',2,RND32),'40-bit compute mask')
        require(restore==ret+3,'Restoration must be first 48-bit return delay instruction')
        actions.update({save:[('save',0x1c)],sett:[('set',BDCST1)],
                        clear:[('clear',RND32)],restore:[('restore',0x1c)]})
        g=graph(code,inv,actions,entry)
        proof=prove_mode(g,entry,set())
        math.append(dict(entry=hex(entry),save=hex(save),restore=hex(restore),returnAt=hex(ret),
                         nativeReturn=delayed_return48(code(ret,6)),
                         delayInstructions=[hex(restore),hex(restore+inv[restore][0]//2)],
                         proof=proof,usesCompactReturn=False))
    table_graph=graph(code,inv,actions,0x82f89e)
    table_proof=prove(table_graph,0x82f89e,{0x1cb5b4:dict(zeroMask=0)})
    copy_graph=graph(code,inv,actions,0x82ddb2)
    copy_proof=prove(copy_graph,0x82ddb2,{})
    # Extend the same reviewed large-count memset path to this actual caller.
    require(immediate(code(0x82c234,6))==(12,0xcafbc0),'Caller byte-count load')
    size=large_count(0xcafbc0)
    require(instruction(code(0x82c240,6),0)==0x1804001cbe86,'Caller memset transfer')
    require(immediate(code(0x82c237,6))==(4,0x8157fb20),'Caller buffer base')
    old=json.loads((DOC/'modifier-buffer-checkpoints.json').read_text())
    fill_inv={int(a,16):(n,k) for a,n,k in old['instructions'] if 0x1cbe86<=int(a,16)<0x1cbf0b}
    fill_actions={0x1cbedb:[('set',SIMD)],0x1cbee5:[('clear',SIMD)]}
    fill_proof=prove(graph(code,fill_inv,fill_actions,0x1cbe86,
                          gates={0x1cbe94:(1,0x1cbf0b,True,False)}),0x1cbe86,{})
    root=graph(code,inv,actions,0x82c228,{0x8336c8})
    known={a:dict(zeroMask=SIMD) for a in (0x1cbe86,0x82ddb2,0x82f89e)}
    known[0x1cb5b4]=dict(zeroMask=0)
    root_result=dependency_diagnostic(root,0x82c228,known)
    require(root_result['directDistinctCallees']==12 and len(root_result['unresolvedDirectCallees'])==8,'Root call inventory drift')
    constructors=graph(code,inv,actions,0x82be50)
    constructor_calls=[dict(at=hex(a),target=hex(v)) for a,n in sorted(constructors.items())
                       for op,v in n['actions'] if op=='call']
    require(len(constructor_calls)==44,'Constructor direct call count drift')
    require(not any(op in ('set','clear','save','restore') for n in constructors.values()
                    for op,v in n['actions']),'Unexpected constructor-local MODE1 action')
    normal_calls=[dict(at=hex(a),target=hex(v)) for a,n in sorted(root.items())
                  for op,v in n['actions'] if op=='call']
    fatal_calls=[hex(a) for a,n in sorted(root.items()) if n['nonreturn']]
    require(len(normal_calls)==16 and len(fatal_calls)==8,'Root call-site partition drift')
    return dict(schemaVersion=1,date='2026-10-22',productionVersion='0.3.13',
        method='Hash-bound native partitions, guarded call graph, shared-register MODE1 tokens and checked 48-bit return delay slots. No CPU execution.',
        reviewedSpans=len(m['spans']),instructionBoundaries=len(inv),
        mathLeafCertificates=math,
        tableInitializer=dict(entry='0x82f89e',proof=table_proof,scope='Scalar entry; seven SIMD loops and seven calls of 0x1cb5b4.'),
        stridedTransferHelper=dict(entry='0x82ddb2',proof=copy_proof,scope='MODE1 only; no numerical/memory-copy correctness or termination claim.'),
        largeFillExtension=dict(entry='0x1cbe86',caller='0x82c240',count=size,bufferBase='0x8157fb20',
            acceptedCountRange=[4,0x7fffffff],proof=fill_proof,
            scope='The signed small-count branch is excluded by the checked caller count. All other unknown branch arms remain. Valid memory is a premise; allocation capacity is not proved.'),
        initializer82c228={**root_result,'normalCallSites':normal_calls,'fatalCallSites':fatal_calls,
                          'neighbour0x82c431Excluded':True,'eightFatalGatesKeptBothArms':True},
        constructorCatalog=dict(entry='0x82be50',directCallSites=constructor_calls,
            distinctCallees=len(callees(constructors)),localMode1WritesObserved=0,calleeEffectsCertified=False,
            scope='Direct targets within the reviewed function only; NOT a transitive inventory or a MODE1 preservation proof.'),
        correctedDiagnosticLabel=dict(mask='0x800000',correctName='BDCST1',priorIncorrectLabel='Temporary TRUNCATE',
            truncateMask=hex(TRUNCATE),evidence='Core PRM rev1.5 Table29-19, page29-55',numericMasksOrProofResultsChanged=False),
        prerequisites=dict(bufferAuditReplayed=True,bufferAuditSha256=sha((DOC/'modifier-buffer-audit.json').read_bytes())),
        scope='Reviewed ABI, valid memory and saved-register integrity, ordinary control continuations, no asynchronous exceptions/nonlocal transfers. Mathematical leaves support shared MODE1/I12 transfers in SISD and SIMD; table callers require scalar entry.',
        remainingInitializers=['0x82c228','0x82fe42','0x80f1ba','0x8289bc','0x1c8b15'],
        compactReturnEncodingIndependentlyProven=False,runtimeModeAtStoreProven=False,
        fullRangeEncodingProven=False,generatorWriteSupportAdded=False,newPhysicalExports=0,newReaDecompilation=False)


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--firmware',type=Path,required=True)
    ap.add_argument('--write',action='store_true');args=ap.parse_args();result=build(args.firmware.read_bytes())
    if args.write:OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    else:require(json.loads(OUT.read_text())==result,'Stale table-init audit')
    print(json.dumps({k:result[k] for k in ('reviewedSpans','instructionBoundaries','runtimeModeAtStoreProven')}))
    print(json.dumps(result['initializer82c228']))

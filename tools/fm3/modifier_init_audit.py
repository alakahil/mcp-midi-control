#!/usr/bin/env python3
"""Bound one SID52 initializer and a math leaf; keep whole-runtime claims open.

The instruction inventory is a hash-bound manual review, not a complete ISA
decoder. Native readers check branches, returns and the MODE1 slice. Symbolic
verification covers both arms of unknown branches and all synchronous calls.
The independent ADI DXE supplies symbol-bound corroboration, not an opcode oracle.
"""
import argparse
import json
import struct
from pathlib import Path

from global_scale_cache import immediate, register_move, dm7
from modifier_caller_audit import direct_control
from modifier_interrupt_audit import l2_visa_byte, immediate_loop
from modifier_mode_audit import visa_byte, bitop, move_with_compute, ALL
from modifier_return_audit import cross_binary_equal
from modifier_sharc_audit import indirect_jump
from modifier_value_path_audit import BootMemory
from pitch_display import instruction, unpack, SYX_SHA, LDR_SHA
from six_field_resolution import require, sha

DOC=Path(__file__).resolve().parents[2]/'docs/fm3/parameter-evidence'
MANIFEST=DOC/'modifier-init-checkpoints.json'
OUT=DOC/'modifier-init-audit.json'


def swap_parcels(data):
    require(len(data)>0 and len(data)%2==0,'Whole VISA parcels required')
    return b''.join(data[i:i+2][::-1] for i in range(0,len(data),2))


class AdiDxe:
    """Bounded ELF32-LE header/symbol reader; executable contents use BE parcels.

    A VISA section uses two file bytes per address unit. This intentionally
    rejects the ISA IVT section rather than applying the VISA scaling to it.
    """
    def __init__(self,data):
        self.data=data
        require(len(data)>=52 and data[:7]==b'\x7fELF\x01\x01\x01','Expected ELF32 little-endian header')
        h=struct.unpack_from('<16sHHIIIIIHHHHHH',data)
        require(h[1:3]==(2,0x85) and h[8]==52 and h[11]==40,'Unexpected ADI ELF format')
        require(0<h[12]<4096 and h[13]<h[12],'Invalid section table')
        table=self.read(h[6],40*h[12])
        keys=('nameOffset','type','flags','address','offset','size','link','info','align','entrySize')
        self.sections=[dict(zip(keys,struct.unpack_from('<10I',table,i*40))) for i in range(h[12])]
        names=self.payload(self.sections[h[13]])
        for s in self.sections:s['name']=self.string(names,s['nameOffset'])
        self.symbols=[]
        for s in self.sections:
            if s['type']!=2:continue
            require(s['entrySize']==16 and s['size']%16==0 and s['link']<len(self.sections),'Invalid symbols')
            strings=self.payload(self.sections[s['link']]);raw=self.payload(s)
            for o in range(0,len(raw),16):
                name,address,size,info,other,index=struct.unpack_from('<IIIBBH',raw,o)
                self.symbols.append(dict(name=self.string(strings,name),address=address,size=size,
                                         section=index,kind=info&15))

    def read(self,offset,size):
        require(type(offset) is int and type(size) is int and offset>=0 and size>=0 and
                offset+size<=len(self.data),'Truncated ELF field')
        return self.data[offset:offset+size]

    def payload(self,section):
        return self.read(section['offset'],section['size'])

    @staticmethod
    def string(data,offset):
        require(0<=offset<len(data),'String offset outside table')
        end=data.find(b'\0',offset);require(end>=0,'Unterminated ELF string')
        return data[offset:end].decode('utf-8')

    def symbol(self,name):
        rows=[s for s in self.symbols if s['name']==name]
        require(len(rows)==1,'Missing or ambiguous symbol: '+name)
        return rows[0]

    def visa(self,address,size):
        require(type(address) is int and type(size) is int and size>0 and size%2==0,'VISA read alignment')
        rows=[s for s in self.sections if s['flags']&4 and
              s['name'].startswith('dxe_block3_sw') and s['address']<=address and
              2*(address-s['address'])+size<=s['size']]
        require(len(rows)==1,'VISA read outside unique reviewed executable section')
        s=rows[0];return swap_parcels(self.read(s['offset']+2*(address-s['address']),size))


def prove_mode(nodes,entry,closed_calls):
    """All finite returning paths preserve all MODE1 bits; termination not claimed."""
    todo=[(entry,(ALL,0),())];seen=set();returns=set();calls=set()
    while todo:
        at,mode,tokens=todo.pop();key=(at,mode,tokens)
        if key in seen:continue
        seen.add(key);require(len(seen)<20000,'Mode state bound exceeded')
        require(at in nodes,'Path leaves reviewed inventory')
        node=nodes[at];saved=dict(tokens)
        for op,value in node['actions']:
            if op=='save':saved[value]=mode
            elif op=='restore':
                require(value in saved,'Restore from clobbered/untracked token');mode=saved[value]
            elif op=='clobber':saved.pop(value,None)
            elif op=='clear':mode=(mode[0]&~value,mode[1]&~value)
            elif op=='set':mode=(mode[0]&~value,mode[1]|value)
            elif op=='call':
                require(value in closed_calls,'Unproved synchronous callee');calls.add(value)
                # No saved-token liveness across calls is certified here.
                saved.clear()
            else:raise ValueError('Unreviewed MODE1 action')
        if node['return']:
            require(not node['successors'] and mode==(ALL,0),'Return changes incoming MODE1')
            returns.add(at)
        else:
            require(node['successors'],'Open nonreturn endpoint')
            for nxt in node['successors']:todo.append((nxt,mode,tuple(sorted(saved.items()))))
    require(returns,'No reviewed return reached')
    return dict(states=len(seen),returnSites=[hex(a) for a in sorted(returns)],
                synchronousCallees=[hex(a) for a in sorted(calls)],
                allReturningPathsPreserveIncomingMode1=True,terminationProven=False)


def native_graph(code,inventory,actions,entry,sid):
    require(sid==52,'This caller certificate is restricted to SID52')
    loops={}
    for address,(size,kind) in inventory.items():
        if kind=='loop-imm':
            loop=immediate_loop(code(address,size),address)
            require(loop['count']>0 and loop['target'] in inventory,'Open hardware loop')
            require(inventory[loop['target']][1]=='plain','Unreviewed loop endpoint')
            loops.setdefault(loop['target'],[]).append(address+size//2)
    nodes={};work=[entry]
    while work:
        a=work.pop()
        if a in nodes:continue
        require(a in inventory,'Missing reviewed instruction boundary')
        size,kind=inventory[a];data=code(a,size);nxt=a+size//2
        ops=list(actions.get(a,[]));ret=False;delay=False;target=None;condition=31
        if kind=='ccall':
            v=instruction(data,0);require(v>>32==0x1804,'Unexpected C-call form')
            target=v&0xffffffff;delay=True;ops.append(('call',target))
        elif kind=='branch':
            ctl=direct_control(data,a);require(not ctl['call'],'Unexpected call in branch inventory')
            target=ctl['target'];condition=ctl['condition'];delay=ctl['delayed']
        elif kind=='abi-return':
            require(indirect_jump(data)==(14,12,True),'Unexpected ABI return');ret=True;delay=True
        elif kind=='return48':
            require(a==0x1cb7e8 and instruction(data,0)==0x0a3e04029c00,'Unexpected Type11a math return')
            ret=True;delay=True
        elif kind=='indirect':raise ValueError('Unresolved indirect transfer is reachable')
        else:require(kind in ('plain','loop-imm'),'Unknown inventory class')
        if delay:
            for _ in range(2):
                require(nxt in inventory and inventory[nxt][1]=='plain','Missing/control-bearing delay slot')
                require(nxt not in loops,'Hardware loop ends in bundled delay slot')
                ops+=actions.get(nxt,[]);nxt+=inventory[nxt][0]//2
        if ret:successors=[]
        elif kind=='branch':
            if a==0x8336e7:
                require((condition,target,delay)==(8,0x833719,False),'SID52 gate changed')
                successors=[target]
            else:successors=[target]+([] if condition==31 else [nxt])
        else:successors=[nxt]
        # Nondeterministically repeat or exit: includes all finite iteration
        # counts without relying on legacy SLEIGH's incorrect signed24 target.
        successors+=loops.get(a,[])
        nodes[a]=dict(actions=ops,successors=successors,**{'return':ret})
        work+=successors
    return nodes


def build(firmware,dxe):
    m=json.loads(MANIFEST.read_text())
    require((m['firmwareSyxSha256'],m['firmwareLdrSha256'])==(SYX_SHA,LDR_SHA),'Firmware identity drift')
    require(sha(firmware)==SYX_SHA,'Wrong firmware')
    mem=BootMemory(unpack(firmware))
    def code(a,n):return mem.read(l2_visa_byte(a,n) if 0xba0000<=a<0xbc0000 else visa_byte(a,n),n)
    for s in m['spans']:
        require(sha(code(int(s['start'],16),s['size']))==s['sha256'],'Reviewed span changed')
    inv={int(a,16):(n,k) for a,n,k in m['instructions']}
    require(len(inv)==len(m['instructions']),'Duplicate instruction witness')
    require(all(n in (2,4,6) for n,k in inv.values()),'Invalid instruction size')
    require(instruction(code(0x82def9,6),0)==0x1804008304ab,'coreTask initializer link')
    require(immediate_loop(code(0x8303ca,6),0x8303ca)==
            dict(count=2,target=0x830418,modeF1=True),'Initializer F1 loop')
    # Source SID52 is reloaded through the reviewed wrapper stack slots. The
    # SEC SID helper at 836ac8 returns R4 unchanged; this is not a claim about
    # arbitrary incoming IDs or the later execution of registered callbacks.
    for a in (0x8304fa,0x83050e):require(immediate(code(a,4))==(4,52),'Initializer SID')
    for a,r in [(0x836acd,(True,6,4,-16)),(0x836acf,(True,6,4,-12)),
                (0x836ad1,(True,6,4,-8)),(0x8369e5,(True,6,4,-28)),
                (0x836a10,(False,6,4,-28)),(0x836a36,(False,6,4,-28)),
                (0x836a56,(False,6,4,-28)),(0x836a7c,(False,6,4,-28)),
                (0xbb8173,(True,6,4,-28)),(0xbb818c,(False,6,4,-28)),
                (0xbb81e0,(True,6,4,-20)),(0xbb81f9,(False,6,4,-20))]:
        require(dm7(code(a,4))==r,'SID stack provenance')
    require(register_move(code(0x836acb,4))==(0,4),'SEC SID helper identity')
    require(instruction(code(0x8336e4,6),0)==0x023e3810cc14,'SID high-bits extraction')
    actions={}
    for at,reg,op in [(0x8337fc,15,'save'),(0x83382b,15,'restore'),
                      (0x83385e,0,'save'),(0x83386f,0,'restore'),(0x1cb77f,0x1c,'save')]:
        expected=(reg,0x72) if op=='save' else (0x72,reg)
        require(register_move(code(at,4))==expected,'MODE1 token operand')
        actions[at]=[(op,reg)]
    for at,op,mask in [(0x8337fe,'clear',0x1000),(0x833860,'clear',0x1000),(0x1cb781,'set',0x800000)]:
        require(bitop(code(at,6))==(op,2,mask),'MODE1 bit action');actions[at]=[(op,mask)]
    require(move_with_compute(code(0x1cb7e0,6))==(0x72,0x1c),'Math restores saved I12')
    actions[0x1cb7e0]=[('restore',0x1c)]
    actions[0x833831]=[('clobber',15)];actions[0x833871]=[('clobber',0)]
    entries=[int(s['entry'],16) for s in m['spans']]
    graphs={a:native_graph(code,inv,actions,a,52) for a in entries}
    proofs={};visiting=set()
    def close(a):
        if a in proofs:return
        require(a in graphs and a not in visiting,'Open or recursive synchronous call scope')
        visiting.add(a)
        calls={v for n in graphs[a].values() for op,v in n['actions'] if op=='call'}
        for target in calls:close(target)
        proofs[a]=prove_mode(graphs[a],a,set(proofs));visiting.remove(a)
    for a in entries:close(a)

    source=m['dxeSource'];require(len(dxe)==source['size'] and sha(dxe)==source['sha256'],'Wrong independent DXE')
    elf=AdiDxe(dxe)
    attrs=next(s for s in elf.sections if s['name']=='.adi.attributes')
    require(b'ADSP-SC594\0' in elf.payload(attrs),'Wrong ADI target attribute')
    symbols=[]
    for name,address,size in [('__dispatcher_SEC',0x1c069d,110),('__dispatcher_SEC_rtn',0x1c072b,0),
                              ('__dispatcher_rtn',0x1c072e,0),('___lib_setup_c',0x1c0886,142),
                              ('___lib_fdiv',0x1c02a4,78)]:
        s=elf.symbol(name);require((s['address'],s['size'],s['kind'])==(address,size,2),'DXE symbol drift');symbols.append(s)
    tail=cross_binary_equal(code(0x1cbbe9,80),elf.visa(0x1c072e,80),80)
    parcels=[]
    for at,value,meaning in [(0x1c0705,0x0afe,'RTS(DB) candidate'),(0x1c0751,0x0bfe,'RTI(DB) candidate'),
                             (0x1c0913,0x0abe,'RTS candidate')]:
        require(instruction(elf.visa(at,2),0,1)==value,'Symbol-bound return parcel')
        parcels.append(dict(address=hex(at),parcel=hex(value),interpretation=meaning))
    return dict(schemaVersion=1,date='2026-10-22',productionVersion='0.3.13',
        method='Hash-bound manual inventory, native control/MODE1 readers, all-branch symbolic model and symbol-bound ADI DXE comparison; no live execution.',
        checkpointCount=len(m['spans']),uniqueInstructionBoundaries=len(inv),
        newlyClosedInitializer=dict(entry='0x8304ab',sid=52,proof=proofs[0x8304ab],
            scope='Synchronous MODE1 effects under reviewed SID provenance, valid scalar ABI/memory/return behavior, no asynchronous interrupt or exception. Callback registration does not execute the callback.'),
        mathLeaf=dict(entry='0x1cb77a',save='0x1cb77f',temporaryMask='0x800000',restore='0x1cb7e0',
                      return48='0x1cb7e8',proof=proofs[0x1cb77a],usesCompactReturn=False),
        functionProofs={hex(a):proofs[a] for a in sorted(proofs)},
        independentDxe=dict(sha256=source['sha256'],target='ADSP-SC594',symbols=symbols,
                            exactRestorationTailMatch=tail,parcels=parcels,
                            scope='Symbols bind roles and boundaries; source-to-opcode assembler listing is still absent. SC594 evidence is not a runtime test on FM3.'),
        compactReturnEncodingIndependentlyProven=False,
        remainingInitializers=['0x82c228','0x82fe42','0x80f1ba','0x8289bc','0x1c8b15'],
        remainingLoopScopes=['0x82b193 beyond known callback','0x811a83','0x80ea77 beyond reviewed op10 slice'],
        remainingOtherScopes=['object+0x14c op86/PID0x3fad','prior packet operations and post-store returns','active vector, interrupt/exception invariants and compact return encoding'],
        runtimeModeAtStoreProven=False,fullRangeEncodingProven=False,generatorWriteSupportAdded=False,
        newPhysicalExports=0,newReaDecompilation=False)


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--firmware',type=Path,required=True);ap.add_argument('--adi-dxe',type=Path,required=True)
    ap.add_argument('--write',action='store_true');args=ap.parse_args()
    result=build(args.firmware.read_bytes(),args.adi_dxe.read_bytes())
    if args.write:OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    else:require(json.loads(OUT.read_text())==result,'Stale initializer audit')
    print(json.dumps({k:result[k] for k in ('checkpointCount','uniqueInstructionBoundaries',
          'newlyClosedInitializer','mathLeaf','compactReturnEncodingIndependentlyProven','runtimeModeAtStoreProven')}))

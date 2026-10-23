#!/usr/bin/env python3
"""Inventory selected MODE1 write encodings without treating raw hits as code.

No disassembly by linear sweep: every aligned parcel is a candidate start.
Reviewed, hash-bound partitions distinguish boundaries from operand interiors.
Three additional leaf contracts are separate from the coarse writer search.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import struct

from global_scale_cache import immediate
from modifier_buffer_audit import graph
from modifier_init_audit import prove_mode
from modifier_interrupt_audit import l2_visa_byte
from modifier_mode_audit import visa_byte, bitop, move_with_compute, RND32
from modifier_table_audit import DOC
from modifier_value_path_audit import BootMemory
from pitch_display import unpack, SYX_SHA, LDR_SHA
from six_field_resolution import require, sha

MANIFEST = DOC / 'modifier-writers-checkpoints.json'
OUT = DOC / 'modifier-writers-audit.json'
REGIONS = ((0x120000,0x138000,0x28240000), (0x160000,0x178000,0x282c0000),
           (0x180000,0x190000,0x28300000), (0x1c0000,0x1d0000,0x28380000),
           (0x800000,0x83804a,0x80a00000), (0xba0000,0xbc0000,0x20080000))
PACKED_ISA = (0x28240000,0x28240300)
ROUNDING = 0x18000


def readable_intervals(rows, start, end, excluded=()):
    """Partition by boot-row multiplicity; duplicate rows are still ambiguous."""
    require(start < end, 'Empty scan region')
    cuts = {start,end}
    for a,n,*_ in rows:
        if n and a < end and a+n > start:
            cuts.update((max(a,start),min(a+n,end)))
    for a,b in excluded:
        require(a < b, 'Invalid exclusion')
        if a < end and b > start: cuts.update((max(a,start),min(b,end)))
    result = []
    cuts = sorted(cuts)
    for a,b in zip(cuts,cuts[1:]):
        count = sum(r[0] <= a < r[0]+r[1] for r in rows)
        status = ('excluded-format' if any(x <= a < y for x,y in excluded)
                  else 'unmapped' if count == 0 else 'ambiguous' if count > 1 else 'scan')
        if result and result[-1][1] == a and result[-1][2:] == (status,count):
            result[-1] = (result[-1][0],b,status,count)
        else: result.append((a,b,status,count))
    return result


def candidate(raw, offset):
    """Prefix/operand readers, NOT instruction-boundary or legality evidence.

    Type18a: SET/CLR/TGL write, TST/XOR only compare. Type5a/b: conditional
    and unconditional universal-register transfers. Type17: immediate writes.
    Other memory/system/control encodings intentionally remain outside scope.
    """
    if offset+4 > len(raw): return None
    p,q = struct.unpack_from('<HH',raw,offset)
    if p & 0xff10 == 0x1400 and p & 15 in (2,13):
        op = (p >> 5) & 7
        if op not in (0,1,2,4,5) or offset+6 > len(raw): return None
        mask = q << 16 | struct.unpack_from('<H',raw,offset+4)[0]
        return dict(family='Type18a',size=6,register='MODE1' if p & 15 == 2 else 'MODE1STK',
                    operation={0:'set',1:'clear',2:'toggle',4:'test',5:'compare'}[op],
                    mask=hex(mask),writesRegister=op in (0,1,2),
                    relevantWrite=op in (0,1,2) and bool(mask & ROUNDING))
    if p >> 11 == 14 and (q >> 7) & 127 in (0x72,0x7d):
        short = q & 127 == 63
        size = 4 if short else 6
        if offset+size > len(raw): return None
        return dict(family='Type5b' if short else 'Type5a',size=size,
                    register='MODE1' if (q >> 7) & 127 == 0x72 else 'MODE1STK',
                    condition=(p >> 1) & 31,
                    sourceRegister=hex(((p >> 6) & 31)*4+(p & 1)*2+(q >> 15)),
                    writesRegister=True,relevantWrite=True)
    if p & 0xff00 == 0x0f00 and p & 127 in (0x72,0x7d):
        size = 4 if p & 0x80 else 6
        if offset+size > len(raw): return None
        _,value = immediate(raw[offset:offset+size])
        return dict(family='Type17',size=size,register='MODE1' if p & 127 == 0x72 else 'MODE1STK',
                    value=hex(value & 0xffffffff),writesRegister=True,relevantWrite=True)
    return None


def reviewed_inventory(code, manifests):
    """Hash-check each reviewed fragment; leave unreachable gaps unclassified."""
    owners = {}; sources = []
    for path in manifests:
        raw = path.read_bytes(); m = json.loads(raw)
        require((m['firmwareSyxSha256'],m['firmwareLdrSha256']) == (SYX_SHA,LDR_SHA),'Source identity drift')
        inv = {int(a,16):(n,k) for a,n,k in m['instructions']}
        require(len(inv) == len(m['instructions']),'Duplicate instruction')
        used = set()
        for s in m['spans']:
            start = int(s['start'],16); size = s['size']; end = start+size//2
            require(size > 0 and size % 2 == 0 and sha(code(start,size)) == s['sha256'],'Reviewed span drift')
            require(int(s.get('endExclusive',hex(end)),16) == end,'Span endpoint drift')
            fragment = {a:v for a,v in inv.items() if start <= a < end}
            for a,(n,_) in fragment.items():
                require(n in (2,4,6) and a+n//2 <= end,'Partition overrun')
                for parcel in range(a,a+n//2):
                    owner = (a,n)
                    require(parcel not in owners or owners[parcel] == owner,'Conflicting reviewed boundaries')
                    owners[parcel] = owner
                used.add(a)
            require(len(fragment) == s['reviewedInstructions'],'Partition count drift')
        require(used == inv.keys(),'Instructions outside reviewed spans')
        sources.append(dict(file=path.name,sha256=sha(raw),instructions=len(inv)))
    return owners,sources


def classify(address, size, owners):
    if address not in owners: return dict(status='unreviewed')
    start,n = owners[address]
    if start != address:
        return dict(status='inside-reviewed-instruction',owner=hex(start),ownerSize=n)
    if n != size:
        return dict(status='reviewed-boundary-size-conflict',ownerSize=n)
    return dict(status='reviewed-boundary',ownerSize=n)


def leaf_contracts(code, manifest):
    inv = {int(a,16):(n,k) for a,n,k in manifest['instructions']}
    leaves = []
    for entry,save,clear,restore in [(0x834566,0x83456c,0x834572,0x8345c2),
                                    (0x8345ca,0x8345d0,0x8345d6,0x834629),
                                    (0x8349f4,0x8349f4,0x8349f7,0x834a14)]:
        require(move_with_compute(code(save,6)) == (0x1d,0x72),'Shared I13 save drift')
        require(bitop(code(clear,6)) == ('clear',2,RND32),'RND32 clear drift')
        require(move_with_compute(code(restore,6)) == (0x72,0x1d),'Shared I13 restore drift')
        actions = {save:[('save',0x1d)],clear:[('clear',RND32)],restore:[('restore',0x1d)]}
        nodes = graph(code,inv,actions,entry)
        leaves.append(dict(entry=hex(entry),save=hex(save),restore=hex(restore),
                           proof=prove_mode(nodes,entry,set()),usesCompactReturn=False))
    return leaves


def build(firmware):
    require(sha(firmware) == SYX_SHA,'Wrong firmware')
    ldr = unpack(firmware); require(sha(ldr) == LDR_SHA,'Wrong loader')
    mem = BootMemory(ldr)
    def code(a,n): return mem.read(l2_visa_byte(a,n) if 0xba0000 <= a < 0xbc0000 else visa_byte(a,n),n)
    manifests = [DOC/f'modifier-{name}-checkpoints.json' for name in ('init','buffer','table','writers')]
    owners,sources = reviewed_inventory(code,manifests)
    regions = []; relevant = []; counts = Counter(); status_counts = Counter(); all_hits = []
    for start,end,base in REGIONS:
        segments = []; scanned = 0; positions = 0
        for a,b,status,multiplicity in readable_intervals(mem.rows,base,base+2*(end-start),(PACKED_ISA,)):
            segment = dict(byteStart=hex(a),byteEndExclusive=hex(b),status=status,bootRows=multiplicity)
            if status == 'scan':
                require((a-base) % 2 == 0 and (b-a) % 2 == 0,'Unaligned scan interval')
                raw = mem.read(a,b-a); segment['sha256'] = sha(raw); scanned += len(raw)
                positions += max(0,len(raw)//2-1)
                for off in range(0,len(raw)-3,2):
                    hit = candidate(raw,off)
                    if hit is None: continue
                    pc = start+(a-base+off)//2
                    boundary = classify(pc,hit['size'],owners)
                    row = dict(address=hex(pc),**hit,boundary=boundary)
                    all_hits.append(row); counts[hit['family']] += 1
                    if hit['relevantWrite']:
                        relevant.append(row); status_counts[boundary['status']] += 1
            segments.append(segment)
        regions.append(dict(visaStart=hex(start),visaEndExclusive=hex(end),byteBase=hex(base),
                            scannedBytes=scanned,candidatePositions=positions,segments=segments))
    # A boundary mismatch remains visible and cannot be promoted to an instruction.
    return dict(schemaVersion=1,date='2026-10-22',productionVersion='0.3.13',
        method='Coarse parcel-prefix search, hash-bound reviewed boundary cross-check and three separate MODE1 leaf proofs. No CPU execution.',
        firmwareSyxSha256=SYX_SHA,firmwareLdrSha256=LDR_SHA,
        manual=dict(title='SHARC+ Core Programming Reference rev1.5 June 2023',
                    sha256='a3edf83beb75b44a77f8366cf54c0353083ab49a1c69d8179d2b727ba7ba1470',
                    sections=['17-2..4 Type18a and BOP','27-12 SYSREG','14-35 shared UREG transfers','29-55 MODE1 fields']),
        bitMasks=dict(RND32=hex(RND32),TRUNCATE='0x8000',BDCST1='0x800000'),
        regions=regions,reviewedPartitions=sources,
        reviewedInstructionBoundaries=len({v[0] for v in owners.values()}),
        prefixHitsByFamily=dict(sorted(counts.items())),rawPrefixHits=len(all_hits),
        allPrefixHitsSha256=sha(json.dumps(all_hits,sort_keys=True,separators=(',',':')).encode()),
        relevantWriteCandidates=len(relevant),relevantByBoundaryStatus=dict(sorted(status_counts.items())),
        candidates=relevant,additionalLeafContracts=leaf_contracts(code,json.loads(MANIFEST.read_text())),
        scopeGaps=[
            'Raw prefixes may be data or instruction operands. Even a reviewed boundary is not reachability evidence.',
            'Only Type18a, Type5a/b and Type17 MODE1/MODE1STK operands are searched; no complete writer inventory is claimed.',
            'Memory-to-system-register transfers, POP STS, RTI, MMASK configuration and other control/context effects are not enumerated by this scanner.',
            'Packed ISA vector bytes, unmapped regions and multiply loaded intervals are explicitly excluded. No other core or address mapping is inferred.',
            'Unknown Type5 compute encodings remain candidates; this is not a complete instruction-legality decoder.',
            'Three leaf contracts assume reviewed ABI/memory integrity and no asynchronous/nonlocal transfers. I13 is a shared token; numerical output correctness is not proved.',
            'Prior root call catalogs are not recomputed or promoted; eight direct dependencies of 0x82c228 and the compact division-return dependency remain open.'
        ],
        completeWriterInventory=False,runtimeModeAtStoreProven=False,fullRangeEncodingProven=False,
        generatorWriteSupportAdded=False,newPhysicalExports=0,newReaDecompilation=False,
        nextStep='Use this candidate list to finish memory/status-stack writer coverage and prioritize unresolved restore contexts, especially compact division and the selected-task context return, before asserting the runtime rounding mode.')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--firmware',type=Path,required=True)
    ap.add_argument('--write',action='store_true')
    args = ap.parse_args(); result = build(args.firmware.read_bytes())
    if args.write: OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    else: require(json.loads(OUT.read_text()) == result,'Stale writer audit')
    print(json.dumps({k:result[k] for k in ('rawPrefixHits','relevantWriteCandidates',
                                          'relevantByBoundaryStatus','additionalLeafContracts',
                                          'runtimeModeAtStoreProven')}))

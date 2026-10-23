#!/usr/bin/env python3
"""Replay narrow FW13 GET checkpoints; hashes/operands, not a whole-path emulator."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
from modifier_value_path_audit import BootMemory
from pitch_display import unpack, SYX_SHA

DOC=Path(__file__).resolve().parents[3]/'docs/fm3/parameter-evidence'


def main():
    p=argparse.ArgumentParser();p.add_argument('--firmware',type=Path,required=True);a=p.parse_args()
    raw=a.firmware.read_bytes()
    assert hashlib.sha256(raw).hexdigest()==SYX_SHA,'Wrong firmware'
    memory=BootMemory(unpack(raw))
    manifest=json.loads((DOC/'modifier-hardware-transport-checkpoints.json').read_text())
    for s in manifest['spans']:
        assert hashlib.sha256(memory.read(int(s['address'],16),s['size'])).hexdigest()==s['sha256'],s['name']
    assert struct.unpack('<I',memory.read(0xc4452744,4))[0]==0xc445296d # fn31 dispatch
    assert struct.unpack('<H',memory.read(0xc443bbd6,2))[0]==0x2294 # MOVS R2,#148
    assert struct.unpack('<H',memory.read(0xc445690a,2))[0]==0x881b # LDRH R3,[R3]
    assert struct.unpack('<I',memory.read(0xc441bbe4,4))[0]==0xc441bf39 # ARM fallback
    assert struct.unpack('<I',memory.read(0x282e7ba8,4))[0]==0x82a0c0 # SHARC op148 dispatch
    print(json.dumps(dict(checkpoints=len(manifest['spans']),selectedOperandChecks=5,
                         newDeviceMeasurements=0,wholeReadbackPathProven=False)))


if __name__=='__main__':main()

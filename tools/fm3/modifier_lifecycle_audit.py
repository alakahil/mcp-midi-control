#!/usr/bin/env python3
"""Bounded FW13 lifecycle replay against pinned firmware, never preset/device writes.

The selected native operands are decoded independently of exploratory SLEIGH.
Hash-bound manual data-flow review supplies register liveness and call meaning;
this is not an emulator, a complete CFG proof, or authority for a new writer.
"""
import argparse,json,struct
from pathlib import Path
from global_scale_cache import immediate,modify
from modifier_value_path_audit import BootMemory
from modifier_sharc_audit import memory_move
from pitch_display import unpack,SYX_SHA,LDR_SHA,instruction
from six_field_resolution import require,sha

ROOT=Path(__file__).resolve().parents[2]
DOC=ROOT/'docs/fm3/parameter-evidence'
MANIFEST=DOC/'modifier-lifecycle-checkpoints.json'
OUT=DOC/'modifier-lifecycle-audit.json'
DEFAULT_PIDS=[0,1,2,3,4,5,6,13,14,7,15,10,12,11,16,17,20,21,22,23,24]

def build(firmware,editor):
 require(sha(firmware)==SYX_SHA,'Wrong pinned FW13 input')
 loader=unpack(firmware);require(sha(loader)==LDR_SHA,'Loader mismatch')
 mem=BootMemory(loader);manifest=json.loads(MANIFEST.read_text())
 rea_path=DOC/'volume-pedal-rea-result.json';rea=json.loads(rea_path.read_text())
 require(sha(rea_path.read_bytes())==manifest['priorREAReceiptSha256'],'Prior REA receipt differs')
 require(sha(editor)==manifest['editorSha256']==rea['targetSha256'],'Wrong pinned editor input')
 require(struct.unpack_from('<2I',editor)==(0xfeedfacf,0x100000c),'Wrong editor architecture')
 editor_spans=[s for s in rea['functionCheckpoints'] if s['id'] in ['source-create-remove','assigned-id-and-pending-source']]
 require(len(editor_spans)==2,'Missing prior editor checkpoints')
 for s in editor_spans:
  at=int(s['address'],16)-0x100000000
  require(sha(editor[at:at+s['bytes']])==s['sha256'],'Editor lifecycle span drift')
 require(manifest['sourceFirmwareSha256']==SYX_SHA and manifest['sourceLoaderSha256']==LDR_SHA,'Manifest identity mismatch')
 code=lambda a,n:mem.read(0x80a00000+(a-0x800000)*2,n)
 words=lambda a,n:list(struct.unpack('<'+'I'*n,mem.read(a,n*4)))
 for s in manifest['spans']:
  a=int(s['address'],16);b=code(a,s['bytes']) if s['space']=='visa' else mem.read(a,s['bytes'])
  require(sha(b)==s['sha256'],'Native span drift: '+s['name'])
 # ARM operations 58/59 take the same shared-memory forward branch as op82,
 # if the earlier local handler did not consume them. Thumb bit is retained.
 require(words(0xc441ba7c,2)==[0xc441bf39]*2,'ARM operation dispatch differs')
 require(words(0x282e7958+58*4,2)==[0x829ca8,0x829cbb],'SHARC dispatch differs')
 for at,target in [(0x829cac,0x814536),(0x829cbd,0x8145d7),(0x814546,0x813d9f),(0x81455f,0x813f86),(0x814573,0x813f86),(0x81459a,0x813f86),(0x81460d,0x813f86),(0x814652,0x813f86)]:
  require(instruction(code(at,6),0)==(0x1804<<32|target),'Call target differs')
 # First-zero scan: object base +0x200, NW stride 0xb2 (=712 bytes), 32
 # iterations. LEFTZ input zero sets SV (PRM 29-5); the reviewed SV branch
 # exits the loop and returns the selected object; no match leaves R0 zero.
 require(immediate(code(0x813d9f,6))==(0x14,0x80906988),'Scan source pointer')
 require(immediate(code(0x813da2,4))==(0x24,0xb2),'Scan stride')
 require(instruction(code(0x813da7,6),0)==0x0c0020000012,'Scan immediate count32 / end+18 differs')
 require(immediate(code(0x813dc2,4))==(1,0x2c8),'Object stride')
 require(immediate(code(0x813dc8,6))==(1,0x80906788),'Object base')
 defs=[words(0x8090c290+36*p,9) for p in range(25)]
 require(defs[0][0:2]==[0x200,0x10] and defs[0][4]==0,'Source definition/cache/default')
 require(defs[8][0:2]==[0x208,0x10],'Target effect definition')
 require(words(0x80906718,21)==DEFAULT_PIDS==manifest['defaultPids'],'Default PID order')
 require(immediate(code(0x81457a,6))==(0x15,0x80906718),'Default order pointer')
 require(immediate(code(0x81457d,6))==(11,0x8090c290),'Default descriptor pointer')
 require(immediate(code(0x814580,4))==(13,36),'Descriptor stride')
 require(immediate(code(0x814582,4))==(14,21),'Default loop count')
 for a,v in [(0x81455b,8),(0x814571,9),(0x81464e,8)]:require(immediate(code(a,4))==(8,v),'Callback PID differs')
 for a in [0x81455d,0x81456f,0x81458d,0x814607,0x814650]:require(immediate(code(a,4))==(12,9),'Callback operation differs')
 require(immediate(code(0x8145de,4))==(2,3) and immediate(code(0x8145e6,4))==(2,35),'Removal ID bounds')
 require(immediate(code(0x8145f7,4))==(2,-3),'Removal ID to index')
 require(immediate(code(0x8145fc,4))==(1,712),'Removal object stride')
 require(immediate(code(0x814601,6))==(0,0x80906788),'Removal object base')
 # Native slot identity and packed raw stride, separate from runtime object stride.
 require(immediate(code(0x813dfc,4))==(12,50),'Raw record stride')
 require(immediate(code(0x813e01,6))==(11,0xc2096ff0),'Raw pool base')
 require(immediate(code(0x813e11,4))==(0,3),'Wire effect ID base')
 require(modify(code(0x8145b1,6))==(5,4,0x132),'Created-object flag offset')
 require(memory_move(code(0x8145b4,4))==dict(store=True,index=5,modifier=4,postmodify=True,register=46,width=1,signExtend=False),'Created-object flag store')
 defaults=[dict(pid=p,defaultFloatBits=hex(defs[p][4]),defaultPhysical=struct.unpack('<f',struct.pack('<I',defs[p][4]))[0],
  descriptorType=hex(defs[p][1]),warning='Input to callback operation 9, not an encoded preset word.') for p in DEFAULT_PIDS]
 return dict(schemaVersion=1,firmwareSha256=SYX_SHA,loaderSha256=LDR_SHA,checkpointSha256=sha(MANIFEST.read_bytes()),
  method=manifest['method'],nativeSpansVerified=len(manifest['spans']),
  priorREAReceiptSha256=sha(rea_path.read_bytes()),editorSha256=sha(editor),editorSpansVerified=len(editor_spans),
  findings=dict(dispatch={'createOperation':58,'removeOperation':59,'conditionalArmForwarder':'0xc441bf38','sharcCreate':'0x814536','sharcRemove':'0x8145d7'},
   selection={'entry':'0x813d9f','examinedObjects':32,'objectBytes':712,'predicate':'cached Source field at object+0x200 equals zero','order':'ascending index; first match','noMatch':'null object, create returns zero','runtimeCacheEqualityToEveryPresetNotProven':True},
   slotIdentity={'wireEffectIdBase':3,'rawBytesPerRecord':50,'serializedWords':25,'rawPool':'0xc2096ff0','runtimeObjectPool':'0x80906788'},
   initialization={'targetOrder':[8,9],'callbackOperation':9,'defaultPidOrder':DEFAULT_PIDS,'defaultValues':defaults,
    'notInResetList':[18,19],'reservedWordsNotProvenZero':True,'defaultsAreCallbackInputsNotSerializedWords':True},
   removal={'acceptedWireEffectIds':[3,34],'firstCallback':{'pid':0,'value':0},'lastCallback':{'pid':8,'value':0},
    'targetPid9NotExplicitlyCleared':True,'conditionalTargetCallback':'If the reviewed gate permits and a target object exists, invoke its callback with op0 and target PID.',
    'doesNotMemsetWholeRecord':True},
   sourceNoneVsRemoval={'sourceNoneAloneDoesNotClearTarget':True,'sourceZeroIsNotBlankRecord':True,'editorRemovalAlsoQueuesOperation59':True}),
  limits=['The reviewed selector examines 32 objects; this is not a guaranteed usable hardware capacity.',
   'The callback conversions, cache initialization, reserved PID18/19, target support and import path are not fully emulated.',
   'Copying record0 to record1 is not certified by the selector alone. No simultaneous Wah/Volume writer is enabled.',
   'Other source codes, targets, channel scopes and Volume Min/Max need their own evidence.',
   'Global controller assignments and instantaneous values are not supplied by the preset or this analysis.',
   'Removal and reallocation are statically traced but not exercised on FM3; no import/STORE/audio claim.'],
  allocationRuleStaticallyLocated=True,serializedInitializationFullyProven=False,arbitraryWriterSupported=False,
  newREAInvocation=False,newHardwareMeasurements=False,deviceIO=False,presetWrites=False)

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--firmware',type=Path,required=True);p.add_argument('--editor',type=Path,required=True);p.add_argument('--write',action='store_true');a=p.parse_args()
 r=build(a.firmware.read_bytes(),a.editor.read_bytes())
 if a.write:OUT.write_text(json.dumps(r,indent=2)+'\n')
 else:require(r==json.loads(OUT.read_text()),'Lifecycle receipt is stale')
 print(json.dumps({k:r[k] for k in ['nativeSpansVerified','allocationRuleStaticallyLocated','serializedInitializationFullyProven','arbitraryWriterSupported','deviceIO']}))

import json,subprocess,tempfile,zipfile,sys
from pathlib import Path
from unittest.mock import patch
import FM3_PITCH_BATCH as app
import pitch_transport as t
here=Path(__file__).resolve().parent
code="import fs from 'node:fs';import {inspectStructure} from './fm3-prototype.mjs';const b=Buffer.from(inspectStructure(fs.readFileSync('baseline.syx')).raw.body);console.log(JSON.stringify(Array.from({length:456},(_,i)=>b.readUInt16LE(8928+2*i))));"
r=subprocess.run(['node','--input-type=module','-e',code],cwd=here,capture_output=True,text=True);assert r.returncode==0,r.stderr
values=json.loads(r.stdout)
def frame(fn,data):
 f=[240,0,1,116,17,fn]+data
 return f+[t.checksum(f),247]
def frames(vals=values):
 result=[frame(116,[110,0,len(vals)&127,len(vals)>>7])]
 for at in range(0,len(vals),256):
  chunk=vals[at:at+256];payload=[len(chunk)&127,len(chunk)>>7]
  for v in chunk:payload += [v&127,(v>>7)&127,(v>>14)&3]
  result.append(frame(117,payload))
 return result+[frame(118,[])]
f=frames();assert list(map(len,f))==[12,778,610,8]
framer=t.Framer();framer.feed(bytes(v for x in f for v in x));assert framer.frames==f
assert t.decode(f)['values']==values and t.checksum(t.GET[:-2])==t.GET[-2]
for bad in [frames(values[:-1]),f[:-1],f+[f[-1]]]:
 try:t.decode(bad)
 except ValueError:pass
 else:raise AssertionError('Invalid response accepted')
try:t.collect('/must-not-open',{'txCalls':1})
except ValueError:pass
else:raise AssertionError('Repeat GET accepted')
def collect(port,report):
 report.update(txCalls=1,txBytesWritten=10,rawRxHex=bytes(v for x in f for v in x).hex(),frames=f)
 return t.decode(f)
with tempfile.TemporaryDirectory() as tmp:
 root=Path(tmp)/'session'
 args=['script','--session',str(root),'--port','/dev/cu.mock']
 with patch.object(sys,'argv',args),patch('builtins.input',side_effect=['jah','q']),patch.object(t,'collect',side_effect=collect):app.main()
 models,remaining=app.next_group(root);assert remaining==15 and [m['name'] for m in models]==['Advanced Whammy','Arpeggiator','Classic Whammy','Crystal Echoes']
 with patch.object(sys,'argv',args),patch('builtins.input',return_value='q'),patch.object(t,'collect',side_effect=AssertionError('Device opened on resume q')):app.main()
 folder=next(root.glob('capture-*'));r=json.loads((folder/'capture.json').read_text());r['txCalls']=2;(folder/'capture.json').write_text(json.dumps(r))
 try:app.session(root)
 except ValueError:pass
 else:raise AssertionError('Bad persisted evidence accepted')
 for z in Path(tmp).glob('*.zip'):
  with zipfile.ZipFile(z) as archive:assert archive.testzip() is None and 'baseline.syx' in archive.namelist()
print('PASS: 456-word synthetic framing, checksum, malformed replies, repeat GET guard, full initial capture, next group, resume/q ZIP, tampered evidence rejection. Real device GET pending.')

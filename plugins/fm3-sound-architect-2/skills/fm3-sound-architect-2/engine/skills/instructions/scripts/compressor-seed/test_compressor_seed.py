import json, tempfile, shutil, zipfile
from pathlib import Path
from unittest.mock import patch
import compressor_transport as t
import FM3_COMPRESSOR_SEED as app
root=Path(__file__).resolve().parent
values=json.loads((root/'expected.json').read_text())['values']
def frame(fn,data):
 f=[240,0,1,116,17,fn]+data
 return f+[t.checksum(f),247]
def frames(eid=46,vals=values):
 result=[frame(116,[eid,0,len(vals)&127,len(vals)>>7])]
 for at in range(0,len(vals),256):
  chunk=vals[at:at+256];payload=[len(chunk)&127,len(chunk)>>7]
  for v in chunk:payload += [v&127,(v>>7)&127,(v>>14)&3]
  result.append(frame(117,payload))
 return result+[frame(118,[])]
f=frames();assert [len(x) for x in f]==[12,454,8]
assert t.decode(f)['values']==values
assert t.GET.hex()=='f0000174111f2e0025f7' and t.checksum(t.GET[:-2])==t.GET[-2]
for bad in [frames(eid=70),frames(vals=values[:-1]),f[:-1],f+[f[-1]]]:
 try:t.decode(bad)
 except ValueError:pass
 else:raise AssertionError('Invalid reply accepted')
bad=[list(x) for x in f];bad[1][10]^=1
try:t.decode(bad)
except ValueError:pass
else:raise AssertionError('Checksum accepted')
try:t.collect('/must-not-open',{'txCalls':1})
except ValueError:pass
else:raise AssertionError('Repeated GET accepted')
# Simulate user confirmation and result ZIP without opening a device.
with tempfile.TemporaryDirectory() as tmp:
 dest=Path(tmp)
 for name in ['expected.json','FM3_COMPRESSOR_SELECTION_001.syx']:shutil.copyfile(root/name,dest/name)
 with patch.object(app,'ROOT',dest),patch.object(app.glob,'glob',return_value=['/dev/cu.usbmodemTEST']),patch.object(app.sys,'argv',['script','/dev/cu.usbmodemTEST']),patch('builtins.input',return_value='GET'),patch.object(app,'collect',return_value=t.decode(f)):
  assert app.main()==0
 with zipfile.ZipFile(next(dest.glob('*RESULT*.zip'))) as z:
  report=json.loads(z.read('capture.json'));assert report['all148WordsMatch'] is True
print('PASS: synthetic 148-word decoder, frame sizes, GET checksum, five bad replies, repeated GET guard, confirmed offline ZIP flow. Device GET remains pending.')

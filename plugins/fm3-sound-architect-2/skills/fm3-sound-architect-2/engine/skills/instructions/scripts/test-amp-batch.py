import json,tempfile,sys
from pathlib import Path
from unittest.mock import patch
import FM3_AMP_BATCH as batch
import FM3_AMP_COLLECTOR as core
refs=Path(__file__).resolve().parent.parent/'references'
report=json.loads((refs/'FM3_AMP_GET_capture009.json').read_text());donor=(refs/'FM3_AMP_CAPTURE_009.syx').read_bytes()
with tempfile.TemporaryDirectory() as tmp:
 root=core.session(Path(tmp)/'session',True)
 assert [m['id'] for m in batch.offline('next',root)['models']]==[]
 batch.offline('preflight',refs/'FM3_AMP_CAPTURE_009.syx',[36,37,38,39])
 try:batch.offline('preflight',refs/'FM3_AMP_CAPTURE_009.syx',[40,41,42,43])
 except ValueError:pass
 else:raise AssertionError('Wrong models accepted')
 def receive(port,r):r.update(report)
 with patch.object(core,'collect',side_effect=receive) as transport:
  folder=batch.capture(root,'/dev/cu.TEST',donor);assert transport.call_count==1
 assert batch.offline('next',root)['captures'][0]['state']=='paired-verified'
 # Resume derives progress from validated evidence, including models beyond bundled coverage.
 with patch.object(batch,'input',side_effect=['q']),patch.object(core,'collect') as transport,patch.object(sys,'argv',['batch','--session',str(root),'--port','/dev/cu.TEST','--firmware','13']):
  batch.main();transport.assert_not_called()
 import zipfile
 archive=next(Path(tmp).glob('*.zip'))
 with zipfile.ZipFile(archive) as z:assert z.read(folder.name+'/donor.syx')==donor and 'session.json' in z.namelist()
 # Pair mismatch rejected and excluded from resume; original raw bytes retained.
 def mismatch(port,r):r.update(json.loads((refs/'FM3_AMP_GET_capture008.json').read_text()))
 with patch.object(core,'collect',mismatch):
  try:batch.capture(root,'/dev/cu.TEST',donor)
  except ValueError:pass
  else:raise AssertionError('Mismatch accepted')
 try:batch.offline('next',root)
 except ValueError:pass
 else:raise AssertionError('Rejected pair ignored')
 assert len(list(root.glob('capture-*/capture.json')))==2
print('PASS: preflight IDs, one collection call, exact pair, resume, q without GET, ZIP evidence, mismatch blocks progress; no hardware.')

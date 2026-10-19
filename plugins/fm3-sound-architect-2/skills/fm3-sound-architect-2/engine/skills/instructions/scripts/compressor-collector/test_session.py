import tempfile,subprocess,json,zipfile
from pathlib import Path
import FM3_COMPRESSOR_BATCH as app
here=Path(__file__).resolve().parent
with tempfile.TemporaryDirectory() as tmp:
 root=Path(tmp)/'FM3_COMPRESSOR_SESSION'
 args=['python3',str(here/'FM3_COMPRESSOR_BATCH.py'),'--session',str(root)]
 first=subprocess.run(args+['--export-only'],capture_output=True,text=True);assert first.returncode==0,first.stderr
 models,remaining=app.next_group(root);assert remaining==15 and [m['displayNumber'] for m in models]==[5,6,7,8]
 result=subprocess.run(args+['--port','/dev/cu.unopened-test'],input='q\n',capture_output=True,text=True);assert result.returncode==0,result.stderr
 assert 'Compander' in result.stdout
 assert len(list(root.glob('capture-*')))==1
 for zpath in Path(tmp).glob('*.zip'):
  with zipfile.ZipFile(zpath) as z:
   assert 'capture-001/donor.syx' in z.namelist();assert json.loads(z.read('session.json'))['kind']=='FM3_COMPRESSOR_SESSION'
 print('PASS: session creation, paired seed install, 15 remaining, Compander next group, resume and q ZIP without device access.')

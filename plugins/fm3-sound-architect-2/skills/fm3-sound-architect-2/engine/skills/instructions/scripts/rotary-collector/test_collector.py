import json,tempfile,shutil,subprocess,zipfile
from pathlib import Path
from unittest.mock import patch
import FM3_ROTARY_BATCH as app
here=Path(__file__).resolve().parent

def simulated(port,r):
    values=app.offline('preflight',here/'start.syx')['words']
    def frame(fn,data):
        x=[240,0,1,116,17,fn]+data
        return x+[app.core.checksum(x),247]
    payload=[84,0]
    for v in values:payload += [v&127,(v>>7)&127,(v>>14)&3]
    frames=[frame(116,[86,0,84,0]),frame(117,payload),frame(118,[])]
    framer=app.core.Framer();framer.feed(bytes(v for f in frames for v in f));assert framer.frames==frames
    r.update(txCalls=1,txBytesWritten=10,rawRxHex=bytes(v for f in frames for v in f).hex(),frames=frames)
    return app.core.decode(frames)
with tempfile.TemporaryDirectory() as tmp:
    root=app.session(Path(tmp)/'session')
    assert app.progress(root)[0]==0
    assert app.transition(here/'baseline.syx',here/'start.syx')==0
    try:app.transition(here/'start.syx',here/'start.syx')
    except ValueError:pass
    else:raise AssertionError('No change accepted')
    pair=Path(tmp)/'real';pair.mkdir()
    shutil.copy2(here/'baseline.syx',pair/'donor.syx');shutil.copy2(here/'baseline-get.json',pair/'capture.json')
    assert app.offline('pair',pair)['matchedWords']==84
    r=json.loads((pair/'capture.json').read_text());r['txCalls']=2;(pair/'capture.json').write_text(json.dumps(r))
    try:app.offline('pair',pair)
    except ValueError:pass
    else:raise AssertionError('Repeated GET accepted')
    # Known real one-word transition; synthetic GET checks orchestration, not hardware.
    with patch.object(app.core,'collect',side_effect=simulated):
        app.capture(root,'/dev/cu.mock',(here/'start.syx').read_bytes(),app.STEPS[0])
    with patch.object(app,'HERE',here),patch.object(app,'progress',return_value=(1,here/'start.syx')):
        z=app.export_zip(root)
        with zipfile.ZipFile(z) as f:assert 'baseline-get.json' in f.namelist()
    # A mislabeled unchanged step must not count as progress.
    try:app.progress(root)
    except ValueError:pass
    else:raise AssertionError('Unchanged step accepted')
    qroot=Path(tmp)/'q-session'
    cmd=['python3',str(here/'FM3_ROTARY_BATCH.py'),'--session',str(qroot),'--port','/dev/cu.never-open']
    for _ in range(2):
        r=subprocess.run(cmd,input='q\n',capture_output=True,text=True);assert r.returncode==0,r.stderr
    assert not list(qroot.glob('capture-*'))
print('PASS: real 84-word baseline pair; one-word delta; no-change/repeated-GET rejection; synthetic framing/capture/ZIP; q/resume without device.')

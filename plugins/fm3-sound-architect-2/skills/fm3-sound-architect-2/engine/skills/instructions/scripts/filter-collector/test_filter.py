"""Offline tests only. Synthetic replies never count as device evidence."""
import json, subprocess, tempfile, zipfile, sys, copy
from pathlib import Path
from unittest.mock import patch
import FM3_FILTER_BATCH as app
import filter_transport as t
here=Path(__file__).resolve().parent
def node(code,*args):
    r=subprocess.run(['node','--input-type=module','-e',code,*args],cwd=here,capture_output=True,text=True)
    assert r.returncode==0,r.stderr
    return json.loads(r.stdout)
source=node("import fs from 'node:fs';import {inspectStructure} from './fm3-prototype.mjs';const b=Buffer.from(inspectStructure(fs.readFileSync('baseline.syx')).raw.body);console.log(JSON.stringify(Array.from({length:148},(_,i)=>b.readUInt16LE(7614+2*i))));")
def fixture(path,changes):
    return node("import fs from 'node:fs';import {inspectStructure} from './fm3-prototype.mjs';import {reencodeDumpFromRawPatch,reencodeRawPatch} from './fm3-codec.mjs';const x=JSON.parse(process.argv[1]),d=fs.readFileSync('baseline.syx'),s=inspectStructure(d),b=Buffer.from(s.raw.body);for(const [at,v] of x.changes)b.writeUInt16LE(v,at);fs.writeFileSync(x.path,Buffer.from(reencodeDumpFromRawPatch(d,reencodeRawPatch(s.raw.rawPatch,b))));console.log(JSON.stringify(Array.from({length:148},(_,i)=>b.readUInt16LE(7614+2*i))));",json.dumps({'path':str(path),'changes':changes}))
def frame(fn,data):
    f=[240,0,1,116,17,fn]+data
    return f+[t.checksum(f),247]
def frames(vals,chunk=256):
    result=[frame(116,[114,0,len(vals)&127,len(vals)>>7])]
    for at in range(0,len(vals),chunk):
        words=vals[at:at+chunk];payload=[len(words)&127,len(words)>>7]
        for v in words:payload += [v&127,(v>>7)&127,(v>>14)&3]
        result.append(frame(117,payload))
    return result+[frame(118,[])]
def report(vals):
    f=frames(vals)
    return {'status':'captured','txHex':t.GET.hex(),'txCalls':1,'txBytesWritten':10,'rawRxHex':bytes(v for x in f for v in x).hex(),'frames':f,'decoded':t.decode(f)}
def rejected(fn):
    try:fn()
    except (ValueError,AssertionError):return
    raise RuntimeError('Invalid case accepted')
f=frames(source)
assert list(map(len,f))==[12,454,8]
assert t.GET.hex()=='f0000174111f720079f7' and t.checksum(t.GET[:-2])==t.GET[-2]
for chunk in [256,74]:
    ff=frames(source,chunk);framer=t.Framer()
    raw=bytes(v for x in ff for v in x)
    for at in range(0,len(raw),13):framer.feed(raw[at:at+13])
    assert framer.frames==ff and t.decode(ff)['values']==source
bad_checksum=copy.deepcopy(f);bad_checksum[1][-2]^=1
bad_id=copy.deepcopy(f);bad_id[0]=frame(116,[110,0,20,1])
for bad in [frames(source[:-1]),f[:-1],f+[f[-1]],bad_checksum,bad_id]:rejected(lambda:t.decode(bad))
rejected(lambda:t.collect('/must-not-open',{'txCalls':1}))
negative_preflights=0
with tempfile.TemporaryDirectory() as tmp:
    tmp=Path(tmp);group=tmp/'group.syx'
    # Synthetic IDs are placeholders, not assignments to firmware model names.
    group_values=fixture(group,[(7596,1),(7580,3)]+[(7614+ch*74,ch+1) for ch in range(4)])
    state=app.offline('preflight',group);assert state['scene2Bypass'] and state['sceneChannels'][1]==3
    assert [c['binaryId'] for c in state['channels']]==[1,2,3,4]
    for changes in [[(4958,123)],[(392,1028)],[(7582,1)],[(7594,1)],[(0,2)],[(4,88)],[(7580,4)],[(7596,2)]]:
        path=tmp/'bad.syx';fixture(path,changes)
        rejected(lambda:app.offline('preflight',path));negative_preflights+=1
    root=tmp/'session';args=['script','--session',str(root),'--port','/dev/cu.mock']
    def fake_collect(port,r):
        r.update(report(source));return r['decoded']
    with patch.object(sys,'argv',args),patch('builtins.input',side_effect=['jah','q']),patch.object(t,'collect',side_effect=fake_collect) as mocked:
        app.main();assert mocked.call_count==1
    models,remaining=app.next_group(root)
    assert remaining==17 and [m['name'] for m in models]==['All-Pass','Auto-Wah','Band-Pass','Envelope Filter']
    def fake_group(port,r):
        r.update(report(group_values));return r['decoded']
    with patch.object(sys,'argv',args),patch('builtins.input',side_effect=[str(group),'jah','q']),patch.object(t,'collect',side_effect=fake_group) as mocked:
        app.main();assert mocked.call_count==1
    models,remaining=app.next_group(root)
    assert remaining==13 and [m['name'] for m in models]==['Feedback Comb','Feedforward Comb','High-Pass','High-Shelf']
    with patch.object(sys,'argv',args),patch('builtins.input',return_value='q'),patch.object(t,'collect',side_effect=RuntimeError('Device opened on resume q')):app.main()
    # A group left active stops before a device GET, while the original active
    # Null baseline remains valid for the first paired capture.
    active=tmp/'active.syx';fixture(active,[(7614,5),(7688,6),(7762,7),(7836,8)])
    with patch.object(sys,'argv',args),patch('builtins.input',return_value=str(active)),patch.object(t,'collect',side_effect=RuntimeError('Unexpected GET')):
        rejected(app.main)
    bad_pair=tmp/'bad-pair';bad_pair.mkdir();(bad_pair/'donor.syx').write_bytes((here/'baseline.syx').read_bytes())
    pair_report=report(source)
    (bad_pair/'capture.json').write_text(json.dumps(pair_report));assert app.offline('pair',bad_pair)['matchedWords']==148
    changed=source.copy();changed[1]^=1
    for bad in [dict(pair_report,txCalls=2),dict(pair_report,txBytesWritten=9),dict(pair_report,txHex='f0000174111f6e0065f7'),report(changed),dict(pair_report,rawRxHex=pair_report['rawRxHex'][:-2]),dict(pair_report,frames=[])]:
        (bad_pair/'capture.json').write_text(json.dumps(bad));rejected(lambda:app.offline('pair',bad_pair))
    folder=next(root.glob('capture-*'));r=json.loads((folder/'capture.json').read_text());r['txCalls']=2;(folder/'capture.json').write_text(json.dumps(r))
    rejected(lambda:app.session(root))
    archives=list(tmp.glob('*.zip'));assert len(archives)>=3
    for z in archives:
        with zipfile.ZipFile(z) as a:assert a.testzip() is None and 'baseline.syx' in a.namelist() and 'filter-roster.json' in a.namelist()
result={'passed':True,'syntheticOnly':True,'deviceConnectionMade':False,'words':148,'singleAndSplitReplyFraming':True,'checksumAndMalformedReplyRejection':True,'repeatGetBlocked':True,'initialAndFirstGroupCapture':True,'initialMissingTypes':17,'remainingAfterFirstGroup':13,'negativePreflights':negative_preflights,'scene2BypassRequiredForGroups':True,'resumeAndQuitZip':True,'tamperedEvidenceRejected':True,'hardware':'First real Filter GET/SYX pair pending'}
print(json.dumps(result,indent=2))

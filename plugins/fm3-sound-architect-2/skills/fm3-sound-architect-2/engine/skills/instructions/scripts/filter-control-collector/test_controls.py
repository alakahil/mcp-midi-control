"""Offline collector tests; synthetic values/replies are not firmware measurements."""
import contextlib, copy, io, json, subprocess, sys, tempfile, zipfile
from pathlib import Path
from unittest.mock import patch
import FM3_FILTER_CONTROLS as app
import filter_transport as transport

HERE = Path(__file__).resolve().parent

def frame(fn, data):
    f = [240, 0, 1, 116, 17, fn] + data
    return f + [transport.checksum(f), 247]

def reply(words, chunk=148):
    frames = [frame(116, [114, 0, 20, 1])]
    for start in range(0, len(words), chunk):
        selected = words[start:start + chunk]
        data = [len(selected) & 127, len(selected) >> 7]
        for value in selected:
            data += [value & 127, (value >> 7) & 127, (value >> 14) & 3]
        frames.append(frame(117, data))
    frames.append(frame(118, []))
    return {'status': 'captured', 'txHex': transport.GET.hex(), 'txCalls': 1,
            'txBytesWritten': 10, 'frames': frames,
            'rawRxHex': bytes(v for f in frames for v in f).hex(), 'decoded': transport.decode(frames)}

def rejected(fn):
    try:
        fn()
    except (ValueError, AssertionError):
        return
    raise AssertionError('Invalid case accepted')

def run(root, answers, collector):
    args = ['collector', '--session', str(root), '--port', '/dev/cu.mock']
    with patch.object(sys, 'argv', args), patch('builtins.input', side_effect=answers), patch.object(transport, 'collect', side_effect=collector) as call:
        app.main()
        return call.call_count

def no_device(*args):
    raise RuntimeError('Unexpected device I/O')

with contextlib.redirect_stdout(io.StringIO()), tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    # Arbitrary fixture PIDs/values test orchestration only; no scale inference.
    code = """
    import fs from 'node:fs';import path from 'node:path';
    import {inspectStructure} from './fm3-prototype.mjs';
    import {reencodeDumpFromRawPatch,reencodeRawPatch} from './fm3-codec.mjs';
    const out=process.argv[1],seed=fs.readFileSync('baseline.syx'),s=inspectStructure(seed),base=Buffer.from(s.raw.body),b=Buffer.from(base),plan=JSON.parse(fs.readFileSync('plan.json')),all=[];
    const write=(name,body,raw=s.raw.rawPatch)=>fs.writeFileSync(path.join(out,name),Buffer.from(reencodeDumpFromRawPatch(seed,reencodeRawPatch(raw,body))));
    for(let i=0;i<plan.length;i++){
      const step=plan[i],ch='ABCD'.indexOf(step.channel),pid={Frequency:1,Q:2,Gain:3,Level:4}[step.parameter];
      b.writeUInt16LE(ch,7580);b.writeUInt16LE(12000+i*900,7614+ch*74+pid*2);write(i+'.syx',b);
      all.push(Array.from({length:148},(_,n)=>b.readUInt16LE(7614+n*2)));
    }
    const first=Buffer.from(inspectStructure(fs.readFileSync(path.join(out,'0.syx'))).raw.body);
    const bads={amp:[4958,123],grid:[392,1028],selectedScene:[0,2],sceneName:[4,88],otherScene:[7582,2],bypass:[7596,0],type:[7762,7],otherChannel:[7616,123],wrongChannel:[7580,0]};
    for(const [name,[offset,value]] of Object.entries(bads)){const x=Buffer.from(first);x.writeUInt16LE(value,offset);write(name+'.syx',x);}
    const coupled=Buffer.from(first);coupled.writeUInt16LE(25000,7766);write('coupled.syx',coupled);
    const wrong=Buffer.from(first);wrong.writeUInt16LE(25000,7766);write('wrong-control.syx',wrong);
    const header=Buffer.from(s.raw.rawPatch);header[11]=88;write('name.syx',first,header);
    const second=Buffer.from(inspectStructure(fs.readFileSync(path.join(out,'1.syx'))).raw.body);write('name-second.syx',second,header);
    for(const offset of [7,40,71]){const h=Buffer.from(header);h[offset]^=1;write('header-'+offset+'.syx',first,h);}
    const nameOnly=Buffer.from(base);nameOnly.writeUInt16LE(2,7580);write('name-only.syx',nameOnly,header);
    const renamedBad=Buffer.from(first);renamedBad.writeUInt16LE(123,4958);write('name-and-amp.syx',renamedBad,header);
    console.log(JSON.stringify(all));
    """
    generated = subprocess.run(['node', '--input-type=module', '-e', code, str(tmp)], cwd=HERE, capture_output=True, text=True)
    assert generated.returncode == 0, generated.stderr
    words = json.loads(generated.stdout)
    assert len(app.PLAN) == len(words) == 18
    for name in ['amp', 'grid', 'selectedScene', 'sceneName', 'otherScene', 'bypass', 'type', 'otherChannel', 'wrongChannel', 'header-7', 'header-40', 'header-71', 'name-and-amp', 'name-only']:
        rejected(lambda: app.offline('compare', HERE / 'baseline.syx', tmp / (name + '.syx'), 0))
    rejected(lambda: app.offline('compare', HERE / 'baseline.syx', HERE / 'baseline.syx', 0))
    assert app.offline('compare', HERE / 'baseline.syx', tmp / 'coupled.syx', 0)['mappingStatus'] == 'coupled-words-require-review'
    renamed = app.offline('compare', HERE / 'baseline.syx', tmp / 'name.syx', 0)
    assert renamed['presetNameChange']['before'] != renamed['presetNameChange']['after']
    assert len(bytes.fromhex(renamed['presetNameChange']['beforeHex'])) == 32
    plain = app.offline('compare', HERE / 'baseline.syx', tmp / '0.syx', 0)
    assert 'presetNameChange' not in plain

    root = tmp / 'session'
    cursor = [0]
    def simulated(port, report):
        report.update(reply(words[cursor[0]]))
        cursor[0] += 1
        return report['decoded']
    first_answers = sum(([str(tmp / f'{i}.syx'), '', 'jah'] for i in range(3)), []) + ['q']
    assert run(root, first_answers, simulated) == 3
    count, previous, observations = app.resume(root)
    assert count == 3 and previous.read_bytes() == (tmp / '2.syx').read_bytes()
    rest = sum(([str(tmp / f'{i}.syx'), '', 'jah'] for i in range(3, 18)), [])
    assert run(root, rest, simulated) == 15
    assert cursor[0] == 18 and app.resume(root)[0] == 18
    for archive in tmp.glob('FM3_FILTER_CONTROLS_*.zip'):
        with zipfile.ZipFile(archive) as z:
            assert z.testzip() is None and {'session.json', 'plan.json', 'baseline.syx'} <= set(z.namelist())
    qroot = tmp / 'quit'
    assert run(qroot, ['q'], no_device) == 0
    assert run(qroot, ['q'], no_device) == 0
    skiproot = tmp / 'skip'
    assert run(skiproot, ['s', 'väärtus juba sama', 'q'], no_device) == 0
    assert app.resume(skiproot)[0] == 1 and app.resume(skiproot)[1] == HERE / 'baseline.syx'
    cancelroot = tmp / 'cancel'
    assert run(cancelroot, [str(tmp / '0.syx'), '', 'q'], no_device) == 0
    assert app.resume(cancelroot)[0] == 0
    rejected(lambda: run(tmp / 'bad-input', [str(tmp / 'amp.syx')], no_device))
    mismatch = tmp / 'mismatch'
    def wrong_reply(port, report):
        report.update(reply(words[1]));return report['decoded']
    rejected(lambda: run(mismatch, [str(tmp / '0.syx'), '', 'jah'], wrong_reply))
    assert app.resume(mismatch)[0] == 0
    assert len(list(mismatch.glob('step-*/capture.json'))) == 1
    assert run(mismatch, ['q'], no_device) == 0
    inconsistent = tmp / 'inconsistent'
    def first_reply(port, report):
        report.update(reply(words[0]));return report['decoded']
    assert run(inconsistent, [str(tmp / '0.syx'), '', 'jah', 'q'], first_reply) == 1
    rejected(lambda: run(inconsistent, [str(tmp / 'wrong-control.syx')], no_device))
    # Existing unchanged-name comparisons remain byte-for-byte compatible;
    # resume the accepted first point and collect a renamed second point.
    def second_reply(port, report):
        report.update(reply(words[1]));return report['decoded']
    assert run(inconsistent, [str(tmp / 'name-second.syx'), '', 'jah', 'q'], second_reply) == 1
    assert app.resume(inconsistent)[0] == 2
    named_record = next(r for r in (json.loads(p.read_text()) for p in inconsistent.glob('step-01-*/result.json')) if r['status'] == 'passed')
    assert named_record['comparison']['presetNameChange']['after'] == renamed['presetNameChange']['after']

    pairdir = tmp / 'pair';pairdir.mkdir();(pairdir / 'donor.syx').write_bytes((tmp / '0.syx').read_bytes())
    for chunk in [148, 74]:
        report = reply(words[0], chunk);app.dump(pairdir / 'capture.json', report)
        assert app.offline('pair', pairdir)['matchedWords'] == 148
        framer = transport.Framer();raw = bytes.fromhex(report['rawRxHex'])
        for i in range(0, len(raw), 13):framer.feed(raw[i:i + 13])
        assert transport.decode(framer.frames)['values'] == words[0]
    report = reply(words[0]);bad_sum = copy.deepcopy(report)
    raw = bytearray.fromhex(bad_sum['rawRxHex']);raw[12 + 452] ^= 1;bad_sum['rawRxHex'] = raw.hex()
    for bad in [dict(report, txCalls=2), dict(report, txBytesWritten=9), dict(report, status='failed'), dict(report, rawRxHex=report['rawRxHex'][:-2]), dict(report, frames=[]), bad_sum, reply(words[1])]:
        app.dump(pairdir / 'capture.json', bad);rejected(lambda: app.offline('pair', pairdir))
    rejected(lambda: transport.collect('/must-not-open', {'txCalls': 1}))
    assert app.display_value('0,707', app.PLAN[3]) == .707
    for invalid in ['nan', 'inf', '-1', '0']:
        rejected(lambda: app.display_value(invalid, app.PLAN[0]))
    passed = sorted(root.glob('step-*/result.json'))[0]
    result = json.loads(passed.read_text());result['displayConfirmed'] = False;app.dump(passed, result)
    rejected(lambda: app.resume(root))

summary = {'passed': True, 'syntheticOnly': True, 'deviceConnectionMade': False,
           'completeSequentialSteps': 18, 'mockGetCalls': 18, 'pairedWordsEach': 148,
           'scopeNegativeCases': 15, 'coupledWordsRetainedForReview': True,
           'nameChangesRecordedAs32ByteField': True, 'otherHeaderBytesStillRejected': True,
           'renamedSecondPointAndResume': True, 'nameOnlyIsNotAMeasurement': True,
           'wrongControlIdentityRejectedBeforeGet': True, 'quitResumeSkipCancelTested': True,
           'failedPairRetainedAndNotAccepted': True, 'singleAndSplitReplyFraming': True,
           'checksumAndRepeatedGetRejected': True, 'displayConfirmationAndRoundingHandled': True,
           'zipAndTamperedEvidenceChecked': True,
           'hardware': 'Same Filter GET transport as completed type batch; control-measurement session pending.'}
print(json.dumps(summary, indent=2))

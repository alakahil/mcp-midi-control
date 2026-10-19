"""Offline orchestration and preservation tests. Synthetic data is not hardware evidence."""
import contextlib, copy, io, json, subprocess, sys, tempfile, zipfile
from pathlib import Path
from unittest.mock import patch
import FM3_PEQ_CONTROLS as app
import peq_transport as core

HERE = Path(__file__).resolve().parent

def frame(fn, payload):
    f = [240, 0, 1, 116, 17, fn] + payload
    return f + [core.checksum(f), 247]

def reply(words, chunk=132):
    frames = [frame(116, [54, 0, 4, 1])]
    for at in range(0, len(words), chunk):
        selected = words[at:at + chunk]
        data = [len(selected) & 127, len(selected) >> 7]
        for value in selected: data += [value & 127, (value >> 7) & 127, (value >> 14) & 3]
        frames.append(frame(117, data))
    frames.append(frame(118, []))
    return {'status': 'captured', 'txHex': core.GET.hex(), 'txCalls': 1, 'txBytesWritten': 10,
            'inputFlushedBeforeGet': True, 'frames': frames,
            'rawRxHex': bytes(v for f in frames for v in f).hex(), 'decoded': core.decode(frames)}

def rejected(fn):
    try: fn()
    except (ValueError, TimeoutError): return
    raise AssertionError('Invalid case accepted')

def run(root, answers, collector, export=False):
    args = ['collector', '--session', str(root)] + (['--export-only'] if export else ['--port', '/dev/cu.mock'])
    with patch.object(sys, 'argv', args), patch('builtins.input', side_effect=answers), patch.object(core, 'collect', side_effect=collector) as call:
        app.main()
        return call.call_count

def no_device(*args): raise AssertionError('Unexpected device I/O')

with contextlib.redirect_stdout(io.StringIO()), tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    code = """
    import fs from 'node:fs';import path from 'node:path';
    import {inspectStructure} from './fm3-prototype.mjs';
    import {reencodeDumpFromRawPatch,reencodeRawPatch,parsePresetDump,serializePresetDump} from './fm3-codec.mjs';
    const out=process.argv[1],seed=fs.readFileSync('baseline.syx'),s=inspectStructure(seed),base=Buffer.from(s.raw.body),b=Buffer.from(base),plan=JSON.parse(fs.readFileSync('plan.json')),all=[];
    const write=(name,body,raw=s.raw.rawPatch)=>fs.writeFileSync(path.join(out,name),Buffer.from(reencodeDumpFromRawPatch(seed,reencodeRawPatch(raw,body))));
    for(let i=0;i<plan.length;i++){
      b.writeUInt16LE(12000+i*900,8734+plan[i].candidatePid*2);write(i+'.syx',b);
      all.push(Array.from({length:132},(_,n)=>b.readUInt16LE(8734+n*2)));
    }
    const first=Buffer.from(inspectStructure(fs.readFileSync(path.join(out,'0.syx'))).raw.body);
    const bads={amp:[4946,123],grid:[408,1029],routing:[410,4],scene:[0,2],sceneName:[40,88],modifier:[1584,88],otherScene:[8702,2],bypass:[8716,0],channel:[8700,1],type:[8764,1],otherBand:[8734,123],otherChannel:[8800,123],tail:[13426,0],coupled:[8748,123]};
    for(const [name,[offset,value]] of Object.entries(bads)){const x=Buffer.from(first);x.writeUInt16LE(value,offset);if(x.equals(first))x[offset]^=1;write(name+'.syx',x);}
    const wrong=Buffer.from(base);wrong.writeUInt16LE(123,8748);write('wrong-control.syx',wrong);
    const header=Buffer.from(s.raw.rawPatch);header[11]=88;write('name.syx',first,header);write('name-only.syx',base,header);
    const second=Buffer.from(inspectStructure(fs.readFileSync(path.join(out,'1.syx'))).raw.body);write('name-second.syx',second,header);
    for(const offset of [6,7,40,71]){const h=Buffer.from(header);h[offset]^=1;write('header-'+offset+'.syx',first,h);}
    const bytes=fs.readFileSync(path.join(out,'0.syx'));
    for(let chunk=0;chunk<8;chunk++)for(let byte=0;byte<2;byte++){
      const p=parsePresetDump(Buffer.from(bytes));p.chunkPayloads[chunk][byte]^=1;fs.writeFileSync(path.join(out,'prefix-'+chunk+'-'+byte+'.syx'),Buffer.from(serializePresetDump(p)));
    }
    console.log(JSON.stringify(all));
    """
    generated = subprocess.run(['node', '--input-type=module', '-e', code, str(tmp)], cwd=HERE, capture_output=True, text=True)
    assert generated.returncode == 0, generated.stderr
    words = json.loads(generated.stdout)
    assert len(app.PLAN) == len(words) == 12
    names = ['amp','grid','routing','scene','sceneName','modifier','otherScene','bypass','channel','type','otherBand','otherChannel','tail','coupled','wrong-control','name-only']
    names += ['header-'+str(n) for n in [6,7,40,71]]
    names += [f'prefix-{chunk}-{byte}' for chunk in range(8) for byte in range(2)]
    for name in names:
        rejected(lambda: app.offline('compare', HERE / 'baseline.syx', tmp / (name + '.syx'), 0))
    rejected(lambda: app.offline('compare', HERE / 'baseline.syx', HERE / 'baseline.syx', 0))
    renamed = app.offline('compare', HERE / 'baseline.syx', tmp / 'name.syx', 0)
    assert renamed['presetNameChange']['before'] != renamed['presetNameChange']['after']
    assert len(bytes.fromhex(renamed['presetNameChange']['beforeHex'])) == 32
    root = tmp / 'session'; cursor = [0]
    def simulated(port, report):
        report.update(reply(words[cursor[0]])); cursor[0] += 1
        return report['decoded']
    answers = ['Peaking'] + sum(([str(tmp / f'{i}.syx'), '', 'jah'] for i in range(3)), []) + ['q']
    assert run(root, answers, simulated) == 3
    assert app.resume(root)[0] == 3
    assert app.resume(root)[1].read_bytes() == (tmp / '2.syx').read_bytes()
    answers = sum(([str(tmp / f'{i}.syx'), '', 'jah'] for i in range(3, 12)), [])
    assert run(root, answers, simulated) == 9
    assert cursor[0] == 12 and app.resume(root)[0] == 12
    assert run(root, [], no_device) == 0
    assert run(root, [], no_device, export=True) == 0
    qroot = tmp / 'quit'
    assert run(qroot, ['q'], no_device) == 0
    assert run(qroot, ['Peaking', 'q'], no_device) == 0
    assert run(qroot, ['q'], no_device) == 0
    skiproot = tmp / 'skip'
    assert run(skiproot, ['ei näe','s','Väärtus juba sama','q'], no_device) == 0
    assert app.resume(skiproot)[0] == 1 and app.resume(skiproot)[1] == HERE / 'baseline.syx'
    for stopat in [['q'], ['', 'q']]:
        cancelroot = tmp / ('cancel'+str(len(stopat)))
        assert run(cancelroot, ['Peaking',str(tmp / '0.syx')]+stopat, no_device) == 0
        assert app.resume(cancelroot)[0] == 0
    rejected(lambda: run(tmp / 'bad-input', ['Peaking',str(tmp / 'amp.syx')], no_device))
    def first_reply(port, report):
        report.update(reply(words[0])); return report['decoded']
    def second_reply(port, report):
        report.update(reply(words[1])); return report['decoded']
    mismatch = tmp / 'mismatch'
    rejected(lambda: run(mismatch, ['Peaking',str(tmp / '0.syx'),'','jah'], second_reply))
    assert app.resume(mismatch)[0] == 0
    assert len(list(mismatch.glob('step-*/capture.json'))) == 1
    assert run(mismatch, [str(tmp / '0.syx'),'','jah','q'], first_reply) == 1
    assert app.resume(mismatch)[0] == 1
    assert run(mismatch, [str(tmp / 'name-second.syx'),'','jah','q'], second_reply) == 1
    assert app.resume(mismatch)[0] == 2
    timeoutroot = tmp / 'timeout'
    def timeout(port, report):
        report.update(txCalls=1, txBytesWritten=10, rawRxHex=''); raise TimeoutError('Synthetic timeout')
    rejected(lambda: run(timeoutroot, ['Peaking',str(tmp / '0.syx'),'','jah'], timeout))
    assert app.resume(timeoutroot)[0] == 0
    assert run(timeoutroot, [str(tmp / '0.syx'),'','jah','q'], first_reply) == 1
    partialroot = tmp / 'partial'; app.resume(partialroot)
    partials = [None, b'{truncated', b'{"status":"pending"}', b'[]']
    for i, data in enumerate(partials):
        f = partialroot / ('step-00-interrupted-'+str(i)); f.mkdir()
        (f / 'donor.syx').write_bytes((tmp / '0.syx').read_bytes())
        if data is not None: (f / 'result.json').write_bytes(data)
    incomplete = []; assert app.resume(partialroot, incomplete)[0] == 0 and len(incomplete) == 4
    assert run(partialroot, [], no_device, export=True) == 0
    assert (partialroot / 'step-00-interrupted-1/result.json').read_bytes() == b'{truncated'
    pairdir = tmp / 'pair'; pairdir.mkdir(); (pairdir / 'donor.syx').write_bytes((tmp / '0.syx').read_bytes())
    for chunk in [132,66,33]:
        report = reply(words[0],chunk); report['syxSha256'] = app.offline('preflight',tmp / '0.syx')['sha256']
        app.dump(pairdir / 'capture.json',report); assert app.offline('pair',pairdir)['matchedWords'] == 132
    bads = [dict(report,txCalls=2),dict(report,txBytesWritten=9),dict(report,status='failed'),dict(report,inputFlushedBeforeGet=False),dict(report,syxSha256='bad'),dict(report,rawRxHex=report['rawRxHex'][:-2]),dict(report,frames=[]),dict(report,decoded={})]
    wrong = reply(words[1]); wrong['syxSha256'] = report['syxSha256']; bads.append(wrong)
    for bad in bads:
        app.dump(pairdir / 'capture.json', bad); rejected(lambda: app.offline('pair', pairdir))
    assert app.display_value('0,707',app.PLAN[3]) == .707
    assert app.display_value('0,71',app.PLAN[3]) == .71
    assert app.display_value('499.99',app.PLAN[0]) == 499.99
    for value in ['nan','inf','-1','0','1e99','1000']: rejected(lambda: app.display_value(value,app.PLAN[0]))
    for value in ['-1000','1000','2']: rejected(lambda: app.display_value(value,app.PLAN[9]))
    for archive in tmp.glob('FM3_PEQ_CONTROLS_*.zip'):
        with zipfile.ZipFile(archive) as z:
            assert z.testzip() is None and {'session.json','plan.json','baseline.syx'} <= set(z.namelist())
    passed = sorted(root.glob('step-*/result.json'))[0]
    result = json.loads(passed.read_text()); result['displayConfirmed'] = False; app.dump(passed,result)
    rejected(lambda: app.resume(root))

summary = {'date':'2026-10-09','passed':True,'syntheticOnly':True,'deviceConnectionMade':False,
           'completeSequentialSteps':12,'mockGetCalls':12,'pairedWordsEach':132,
           'scopeNegativeCases':len(names)+1,'pairNegativeCases':len(bads),
           'renameAtByte11AcceptedAndRecorded':True,'chunkPrefixMutationsRejected':16,
           'singleControlGateBeforeGet':True,'completedResumeAndExportWithoutGet':True,
           'quitSkipCancelResume':True,'failureEvidencePreserved':True,'incompleteEvidenceCases':4,
           'timeoutRequiresNewConfirmation':True,'splitReplyShapes':[132,66,33],
           'actualDisplayRoundingAcceptedAndOffTargetValuesRejected':True,
           'hardware':'Only the earlier baseline 132/132 pair is hardware evidence; control collection is pending.'}
(HERE / 'TEST_RESULTS.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))

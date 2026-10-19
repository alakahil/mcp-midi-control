"""Regression for an absent Bypass Mode menu; no serial or GET access."""
import contextlib,copy,io,json,tempfile
from pathlib import Path
from unittest.mock import patch
import FM3_ENHANCER_FULL as app
import enhancer_transport as core
from enhancer_plan import DEFAULTS,TYPES,build_plan

def answers(missing=None,optional=False):
    result=[]
    for name in TYPES:
        names=list(DEFAULTS[name]['enums'])
        if missing or optional:names.insert(0,'Bypass Mode')
        result+=['',';'.join(names)]
        for control in names:
            if control=='Scene Ignore':continue
            result.append(missing if control=='Bypass Mode' and missing else 'Thru;Mute' if control=='Bypass Mode' else 'NONE;LEFT;RIGHT;BOTH')
        result+=['']*len(DEFAULTS[name]['numeric'])+['']
    return result

with tempfile.TemporaryDirectory() as td,contextlib.redirect_stdout(io.StringIO()):
    root=Path(td)
    for case,missing,optional,count in [('default',None,False,86),('absent-word','puudub',False,86),('absent-dash','-',False,86),('actual-menu',None,True,92)]:
        folder=root/case;folder.mkdir()
        with patch('builtins.input',side_effect=answers(missing,optional)),patch.object(core,'collect',side_effect=RuntimeError('Unexpected device I/O')) as collect:
            setup=app.ensure_setup(folder)
            assert collect.call_count==0
        assert len(build_plan(setup))==count
        assert all(('Bypass Mode' in ui['enums'])==optional for ui in setup['types'].values())
        assert not any(s.get('value') in ['-','puudub'] for s in build_plan(setup))
        # Existing saved setup/plan is never silently rewritten by new defaults.
        before=(folder/'setup.json').read_bytes()
        with patch('builtins.input',side_effect=RuntimeError('Unexpected repeated prompt')):
            assert app.ensure_setup(folder)==setup
        assert (folder/'setup.json').read_bytes()==before
    paused=root/'pause';paused.mkdir()
    with patch('builtins.input',side_effect=['','Bypass Mode;Scene Ignore','q']):assert app.ensure_setup(paused) is None
    assert not (paused/'setup.json').exists()
result=dict(date='2026-10-11',passed=True,scope='Setup-only absent-menu regression',deviceConnectionMade=False,defaultPlanSteps=86,explicitOptionalMenuSteps=92,absentWordAndDashRemoveControl=True,noBogusMenuValueAdded=True,quitBeforeSetupSafe=True,existingSetupPreserved=True)
(Path(__file__).parent/'SETUP_FIX_TEST_RESULTS.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))

#!/usr/bin/env python3
"""Synthetic signal tests only. Never promote them to FM3 hardware/audio evidence."""
import importlib.util
import json
from pathlib import Path
import tempfile
import numpy as np
from scipy.io import wavfile
root = Path(__file__).resolve().parents[2]
p = root/'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-audio-session.py'
s = importlib.util.spec_from_file_location('fm3audio', p);mod = importlib.util.module_from_spec(s);s.loader.exec_module(mod)
with tempfile.TemporaryDirectory() as d:
    d = Path(d);rate = 48000;t = np.arange(rate*4)/rate
    # Distinct attacks, 1 kHz tone, exponential tail; stereo opposite polarity.
    env = np.exp(-((t-.5)/.07)**2)+.6*np.exp(-((t-1.3)/.15)**2)+.8*np.exp(-np.maximum(t-2,0)*4)*(t>=2)
    x = .1*np.sin(2*np.pi*1000*t)*env
    a = np.column_stack([x, -x]);shift = 4800;b = np.concatenate([np.zeros((shift,2)), a*2])
    wavfile.write(d/'ref.wav',rate,a.astype(np.float32));wavfile.write(d/'candidate.wav',rate,b.astype(np.float32))
    manifest = {'version':1,'syntheticOnly':True,'recordingChain':{'source':'synthetic; no FM3'},'tailStartSeconds':2,
                'takes':[{'id':'reference','file':'ref.wav'},{'id':'candidate','file':'candidate.wav'}]}
    f=d/'manifest.json';f.write_text(json.dumps(manifest));r=mod.analyze(f,d/'out')
    assert abs(r['takes'][1]['offsetSamples']-shift)<=48
    assert abs(r['takes'][1]['aligned']['integratedLufs']-r['takes'][0]['aligned']['integratedLufs']-6.02)<.2
    assert r['abWithinHalfDb'] and r['syntheticOnly']
    assert all(x['waveform']['tail'] for x in r['takes'])
    assert r['takes'][0]['waveform']['spectralBands'][3]['relativeEnergyDb']>-1
    repeat=mod.analyze(f,d/'repeat');assert repeat==r
    for bad in ['silent','rate','duplicate','offset']:
        m=json.loads(json.dumps(manifest))
        if bad=='silent':wavfile.write(d/'bad.wav',rate,np.zeros_like(a,dtype=np.float32));m['takes'][1]['file']='bad.wav'
        if bad=='rate':wavfile.write(d/'bad.wav',44100,a.astype(np.float32));m['takes'][1]['file']='bad.wav'
        if bad=='duplicate':m['takes'][1]['id']='reference'
        if bad=='offset':m['takes'][1]['offsetSamples']=.5
        f.write_text(json.dumps(m))
        try:mod.analyze(f,d/bad)
        except ValueError:pass
        else:raise AssertionError('Accepted '+bad)
print(json.dumps({'passed':True,'syntheticOnly':True,'knownGainDb':6.02,'knownDelayMs':100,'repeatable':True,'deviceIO':False}))

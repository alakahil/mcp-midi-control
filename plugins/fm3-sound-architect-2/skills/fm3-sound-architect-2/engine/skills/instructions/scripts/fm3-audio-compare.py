#!/usr/bin/env python3
"""Compare guitar tone of a reference recording (ideally an isolated guitar stem) with an FM3 recording.
Usage: python3 fm3-audio-compare.py REFERENCE.(wav|mp3) FM3.(wav|mp3) [--fm3-start S --fm3-end E]
Validated use: third-octave tonal balance 125 Hz – 6.3 kHz and stereo width. Effects detection
(phaser rate, delay time) is NOT included: on 2026-10-15 both tested methods failed to find a known
0.6 Hz Script 90 and 480 ms delay in the user's own FM3 recording. Requires ffmpeg, numpy, scipy."""
import argparse, json, subprocess, tempfile, os
import numpy as np, scipy.io.wavfile as W, scipy.signal as S
BANDS=[125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300]
def load(path,start=None,end=None):
    with tempfile.TemporaryDirectory() as d:
        out=os.path.join(d,'a.wav');subprocess.run(['ffmpeg','-v','error','-y','-i',path,'-ar','48000','-ac','2',out],check=True)
        sr,x=W.read(out)
    x=x.astype(float)/32768
    if start is not None or end is not None: x=x[int((start or 0)*sr):int(end*sr) if end else None]
    return sr,x
def profile(sr,x):
    m=x.mean(1);s=(x[:,0]-x[:,1])/2;f,P=S.welch(m,sr,nperseg=8192)
    v=np.array([P[(f>=c/2**(1/6))&(f<c*2**(1/6))].sum() for c in BANDS]);bands=10*np.log10(v/v.sum())
    return {'bands':bands,'sideToMidDb':float(10*np.log10((s**2).mean()/((m**2).mean()+1e-12)+1e-12)),'rmsDb':float(20*np.log10(np.sqrt((m**2).mean())+1e-12))}
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('ref');a.add_argument('fm3');a.add_argument('--fm3-start',type=float);a.add_argument('--fm3-end',type=float);o=a.parse_args()
    r=profile(*load(o.ref));f=profile(*load(o.fm3,o.fm3_start,o.fm3_end));d=r['bands']-f['bands']
    regions={'low 125–200':[0,1,2],'low-mid 250–400':[3,4,5],'mid 500–1k':[6,7,8,9],'upper-mid 1.25–2.5k':[10,11,12,13],'presence 3.15–6.3k':[14,15,16,17]}
    out={'bandsHz':BANDS,'referenceMinusFm3Db':[round(float(v),1) for v in d],'regionsDb':{k:round(float(d[i].mean()),1) for k,i in regions.items()},
         'sideToMidDb':{'reference':round(r['sideToMidDb'],1),'fm3':round(f['sideToMidDb'],1)},
         'note':'Positive = reference has more energy in that band (relative balance, levels normalized). Different notes/playing shift single bands; trust region averages and agreement across clips.'}
    print(json.dumps(out,indent=1))

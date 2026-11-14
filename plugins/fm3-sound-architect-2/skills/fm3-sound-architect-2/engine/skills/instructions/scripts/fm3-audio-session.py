#!/usr/bin/env python3
"""Offline SV4 WAV comparison. Requires ffmpeg, ffprobe, numpy and scipy.
Only reads existing recordings; never records audio or opens an FM3 connection.
Usage: fm3-audio-session.py MANIFEST.json NEW_OUTPUT_DIRECTORY
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import numpy as np
import scipy
from scipy import signal
from scipy.io import wavfile


def check(ok, message):
    if not ok:
        raise ValueError(message)


def digest(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def run(args):
    p = subprocess.run(args, capture_output=True)
    check(p.returncode == 0, p.stderr.decode(errors='replace')[-1500:])
    return p


def load_wav(p):
    check(p.suffix.lower() == '.wav', 'Use lossless WAV recordings')
    info = json.loads(run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_streams', '-of', 'json', str(p)]).stdout)['streams'][0]
    check(info['codec_name'].startswith('pcm_'), 'WAV must contain uncompressed PCM')
    channels, rate = int(info['channels']), int(info['sample_rate'])
    check(channels in (1, 2), 'Export the intended mono/stereo pair; do not mix a four-channel wet/DI file')
    raw = run(['ffmpeg', '-v', 'error', '-i', str(p), '-map', '0:a:0', '-f', 'f64le', '-acodec', 'pcm_f64le', '-']).stdout
    x = np.frombuffer(raw, dtype='<f8').reshape(-1, channels).copy()
    check(np.isfinite(x).all() and len(x) >= rate, 'Need at least one second of finite audio')
    check(np.max(np.abs(x)) > 1e-8, 'Silent recording cannot be compared')
    return rate, x


def loudness(p):
    # No level changes: ffmpeg analyzes the original waveform.
    log = run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-af',
               'astats=measure_perchannel=none:measure_overall=RMS_level+Peak_level,ebur128=peak=true', '-f', 'null', '-']).stderr.decode()
    def last(pattern):
        found = re.findall(pattern, log)
        return None if not found or found[-1] in ('-inf', 'inf', 'nan') else float(found[-1])
    return {'integratedLufs': last(r'I:\s+(-?[\d.]+|-inf|nan) LUFS'),
            'rmsDbfs': last(r'RMS level dB:\s+(-?[\d.]+|-inf|nan)'),
            'samplePeakDbfs': last(r'Peak level dB:\s+(-?[\d.]+|-inf|nan)'),
            'truePeakDbtp': last(r'Peak:\s+(-?[\d.]+|-inf|nan) dBFS')}


def align(reference, candidate, rate, max_lag_seconds=0.5):
    """Energy-envelope alignment, resolution <= 1 ms; never infer exact sample sync."""
    hop = max(1, round(rate / 1000))
    def envelope(x):
        p = np.mean(x*x, axis=1)
        p = p[:len(p)//hop*hop].reshape(-1, hop).mean(axis=1)
        return np.sqrt(p)
    a, b = envelope(reference), envelope(candidate)
    # Normalize per overlap so a short loud transient cannot dominate the score.
    max_lag = round(max_lag_seconds*rate/hop)
    best = (-2.0, 0)
    for lag in range(-max_lag, max_lag+1):
        aa, bb = a[max(0, -lag):], b[max(0, lag):]
        n = min(len(aa), len(bb)); aa, bb = aa[:n], bb[:n]
        if n < 500:
            continue
        aa, bb = aa-aa.mean(), bb-bb.mean()
        den = np.linalg.norm(aa)*np.linalg.norm(bb)
        score = float(np.dot(aa, bb)/den) if den > 1e-12 else -2
        if score > best[0]:
            best = score, lag
    check(best[0] >= 0.65, 'Alignment ambiguous: specify offsetSamples from the DAW or use a more distinctive common DI excerpt')
    check(abs(best[1]) < max_lag, 'Alignment hit search boundary; supply offsetSamples')
    return best[1]*hop, {'method': 'stereo-energy-envelope correlation', 'score': best[0], 'resolutionSamples': hop,
                         'exactSampleAlignment': False, 'requiresListeningReview': True}


def waveform_metrics(x, rate, tail_start=None):
    energy = np.mean(x*x)
    check(energy > 1e-16, 'Analysis excerpt is silent')
    db = lambda a: float(10*np.log10(max(float(a), 1e-20)))
    n = max(1, round(rate*0.05))
    windows = np.mean(x[:len(x)//n*n].reshape(-1, n, x.shape[1])**2, axis=(1, 2))
    f, p = signal.welch(x, rate, axis=0, nperseg=min(8192, len(x)))
    p = p.mean(axis=1)  # Preserve anti-phase stereo energy.
    bands = [(20, 80), (80, 200), (200, 500), (500, 1500), (1500, 4000), (4000, 10000), (10000, rate/2)]
    spectrum = [{'lowHz': lo, 'highHz': hi, 'relativeEnergyDb': db(p[(f >= lo) & (f < hi)].sum()/max(p.sum(), 1e-30))}
                for lo, hi in bands if hi > lo]
    out = {'rmsDbfs': db(energy), 'samplePeakDbfs': db(np.max(x*x)),
           'crestFactorDb': db(np.max(x*x))-db(energy),
           'window50msRmsPercentilesDbfs': [db(v) for v in np.percentile(windows, [10, 50, 90])],
           'spectralBands': spectrum, 'samplesAtOrAboveFullScale': int(np.sum(np.abs(x) >= 1)),
           'tail': None}
    if tail_start is not None:
        check(0 <= tail_start < len(x)/rate, 'tailStartSeconds outside aligned excerpt')
        y = x[round(tail_start*rate):]
        chunks = []
        for i in range(0, len(y), n):
            chunks.append({'secondsAfterStop': i/rate, 'rmsDbfs': db(np.mean(y[i:i+n]**2))})
        out['tail'] = {'declaredStopSeconds': tail_start, 'envelope50ms': chunks,
                       'interpretation': 'Observed tail/repeats only; not automatic effect identification or RT60 measurement'}
    return out


def analyze(manifest_path, output):
    manifest_path, output = Path(manifest_path).resolve(), Path(output).resolve()
    m = json.loads(manifest_path.read_text())
    check(m.get('version') == 1, 'Manifest version must be 1')
    check(isinstance(m.get('recordingChain'), dict) and m['recordingChain'], 'Describe recordingChain')
    takes = m.get('takes', [])
    check(2 <= len(takes) <= 3, 'Use reference and one or two candidates')
    check(all(re.fullmatch(r'[A-Za-z0-9_-]+', t.get('id', '')) for t in takes), 'Use simple unique take IDs')
    check(len({t['id'] for t in takes}) == len(takes), 'Duplicate take ID')
    check(not output.exists(), 'Output directory already exists; originals are never overwritten')
    paths = [(manifest_path.parent/t['file']).resolve() for t in takes]
    hashes = [digest(p) for p in paths]
    loaded = [load_wav(p) for p in paths]
    rate = loaded[0][0]
    check(all(r == rate and x.shape[1] == loaded[0][1].shape[1] for r, x in loaded), 'Sample rates and channel counts must match; no silent resampling')
    offsets, alignments = [0], [{'method': 'reference', 'exactSampleAlignment': True}]
    for t, (_, x) in zip(takes[1:], loaded[1:]):
        if 'offsetSamples' in t:
            offset = t['offsetSamples'];check(type(offset) is int, 'offsetSamples must be an integer')
            alignment = {'method': 'user-declared offset', 'exactSampleAlignment': False, 'requiresListeningReview': True}
        else:
            offset, alignment = align(loaded[0][1], x, rate)
        offsets.append(offset);alignments.append(alignment)
    start = max(0, -min(offsets))
    stop = min(len(x)-o for (_, x), o in zip(loaded, offsets))
    start = max(start, round(float(m.get('startSeconds', 0))*rate))
    if 'endSeconds' in m:
        stop = min(stop, round(float(m['endSeconds'])*rate))
    check(stop-start >= rate, 'Less than one second of common audio')
    crops = [x[start+o:stop+o] for (_, x), o in zip(loaded, offsets)]
    output.mkdir(parents=True)
    rows = []
    for t, p, x, offset, alignment, original_hash in zip(takes, paths, crops, offsets, alignments, hashes):
        aligned = output/(t['id']+'-aligned.wav');wavfile.write(aligned, rate, x.astype(np.float32))
        metrics = loudness(aligned)
        check(metrics['integratedLufs'] is not None and metrics['integratedLufs'] > -60, 'Insufficient signal for LUFS comparison')
        rows.append({'id': t['id'], 'originalFile': str(p), 'originalSha256': original_hash,
                     'original': loudness(p), 'aligned': metrics, 'offsetSamples': offset, 'alignment': alignment,
                     'waveform': waveform_metrics(x, rate, m.get('tailStartSeconds'))})
    target = min(r['aligned']['integratedLufs'] for r in rows)
    gains = [target-r['aligned']['integratedLufs'] for r in rows]
    # Apply a common extra attenuation if needed; no limiter or per-take clipping.
    peaks = [r['aligned']['truePeakDbtp'] if r['aligned']['truePeakDbtp'] is not None else r['aligned']['samplePeakDbfs'] for r in rows]
    common = min(0, -1-max(p+g for p, g in zip(peaks, gains)))
    for row, x, gain in zip(rows, crops, gains):
        gain += common
        p = output/(row['id']+'-AB.wav');wavfile.write(p, rate, (x*10**(gain/20)).astype(np.float32))
        row['listeningCopy'] = {'file': p.name, 'gainDb': gain, 'sha256': digest(p), 'measured': loudness(p)}
    spread = max(r['listeningCopy']['measured']['integratedLufs'] for r in rows)-min(r['listeningCopy']['measured']['integratedLufs'] for r in rows)
    di = m.get('commonDiFile')
    result = {'kind': 'fm3-audio-session-analysis', 'version': 1, 'manifestSha256': digest(manifest_path),
              'syntheticOnly': m.get('syntheticOnly') is True, 'recordingChain': m['recordingChain'],
              'commonDi': {'sha256': digest(manifest_path.parent/di), 'useAcrossTakes': 'user-declared; not inferred from wet recordings'} if di else None,
              'commonExcerpt': {'sampleRate': rate, 'referenceStartSample': start, 'referenceEndSample': stop},
              'takes': rows, 'abLufsSpreadDb': spread, 'abWithinHalfDb': spread <= 0.5,
              'versions': {'python': sys.version.split()[0], 'numpy': np.__version__, 'scipy': scipy.__version__,
                           'ffmpeg': run(['ffmpeg', '-version']).stdout.decode().splitlines()[0]},
              'limits': ['Metrics support listening; no sound-match percentage.', 'Auto alignment is approximate and needs review.',
                         'Original levels retained; only listening copies are matched.', 'No new FM3 import, CPU or STORE evidence.'],
              'deviceIO': False}
    check(hashes == [digest(p) for p in paths], 'Original recording changed during analysis')
    (output/'analysis.json').write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False)+'\n')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest');parser.add_argument('output')
    args = parser.parse_args()
    try:
        result = analyze(args.manifest, args.output)
        print(json.dumps({'written': str(Path(args.output)/'analysis.json'), 'takes': len(result['takes']),
                          'abWithinHalfDb': result['abWithinHalfDb'], 'deviceIO': False}))
    except (ValueError, OSError, KeyError) as e:
        parser.exit(1, str(e)+'\n')

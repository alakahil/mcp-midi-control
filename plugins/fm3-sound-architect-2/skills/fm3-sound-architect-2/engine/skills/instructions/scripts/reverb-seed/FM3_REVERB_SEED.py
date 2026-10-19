#!/usr/bin/env python3
"""One explicitly confirmed GET. No SET, retries or automatic port selection."""
import datetime, glob, hashlib, json, sys, zipfile
from pathlib import Path
from reverb_transport import GET, collect, checksum
ROOT = Path(__file__).resolve().parent

def main():
    expected = json.loads((ROOT/'expected.json').read_text())
    donor = ROOT/'FM3_REVERB_SELECTION_001.syx'
    if hashlib.sha256(donor.read_bytes()).hexdigest() != expected['syxSha256']:
        raise ValueError('SYX kontrollsumma ei kattu. Seadmega ei ühendutud.')
    if checksum(GET[:-2]) != GET[-2]: raise ValueError('GET checksum')
    ports = sorted(glob.glob('/dev/cu.usbmodem*'))
    print('Leitud pordid:', ', '.join(ports) or '(puuduvad)')
    if len(sys.argv) != 2 or sys.argv[1] not in ports:
        print('Käivita uuesti: python3 FM3_REVERB_SEED.py /dev/cu.usbmodem...')
        return 2
    port = sys.argv[1]
    print('Jäta FM3-sse FM3_REVERB_SELECTION_001.syx ekspordi seisund.')
    print("A=Chamber: Deep Chamber; B=Chamber: Large Chamber; C=Chamber: Medium Chamber; D=Chamber: Small Chamber.")
    print('Sulge FM3-Edit ja teised FM3 ühendust kasutavad programmid.')
    print('Saadan ÜHE Reverb1 GET-päringu porti ' + port + '. Seade ei saa SET- ega SAVE-käske.')
    if input('Kinnitamiseks kirjuta GET ja vajuta Enter: ').strip() != 'GET':
        print('Katkestatud. Päringut ei saadetud.'); return 0
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d_%H%M%S_%f')
    out = ROOT/('FM3_REVERB_SEED_RESULT_'+stamp+'.zip')
    report = {'schemaVersion':1,'port':port,'utc':stamp,'txHex':GET.hex(),'txCalls':0,'rxChunks':[], 'syxSha256':expected['syxSha256'],'status':'error'}
    try:
        response = collect(port,report)
        report['response'] = response
        report['differences'] = [{'index':i,'syx':a,'get':b} for i,(a,b) in enumerate(zip(expected['values'],response['values'])) if a != b]
        report['all284WordsMatch'] = response['values'] == expected['values']
        report['status'] = 'match' if report['all284WordsMatch'] else 'mismatch'
    except (Exception, KeyboardInterrupt) as exc:
        report['error'] = str(exc)
    with zipfile.ZipFile(out,'x',zipfile.ZIP_DEFLATED) as z:
        z.writestr('capture.json',json.dumps(report,indent=2)+'\n')
        z.write(donor,donor.name)
        z.write(ROOT/'expected.json','expected.json')
    print('Tulemus:',report['status'])
    print('Lohista vestlusse see ZIP:\n'+str(out))
    return 0 if report['status']=='match' else 1

if __name__ == '__main__':
    try: sys.exit(main())
    except (ValueError,OSError,EOFError,KeyboardInterrupt) as exc:
        print('Peatatud:',exc); sys.exit(1)

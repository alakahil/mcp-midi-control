#!/usr/bin/env python3
"""Guided batches; manual model selection, explicit one-GET confirmation per pair."""
import argparse, datetime, json, shlex, shutil, subprocess, sys, uuid, zipfile
from pathlib import Path
import FM3_AMP_COLLECTOR as core
HERE=Path(__file__).resolve().parent

def offline(command, target, ids=None):
    args=['node',str(HERE/'fm3-batch-check.mjs'),command,str(target)]
    if ids is not None: args.append(json.dumps(ids))
    r=subprocess.run(args,capture_output=True,text=True)
    core.check(r.returncode==0,r.stderr.strip() or 'Offline validation failed')
    return json.loads(r.stdout)

def capture(root,port,data):
    now=datetime.datetime.now(datetime.timezone.utc)
    folder=root/('capture-'+now.strftime('%Y%m%dT%H%M%S')+'-'+uuid.uuid4().hex[:12]);folder.mkdir()
    core.put_new(folder/'donor.syx',data)
    report={'schemaVersion':1,'collectorVersion':4,'date':now.isoformat(),'firmwareDeclared':13,
            'transport':'Python POSIX nonblocking select/read','port':port,'txHex':core.GET.hex(),'txCalls':0,'rxChunks':[]}
    try:
        print('TX (one GET): '+core.GET.hex(),flush=True)
        core.collect(port,report);report['status']='captured'
    except (Exception,KeyboardInterrupt) as e: report.update(status='failed',error=str(e) or 'Interrupted')
    finally: core.put_new(folder/'capture.json',(json.dumps(report,indent=2)+'\n').encode())
    print('Saved: '+str(folder))
    core.check(report['status']=='captured',report.get('error','Capture failed'))
    offline('pair',folder)
    print('PASS: GET/SYX 576/576, kontrollsummad korras.')
    return folder

def export_zip(root):
    # Revalidate immediately before export; include complete original evidence.
    offline('next',root)
    out=root.parent/('FM3_AMP_BATCH_'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'_'+uuid.uuid4().hex[:8]+'.zip')
    with zipfile.ZipFile(out,'x',zipfile.ZIP_DEFLATED) as z:
        z.write(root/'session.json','session.json')
        for folder in sorted(root.glob('capture-*')):
            core.check(not folder.is_symlink(),'Symlink capture refused')
            if not folder.is_dir(): continue
            for name in ['capture.json','donor.syx']:
                p=folder/name
                core.check(not p.is_symlink(),'Symlink file refused')
                if p.is_file(): z.write(p,folder.name+'/'+name)
    print('Laadi vestlusse see ZIP: '+str(out))
    return out

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--session',required=True);p.add_argument('--port');p.add_argument('--firmware',type=int,choices=[13],required=True)
    p.add_argument('--export-only',action='store_true');args=p.parse_args()
    core.check(shutil.which('node'),'Node puudub. Paigalda Node.js enne partiirežiimi kasutamist.')
    core.check(args.export_only or (args.port and args.port.startswith('/dev/cu.')),'Anna kinnitatud /dev/cu.* port')
    root=core.session(args.session,not args.export_only)
    if args.export_only: export_zip(root);return
    print('Mudelid vali käsitsi FM3-Editis. Save/Store pole vajalik. q = lõpeta ja tee ZIP.')
    while True:
        state=offline('next',root)
        if not state['models']: print('Kõik kataloogimudelid kogutud.');break
        print('\nPuudu: '+str(state['remaining']))
        for ch,m in zip('ABCD',state['models']):print(ch+': '+m['name']+' (ID '+str(m['id'])+')')
        if len(state['models'])<4: print('Ülejäänud kanalid jäta samaks.')
        answer=input('Vali mudelid, ekspordi SYX ja lohista fail siia (või q): ').strip()
        if answer.lower()=='q':break
        try:
            paths=shlex.split(answer);core.check(len(paths)==1,'Anna üks SYX-faili tee')
            syx=Path(paths[0]).expanduser()
            # Snapshot before validation and capture, preventing changed source pairing.
            import tempfile
            with tempfile.TemporaryDirectory() as tmp:
                staged=Path(tmp)/'donor.syx';data=syx.read_bytes();staged.write_bytes(data)
                offline('preflight',staged,[m['id'] for m in state['models']])
                if input('Sulge FM3-Edit/Fractal-Bot, jäta seaded samaks. Üks GET? [jah/q]: ').strip().lower()!='jah':break
                capture(root,args.port,data)
        except (ValueError,OSError) as e:
            print('PEATATUD: '+str(e)+'\nAndmed säilivad. Paranda põhjus; automaatset korduspäringut ei tehta.')
            sys.exit(1)
    export_zip(root)

if __name__=='__main__':
    try:main()
    except KeyboardInterrupt:print('\nPeatatud. Jätkamiseks käivita sama käsk; andmed säilivad.');sys.exit(1)
    except Exception as e:print('Error: '+str(e),file=sys.stderr);sys.exit(1)

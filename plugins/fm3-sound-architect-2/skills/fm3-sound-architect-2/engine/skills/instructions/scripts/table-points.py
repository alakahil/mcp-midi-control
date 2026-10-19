"""Collect hardware-measured (block, pid, display value, raw) points from evidence folders. Read-only."""
import json,glob,os,sys
def rows(ref):
    out=[]
    for p in json.load(open(os.path.join(ref,'filter-controls.json')))['points']:
        out.append(('filter',114,p['parameterId'],p['targetValue'],p['raw']))
    for f in sorted(glob.glob(os.path.join(ref,'peq-controls-*/*/result.json'))):
        d=json.load(open(f))
        if d.get('status')!='passed': continue
        cw=d['comparison'].get('changedWords',[])
        if len(cw)==1: out.append(('peq',54,cw[0]['pid'],d['step']['value'],cw[0]['after']))
    for f in sorted(glob.glob(os.path.join(ref,'drive-controls-*/*/result.json'))):
        d=json.load(open(f))
        if d.get('status')!='passed' or d['step'].get('kind')!='control': continue
        ch=d['comparison']['changes']
        if len(ch)==2 and ch[1]['offset']==ch[0]['offset']+1:
            out.append(('drive',118,d['step']['pid'],d['step']['value'],ch[0]['after']|ch[1]['after']<<8))
    for f in sorted(glob.glob(os.path.join(ref,'geq-full-*/*/result.json'))):
        d=json.load(open(f)); s=d['step']
        if d.get('status')=='passed' and s.get('kind')=='bands' and 'values' in s:
            for w,v in zip(d['comparison']['changedWords'],s['values']): out.append(('geq',50,w['pid'],v,w['after']))
    return out
if __name__=='__main__':
    print(json.dumps(rows(sys.argv[1])))

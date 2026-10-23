import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import transport as t
import FM3_MOD_HW_BATCH as batch

PLAN=json.loads((Path(__file__).parent/'plan.json').read_text())
BASE=[14,16375,65534,0,32767,65534,32767,66,94,5,0,0,0,32767,32767,0,0,0,0,0,0,65534,65534,0,1]


def burst(effect,values):
    return [t.frame(116,[effect,0,len(values)&127,len(values)>>7]),
            t.frame(117,[len(values)&127,len(values)>>7,*[b for v in values for b in (v&127,v>>7&127,v>>14)]]),
            t.frame(118,[])]


class Fake:
    def __init__(self, wrong=False, collateral=False, unstable=False, fail=None):
        self.current=BASE.copy()
        if wrong:self.current[8]=95
        self.sent=[];self.collateral=collateral;self.unstable=unstable;self.fail=fail
    def get(self,effect,count,label):
        if self.fail=='get' and self.sent:raise TimeoutError('lost readback')
        if effect==94:return [0]*100
        result=self.current.copy()
        if self.unstable and label.endswith('read-2'):result[2]-=1
        return result
    def set(self,s):
        self.sent.append(s)
        if self.fail=='set':raise OSError('uncertain write')
        self.current[s['pid']]=s.get('allowedModelWords',[12345])[0]
        if self.collateral:self.current[8]=95


def run(fake,plan=PLAN):
    report=dict(steps=[],status='pending')
    batch.run_steps(fake,plan,dict(modWords=BASE,wahWords=[0]*100),report,lambda:None)
    return report


class Tests(unittest.TestCase):
    def test_known_get_wire_and_exact_bits(self):
        self.assertEqual(t.get_frame(94).hex(),'f0000174111f5e0055f7')
        self.assertEqual(t.get_frame(3).hex(),'f0000174111f030008f7')
        for s in PLAN['steps']:
            f=t.set_frame(s)
            self.assertEqual(len(f),23)
            self.assertEqual(f[8:12],bytes([3,0,s['pid'],0]))
            self.assertEqual(sum(b << 7*i for i,b in enumerate(f[12:17])),int(s['inputBits'],16))
            self.assertEqual(t.checksum(f[:-2]),f[-2])
    def test_fragmentation_realtime_and_raw_uint16(self):
        data=b''.join(burst(3,BASE))
        for width in (1,2,7,31,1000):
            p=t.Framer()
            for i in range(0,len(data),width):p.feed(data[i:i+width]+b'\xf8')
            self.assertEqual(t.decode(p.frames,3,25),BASE)
    def test_bad_checksum_model_nested_start_and_partial(self):
        good=burst(3,BASE)[0]
        for bad in (good[:-2]+bytes([good[-2]^1,247]),t.frame(116,[3,0,25,0]).replace(b'\x11',b'\x12',1),b'\xf0\xf0'):
            with self.assertRaises(ValueError):t.Framer().feed(bad)
        p=t.Framer();p.feed(good[:-1]);self.assertIsNotNone(p.partial)
    def test_wrong_effect_count_order_duplicate_and_word_width(self):
        for frames in (burst(94,BASE),burst(3,BASE[:-1]),burst(3,BASE)[::-1],burst(3,BASE)*2,burst(3,[65536]*25)):
            with self.assertRaises(ValueError):t.decode(frames,3,25)
    def test_wrong_preflight_sends_zero_sets(self):
        f=Fake(wrong=True)
        with self.assertRaisesRegex(ValueError,'0 SET'):run(f)
        self.assertEqual(f.sent,[])
    def test_all_steps_are_captured_and_noop_is_not_witness(self):
        with patch('builtins.print'):
            r=run(Fake())
        self.assertEqual(len(r['steps']),44)
        self.assertEqual(r['status'],'captured-awaiting-final-export')
        noop={'steps':[dict(PLAN['steps'][0],pid=3,allowedModelWords=[0])]}
        with patch('builtins.print'):r=run(Fake(),noop)
        self.assertFalse(r['steps'][0]['conversionWitness'])
    def test_collateral_stops_after_one_write(self):
        f=Fake(collateral=True)
        with self.assertRaisesRegex(ValueError,'Unrequested'):run(f)
        self.assertEqual(len(f.sent),1)
    def test_unstable_read_stops_after_one_write(self):
        f=Fake(unstable=True)
        with self.assertRaisesRegex(ValueError,'disagree'):run(f)
        self.assertEqual(len(f.sent),1)
    def test_timeout_or_uncertain_set_is_not_retried(self):
        for failure in ('get','set'):
            f=Fake(fail=failure)
            with self.assertRaises((TimeoutError,OSError)):run(f)
            self.assertEqual(len(f.sent),1)
    def test_forbidden_target_and_operation_and_nan(self):
        for changes in (dict(pid=8),dict(operation=147),dict(inputBits='0x7fc00000'),dict(inputBits='0xbf800000')):
            with self.assertRaises(ValueError):t.set_frame(dict(PLAN['steps'][0],**changes))
        with self.assertRaises(ValueError):t.get_frame(58)
    def test_ordinary_points_are_not_given_presumed_raw(self):
        self.assertTrue(all('allowedModelWords' not in x for x in PLAN['steps'][-9:]))
        self.assertEqual({x['pid'] for x in PLAN['steps'][-9:]},{3,4,5,6,7,12,13,14,15})
    def test_live_wah_capture_replays_if_available(self):
        p=Path(__file__).resolve().parents[3]/'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/wah-collector/seed/capture-001/capture.json'
        if not p.exists():self.skipTest('Repo fixture not packaged')
        r=json.loads(p.read_text());parser=t.Framer();parser.feed(bytes.fromhex(r['rawRxHex']))
        self.assertEqual(t.decode(parser.frames,94,100),r['response']['values'])
    def test_partial_write_logged_and_never_retried(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'wire.jsonl';s=t.Serial('/dev/unused',t.Journal(p));s.fd=99
            with patch('transport.os.write',return_value=2) as write:
                with self.assertRaisesRegex(ValueError,'Partial'):s.send(t.get_frame(3),'test')
                self.assertEqual(write.call_count,1)
            self.assertEqual([json.loads(x)['kind'] for x in p.read_text().splitlines()],['tx-intent','tx-result'])
    def test_serial_transport_over_local_pseudo_terminal(self):
        # Exercise actual POSIX fd/framing/quiet-window handling, without hardware.
        import os, pty, select, threading
        master, slave=pty.openpty();port=os.ttyname(slave);done=threading.Event();errors=[]
        values=BASE.copy();parser=t.Framer();seen=0
        def device():
            nonlocal seen
            try:
                while not done.is_set():
                    if not select.select([master],[],[],.05)[0]:continue
                    parser.feed(os.read(master,4096))
                    while seen<len(parser.frames):
                        f=parser.frames[seen];seen+=1
                        if f[5]==31:
                            reply=b''.join(burst(f[6],values if f[6]==3 else [0]*100))
                        else:
                            self.assertEqual(f[8:10],b'\x03\x00')
                            values[f[10]]=0
                            reply=f  # Echo is not the raw readback.
                        for offset in range(0,len(reply),7):os.write(master,reply[offset:offset+7]+b'\xf8')
            except Exception as exc:errors.append(exc)
        thread=threading.Thread(target=device,daemon=True);thread.start()
        try:
            with tempfile.TemporaryDirectory() as d:
                with t.Serial(port,t.Journal(Path(d)/'wire.jsonl')) as link:
                    self.assertEqual(link.get(3,25,'preflight'),BASE)
                    link.set(PLAN['steps'][0])
                    result=link.get(3,25,'after')
                    self.assertEqual(result[1],0);self.assertEqual(result[8:10],[94,5])
        finally:
            done.set();thread.join(1);os.close(master);os.close(slave)
        self.assertEqual(errors,[])


if __name__=='__main__':unittest.main()

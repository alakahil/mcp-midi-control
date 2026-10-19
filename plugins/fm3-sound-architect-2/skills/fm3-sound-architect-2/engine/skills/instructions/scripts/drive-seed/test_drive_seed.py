import json, os, pty, select, threading, unittest
from pathlib import Path
from drive_transport import GET, checksum, decode, Framer, collect
VALUES=json.loads((Path(__file__).parent/'expected.json').read_text())['values']
def frame(fn,payload):
    b=[240,0,1,116,17,fn]+payload
    return b+[checksum(b),247]
def burst():
    data=[n for v in VALUES for n in [v&127,(v>>7)&127,(v>>14)&3]]
    return [frame(116,[118,0,48,1]),frame(117,[48,1]+data),frame(118,[])]
class Tests(unittest.TestCase):
    def test_decode_and_fragmentation(self):
        f=Framer()
        for b in bytes(sum(burst(),[])): f.feed(bytes([b,248]))
        self.assertEqual(decode(f.frames)['values'],VALUES)
        self.assertEqual(checksum(GET[:-2]),GET[-2])
    def test_reject_bad_inputs(self):
        for kind in ['checksum','eid','count','truncated','duplicate']:
            b=burst()
            if kind=='checksum': b[1][-2]^=1
            if kind=='eid': b[0]=frame(116,[62,0,48,1])
            if kind=='count': b[0]=frame(116,[118,0,47,1])
            if kind=='truncated': b=b[:-1]
            if kind=='duplicate': b=b+b
            with self.assertRaises(ValueError,msg=kind):decode(b)
    def test_single_write_transport(self):
        master,slave=pty.openpty(); received=[]
        def device():
            if select.select([master],[],[],2)[0]:
                received.append(os.read(master,1024))
                os.write(master,bytes(sum(burst(),[])))
        t=threading.Thread(target=device);t.start()
        report={'rxChunks':[],'txCalls':0}
        try:
            self.assertEqual(collect(os.ttyname(slave),report,2)['values'],VALUES)
            t.join();self.assertEqual(received,[GET]);self.assertEqual(report['txCalls'],1)
        finally:os.close(master);os.close(slave)
if __name__=='__main__':unittest.main()

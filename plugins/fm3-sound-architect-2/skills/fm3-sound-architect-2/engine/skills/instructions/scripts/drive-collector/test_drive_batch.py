import importlib.util, json, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
import FM3_DRIVE_BATCH as app
class Tests(unittest.TestCase):
 def test_resume_and_skip_failure(self):
  with tempfile.TemporaryDirectory() as d:
   root=app.session(Path(d));import shutil
   shutil.copytree(app.HERE/'seed/capture-001',root/'capture-001')
   models,left=app.next_group(root);self.assertEqual(left,83);self.assertEqual([x['displayNumber'] for x in models],[5,6,7,8])
   f=root/'capture-failed';f.mkdir();(f/'capture.json').write_text('{"status":"failed"}')
   self.assertEqual(app.next_group(app.session(root))[1],83)
   with patch.object(app.core,'collect',side_effect=AssertionError('Device touched')):app.export_zip(root)
 def test_labels_conflict_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   root=app.session(Path(d));import shutil
   f=root/'capture-001';shutil.copytree(app.HERE/'seed/capture-001',f)
   labels=json.loads((f/'labels.json').read_text());labels[0]['name']='wrong';(f/'labels.json').write_text(json.dumps(labels))
   with self.assertRaisesRegex(ValueError,'Roster'):app.next_group(root)
if __name__=='__main__':unittest.main()

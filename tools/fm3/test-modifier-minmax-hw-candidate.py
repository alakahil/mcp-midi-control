import copy
from collections import Counter
import unittest
from modifier_minmax_hw_candidate import plan_request, choose_word, POLICY
from modifier_minmax_plan import plan_request as old_plan, POLICY as OLD
from modifier_op82_candidate import candidate_word, ModeDependentValue


class Candidate(unittest.TestCase):
    def test_observed_647_for_both_fields_has_field_specific_evidence(self):
        rows=plan_request(dict(policy=POLICY,min='6.47',max='6.47'))['changes']
        self.assertEqual([(r['pid'],r['normalizedBits'],r['raw']) for r in rows],
                         [(1,'0x3f25a1cb',42401),(2,'0x3f25a1cb',42401)])
        self.assertEqual([r['measuredSteps'] for r in rows],[['07'],['22']])
        self.assertTrue(all(not r['fourModeConsensus'] for r in rows))
    def test_all_1001_requests_accepted_with_explicit_evidence_scope(self):
        for field in ('min','max'):
            counts=Counter()
            for n in range(1001):
                result=plan_request(dict(policy=POLICY,**{field:f'{n//100}.{n%100:02}'}))
                row=result['changes'][0];counts[row['evidenceBasis']]+=1
                self.assertFalse(result['fullRangeEncodingProven'])
                if row['evidenceBasis']=='four-mode-consensus-only':
                    self.assertEqual(set(row['modes'].values()),{row['raw']})
            self.assertEqual(counts,{'hardware-exact-input':6,'four-mode-consensus-only':995})
    def test_old_policy_keeps_ambiguity_and_historical_semantics_separate(self):
        with self.assertRaises(ModeDependentValue):old_plan(dict(policy=OLD,min='6.47'))
        with self.assertRaises(ModeDependentValue):candidate_word(0x3f25a1cb)
        for field,value,raw,old_raw in [('min','2.50',16384,16375),('max','7.50',49151,49159),('max','5.00',32767,32784)]:
            row=plan_request(dict(policy=POLICY,**{field:value}))['changes'][0]
            self.assertEqual(row['raw'],raw);self.assertNotEqual(row['raw'],old_raw)
    def test_unknown_precision_boundary_not_blanket_enabled(self):
        from modifier_transport_audit import bits,compare_modes
        unknown=next(w for n in range(1,100) for w in [bits((n+.5)/65534)] if len(set(compare_modes(w).values()))>1)
        with self.assertRaises(ModeDependentValue):choose_word(1,unknown)
        with self.assertRaises(ValueError):choose_word(3,0x3f25a1cb)
    def test_input_validation_preservation_and_flags(self):
        for value in (6.47,'6.470','-1.00','10.01','nan',' 6.47'):
            with self.assertRaises(ValueError):plan_request(dict(policy=POLICY,min=value))
        request=dict(policy=POLICY,max='6.47');before=copy.deepcopy(request);r=plan_request(request)
        self.assertEqual(request,before);self.assertEqual(len(r['changes']),1)
        self.assertFalse(r['publishedGeneratorSupport']);self.assertFalse(r['generatedPresetImported'])
        self.assertEqual(r['targetScope']['modifierChannelScope'],'ALL')


if __name__=='__main__':unittest.main()

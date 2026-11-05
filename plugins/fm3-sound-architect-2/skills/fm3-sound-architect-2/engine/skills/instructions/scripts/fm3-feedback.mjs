// Feedback Send/Return (0.3.51, T29 2026-11-05). Offline only.
// Every composer preset links row 2 to row 3 with a Feedback Send (effect id 182, 2 words x 1 channel, row 2 col 12)
// and a Feedback Return (186, 6 words x 1 channel, row 3 col 1). T29 (FM3 Mk II, FW13) loaded two presets into the
// edit buffer and read both records back with fn=0x1F (references/fm3-shot-t29-feedback-20261105.json):
//   Return: words 0..2 came back as written and FM3-Edit showed Return Level 80.0 %, Output Level -3.0 dB and
//     Balance 20.0, exactly the dictionary decode. So controls with block "return" write Return Level, Output Level
//     and Balance on channel A (the record has one channel).
//   Send: FM3-Edit shows "No user editable parameters" and the device cleared both written words to 0 on load, so
//     there is nothing to write and Send controls are refused.
// Bypass Mode (word 3) and Bypass (word 5) stay unwritable: only the default Thru / not bypassed was observed, and a
// bypassed Return would cut the row 2 signal from row 3.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const check=(v,m)=>{if(!v)throw Error(m)};
export const feedbackReceiptHash='7fc2a9981f737b51e2f385d9e40f2ad40f2f35c97d6f854747d063ab8fc389a9';
const receiptBytes=fs.readFileSync(new URL('../references/fm3-shot-t29-feedback-20261105.json',import.meta.url));
check(createHash('sha256').update(receiptBytes).digest('hex')===feedbackReceiptHash,'Feedback receipt changed; run tools/fm3/t29-feedback-ingest.mjs and review');
const receipt=JSON.parse(receiptBytes);
export const FEEDBACK_RETURN=Object.freeze({effectId:186,words:6,channels:1});
export const RETURN_WRITABLE=Object.freeze({0:'FDBKRET_RETLEVEL',1:'FDBKRET_LEVEL',2:'FDBKRET_PAN'});
export const SEND_REFUSED='Feedback Send has no user editable parameters; the FM3 clears its words on load (T29)';
// Called from validateControl for every control with block "return" (resolved dictionary entry).
export function validateFeedbackControl(p){
  check(p.family==='FDBKRET'&&p.block===FEEDBACK_RETURN.effectId&&RETURN_WRITABLE[p.param]===p.name,`Feedback Return ${p.name??p.param}: only Return Level, Output Level and Balance are writable (T29)`);
}
export function feedbackCapabilities(){
  return {block:'return',effectId:186,channels:['A'],writable:Object.values(RETURN_WRITABLE),
    refused:{send:SEND_REFUSED,FDBKRET_BYPASSMODE:'only Thru observed',FDBKRET_BYPASS:'would cut row 3 from row 2',FDBKRET_GLOBALMIX:'unused'},
    hardwareReceipt:{file:'references/fm3-shot-t29-feedback-20261105.json',sha256:feedbackReceiptHash,editorReadings:receipt.summary.editorReadingsMatched,returnWords:receipt.summary.returnWordsMatched},
    limits:['Composer and grid presets always hold one Send/Return pair; it is not added or removed by controls','Audio and STORE/reload not measured']};
}

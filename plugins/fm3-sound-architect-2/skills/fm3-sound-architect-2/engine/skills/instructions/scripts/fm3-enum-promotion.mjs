// FM3 option-selector promotion (0.3.45, 2026-11-03). Offline only.
// The pinned dictionary marks 348 option selectors 'enum-labels' (labels present, index convention unchecked).
// T24 (FM3 Mk II, FW13) wrote 51 of them at non-default labels through the edit buffer in 15 families, the block
// bulk read (fn=0x1F) returned the exact words and FM3-Edit showed exactly the expected label every time (no
// 0/1-based shift; references/fm3-shot-t24-enum-20261103.json). With the corpus check (every stored word of every
// candidate in 639 tracked preset bodies inside its list) this promotes the selectors listed as promoted in
// references/fm3-enum-promotion-20261103.json (tools/fm3/enum-promotion-build.mjs) to the default status
// 'enum-labels-crosschecked'. Type/model selectors, non-sound families, learn/preset/IR-bank pickers, families
// without a T24 reading and PHASER_LFOQUANTIZE stay opt-in. The type applicability policy still decides whether a
// control exists for the final channel type.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
export const ENUM_PROMOTION_STATUS='enum-labels-crosschecked';
export const enumPromotionHash='4f535c441551d00ab87ecc60e03b582248cd08e0d36e8c5f6db91d077f338def';
const bytes=fs.readFileSync(new URL('../references/fm3-enum-promotion-20261103.json',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==enumPromotionHash)throw Error('Enum promotion receipt changed; run tools/fm3/enum-promotion-build.mjs and review');
const receipt=JSON.parse(bytes);
const promoted=new Map(receipt.parameters.filter(r=>r.promoted).map(r=>[r.family+':'+r.param,r]));
export function effectiveEnumParameter(p){
  const r=promoted.get(p.family+':'+p.param);
  if(!r||p.status!=='enum-labels'||p.kind!=='enum')return p;
  if(r.name!==p.name||r.options!==p.enum.length||r.enumBase!==(p.enumBase??0))throw Error('Enum promotion binding mismatch: '+p.name);
  return {...p,status:ENUM_PROMOTION_STATUS,structuralStatus:p.status,enumEvidence:r.evidence};
}
export function enumPromotionSummary(){return {sha256:enumPromotionHash,...receipt.summary,hardwareReceipt:receipt.hardwareReceipt.file,rule:receipt.rule};}

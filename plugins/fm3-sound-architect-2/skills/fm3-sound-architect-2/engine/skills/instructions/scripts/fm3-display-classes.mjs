// FM3 display-class promotions (0.3.44, 2026-11-02). Offline only.
// Three structurally uniform parameter classes were read on hardware in T21/T22 (FM3 Mk II, FW13): the
// generator wrote off-grid values through the edit buffer, the block bulk read (fn=0x1F) returned the
// exact words, and every value FM3-Edit / the front panel showed equalled the requested display value.
//   Mix      flags 0x0705, linear 0…1 ×100 (shown 0…100 %, one decimal): 17 parameters; 6 read exactly.
//   Balance  flags 0x0900, linear -1…1 ×100 (shown -100…100, one decimal): 29 parameters; 11 read exactly.
//   Integer  class 0x01 stored integers (display = raw × multiplier, signed): 552 parameters; 10 read exactly
//            in T22 (multiplier 2 and negative values included), plus the earlier Ten-Tap / Plex readings.
// Each class shares one wire layout (flags, range and multiplier are identical within the class), so the
// verified points cover the class. These words move from opt-in 'linear-by-structure' to the default
// status 'taper-class-verified' (the class status used for the 280/280 knob curve). Parameters with their
// own display codec, an unsupported multiplier or any other status are left as they are, and the type
// applicability policy still decides whether a control exists for the final channel type.
// Receipts: references/fm3-shot-t21-mix-20261102.json, references/fm3-shot-t22-int-20261102.json.
export const PROMOTED_STATUS='taper-class-verified';
export const DISPLAY_CLASS_RECEIPTS=Object.freeze({mix:'fm3-shot-t21-mix-20261102.json',balance:'fm3-shot-t21-mix-20261102.json',integer:'fm3-shot-t22-int-20261102.json'});
export const DISPLAY_CLASS_EVIDENCE=Object.freeze({
  mix:'T21 2026-11-02: 6 Mix parameters (delay, reverb, phaser, chorus, flanger, pitch) shown exactly as written (0…100 %, one decimal); class 0x0705 shares one layout',
  balance:'T21 2026-11-02: 11 Balance parameters (amp, cab, drive, delay, reverb, phaser, chorus, flanger, wah, pitch, tremolo) shown exactly as written (-100…100, one decimal); class 0x0900 shares one layout',
  integer:'T22 2026-11-02: 10 class-0x01 integers (drive, reverb, delay, chorus, phaser; multiplier 2 and signed values) shown exactly raw × multiplier; with Ten-Tap Number of Taps and Plex Number of Delays readings'});
export function displayClassOf(p){
  if(p.status!=='linear-by-structure')return null;
  if(p.kind==='linear'&&p.flags==='0x0705'&&p.min===0&&p.max===1&&p.displayMultiplier===100)return 'mix';
  if(p.kind==='linear'&&p.flags==='0x0900'&&p.min===-1&&p.max===1&&p.displayMultiplier===100)return 'balance';
  if(p.kind==='integer'&&((parseInt(p.flags,16)>>8)&0xf)===1&&!p.displayCodec&&Number.isInteger(p.integerScale)&&p.integerScale>=1)return 'integer';
  return null;
}
export function effectiveDisplayClassParameter(p){
  const c=displayClassOf(p);
  return c?{...p,status:PROMOTED_STATUS,structuralStatus:p.status,displayClass:c,classEvidence:DISPLAY_CLASS_EVIDENCE[c]}:p;
}

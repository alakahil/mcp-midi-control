# Bounded modifier edits — sound schema 0.8.5

`modifierEdits` applies after this generation creates its Volume and Control
Switch bindings, and before layout, static controls, scenes and final readback.
The base remains the pinned `jb-newlook` base. It is not an arbitrary-preset editor.

## Input and identity

Each edit must name `operation`, `record` and `expect`. A replacement also needs
`binding`, with the existing `controlSwitches` shape. No other fields are accepted.
Records are 1–9; record 0 is excluded. A record must have been authored during
this generation and its complete 25-word preimage must match that authored record.
The explicit source and target must agree too. No Source-zero/free-slot heuristic
is used. Unknown preimages, secondary sources, operations or reserved-tail drift
fail. The operation preserves record headers and all undeclared bytes.

Example additions to the historical P3 seed spec:

```json
{
  "modifierEdits": [
    {
      "operation": "remove",
      "record": 2,
      "expect": {"source": "Control Switch 2", "block": "amp", "param": "DISTORT_BOOST"}
    },
    {
      "operation": "replace",
      "record": 1,
      "expect": {"source": "External 1", "block": "volpan", "param": "VOLUME_GAIN"},
      "binding": {"switch": 2, "block": "amp", "param": "DISTORT_CUT"}
    }
  ]
}
```

The seed declares External 1 → Wah in record 0, Volume in record 1, CS2 → Boost
in record 2, CS3 → Bright in record 3 and CS4 → Fat in record 4. Record numbers
refer to that authored seed, not the order of edits. The original full spec remains
in `.spec.json`; a derived final binding set is used for readback and validation.

## Operations and preservation

- `remove`: clear only Source, target effect ID and target PID (words 0, 8, 9).
  Keep the old range/curve and other words inactive; never compact records.
- `replace`: clear the identified binding, then write an existing Control Switch
  template into words 0–20 of the same record. The old Min/Max, curve and channel
  are replaced, not inherited. Optional `invert` and `channel` use the existing
  Control Switch codecs. Preserve the 46-byte header and words 21–24.
- All preimages are checked before mutation. Selected old bindings are removed
  before replacements, so order cannot affect allocation or final target conflicts.
- Duplicate records/identities and duplicate final targets fail. At most eight
  final Control Switch bindings are allowed, matching the existing writer.
- A Volume edit requires record 1 next to active External 1 → Wah. No Wah edits,
  arbitrary sources/targets, free-slot allocator or arbitrary imported bases.

## Dependencies, reports and verification

`controlSwitchScenes` and `footswitches` must reference final bound switches.
An orphaned declaration fails; it is never silently removed. Static controls
run after edits, so freed targets can be written and newly bound ones are blocked.

TXT and validation show only final active Volume/CS bindings and include a
separate edit summary. The edit report preserves before/after words, written
word indexes and modifier-region hashes. The usual `fm3-preset.mjs --verify`
first regenerates the complete output from the pinned base and original spec,
then checks final components and text. Rehashing a tampered quartet is insufficient.

## Evidence and limits

P3 (`p3-modifier-reuse-20261030/`) confirmed Boost record 2 removal and Volume
record 1 reuse for CS2 → Cut, scene switching and STORE/reload in one fixed
preset. `test-modifier-edits` reproduces its original SYX exactly. The original
historical quartet remains unchanged and still has its own historical verifier.
T12 and `fm3-modifier-removal-20261028.json` supply the removal form; the existing
Control Switch evidence supplies full-range, invert and channel templates.

Other supported authored combinations are new software compositions of these
codecs, tested offline. Their own import, sound, CPU and STORE/reload are not
claimed. The public API does not prove all 32 records are writable or establish
FM3-Edit's automatic allocation strategy.

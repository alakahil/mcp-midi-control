# FM3 Sound Architect 2 0.3.17

The previous generator could insert and configure Volume/Pan, but could not author its pedal binding. This release adds explicit `volumePedal:true`: the exact firmware-created External 1 → Volume/Pan 1 Gain ALL default record captured in one FW13 user export. The public sound path applies the binding before static controls, so conflicting Gain writes are rejected. It requires the captured inactive modifier region; simultaneous Wah/Volume bindings and arbitrary allocation remain unsupported.

The generated measurement preset reproduces the entire 12970-byte hardware body. All bytes outside the single 50-byte modifier payload are preserved. Final verification checks SYX/TXT/spec/report consistency, including adversarial CRC-valid files with refreshed artifact hashes. The required offline suite grows from 59 to 60 checks. Existing Input gate, Volume controls, grid, CPU and Wah exact Min/Max support remain in scope with their original evidence limits.

This is one new active-buffer device export, not a numeric Min/Max sweep or new REA run. Existing Mac REA evidence informed the collection plan. `fullRangeEncodingProven=false`; no global pedal assignment, live SET, STORE/reload, pedal behavior or audio proof is claimed. The source includes only the derived 25-word evidence/hash receipt; the uploaded raw user export remains separate.

Build from a clean exact commit after all 60 required checks pass. Preserve the same private plugin. Record the source commit, four pre-merge CI runs, archive/manifest hashes, complete published file comparison, saved-launcher use and restoration receipt. Later backup commits do not become the published engine source commit.

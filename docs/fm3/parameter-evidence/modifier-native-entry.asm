# Bounded static evidence only; original SHA-256: 62d53aef2b4cc02ffbbcc91be8b04b17411deb51bce729c0a0c6e1ca76efbb1a

# event10Call
0x100179ae4: mov x0, x19
0x100179ae8: mov x1, x20
0x100179aec: bl #0x10017afa8

# numericEntry
0x10017afa8: cbz x1, #0x10017b058
0x10017afac: sub sp, sp, #0x50
0x10017afb0: stp d9, d8, [sp, #0x10]
0x10017afb4: stp x22, x21, [sp, #0x20]
0x10017afb8: stp x20, x19, [sp, #0x30]
0x10017afbc: stp x29, x30, [sp, #0x40]
0x10017afc0: add x29, sp, #0x40
0x10017afc4: mov x19, x0
0x10017afc8: ldrh w20, [x0, #0x4f8]
0x10017afcc: strh w20, [sp, #4]
0x10017afd0: ldrh w21, [x1, #0x10a]
0x10017afd4: strh w21, [sp, #6]
0x10017afd8: mov w8, #9
0x10017afdc: str w8, [sp, #8]
0x10017afe0: ldr x8, [x1]
0x10017afe4: ldr x8, [x8, #0x50]
0x10017afe8: mov x0, x1
0x10017afec: blr x8
0x10017aff0: fmov s8, s0
0x10017aff4: str s0, [sp, #0xc]
0x10017aff8: ldr x0, [x19, #0x460]
0x10017affc: ldr x8, [x0]
0x10017b000: ldr x8, [x8, #0x18]
0x10017b004: mov x1, x20
0x10017b008: mov x2, x21
0x10017b00c: blr x8
0x10017b010: cbz x0, #0x10017b028
0x10017b014: ldr s0, [x0, #0x10]
0x10017b018: fcmp s0, #0.0
0x10017b01c: b.eq #0x10017b028
0x10017b020: fdiv s0, s8, s0
0x10017b024: str s0, [sp, #0xc]
0x10017b028: ldr x8, [x19]
0x10017b02c: ldr x8, [x8, #0x1b0]
0x10017b030: add x1, sp, #4
0x10017b034: mov x0, x19
0x10017b038: mov w2, #0
0x10017b03c: mov x3, #0
0x10017b040: blr x8
0x10017b044: ldp x29, x30, [sp, #0x40]
0x10017b048: ldp x20, x19, [sp, #0x30]
0x10017b04c: ldp x22, x21, [sp, #0x20]
0x10017b050: ldp d9, d8, [sp, #0x10]
0x10017b054: add sp, sp, #0x50
0x10017b058: ret

# forwardNonzeroPid
0x1001796d4: sub sp, sp, #0x50
0x1001796d8: stp x22, x21, [sp, #0x20]
0x1001796dc: stp x20, x19, [sp, #0x30]
0x1001796e0: stp x29, x30, [sp, #0x40]
0x1001796e4: add x29, sp, #0x40
0x1001796e8: mov x20, x1
0x1001796ec: mov x19, x0
0x1001796f0: ldrh w8, [x1, #2]
0x1001796f4: cbz w8, #0x100179714
0x1001796f8: add x0, x19, #0x160
0x1001796fc: mov x1, x20
0x100179700: ldp x29, x30, [sp, #0x40]
0x100179704: ldp x20, x19, [sp, #0x30]
0x100179708: ldp x22, x21, [sp, #0x20]
0x10017970c: add sp, sp, #0x50
0x100179710: b #0x1000aefe4

# directDispatchChoice
0x1000af038: cbz x3, #0x1000af0fc

# directDispatchMode
0x1000af0fc: tbz w22, #0, #0x1000af2e4

# copyFloatToSerializer
0x1000af2e4: ldrh w8, [x21]
0x1000af2e8: add x0, x19, #0x38
0x1000af2ec: ldrh w9, [x21, #2]
0x1000af2f0: ldr w10, [x21, #4]
0x1000af2f4: ldr s0, [x21, #8]
0x1000af2f8: ldr x11, [x19, #0x40]
0x1000af2fc: stp w10, w8, [x11]
0x1000af300: str w9, [x11, #8]
0x1000af304: str s0, [x11, #0xc]
0x1000af308: ldr x2, [x19, #0x40]
0x1000af30c: str wzr, [x2, #0x14]
0x1000af310: add x1, sp, #8
0x1000af314: bl #0x100237874

# rotaryGetter
0x10025e9d0: ldr x0, [x0, #0x290]
0x10025e9d4: cbz x0, #0x10025e9e4
0x10025e9d8: ldr x8, [x0]
0x10025e9dc: ldr x1, [x8, #0x188]
0x10025e9e0: br x1
0x10025e9e4: movi d0, #0000000000000000
0x10025e9e8: ret

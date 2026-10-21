# 21.10.2026 katsetulemus: Damping’u paar kinnitatud

Kasutaja järelkatse eksport ja Linear-kuvatõend kinnitavad ainult keha baidi
1632 muutuse 0 → 1. **0.3.11 on avaldatud** commit'ist
`f0a99bc190fcbe3a63284335c68fad66e9f9a36c`; selle seose kahevalikuline
kirjutaja on kasutusel. Tõendikirje on plugina
`engine/skills/instructions/references/wah-damping-evidence.json`.
Allolev plaan ja `modifier-damping-plan.json` säilivad katseeelse ajaloona.
Järgmine töö: [Min-väärtuse üksikmuudatuse katse](modifier-min-plan.md).

---

# Damping’u järgmine eristav katse — 21.10.2026

Avaldatud lähtepunkt: **0.3.10**, commit
`dbd13c7a223a8f6e4615089bb9730059d1f3128f`, release
`pluginrel_6ad8888924488191bd6584c9c725320e`.
Käivitaja, serveripakett ja GitHubi main kontrolliti enne seda uurimistööd.
Käesolev muudatus lisab ainult uurimisjuhendi ja lugemisvõrdluse; plugina
pakett, tootmiskirjutaja ja avaldatud versioon jäävad muutmata.

## Olemasolevad tõendid

0.3.9 ajaloolist korpuseauditit ei kirjutata ümber. Kõigi SYX-, ZIP- ja
amp-history konteinerite Git-diff kuni 0.3.10-ni leiab ühe uue tõendifaili:
kasutaja Auto Engage OFF-ekspordi. Selle kontrollimine ja ajaloolise korpusega
ühendamine annab **700 kordumatut SYX-i, 690 toetatud faili, 10 välistust ja
3 modifikaatoriala profiili**. Uus profiil muudab Wah-kirjes ainult Auto
Engage'i sõna 10: 2 → 0. Damping’u muutmispaaride arv on endiselt **0**.
Arvutuse lähteandmed ja piirid on failis `modifier-damping-plan.json`.

| Tõenditasand | Damping’u seis |
| --- | --- |
| Baidiasukoht | MOD-deskriptor ja kirjelugeja seovad sõna 24 keha nihkega 1632, uint16 little-endian. Üksikvälja muutuse kinnitus veel puudub. |
| Arvukodeering | Olemasolevas Wah-seoses toorkood 0. FW13 metaandmetes on EXPONENTIAL / LINEAR; Linear=1 on kontrollitav hüpotees. |
| Kuvatähendus | Eelmise OFF-katse kuvatõendi tekst kirjeldab Damping Exponential’i; sama ekspordi sõna on 0. Linear’i kuvatõend ja eksport puuduvad. |
| Seadmekäitumine | Damping’u tegelikku ajakäitumist ei mõõdetud. |
| Heli | Kuulamiskinnitus puudub ja pole selle kodeeringukatse eeltingimus. |

Seetõttu Damping’u kirjutustuge ei avata. Ka min/max, kõvera ja damping’u
ajaväljade üksikvälja mõõtmised puuduvad endiselt. Globaalsete skaalade
arvukodeering jääb eraldi uurimiseks.

## Väikseim vajalik kasutajakatse

Vaja on üht valikumuutust, üht terve preseti eksporti ja üht kuvatõendit.
Uut algseisu eksporti ega eelmise Auto Engage katse kordamist pole vaja,
kui FM3-Editis on alles selle katse muutmata OFF-seis.

1. Ava eelmise katse **Wahwah 1 → Control** modifikaatoriaken. Kontrolli:
   Source **External 1**, Channel **All**, Auto Engage **Off**,
   Damping **Exponential**, FW **13.00**. Preseti nimi on
   **JB RHYTHM LEVEL -3**. Ära vaheta stseeni ega liiguta pedaali.
2. Kui see algseis on alles, jätka otse. Kui preset on vahepeal muutunud,
   säilita esmalt oma töö ja kasuta katsepaketi muutmata algfaili
   `FM3_MOD_AUTOENGAGE_OFF_export.syx`. Ära taasta algseisu teiste nuppude
   käsitsi ühtlustamisega. Kui kindel algseis pole saadaval, teata sellest.
3. Muuda **ainult Damping: Exponential → Linear**. Jäta Auto Engage Off
   ja kõik ülejäänud väärtused muutmata. Kui valikut Linear pole, ära asenda
   seda teise valikuga; saada olemasolevate valikute kuvatõend.
4. Tee kuvatõend, millel on näha Wahwah 1 Control, External 1, All,
   Damping Linear ja Auto Engage Off; võimalusel samal pildil FW13.00.
5. Ekspordi **terve preset** nimega `FM3_MOD_DAMPING_LINEAR_export.syx`.
   See on arvutisse salvestatava faili nimi; preseti sisemist nime ära muuda.
   Katse ei nõua preseti salvestamist seadme mälupessa ega helikatset.
6. Saada SYX ja pilt ning kinnita: **„Algseis oli Damping Exponential;
   muutsin ainult Damping’u Linear’iks.”**

Agent ei loo seadmeühendust ega saada GET/SET/LOAD/SAVE-käske.
Katsepaketis ei ole oletusliku Linear-koodiga genereeritud presetti.

## Automaatne võrdlus pärast faili saabumist

```sh
node tools/fm3/compare-modifier-damping.mjs FM3_MOD_DAMPING_LINEAR_export.syx
node --test tools/fm3/test-modifier-damping.mjs
```

Võrdleja loeb ainult faile ja väljastab JSON-i standardväljundisse. Algfail
on lukustatud SHA-256-ga
`7b6026539df41c36bf828dc35bf78510c0a3f30d77afe830eda5a2a7b71ea913`.
Kontroll hõlmab kaadreid, CRC-d, footer'it, kõiki modifikaatorikirjeid,
kogu lahtipakitud keha, nime, dump-päist, raw-päist, raw-nulltäidet ning Wah
seose ja stseenide konteksti. Lubatud uurimisvahemik on ainult keha baidid
1632–1633. Tuletatud kontrollsummad ja tihendatud pikkus võivad muutuda;
ülejäänud raw-päis peab säilima ja tihendatud andmete järel peab jääma nulltäide.

Väljumiskood 0 tähendab ainult eraldatud muutust hüpoteesi 1 suunas.
Väljumiskood 2 tähendab puuduvat muutust, kõrvalmuudatusi, vigast sisendit
või ootamatut toorkoodi; ootamatu kehtiv kood säilib raportis tegeliku
vaatlusena. Ka 0 korral jäävad `writeAuthorized=false`,
`displayLabelVerified=false`, `deviceBehaviorVerified=false` ja
`audioVerified=false`. Kuvatõendit ja kasutaja ühe muudatuse kinnitust
vaadatakse eraldi. Fail ei tuvasta firmware-versiooni.

Testide sünteetilised 1/2/256/65535 väärtused kontrollivad võrdlejat;
need pole FM3-Editi ekspordid ega kodeeringu tõendid. Testid kontrollivad
ka kõiki teisi 24 sõna, kaugeid kõrvalmuudatusi, tegelikku MED SPD faili,
nime muutmist, vigaseid faile, sisendite säilimist ja failideta CLI-väljundit.

Kui päris eksport ja kuvatõend kinnitavad paari, hinnatakse järgmise sammuna
ainult selle tõendatud External 1 → Wah Control All seose kahe valiku
piiratud kirjutajat. Siis lisanduvad kirjutuse/tagasilugemise regressioonid,
TXT selgitus ning uus commit’iga seotud väljalaske kontroll.

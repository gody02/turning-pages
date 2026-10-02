# Narrow Scottish 2022 Output Area population compatibility check

**DECISION A — DIRECT EVIDENCE ROUTE PASSES. RESEARCH ONLY.** No production placement package, numerical weight approval, registration, generic schema change or Country Start/New Game change. This report is rendered from UK-SCOTLAND-RESIDENCE-PLACEMENT-EVIDENCE-CHECK.json.

## 1. Official source identified

National Records of Scotland, [2022 Census Geography Products](https://www.nrscotland.gov.uk/publications/2022-census-geography-products/), specifically **Output Area 2022 Total Population**. The page describes usual-resident population per2022 Output Area. Only its linked [official CSV](https://www.nrscotland.gov.uk/media/owpknvgk/outputarea2022_usualresidentpopulation.csv) was newly downloaded. No alternative population or geography series was obtained.

## 2. Release/reference/access dates

The source page labels this individual product **May2024**; no release day is asserted. Its current containing page is dated4November2024, which is distinct from the CSV's release label. Census reference day is **2022-03-20**; world compatibility remains **2024-06-30**. Original bytes downloaded/accessed **2026-10-02**. Publication/access/world dates do not replace observation/reference date.

## 3. Exact source bytes and SHA-256

Filename: **outputarea2022_usualresidentpopulation.csv**. Byte length: **678,338**. SHA-256: **sha256:f7af756710c56f335d9332c08f95a68a5775aec4f25f17b21ab979257ed40148**. Original response file retained unchanged at **research/scotland-residence-2022/artifacts/outputarea2022_usualresidentpopulation.csv**. Research manifest records producer, locator, dates, licence and these integrity pins. Publication page supplies OGLv3.0; retain National Records of Scotland/Crown attribution. Existing index notices remain separate.

## 4. Population table schema

Exactly **OutputArea2022,UsualResidentPopulation**. OA code is OutputArea2022; population is UsualResidentPopulation. Strict parsing validates rectangular CSV, unique headers, canonical OA syntax and exact nonnegative decimal integer cells. No inferred sex, household, age or Settlement count field. Minimum **56**, maximum **2,991**; every value and aggregate is safely representable. BigInt handles summation before safe-integer conversion.

## 5. OA row count

**46,363** data rows, excluding header/final line terminator. The table is ordinary UTF-8 text; original bytes, line endings and header are preserved.

## 6. OA uniqueness/missingness

**46,363** unique OA codes; **0** duplicates, missing/malformed OA codes, missing population cells, negative/fractional/unsafe values. The pinned index likewise has 46,363 unique OA codes and no duplicate OA key. No blank data row was treated as a person or silently omitted.

## 7. Population total supplied by this table

Exact sum of the published OA cells: **5,440,284**. This is the quantity conserved in this research, not a newly acquired/reconciled independent national headline table and not2024 population. Do not replace frozen2024 Scotland population5,546,900 or UK69,281,437 with this source sum.

These are published census statistical counts, not raw enumerated-person truth. Official [census output metadata](https://www.scotlandscensus.gov.uk/documents/scotlands-census-2022-census-outputs-consultation/html) describes the census day/usual-residence basis and disclosure-control arrangements. Published nested-area sums need not reproduce separately published marginals. The product page/CSV does not specify this file's cell-level disclosure treatment; this check does not invent that explanation or fetch another population table. All reported council/Locality totals below are derived sums of these exact source cells, not separately published NRS council/Locality totals.

## 8. Pinned locality-index identity

Existing **artifact.nrs.census-geography-index-2022-v1**, source **geography.source.nrs.census-localities-2022-v1**, at src/data/geography/uk/settlements-2024/artifacts/census_2022_index.zip; **2,922,015 bytes**, SHA-256 **sha256:0e4096a321cba2318dc5d2e35c197bf815ac333aebdf4cb0ddce82112b57a261**. Fresh hash validation passed. Relevant ZIP members:

| Member | Bytes | SHA-256 |
| --- | --- | --- |
| Census_2022_Index/OA_TO_HIGHER_AREAS.csv | 9,473,169 | sha256:fbec099f2af309d924e35058938ccd4d15ca2c9fedaa243c6be48da46e7f08cc |
| Census_2022_Index/Higher_Geographies_LookUps/Census Locality 2022 Lookup.csv | 14,389 | sha256:6fd80e42fd7ee63e6147581507396057494265d25f640133e54613cab10b243b |
| Census_2022_Index/Higher_Geographies_LookUps/Council Area 2019 Lookup.csv | 850 | sha256:5bf557e8396afcb0eb0d91caddfc51e0ca2e531c0a0b34cd91b666ce2039996d |

The Locality lookup has656 unique code/name records. The council lookup has32 unique records. The frozen Settlement builder already constructs IDs from CensusLocality2022Code and uses OA CLOC2022/CA2019 to establish relations. Locality names use the frozen explicit Windows-1252 decoding; names are never join keys.

## 9. Direct-join key

**Population.OutputArea2022 === Index.OA2022**, exact unchanged ASCII code equality. The index directly supplies **CA2019**, **CLOC2022** and **CSETT2022**. Locality and council are parallel OA attributes, not a forced one-council-per-Locality chain. No fuzzy matching, name normalization, nearest-place, centroid, spatial operation or new crosswalk.

## 10. Vintage compatibility

Both population and Localities use Census2022. The existing council column is explicitly Council Area2019; all32 exact codes match the frozen2024 Geography council identity entries and allocation nodes. That proves code compatibility for these inputs, without pretending CA2019's vintage is2024. A future model would be **2022 Census-derived geographic weighting used inside mid-2024 world content**, not2024 Locality population or temporal modelling. [Official usual-resident metadata](https://www.scotlandscensus.gov.uk/documents/scotlands-census-2022-census-outputs-consultation/html) identifies20March2022 and includes usual residents beyond private-household arrangements; an ordinary-home initialization prior would remain a disclosed modelling abstraction.

## 11. Matched OA count

**46,363** exact matches. Population and index OA code sets are equal. One-to-one OA matching is established before aggregation.

## 12. Unmatched OA count

**0** population OAs unmatched; **0** index OAs unmatched. Both complete mismatch lists are empty in the machine report. No unexplained non-trivial unmatched category.

## 13. Matched population

**5,440,284**, exactly100% of the supplied table's population. This percentage describes join coverage, not residence accuracy or empirical2024 completeness.

## 14. Unmatched population

**0**. No missing code/count was interpreted as zero to obtain this result.

## 15. Locality-covered population

**42,379** OAs have a nonempty CLOC2022. Their cells sum to **4,957,121**. Every referenced code resolves through the pinned Locality lookup to the production package. The CSETT2022 grouping is retained as source context and is not converted into another Residence destination identity.

## 16. Outside-locality population

The index uses an **empty CLOC2022 string** for outside-Locality OAs. **3,984** such OAs contain **483,163** people, **8.8812%** of this table's sum. These still have exact council codes; no missing geographical assignment or inferred nearest Settlement is required. No invented positive residual.

## 17. Every council mapping and conservation

All32 exact council codes resolve through the already pinned Place continuity ledger to UK allocation-cell Places. Every council obeys Locality-qualified sum + outside-Locality sum = joined council sum. Shares below are presentation-only rounded diagnostics; exact numerators/denominators are in JSON.

| Council / code | Frozen Place ID | Joined source total | Inside Localities | Outside Localities | Outside share | Qualified Localities |
| --- | --- | --- | --- | --- | --- | --- |
| Clackmannanshire / S12000005 | place.uk.local-admin.s12000005 | 51,762 | 50,010 | 1,752 | 3.3847% | 10 |
| Dumfries and Galloway / S12000006 | place.uk.local-admin.s12000006 | 145,858 | 100,712 | 45,146 | 30.9520% | 25 |
| East Ayrshire / S12000008 | place.uk.local-admin.s12000008 | 120,302 | 111,178 | 9,124 | 7.5842% | 23 |
| East Lothian / S12000010 | place.uk.local-admin.s12000010 | 112,280 | 102,043 | 10,237 | 9.1174% | 19 |
| East Renfrewshire / S12000011 | place.uk.local-admin.s12000011 | 96,825 | 94,925 | 1,900 | 1.9623% | 13 |
| Na h-Eileanan Siar / S12000013 | place.uk.local-admin.s12000013 | 26,159 | 7,508 | 18,651 | 71.2986% | 4 |
| Falkirk / S12000014 | place.uk.local-admin.s12000014 | 158,435 | 153,376 | 5,059 | 3.1931% | 32 |
| Highland / S12000017 | place.uk.local-admin.s12000017 | 235,336 | 163,258 | 72,078 | 30.6277% | 55 |
| Inverclyde / S12000018 | place.uk.local-admin.s12000018 | 78,399 | 77,629 | 770 | 0.9822% | 7 |
| Midlothian / S12000019 | place.uk.local-admin.s12000019 | 96,512 | 91,593 | 4,919 | 5.0968% | 13 |
| Moray / S12000020 | place.uk.local-admin.s12000020 | 93,236 | 73,637 | 19,599 | 21.0209% | 21 |
| North Ayrshire / S12000021 | place.uk.local-admin.s12000021 | 133,519 | 127,324 | 6,195 | 4.6398% | 18 |
| Orkney Islands / S12000023 | place.uk.local-admin.s12000023 | 21,977 | 9,604 | 12,373 | 56.2998% | 3 |
| Scottish Borders / S12000026 | place.uk.local-admin.s12000026 | 116,827 | 85,588 | 31,239 | 26.7395% | 30 |
| Shetland Islands / S12000027 | place.uk.local-admin.s12000027 | 22,985 | 8,609 | 14,376 | 62.5451% | 3 |
| South Ayrshire / S12000028 | place.uk.local-admin.s12000028 | 111,532 | 101,191 | 10,341 | 9.2718% | 15 |
| South Lanarkshire / S12000029 | place.uk.local-admin.s12000029 | 327,131 | 309,817 | 17,314 | 5.2927% | 33 |
| Stirling / S12000030 | place.uk.local-admin.s12000030 | 92,606 | 81,695 | 10,911 | 11.7822% | 18 |
| Aberdeen City / S12000033 | place.uk.local-admin.s12000033 | 224,015 | 221,495 | 2,520 | 1.1249% | 7 |
| Aberdeenshire / S12000034 | place.uk.local-admin.s12000034 | 263,796 | 190,965 | 72,831 | 27.6088% | 63 |
| Argyll and Bute / S12000035 | place.uk.local-admin.s12000035 | 85,953 | 61,116 | 24,837 | 28.8960% | 24 |
| City of Edinburgh / S12000036 | place.uk.local-admin.s12000036 | 514,591 | 512,928 | 1,663 | 0.3232% | 5 |
| Renfrewshire / S12000038 | place.uk.local-admin.s12000038 | 183,839 | 181,692 | 2,147 | 1.1679% | 16 |
| West Dunbartonshire / S12000039 | place.uk.local-admin.s12000039 | 88,398 | 87,158 | 1,240 | 1.4027% | 10 |
| West Lothian / S12000040 | place.uk.local-admin.s12000040 | 181,272 | 174,458 | 6,814 | 3.7590% | 24 |
| Angus / S12000041 | place.uk.local-admin.s12000041 | 114,284 | 92,801 | 21,483 | 18.7979% | 17 |
| Dundee City / S12000042 | place.uk.local-admin.s12000042 | 148,718 | 147,981 | 737 | 0.4956% | 2 |
| East Dunbartonshire / S12000045 | place.uk.local-admin.s12000045 | 108,955 | 106,971 | 1,984 | 1.8209% | 9 |
| Fife / S12000047 | place.uk.local-admin.s12000047 | 371,913 | 352,253 | 19,660 | 5.2862% | 65 |
| Perth and Kinross / S12000048 | place.uk.local-admin.s12000048 | 151,006 | 120,633 | 30,373 | 20.1138% | 36 |
| Glasgow City / S12000049 | place.uk.local-admin.s12000049 | 620,870 | 620,162 | 708 | 0.1140% | 4 |
| North Lanarkshire / S12000050 | place.uk.local-admin.s12000050 | 340,993 | 336,811 | 4,182 | 1.2264% | 38 |


## 18. Scotland-wide conservation

**4,957,121 + 483,163 = 5,440,284**. Sum of all32 council totals also equals5,440,284. Every OA counted once, no loss/duplication, no rounded reconciliation, no forced match to2024 totals. Reverse population and index record orders rebuild the same exact aggregates; deterministic canonical report verification passes.

## 19. Production locality count

**656** Scottish production Settlements, all kind settlement.uk.nrs.census-locality, zero synthetic additions. Exact package **settlements.uk.hybrid-2024-06-30-v2**, fingerprint **fnv1a64-v1:2ddc7643a1e7e4b8**, artifact SHA-256 **sha256:34aa659dc4ed927b70f78834c6638e58ae787ead38a9e9e68fe28886b0c359db**. Frozen national package and authored England/Wales/NI proposals are untouched.

## 20. Exact production matches

**656/656**. Mapping follows the already frozen builder identity rule **settlement.uk.nrs-locality.<lowercase CensusLocality2022Code>**. The lowercasing formats a namespace identity from a source code; it is not fuzzy/name matching. Each ID resolves to UK identity, retained continuity entry, correct NRS source binding and production record. All **662** council-qualified fragments resolve exactly to frozen contained-by/intersects relations in the pinned partition.

## 21. Mapping failures

**0** unmatched Localities, duplicate mappings, ambiguous mappings or unresolved qualified relations. Machine report includes each empty failure list plus the full656-code mapping and662-fragment inventory. Display names are diagnostic only and never rescue a failed code.

## 22. 32-council mapping result

**32/32**, no failures. Frozen Geography partition **geography.uk.primary-local-admin-2024-06-30-v1**, fingerprint **fnv1a64-v1:3d1a3446a16c58cb**. Source CA2019 codes match the existing officialCode/Place continuity entries; canonical country remains uk. Every target is an explicit populationAllocationCell. No council-country assignment is inferred from a Person or Settlement name.

## 23. Complete cross-boundary locality inventory

Six Localities appear in two councils each; 650 in one council. Thus656 unique Localities produce662 qualified fragments. Full code/Place identities:

| Locality / exact code / durable Settlement ID | Whole matched population | Exact council fragments | Conserved |
| --- | --- | --- | --- |
| Dundee / S52000210 / settlement.uk.nrs-locality.s52000210 | 147,365 | Angus (place.uk.local-admin.s12000041): 727; Dundee City (place.uk.local-admin.s12000042): 146,638 | Yes |
| Glasgow / S52000280 / settlement.uk.nrs-locality.s52000280 | 617,904 | Renfrewshire (place.uk.local-admin.s12000038): 176; Glasgow City (place.uk.local-admin.s12000049): 617,728 | Yes |
| Harthill / S52000307 / settlement.uk.nrs-locality.s52000307 | 2,613 | West Lothian (place.uk.local-admin.s12000040): 930; North Lanarkshire (place.uk.local-admin.s12000050): 1,683 | Yes |
| Kelty / S52000342 / settlement.uk.nrs-locality.s52000342 | 6,898 | Fife (place.uk.local-admin.s12000047): 6,751; Perth and Kinross (place.uk.local-admin.s12000048): 147 | Yes |
| Liff / S52000403 / settlement.uk.nrs-locality.s52000403 | 1,873 | Angus (place.uk.local-admin.s12000041): 530; Dundee City (place.uk.local-admin.s12000042): 1,343 | Yes |
| Stepps / S52000584 / settlement.uk.nrs-locality.s52000584 | 7,643 | Glasgow City (place.uk.local-admin.s12000049): 507; North Lanarkshire (place.uk.local-admin.s12000050): 7,136 | Yes |


## 24. Cross-boundary conservation

All six checks pass. Each whole matched Locality total equals its separately summed council pieces. Glasgow617,904 is617,728 in Glasgow City +176 in Renfrewshire; Dundee147,365 is146,638 in Dundee City +727 in Angus. No repeated whole count, inferred geometric split or ratio reconstruction. The source OA rows supply these pieces directly.

## 25. Zero-population cases and distribution

**0** zero-population OAs, **0** zero-population Locality fragments, **0** zero-matched production Localities. Every council has a positive outside residual. No epsilon mass or artificial positive count was introduced.

Whole-Locality minimum **510**, median **2,120**, maximum **617,904**. Area-qualified fragment minimum **147**, median **4179/2 =2089.5**, maximum **617,728**. The half-integer median is a descriptive statistic, never an individual count or candidate mass.

## 26. Glasgow City stress case

Joined council total **620,870**. Principal **617,728** (99.4939%), other Localities **2,434**, outside Localities **708** (0.1140%). Whole matched principal Locality **617,904**; do not reuse that whole count as a fragment.

| Exact Locality code / Settlement ID | Production display name | Population in this council | Share of joined council |
| --- | --- | --- | --- |
| S52000123 / settlement.uk.nrs-locality.s52000123 | Carmunnock | 1,236 | 0.1991% |
| S52000274 / settlement.uk.nrs-locality.s52000274 | Gartloch | 691 | 0.1113% |
| S52000280 / settlement.uk.nrs-locality.s52000280 | Glasgow | 617,728 | 99.4939% |
| S52000584 / settlement.uk.nrs-locality.s52000584 | Stepps | 507 | 0.0817% |

The four available Localities are not equally represented in census cells. A uniform1/4 prior would radically differ from this source evidence. This is a diagnostic, not approval of a99.4939% Residence weight.

## 27. City of Edinburgh stress case

Joined council total **514,591**. Principal **493,794** (95.9585%), other Localities **19,134**, outside Localities **1,663** (0.3232%). Whole matched principal Locality **493,794**; do not reuse that whole count as a fragment.

| Exact Locality code / Settlement ID | Production display name | Population in this council | Share of joined council |
| --- | --- | --- | --- |
| S52000233 / settlement.uk.nrs-locality.s52000233 | Edinburgh | 493,794 | 95.9585% |
| S52000375 / settlement.uk.nrs-locality.s52000375 | Kirkliston | 5,607 | 1.0896% |
| S52000481 / settlement.uk.nrs-locality.s52000481 | Newbridge and Ratho Station | 1,041 | 0.2023% |
| S52000533 / settlement.uk.nrs-locality.s52000533 | Ratho | 2,272 | 0.4415% |
| S52000569 / settlement.uk.nrs-locality.s52000569 | South Queensferry | 10,214 | 1.9849% |

Uniform1/5 would radically understate the principal's share in this source snapshot. No replacement policy is emitted.

## 28. Aberdeen City stress case

Joined council total **224,015**. Principal **192,968** (86.1407%), other Localities **28,527**, outside Localities **2,520** (1.1249%). Whole matched principal Locality **192,968**; do not reuse that whole count as a fragment.

| Exact Locality code / Settlement ID | Production display name | Population in this council | Share of joined council |
| --- | --- | --- | --- |
| S52000002 / settlement.uk.nrs-locality.s52000002 | Aberdeen | 192,968 | 86.1407% |
| S52000156 / settlement.uk.nrs-locality.s52000156 | Countesswells | 1,419 | 0.6334% |
| S52000158 / settlement.uk.nrs-locality.s52000158 | Cove Bay | 7,926 | 3.5382% |
| S52000220 / settlement.uk.nrs-locality.s52000220 | Dyce | 6,998 | 3.1239% |
| S52000361 / settlement.uk.nrs-locality.s52000361 | Kingswells | 4,776 | 2.1320% |
| S52000446 / settlement.uk.nrs-locality.s52000446 | Milltimber | 3,049 | 1.3611% |
| S52000511 / settlement.uk.nrs-locality.s52000511 | Peterculter | 4,359 | 1.9459% |

Uniform1/7 is not a useful evidence-informed approximation to this source distribution. Both the other Localities and outside residual remain measurable.

## 29. Dundee City stress case

Joined council total **148,718**. Principal **146,638** (98.6014%), other Localities **1,343**, outside Localities **737** (0.4956%). Whole matched principal Locality **147,365**; do not reuse that whole count as a fragment.

| Exact Locality code / Settlement ID | Production display name | Population in this council | Share of joined council |
| --- | --- | --- | --- |
| S52000210 / settlement.uk.nrs-locality.s52000210 | Dundee | 146,638 | 98.6014% |
| S52000403 / settlement.uk.nrs-locality.s52000403 | Liff | 1,343 | 0.9031% |

The two locality destinations must retain their exact council fragment identities; neither whole cross-boundary count belongs entirely to Dundee City.

## 30. Orkney Islands stress case

Joined council total **21,977**; **3** matched Localities; outside **12,373** (56.2998%). No final Residence precision or mass is approved.

| Exact Locality / Settlement ID | Production display | Population | Share of council |
| --- | --- | --- | --- |
| S52000254 / settlement.uk.nrs-locality.s52000254 | Finstown | 511 | 2.3252% |
| S52000378 / settlement.uk.nrs-locality.s52000378 | Kirkwall | 7,393 | 33.6397% |
| S52000599 / settlement.uk.nrs-locality.s52000599 | Stromness | 1,700 | 7.7354% |


## 31. Shetland Islands stress case

Joined council total **22,985**; **3** matched Localities; outside **14,376** (62.5451%). No final Residence precision or mass is approved.

| Exact Locality / Settlement ID | Production display | Population | Share of council |
| --- | --- | --- | --- |
| S52000088 / settlement.uk.nrs-locality.s52000088 | Brae | 729 | 3.1716% |
| S52000396 / settlement.uk.nrs-locality.s52000396 | Lerwick | 6,714 | 29.2104% |
| S52000559 / settlement.uk.nrs-locality.s52000559 | Scalloway | 1,166 | 5.0729% |


## 32. Na h-Eileanan Siar stress case

Joined council total **26,159**; **4** matched Localities; outside **18,651** (71.2986%). No final Residence precision or mass is approved.

| Exact Locality / Settlement ID | Production display | Population | Share of council |
| --- | --- | --- | --- |
| S52000041 / settlement.uk.nrs-locality.s52000041 | Baile a'Mhanaich (Balivanich) | 535 | 2.0452% |
| S52000430 / settlement.uk.nrs-locality.s52000430 | Margaidh Ùr, Lacasdal and Bruach Mairi (Newmarket, Laxdale and Marybank) | 1,586 | 6.0629% |
| S52000556 / settlement.uk.nrs-locality.s52000556 | Sanndabhaig (Sandwick) | 810 | 3.0964% |
| S52000583 / settlement.uk.nrs-locality.s52000583 | Steòrnabhagh (Stornoway) | 4,577 | 17.4968% |

These residuals support reviewing mixed Settlement/admin precision instead of forcing everyone into a named Locality or making every island council exclusively coarse. The final choice belongs to numerical approval.

## 33. Admin-only residual compatibility

An administrative-area candidate can represent the measured outside-Locality residual within each exact council scope. All32 residuals are positive safe integers. This does not assert which village/address/home contains a Person and does not mean those residents have no home. No fallback or nearest Locality is needed. It is technically compatible evidence for possible coarse-destination mass, not an approved content decision.

## 34. Frozen generic-schema compatibility

No generic change is required. Existing scope:{version:1,partitionId,placeId}, Settlement-area location with the exact package/Settlement plus that same scope, and integer weight can encode a qualified prior. Existing administrative-area location can encode the outside residual. This offers **662** positive qualified Locality fragments and **32** positive administrative residuals, **694** possible candidates across32 scopes. All references and group totals have been checked from frozen content/schema constraints. No executable placement policy was constructed or registered during this check.

## 35. Provenance recommendation

Retain source counts separately as official2022 published census evidence. Exact OA grouping is derived aggregation. Any future mass must state **placement mass derived from2022 Census usual-resident OA aggregation**, used as a reviewed geographic prior for mid-2024-compatible authored initialization. It is not2024 Settlement population, demographic reassignment, private-household-only evidence, or a person's observed Residence. No new Population totals or uncertainty fields enter runtime state.

## 36. Exact counts as technical mass

Technically yes: every locality fragment/residual is positive and safe; group totals never exceed620,870. Literal count-valued masses preserve the source relative ratios without float conversion. A per-scope common-GCD reduction would preserve the same ratios with potentially smaller integers. These alternatives produce different literal semantics/fingerprints and keyed choices and therefore require an explicit content decision. Neither option is approved here; no arbitrary rounding, forced positivity or small-place smoothing is performed.

## 37. Additional population series

**None required or acquired.** No postcode,2011,mid-year,Data Zone,Settlement estimate or third-party population substituted. Read-only official metadata clarifies reference/source precision; it does not add another population input.

## 38. Additional crosswalk

**None.** Only the existing OA index, frozen Settlement builder/continuity and already pinned council-to-Place identity mapping are used. No manual geographic assignment or substantial vintage reconciliation.

## 39. Geometry

**None.** No coordinates, centroid, polygon, point-in-polygon, spatial join, boundary overlay or postcode approximation. The frozen index is sufficient.

## 40. Production-file changes

**Zero.** Aggregate SHA-256 of all src paths/bytes, sorted ordinally, is unchanged at **5a2c406a6b9d88902e3c8a407062ea07bf08bd71fef2cfd6cdee3daf66beb989**. Frozen domains, schemas, Population packages, Settlement artifact, Country Start and New Game remain unchanged. No placement registration or numerical approval.

## 41. Integrity gates and reproducibility

Allfour existing production content-integrity gates PASS: UK Human, administrative Geography, geographic Population and hybrid Settlement. Research SHA/schema/exact-key/identity/relation/conservation checks PASS. Reversed OA/index order matches canonical aggregate bytes. A repeat check-evidence.mjs --verify reproduces the research JSON exactly. No full Vitest/build/browser/simulation rerun is claimed for this research-only task.

## 42. Research artifacts

- research/scotland-residence-2022/artifacts/outputarea2022_usualresidentpopulation.csv: exact downloaded official bytes.
- research/scotland-residence-2022/source-manifest.json: research-only metadata and dependency hashes, no runtime registry.
- research/scotland-residence-2022/check-evidence.mjs: one-file exact-join/conservation verifier; --verify compares deterministic research output.
- research/scotland-residence-2022/render-report.mjs: renders text from this authoritative machine report.
- UK-SCOTLAND-RESIDENCE-PLACEMENT-EVIDENCE-CHECK.json: **754,648 bytes**, SHA-256 **cae49227e96e9b9909759e63a5fbb7c620a8e8605b535422c135ed9fb510eddc**; all mappings, fragments, residuals, exact shares, zeros, checks and stress cases.
- UK-SCOTLAND-RESIDENCE-PLACEMENT-EVIDENCE-CHECK.md: this report. Project records updated to show compatibility passed, weights still unapproved.

## 43. Unresolved issues

No unresolved direct-join, mapping, conservation or frozen-schema blocker. Numerical approval still must choose raw/GCD masses or another explicitly reviewed transformation, retain the outside-locality option and evaluate how a2022 source prior is used in2024-compatible authored world design. Age-specific/Household/institutional placement is not supplied by this table. Source-cell disclosure precision and lack of a separately reconciled headline total remain stated limitations; neither requires broadening this successful bounded join.

England/Wales/NI authored proposals are unchanged. No Residence, Household, Housing, Presence, Country Start v3 or New Game integration is implemented. Existing saves remain untouched.

## 44. FINAL DECISION

**DECISION A — DIRECT EVIDENCE ROUTE PASSES.** Every requested compatibility condition passes using the sole new population artifact and already pinned locality/council evidence. Evidence compatibility is not numerical-content approval.

## 45. Exact NEXT TASK

**UK INITIAL RESIDENCE PLACEMENT CONTENT NUMERICAL APPROVAL.** Revisit the complete361-area proposed model using these662 Scottish fragments and32 outside-locality residuals. Explicitly approve source-to-relative-mass transformation, Scottish precision/city/island behavior and final immutable content rows. Keep all frozen schemas/packages untouched. Materialize/register production placement only in the later separately authorized implementation task, after numerical approval.

The narrow Scottish evidence check passes. The official 2022 Census Output
Area usual-resident population table joins directly to the already-pinned
Scottish locality/council evidence without requiring another population series,
geometry or a new crosswalk. Area-qualified locality population and
outside-locality residual population can therefore inform the Scottish portion
of the UK Residence placement model. No production placement content was
implemented. The next task is UK initial Residence placement content numerical
approval.

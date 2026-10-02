# UK initial Residence placement content numerical approval v1

**APPROVED FOR IMPLEMENTATION. Approved specification only — NOT IMPLEMENTED, NOT PRODUCTION REGISTERED, NOT a frozen production artifact.** No Residence is established by this analysis. Frozen generic placement, Residence, Game root-v4, persistence, Population, Geography, Settlement, Country Start and New Game remain unchanged.

Machine authority: [UK-INITIAL-RESIDENCE-PLACEMENT-NUMERICAL-APPROVAL.json](UK-INITIAL-RESIDENCE-PLACEMENT-NUMERICAL-APPROVAL.json), **7879242 UTF-8 bytes**, SHA-256 **8e651fd6d7b8b7184604edf516e8097139d375de3f471d12920717e7c58dc734**. It contains all **361 scopes / 2,768 destinations**, literal weights, exact qualified references, lineage, sensitivity variants, flags and diagnostic witnesses. Its embedded canonical proposed policy uses the intended production ID solely for reproducibility analysis; no registry or application imports it. The proof fingerprint **fnv1a64-v1:c0d2080b63263587** is not a released production manifest.

This completes the previous numerical review rather than rewriting its historical analysis. The earlier Scottish four-city/28-coarse proposal is superseded by exact Census-derived masses for all 32 councils. Earlier documentation marked NOT APPROVED is historical evidence; this report and the newest PROJECT-STATE entry are the current content approval.

## 1. Approval status

**APPROVED FOR IMPLEMENTATION**. Every numerical and precision decision is closed. Approval is for a separate immutable UK content implementation, not production registration in this task.

## 2. Exact policy ID

**residence-placement.uk.mid-2024-v1**. Repository namespaced version convention; no existing production registration was found in src. The identity becomes immutable when implemented/reviewed/frozen. No latest alias.

## 3. Effective date

**2024-06-30** is the compatible world/content date. Scottish evidence refers to **2022-03-20**, released with label **May 2024** (exact release day unasserted); publication landing page **2024-11-04** and access **2026-10-02** are separate metadata. England/Wales/NI masses have no empirical observation date.

## 4. Pinned dependencies

| Contract | Exact identity / integrity |
| --- | --- |
| Geography | geography.uk.primary-local-admin-2024-06-30-v1 / fnv1a64-v1:3d1a3446a16c58cb |
| Settlement | settlements.uk.hybrid-2024-06-30-v2 / fnv1a64-v1:2ddc7643a1e7e4b8; SHA-256 sha256:34aa659dc4ed927b70f78834c6638e58ae787ead38a9e9e68fe28886b0c359db; 3,269,891 bytes |
| Frozen evaluator | residence-placement.weighted-integer-v1 |
| Authored methodology | residence-placement.method.uk.authored-kind-principal-2024-v1 |
| NRS OA source | research.source.nrs.oa2022-usual-resident-population-may-2024-v1; 678,338 bytes; sha256:f7af756710c56f335d9332c08f95a68a5775aec4f25f17b21ab979257ed40148 |
| Pinned Census index | geography.source.nrs.census-localities-2022-v1; 2,922,015 bytes; sha256:0e4096a321cba2318dc5d2e35c197bf815ac333aebdf4cb0ddce82112b57a261 |
| Future orchestration compatibility | uk.population.mid-2024.v3 / fnv1a64-v1:2894f4c1b1fdd274; sha256:c4b13eb67a1b7e231da1250b27f8e596c6535e7f260013d8a8638bda2b81188a |

Population is not a new dependency of the generic evaluator. Frozen Human content/profile and current Country Start remain unchanged. Exact index-member hashes, licences, paths and notices remain in sourceManifest.

## 5. Country methodology split

| Country | Scopes | Settlement candidates | Administrative candidates | Mass classification |
| --- | --- | --- | --- | --- |
| england | 296 | 1810 | 1 | Reviewed authored gameplay abstraction |
| wales | 22 | 166 | 0 | Reviewed authored gameplay abstraction |
| northern-ireland | 11 | 97 | 0 | Reviewed authored gameplay abstraction |
| scotland | 32 | 662 | 32 | Derived from official published Census-2022 cells, adopted as an initialization prior |

No cross-country symmetry is imposed. Weights are relative within one scope, not a second Population authority or empirical probabilities of individual homes.

## 6. England/Wales/NI kind table

| Existing opaque production kind ID | Exact base mass | Rationale |
| --- | --- | --- |
| settlement.uk.reviewed.city | 16 | City/town equality; 4× village, no legal-city population claim. |
| settlement.uk.reviewed.town | 16 | City/town equality; 4× village, no legal-city population claim. |
| settlement.uk.authored.town | 16 | City/town equality; 4× village, no legal-city population claim. |
| settlement.uk.authored.village | 4 | 4× hamlet; rural diversity remains positive. |
| settlement.uk.authored.hamlet | 1 | Small-place content remains reachable. |

`settlement.uk.nrs.census-locality` is **override-only raw count**, not base mass 1 or 16. All actual candidate kinds are covered. No universal real/synthetic multiplier.

## 7. Principal-budget rule

Approve **3/4 principal, 1/4 residual**, explicit role units only. Let R be residual base-mass sum, P be principal role-unit sum, budget p/q=3/4. Raw principal candidate mass = p × role × R. Raw residual candidate mass = (q−p) × base × P. Divide the WHOLE group by its common GCD, once at build time. BigInt intermediates; narrow only after positive safe-integer validation. This produces the literal masses in the JSON; runtime evaluates integers, never percentages. A singleton is mass 1. Do not subsequently rescale literal masses because fingerprints/decisions depend on them.

## 8. Complete principal inventory

| Area / exact Place ID | Principal Settlement IDs → final mass (share) | Residual final masses | Total |
| --- | --- | --- | --- |
| Middlesbrough / place.uk.local-admin.e06000002 | settlement.uk.reviewed.middlesbrough → 99 (3/4) | 1 × 1 (settlement.uk.authored.hamlet); 1 × 16 (settlement.uk.authored.town); 4 × 4 (settlement.uk.authored.village) | 132 |
| York / place.uk.local-admin.e06000014 | settlement.uk.reviewed.york → 150 (3/4) | 2 × 1 (settlement.uk.authored.hamlet); 2 × 16 (settlement.uk.authored.town); 4 × 4 (settlement.uk.authored.village) | 200 |
| Cambridge / place.uk.local-admin.e07000008 | settlement.uk.reviewed.cambridge → 159 (3/4) | 1 × 1 (settlement.uk.authored.hamlet); 3 × 16 (settlement.uk.authored.town); 1 × 4 (settlement.uk.authored.village) | 212 |
| Exeter / place.uk.local-admin.e07000041 | settlement.uk.reviewed.exeter → 114 (3/4) | 2 × 1 (settlement.uk.authored.hamlet); 2 × 16 (settlement.uk.authored.town); 1 × 4 (settlement.uk.authored.village) | 152 |
| Norwich / place.uk.local-admin.e07000148 | settlement.uk.reviewed.norwich → 51 (3/4) | 1 × 1 (settlement.uk.authored.hamlet); 4 × 4 (settlement.uk.authored.village) | 68 |
| Oxford / place.uk.local-admin.e07000178 | settlement.uk.reviewed.oxford → 27 (3/4) | 1 × 4 (settlement.uk.authored.town); 5 × 1 (settlement.uk.authored.village) | 36 |
| Bradford / place.uk.local-admin.e08000032 | settlement.uk.reviewed.bradford → 1476 (3/8); settlement.uk.reviewed.ilkley → 369 (3/32); settlement.uk.reviewed.keighley → 738 (3/16); settlement.uk.reviewed.shipley → 369 (3/32) | 3 × 8 (settlement.uk.authored.hamlet); 5 × 128 (settlement.uk.authored.town); 10 × 32 (settlement.uk.authored.village) | 3936 |
| Leeds / place.uk.local-admin.e08000035 | settlement.uk.reviewed.leeds → 591 (3/4) | 5 × 1 (settlement.uk.authored.hamlet); 7 × 16 (settlement.uk.authored.town); 20 × 4 (settlement.uk.authored.village) | 788 |
| Derry City and Strabane / place.uk.local-admin.n09000005 | settlement.uk.reviewed.derry → 150 (3/4) | 2 × 1 (settlement.uk.authored.hamlet); 2 × 16 (settlement.uk.authored.town); 4 × 4 (settlement.uk.authored.village) | 200 |
| Lisburn and Castlereagh / place.uk.local-admin.n09000007 | settlement.uk.reviewed.lisburn → 159 (3/4) | 1 × 1 (settlement.uk.authored.hamlet); 2 × 16 (settlement.uk.authored.town); 5 × 4 (settlement.uk.authored.village) | 212 |
| Newry, Mourne and Down / place.uk.local-admin.n09000010 | settlement.uk.reviewed.newry → 183 (3/4) | 1 × 1 (settlement.uk.authored.hamlet); 2 × 16 (settlement.uk.authored.town); 7 × 4 (settlement.uk.authored.village) | 244 |
| Ards and North Down / place.uk.local-admin.n09000011 | settlement.uk.reviewed.bangor-ni → 126 (3/4) | 2 × 1 (settlement.uk.authored.hamlet); 1 × 16 (settlement.uk.authored.town); 6 × 4 (settlement.uk.authored.village) | 168 |
| Wrexham / place.uk.local-admin.w06000006 | settlement.uk.reviewed.wrexham → 111 (3/4) | 1 × 1 (settlement.uk.authored.hamlet); 1 × 16 (settlement.uk.authored.town); 5 × 4 (settlement.uk.authored.village) | 148 |
| Swansea / place.uk.local-admin.w06000011 | settlement.uk.reviewed.swansea → 345 (3/4) | 3 × 1 (settlement.uk.authored.hamlet); 6 × 16 (settlement.uk.authored.town); 4 × 4 (settlement.uk.authored.village) | 460 |
| Newport / place.uk.local-admin.w06000022 | settlement.uk.reviewed.newport-wales → 162 (3/4) | 2 × 1 (settlement.uk.authored.hamlet); 2 × 16 (settlement.uk.authored.town); 5 × 4 (settlement.uk.authored.village) | 216 |
| Merthyr Tydfil / place.uk.local-admin.w06000024 | settlement.uk.reviewed.merthyr-tydfil → 9 (3/4) | 3 × 1 (settlement.uk.authored.village) | 12 |

**16 overrides: England 8, Wales 4, NI 4, Scotland 0.** Every row has a 3/4 principal group and 1/4 positive residual. Bradford alone uses 4:2:1:1 internal roles; every other principal role is 1. There are no hidden overrides outside this table. Broad-authority anchors listed under the dilution audit retain kind-only; reviewed identity alone is insufficient to assert dominance.

## 9. Bradford exact result

| Destination | Kind | Final integer mass | Share |
| --- | --- | --- | --- |
| settlement.uk.reviewed.bradford | settlement.uk.reviewed.city | 1476 | 3/8 |
| settlement.uk.reviewed.ilkley | settlement.uk.reviewed.town | 369 | 3/32 |
| settlement.uk.reviewed.keighley | settlement.uk.reviewed.town | 738 | 3/16 |
| settlement.uk.reviewed.shipley | settlement.uk.reviewed.town | 369 | 3/32 |
| settlement.uk.synthetic.e08000032.001 | settlement.uk.authored.town | 128 | 4/123 |
| settlement.uk.synthetic.e08000032.002 | settlement.uk.authored.town | 128 | 4/123 |
| settlement.uk.synthetic.e08000032.003 | settlement.uk.authored.village | 32 | 1/123 |
| settlement.uk.synthetic.e08000032.004 | settlement.uk.authored.village | 32 | 1/123 |
| settlement.uk.synthetic.e08000032.005 | settlement.uk.authored.town | 128 | 4/123 |
| settlement.uk.synthetic.e08000032.006 | settlement.uk.authored.town | 128 | 4/123 |
| settlement.uk.synthetic.e08000032.007 | settlement.uk.authored.hamlet | 8 | 1/492 |
| settlement.uk.synthetic.e08000032.008 | settlement.uk.authored.hamlet | 8 | 1/492 |
| settlement.uk.synthetic.e08000032.009 | settlement.uk.authored.village | 32 | 1/123 |
| settlement.uk.synthetic.e08000032.010 | settlement.uk.authored.village | 32 | 1/123 |
| settlement.uk.synthetic.e08000032.011 | settlement.uk.authored.hamlet | 8 | 1/492 |
| settlement.uk.synthetic.e08000032.012 | settlement.uk.authored.town | 128 | 4/123 |
| settlement.uk.synthetic.e08000032.013 | settlement.uk.authored.village | 32 | 1/123 |
| settlement.uk.synthetic.e08000032.014 | settlement.uk.authored.village | 32 | 1/123 |
| settlement.uk.synthetic.e08000032.015 | settlement.uk.authored.village | 32 | 1/123 |
| settlement.uk.synthetic.e08000032.016 | settlement.uk.authored.village | 32 | 1/123 |
| settlement.uk.synthetic.e08000032.017 | settlement.uk.authored.village | 32 | 1/123 |
| settlement.uk.synthetic.e08000032.018 | settlement.uk.authored.village | 32 | 1/123 |

Scope total **3936**. Exact principal budget **3/4**; residual **1/4**. 3 × 8 (settlement.uk.authored.hamlet); 5 × 128 (settlement.uk.authored.town); 10 × 32 (settlement.uk.authored.village). All destinations are positive, retained, and individually enumerated above.

Approved Bradford 1,476/3,936 = 3/8; Keighley 738/3,936 = 3/16; Shipley and Ilkley each 369/3,936 = 3/32. Residual 984/3,936 = 1/4. Role numbers are authored, never measured population ratios.

## 10. Leeds exact result

| Destination | Kind | Final integer mass | Share |
| --- | --- | --- | --- |
| settlement.uk.reviewed.leeds | settlement.uk.reviewed.city | 591 | 3/4 |
| settlement.uk.synthetic.e08000035.001 | settlement.uk.authored.town | 16 | 4/197 |
| settlement.uk.synthetic.e08000035.002 | settlement.uk.authored.town | 16 | 4/197 |
| settlement.uk.synthetic.e08000035.003 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.004 | settlement.uk.authored.hamlet | 1 | 1/788 |
| settlement.uk.synthetic.e08000035.005 | settlement.uk.authored.town | 16 | 4/197 |
| settlement.uk.synthetic.e08000035.006 | settlement.uk.authored.town | 16 | 4/197 |
| settlement.uk.synthetic.e08000035.007 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.008 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.009 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.010 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.011 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.012 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.013 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.014 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.015 | settlement.uk.authored.town | 16 | 4/197 |
| settlement.uk.synthetic.e08000035.016 | settlement.uk.authored.town | 16 | 4/197 |
| settlement.uk.synthetic.e08000035.017 | settlement.uk.authored.hamlet | 1 | 1/788 |
| settlement.uk.synthetic.e08000035.018 | settlement.uk.authored.hamlet | 1 | 1/788 |
| settlement.uk.synthetic.e08000035.019 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.020 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.021 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.022 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.023 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.024 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.025 | settlement.uk.authored.hamlet | 1 | 1/788 |
| settlement.uk.synthetic.e08000035.026 | settlement.uk.authored.town | 16 | 4/197 |
| settlement.uk.synthetic.e08000035.027 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.028 | settlement.uk.authored.hamlet | 1 | 1/788 |
| settlement.uk.synthetic.e08000035.029 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.030 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.031 | settlement.uk.authored.village | 4 | 1/197 |
| settlement.uk.synthetic.e08000035.032 | settlement.uk.authored.village | 4 | 1/197 |

Scope total **788**. Exact principal budget **3/4**; residual **1/4**. 5 × 1 (settlement.uk.authored.hamlet); 7 × 16 (settlement.uk.authored.town); 20 × 4 (settlement.uk.authored.village). All destinations are positive, retained, and individually enumerated above.

Leeds 591/788 = 3/4. All 32 residual destinations survive: seven town masses 16, twenty village masses 4, five hamlet masses 1. No Leeds district-to-city equivalence is claimed.

## 11. Swansea exact result

| Destination | Kind | Final integer mass | Share |
| --- | --- | --- | --- |
| settlement.uk.reviewed.swansea | settlement.uk.reviewed.city | 345 | 3/4 |
| settlement.uk.synthetic.w06000011.001 | settlement.uk.authored.town | 16 | 4/115 |
| settlement.uk.synthetic.w06000011.002 | settlement.uk.authored.town | 16 | 4/115 |
| settlement.uk.synthetic.w06000011.003 | settlement.uk.authored.village | 4 | 1/115 |
| settlement.uk.synthetic.w06000011.004 | settlement.uk.authored.village | 4 | 1/115 |
| settlement.uk.synthetic.w06000011.005 | settlement.uk.authored.town | 16 | 4/115 |
| settlement.uk.synthetic.w06000011.006 | settlement.uk.authored.village | 4 | 1/115 |
| settlement.uk.synthetic.w06000011.007 | settlement.uk.authored.town | 16 | 4/115 |
| settlement.uk.synthetic.w06000011.008 | settlement.uk.authored.town | 16 | 4/115 |
| settlement.uk.synthetic.w06000011.009 | settlement.uk.authored.village | 4 | 1/115 |
| settlement.uk.synthetic.w06000011.010 | settlement.uk.authored.hamlet | 1 | 1/460 |
| settlement.uk.synthetic.w06000011.011 | settlement.uk.authored.hamlet | 1 | 1/460 |
| settlement.uk.synthetic.w06000011.012 | settlement.uk.authored.hamlet | 1 | 1/460 |
| settlement.uk.synthetic.w06000011.013 | settlement.uk.authored.town | 16 | 4/115 |

Scope total **460**. Exact principal budget **3/4**; residual **1/4**. 3 × 1 (settlement.uk.authored.hamlet); 6 × 16 (settlement.uk.authored.town); 4 × 4 (settlement.uk.authored.village). All destinations are positive, retained, and individually enumerated above.

Swansea 345/460 = 3/4. All 13 residual destinations survive: six town masses 16, four village masses 4, three hamlet masses 1.

## 12. Compact-singleton inventory

| Exact Place / area | Exact Settlement ID | Mass |
| --- | --- | --- |
| place.uk.local-admin.e06000010 / Kingston upon Hull, City of | settlement.uk.reviewed.kingston-upon-hull | 1 |
| place.uk.local-admin.e06000015 / Derby | settlement.uk.reviewed.derby | 1 |
| place.uk.local-admin.e06000016 / Leicester | settlement.uk.reviewed.leicester | 1 |
| place.uk.local-admin.e06000018 / Nottingham | settlement.uk.reviewed.nottingham | 1 |
| place.uk.local-admin.e06000021 / Stoke-on-Trent | settlement.uk.reviewed.stoke-on-trent | 1 |
| place.uk.local-admin.e06000023 / Bristol, City of | settlement.uk.reviewed.bristol | 1 |
| place.uk.local-admin.e06000026 / Plymouth | settlement.uk.reviewed.plymouth | 1 |
| place.uk.local-admin.e06000038 / Reading | settlement.uk.reviewed.reading | 1 |
| place.uk.local-admin.e06000043 / Brighton and Hove | settlement.uk.reviewed.brighton-and-hove | 1 |
| place.uk.local-admin.e06000044 / Portsmouth | settlement.uk.reviewed.portsmouth | 1 |
| place.uk.local-admin.e06000045 / Southampton | settlement.uk.reviewed.southampton | 1 |
| place.uk.local-admin.e08000003 / Manchester | settlement.uk.reviewed.manchester | 1 |
| place.uk.local-admin.e08000012 / Liverpool | settlement.uk.reviewed.liverpool | 1 |
| place.uk.local-admin.e08000019 / Sheffield | settlement.uk.reviewed.sheffield | 1 |
| place.uk.local-admin.e08000021 / Newcastle upon Tyne | settlement.uk.reviewed.newcastle-upon-tyne | 1 |
| place.uk.local-admin.e08000024 / Sunderland | settlement.uk.reviewed.sunderland | 1 |
| place.uk.local-admin.e08000025 / Birmingham | settlement.uk.reviewed.birmingham | 1 |
| place.uk.local-admin.e08000026 / Coventry | settlement.uk.reviewed.coventry | 1 |
| place.uk.local-admin.e09000001 / City of London | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000002 / Barking and Dagenham | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000003 / Barnet | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000004 / Bexley | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000005 / Brent | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000006 / Bromley | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000007 / Camden | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000008 / Croydon | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000009 / Ealing | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000010 / Enfield | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000011 / Greenwich | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000012 / Hackney | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000013 / Hammersmith and Fulham | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000014 / Haringey | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000015 / Harrow | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000016 / Havering | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000017 / Hillingdon | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000018 / Hounslow | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000019 / Islington | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000020 / Kensington and Chelsea | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000021 / Kingston upon Thames | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000022 / Lambeth | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000023 / Lewisham | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000024 / Merton | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000025 / Newham | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000026 / Redbridge | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000027 / Richmond upon Thames | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000028 / Southwark | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000029 / Sutton | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000030 / Tower Hamlets | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000031 / Waltham Forest | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000032 / Wandsworth | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.e09000033 / Westminster | settlement.uk.reviewed.london | 1 |
| place.uk.local-admin.n09000003 / Belfast | settlement.uk.reviewed.belfast | 1 |
| place.uk.local-admin.w06000015 / Cardiff | settlement.uk.reviewed.cardiff | 1 |

**53 exact Settlement singletons**: England 51 (including London 33), Wales 1, NI 1. These are approved content precision choices within the frozen inventory, not proof of empirical habitation exhaustion. No artificial administrative residual.

## 13. London result

All **33** `place.uk.local-admin.e09000001` through `e09000033` retain the exact frozen `intersects` mapping to **settlement.uk.reviewed.london**, mass **1**, share **1/1**. The borough/cell remains the administrative reference. There is no global London administrative Place, area reassignment or inferred Presence.

## 14. City of London

**place.uk.local-admin.e09000001 → settlement.uk.reviewed.london**, mass **1**, share **1/1**. Exact City of London scope remains distinct from the other 32 scoped London destinations.

## 15. Cardiff

**place.uk.local-admin.w06000015 → settlement.uk.reviewed.cardiff**, mass **1**, share **1/1**. One reviewed Cardiff and zero synthetic Settlement candidates; no invented residual.

## 16. Belfast

**place.uk.local-admin.n09000003 → settlement.uk.reviewed.belfast**, mass **1**, share **1/1**. One reviewed Belfast and zero synthetic Settlement candidates; no invented residual.

## 17. Isles of Scilly

Approve **B: administrative-only**, `place.uk.local-admin.e06000053`, mass **1**, share **1/1**. The frozen Hugh Town identity remains available Settlement content but is deliberately not an initial destination here; its exact ID is retained in areas[].excludedSettlementCandidates. Assuming it exhausts inhabited Scilly would overstate precision. No new England OA evidence route or arbitrary split.

## 18. Rural England

| Area / Place | Candidate count | Total mass | Largest share | Smallest share | Disposition |
| --- | --- | --- | --- | --- | --- |
| Cornwall / place.uk.local-admin.e06000052 | 23 | 125 | 16/125 | 1/125 | Approve kind-only; no guessed principal or population claim. |
| North Yorkshire / place.uk.local-admin.e06000065 | 25 | 136 | 2/17 | 1/136 | Approve kind-only; no guessed principal or population claim. |
| Rutland / place.uk.local-admin.e06000017 | 2 | 20 | 4/5 | 1/5 | Approve kind-only; no guessed principal or population claim. |
| Maldon / place.uk.local-admin.e07000074 | 3 | 21 | 16/21 | 1/21 | Approve kind-only; no guessed principal or population claim. |
| North Warwickshire / place.uk.local-admin.e07000218 | 3 | 21 | 16/21 | 1/21 | Approve kind-only; no guessed principal or population claim. |

Cornwall has four towns ×16, fourteen villages ×4, five hamlets ×1 =125. North Yorkshire has four towns ×16, seventeen villages ×4, four hamlets ×1 =136. Collective rural mass may exceed one town because it spans many destinations; no principal city is asserted. Rutland 16:4 (80%) and Maldon/North Warwickshire 16:4:1 (16/21 largest) are deliberately sparse positive kind mixes, reviewed rather than silently capped.

## 19. Rural Wales

| Area / Place | Candidate count | Total mass | Largest share | Smallest share | Disposition |
| --- | --- | --- | --- | --- | --- |
| Powys / place.uk.local-admin.w06000023 | 8 | 38 | 8/19 | 1/38 | Approve kind-only; no guessed principal or population claim. |
| Ceredigion / place.uk.local-admin.w06000008 | 5 | 29 | 16/29 | 1/29 | Approve kind-only; no guessed principal or population claim. |
| Gwynedd / place.uk.local-admin.w06000002 | 7 | 64 | 1/4 | 1/16 | Approve kind-only; no guessed principal or population claim. |

Powys: one town16, five villages4, two hamlets1 =38. Ceredigion: reviewed Aberystwyth16, three villages4, one hamlet1 =29; no 75% dominance assertion over the county. Gwynedd retains broad-area kind-only. Swansea/Wrexham/Newport/Merthyr are the only explicit Welsh principal overrides.

## 20. Rural Northern Ireland

| Area / Place | Candidate count | Total mass | Largest share | Smallest share | Disposition |
| --- | --- | --- | --- | --- | --- |
| Fermanagh and Omagh / place.uk.local-admin.n09000006 | 7 | 70 | 8/35 | 1/70 | Approve kind-only; no guessed principal or population claim. |
| Mid Ulster / place.uk.local-admin.n09000009 | 9 | 66 | 8/33 | 1/66 | Approve kind-only; no guessed principal or population claim. |
| Armagh City, Banbridge and Craigavon / place.uk.local-admin.n09000002 | 14 | 95 | 16/95 | 1/95 | Approve kind-only; no guessed principal or population claim. |
| Causeway Coast and Glens / place.uk.local-admin.n09000004 | 9 | 69 | 16/69 | 1/69 | Approve kind-only; no guessed principal or population claim. |
| Mid and East Antrim / place.uk.local-admin.n09000008 | 9 | 66 | 8/33 | 1/66 | Approve kind-only; no guessed principal or population claim. |

Fermanagh/Omagh: Enniskillen16, Omagh16, two authored towns16, one village4, two hamlets1 =70. Both reviewed towns get 8/35; no single principal is inferred. Mid Ulster uses three towns16, four villages4, two hamlets1 =66. Distinct named anchors do not force guessed LGD population weights.

## 21. Scotland mass-source decision

Use only the verified official NRS **Output Area 2022 Total Population** CSV joined exactly to OA2022/CA2019/CLOC2022 in the pinned index, through the existing frozen code continuity mappings. No new population series, geometry, crosswalk or fuzzy matching. Every contributing OA is counted once. Official published Census cells → exact aggregation → adoption as placement prior are distinct epistemic steps. NRS has not endorsed Turning Pages placement.

## 22. Scottish exact-count decision

Approve **A: exact aggregated counts**, no GCD reduction, compression, rounded shares or aesthetic transformation. Largest candidate **617728**, largest scope **620870**, all positive safe integers. Exact source ratios survive unchanged; the generic weight field is not renamed population. The official cells are 2022 evidence, not 2024 Locality estimates or individual Residence truth. Published-cell sum **5,440,284** is not represented as a separately acquired headline total; this CSV's exact disclosure-control treatment remains unasserted.

## 23. Scottish locality candidate count

**662** Council × Locality fragments representing **656** continuing NRS Locality Settlement identities. Every one mechanically resolves to the exact Settlement package, council Place, country and frozen contained-by/intersects relation. Exact names are display only, never join keys.

## 24. Scottish admin-only candidate count

**32**, each positive. **Zero councils have zero outside-locality residual.** If a future source has zero, omit that candidate; no zero weight is persisted. These are explicit evidence-supported administrative precision, not errors, emergency fallback or guessed rural settlements.

## 25. Scottish total candidate count

**694 =662 Locality fragments +32 administrative residuals**. All 32 council scopes now have precise complete candidate sets; remove every prior Scottish authored principal override and 28 admin-only-only proposals.

## 26. Scottish total mass

**5,440,284 =4,957,121 locality-covered +483,163 outside-locality**. Census reference **2022-03-20**. This mass is never reconciled to the frozen mid-2024 Scottish population 5,546,900, never changes Population and is never compared with an English scope mass.

## 27. Scottish conservation

| Council / Place | Locality mass | Outside/admin mass | Exact scope total |
| --- | --- | --- | --- |
| Clackmannanshire / place.uk.local-admin.s12000005 | 50010 | 1752 | 51762 |
| Dumfries and Galloway / place.uk.local-admin.s12000006 | 100712 | 45146 | 145858 |
| East Ayrshire / place.uk.local-admin.s12000008 | 111178 | 9124 | 120302 |
| East Lothian / place.uk.local-admin.s12000010 | 102043 | 10237 | 112280 |
| East Renfrewshire / place.uk.local-admin.s12000011 | 94925 | 1900 | 96825 |
| Na h-Eileanan Siar / place.uk.local-admin.s12000013 | 7508 | 18651 | 26159 |
| Falkirk / place.uk.local-admin.s12000014 | 153376 | 5059 | 158435 |
| Highland / place.uk.local-admin.s12000017 | 163258 | 72078 | 235336 |
| Inverclyde / place.uk.local-admin.s12000018 | 77629 | 770 | 78399 |
| Midlothian / place.uk.local-admin.s12000019 | 91593 | 4919 | 96512 |
| Moray / place.uk.local-admin.s12000020 | 73637 | 19599 | 93236 |
| North Ayrshire / place.uk.local-admin.s12000021 | 127324 | 6195 | 133519 |
| Orkney Islands / place.uk.local-admin.s12000023 | 9604 | 12373 | 21977 |
| Scottish Borders / place.uk.local-admin.s12000026 | 85588 | 31239 | 116827 |
| Shetland Islands / place.uk.local-admin.s12000027 | 8609 | 14376 | 22985 |
| South Ayrshire / place.uk.local-admin.s12000028 | 101191 | 10341 | 111532 |
| South Lanarkshire / place.uk.local-admin.s12000029 | 309817 | 17314 | 327131 |
| Stirling / place.uk.local-admin.s12000030 | 81695 | 10911 | 92606 |
| Aberdeen City / place.uk.local-admin.s12000033 | 221495 | 2520 | 224015 |
| Aberdeenshire / place.uk.local-admin.s12000034 | 190965 | 72831 | 263796 |
| Argyll and Bute / place.uk.local-admin.s12000035 | 61116 | 24837 | 85953 |
| City of Edinburgh / place.uk.local-admin.s12000036 | 512928 | 1663 | 514591 |
| Renfrewshire / place.uk.local-admin.s12000038 | 181692 | 2147 | 183839 |
| West Dunbartonshire / place.uk.local-admin.s12000039 | 87158 | 1240 | 88398 |
| West Lothian / place.uk.local-admin.s12000040 | 174458 | 6814 | 181272 |
| Angus / place.uk.local-admin.s12000041 | 92801 | 21483 | 114284 |
| Dundee City / place.uk.local-admin.s12000042 | 147981 | 737 | 148718 |
| East Dunbartonshire / place.uk.local-admin.s12000045 | 106971 | 1984 | 108955 |
| Fife / place.uk.local-admin.s12000047 | 352253 | 19660 | 371913 |
| Perth and Kinross / place.uk.local-admin.s12000048 | 120633 | 30373 | 151006 |
| Glasgow City / place.uk.local-admin.s12000049 | 620162 | 708 | 620870 |
| North Lanarkshire / place.uk.local-admin.s12000050 | 336811 | 4182 | 340993 |

All 32 per-council equalities and the aggregate equality pass. All 46,363 OAs match, 42,379 inside and 3,984 outside. There is no unexplained loss or double counting.

## 28. Glasgow result

Council **Glasgow City / place.uk.local-admin.s12000049**. Main Locality **settlement.uk.nrs-locality.s52000280** mass **617728 / 620870**, 99.493936% (diagnostic). Other Localities **2434**; outside-locality administrative mass **708**.

| Destination | Exact mass | Share |
| --- | --- | --- |
| Administrative-area only | 708 | 354/310435 |
| settlement.uk.nrs-locality.s52000123 | 1236 | 618/310435 |
| settlement.uk.nrs-locality.s52000274 | 691 | 691/620870 |
| settlement.uk.nrs-locality.s52000280 | 617728 | 308864/310435 |
| settlement.uk.nrs-locality.s52000584 | 507 | 507/620870 |

Approve raw counts. Uniform choice among the 4 Locality fragments would give the major place 1/4; that content distortion is removed without inventing or rounding a new city share.

## 29. Edinburgh result

Council **City of Edinburgh / place.uk.local-admin.s12000036**. Main Locality **settlement.uk.nrs-locality.s52000233** mass **493794 / 514591**, 95.958538% (diagnostic). Other Localities **19134**; outside-locality administrative mass **1663**.

| Destination | Exact mass | Share |
| --- | --- | --- |
| Administrative-area only | 1663 | 1663/514591 |
| settlement.uk.nrs-locality.s52000233 | 493794 | 70542/73513 |
| settlement.uk.nrs-locality.s52000375 | 5607 | 801/73513 |
| settlement.uk.nrs-locality.s52000481 | 1041 | 1041/514591 |
| settlement.uk.nrs-locality.s52000533 | 2272 | 2272/514591 |
| settlement.uk.nrs-locality.s52000569 | 10214 | 10214/514591 |

Approve raw counts. Uniform choice among the 5 Locality fragments would give the major place 1/5; that content distortion is removed without inventing or rounding a new city share.

## 30. Aberdeen result

Council **Aberdeen City / place.uk.local-admin.s12000033**. Main Locality **settlement.uk.nrs-locality.s52000002** mass **192968 / 224015**, 86.140660% (diagnostic). Other Localities **28527**; outside-locality administrative mass **2520**.

| Destination | Exact mass | Share |
| --- | --- | --- |
| Administrative-area only | 2520 | 504/44803 |
| settlement.uk.nrs-locality.s52000002 | 192968 | 192968/224015 |
| settlement.uk.nrs-locality.s52000156 | 1419 | 129/20365 |
| settlement.uk.nrs-locality.s52000158 | 7926 | 7926/224015 |
| settlement.uk.nrs-locality.s52000220 | 6998 | 6998/224015 |
| settlement.uk.nrs-locality.s52000361 | 4776 | 4776/224015 |
| settlement.uk.nrs-locality.s52000446 | 3049 | 3049/224015 |
| settlement.uk.nrs-locality.s52000511 | 4359 | 4359/224015 |

Approve raw counts. Uniform choice among the 7 Locality fragments would give the major place 1/7; that content distortion is removed without inventing or rounding a new city share.

## 31. Dundee result

Council **Dundee City / place.uk.local-admin.s12000042**. Main Locality **settlement.uk.nrs-locality.s52000210** mass **146638 / 148718**, 98.601380% (diagnostic). Other Localities **1343**; outside-locality administrative mass **737**.

| Destination | Exact mass | Share |
| --- | --- | --- |
| Administrative-area only | 737 | 737/148718 |
| settlement.uk.nrs-locality.s52000210 | 146638 | 73319/74359 |
| settlement.uk.nrs-locality.s52000403 | 1343 | 1343/148718 |

Approve raw counts. Uniform choice among the 2 Locality fragments would give the major place 1/2; that content distortion is removed without inventing or rounding a new city share.

## 32. Orkney result

**Orkney Islands / place.uk.local-admin.s12000023**: 9604 locality mass + **12373** administrative mass = **21977**. Outside share **12373/21977**, 56.299768% (diagnostic).

| Exact destination | Mass | Share |
| --- | --- | --- |
| Administrative-area only | 12373 | 12373/21977 |
| settlement.uk.nrs-locality.s52000254 | 511 | 511/21977 |
| settlement.uk.nrs-locality.s52000378 | 7393 | 7393/21977 |
| settlement.uk.nrs-locality.s52000599 | 1700 | 1700/21977 |

Approve existing Localities plus measured outside-locality residual; no new island weighting, fine-place claim, geometry or crosswalk.

## 33. Shetland result

**Shetland Islands / place.uk.local-admin.s12000027**: 8609 locality mass + **14376** administrative mass = **22985**. Outside share **14376/22985**, 62.545138% (diagnostic).

| Exact destination | Mass | Share |
| --- | --- | --- |
| Administrative-area only | 14376 | 14376/22985 |
| settlement.uk.nrs-locality.s52000088 | 729 | 729/22985 |
| settlement.uk.nrs-locality.s52000396 | 6714 | 6714/22985 |
| settlement.uk.nrs-locality.s52000559 | 1166 | 1166/22985 |

Approve existing Localities plus measured outside-locality residual; no new island weighting, fine-place claim, geometry or crosswalk.

## 34. Na h-Eileanan Siar result

**Na h-Eileanan Siar / place.uk.local-admin.s12000013**: 7508 locality mass + **18651** administrative mass = **26159**. Outside share **18651/26159**, 71.298597% (diagnostic).

| Exact destination | Mass | Share |
| --- | --- | --- |
| Administrative-area only | 18651 | 18651/26159 |
| settlement.uk.nrs-locality.s52000041 | 535 | 535/26159 |
| settlement.uk.nrs-locality.s52000430 | 1586 | 1586/26159 |
| settlement.uk.nrs-locality.s52000556 | 810 | 810/26159 |
| settlement.uk.nrs-locality.s52000583 | 4577 | 4577/26159 |

Approve existing Localities plus measured outside-locality residual; no new island weighting, fine-place claim, geometry or crosswalk.

## 35. Cross-boundary result

| Locality / exact Settlement | Qualified fragments: exact Place → mass | Conserved total |
| --- | --- | --- |
| Dundee / settlement.uk.nrs-locality.s52000210 | place.uk.local-admin.s12000041 → 727; place.uk.local-admin.s12000042 → 146638 | 147365 |
| Glasgow / settlement.uk.nrs-locality.s52000280 | place.uk.local-admin.s12000038 → 176; place.uk.local-admin.s12000049 → 617728 | 617904 |
| Harthill / settlement.uk.nrs-locality.s52000307 | place.uk.local-admin.s12000040 → 930; place.uk.local-admin.s12000050 → 1683 | 2613 |
| Kelty / settlement.uk.nrs-locality.s52000342 | place.uk.local-admin.s12000047 → 6751; place.uk.local-admin.s12000048 → 147 | 6898 |
| Liff / settlement.uk.nrs-locality.s52000403 | place.uk.local-admin.s12000041 → 530; place.uk.local-admin.s12000042 → 1343 | 1873 |
| Stepps / settlement.uk.nrs-locality.s52000584 | place.uk.local-admin.s12000049 → 507; place.uk.local-admin.s12000050 → 7136 | 7643 |

All six conserve exactly. The same durable Settlement remains distinct destinations in its two scoped councils; neither whole Locality population nor display name is substituted for fragment mass.

## 36. UK administrative-only inventory

| Exact Place / area | Mass | Within-scope share | Provenance |
| --- | --- | --- | --- |
| place.uk.local-admin.e06000053 / Isles of Scilly | 1 | 1/1 | authored-admin-only-precision |
| place.uk.local-admin.s12000005 / Clackmannanshire | 1752 | 292/8627 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000006 / Dumfries and Galloway | 45146 | 22573/72929 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000008 / East Ayrshire | 9124 | 4562/60151 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000010 / East Lothian | 10237 | 10237/112280 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000011 / East Renfrewshire | 1900 | 76/3873 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000013 / Na h-Eileanan Siar | 18651 | 18651/26159 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000014 / Falkirk | 5059 | 5059/158435 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000017 / Highland | 72078 | 36039/117668 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000018 / Inverclyde | 770 | 770/78399 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000019 / Midlothian | 4919 | 4919/96512 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000020 / Moray | 19599 | 19599/93236 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000021 / North Ayrshire | 6195 | 6195/133519 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000023 / Orkney Islands | 12373 | 12373/21977 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000026 / Scottish Borders | 31239 | 31239/116827 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000027 / Shetland Islands | 14376 | 14376/22985 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000028 / South Ayrshire | 10341 | 10341/111532 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000029 / South Lanarkshire | 17314 | 17314/327131 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000030 / Stirling | 10911 | 10911/92606 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000033 / Aberdeen City | 2520 | 504/44803 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000034 / Aberdeenshire | 72831 | 24277/87932 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000035 / Argyll and Bute | 24837 | 8279/28651 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000036 / City of Edinburgh | 1663 | 1663/514591 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000038 / Renfrewshire | 2147 | 2147/183839 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000039 / West Dunbartonshire | 1240 | 620/44199 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000040 / West Lothian | 6814 | 3407/90636 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000041 / Angus | 21483 | 21483/114284 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000042 / Dundee City | 737 | 737/148718 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000045 / East Dunbartonshire | 1984 | 1984/108955 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000047 / Fife | 19660 | 19660/371913 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000048 / Perth and Kinross | 30373 | 30373/151006 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000049 / Glasgow City | 708 | 354/310435 | census-2022-outside-locality-admin |
| place.uk.local-admin.s12000050 / North Lanarkshire | 4182 | 4182/340993 | census-2022-outside-locality-admin |

**33 total**: Scotland32 residuals; Scilly1 authored precision choice. No other non-Scottish administrative-only candidate.

## 37. Country-only result

**Zero**. Each valid UK initial request already has one exact Population allocation area. No unknown-country/area inference or country-level fallback.

## 38. Childhood/adult result

Approve the same geographic policy for age0 and age18. Age and mode do not occur in evaluator keys. If Population selects different areas, each uses its corresponding group; this does not assert identical geographic outcomes across different scopes.

## 39. One-Residence result

Approve exactly one geographic Residence decision and, in later explicit orchestration, one frozen establishResidence transaction for the eligible living instantiated Person. The evaluator alone establishes nothing. No multiple homes, Dwelling, tenure, Household or institutional placement.

## 40. No-fixed-abode result

Not used by UK initial placement v1. Existing Residence eligibility/no-fixed-abode checks remain external; do not clear or replace markers implicitly.

## 41. Presentation-override result

Name and genderLabel overrides have **no effect** on placement. Neither is accepted by the frozen request schema or included in derivation keys. No demographic or biological inference.

## 42. Entropy result

**No additional platform entropy** or mutable RNG consumption. Explicit existing uint32 rootSeed feeds the frozen keyed evaluator. No Date.now, Math.random, UUID, mutable stream or new Clock change.

## 43. Request-key result

Exact request: `{version:1, policyId, personId, rootSeed, scope:{version:1,partitionId,placeId}}`. Key material includes frozen algorithm/policy fingerprint, Person and exact scope; rootSeed is a separate derivation input. No name, gender, age, scenario/UI order. The key is not a globally unique receipt across worlds. No new ledger; external Residence orchestration must check existing state and commit atomically.

## 44. History result

**No initial ordinary player-facing History event**. Initial authored state is not a recorded historical move or evidence of the real Person home. Build provenance stays external.

## 45. Domain Event result

**No bootstrap residence-established Domain Event**, no Causality or Scheduler work. Future runtime moves are separate unimplemented semantics.

## 46. Policy-ID persistence result

**No placementPolicyId root field**. Once explicit placement commits, the existing ResidenceLocationRef is state authority. Policy/build evidence remains immutable external content. No schema, migration, recovery or storage changes.

## 47. Old-save result

Old/migrated Games keep empty Residence. Never retroactively apply the policy on load, upgrade or query. Loading existing Residence requires exact referenced Geography/Settlement content, not re-running placement.

## 48. NPC reuse result

Later explicit NPC materialization MAY invoke the same policy with canonical Population area context. Household/family orchestration may instead join an existing Residence. No query-triggered placement, automatic generation or NPC behaviour now.

## 49. Exact UK candidate count

**2,768 =2,735 eligible Settlement destinations +33 administrative candidates**. Available frozen qualified Settlement destinations=2,736. Exclude Hugh Town1; add Scottish outside-locality32 and Scilly administrative1: 2,736−1+32+1=2,768. Scotland694, England1,811, Wales166, NI97. Duplicate durable IDs across legitimate exact scopes are qualified destinations, not duplicate selection opportunities.

## 50. 361-scope audit

| Area / exact Place | Candidates | Rule | Total mass | Largest share | Second share | Reviewed flags |
| --- | --- | --- | --- | --- | --- | --- |
| Hartlepool / place.uk.local-admin.e06000001 | 4 | kind-only | 16 | 1/4 | 1/4 | None |
| Middlesbrough / place.uk.local-admin.e06000002 | 7 | principal-3-to-1 | 132 | 3/4 | 4/33 | None |
| Redcar and Cleveland / place.uk.local-admin.e06000003 | 6 | kind-only | 45 | 16/45 | 16/45 | None |
| Stockton-on-Tees / place.uk.local-admin.e06000004 | 8 | kind-only | 38 | 8/19 | 2/19 | None |
| Darlington / place.uk.local-admin.e06000005 | 5 | kind-only | 32 | 1/2 | 1/8 | None |
| Halton / place.uk.local-admin.e06000006 | 6 | kind-only | 18 | 2/9 | 2/9 | None |
| Warrington / place.uk.local-admin.e06000007 | 9 | kind-only | 54 | 8/27 | 8/27 | None |
| Blackburn with Darwen / place.uk.local-admin.e06000008 | 7 | kind-only | 49 | 16/49 | 16/49 | None |
| Blackpool / place.uk.local-admin.e06000009 | 6 | kind-only | 42 | 8/21 | 8/21 | None |
| Kingston upon Hull, City of / place.uk.local-admin.e06000010 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| East Riding of Yorkshire / place.uk.local-admin.e06000011 | 14 | kind-only | 119 | 16/119 | 16/119 | None |
| North East Lincolnshire / place.uk.local-admin.e06000012 | 7 | kind-only | 34 | 8/17 | 2/17 | None |
| North Lincolnshire / place.uk.local-admin.e06000013 | 7 | kind-only | 64 | 1/4 | 1/4 | None |
| York / place.uk.local-admin.e06000014 | 9 | principal-3-to-1 | 200 | 3/4 | 2/25 | None |
| Derby / place.uk.local-admin.e06000015 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Leicester / place.uk.local-admin.e06000016 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Rutland / place.uk.local-admin.e06000017 | 2 | kind-only | 20 | 4/5 | 1/5 | largest-above-75-percent |
| Nottingham / place.uk.local-admin.e06000018 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Herefordshire, County of / place.uk.local-admin.e06000019 | 8 | kind-only | 41 | 16/41 | 4/41 | None |
| Telford and Wrekin / place.uk.local-admin.e06000020 | 8 | kind-only | 38 | 8/19 | 2/19 | None |
| Stoke-on-Trent / place.uk.local-admin.e06000021 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Bath and North East Somerset / place.uk.local-admin.e06000022 | 8 | kind-only | 65 | 16/65 | 16/65 | reviewed-anchor-below-25-percent |
| Bristol, City of / place.uk.local-admin.e06000023 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| North Somerset / place.uk.local-admin.e06000024 | 9 | kind-only | 57 | 16/57 | 16/57 | None |
| South Gloucestershire / place.uk.local-admin.e06000025 | 12 | kind-only | 108 | 4/27 | 4/27 | None |
| Plymouth / place.uk.local-admin.e06000026 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Torbay / place.uk.local-admin.e06000027 | 6 | kind-only | 48 | 1/3 | 1/3 | None |
| Swindon / place.uk.local-admin.e06000030 | 10 | kind-only | 58 | 8/29 | 8/29 | None |
| Peterborough / place.uk.local-admin.e06000031 | 9 | kind-only | 54 | 8/27 | 8/27 | None |
| Luton / place.uk.local-admin.e06000032 | 10 | kind-only | 58 | 8/29 | 8/29 | None |
| Southend-on-Sea / place.uk.local-admin.e06000033 | 8 | kind-only | 50 | 8/25 | 8/25 | None |
| Thurrock / place.uk.local-admin.e06000034 | 7 | kind-only | 52 | 4/13 | 4/13 | None |
| Medway / place.uk.local-admin.e06000035 | 12 | kind-only | 90 | 8/45 | 8/45 | None |
| Bracknell Forest / place.uk.local-admin.e06000036 | 6 | kind-only | 30 | 8/15 | 2/15 | None |
| West Berkshire / place.uk.local-admin.e06000037 | 7 | kind-only | 49 | 16/49 | 16/49 | None |
| Reading / place.uk.local-admin.e06000038 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Slough / place.uk.local-admin.e06000039 | 7 | kind-only | 49 | 16/49 | 16/49 | None |
| Windsor and Maidenhead / place.uk.local-admin.e06000040 | 7 | kind-only | 34 | 8/17 | 2/17 | None |
| Wokingham / place.uk.local-admin.e06000041 | 8 | kind-only | 65 | 16/65 | 16/65 | None |
| Milton Keynes / place.uk.local-admin.e06000042 | 12 | kind-only | 87 | 16/87 | 16/87 | None |
| Brighton and Hove / place.uk.local-admin.e06000043 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Portsmouth / place.uk.local-admin.e06000044 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Southampton / place.uk.local-admin.e06000045 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Isle of Wight / place.uk.local-admin.e06000046 | 6 | kind-only | 42 | 8/21 | 8/21 | None |
| County Durham / place.uk.local-admin.e06000047 | 21 | kind-only | 153 | 16/153 | 16/153 | None |
| Cheshire East / place.uk.local-admin.e06000049 | 17 | kind-only | 131 | 16/131 | 16/131 | None |
| Cheshire West and Chester / place.uk.local-admin.e06000050 | 15 | kind-only | 114 | 8/57 | 8/57 | reviewed-anchor-below-25-percent |
| Shropshire / place.uk.local-admin.e06000051 | 13 | kind-only | 85 | 16/85 | 16/85 | None |
| Cornwall / place.uk.local-admin.e06000052 | 23 | kind-only | 125 | 16/125 | 16/125 | None |
| Isles of Scilly / place.uk.local-admin.e06000053 | 1 | reviewed-administrative-precision | 1 | 1/1 | 0/1 | single-destination |
| Wiltshire / place.uk.local-admin.e06000054 | 21 | kind-only | 147 | 16/147 | 16/147 | None |
| Bedford / place.uk.local-admin.e06000055 | 8 | kind-only | 50 | 8/25 | 8/25 | None |
| Central Bedfordshire / place.uk.local-admin.e06000056 | 13 | kind-only | 106 | 8/53 | 8/53 | None |
| Northumberland / place.uk.local-admin.e06000057 | 13 | kind-only | 88 | 2/11 | 2/11 | None |
| Bournemouth, Christchurch and Poole / place.uk.local-admin.e06000058 | 16 | kind-only | 130 | 8/65 | 8/65 | reviewed-anchor-below-25-percent |
| Dorset / place.uk.local-admin.e06000059 | 15 | kind-only | 111 | 16/111 | 16/111 | None |
| Buckinghamshire / place.uk.local-admin.e06000060 | 23 | kind-only | 164 | 4/41 | 4/41 | None |
| North Northamptonshire / place.uk.local-admin.e06000061 | 15 | kind-only | 102 | 8/51 | 8/51 | None |
| West Northamptonshire / place.uk.local-admin.e06000062 | 17 | kind-only | 128 | 1/8 | 1/8 | None |
| Cumberland / place.uk.local-admin.e06000063 | 11 | kind-only | 86 | 8/43 | 8/43 | reviewed-anchor-below-25-percent |
| Westmorland and Furness / place.uk.local-admin.e06000064 | 9 | kind-only | 54 | 8/27 | 8/27 | None |
| North Yorkshire / place.uk.local-admin.e06000065 | 25 | kind-only | 136 | 2/17 | 2/17 | None |
| Somerset / place.uk.local-admin.e06000066 | 23 | kind-only | 131 | 16/131 | 16/131 | None |
| Cambridge / place.uk.local-admin.e07000008 | 6 | principal-3-to-1 | 212 | 3/4 | 4/53 | None |
| East Cambridgeshire / place.uk.local-admin.e07000009 | 4 | kind-only | 34 | 8/17 | 8/17 | None |
| Fenland / place.uk.local-admin.e07000010 | 5 | kind-only | 17 | 4/17 | 4/17 | None |
| Huntingdonshire / place.uk.local-admin.e07000011 | 8 | kind-only | 50 | 8/25 | 8/25 | None |
| South Cambridgeshire / place.uk.local-admin.e07000012 | 7 | kind-only | 46 | 8/23 | 8/23 | None |
| Amber Valley / place.uk.local-admin.e07000032 | 6 | kind-only | 18 | 2/9 | 2/9 | None |
| Bolsover / place.uk.local-admin.e07000033 | 4 | kind-only | 13 | 4/13 | 4/13 | None |
| Chesterfield / place.uk.local-admin.e07000034 | 5 | kind-only | 41 | 16/41 | 16/41 | None |
| Derbyshire Dales / place.uk.local-admin.e07000035 | 3 | kind-only | 24 | 2/3 | 1/6 | None |
| Erewash / place.uk.local-admin.e07000036 | 5 | kind-only | 32 | 1/2 | 1/8 | None |
| High Peak / place.uk.local-admin.e07000037 | 4 | kind-only | 16 | 1/4 | 1/4 | None |
| North East Derbyshire / place.uk.local-admin.e07000038 | 5 | kind-only | 29 | 16/29 | 4/29 | None |
| South Derbyshire / place.uk.local-admin.e07000039 | 5 | kind-only | 38 | 8/19 | 8/19 | None |
| East Devon / place.uk.local-admin.e07000040 | 7 | kind-only | 64 | 1/4 | 1/4 | None |
| Exeter / place.uk.local-admin.e07000041 | 6 | principal-3-to-1 | 152 | 3/4 | 2/19 | None |
| Mid Devon / place.uk.local-admin.e07000042 | 4 | kind-only | 16 | 1/4 | 1/4 | None |
| North Devon / place.uk.local-admin.e07000043 | 4 | kind-only | 40 | 2/5 | 2/5 | None |
| South Hams / place.uk.local-admin.e07000044 | 4 | kind-only | 34 | 8/17 | 8/17 | None |
| Teignbridge / place.uk.local-admin.e07000045 | 6 | kind-only | 42 | 8/21 | 8/21 | None |
| Torridge / place.uk.local-admin.e07000046 | 3 | kind-only | 24 | 2/3 | 1/6 | None |
| West Devon / place.uk.local-admin.e07000047 | 3 | kind-only | 36 | 4/9 | 4/9 | None |
| Eastbourne / place.uk.local-admin.e07000061 | 5 | kind-only | 56 | 2/7 | 2/7 | None |
| Hastings / place.uk.local-admin.e07000062 | 4 | kind-only | 16 | 1/4 | 1/4 | None |
| Lewes / place.uk.local-admin.e07000063 | 4 | kind-only | 22 | 8/11 | 2/11 | None |
| Rother / place.uk.local-admin.e07000064 | 4 | kind-only | 10 | 2/5 | 2/5 | None |
| Wealden / place.uk.local-admin.e07000065 | 7 | kind-only | 49 | 16/49 | 16/49 | None |
| Basildon / place.uk.local-admin.e07000066 | 8 | kind-only | 53 | 16/53 | 16/53 | None |
| Braintree / place.uk.local-admin.e07000067 | 7 | kind-only | 46 | 8/23 | 8/23 | None |
| Brentwood / place.uk.local-admin.e07000068 | 4 | kind-only | 28 | 4/7 | 1/7 | None |
| Castle Point / place.uk.local-admin.e07000069 | 4 | kind-only | 52 | 4/13 | 4/13 | None |
| Chelmsford / place.uk.local-admin.e07000070 | 8 | kind-only | 65 | 16/65 | 16/65 | None |
| Colchester / place.uk.local-admin.e07000071 | 8 | kind-only | 50 | 8/25 | 8/25 | None |
| Epping Forest / place.uk.local-admin.e07000072 | 6 | kind-only | 18 | 2/9 | 2/9 | None |
| Harlow / place.uk.local-admin.e07000073 | 4 | kind-only | 16 | 1/4 | 1/4 | None |
| Maldon / place.uk.local-admin.e07000074 | 3 | kind-only | 21 | 16/21 | 4/21 | largest-above-75-percent |
| Rochford / place.uk.local-admin.e07000075 | 4 | kind-only | 40 | 2/5 | 2/5 | None |
| Tendring / place.uk.local-admin.e07000076 | 7 | kind-only | 37 | 16/37 | 4/37 | None |
| Uttlesford / place.uk.local-admin.e07000077 | 4 | kind-only | 16 | 1/4 | 1/4 | None |
| Cheltenham / place.uk.local-admin.e07000078 | 5 | kind-only | 56 | 2/7 | 2/7 | None |
| Cotswold / place.uk.local-admin.e07000079 | 4 | kind-only | 10 | 2/5 | 2/5 | None |
| Forest of Dean / place.uk.local-admin.e07000080 | 4 | kind-only | 34 | 8/17 | 8/17 | None |
| Gloucester / place.uk.local-admin.e07000081 | 6 | kind-only | 33 | 16/33 | 4/33 | None |
| Stroud / place.uk.local-admin.e07000082 | 5 | kind-only | 56 | 2/7 | 2/7 | None |
| Tewkesbury / place.uk.local-admin.e07000083 | 4 | kind-only | 37 | 16/37 | 16/37 | None |
| Basingstoke and Deane / place.uk.local-admin.e07000084 | 8 | kind-only | 50 | 8/25 | 8/25 | None |
| East Hampshire / place.uk.local-admin.e07000085 | 5 | kind-only | 14 | 2/7 | 2/7 | None |
| Eastleigh / place.uk.local-admin.e07000086 | 6 | kind-only | 48 | 1/3 | 1/3 | None |
| Fareham / place.uk.local-admin.e07000087 | 5 | kind-only | 38 | 8/19 | 8/19 | None |
| Gosport / place.uk.local-admin.e07000088 | 4 | kind-only | 16 | 1/4 | 1/4 | None |
| Hart / place.uk.local-admin.e07000089 | 4 | kind-only | 25 | 16/25 | 4/25 | None |
| Havant / place.uk.local-admin.e07000090 | 5 | kind-only | 26 | 8/13 | 2/13 | None |
| New Forest / place.uk.local-admin.e07000091 | 7 | kind-only | 46 | 8/23 | 8/23 | None |
| Rushmoor / place.uk.local-admin.e07000092 | 5 | kind-only | 17 | 4/17 | 4/17 | None |
| Test Valley / place.uk.local-admin.e07000093 | 6 | kind-only | 18 | 2/9 | 2/9 | None |
| Winchester / place.uk.local-admin.e07000094 | 6 | kind-only | 42 | 8/21 | 8/21 | None |
| Broxbourne / place.uk.local-admin.e07000095 | 4 | kind-only | 37 | 16/37 | 16/37 | None |
| Dacorum / place.uk.local-admin.e07000096 | 7 | kind-only | 34 | 8/17 | 2/17 | None |
| Hertsmere / place.uk.local-admin.e07000098 | 5 | kind-only | 26 | 8/13 | 2/13 | None |
| North Hertfordshire / place.uk.local-admin.e07000099 | 6 | kind-only | 33 | 16/33 | 4/33 | None |
| Three Rivers / place.uk.local-admin.e07000102 | 4 | kind-only | 16 | 1/4 | 1/4 | None |
| Watford / place.uk.local-admin.e07000103 | 5 | kind-only | 32 | 1/2 | 1/8 | None |
| Ashford / place.uk.local-admin.e07000105 | 6 | kind-only | 30 | 8/15 | 2/15 | None |
| Canterbury / place.uk.local-admin.e07000106 | 7 | kind-only | 22 | 2/11 | 2/11 | None |
| Dartford / place.uk.local-admin.e07000107 | 5 | kind-only | 17 | 4/17 | 4/17 | None |
| Dover / place.uk.local-admin.e07000108 | 5 | kind-only | 41 | 16/41 | 16/41 | None |
| Gravesham / place.uk.local-admin.e07000109 | 5 | kind-only | 29 | 16/29 | 4/29 | None |
| Maidstone / place.uk.local-admin.e07000110 | 8 | kind-only | 50 | 8/25 | 8/25 | None |
| Sevenoaks / place.uk.local-admin.e07000111 | 5 | kind-only | 20 | 1/5 | 1/5 | None |
| Folkestone and Hythe / place.uk.local-admin.e07000112 | 5 | kind-only | 17 | 4/17 | 4/17 | None |
| Swale / place.uk.local-admin.e07000113 | 7 | kind-only | 64 | 1/4 | 1/4 | None |
| Thanet / place.uk.local-admin.e07000114 | 6 | kind-only | 30 | 8/15 | 2/15 | None |
| Tonbridge and Malling / place.uk.local-admin.e07000115 | 6 | kind-only | 48 | 1/3 | 1/3 | None |
| Tunbridge Wells / place.uk.local-admin.e07000116 | 5 | kind-only | 17 | 4/17 | 4/17 | None |
| Burnley / place.uk.local-admin.e07000117 | 4 | kind-only | 34 | 8/17 | 8/17 | None |
| Chorley / place.uk.local-admin.e07000118 | 5 | kind-only | 20 | 1/5 | 1/5 | None |
| Fylde / place.uk.local-admin.e07000119 | 4 | kind-only | 40 | 2/5 | 2/5 | None |
| Hyndburn / place.uk.local-admin.e07000120 | 4 | kind-only | 28 | 4/7 | 1/7 | None |
| Lancaster / place.uk.local-admin.e07000121 | 6 | kind-only | 21 | 4/21 | 4/21 | None |
| Pendle / place.uk.local-admin.e07000122 | 4 | kind-only | 52 | 4/13 | 4/13 | None |
| Preston / place.uk.local-admin.e07000123 | 7 | kind-only | 49 | 16/49 | 16/49 | None |
| Ribble Valley / place.uk.local-admin.e07000124 | 3 | kind-only | 24 | 2/3 | 1/6 | None |
| Rossendale / place.uk.local-admin.e07000125 | 3 | kind-only | 12 | 1/3 | 1/3 | None |
| South Ribble / place.uk.local-admin.e07000126 | 5 | kind-only | 41 | 16/41 | 16/41 | None |
| West Lancashire / place.uk.local-admin.e07000127 | 5 | kind-only | 56 | 2/7 | 2/7 | None |
| Wyre / place.uk.local-admin.e07000128 | 5 | kind-only | 20 | 1/5 | 1/5 | None |
| Blaby / place.uk.local-admin.e07000129 | 5 | kind-only | 38 | 8/19 | 8/19 | None |
| Charnwood / place.uk.local-admin.e07000130 | 8 | kind-only | 53 | 16/53 | 16/53 | None |
| Harborough / place.uk.local-admin.e07000131 | 5 | kind-only | 41 | 16/41 | 16/41 | None |
| Hinckley and Bosworth / place.uk.local-admin.e07000132 | 5 | kind-only | 20 | 1/5 | 1/5 | None |
| Melton / place.uk.local-admin.e07000133 | 3 | kind-only | 24 | 2/3 | 1/6 | None |
| North West Leicestershire / place.uk.local-admin.e07000134 | 5 | kind-only | 41 | 16/41 | 16/41 | None |
| Oadby and Wigston / place.uk.local-admin.e07000135 | 3 | kind-only | 33 | 16/33 | 16/33 | None |
| Boston / place.uk.local-admin.e07000136 | 3 | kind-only | 12 | 1/3 | 1/3 | None |
| East Lindsey / place.uk.local-admin.e07000137 | 6 | kind-only | 48 | 1/3 | 1/3 | None |
| Lincoln / place.uk.local-admin.e07000138 | 5 | kind-only | 17 | 4/17 | 4/17 | None |
| North Kesteven / place.uk.local-admin.e07000139 | 5 | kind-only | 41 | 16/41 | 16/41 | None |
| South Holland / place.uk.local-admin.e07000140 | 4 | kind-only | 16 | 1/4 | 1/4 | None |
| South Kesteven / place.uk.local-admin.e07000141 | 6 | kind-only | 48 | 1/3 | 1/3 | None |
| West Lindsey / place.uk.local-admin.e07000142 | 4 | kind-only | 13 | 4/13 | 4/13 | None |
| Breckland / place.uk.local-admin.e07000143 | 6 | kind-only | 45 | 16/45 | 16/45 | None |
| Broadland / place.uk.local-admin.e07000144 | 6 | kind-only | 45 | 16/45 | 16/45 | None |
| Great Yarmouth / place.uk.local-admin.e07000145 | 4 | kind-only | 16 | 1/4 | 1/4 | None |
| King's Lynn and West Norfolk / place.uk.local-admin.e07000146 | 7 | kind-only | 64 | 1/4 | 1/4 | None |
| North Norfolk / place.uk.local-admin.e07000147 | 4 | kind-only | 10 | 2/5 | 2/5 | None |
| Norwich / place.uk.local-admin.e07000148 | 6 | principal-3-to-1 | 68 | 3/4 | 1/17 | None |
| South Norfolk / place.uk.local-admin.e07000149 | 6 | kind-only | 42 | 8/21 | 8/21 | None |
| Ashfield / place.uk.local-admin.e07000170 | 5 | kind-only | 38 | 8/19 | 8/19 | None |
| Bassetlaw / place.uk.local-admin.e07000171 | 5 | kind-only | 32 | 1/2 | 1/8 | None |
| Broxtowe / place.uk.local-admin.e07000172 | 5 | kind-only | 44 | 4/11 | 4/11 | None |
| Gedling / place.uk.local-admin.e07000173 | 5 | kind-only | 29 | 16/29 | 4/29 | None |
| Mansfield / place.uk.local-admin.e07000174 | 5 | kind-only | 41 | 16/41 | 16/41 | None |
| Newark and Sherwood / place.uk.local-admin.e07000175 | 5 | kind-only | 17 | 4/17 | 4/17 | None |
| Rushcliffe / place.uk.local-admin.e07000176 | 5 | kind-only | 32 | 1/2 | 1/8 | None |
| Cherwell / place.uk.local-admin.e07000177 | 7 | kind-only | 46 | 8/23 | 8/23 | None |
| Oxford / place.uk.local-admin.e07000178 | 7 | principal-3-to-1 | 36 | 3/4 | 1/9 | None |
| South Oxfordshire / place.uk.local-admin.e07000179 | 7 | kind-only | 49 | 16/49 | 16/49 | None |
| Vale of White Horse / place.uk.local-admin.e07000180 | 6 | kind-only | 21 | 4/21 | 4/21 | None |
| West Oxfordshire / place.uk.local-admin.e07000181 | 5 | kind-only | 56 | 2/7 | 2/7 | None |
| Cannock Chase / place.uk.local-admin.e07000192 | 5 | kind-only | 26 | 8/13 | 2/13 | None |
| East Staffordshire / place.uk.local-admin.e07000193 | 5 | kind-only | 29 | 16/29 | 4/29 | None |
| Lichfield / place.uk.local-admin.e07000194 | 5 | kind-only | 44 | 4/11 | 4/11 | None |
| Newcastle-under-Lyme / place.uk.local-admin.e07000195 | 5 | kind-only | 38 | 8/19 | 8/19 | None |
| South Staffordshire / place.uk.local-admin.e07000196 | 5 | kind-only | 38 | 8/19 | 8/19 | None |
| Stafford / place.uk.local-admin.e07000197 | 6 | kind-only | 18 | 2/9 | 2/9 | None |
| Staffordshire Moorlands / place.uk.local-admin.e07000198 | 4 | kind-only | 25 | 16/25 | 4/25 | None |
| Tamworth / place.uk.local-admin.e07000199 | 4 | kind-only | 52 | 4/13 | 4/13 | None |
| Babergh / place.uk.local-admin.e07000200 | 4 | kind-only | 22 | 8/11 | 2/11 | None |
| Ipswich / place.uk.local-admin.e07000202 | 6 | kind-only | 21 | 4/21 | 4/21 | None |
| Mid Suffolk / place.uk.local-admin.e07000203 | 5 | kind-only | 41 | 16/41 | 16/41 | None |
| Elmbridge / place.uk.local-admin.e07000207 | 6 | kind-only | 42 | 8/21 | 8/21 | None |
| Epsom and Ewell / place.uk.local-admin.e07000208 | 4 | kind-only | 16 | 1/4 | 1/4 | None |
| Guildford / place.uk.local-admin.e07000209 | 6 | kind-only | 48 | 1/3 | 1/3 | None |
| Mole Valley / place.uk.local-admin.e07000210 | 4 | kind-only | 22 | 8/11 | 2/11 | None |
| Reigate and Banstead / place.uk.local-admin.e07000211 | 7 | kind-only | 49 | 16/49 | 16/49 | None |
| Runnymede / place.uk.local-admin.e07000212 | 4 | kind-only | 52 | 4/13 | 4/13 | None |
| Spelthorne / place.uk.local-admin.e07000213 | 5 | kind-only | 26 | 8/13 | 2/13 | None |
| Surrey Heath / place.uk.local-admin.e07000214 | 4 | kind-only | 22 | 8/11 | 2/11 | None |
| Tandridge / place.uk.local-admin.e07000215 | 4 | kind-only | 16 | 1/4 | 1/4 | None |
| Waverley / place.uk.local-admin.e07000216 | 6 | kind-only | 45 | 16/45 | 16/45 | None |
| Woking / place.uk.local-admin.e07000217 | 5 | kind-only | 14 | 2/7 | 2/7 | None |
| North Warwickshire / place.uk.local-admin.e07000218 | 3 | kind-only | 21 | 16/21 | 4/21 | largest-above-75-percent |
| Nuneaton and Bedworth / place.uk.local-admin.e07000219 | 6 | kind-only | 45 | 16/45 | 16/45 | None |
| Rugby / place.uk.local-admin.e07000220 | 5 | kind-only | 41 | 16/41 | 16/41 | None |
| Stratford-on-Avon / place.uk.local-admin.e07000221 | 6 | kind-only | 42 | 8/21 | 8/21 | None |
| Warwick / place.uk.local-admin.e07000222 | 6 | kind-only | 18 | 2/9 | 2/9 | None |
| Adur / place.uk.local-admin.e07000223 | 3 | kind-only | 24 | 2/3 | 1/6 | None |
| Arun / place.uk.local-admin.e07000224 | 7 | kind-only | 49 | 16/49 | 16/49 | None |
| Chichester / place.uk.local-admin.e07000225 | 5 | kind-only | 41 | 16/41 | 16/41 | None |
| Crawley / place.uk.local-admin.e07000226 | 5 | kind-only | 17 | 4/17 | 4/17 | None |
| Horsham / place.uk.local-admin.e07000227 | 6 | kind-only | 36 | 4/9 | 1/9 | None |
| Mid Sussex / place.uk.local-admin.e07000228 | 7 | kind-only | 22 | 2/11 | 2/11 | None |
| Worthing / place.uk.local-admin.e07000229 | 5 | kind-only | 41 | 16/41 | 16/41 | None |
| Bromsgrove / place.uk.local-admin.e07000234 | 4 | kind-only | 28 | 4/7 | 1/7 | None |
| Malvern Hills / place.uk.local-admin.e07000235 | 4 | kind-only | 16 | 1/4 | 1/4 | None |
| Redditch / place.uk.local-admin.e07000236 | 4 | kind-only | 40 | 2/5 | 2/5 | None |
| Worcester / place.uk.local-admin.e07000237 | 5 | kind-only | 41 | 16/41 | 16/41 | None |
| Wychavon / place.uk.local-admin.e07000238 | 6 | kind-only | 18 | 2/9 | 2/9 | None |
| Wyre Forest / place.uk.local-admin.e07000239 | 4 | kind-only | 34 | 8/17 | 8/17 | None |
| St Albans / place.uk.local-admin.e07000240 | 6 | kind-only | 24 | 1/6 | 1/6 | None |
| Welwyn Hatfield / place.uk.local-admin.e07000241 | 5 | kind-only | 44 | 4/11 | 4/11 | None |
| East Hertfordshire / place.uk.local-admin.e07000242 | 7 | kind-only | 64 | 1/4 | 1/4 | None |
| Stevenage / place.uk.local-admin.e07000243 | 4 | kind-only | 34 | 8/17 | 8/17 | None |
| East Suffolk / place.uk.local-admin.e07000244 | 10 | kind-only | 67 | 16/67 | 16/67 | None |
| West Suffolk / place.uk.local-admin.e07000245 | 8 | kind-only | 65 | 16/65 | 16/65 | None |
| Bolton / place.uk.local-admin.e08000001 | 12 | kind-only | 114 | 8/57 | 8/57 | None |
| Bury / place.uk.local-admin.e08000002 | 8 | kind-only | 53 | 16/53 | 16/53 | None |
| Manchester / place.uk.local-admin.e08000003 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Oldham / place.uk.local-admin.e08000004 | 10 | kind-only | 106 | 8/53 | 8/53 | None |
| Rochdale / place.uk.local-admin.e08000005 | 10 | kind-only | 82 | 8/41 | 8/41 | None |
| Salford / place.uk.local-admin.e08000006 | 12 | kind-only | 102 | 8/51 | 8/51 | None |
| Stockport / place.uk.local-admin.e08000007 | 12 | kind-only | 120 | 2/15 | 2/15 | None |
| Tameside / place.uk.local-admin.e08000008 | 10 | kind-only | 46 | 8/23 | 2/23 | None |
| Trafford / place.uk.local-admin.e08000009 | 10 | kind-only | 58 | 8/29 | 8/29 | None |
| Wigan / place.uk.local-admin.e08000010 | 14 | kind-only | 86 | 8/43 | 8/43 | None |
| Knowsley / place.uk.local-admin.e08000011 | 7 | kind-only | 37 | 16/37 | 4/37 | None |
| Liverpool / place.uk.local-admin.e08000012 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| St. Helens / place.uk.local-admin.e08000013 | 8 | kind-only | 65 | 16/65 | 16/65 | None |
| Sefton / place.uk.local-admin.e08000014 | 12 | kind-only | 78 | 8/39 | 8/39 | None |
| Wirral / place.uk.local-admin.e08000015 | 13 | kind-only | 106 | 8/53 | 8/53 | None |
| Barnsley / place.uk.local-admin.e08000016 | 10 | kind-only | 70 | 8/35 | 8/35 | None |
| Doncaster / place.uk.local-admin.e08000017 | 13 | kind-only | 124 | 4/31 | 4/31 | None |
| Rotherham / place.uk.local-admin.e08000018 | 11 | kind-only | 86 | 8/43 | 8/43 | None |
| Sheffield / place.uk.local-admin.e08000019 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Newcastle upon Tyne / place.uk.local-admin.e08000021 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| North Tyneside / place.uk.local-admin.e08000022 | 9 | kind-only | 42 | 8/21 | 2/21 | None |
| South Tyneside / place.uk.local-admin.e08000023 | 6 | kind-only | 18 | 2/9 | 2/9 | None |
| Sunderland / place.uk.local-admin.e08000024 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Birmingham / place.uk.local-admin.e08000025 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Coventry / place.uk.local-admin.e08000026 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Dudley / place.uk.local-admin.e08000027 | 13 | kind-only | 100 | 4/25 | 4/25 | None |
| Sandwell / place.uk.local-admin.e08000028 | 14 | kind-only | 110 | 8/55 | 8/55 | None |
| Solihull / place.uk.local-admin.e08000029 | 9 | kind-only | 57 | 16/57 | 16/57 | None |
| Walsall / place.uk.local-admin.e08000030 | 12 | kind-only | 114 | 8/57 | 8/57 | None |
| Wolverhampton / place.uk.local-admin.e08000031 | 11 | kind-only | 86 | 8/43 | 8/43 | None |
| Bradford / place.uk.local-admin.e08000032 | 22 | principal-3-to-1 | 3936 | 3/8 | 3/16 | None |
| Calderdale / place.uk.local-admin.e08000033 | 9 | kind-only | 42 | 8/21 | 2/21 | None |
| Kirklees / place.uk.local-admin.e08000034 | 18 | kind-only | 135 | 16/135 | 16/135 | None |
| Leeds / place.uk.local-admin.e08000035 | 33 | principal-3-to-1 | 788 | 3/4 | 4/197 | None |
| Wakefield / place.uk.local-admin.e08000036 | 15 | kind-only | 111 | 16/111 | 16/111 | None |
| Gateshead / place.uk.local-admin.e08000037 | 8 | kind-only | 50 | 8/25 | 8/25 | None |
| City of London / place.uk.local-admin.e09000001 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Barking and Dagenham / place.uk.local-admin.e09000002 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Barnet / place.uk.local-admin.e09000003 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Bexley / place.uk.local-admin.e09000004 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Brent / place.uk.local-admin.e09000005 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Bromley / place.uk.local-admin.e09000006 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Camden / place.uk.local-admin.e09000007 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Croydon / place.uk.local-admin.e09000008 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Ealing / place.uk.local-admin.e09000009 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Enfield / place.uk.local-admin.e09000010 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Greenwich / place.uk.local-admin.e09000011 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Hackney / place.uk.local-admin.e09000012 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Hammersmith and Fulham / place.uk.local-admin.e09000013 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Haringey / place.uk.local-admin.e09000014 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Harrow / place.uk.local-admin.e09000015 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Havering / place.uk.local-admin.e09000016 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Hillingdon / place.uk.local-admin.e09000017 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Hounslow / place.uk.local-admin.e09000018 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Islington / place.uk.local-admin.e09000019 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Kensington and Chelsea / place.uk.local-admin.e09000020 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Kingston upon Thames / place.uk.local-admin.e09000021 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Lambeth / place.uk.local-admin.e09000022 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Lewisham / place.uk.local-admin.e09000023 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Merton / place.uk.local-admin.e09000024 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Newham / place.uk.local-admin.e09000025 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Redbridge / place.uk.local-admin.e09000026 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Richmond upon Thames / place.uk.local-admin.e09000027 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Southwark / place.uk.local-admin.e09000028 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Sutton / place.uk.local-admin.e09000029 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Tower Hamlets / place.uk.local-admin.e09000030 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Waltham Forest / place.uk.local-admin.e09000031 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Wandsworth / place.uk.local-admin.e09000032 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Westminster / place.uk.local-admin.e09000033 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Antrim and Newtownabbey / place.uk.local-admin.n09000001 | 9 | kind-only | 42 | 8/21 | 2/21 | None |
| Armagh City, Banbridge and Craigavon / place.uk.local-admin.n09000002 | 14 | kind-only | 95 | 16/95 | 16/95 | reviewed-anchor-below-25-percent |
| Belfast / place.uk.local-admin.n09000003 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Causeway Coast and Glens / place.uk.local-admin.n09000004 | 9 | kind-only | 69 | 16/69 | 16/69 | reviewed-anchor-below-25-percent |
| Derry City and Strabane / place.uk.local-admin.n09000005 | 9 | principal-3-to-1 | 200 | 3/4 | 2/25 | None |
| Fermanagh and Omagh / place.uk.local-admin.n09000006 | 7 | kind-only | 70 | 8/35 | 8/35 | reviewed-anchor-below-25-percent |
| Lisburn and Castlereagh / place.uk.local-admin.n09000007 | 9 | principal-3-to-1 | 212 | 3/4 | 4/53 | None |
| Mid and East Antrim / place.uk.local-admin.n09000008 | 9 | kind-only | 66 | 8/33 | 8/33 | reviewed-anchor-below-25-percent |
| Mid Ulster / place.uk.local-admin.n09000009 | 9 | kind-only | 66 | 8/33 | 8/33 | None |
| Newry, Mourne and Down / place.uk.local-admin.n09000010 | 11 | principal-3-to-1 | 244 | 3/4 | 4/61 | None |
| Ards and North Down / place.uk.local-admin.n09000011 | 10 | principal-3-to-1 | 168 | 3/4 | 2/21 | None |
| Clackmannanshire / place.uk.local-admin.s12000005 | 11 | census-2022-direct-count | 51762 | 14689/51762 | 8515/51762 | None |
| Dumfries and Galloway / place.uk.local-admin.s12000006 | 26 | census-2022-direct-count | 145858 | 22573/72929 | 16847/72929 | None |
| East Ayrshire / place.uk.local-admin.s12000008 | 24 | census-2022-direct-count | 120302 | 3621/9254 | 4562/60151 | None |
| East Lothian / place.uk.local-admin.s12000010 | 20 | census-2022-direct-count | 112280 | 767/4010 | 2447/22456 | None |
| East Renfrewshire / place.uk.local-admin.s12000011 | 14 | census-2022-direct-count | 96825 | 28447/96825 | 17608/96825 | None |
| Na h-Eileanan Siar / place.uk.local-admin.s12000013 | 5 | census-2022-direct-count | 26159 | 18651/26159 | 4577/26159 | None |
| Falkirk / place.uk.local-admin.s12000014 | 33 | census-2022-direct-count | 158435 | 34637/158435 | 16028/158435 | None |
| Highland / place.uk.local-admin.s12000017 | 56 | census-2022-direct-count | 235336 | 36039/117668 | 48257/235336 | None |
| Inverclyde / place.uk.local-admin.s12000018 | 8 | census-2022-direct-count | 78399 | 14290/26133 | 460/2529 | None |
| Midlothian / place.uk.local-admin.s12000019 | 14 | census-2022-direct-count | 96512 | 2261/12064 | 16431/96512 | None |
| Moray / place.uk.local-admin.s12000020 | 22 | census-2022-direct-count | 93236 | 24617/93236 | 19599/93236 | None |
| North Ayrshire / place.uk.local-admin.s12000021 | 19 | census-2022-direct-count | 133519 | 34005/133519 | 16224/133519 | None |
| Orkney Islands / place.uk.local-admin.s12000023 | 4 | census-2022-direct-count | 21977 | 12373/21977 | 7393/21977 | None |
| Scottish Borders / place.uk.local-admin.s12000026 | 31 | census-2022-direct-count | 116827 | 31239/116827 | 10715/116827 | None |
| Shetland Islands / place.uk.local-admin.s12000027 | 4 | census-2022-direct-count | 22985 | 14376/22985 | 6714/22985 | None |
| South Ayrshire / place.uk.local-admin.s12000028 | 16 | census-2022-direct-count | 111532 | 46209/111532 | 15271/111532 | None |
| South Lanarkshire / place.uk.local-admin.s12000029 | 34 | census-2022-direct-count | 327131 | 76626/327131 | 55171/327131 | None |
| Stirling / place.uk.local-admin.s12000030 | 19 | census-2022-direct-count | 92606 | 19295/46303 | 10911/92606 | None |
| Aberdeen City / place.uk.local-admin.s12000033 | 8 | census-2022-direct-count | 224015 | 192968/224015 | 7926/224015 | largest-above-75-percent |
| Aberdeenshire / place.uk.local-admin.s12000034 | 64 | census-2022-direct-count | 263796 | 24277/87932 | 19793/263796 | None |
| Argyll and Bute / place.uk.local-admin.s12000035 | 25 | census-2022-direct-count | 85953 | 8279/28651 | 14128/85953 | None |
| City of Edinburgh / place.uk.local-admin.s12000036 | 6 | census-2022-direct-count | 514591 | 70542/73513 | 10214/514591 | largest-above-75-percent |
| Renfrewshire / place.uk.local-admin.s12000038 | 17 | census-2022-direct-count | 183839 | 79351/183839 | 23812/183839 | destination-below-one-per-thousand |
| West Dunbartonshire / place.uk.local-admin.s12000039 | 11 | census-2022-direct-count | 88398 | 4370/14733 | 7009/29466 | None |
| West Lothian / place.uk.local-admin.s12000040 | 25 | census-2022-direct-count | 181272 | 27899/90636 | 22229/181272 | None |
| Angus / place.uk.local-admin.s12000041 | 18 | census-2022-direct-count | 114284 | 23487/114284 | 21483/114284 | None |
| Dundee City / place.uk.local-admin.s12000042 | 3 | census-2022-direct-count | 148718 | 73319/74359 | 1343/148718 | largest-above-75-percent |
| East Dunbartonshire / place.uk.local-admin.s12000045 | 10 | census-2022-direct-count | 108955 | 28507/108955 | 23759/108955 | None |
| Fife / place.uk.local-admin.s12000047 | 66 | census-2022-direct-count | 371913 | 56053/371913 | 17045/123971 | None |
| Perth and Kinross / place.uk.local-admin.s12000048 | 37 | census-2022-direct-count | 151006 | 47885/151006 | 30373/151006 | destination-below-one-per-thousand |
| Glasgow City / place.uk.local-admin.s12000049 | 5 | census-2022-direct-count | 620870 | 308864/310435 | 618/310435 | largest-above-75-percent; destination-below-one-per-thousand |
| North Lanarkshire / place.uk.local-admin.s12000050 | 39 | census-2022-direct-count | 340993 | 50557/340993 | 2224/17947 | None |
| Isle of Anglesey / place.uk.local-admin.w06000001 | 4 | kind-only | 10 | 2/5 | 2/5 | None |
| Gwynedd / place.uk.local-admin.w06000002 | 7 | kind-only | 64 | 1/4 | 1/4 | None |
| Conwy / place.uk.local-admin.w06000003 | 7 | kind-only | 52 | 4/13 | 4/13 | None |
| Denbighshire / place.uk.local-admin.w06000004 | 6 | kind-only | 30 | 8/15 | 2/15 | None |
| Flintshire / place.uk.local-admin.w06000005 | 9 | kind-only | 69 | 16/69 | 16/69 | None |
| Wrexham / place.uk.local-admin.w06000006 | 8 | principal-3-to-1 | 148 | 3/4 | 4/37 | None |
| Ceredigion / place.uk.local-admin.w06000008 | 5 | kind-only | 29 | 16/29 | 4/29 | None |
| Pembrokeshire / place.uk.local-admin.w06000009 | 7 | kind-only | 49 | 16/49 | 16/49 | None |
| Carmarthenshire / place.uk.local-admin.w06000010 | 11 | kind-only | 59 | 16/59 | 16/59 | None |
| Swansea / place.uk.local-admin.w06000011 | 14 | principal-3-to-1 | 460 | 3/4 | 4/115 | None |
| Neath Port Talbot / place.uk.local-admin.w06000012 | 8 | kind-only | 38 | 8/19 | 2/19 | None |
| Bridgend / place.uk.local-admin.w06000013 | 9 | kind-only | 57 | 16/57 | 16/57 | None |
| Vale of Glamorgan / place.uk.local-admin.w06000014 | 8 | kind-only | 65 | 16/65 | 16/65 | None |
| Cardiff / place.uk.local-admin.w06000015 | 1 | sole-settlement | 1 | 1/1 | 0/1 | single-destination |
| Rhondda Cynon Taf / place.uk.local-admin.w06000016 | 14 | kind-only | 110 | 8/55 | 8/55 | None |
| Caerphilly / place.uk.local-admin.w06000018 | 10 | kind-only | 58 | 8/29 | 8/29 | None |
| Blaenau Gwent / place.uk.local-admin.w06000019 | 4 | kind-only | 16 | 1/4 | 1/4 | None |
| Torfaen / place.uk.local-admin.w06000020 | 6 | kind-only | 48 | 1/3 | 1/3 | None |
| Monmouthshire / place.uk.local-admin.w06000021 | 6 | kind-only | 45 | 16/45 | 16/45 | None |
| Newport / place.uk.local-admin.w06000022 | 10 | principal-3-to-1 | 216 | 3/4 | 2/27 | None |
| Powys / place.uk.local-admin.w06000023 | 8 | kind-only | 38 | 8/19 | 2/19 | None |
| Merthyr Tydfil / place.uk.local-admin.w06000024 | 4 | principal-3-to-1 | 12 | 3/4 | 1/12 | None |

The JSON contains every exact destination, mass, source/decision lineage, provenance class, principal role and implied rational share. Canonical groups and candidates use frozen code-point tuple ordering; no data is hidden behind defaults or unresolved formulas.

## 51. Dominance audit

| Area / Place | Flag | Decision / rationale |
| --- | --- | --- |
| Kingston upon Hull, City of / place.uk.local-admin.e06000010 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Derby / place.uk.local-admin.e06000015 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Leicester / place.uk.local-admin.e06000016 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Rutland / place.uk.local-admin.e06000017 | largest-above-75-percent | APPROVED: Sparse kind mix, not a population claim; positive smaller destinations retained. |
| Nottingham / place.uk.local-admin.e06000018 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Stoke-on-Trent / place.uk.local-admin.e06000021 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Bath and North East Somerset / place.uk.local-admin.e06000022 | reviewed-anchor-below-25-percent | APPROVED: Broad authority / multiple anchors: reviewed identity does not alone justify principal status; retain all authored depth. |
| Bristol, City of / place.uk.local-admin.e06000023 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Plymouth / place.uk.local-admin.e06000026 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Reading / place.uk.local-admin.e06000038 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Brighton and Hove / place.uk.local-admin.e06000043 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Portsmouth / place.uk.local-admin.e06000044 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Southampton / place.uk.local-admin.e06000045 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Cheshire West and Chester / place.uk.local-admin.e06000050 | reviewed-anchor-below-25-percent | APPROVED: Broad authority / multiple anchors: reviewed identity does not alone justify principal status; retain all authored depth. |
| Isles of Scilly / place.uk.local-admin.e06000053 | single-destination | APPROVED: Scilly has explicit authored administrative precision; Hugh Town is not assumed exhaustive. |
| Bournemouth, Christchurch and Poole / place.uk.local-admin.e06000058 | reviewed-anchor-below-25-percent | APPROVED: Broad authority / multiple anchors: reviewed identity does not alone justify principal status; retain all authored depth. |
| Cumberland / place.uk.local-admin.e06000063 | reviewed-anchor-below-25-percent | APPROVED: Broad authority / multiple anchors: reviewed identity does not alone justify principal status; retain all authored depth. |
| Maldon / place.uk.local-admin.e07000074 | largest-above-75-percent | APPROVED: Sparse kind mix, not a population claim; positive smaller destinations retained. |
| North Warwickshire / place.uk.local-admin.e07000218 | largest-above-75-percent | APPROVED: Sparse kind mix, not a population claim; positive smaller destinations retained. |
| Manchester / place.uk.local-admin.e08000003 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Liverpool / place.uk.local-admin.e08000012 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Sheffield / place.uk.local-admin.e08000019 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Newcastle upon Tyne / place.uk.local-admin.e08000021 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Sunderland / place.uk.local-admin.e08000024 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Birmingham / place.uk.local-admin.e08000025 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Coventry / place.uk.local-admin.e08000026 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| City of London / place.uk.local-admin.e09000001 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Barking and Dagenham / place.uk.local-admin.e09000002 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Barnet / place.uk.local-admin.e09000003 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Bexley / place.uk.local-admin.e09000004 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Brent / place.uk.local-admin.e09000005 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Bromley / place.uk.local-admin.e09000006 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Camden / place.uk.local-admin.e09000007 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Croydon / place.uk.local-admin.e09000008 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Ealing / place.uk.local-admin.e09000009 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Enfield / place.uk.local-admin.e09000010 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Greenwich / place.uk.local-admin.e09000011 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Hackney / place.uk.local-admin.e09000012 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Hammersmith and Fulham / place.uk.local-admin.e09000013 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Haringey / place.uk.local-admin.e09000014 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Harrow / place.uk.local-admin.e09000015 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Havering / place.uk.local-admin.e09000016 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Hillingdon / place.uk.local-admin.e09000017 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Hounslow / place.uk.local-admin.e09000018 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Islington / place.uk.local-admin.e09000019 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Kensington and Chelsea / place.uk.local-admin.e09000020 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Kingston upon Thames / place.uk.local-admin.e09000021 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Lambeth / place.uk.local-admin.e09000022 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Lewisham / place.uk.local-admin.e09000023 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Merton / place.uk.local-admin.e09000024 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Newham / place.uk.local-admin.e09000025 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Redbridge / place.uk.local-admin.e09000026 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Richmond upon Thames / place.uk.local-admin.e09000027 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Southwark / place.uk.local-admin.e09000028 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Sutton / place.uk.local-admin.e09000029 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Tower Hamlets / place.uk.local-admin.e09000030 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Waltham Forest / place.uk.local-admin.e09000031 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Wandsworth / place.uk.local-admin.e09000032 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Westminster / place.uk.local-admin.e09000033 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Armagh City, Banbridge and Craigavon / place.uk.local-admin.n09000002 | reviewed-anchor-below-25-percent | APPROVED: Broad authority / multiple anchors: reviewed identity does not alone justify principal status; retain all authored depth. |
| Belfast / place.uk.local-admin.n09000003 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |
| Causeway Coast and Glens / place.uk.local-admin.n09000004 | reviewed-anchor-below-25-percent | APPROVED: Broad authority / multiple anchors: reviewed identity does not alone justify principal status; retain all authored depth. |
| Fermanagh and Omagh / place.uk.local-admin.n09000006 | reviewed-anchor-below-25-percent | APPROVED: Broad authority / multiple anchors: reviewed identity does not alone justify principal status; retain all authored depth. |
| Mid and East Antrim / place.uk.local-admin.n09000008 | reviewed-anchor-below-25-percent | APPROVED: Broad authority / multiple anchors: reviewed identity does not alone justify principal status; retain all authored depth. |
| Aberdeen City / place.uk.local-admin.s12000033 | largest-above-75-percent | APPROVED: Exact census-cell ratio; no smoothing or aesthetic cap. |
| City of Edinburgh / place.uk.local-admin.s12000036 | largest-above-75-percent | APPROVED: Exact census-cell ratio; no smoothing or aesthetic cap. |
| Renfrewshire / place.uk.local-admin.s12000038 | destination-below-one-per-thousand | APPROVED: Small exact council-qualified census fragment; positive interval preserved. |
| Dundee City / place.uk.local-admin.s12000042 | largest-above-75-percent | APPROVED: Exact census-cell ratio; no smoothing or aesthetic cap. |
| Perth and Kinross / place.uk.local-admin.s12000048 | destination-below-one-per-thousand | APPROVED: Small exact council-qualified census fragment; positive interval preserved. |
| Glasgow City / place.uk.local-admin.s12000049 | largest-above-75-percent | APPROVED: Exact census-cell ratio; no smoothing or aesthetic cap. |
| Glasgow City / place.uk.local-admin.s12000049 | destination-below-one-per-thousand | APPROVED: Small exact council-qualified census fragment; positive interval preserved. |
| Cardiff / place.uk.local-admin.w06000015 | single-destination | APPROVED: Frozen compact inventory supports one destination; no invented residual. |

54 intentional single destinations (53 compact +Scilly), 7 largest-above75% flags (3 sparse authored mixes +4 evidence-backed major cities), 8 low-anchor flags and 3 sub-per-thousand flags. Every flag reviewed; unresolved=0. Renfrewshire Glasgow fragment176, Perth/Kinross Kelty147 and GlasgowCity Stepps507 are genuine small qualified evidence fragments, not accidental dilution. All receive diagnostic witnesses. Broad-authority anchor weights are not promoted from identity alone; Bath, Chester, Bournemouth, Carlisle, Armagh/Craigavon, Coleraine, Enniskillen/Omagh and Ballymena retain explicit kind-only decisions.

## 52. Principal sensitivity

| Area | Budget | Exact principal masses | Total mass |
| --- | --- | --- | --- |
| Bradford | 13/20 | settlement.uk.reviewed.bradford → 6396 (13/40); settlement.uk.reviewed.ilkley → 1599 (13/160); settlement.uk.reviewed.keighley → 3198 (13/80); settlement.uk.reviewed.shipley → 1599 (13/160) | 19680 |
| Bradford | 7/10 | settlement.uk.reviewed.bradford → 1148 (7/20); settlement.uk.reviewed.ilkley → 287 (7/80); settlement.uk.reviewed.keighley → 574 (7/40); settlement.uk.reviewed.shipley → 287 (7/80) | 3280 |
| Bradford | 3/4 | settlement.uk.reviewed.bradford → 1476 (3/8); settlement.uk.reviewed.ilkley → 369 (3/32); settlement.uk.reviewed.keighley → 738 (3/16); settlement.uk.reviewed.shipley → 369 (3/32) | 3936 |
| Bradford | 4/5 | settlement.uk.reviewed.bradford → 492 (2/5); settlement.uk.reviewed.ilkley → 123 (1/10); settlement.uk.reviewed.keighley → 246 (1/5); settlement.uk.reviewed.shipley → 123 (1/10) | 1230 |
| Leeds | 13/20 | settlement.uk.reviewed.leeds → 2561 (13/20) | 3940 |
| Leeds | 7/10 | settlement.uk.reviewed.leeds → 1379 (7/10) | 1970 |
| Leeds | 3/4 | settlement.uk.reviewed.leeds → 591 (3/4) | 788 |
| Leeds | 4/5 | settlement.uk.reviewed.leeds → 788 (4/5) | 985 |
| Swansea | 13/20 | settlement.uk.reviewed.swansea → 1495 (13/20) | 2300 |
| Swansea | 7/10 | settlement.uk.reviewed.swansea → 805 (7/10) | 1150 |
| Swansea | 3/4 | settlement.uk.reviewed.swansea → 345 (3/4) | 460 |
| Swansea | 4/5 | settlement.uk.reviewed.swansea → 460 (4/5) | 575 |

65%,70%,75%,80% all remain exact and positive. Bradford shares for its principal roles are respectively (32.5,16.25,8.125,8.125), (35,17.5,8.75,8.75), (37.5,18.75,9.375,9.375), (40,20,10,10) percent. Residual budgets are35%,30%,25%,20%. Choose75% as the simple 3:1 authored compromise: protects explicit principal roles while retaining a substantial1/4 peripheral budget; 65/70 dilute principal intent,80 further suppresses the intentionally playable residual. None is an empirical optimum; do not tune to samples. All alternative literal candidate masses are in the JSON.

## 53. Kind sensitivity

| Area | Variant | Scope mass | Largest share | Smallest share |
| --- | --- | --- | --- | --- |
| Cornwall | approved-16-4-1 | 125 | 16/125 | 1/125 |
| North Yorkshire | approved-16-4-1 | 136 | 2/17 | 1/136 |
| Bradford | approved-16-4-1 | 3936 | 3/8 | 1/492 |
| Leeds | approved-16-4-1 | 788 | 3/4 | 1/788 |
| Fermanagh and Omagh | approved-16-4-1 | 70 | 8/35 | 1/70 |
| Mid Ulster | approved-16-4-1 | 66 | 8/33 | 1/66 |
| Ceredigion | approved-16-4-1 | 29 | 16/29 | 1/29 |
| Swansea | approved-16-4-1 | 460 | 3/4 | 1/460 |
| Powys | approved-16-4-1 | 38 | 8/19 | 1/38 |
| Cornwall | alternative-16-5-1 | 139 | 16/139 | 1/139 |
| North Yorkshire | alternative-16-5-1 | 153 | 16/153 | 1/153 |
| Bradford | alternative-16-5-1 | 4256 | 3/8 | 1/532 |
| Leeds | alternative-16-5-1 | 868 | 3/4 | 1/868 |
| Fermanagh and Omagh | alternative-16-5-1 | 71 | 16/71 | 1/71 |
| Mid Ulster | alternative-16-5-1 | 70 | 8/35 | 1/70 |
| Ceredigion | alternative-16-5-1 | 32 | 1/2 | 1/32 |
| Swansea | alternative-16-5-1 | 476 | 3/4 | 1/476 |
| Powys | alternative-16-5-1 | 43 | 16/43 | 1/43 |
| Cornwall | alternative-12-4-1 | 109 | 12/109 | 1/109 |
| North Yorkshire | alternative-12-4-1 | 120 | 1/10 | 1/120 |
| Bradford | alternative-12-4-1 | 3296 | 3/8 | 1/412 |
| Leeds | alternative-12-4-1 | 676 | 3/4 | 1/676 |
| Fermanagh and Omagh | alternative-12-4-1 | 54 | 2/9 | 1/54 |
| Mid Ulster | alternative-12-4-1 | 54 | 2/9 | 1/54 |
| Ceredigion | alternative-12-4-1 | 25 | 12/25 | 1/25 |
| Swansea | alternative-12-4-1 | 364 | 3/4 | 1/364 |
| Powys | alternative-12-4-1 | 34 | 6/17 | 1/34 |

Approve16/4/1 over modest16/5/1 and12/4/1 alternatives. Raising village mass or lowering town mass increases collective small-place dilution without new evidence; fixed principal budgets correctly remain unchanged. The geometric4× steps are simpler to explain, preserve rural reachability and give authored towns appropriate qualitative emphasis. This is a reviewed modelling choice, not statistical model fitting. All328 eligible non-Scottish scope variants are retained in JSON; Scilly has no kind weights.

## 54. Diagnostic simulation

**1,478,656** pure selections =361 ×4,096; seeds0,1,42,2024 and person:1..1024 per scope. **All2,768 destinations hit at least once**, zero base misses, zero supplemental draws, zero diagnostic standardized-difference warnings above absolute6. Exact expected-count fractions and deterministic witnesses are recorded per candidate. Every decision keeps its exact administrative area; pinned retries match. Positive cumulative intervals also establish theoretical ticket support independently of finite sampling. Diagnostic floating percentages/z-scores never participate in mass construction, selection, acceptance or policy semantics. Samples are software/content diagnostics, not proof of real Residence distribution.

## 55. Reverse-order determinism

Reversed and deterministically interleaved/shuffled groups AND candidate records normalize to byte-identical canonical proposed policy and identical fingerprint. Four pinned requests per scope produce identical decisions in original/reversed/shuffled runtimes; repeated requests are identical. Independently rerun the research generator in --verify mode for full report byte equality. Existing Scottish OA aggregation independently verifies population/index reversal.

## 56. Canonical policy validation

Frozen withResidencePlacementPolicyFingerprint +validateResidencePlacementPolicy +createResidencePlacementRuntime PASS for361 unique scopes, all2,768 positive safe weights, no duplicate destinations, all exact pins/country/relation references, no wrong-area candidate and no unsafe scope sum. Proposed proof fingerprint **fnv1a64-v1:c0d2080b63263587**. Runtime Maps are disposable closure-private derivatives; no mutable index is attached to the canonical policy or approval report. Authored scope masses range1..3,936; Scottish scope masses21,977..620,870. Scope-local selection makes magnitude differences irrelevant.

## 57. Provenance result

Finite mass classes: authored-kind-base; authored-principal-override (including its residual allocation); authored-compact-singleton; authored-admin-only-precision; census-2022-locality-fragment; census-2022-outside-locality-admin. Every candidate has one. Real/synthetic Settlement lineage does not introduce a universal multiplier. Preserve official source identity separately from Turning Pages mapping, aggregation and authored adoption. No false2024 precision, individual-home evidence or NRS endorsement.

## 58. Future integrity assertions

Immutable build assertions: exact source byte lengths/SHA-256 and index-member hashes; exact46363 unique OA match,656 Localities,32 councils,662 fragments; inside4,957,121, outside483,163, sum5,440,284; every council and six cross-boundary sums; all expected361 exact cells; all2735 qualified Settlement candidates and33 admin candidates; all weights positive/safe; all kinds mapped; exact16 principal overrides/roles/budgets/final literal masses; exact53 singleton/Scilly decisions; exact dependencies/relations; no duplicates, empty group, unused pin or unreviewed override; canonical rebuild/source-order equality. Source counts/conservation are acceptance invariants. Samples, implied percentages, z-scores and timings are diagnostic only, not fitted or brittle acceptance thresholds.

## 59. Future artifact plan

Separate implementation files, following country-content conventions: `src/data/residence/uk/initial-mid-2024/{policy-input.json,area-role-review.json,source-manifest.json,compiled-policy.json,policy-manifest.json,build-report.json,stress-report.json,adapter.ts,adapter.test.ts}`; `scripts/build-uk-initial-residence-placement.mjs`, `scripts/verify-uk-initial-residence-placement.mjs`. Reuse the pinned source bytes rather than download a different release. Runtime adapter only loads/verifies immutable compiled generic policy and manifest, never parses OA evidence or invents weights. Keep provenance/dates/checksums external; no generic schema extension. Development/candidate manifests do not register the production ID until ALL implementation integrity/review gates pass. No orchestration in this content phase.

## 60. Versioning rule

After freeze, any weight, candidate, role, precision, dependency, evidence checksum or methodology correction requires a NEW policy ID/version and reviewed manifest. No in-place numerical correction. Frozen FNV covers exact generic semantics including policyID and literal weights, not external metadata; separate SHA-256/manifests bind source bytes and methodology to the immutable production identity. Even a changed source checksum that happens to yield equal weights must trigger new content identity through release policy. FNV is accidental integrity, not cryptographic security; artifact SHA-256 is distinct. Future implementation computes/freezes artifact SHA and reproduces the analysis semantics fingerprint; no production release is claimed now.

## 61. Country Start boundary

Country Start v3 **NOT IMPLEMENTED**. After content implementation and separate freeze, future v3 may pin Populationv3, current Geography, Settlementv2, placementv1, Human content and the existing world/date. It will translate canonical membership area, check living Person and existing Residence/status, evaluate, establish through frozen Residence, validate candidate root and commit atomically. It must neither modify memberships nor create new demographic counts. Current v1/v2 constructors remain unchanged and create empty Residence.

## 62. New Game boundary

**UNCHANGED**. Still country-start.uk.mid-2024-v2 / uk.population.mid-2024.v3 with empty Residence. A routing change requires placement implementation/freeze, Country Startv3 implementation/freeze, then separate routing review. No UI field, seed, routing, persistence or compatibility change here.

## 63. Research artifacts created

This Markdown report; complete numerical approval JSON; reproducible research-only `research/uk-residence-numerical-approval/analyse.mjs` and `render.mjs`. They are not production builders/adapters/registries. Only PROJECT-STATE receives a new current-status entry. Earlier review/evidence files and frozen source bytes remain intact. No production policy file is added.

## 64. Content-integrity result

Fresh PASS: Scottish evidence generator --verify reconstructs its exact754,648-byte report/SHA; all four production content gates pass (Human, Geography, geographic Populationv3, hybrid Settlementv2); **35 frozen placement tests /3files pass**. Frozen src paths/bytes aggregateSHA-256 remains **5a2c406a6b9d88902e3c8a407062ea07bf08bd71fef2cfd6cdee3daf66beb989**. No production registration match exists in src. Full Vitest, TypeScript/build, browsers and heavy simulation gates are NOT newly rerun or claimed for this content-only design task; preceding freeze evidence remains historical. Initial local test-launch PATH/config sandbox obstacles were resolved by directly running the existing test runner with authorized local access, without source/config changes.

## 65. Remaining unresolved numerical issues

**None**. Authoring uncertainty and2022-vs2024 limitations are disclosed choices, not unspecified numbers. Remaining work is implementation/integrity/freeze and subsequent orchestration, not another evidence acquisition or numerical research loop. Known sparse real-anchor inventory and authored world depth remain frozen content limitations. Household, Housing, Presence, Travel, dynamic demography, addresses and individual-home inference remain deferred.

## 66. Explicit answers A–AJ

| Answer | Question | Final decision |
| --- | --- | --- |
| A | Exact policy ID | residence-placement.uk.mid-2024-v1 |
| B | Exact date | 2024-06-30 (compatibility, not all-source observation date) |
| C | Geography | geography.uk.primary-local-admin-2024-06-30-v1 / fnv1a64-v1:3d1a3446a16c58cb |
| D | Settlement | settlements.uk.hybrid-2024-06-30-v2 / fnv1a64-v1:2ddc7643a1e7e4b8 |
| E | Population area invariant | APPROVED: initial administrative reference exactly equals membership area; never cross scopes |
| F | Base weights | Exact five-kind table in section6: city/reviewed-town/authored-town16; village4; hamlet1 |
| G | Bradford | 1476,738,369,369 principals; residual5×128,10×32,3×8; total3936 |
| H | Leeds | 591; residual7×16,20×4,5×1; total788 |
| I | Swansea | 345; residual6×16,4×4,3×1; total460 |
| J | Other principals | 13 additional exact overrides in section8; total16, none hidden |
| K | London | 33 exact scoped intersects destinations, London mass1 per group |
| L | Cardiff | One exact Settlement, mass1 |
| M | Belfast | One exact Settlement, mass1 |
| N | Scilly | Administrative-only mass1; Hugh Town not selected |
| O | Scotland counts | Exact raw published-cell aggregates; NO transformation/reduction |
| P | Scottish admin rule | Positive outside-locality council count → explicit admin-only weight; omit zero |
| Q | Scottish candidates | 694 =662+32 |
| R | Scottish mass | 5,440,284 |
| S | Cross-boundary | Six Localities retained as separately weighted exact council-qualified fragments |
| T | Islands | Raw Locality fragments +positive outside admin counts; no authored island weights |
| U | Non-Scottish admin | Scilly ONLY |
| V | Country-only | ZERO |
| W | Childhood/adult | Same policy; age/mode absent from keys |
| X | One initial Residence | YES, later explicit orchestration; evaluator creates no state |
| Y | No-fixed-abode used | NO |
| Z | History | NONE |
| AA | Domain Events | NONE |
| AB | Policy ID in Game | NO |
| AC | Retroactive old-save placement | NO |
| AD | NPC reuse | YES, explicit later invocation; household join may supersede; no query placement |
| AE | Extra entropy | NONE |
| AF | All361 numerically specified | YES; all2768 destination masses literal and canonical |
| AG | Generic schema change | NONE |
| AH | Further research | NONE REQUIRED |
| AI | Numerical model approved | YES — APPROVED FOR IMPLEMENTATION |
| AJ | Next task | IMPLEMENT IMMUTABLE UK RESIDENCE PLACEMENT CONTENT v1; no Country Startv3/routing yet |

## 67. Final numerical approval decision

**APPROVED FOR IMPLEMENTATION.** Exact identity/date/pins, authored methodology/table/principals, all Scottish raw fragments/residuals, all33 admin candidates, all361 scopes and all2768 positive safe masses are closed and verified using frozen APIs. No unresolved precision, generic schema change or further acquisition is required. This approval is NOT a production package freeze/registration and does not enable placement.

## 68. Exact next task

**IMPLEMENT IMMUTABLE UK RESIDENCE PLACEMENT CONTENT v1** from this approved specification: strict source-byte gates, exact generated compiled generic policy, external provenance/review manifest, immutable content adapter/registry, all-scope integrity and deterministic build tests, followed by a separate final freeze review. Do NOT implement Country Startv3, alter New Game or establish actual Residence as part of that content task.


The approval JSON is the complete proposed numerical source of truth. Human tables and report sections are rendered from it; independent text logic never selects different candidates, weights or outcomes. Research verification commands: `node research/scotland-residence-2022/check-evidence.mjs --verify`; `node research/uk-residence-numerical-approval/analyse.mjs --verify`; `node research/uk-residence-numerical-approval/render.mjs --verify`.

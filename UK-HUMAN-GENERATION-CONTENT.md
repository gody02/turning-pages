# UK Human generation content v1

`human-content.uk.mid-2024-v1` is the immutable identity-facing content contract for demographic cohorts bound to profile `human.uk.pending-mid-2024-v1`. The reserved profile had no earlier registered content semantics. Its production fingerprint is `fnv1a64-v1:595ae6cfea24c49d`.

The package does not change or qualify demographic `COMPLETE`. `uk.population.mid-2024.v2` still owns the exact 69,281,437-person usual-resident partition. Human generation `READY` means only that each of its 119 nonzero birth-year cohorts can resolve deterministic content for Person construction. No game-start or gameplay caller currently loads the package.

## Official given-name evidence

All source bytes are bundled under `src/data/human/uk/generation/artifacts/` and checked against SHA-256 before their pinned schema is accepted.

| Artifact | Release | Coverage | Bytes | SHA-256 |
| --- | --- | ---: | ---: | --- |
| ONS historical top 100, England and Wales | 31 July 2025 | 1904–2024 decennial | 52,780 | `c51916592a67bdfbe7171da69414080386f1cb599814b7393217a0947afd0688` |
| ONS annual names, England and Wales | 31 July 2025 | 1996–2024 | 11,363,277 | `8be2715a9e79e12576aff795ad1eee0b36cac9636134039b4adb232367c28859` |
| NRS Babies First Names 2024 | 20 March 2025 | 1974–2024 | 380,223 | `458761e293b27429faa2816988ed086f7476121524945f46ef464f23265b05d7` |
| NISRA Baby Names 2024 | 16 April 2025 | 1997–2024 | 4,812,967 | `294ab007810241dfe8f33eda166c98dd91a4f7ccdddd751416492bba436ba627` |

The three producers describe registration populations, not the mid-year usual-resident population universe. Naming content never changes cohort counts or demographic membership.

## Birth-year bands

| Birth years | Evidence year/window | Mode | Source jurisdictions | Eligible entries |
| --- | --- | --- | --- | ---: |
| 1906–1908 | 1904 | published-support-uniform | England and Wales | 200 |
| 1909–1918 | 1914 | published-support-uniform | England and Wales | 200 |
| 1919–1928 | 1924 | published-support-uniform | England and Wales | 200 |
| 1929–1938 | 1934 | published-support-uniform | England and Wales | 200 |
| 1939–1948 | 1944 | published-support-uniform | England and Wales | 200 |
| 1949–1958 | 1954 | published-support-uniform | England and Wales | 200 |
| 1959–1968 | 1964 | published-support-uniform | England and Wales | 200 |
| 1969–1978 | 1974 | published-support-uniform | England and Wales | 200 |
| 1979–1988 | 1984 | published-support-uniform | England and Wales | 200 |
| 1989–1995 | 1994 | published-support-uniform | England and Wales | 199 |
| 1996 | 1996 | published-support-uniform | England and Wales; Scotland | 250 |
| 1997–2001 | 1997–2001 | registration-count-weighted | England and Wales; Scotland; Northern Ireland | 250 |
| 2002–2006 | 2002–2006 | registration-count-weighted | England and Wales; Scotland; Northern Ireland | 250 |
| 2007–2011 | 2007–2011 | registration-count-weighted | England and Wales; Scotland; Northern Ireland | 250 |
| 2012–2016 | 2012–2016 | registration-count-weighted | England and Wales; Scotland; Northern Ireland | 250 |
| 2017–2021 | 2017–2021 | registration-count-weighted | England and Wales; Scotland; Northern Ireland | 250 |
| 2022–2024 | 2022–2024 | registration-count-weighted | England and Wales; Scotland; Northern Ireland | 250 |

Historical ranks establish support only. Rank is discarded and each distinct supported name receives authored weight 1. The 1996 band retains the 250 names with the greatest combined published England-and-Wales and Scotland counts, then applies equal authored weights because compatible Northern Ireland counts do not exist for that year.

The 1994 source lists contain 100 entries in each registration-sex table. `Jordan` occurs in both, so their name-support union contains 199 distinct display names. This is source-union deduplication, not data loss; registration sex never changes the generation weight.

For 1997 onward, boy/girl registration categories are summed within each source and exact published counts are summed across all three constituent sources. Each five-year window, or the final three-year window, retains the 250 names with the greatest aggregate published count. This deterministic cutoff is an authored v1 content-size and fidelity policy. It is fingerprinted through both the retained entries and its explicit package limitations. It is not official source scope, demographic completeness, or evidence that omitted names are absent. A different cutoff requires a new immutable content identity.

| Window | Published positive-count named mass | Selected top-250 mass | Published positive-count mass omitted | Total registration mass | Suppressed mass |
| --- | ---: | ---: | ---: | --- | --- |
| 1997–2001 | 3,276,905 | 2,359,380 | 917,525 | unavailable | unknown |
| 2002–2006 | 3,289,729 | 2,163,090 | 1,126,639 | unavailable | unknown |
| 2007–2011 | 3,654,518 | 2,217,926 | 1,436,592 | unavailable | unknown |
| 2012–2016 | 3,585,306 | 2,038,326 | 1,546,980 | unavailable | unknown |
| 2017–2021 | 3,243,248 | 1,735,428 | 1,507,820 | unavailable | unknown |
| 2022–2024 | 1,783,270 | 895,646 | 887,624 | unavailable | unknown |

Published named mass is empirical evidence. The retained names keep their exact count-derived weights. Selecting only the largest 250 is authored representation policy. Lower-count published names are intentionally omitted content; suppressed names remain unknown rather than zero. Independent total-registration counts are not imported, so neither total registration mass nor suppressed mass is inferred.

Normalization is limited to Unicode NFC and removing surrounding whitespace. Apostrophes, capitalization, spelling, and other code points remain distinct. No transliteration or phonetic grouping occurs. The pinned-artifact audit found only trailing-whitespace source-form collisions; it found no distinct lexical spellings collapsed by this rule. Modern count lineage retains each contributing source ID and exact count. NRS source processing has already removed accents and applied proper case; the package records that source limitation rather than pretending to recover original forms.

## Authored family-name prior

The package contains 185 real display surnames, each with weight 1. Review `human-content-review.uk.family-authored-v1` approves them as plausible identity-facing game content and checks normalized duplicates, placeholders, offensive/test content, Unicode, Person display validity, breadth, very similar entries, code-point length, and licensing contamination.

This prior is an **authored gameplay abstraction**. It is not evidence of UK surname frequency, ancestry, ethnicity, religion, citizenship, geography, or any other demographic characteristic. A later empirical surname package requires a new immutable content/profile version; existing Persons are never regenerated.

The 185-entry uniform prior may produce visible repetition as more Persons are instantiated. That is explicit production-v1 content-fidelity debt, not an empirical claim or a reason to change frozen weights after inspecting samples.

## Generated Person policy

Every resolved profile generates `genderLabel = "Unspecified"`. Source registration-sex categories remain provenance metadata and do not filter names or infer gender identity or biological sex. Traits, temperament, and aptitudes are empty. UK registration and demographic evidence provides no psychological or aptitude evidence.

The current `given + " " + family` composition has a maximum of 24 Unicode code points for this package, below the shared 256-code-point safety bound. The check covers every positive-weight combination. Nothing is truncated, shortened, or removed because of length. This proves only that the current Person display-name representation is adequate for UK v1; it does not establish a universal international naming model.

## Persistence and operation

Content packages, artifacts, diagnostics, and registries are not save state. An extracted Person and PopulationMembership persist through the existing root-v3 schema. Retrying the same cohort request uses the frozen Population receipt and returns the same Person identity without another decrement. The package adds no migration, recovery key, History fact, Domain Event, Scheduler item, RNG cursor draw, NPC behaviour, or game-start bootstrap.

Rebuild normalized content with `scripts/build-uk-human-content.py`. The builder consumes only the four pinned artifacts, validates their table layouts, and emits deterministic `compiled-given-names.json`. `pnpm verify:uk-content` independently checks fixed source byte sizes, SHA-256 identities, release schema markers, the compiled artifact identity, and the package manifest. It runs before every production build, so altered source or compiled bytes cannot silently enter a production bundle. `pnpm test:sim:uk-content` performs the optional all-119-cohort extraction and retry gate.

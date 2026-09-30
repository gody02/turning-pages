# UK demographic evidence: mid-2024 packages

## Status

`uk.population.mid-2024.v1` remains the verified immutable **candidate** package for 30 June 2024. It remains `PARTIAL`, with fingerprint `fnv1a64-v1:0ef6dda53a4ef2f4`. Successor `uk.population.mid-2024.v2` closes the demographic partition using the separately identified assumed/calibrated old-age model and has fingerprint `fnv1a64-v1:a43f874fe1fab27f`. Neither package is called by gameplay.

The future unified mid-2025 evidence must receive a new package ID. It must never replace the semantics or pinned artifacts of this package.

## Pinned official evidence

The source bundle is `src/data/demography/uk/ons-mid-2024/`. `source-manifest.json` records exact filenames, retrieval date, source locators, byte sizes and SHA-256 checksums. SHA-256 protects the external artifact bytes; the separate `fnv1a64-v1` fingerprint protects normalized package semantics.

The authoritative workbook is ONS release `MYE24UK`, published 26 September 2025 and referring to 30 June 2024. The adapter uses:

- `MYE1!B9`: UK all-persons total, `69,281,437`;
- `MYE1!D9`, `G9`, `H9`: same-edition England-and-Wales, Scotland and Northern Ireland diagnostics;
- `MYE2 - Persons`, row 9, code `K02000001`;
- `D9`: all ages;
- `E9:CP9`: completed ages 0 through 89;
- `CQ9`: open age 90 and over.

The pinned `ukevo2024.csv`, released 21 October 2025, supplies provisional rounded estimates for completed ages 90 through 104 and the open 105-and-over category. Its figures are rounded to the nearest 10 and may not add because of rounding. It supplements the age resolution but does not close the tail.

The official bulletin and QMI are pinned for release, universe, quality and revision context. No correction notice was listed by ONS when the bundle was retrieved on 24 September 2026. All pinned material is reused under the Open Government Licence v3.0.

## Universe and evidence meaning

The package uses the official usual-resident universe: people who reside, or intend to reside, in the country for at least 12 months, whatever their nationality; visitors and short-term migrants are excluded. It does not mean citizens, voters, registered patients, labour force or households.

The mid-year counts are `estimated`. The workbook publishes unrounded analysis values but warns that they are not accurate to that apparent precision. The very-old-age supplement is provisional and rounded. Completed-age to birth-year conversion is calibrated using exact Gregorian day weights; uniform birthdays within each completed-age interval are assumed; largest-remainder residual assignment is calibrated. No exact Person birth dates are created.

## Diagnostics and coverage

The workbook's ages 0 through 89 plus its 90+ cell sum exactly to `69,281,437`. Same-edition constituent totals also sum exactly to it. The rounded supplement reports 90+ as `625,240`, versus the unified workbook's unrounded `625,236`; its rounded 90–104 cells sum to `624,640`, and its rounded open 105+ cell is `610`.

Using supported closed cells through age 104 yields 106 birth-year cohorts for 1919 through 2024 and a supported canonical sum of `69,280,841`. The difference from the authoritative total is `596`; this is not silently reallocated.

Coverage remains `PARTIAL` because:

- age 105+ remains open;
- the immutable v1 package retains its original blocking gap record and cannot be silently redefined after the shared calendar expanded;
- no approved production UK Person-generation profile exists for operational cohort-to-Person instantiation.

The generic calendar now supports proleptic-Gregorian years 1–9999, so possible births before 1900 are no longer a framework limitation. Removing that recorded gap would change the immutable package semantics and fingerprint, so it requires a successor package rather than mutation of `uk.population.mid-2024.v1`.

Demographic completeness and Person-generation readiness are distinct. Closing the open tail is demographic evidence work; naming and intrinsic-generation content is an operational instantiation concern and does not make the statistical partition exhaustive. The immutable `v2` model report records generation `NOT READY` at the time the demographic package was frozen. Separate package `human-content.uk.mid-2024-v1` now resolves the reserved profile identifier without mutating `v2`; the runtime readiness assessment is `READY` when that registry is explicitly supplied. No gameplay/bootstrap caller supplies it yet.

## Immutable successor and tail model

`uk-old-age-tail.geometric-adjacent-v1` uses the pinned rounded ages 90–104, rounded 105+ value 610, authoritative unrounded 90+ subtotal 625,236, and authoritative UK total 69,281,437. The continuation ratio is exactly `(N101+N102+N103+N104)/(N100+N101+N102+N103) = 933/1516`. Exact powers cover ages 105–119. The entire rounded 90–119 vector is reconciled by exact proportional largest remainder, using code-point IDs `age:090` through `age:119`, to the unrounded subtotal.

The resulting 105–119 vector is `235, 144, 89, 55, 34, 21, 13, 8, 5, 3, 2, 1, 1, 0, 0` (total 611). Uniform valid-day allocation converts completed ages to 119 nonzero birth-year cohorts spanning 1906–2024, conserving 69,281,437 people. The value 596 remains only the residual between the authoritative 90+ subtotal and the sum of rounded 90–104 cells; it is not treated as published 105+ evidence.

Every modeled tail cell records its assumed shape, exact ratio, rounded source precision, reconciliation result, residual status, and the fact that it is not directly observed. The age-120 terminal is the official production-method assumption used for this initialization model. It is not a Person limit, mortality rule, or biological claim. Mechanical rounding, alternate estimators, observed-ratio envelope, stress case, and preserve-90–104 scenario are deterministic diagnostics only and do not alter canonical output or saved PopulationState.

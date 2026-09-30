# UK Geographic Population Allocation candidate

`uk.population.mid-2024.v3` is an **unregistered candidate**, compiled from frozen national package `uk.population.mid-2024.v2`, the pinned ONS detailed local-authority workbook and Geography partition `geography.uk.primary-local-admin-2024-06-30-v1`. It is not production content and Country Start still uses v2.

The compiler retains a latent `area × completed-age-category × birth-year` allocation. Each published local completed-age margin 0–89 and each local open 90+ margin is hard. National v2 birth-year counts, local totals, constituent totals and the UK total are also hard. Ages 0–89 may use only the one or two birth years compatible with completed age on 30 June 2024. Their target fractions use the exact 184-day July–December interval and the exact 181/182-day January–June interval. Local 90+ rows may use only v2's frozen old-age birth years and use that national structure as the within-total prior.

Integer realization floors exact rational quotas and solves the residual bipartite transportation problem with deterministic min-cost flow. Hard margins and support always take priority. Equal-cost processing follows canonical code-point order of area, category and birth year. The build uses no RNG and no floating-point reconciliation. The final persisted shape aggregates away completed age and stores only nonzero `areaId × birthYear` Population cohorts.

The real problem is exactly feasible: 75,449 allowed latent edges yield 71,221 nonzero latent cells and 38,731 nonzero final cohorts. All 32,490 local age 0–89 margins, 361 local 90+ margins, 119 national birth-year margins and 361 local totals are exact. Constituent totals are England 58,620,101; Wales 3,186,581; Scotland 5,546,900; Northern Ireland 1,927,855; UK 69,281,437. Candidate semantic fingerprint: `fnv1a64-v1:2894f4c1b1fdd274`.

The local workbook values are official estimated statistical evidence. Gregorian splitting, old-age allocation and integer transportation are calibrated/derived transformations. Exact canonical cells do not claim matching empirical precision.

## Persistence gate

The compact candidate Population JSON is 9,586,896 UTF-8 bytes. A representative canonical root-v3 Game is 9,595,304 UTF-8 bytes. An observed validation run serialized in about 575 ms and parsed/validated in about 260 ms, and save → load → continuation correctly allocated `person:2`. The existing browser `localStorage` persistence path does not safely support this payload under a conservative 5 MiB per-origin quota; the standard save path fails atomically and retains the previous save.

The persistence gate therefore **failed**. v3 remains an unregistered candidate. No production manifest, Country Start, New Game, schema, migration or existing save changed. A separate persistence architecture decision is required before final freeze; demographic resolution must not be reduced to fit storage.

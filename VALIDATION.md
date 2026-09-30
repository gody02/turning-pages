# MVP validation

## Persistence Architecture vNext

Focused tests freeze the existing Game codec and cover strict envelope combinations, exact-length canonical UTF-8 `ArrayBuffer` bytes, sliced views, source/read alias mutation, rejected Blob/File/typed-array/SharedArrayBuffer/detached inputs, SHA-256/length corruption, primary-to-previous metadata rebuilding, revision increments/conflicts, atomic abort and quota rollback, write-once recovery, restore, exact legacy-byte migration, migration idempotency, consumed-authority hash matching, changed/malformed marker handling, simulated IndexedDB loss, import/export and bounded SaveCoordinator coalescing/retry.

The fake-IndexedDB ArrayBuffer v3 gate persisted 9,595,304-byte primary and previous records, closed and reopened the database, verified the checksum and canonical Game, and continued at `person:2` without changing the represented total of 69,281,437. A focused observation measured Game validation 99.265 ms, JSON stringify 14.280 ms, UTF-8 encoding 9.570 ms, SHA-256 6.975 ms, complete canonical preparation 581.169 ms, first save 601.055 ms, record read 2.810 ms, ArrayBuffer decode 3.303 ms, JSON parse 14.078 ms, migration/normalization 239.845 ms, loaded-state validation 81.216 ms and complete validated reopen 844.187 ms. Timing is diagnostic.

The one-byte ArrayBuffer close/reopen probe passes Chromium and Windows Playwright WebKit. After final ownership hardening, Chromium measured canonical preparation 404.6 ms, UTF-8 14.3 ms, SHA-256 6.1 ms, write 476.7 ms, read 9.2 ms, checksum 5.8 ms, decode 5 ms and validated reopen 610.3 ms. WebKit measured 567 ms, 7 ms, 36 ms, 633 ms, 8 ms, 26 ms, 2 ms and 905 ms respectively. Both stayed within responsiveness limits. The formal gate remains failed because Firefox cannot launch: Windows SideBySide reports missing assembly `mozglue` after a verified and forced-redownloaded Playwright Firefox 155. No Safari/device claim is made from Playwright WebKit.

## UK geographic population candidate

The UK-specific compiler verifies the pinned 47,036,552-byte workbook at SHA-256 `321f27261c9cf110ea44ca10d198580ec3969bc1171c780cba5596184df9b04d`, resolves exactly 361 frozen Geography cells and solves the permitted latent transport graph without RNG or floating-point allocation decisions. Synthetic solver checks cover exact and competing margins, single support, two-year rounding, canonical equal-cost ties, input-order independence, leap-day day counts and infeasible support.

Real-data validation proves exact preservation of 32,490 local completed-age margins, 361 local 90+ margins, 119 national birth-year margins, 361 local totals, four constituent-country totals and the 69,281,437 UK total. Two complete rebuilds produced byte-identical candidate SHA-256 `c4b13eb67a1b7e231da1250b27f8e596c6535e7f260013d8a8638bda2b81188a` and semantic fingerprint `fnv1a64-v1:2894f4c1b1fdd274`. Generic Geography rollups reproduce the UK and constituent totals.

Canonical save/load and continuation work for a representative Game, but the persistence gate fails the supported browser-storage budget: Population JSON is 9,586,896 bytes and the Game is 9,595,304 bytes. An observed run serialized in about 575 ms and loaded in about 260 ms. v3 remains unregistered; v2 and Country Start remain frozen.

## UK Geography Content v1

The country-content suite verifies exact SHA-256 and byte sizes for four pinned official artifacts, strict ArcGIS/XLSX release schemas, Unicode-preserving normalization, hostile source rejection, deterministic row-order independence, the reviewed continuity ledger, Place and partition manifests, and immutable registration. Inventory assertions require exactly 296 English, 22 Welsh, 32 Scottish and 11 Northern Irish allocation leaves, plus the UK root and four constituent-country nodes.

The ONS detailed mid-2024 workbook cross-check requires exact equality of all 361 area codes, names and country assignments without importing population counts. Tests cover City of London, London boroughs, Isles of Scilly, Scottish island council areas, Crown Dependency and Overseas Territory exclusions, partition-qualified queries, allocation-cell lookup and generic dependency direction. Population non-change coverage proves `uk.population.mid-2024.v2`, Country Start and root-v3 saves remain unpartitioned. `pnpm verify:uk-geography` is part of the production content/build gate.

Implementation validation passed 36 focused Geography tests and 411 ordinary tests across 31 files. Strict TypeScript, both UK production content-integrity gates and the Vite build passed. People, Population and all-119-cohort UK Human harnesses passed; Fast and Deep profiles covered 500 ordinary lives, twenty 60-year UK histories and ten political histories. All twenty seeds completed 1,200 valid monthly UK transitions. Frozen fixtures were not changed.

Final freeze review requires the exact nine-kind inventory as well as country totals, rejects array subclasses alongside sparse/accessor/proxy source structures, and confirms Mereford is absent. Rebuilding from pinned sources reproduced every generated JSON byte. One unconstrained full-suite run encountered a transient Country Start timeout while the heavy UK Human-content suite ran concurrently; the test passed alone and the complete 411-test suite passed with one worker.

## Geography Foundation v1

Implemented 28 September 2026. Focused synthetic tests cover immutable Place identity, cross-partition continuation, boundary-era renaming/reclassification/reparenting, partition fingerprints/manifests, strict rooted trees, explicit allocation leaves, partition-qualified queries, hostile structures, a 3,000-level iterative hierarchy, calibration area resolution, coverage-scoped multi-country Population validation, living geographic rollups and unchanged save references. Canonical packages remain frozen plain JSON; runtime Maps and child indexes are closure-private derivatives.

At the generic Geography Foundation milestone, no production UK geography was added. The later UK content package adds immutable runtime content only; Person residence/presence, geometry, crosswalks, PopulationState fields, root versions, migrations and recovery keys remain absent.

Final freeze review added an explicit fingerprint manifest for durable Place identities, preserving the exact `{ placeId, countryId }` identity shape while preventing released identity semantics from changing silently. It also strengthened nested caller-alias, unpartitioned coverage, complete-root conservation and partial-assignment coverage.

The focused Geography suite passed **23 tests**. The full ordinary suite passed **398 tests across 30 files**; strict TypeScript, production UK content-integrity verification and the Vite production build passed. People, Population and UK all-cohort content harnesses passed. The bounded Fast profile, 500-life Deep profile, twenty 60-year UK-world histories, ten political histories, and the unchanged **20-seed × 1,200-transition** UK banking/world gate all passed.

## New Game UI Integration v1

Completed 24 September 2026. The New Game form now routes UK Childhood and Adult submissions through the frozen `createUkMid2024Game` boundary. Focused coverage proves exact mode mapping, omission of blank identity overrides, 256/257-code-point name handling without truncation, one platform-crypto uint32 seed per valid submission, atomic failure, unsupported-country rejection, standard save/load continuation, and the absence of legacy `createGame`/`adultStart` calls in the production UI route. Browser inspection verified the responsive form, generated-default guidance, disabled unsupported countries and mode-specific summary at desktop and phone widths.

The ordinary suite passed **375 tests across 29 files**. Strict TypeScript, the production UK content-integrity gate and the Vite production build passed. The bounded Fast profile, 500-life Deep profile, twenty 60-year UK-world histories, ten political histories, and the unchanged **20-seed × 1,200-transition** UK banking/world gate all passed. No frozen domain fixture, scenario, Human/Population package, root/component schema, migration or recovery key changed.

## Production UK Country-Start Bootstrap v1

Completed and freeze-reviewed 24 September 2026. Focused tests cover exact childhood/adult dates, deterministic `person:1` generation, optional identity overrides, complete UK population initialization, canonical save/load and hostile input. A paired-state test proves changing only `genderLabel` changes only the canonical Person and compatibility projections. A semantic-equivalence regression proves bootstrap reservation and ordinary frozen extraction use the same cohort identity, birth-year agreement, request receipt and accounting rules; retrying the bootstrap receipt through ordinary extraction reuses `person:1`.

Freeze review replaced the remaining legacy `adultStart`-then-rewrite sequence with direct exact-date compatibility initialization. The final Person is constructed first; compatibility age is derived from its DOB and the scenario Clock, and adult journal/education/money defaults are initialized without mutating Human or Population authority. Strict request reading no longer invokes accessor or Proxy `get` traps.

The ordinary suite passed **367 tests across 28 files**, strict TypeScript and the production Vite build. The build also verifies the compiled demographic package byte identity and equality with the package rebuilt from pinned evidence. People, Population and UK-content harnesses passed; fast/deep profiles passed; all twenty seeds completed 1,200 valid monthly UK transitions. Observed cold in-process creation was 458.86 ms for childhood and 436.90 ms for adult; canonical serialization was 3.40/3.30 ms and produced 30,989/31,022 bytes respectively. These are diagnostics, not thresholds. No frozen fixture, UI route, root schema, migration or recovery key changed.

## UK Human generation content v1

Completed 24 September 2026. Country-specific package `human-content.uk.mid-2024-v1` now resolves the previously reserved profile `human.uk.pending-mid-2024-v1` for all 119 nonzero cohorts in immutable demographic package `uk.population.mid-2024.v2`. Four pinned ONS, NRS and NISRA artifacts are verified by exact byte size and SHA-256 before production registration. Seventeen non-overlapping bands cover birth years 1906 through 2024: historical rank-only evidence uses equal authored selection weights over published support, while compatible 1997–2024 constituent registrations use exact aggregated counts. The 1996 transition band remains support-uniform because Northern Ireland count evidence is absent.

The separate family-name prior contains 185 real display surnames, each with weight one, and has an approved deterministic review record. It is classified only as an authored gameplay abstraction. The package fixes `genderLabel` to `Unspecified` and emits empty traits, temperament and aptitudes. NFC plus surrounding-whitespace removal is the only cross-source name normalization; spelling, case, apostrophes, hyphens and diacritics are otherwise preserved. The longest selected given and family names are 11 and 12 Unicode code points; the maximum possible composed name is 24, safely within the shared 256-code-point bound without truncation or filtering.

The immutable semantic fingerprint is `fnv1a64-v1:595ae6cfea24c49d`. Regenerating the 17-band compiled artifact from the pinned files reproduced the same 604,548 bytes and SHA-256 `6211c987c52441183ce99ba392b76fa292396c5314bdef1502dad660cbbafe25`. Focused country-content validation passed **19 tests**. The all-cohort proof extracted and idempotently retried every production cohort twice, retained the represented total of 69,281,437, left mutable RNG unchanged, and produced 120 Persons/memberships including the migrated player.

Final freeze review fixed two production-readiness defects. It added a mandatory `verify:uk-content` production-build gate: fixed source hashes, byte sizes, workbook/archive schema markers, compiled artifact identity, and package manifest must all match before TypeScript or Vite runs. It also made country diagnostics report total published positive-count mass, selected top-250 mass, intentionally omitted published mass, unavailable total-registration mass, and unknown suppressed mass separately. Added tests prove the 1996 support-only deduplication, the 1994 `Jordan` union, exact modern omitted masses, material fingerprint sensitivity and order independence. The package fingerprint and compiled bytes remain unchanged.

The full ordinary suite passed **359 tests across 27 files**; strict TypeScript and the production Vite build passed. The People harness generated 1,000 deterministic Persons at approximately 473 serialized bytes each. The Population harness represented 5,000,001 living humans with 1,001 Persons in 449,692 bytes and hash `d3a639ed`. Fast profiles, 500 ordinary deep lives, twenty 60-year UK-world histories, ten 12-year political histories, and the unchanged **20-seed × 1,200-transition** UK banking/world gate all passed. Frozen gameplay fixtures were not regenerated. This phase adds no gameplay caller, root field, migration, recovery key or generic Human/Population change.

## Proleptic Gregorian supported range

Completed 24 September 2026. The country-neutral Clock now owns one strict proleptic-Gregorian range from year 1 through 9999 with no year zero. Date validation rejects coercion, extra/hidden/accessor-backed fields, unsupported prototypes, revoked proxies, unsafe integers and fractional years. Shared ordinal, day, month and year arithmetic covers leap rules for years 4, 100 and 400 and fails predictably outside either boundary. Person, deterministic generation, Population cohorts and demographic calibration reuse the same year validator; Scheduler, Domain Events and History continue to validate dates transitively through Clock.

Pre-1000 cohort identities use canonical four-digit years (`0001`, `0004`, `0099`, `0100`, `0999`). IDs for all previously supported years remain byte-for-byte unchanged. Pre-1900 Persons, cohorts and calibration output validate and round-trip through unchanged root-v3 persistence. Clock remains v2, People/Population remain v1, calibration remains schema v1, and no migration, recovery snapshot or storage-key change was added.

Focused calendar/Human/Population/calibration/UK evidence/persistence validation passed **113 tests across seven files**, with additional direct shared-range assertions in Scheduler, Domain Events and History. The full ordinary suite passed **312 tests across 23 files**; strict TypeScript and the production Vite build passed. The immutable `uk.population.mid-2024.v1` fingerprint remains `fnv1a64-v1:0ef6dda53a4ef2f4`. The People harness generated 1,000 Persons in four deterministic batches (118,636–118,737 bytes per batch, about 473 bytes per Person); the Population harness represented 5,000,001 living humans with 1,001 Persons in 449,692 bytes and hash `d3a639ed`. The broader deep profiles passed, and the unchanged four-batch **20-seed × 1,200-transition** UK banking/world gate passed all 24,000 monthly transitions. Frozen fixtures were not regenerated.

## UK mid-2024 demographic evidence candidate

Completed 24 September 2026. The offline ONS evidence adapter verifies the pinned unified mid-2024 workbook, very-old-age CSV, release bulletin and methodology report against exact byte sizes and SHA-256 manifests before parsing. Focused coverage checks the approved workbook sheets/cells and CSV schema, exact UK and constituent totals, ages 0–89, closed ages 90–104, the unresolved 105+ tail, source provenance, rounding limits, immutable package identity and deterministic compilation.

The candidate `uk.population.mid-2024.v1` compiles deterministically as **PARTIAL** with fingerprint `fnv1a64-v1:0ef6dda53a4ef2f4`: 106 supported birth-year cohorts covering 1919–2024 and 69,280,841 people. It remains 596 below the 69,281,437 authoritative total because the open 105+ tail cannot be distributed without an approved tail model. The shared calendar now supports any implied pre-1900 birth years, but immutable v1 retains its original recorded gap and fingerprint; removing it requires a successor package. Production UK Person-generation content also remains unavailable as a separate operational concern. Tests prove that this candidate cannot initialize Population and that no save, Population schema, gameplay path, UK economic calculation or mutable RNG stream changes.

Validation passed **303 tests across 23 files**, including 83 focused demographic, Population and Person tests. Strict TypeScript and the production Vite build passed. The People harness generated 1,000 Persons across four explicit seeds; its 250-Person batches serialized to 118,636–118,737 bytes (about 473 bytes per Person in the surrounding root state). The Population harness represented 5,000,001 living humans with 1,001 Persons in 449,692 bytes and deterministic hash `d3a639ed`. The unchanged four-batch **20-seed × 1,200-transition** UK banking/world gate passed all 24,000 monthly transitions. Existing frozen fixtures were not changed.

## Synthetic demographic calibration foundation

Focused calibration tests cover hardened source/package validation, immutable canonical fingerprints, exact decimals and rationals, largest-remainder conservation, code-point tie-breaking, direct birth years, Gregorian completed-age bands, leap day, reconciliation thresholds, universe conflicts, derived authority lineage, complete/partial decisions, evidence-resolution reporting, deterministic reports and frozen Population initialization/save compatibility. Fixtures contain synthetic values only. The phase adds no root state, migration or recovery snapshot.

Final freeze validation passed **294 tests across 22 files**, strict TypeScript, and the production Vite build. Review coverage includes projected-input rejection, unsupported-tail non-redistribution, future birth-year rejection, immutable reports, hostile manifests/options, bounded exact arithmetic, optional provenance retention, and combined broad/rounded precision reporting. The unchanged 1,000-Person harness produced 118,636–118,737 bytes per 250-Person batch (approximately 473 bytes per Person in the surrounding save), and the Population harness represented 5,000,001 living humans with 1,001 Persons in 449,692 bytes and hash `d3a639ed`. The four-batch **20-seed × 100-year** UK banking/world gate passed. Timings and sizes are observations, and no frozen fixture was changed.

## PopulationState / Population Conservation v1

Implemented 23 September 2026. Canonical root v3 requires version-1 PopulationState alongside PeopleState. Migration from root v1 or v2 creates exactly one legacy membership per Person, partial coverage for the player's known game country, unknown country for additional legacy Persons, and no demographic cohorts. Exact raw bytes are protected once at `turning-pages:before-population` before primary replacement.

Focused tests cover strict shapes and hostile inputs, deterministic cohort identities, canonical ordering, positive safe-integer counts, overflow rejection, zero removal, partial/complete totals, unknown-country accounting, deceased membership retention, Person-to-membership coverage, root migration, recovery, and atomic exact-cohort instantiation. Membership receipts make identical requests idempotent and reject changed counts or cohorts. Failed generation, profile mismatch, insufficient counts, and validation errors consume neither Person IDs nor cohort population.

The final freeze review made complete-country initialization cross-state: it now validates PeopleState and membership classification atomically, and complete area partitions reject living memberships without an area. Population-backed retry requests also validate the supplied generation profile before accepting an existing receipt.

No real UK population data, geography, labour cohorts, production NPC caller, UK economic integration, History, Domain Event or Scheduler work was added. Current UK demographic-looking values retain their previous calibration or local-gameplay meanings. The final freeze-review suite passed **272 tests across 21 files**, strict TypeScript and the production build passed, and the unchanged UK gate passed **20 seeds × 1,200 monthly transitions**.

The optional synthetic harness represented 5,000,001 living humans while instantiating 1,000 non-player Persons. It preserved the total after every extraction, round-tripped and continued at `person:1002`; freeze-review runs measured a 449,692-byte canonical save, 5.861–6.110 seconds for generation/validation, and deterministic canonical hash `d3a639ed`. These measurements are observations, not performance limits.

## Deterministic Person generation foundation

Completed and freeze-reviewed 23 September 2026. The full ordinary suite passed **252 tests across twenty files**, including 15 focused generator tests and all frozen Person, Clock, RNG, Scheduler, Domain Event, Causality, History, persistence, ordinary-life, UK-world, political, economic, institutional and Mereford regressions. Strict TypeScript and the production Vite build passed. The unchanged UK freeze gate passed **20 explicit seeds × 1,200 monthly transitions (100 years)**.

Generation is identity-first and transactional, uses only pure keyed derivation, and leaves mutable RNG streams unchanged. Coverage includes stable unambiguous derivation keys, independent attributes, profile validation, code-point ordered weighted names, zero/invalid weights, exact and inclusive age-range birth dates including leap-day input, explicit/profile gender labels, family-name overrides, approved attribute catalogues, alias safety, failed allocation, save/load continuation and the absence of History, Scheduler or event side effects.

Freeze review tightened exact-date shape validation so generation contexts cannot carry unexpected date fields. It also added regression coverage for profile-array order independence and predictable rejection of sparse, accessor-backed, symbolic, hidden, revoked-proxy and malformed distribution inputs.

The optional `test:sim:people` freeze-review probe generated 1,000 Persons across four explicit seeds. Per 250-person batch it took 312–350 ms to generate, 0.70–0.98 ms to validate, and produced 97,487–97,588 canonical bytes (approximately 388–389 bytes per stored Person including its share of surrounding save state). Each batch reproduced its stable intrinsic hash and continued at `person:252` after canonical save/load. Timings and size are observations, not pass thresholds.

At the deterministic-generation milestone, no root/People schema version, migration, recovery snapshot, production NPC caller, PopulationState, cohort, fidelity process, backstory, History fact, Domain Event, causal link or Scheduler work was added. Existing fixtures were not changed.

## Person / PeopleState v1

Completed and reviewed 23 September 2026. Full Vitest passed: **237 tests across nineteen files**. The focused Human-domain suite passed **17 tests**, covering shared player/NPC Person validation, durable monotonic identities, exact birth/death dates, Clock-derived age, trait compatibility, bounded temperament/aptitude maps, immutability, hostile shape rejection, History entity IDs, root-v1 migration, root-v2 projection validation, recovery protection and post-load identity continuation. Strict TypeScript and the Vite production build passed.

The bounded UK freeze gate passed **20 explicit seeds × 1,200 monthly transitions (100 years)** with deterministic replay and valid state. Existing Clock, RNG, Scheduler, Domain Event, Causality, History, ordinary-life, UK-world, political, economic, institutional and Mereford tests remain unchanged and pass. The original `life-v1.json` remains a root-v1 migration fixture.

At the Person milestone, canonical saves became root v2 with required PeopleState. Person migration creates exactly one player `person:1` after Clock normalization without RNG consumption, elapsed-time advancement, inferred psychology/NPCs, or fabricated exact death dates. Exact raw pre-migration bytes are preserved once at `turning-pages:before-person`; non-overwrite and failed-snapshot primary-write protection are covered. No production History fact, Domain Event, causal link, NPC behaviour or gameplay system was added.

Review preserved the complete historical gender-label compatibility range so a formerly valid root-v1 custom value cannot fail only during Person construction. It also separated the legacy unknown-death exception into explicitly named compatibility constructors; normal Person and People construction always requires an exact date for a deceased Person. Revoked-proxy and hidden score-map properties now have explicit regression coverage.

Person display names now use the single shared `validPersonDisplayName` rule and `MAX_PERSON_NAME_CODE_POINTS = 256`. The validator counts Unicode code points with an early over-limit exit; it deliberately does not claim to count grapheme clusters. Focused coverage includes the former 40-character boundary, 256/257 ASCII and supplementary-plane boundaries, mixed Unicode, explicit and generated construction, overrides, final composition, root validation, UI non-truncation and unchanged root-v3 save/load.

## Deterministic simulation harness

The test-only harness drives real headless transitions with explicit root seeds. Stable content-choice IDs are deterministic test contracts and must not be casually renamed; UI choice order and existing index-based gameplay APIs remain unchanged. Fast profiles cover 100 natural personal lives, ten 50-year UK-world runs and six six-year political lives. Deep profiles are separate manual/pre-release coverage.

Hard failures reuse existing state validators and canonical save round-trips. Plausibility signals such as boundary saturation, banking distress, rapid growth and save-size bands are warnings only. The former banking horizon defect reproduced by seed `4829914` at national month `781` is fixed at repayment allocation: total repayment cannot exceed the actual loan book and component shares use the real outstanding balance. Focused edge cases cover sub-£1bn, near-zero and zero books, full repayment, reconciliation and deterministic month-780 replay. Twenty explicit seeds each replay identically through 1,200 valid monthly transitions. No validator or frozen fixture was changed. A 1,000-year soak remains deferred because there is no standalone persisted world session and long histories have scaling costs.

The optional 250-year diagnostic reached months 2964, 2960 and 2764 for seeds 100–102 before a different UK-world/institution validation failure. Split probes confirm every persisted bank component is finite and within its authoritative numeric bounds and every bank balance sheet remains within reconciliation tolerance at those failures. This is not recurrence of the repayment-allocation defect. It is deliberately not repaired or promoted into the 100-year acceptance gate in this phase.

Final kernel-freeze review passed **220 tests across 18 files**, strict TypeScript and the production build. `pnpm test:sim:banking` runs the 20-seed gate in four bounded batches so Vitest receives progress without weakening coverage. Review also prevents duplicate terminal warnings and correctly identifies the 500-life profile as Deep.

## Persistence and save integrity hardening

Completed and reviewed 22 September 2026. Full Vitest passed: **203 tests across fifteen files**. Strict TypeScript and the Vite production build passed. The persistence suite reproduces and prevents sparse-array JSON corruption, unknown future root fields, future component-version misclassification, unsafe or exhausted RNG cursors, lossy backup exports, drift in recovery inventory and inaccessible recovery after primary failure. Hostile accessors, symbols and revoked proxies fail safely without executing getters.

Primary save and export now share a canonical normalization and JSON round-trip. Tests cover structured failure categories, exact raw recovery/non-overwrite behavior, legacy migration, and both political and non-political combined continuation across Clock, RNG, recurring Scheduler work, History IDs, UK national state, politics and Mereford. The untouched `life-v1.json` and frozen architecture baseline remain unchanged.

Review coverage confirms that confirmed recovery writes canonical state before updating React state, leaves the selected snapshot intact, and can replace an unloadable primary. Future versions of Clock, RNG, Scheduler, History, UK World, National state, institutions, Politics and Mereford are categorized as unsupported. A stream at the maximum safe cursor fails before changing its state.

Audit observations were approximately 0.86 MB for a measured 79-year ordinary life and 3.5 MB for a measured 50-year political run. No compression, truncation, compaction or backend replacement was introduced. See `PERSISTENCE.md` for the future storage trigger and transaction boundary.

## Durable History Foundation

Completed 22 September 2026. Full Vitest passed: **190 tests across fourteen files**. The focused History suite passed **15 tests**, including deterministic durable identity, append/date ordering, immutable alias-safe facts, strict namespaced identifiers, actor/subject and finite plain-JSON validation, all v1 queries, real reserved causal references, the 100,000-fact boundary, save/load identity, Clock-before-History migration order, idempotence, exact raw recovery and failed-snapshot primary-save protection. Strict TypeScript and the Vite production build passed.

Architecture and regression coverage confirms that new lives and normalized saves own version-1 History while the top-level save version remains `1`; legacy saves gain an empty ledger without fabricated facts or RNG consumption. Current LifeFacts, journals, Domain Events, Causal Traces, Scheduler state, Clock/RNG behavior, UK world, politics, national economics, institutions and Mereford remain unchanged. No production History producer or automatic promotion exists.

Foundation review hardened History's own object, field and actor/subject validators against revoked proxies and accessor-backed structures. Tests confirm getters are not executed, hostile values fail before state creation, future facts are rejected against the canonical Clock, and legacy `LifeFact` values cannot be converted through the durable reference helper.

## Domain Events Foundation

Completed and reviewed 22 September 2026. Full Vitest passed: **161 tests across twelve files**. The focused Clock, RNG, Scheduler, migration, dependency and Domain Event group passed **75 tests across seven files**. TypeScript and the Vite production build passed. The transaction-local core queue has deterministic IDs, correlation/causation, immutable handler snapshots, code-point ordered synchronous handlers, immutable JSON envelopes, breadth-first follow-ups and a transactional 10,000-event safety cap. Review coverage includes retained-emitter parent identity, grandchildren ordering, source-data aliasing, malformed descriptors/proxies, exact cap boundaries and async-handler rejection. It has no save schema or migration: events and traces are discarded after a candidate transition. The proof-only `person.job_changed` notification runs after existing ordinary action hooks; current content events, political events, national incidents and history remain unchanged.

## Scheduler Foundation

Completed 22 September 2026. Full Vitest passed: **148 tests across eleven files**. TypeScript and the Vite production build passed. Scheduler coverage verifies exact-date one-offs, future-date validation, deterministic ordering independent of persisted array order, cancellation without ID reuse, anchored daily/monthly/yearly recurrence, leap and month-end dates, large calendar jumps, owner filtering, no duplicate extraction, transactional safety-cap failure, save round-trips, migration/recovery, and unchanged UK political, national, and Mereford fixtures. It adds no scheduled gameplay or changes existing transition ordering.

## Deterministic randomness

Completed and reviewed 22 September 2026. Full Vitest passed: **137 tests across ten files**. Strict TypeScript and the Vite production build passed. The core RNG suite verifies deterministic named-stream isolation, pure keyed derivation, weighted selection validation including zero-weight boundaries, immutable shuffle, legacy seed migration, canonical compatibility projections and recovery snapshots. Compatibility streams preserve existing life/politics, UK-national and Mereford LCG ordering; frozen architecture scenarios remain the regression boundary.

## Causality / provenance foundation

Completed 22 September 2026.

- Full Vitest suite passed after foundation review: **175 tests across 13 files**. Strict TypeScript and the Vite production build also passed.
- Fourteen focused causality tests cover deterministic local identities, explicit `caused`/`contributed` declarations, unambiguous structural duplicate keys, malformed declaration rejection, reference-kind and occurrence separation, duplicate/self-link rejection, allowed larger cycles, immutable copied references, event-trace validation, Scheduler identity references, reserved History references, terminal lifecycle and the 10,000-link transactional cap.
- Architecture checks confirm the new core has no React, UK, politics, Scheduler runtime, RNG, host-randomness or wall-clock dependency. Domain Events, Clock, RNG, Scheduler, migration, ordinary-life, UK world, politics, national economics, banking/institutions and Mereford regressions remain green.
- No causal trace, link, sequence or recovery key is persisted. Existing saves, fixtures and gameplay ordering are unchanged.

## Day-precision universal clock

Completed 22 September 2026.

- Full Vitest run passed: **124 tests across eight files**. Strict TypeScript and the Vite production build passed.
- Exact Gregorian calendar tests cover invalid dates, leap years, 29 February, month lengths, date comparison, day movement, month-end clamping, year boundaries and leap-day year clamping.
- Age tests cover the day before, on and after an exact birthday. Monthly and annual gameplay still advances one and twelve calendar months respectively.
- Version-1 year/month clocks and dates of birth migrate to version-2 exact dates with `day: 1`. Tests verify idempotence, preserved UK world/national counters and political tenure, distinct raw recovery bytes, and refusal to replace a save if the new recovery snapshot fails.
- UK world progression remains monthly: no economy, finance, event or political system runs once per simulated day. The frozen economic/political golden scenario passed unchanged, as did the focused migration suites: **38 tests across three files**.
- The 100-lifetime regression retains all assertions and now has a 10-second timeout, reflecting the full validation workload on this host.

## Universal simulation clock

Completed 22 September 2026.

- Full Vitest run passed: **119 tests across eight files**. Strict TypeScript and the Vite production build also passed.
- Seven focused clock tests cover the country-neutral persisted date, date-of-birth age derivation, annual and monthly movement, late political entry, political exit, tenure separation and one UK-world advance per clock step.
- Migration tests cover old `{ monthOfYear, totalMonths, cadence }` clocks, clockless v1 saves, idempotent normalization, unchanged UK/political state, exact raw recovery bytes and refusal to replace the primary save when the recovery write fails.
- The untouched `life-v1.json` fixture migrates prospectively. Existing UK-world and national migration suites passed: **33 tests across three files**.
- The frozen pre-refactor annual-life, political, election, banking and Budget scenario passed without changing its golden fixture. Existing random sequences and economic ordering remain behaviorally identical.
- No scheduler, RNG redesign, delayed consequence, domain-event, causality, career, relationship, political or economic feature was added in this phase.

## Life architecture refactor

Completed 22 September 2026.

- Strict TypeScript and production builds passed. **101 tests passed** across six files: 86 existing behavioural tests and 15 architecture tests.
- Frozen comparison covers an ordinary 35-year life, four years of political progression, elections, banking state and a Budget action against the untouched pre-refactor source.
- Shared-system tests cover monthly jobs, promotions, a three-year qualification, personal cash settlement, one birthday per twelve months, death, persistent facts, character traits/skills/fame/reputation and generic account/bank arithmetic without a political career.
- Module tests cover an independent apprenticeship path, conflicting income providers, mid-year UK entry, country registry boundaries and strict import direction from UK politics into shared systems.
- Compatibility checks cover the fixed legacy save, prospective generic state, a raw pre-architecture recovery copy and primary-save protection when recovery storage fails.
- Detailed UK political, national, institutional and constituency suites remain the behavioural coverage for the country module.
- Isolated production browser check created an adult UK life, entered politics, resolved the opening promise and advanced one month. Age/month, personal expenses, support and the next dilemma updated together. At a 390 × 844 viewport the document had no horizontal overflow, and the browser recorded no warnings or errors. The active LAN-origin save was not opened or changed.

## Banking, devolution, caucuses and conditional forecasts

Completed 21 September 2026.

- Strict TypeScript check and production build passed. **86 tests passed** across five files, including 21 new institutional/forecast tests. The pre-existing 65 tests still pass with the expanded catalogue.
- Five additional ten-year bank histories include high-rate, unemployment and confidence stress, with monthly balance-sheet and full national-state validation. The broader suite also retains twelve ten-year macro histories and a twenty-year programme-delivery run, now including all 72 templates.
- Verified credit creation/repayment logs, capital constraints, collateralised liquidity liabilities, creditor conversion, public resolution costs and mortgage-payment arithmetic. Tested scaled banking-policy effects on credit/losses.
- Verified opening block grants do not double-count spending, draft consequentials match the public ledger helper, autonomous devolved allocation changes, territorial justice differences, consent gating, override relationship costs and duplicate-consent refusal.
- Tested unique catalogue IDs, old undesigned law costs, immutable designed proposals, scale amendments, accelerated delays and sunset funding. Confirmed 650-seat reallocation, counted divisions, whip grievances, kept/broken commitments, policy-specific faction concerns and feedback to political support/backing.
- Forecast tests establish source immutability, separate/reproducible random sequences, ordered sample bands, differing energy/credit outcomes and invalid-budget rejection. The UI distinguishes conditional sample percentiles from real-world probabilities.
- Exact raw pre-institution recovery bytes are preserved; a failed recovery write prevents replacing the primary save. Corrupt bank books and malformed factions/consents are rejected. Original fixed legacy fixture remains untouched.
- Browser checks used the separate 127.0.0.1 preview origin, leaving the user's LAN-origin life untouched. Opened Banking, Devolution, Factions and Forecasts, checked role/choice locks, searched the bill catalogue and changed scale/delivery/territory. Clinical Workforce Training at 150%, accelerated, with devolved agreement correctly displayed £15.0bn/year and 16+ months.
- Ran baseline, credit-stress and energy scenarios through the browser; inspected the forecast chart/measure selector and tables. Phone viewport 390 × 844 and desktop 1440 × 1000 showed no document-width overflow; tables scroll within their own containers. Temporary viewport override was reset.
- Advanced the older test career from age 18 + two months to + three months, reloaded and confirmed £4,997 and the institutional state persisted. Opened the pre-institutions recovery confirmation and cancelled, preserving the current life. Resolved the next ordinary political dilemma successfully.
- No captured browser warnings/errors. Production preview serves the updated build at the existing port 4173.

Limitations: no physical handset or full browser playthrough to government was tested. Parliamentary/consent transitions were exercised at engine level; browser testing covered the organiser's analysis, restricted controls, monthly save and recovery UI. Real UK financial/constitutional accuracy is bounded by the explicit aggregate assumptions in INSTITUTIONS-MODEL.md. These tests establish implementation consistency, not empirical calibration or future prediction.

## National economics and parliamentary proposals

Completed 21 September 2026.

- Strict TypeScript check and production build passed. **65 tests passed**: 49 existing life/town/career tests plus 16 national-economy tests.
- Verified marginal Income Tax bands and allowance taper, NI thresholds, differing household incidence, static revenue costings, invalid Budget rejection and draft/live policy separation.
- Ran 12 distinct ten-year national histories with fiscal/debt/creditor consistency and complete state validation every month. Differing seeds and policies produce different histories; restoring the same state produces the same next month.
- Tested automatic welfare response, gradual debt-interest repricing, independent rate bounds, infrastructure delays, six-month capital delivery, and 20 years with all 18 national programmes.
- Verified role restrictions, immutable submitted budgets, shared activities, one stage per month, counted parliamentary divisions, Budget passage, bill defeat, withdrawal, funding-consent requirements and half-scale compromise.
- Tested prospective attachment to an old career, exact raw recovery copy, malformed national-state rejection and preservation of the primary save when recovery storage fails. Original fixed legacy fixture remains unchanged.
- Browser: opened the existing test-origin career at age 18 plus one month; viewed the national briefing; edited Basic Income Tax from 20 to 22 in a working draft; confirmed lower take-home figures in the household comparison while current policy remained 20. Submission was correctly unavailable to an organiser.
- Advanced the old career one month and reloaded. Age 18 plus two months, £4,333 balance, the next political dilemma and national state persisted. Viewed the recovery confirmation and cancelled without replacing the active life.
- Inspected the Budget at a 390 × 844 viewport, including numeric inputs, static costings and the fixed month/decision dock. Inspected the parliamentary proposal catalogue and role restrictions. National table overflow is contained within its scroll area.
- Final production reload retained the expanded life. The public ledger displayed matching opening debt, borrowing, closing debt and creditor claims. No captured browser warnings/errors; the LAN endpoint returned HTTP 200 from the host.

The checks establish implementation consistency, not empirical UK calibration. Current headline rules/indicators have official source links; national starting totals and all behavioural coefficients are stated assumptions. No physical phone or complete browser playthrough to Prime Minister was tested in this milestone. Full banking, devolution, actual MPs/parties, benefit entitlements and detailed national accounts remain incomplete. See NATIONAL-MODEL.md.

## Integrated UK political career

Completed 21 September 2026, after the historical milestones below.

- Strict TypeScript check and Vite production build passed using the runner configuration loader.
- 49 tests passed: 15 original life tests, 14 town/legacy tests and 20 integrated career tests.
- Career coverage: entry requirements, shared activity/choice gating, immutable month transitions, twelve-month birthdays without duplicate cash, three-year university progression, separate personal/campaign/public funds, family and mentor consequences, continuous constituency state past 24 months, election wins/losses, preserved parliamentary nomination during council defence, role eligibility, staged laws, balanced profit-sharing/levy payments, remembered promises and death.
- A deterministic player strategy reaches Prime Minister through ordinary available actions over 48 months. This verifies playability, not realistic career timing or balanced difficulty.
- Six seeded political lives run for six years with save/account validation each month. The original suite also covers 100 annual lifetimes and 40 legacy town experiments.
- Save tests load the fixed original life fixture unchanged, preserve its exact pre-career recovery bytes, round-trip nested political state, reject malformed careers/clocks/accounts and keep the old primary save when recovery storage fails.
- Production browser flow: created an adult UK life on an isolated local test origin, took an outside job, entered a party with a philosophical influence, resolved a dilemma, organised and advanced a month. Confirmed age 18 plus one month, outside-job income and living costs, the next political choice and shared activity gating. Reload retained the career and financial state.
- Chose family time and verified resulting bonds in People alongside the added mentor/rival. Inspected constituency household consequences, locked programme motions and parliamentary eligibility requirements.
- Visually inspected the 390 × 844 phone layout and desktop career layout. Exercised the phone decision shortcut; no horizontal clipping observed. Browser captured no warnings or errors in this smoke check.
- Reloaded the original development-origin Alex Morgan save: still age 1, health 89, happiness 78, smarts 61, looks 40, original event/journal. No test character replaced it.
- Reloaded the LAN page to the unified app. The former #town URL opens the current life/Career entry, without a standalone town mode. Host request to `http://192.168.0.106:4173/` returned HTTP 200.

Limitations: no physical phone was used; real-device connectivity still depends on Wi-Fi/firewall and the running host. Complete political careers and legislation were exercised in engine tests, not by clicking every browser path. OS download/file-picker restore flows were not automated; payload validation and recovery storage were tested. The model is fictional and uncalibrated: accounting consistency does not establish economic realism. The UI/documents distinguish planned NEP/revolution/live-news systems from implemented play.

Completed 21 September 2026.

- Production command `pnpm run build`: passed (strict TypeScript plus Vite).
- Vitest: 15 tests passed, including 100 complete deterministic lifetimes, immutable transitions, stat bounds, action limits, choice gating, school and university progression, career requirements and promotions, retirement, death, relationships, save round trips, invalid saves and storage failure handling.
- The full-lifetime test identified a cash-blocked late-life event. Its second choice is now free, and the regression test checks that every event offers a no-cash choice.
- Browser smoke check: created a character, aged up, confirmed actions and age-up are blocked during an unresolved event, made a choice, and reloaded to confirm the resulting stats and journal persisted.
- Visually inspected the desktop dashboard and the People view at a 390 × 844 mobile viewport. No horizontal clipping observed.
- Browser console: no captured warnings or errors during the smoke check.

Full lifetime coverage runs at the engine level. The browser smoke check does not click through every possible event and career combination. Future systems require their own tests.

## Mereford milestone 1

Completed 21 September 2026 after the original MVP.

- Strict TypeScript check and production build passed.
- 29 tests passed across both engines: all 15 original tests plus 14 town and compatibility tests.
- Town coverage includes immutable seeded transitions, all four policy strategies, 40 mixed-policy 24-month experiments, counterparty balance reconciliation, affordability, three-month investment delay, five-project cap, energy pass-through, differing policy outcomes, analytical-lens neutrality, corrupted saves, unavailable storage, town/life save isolation and deterministic continuation after restoration.
- A fixed pre-politics life-save fixture loads and continues after a complete town experiment without changes to its stored bytes.
- Browser test on the production phone server: started a town, commissioned insulation, checked the month-4 promise and resulting fund balance, reloaded and verified month 1 persisted.
- Inspected the 390 × 844 phone layout and exercised its policy shortcut. Completed all 24 months through the browser controls, verified the ending and disabled advancement, and verified Accounts reported that balances reconciled.
- Browser console reported no captured errors or warnings during that playthrough.
- Reopened the original development origin and verified the prior Alex Morgan life still loaded at age 1 with its previous stats and event history.
- LAN endpoint `http://192.168.0.106:4173/` responded with HTTP 200 from the host. This is not a physical-phone connection test and still depends on the same Wi-Fi and host firewall.

Backup file export/restore is covered at the validation/storage layer; the operating-system download picker and browser file-selection flow were not automated. This prototype uses fictional economy parameters and has not been calibrated against real UK data.

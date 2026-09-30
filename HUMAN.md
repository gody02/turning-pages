# Human domain

## Demographic calibration boundary

`human/calibration/` compiles synthetic or future normalized demographic evidence into `PopulationCohortInput[]`. It owns source classification, exact reconciliation, birth-year allocation, package integrity and reporting. It does not own Persons, generation content, runtime population state, Geography or UK economic formulas. Evidence packages and reports remain content/tooling; `PopulationState` persists only cohorts, membership accounting and the stable package ID used as coverage source. See `DEMOGRAPHIC-CALIBRATION.md`.

## Responsibility

**Person** is the durable identity and small intrinsic foundation of one instantiated human. **PeopleState** is the persisted ordered collection of Persons plus the `playerId` that selects the controlled Person. The player and future NPCs use the same Person type. Statistical population cohorts remain world/domain models outside PeopleState.

Person v1 stores only durable `person:n` identity, name, exact date of birth, gender label, living/deceased status, optional exact death date, descriptive trait IDs, and bounded temperament/aptitude maps. Dates reuse the Clock's supported proleptic-Gregorian years 1–9999; Person defines no independent modern-year floor. The gender label preserves the existing player-supplied compatibility value and does not imply biological sex. Person stores no age: age is derived from the canonical Clock and Person date of birth.

Person display names share one country-neutral technical safety bound of 256 Unicode code points. This is neither a linguistic rule nor a grapheme-cluster limit: a code-point count can differ from what a reader perceives as the number of characters. Explicit construction, generated name components, final generated names, legacy player projection and UI input all use the same validator. Over-limit names fail explicitly; no path truncates or silently removes name content.

## Ownership boundaries

Person does not own employment, salary, education, qualifications, money, relationships, detailed health, immigration, crime, fame, politics, household membership, needs, emotions, beliefs, UI state or player control. Current gameplay systems retain those responsibilities.

Person is authoritative for Person-v1 identity fields. Existing root fields remain compatibility projections during migration and must agree with the player Person in canonical root-v3 state. Synchronization occurs through `human/playerPerson.ts`; canonical disagreement is rejected rather than repaired silently.

## Identity and lifecycle

PeopleState allocates monotonic world-scoped IDs (`person:1`, `person:2`, …). IDs remain permanent after death and are never reused. They are valid opaque History actor/subject IDs. Explicit Person construction consumes no RNG or host time.

New deaths record the authoritative exact simulation date. Legacy deceased characters whose exact death date cannot be reconstructed may retain an absent `diedAt`; this is the only compatibility exception. Living Persons cannot have `diedAt`, and known death dates cannot precede birth.

## Explicit and generated construction

`createPerson` remains explicit construction: it generates nothing and consumes no RNG. `generatePersonInput` derives only Person-v1 intrinsic data from an already allocated identity, a validated generation context and an injected versioned profile. `generateAndAllocatePerson` performs identity-first allocation atomically: it inspects `nextSequence`, derives against that `person:n`, validates and constructs the complete Person, and increments the sequence only in the successful returned state.

Generation uses pure keyed derivation from the world root seed, stable Person identity, immutable profile ID/version and attribute-specific keys. It never advances mutable RNG streams. Profile IDs are behavioural contracts; changed content or sampling semantics require a new profile ID. Existing Persons are never regenerated when profile content changes.

The Human catalogue contains four temperament keys (`human.sociability`, `human.conscientiousness`, `human.risk-tolerance`, `human.emotional-reactivity`) and four aptitude keys (`human.verbal`, `human.quantitative`, `human.spatial`, `human.interpersonal`). Profiles choose which subset to populate and own their distributions. Existing and explicitly created Persons may retain empty or partial maps. These dimensions are game tendencies, not medical or psychological diagnoses.

## Generation boundaries

A generation context may provide country and region as content-selection inputs, but these do not become residence, citizenship or visa state. Naming data is injected, selected by stable entry IDs and separate keyed given/family draws, and may naturally produce duplicate display names; durable identity remains `person:n`. Exact birth dates are preserved. Inclusive age ranges produce an exact Gregorian birth date whose age at the supplied reference date is within both bounds. A family-name override leaves the given-name derivation independent.

Generation creates no job, education, wealth, relationship, backstory, History fact, Domain Event, causal link or scheduled work. There is no production NPC-generation caller. Player control and future active/dormant attention remain outside Person.

## Generation content and readiness

`human/content/` is the country-neutral content/tooling boundary between demographic cohorts and the frozen Person generator. A version-1 package contains immutable source descriptors, inclusive non-overlapping birth-year bands, either evidence-backed or reviewed-authored family-name content, one fixed label policy, and the approved empty intrinsic policy. Historical published-support sets use equal selection weights and make no frequency claim; registration-count-weighted entries retain their positive source-count contributions. The resolver compiles exactly one matching band into the existing `PersonGenerationProfile`; it does not change generator sampling semantics.

Package IDs, profile IDs and fingerprints are behavioural contracts. Semantically unordered source and entry collections use code-point canonical ordering, while birth-year ordering remains meaningful. A manifest binds each registered package ID to its fingerprint. Changed evidence, weights, mappings, policy or compiler semantics require a new immutable identity, and existing Persons are never regenerated.

Demographic coverage asks whether represented humans are exhaustively counted. Human generation readiness separately asks whether every supplied extractable cohort resolves registered, approved deterministic identity-facing content. Readiness fails with stable reasons for unresolved profiles, uncovered years, blocking gaps, unapproved or empty family content, invalid profiles, or any possible `given + space + family` composition beyond the shared 256-code-point technical limit. It never truncates or filters valid content to obtain readiness.

The content-backed cohort wrapper resolves and validates content before calling the frozen Population instantiation transaction. Population remains responsible for Person allocation, cohort decrement, memberships, conservation and idempotent request receipts. Resolution failure changes no PeopleState, PopulationState, sequence, cohort, receipt, Clock or RNG state. Registries and packages are supplied content and are not persisted in root saves. Structured international naming models remain future work; the current composition is only the frozen generator's present strategy.

The country-specific UK package `human-content.uk.mid-2024-v1` resolves profile `human.uk.pending-mid-2024-v1` for all 119 `uk.population.mid-2024.v2` cohorts. Official given-name registration evidence remains separate from a reviewed, equal-weight authored family-name prior. It fixes `genderLabel` to `Unspecified` and generates no traits, temperament or aptitudes. This makes the demographic partition generation-ready when the registry is supplied, without adding a production caller or changing Person, PopulationState or saves. See `UK-HUMAN-GENERATION-CONTENT.md`.

## UK country-start composition

`createUkMid2024Game` is the first production country-content composer, but it is not yet a UI/gameplay route. It constructs player `person:1` with the frozen UK profile, exact scenario date and exact cohort-compatible birth date, reserves that human in calibration, and initializes the remaining complete population. The bootstrap-only initial membership path shares the ordinary extraction cohort parser, receipt constructor, validation and idempotent retry semantics. The only special case is ordering: PeopleState needs its controlled Person before the complete PopulationState can be initialized.

Optional player name and `genderLabel` values are identity-facing overrides applied after generated content. `genderLabel` is copied to the legacy compatibility projection but is not biological or demographic state, does not filter UK names, and has no active gameplay consumer. See `UK-COUNTRY-START.md`.

## Population and conservation

Root-v3 `PopulationState` owns represented-population accounting outside Person and PeopleState. `PopulationMembership` records each instantiated Person exactly once, persists after death, and carries only country/opaque-area and origin provenance. Person remains authoritative for whether the human is living. A dormant and active Person therefore count identically; durable identities are never collapsed back into anonymous population.

A cohort is an exact positive count of living, uninstantiated humans sharing the minimal canonical cell `{ countryId, areaId, birthYear, generationProfileId }`. Within a country explicitly marked `complete`, cohorts plus living memberships exhaustively represent its living population and every anonymous human belongs to exactly one cohort. `partial` means only the recorded subset is known. Migration marks current countries partial and creates no demographic cohorts because existing UK fiscal and local aggregates are not demographic truth.

Complete coverage can be established only through the deliberate partition initializer, which validates the proposed cohorts together with PeopleState and existing memberships. It rejects unclassified living membership and requires membership areas when an area partition is asserted; canonical cross-state validation enforces the same area rule after save/load.

Population-backed instantiation is a higher-level Human/Population transaction. It allocates Person identities through the frozen generator, removes the same count from one explicit cohort, and adds matching memberships only after complete cross-state validation. Stable request receipts on memberships make identical retries idempotent. Low-level `createPerson` and `generateAndAllocatePerson` remain valid PeopleState operations, but adding a Person alone is not a valid canonical root-v3 Game mutation.

## Persistence

Root v3 requires valid PeopleState and PopulationState with one membership per Person. A valid root-v1 save migrates after Clock normalization to exactly one player `person:1`, with `nextSequence: 2`; root v1 and v2 then receive legacy membership accounting and partial country coverage. Migration copies only known state and invents no cohorts, demographic counts, psychology, NPCs, relatives, citizenship, birthplace, area or death date. Raw pre-Person and pre-Population bytes are protected independently at `turning-pages:before-person` and `turning-pages:before-population`.

Generated Persons still use PeopleState v1. PopulationState v1 adds no production generation caller or demographic content. Canonical save/load preserves both identities and memberships and continues allocation from the persisted `nextSequence`.

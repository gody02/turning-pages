# Life-simulation architecture

Turning Pages is a persistent life simulation. UK politics is one optional life path that uses the same character, clock, career, finances, relationships and memories as every future path.

## Persistence boundary

The canonical in-memory Game and its root/component versions remain independent of persistence representation and storage. `engine/save.ts` owns the pure canonical JSON codec and migration sequence. `persistence/` owns the strict version-1 save envelope, exact owned UTF-8 `ArrayBuffer` integrity, IndexedDB repository, revisioned atomic transaction, recovery inventory, one-time localStorage migration and bounded async SaveCoordinator. React depends on this persistence boundary; Person, Population, Geography, Clock, RNG and UK systems do not import it.

IndexedDB is the sole current-save authority. localStorage supplies legacy migration bytes plus the non-Game consumed-authority hash marker, and is never updated as a current save. One complete Game remains one atomic snapshot. Compression, domain chunks, Population-specific encodings, workers and event sourcing are not part of vNext.

## Dependency rule

```text
React UI
  -> simulation coordinator
       -> country-neutral life cycle + reusable systems
       -> human domain (PeopleState and shared Person identity)
       -> UK world (for UK characters, independent of careers)
            -> UK national economy, public finances, banks, services and institutions
       -> optional specialist career modules
            -> UK politics -> UK world and Mereford constituency
```

Dependencies point down this diagram. Frozen `core/` primitives do not import the human domain. The human domain does not import React, UK or politics code. The coordinator selects modules by country and active state. A module can contribute monthly finance, action restrictions, events and consequences through `SimulationModule`; it cannot own birthdays, age, ordinary career progression or personal cash settlement.

`engine/game.ts`, `engine/politics.ts`, `engine/national.ts`, `engine/town.ts` and related files are temporary compatibility facades. They preserve existing imports and save behaviour while forwarding to the new owners.

## Audit and ownership

| Mechanic | Owner after refactor | Reason |
| --- | --- | --- |
| Simulation date, date of birth, derived age, death and annual/monthly time | `engine/core/clock.ts`, `core/life.ts` | Every country and life path shares one persisted calendar. |
| Future work, recurrence and deterministic due ordering | `engine/core/scheduler.ts` | Country-neutral serialisable infrastructure; owners interpret occurrences. |
| Transient factual notifications and deterministic reactions | `engine/core/domainEvents.ts` | Country-neutral transaction infrastructure; owning modules may contribute explicit handlers. |
| Explicit, declared semantic provenance | `engine/core/causality.ts` | Country-neutral transaction trace; domains state meaningful relationships without inference or persistence. |
| Selected durable machine-readable past facts | `engine/core/history.ts` | Country-neutral append-only ledger with stable identities across save/load. |
| Instantiated human identity and intrinsic Person-v1 state | `engine/human/person.ts`, `human/playerPerson.ts` | One shared Person type serves the controlled player and future instantiated NPCs. |
| Character stats, traits, skills, fame, reputation | `engine/systems/character.ts` | Careers may affect these; none owns the character. |
| Jobs, pay grades, education, qualifications, unemployment | `engine/systems/careers.ts` | Shared by politics, law and ordinary lives. |
| Personal income, expenses, cash and account transfers | `engine/systems/finance.ts` | One settlement prevents duplicate salary or costs. |
| Family, friends and professional connections | `engine/systems/relationships.ts` | Relationships persist between careers. |
| Events, choices and eligibility | `engine/systems/events.ts` | Content modules supply data and predicates. |
| Legacy semantic/gameplay memories (`LifeFact`) | `engine/systems/history.ts` | Existing facts can gate later events and careers; they are distinct from the durable History ledger. |
| Countries and location lookup | `engine/systems/geography.ts` | Country modules consume location rather than defining it. |
| Durable Place identity, versioned containment and population area resolution | `engine/geography/` | Country-neutral immutable content; every hierarchy operation is partition-qualified and runtime indexes are derived. |
| Bank accounting and conditional projections | `engine/systems/banking.ts`, `systems/projections.ts` | Reusable mathematical mechanisms with injected country policy. |
| UK world state and its independent progression | `engine/ukWorld.ts` | Exists for every UK life; uses the existing national transition. |
| National economy, public finances, banks, public services and devolution | `engine/ukWorld.ts` owns persisted state; existing `engine/politics/uk/national.ts` and `institutions.ts` retain calculations | Politics can influence the world; it does not create or clock it. The current calculation-file location is transitional. |
| Player political career, parties, factions, seats, elections and offices | `engine/politics/uk/` | Optional UK specialist career. `PoliticalCareer.months` is career tenure. |
| Commons, Lords, bills, political Budget proposals and government formation | `engine/politics/uk/` | UK constitutional and career behaviour; approved Budget changes affect UK world state. |
| Mereford households, local employers and constituency ledger | `PoliticalCareer.economy` via `constituency.ts` | Local constituency simulation only; it does not represent the UK as a whole. |

The country-neutral `LifeState.clock.date` is the canonical exact proleptic-Gregorian `{ year, month, day }` simulation date. The shared supported range is `0001-01-01` through `9999-12-31`, with no year zero; arithmetic outside it fails. `LifeState.dateOfBirth` uses the same precision and is the authority for age; the persisted `age` number is a validated compatibility projection refreshed by clock transitions. Calendar arithmetic is pure and timezone-free, including leap years and month-end clamping.

## Human domain

Root-v3 `Game.people` is the version-1 persisted collection of instantiated people: `{ version, nextSequence, playerId, people }`. A **Person** is durable human identity plus a deliberately small intrinsic foundation: `person:n` identity, name, exact date of birth, gender label, living/deceased status, optional exact death date, descriptive traits, temperament and aptitude maps. A **Player** is the Person selected by `playerId`; an **NPC** is another instantiated record using the same Person type.

Person is authoritative for identity, name, date of birth, gender label, life status and Person-v1 traits. Existing top-level fields remain validated compatibility projections while gameplay is migrated through a central bridge. Age is derived from Person date of birth and the canonical Clock; Person stores no age. Employment, education, qualifications, finances, relationships, health scores, immigration, crime, fame, politics and control/UI state remain externally owned. Legacy deceased characters without a losslessly known exact death date may retain an absent `diedAt`; all newly recorded deaths use the authoritative exact Clock date.

The shared Person display-name validator applies a 256-Unicode-code-point technical safety bound across canonical Person state, legacy player projection, generation content and UI entry. It is not a linguistic or grapheme-cluster model. Explicit and generated Person content is preserved exactly; the legacy player-creation path retains its existing surrounding-whitespace trimming. Over-limit values are rejected rather than truncated.

Explicit Person construction remains non-probabilistic. Deterministic generation is a separate Human-domain service: identity is selected from `PeopleState.nextSequence` first, then intrinsic values are derived with pure keyed RNG from root seed, `person:n`, stable profile identity and attribute key. Versioned injected profiles own naming content and attribute distributions; the Human catalogue owns only the approved temperament/aptitude identifiers and validation. Generation is atomic, does not consume mutable RNG streams, and creates no external domain state, history, events or scheduling. No production system invokes it yet.

Human generation content is a country-neutral tooling layer above that frozen generator. Immutable content packages map a country, birth-year band and registered profile identity to the existing `PersonGenerationProfile` shape. Package fingerprints and manifests prevent an existing content ID from silently changing semantics. Evidence-backed naming content retains source lineage; reviewed authored family-name priors remain explicitly classified as gameplay abstractions. Readiness is assessed independently from demographic coverage and requires every supplied production cohort to resolve approved content, pass profile validation and satisfy the shared full-name bound. Content-backed extraction delegates conservation and request receipts to the existing Population transaction. Packages and registries are not save state. Country-specific production content remains above the generic layer and no gameplay caller is installed.

Player control and future NPC attention/fidelity remain outside Person. `Game.population` owns version-1 statistical cohorts and one explicit membership for every instantiated Person. Cohorts contain only living uninstantiated humans and, for countries marked complete, form one mutually exclusive partition. Instantiation atomically moves an exact count from one cohort into durable Person identities without changing represented population. Migration creates partial coverage and no demographic cohorts. Person identities persist after death and are never returned to anonymous counts; active/dormant processing remains deferred.

The Human demographic-calibration layer sits outside `PopulationState`. It consumes normalized, classified evidence packages and emits canonical cohort inputs plus one deterministic audit report. Exact rational reconciliation and Gregorian age-band conversion never mutate the Clock, RNG, People or Population. Package IDs and fingerprints are immutable content contracts; only the package ID is retained in `PopulationCoverage.source`. See `MODELLING-STANDARD.md` and `DEMOGRAPHIC-CALIBRATION.md`.

Country evidence remains above that generic layer. The ONS UK adapter lives with pinned UK content, verifies source bytes with SHA-256, and depends on the generic compiler; neither PopulationState nor calibration core imports it. Immutable candidate `uk.population.mid-2024.v1` retains its original package semantics and fingerprint. Successor `uk.population.mid-2024.v2` closes the open 105+ input with immutable model `uk-old-age-tail.geometric-adjacent-v1`: an assumed within-total geometric shape for ages 105–119 followed by exact whole-90+ largest-remainder reconciliation. This model is initialization content, not a mortality rule or a generic maximum age.

Statistical population completeness and Person-generation readiness are separate. `COMPLETE` describes exhaustive conserved demographic accounting of a population universe. Naming and intrinsic-generation content determines whether anonymous cohorts can be instantiated as plausible Persons; it does not supply demographic magnitude or make an incomplete partition complete. Calibration reports both statuses. Population initialization and cohort-to-Person extraction still require generation readiness, while a package may be demographically complete before production naming/profile content exists.

Geography Foundation v1 defines durable Place identities separately from immutable boundary-era partition packages. A Place identity contains only `placeId` and `countryId`, and a separate fingerprint manifest locks that durable contract; partition nodes own display name, opaque kind, parent and explicit allocation-cell status. The same Place may continue through renamed, reclassified or revised partitions, while a split or merger creates successor IDs. `partitionId + placeId` identifies an exact area, and no global containment relationship exists. Geography validates Population's existing opaque area references by coverage and derives living rollups without changing PopulationState or persisting totals. Canonical content remains plain frozen JSON; closure-private runtime indexes are rebuildable. See `GEOGRAPHY.md`.

UK Geography Content v1 is an immutable country-content package above that foundation. `geography.uk.primary-local-admin-2024-06-30-v1` contains the UK root, four constituent countries and 361 explicit local administrative allocation leaves. It uses pinned ONS May 2024 identifiers and names, verified against the detailed mid-2024 population workbook, while retaining the June 30 population reference as its effective date. The package contains no geometry or population counts and current production Population remains unpartitioned. See `UK-GEOGRAPHY-CONTENT.md`.

UK geographic population candidate `uk.population.mid-2024.v3` exactly allocates frozen v2 national birth-year totals across those 361 cells while preserving every published local completed-age and 90+ margin through an exact latent transportation model. It uses existing PopulationState v1 fields only. Its persistence gate failed because the 9.60 MB representative canonical Game exceeds the supported browser-local-storage budget, so it is not registered and production Country Start remains on v2. See `UK-GEOGRAPHIC-POPULATION-ALLOCATION.md`.

UK Human content `human-content.uk.mid-2024-v1` now resolves the previously reserved `human.uk.pending-mid-2024-v1` profile for every cohort in `uk.population.mid-2024.v2`. Its official ONS/NRS/NISRA registration evidence, authored equal-weight family-name prior, neutral fixed label and empty intrinsic policy are country content, not generic Human rules. Artifact SHA-256 and semantic fingerprint `fnv1a64-v1:595ae6cfea24c49d` lock the contract. See `UK-HUMAN-GENERATION-CONTENT.md`.

The production UK country-start composer is a country-content boundary above these frozen components. It builds the first controlled `person:1` from an exact UK cohort on 30 June 2024, then initializes the complete 69,281,437-person partition around that reserved membership. Its narrow initial-membership helper uses the same cohort-origin parser, birth-year agreement, receipt tuple and cross-state validator as ordinary extraction; it does not define another extraction protocol. Optional player name and `genderLabel` overrides are applied only after deterministic identity content has been generated. They do not select cohorts, names, demographic cells or gameplay mechanics. The New Game UI now submits only the frozen mode, an explicit platform-generated root seed, and optional identity overrides to this composer; it does not reproduce scenario rules. See `UK-COUNTRY-START.md`.

Clock precision, turn cadence and system update frequency are separate. **Clock precision** means the world knows an exact date. **Turn cadence** is `clock.cadence`: the current player action advances one month or one year, and it selects the existing gameplay settlement path. **System update frequency** is chosen by each system or later scheduling infrastructure. Annual life advances move the date twelve calendar months; monthly life moves it one calendar month. Neither choice creates daily UK, finance or event processing.

The UK world is created for a UK character whether or not they enter politics. Its `NationalState.month` remains a domain elapsed counter, not another date. The coordinator advances it from the successful canonical clock delta: twelve established UK transitions for an annual life step, or one for a monthly step. Active UK politics consumes the same monthly core transition at its established hook position, preserving economic ordering and preventing a second coordinator advance. `PoliticalCareer.months` remains tenure, and Mereford's month remains local constituency elapsed time. Neither can set or reset the canonical date. Existing national and institutional calculation files remain in their current locations as transitional debt.

## Module contract

A life-path module implements only the hooks it needs: prepare old state, block actions, alter an action, quote monthly finances, update its own monthly state, react to birthdays, choose a pending event, or record death. Multiple modules can coexist. The coordinator rejects two modules that both try to replace a character's ordinary income, making double payment an explicit error.

The implemented registry contains only `UKPoliticalSystem`. It is active only while the player's political career is active. A future `USPoliticalSystem` or `NigerianPoliticalSystem` is not part of this implementation.

## Deterministic randomness

`LifeState.randomness` is the country-neutral canonical randomness record: `{ version: 1, rootSeed, streams }`. The **root seed** identifies a world's random history. A **named stream** is a persisted, deterministic mutable sequence isolated to its subsystem or context. A **keyed derivation** is a pure draw from the root seed and a stable context key; it never advances a stream.

Core RNG utilities provide deterministic floats, inclusive integers, probabilities, ordered collection and weighted selection, immutable shuffle, and keyed derivation. New systems must use named streams or keyed derivation, never host randomness or object-property ordering. Existing life/politics, national and Mereford LCG sequences remain **compatibility streams**. They are transitional adapters that preserve pre-refactor draw order; they are not the preferred pattern for new systems. Legacy `seed` fields remain validated projections of those streams.

## Scheduler

`LifeState.scheduler` is the country-neutral, serialisable queue of future work: `{ version: 1, nextSequence, items }`. A scheduled item has a deterministic ID and sequence, exact due date, owner, kind, optional JSON payload/source, and optional anchored day/month/year recurrence. The scheduler only records and orders work; it never contains executable callbacks, advances the clock, consumes RNG, or interprets an item.

**Clock** means what date the world is on. **Scheduler** means what serialisable work is due by an exact date. The **owning domain system** will later interpret the returned occurrence and apply its effects. `takeDue` is a pure transactional extraction operation: it returns occurrences ordered by due date, sequence and ID, removes one-offs, and safely advances recurrence from the original anchor date. Owner-filtered extraction leaves unavailable owners persisted. Current UK and ordinary-life counters are deliberately not scheduler items, and current transition ordering is unchanged.

## Domain Events

A **Domain Event** is a transient, data-only factual notification during one candidate-state simulation transition. It has a deterministic transaction-local `event:n` ID, a sequence, exact occurrence date, stable source, optional actor/subject IDs and JSON payload, a correlation ID, and optional causation ID. It is neither persisted nor placed on `LifeState`; the existing candidate-state transition is discarded if dispatch or final validation fails.

When a root event has no supplied correlation ID, its own ID becomes the correlation root. Follow-up events retain that root and use their immediate parent ID as `causationId`. Handlers are explicit synchronous module contributions, ordered by immutable code-point lexical handler ID; handler IDs are therefore behaviourally stable and must not be casually renamed, and handlers must return without a Promise or other value. Events use FIFO breadth-first dispatch: every matching handler completes before its emitted follow-ups are processed. Core infrastructure contains no callbacks in event data, no RNG, no clock advancement, no scheduler integration and no specialist imports.

Terminology remains distinct: a **Content Event** is a player-facing situation or choice; a **Scheduled Occurrence** is future work becoming due; a **History Fact** is a durable meaningful record; a **Causal Link** later explains why an outcome followed. The initial `person.job_changed` event is proof-only and creates no production reaction or history entry.

## Causality / provenance

A **Causal Link** is an explicit semantic relationship declared by the domain that knows why an outcome occurred. The core accepts only `caused` and `contributed`; it never infers a link from ordering, correlation, state differences or proximity in time. A transaction-local `CausalTrace` has the authoritative date and immutable `causal:n` links between structural references to Domain Events, Scheduler items/occurrences, or reserved future History facts. It is never saved or placed on `LifeState`.

`DomainEvent.causationId` remains operational dispatch parentage only. It is not automatically promoted to a Causal Link. A CausalTrace can validate references to an already completed Domain Event trace, but it does not join dispatch or alter event order. Scheduler references use only existing item/occurrence identity and do not alter Scheduler state or reinterpret its `source` field. `history-fact` is reserved until a future History ledger owns durable occurrence-unique IDs; current `LifeFact` records are not History facts.

Global feedback cycles are valid when a domain explicitly declares them. Future traversal must use visited sets and depth limits. Causality deliberately does not provide traversal, persistence, promotion, source/origin fields, automatic mutation tracking, numerical strengths, inference, or UI explanation screens.

## Durable History

`LifeState.history` is the country-neutral durable ledger of selected meaningful facts: `{ version: 1, nextSequence, facts }`. Each append receives a persisted `history:n` identity, exact authoritative date, stable namespaced type and source, optional ordered actor/subject identities, and optional finite plain-JSON payload. Facts are append-only and immutable in version 1. Recording is explicit, cannot backdate, consumes no RNG, and does not move the clock.

History remains selective. Domain Events and Causal Traces are transient and are never promoted automatically. `person.job_changed` has no History producer. The reserved CausalReference `{ kind: 'history-fact', factId }` can now identify a real durable fact, but History v1 stores no causal links. Existing `LifeFact`, journals, national news, political logs, institution minutes and other presentation/domain records remain unchanged and separate.

## Deterministic simulation harness

`engine/diagnostics/simulation.ts` contains country-neutral, non-persisted diagnostic result types. `engine/testing/simulationRunner.ts` is a generic deterministic runner; thin personal, UK-world and political adapters call existing public transitions. The runner does not own game rules, a Clock, RNG, Scheduler, world state, React state or browser storage.

Stable choice IDs identify content independently of presentation order for harness autopilot selection. They are behavioral test contracts. Profile seeds are explicit and deterministic. A checkpointed Game run uses canonical `serializeGame`/`parseGame`; a UK-world component probe is explicitly not a full persisted world session. Domain Scheduler and History fixtures remain test-only. The former month-781 banking defect is repaired at repayment allocation and protected by a 20-seed, 100-year deterministic gate; validators were not weakened.

## Persistence and compatibility

Canonical persistence is defined in `PERSISTENCE.md`. Before schema validation or serialization, the entire candidate must be finite plain JSON: dense arrays, enumerable data properties, supported plain prototypes and finite numbers only. Sparse arrays, accessors, symbols, functions, `undefined` and other lossy structures are rejected. Primary saves and backup exports share one normalize/validate/serialize/parse/revalidate/idempotence path, so reported success means the same build can load the produced bytes.

Root save version 3 has an exact field allowlist and requires `PeopleState` plus `PopulationState`; root versions 1 and 2 are accepted only as migration inputs. Unknown root state is rejected rather than rewritten by an older build. Future root membership or meaning changes require a root-version increment; internal component changes use their component version. The ordered migration invariant is UK World ownership, Clock, RNG, Scheduler, History, People, Population, then final validation.

Only committed canonical state is persisted. Domain Event queues/traces and Causal Traces remain transaction-local. Future Scheduler interpretation must remain inside the same candidate-state transaction as its domain effects, event reactions, validation and commit; consuming an occurrence cannot commit separately.

The storage key remains `turning-pages:v1`. New saves persist `clock: { version: 2, date: { year, month, day }, cadence }` and an exact `dateOfBirth`; they do not persist duplicate `totalMonths` and `monthOfYear` clock values. Version-1 year/month clocks, older elapsed clocks and clockless shapes are accepted only for migration and normalized before saving. Version-1 dates receive `day: 1` without replaying time; all unrelated nested state remains unchanged. The raw pre-day-precision save is copied once to `turning-pages:before-day-precision`; failure to write that recovery copy prevents replacement of the primary save. The earlier `before-simulation-clock` snapshot remains separate and recoverable.

Legacy saves gain their randomness record without replaying time or consuming a draw. Before the first resulting overwrite, the raw save is copied once to `turning-pages:before-deterministic-rng`; snapshot failure keeps the primary save intact.

Legacy saves without a scheduler gain an empty version-1 scheduler without inferred or replayed work. Before the first scheduler migration overwrite, raw bytes are copied once to `turning-pages:before-scheduler`; failure leaves the primary save untouched. Structurally corrupt queues are rejected, while valid items for unavailable owners remain preserved.

Legacy saves without History gain an empty version-1 ledger after Clock normalization. No facts are inferred from legacy memories, prose, logs, elections, laws or counters. The independently validated History component carries version `1`. Before the first History migration overwrite, exact raw bytes are copied once to `turning-pages:before-history`; an existing snapshot is never replaced, and snapshot failure prevents the primary save from being overwritten.

After the preceding migrations normalize the Clock and durable subsystems, a valid root-v1 save gains exactly one player Person as `person:1`, `nextSequence: 2`; root-v1 and root-v2 inputs then gain Population membership and become root v3. Population migration creates no cohorts, assigns only the player’s known game-country context, leaves additional Persons’ country unknown, and marks coverage partial. Canonical Person projections and Person↔membership coverage must agree. Exact raw bytes are independently protected at `turning-pages:before-person` and `turning-pages:before-population`; snapshot failure prevents primary replacement.

A legacy `politics.national` record still moves verbatim to `ukWorld.national` once; its seed, Budget, banks, incidents, history, institutions and month are not reset or replayed. UK saves without an existing national record receive a prospective world at the saved life month, without fabricated history. `before-uk-world-ownership` and earlier political, national, institutional and architecture recovery snapshots remain supported.

Facts store important decisions with their life month, source and tags. They are intentionally separate from the readable journal so a childhood promise can affect a career or relationship decades later without parsing prose.

## Verification boundary

The architecture suite freezes representative pre-refactor outputs for an ordinary 35-year life, four political years, an election, banks and a Budget. Clock tests cover Gregorian validation, leap days, month-end clamping, exact birthday age, annual/monthly date movement, UK single progression, tenure separation, version-1 migration, the unchanged v1 fixture and raw recovery. Other suites cover non-political monthly lives, decades-old facts, module conflict handling, import direction and detailed UK behaviour.

Current transitional debt is explicit: `age` remains persisted as a validated compatibility projection, journals store age rather than calendar date, `NationalState.month`, Mereford month and political tenure remain legacy domain counters, presentation components read optional politics to render UK screens, and old public import paths remain facades. These do not reverse clock or engine ownership and can be migrated incrementally without changing behaviour.

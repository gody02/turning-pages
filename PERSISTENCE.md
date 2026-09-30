# Persistence and save integrity

## Persistence Architecture vNext

The vNext implementation makes IndexedDB database `turning-pages`, schema version `1`, the sole current-save authority. Object store `save-records` contains one canonical `primary`, one rolling `previous`, and write-once `recovery:*` records; `persistence-meta` contains the localStorage migration receipt. The Game root remains version 3 and no domain component schema changed.

`StoredSaveRecordV1` wraps one complete canonical Game snapshot as exact uncompressed UTF-8 JSON bytes in an owned `ArrayBuffer`. Its persistence version, slot identity/role, positive revision, payload kind, encoding `canonical-json-utf8-v1`, diagnostic root version, byte length and SHA-256 are persistence metadata only. A load validates the strict envelope, key/slot/role agreement, `ArrayBuffer.byteLength` and checksum before decoding through the existing parse, migration and validation pipeline. SHA-256 detects accidental corruption; it does not authenticate or prevent editing client-owned saves.

Before persistence vNext froze or shipped, its direct IndexedDB `Blob` payload was rejected because the Windows Playwright WebKit port could not store even one byte of Blob data. Persistence version 1 was therefore amended in place to use exact `ArrayBuffer` bytes. Canonical JSON, UTF-8 encoding, byte length and SHA-256 semantics did not change, and no released Blob-backed record requires compatibility. Temporary Blobs remain permitted only at presentation boundaries such as browser downloads; IndexedDB authority never stores them.

Save preparation completes canonical validation, JSON round-trip, UTF-8 encoding, checksum calculation and recovery preparation before opening a write transaction. One IndexedDB transaction compares the expected revision, inserts missing recovery records, rebuilds the old primary as a correctly labelled `previous` record and writes the candidate primary. Completion is the only success signal. Conflicts, quota failures and aborts leave the previous authority unchanged. `SaveCoordinator` permits one active and one newest pending immutable Game, coalesces intermediate requests, retains failed state as dirty and never uses last-write-wins across tabs.

Legacy key `turning-pages:v1` is migration input only. When no IndexedDB primary exists, its exact bytes and all existing recovery bytes are retained in IndexedDB, the migrated root-v3 primary is verified after reopen, and only then localStorage marker `turning-pages:indexeddb-authority-v1` records the exact consumed legacy SHA-256. A matching marker prevents an evicted database from silently resurrecting that stale save; matching, changed or malformed marked input is available only through explicit recovery. Legacy bytes remain untouched, and `turning-pages:town:v1` remains a separate archive.

LifeApp now resolves persistence asynchronously before exposing New Game, autosaves through the coordinator, awaits new-life/import/restore replacement commits, warns on close while dirty, retains portable canonical-JSON export, and applies a 128 MiB technical import guard. `StorageManager` estimate and persistence APIs are advisory; denial is not reported as save success or failure. Compression, Population-specific encoding, chunks, event sourcing, workers, OPFS, cloud saves and multiple slots remain deferred.

The exact v3 candidate passes the fake-IndexedDB, Chromium and Windows Playwright WebKit ArrayBuffer gates at 9,595,304 bytes with correct primary/previous rotation and deterministic `person:2` continuation. The formal browser gate remains incomplete because the Playwright Firefox executable cannot launch on this host: Windows SideBySide reports missing activation assembly `mozglue` even after a forced clean browser download. Persistence vNext is implemented but not safe to freeze until Firefox actually executes the same profile. `uk.population.mid-2024.v3` remains unregistered; v2 and Country Start remain unchanged.

Demographic calibration packages, normalized source evidence and calibration reports are initialization content/tooling, not canonical game state. A calibrated `PopulationState` persists its exact cohorts and the immutable package ID in `PopulationCoverage.source`; it does not embed the report or package. The calibration foundation adds no root version, migration or recovery snapshot.

`createUkMid2024Game` produces an ordinary canonical root-v3 Game. Its content packages and registries remain bundled runtime inputs; the resulting Person, cohort counts, membership receipt, coverage source and UK world serialize through the existing pipeline. Country-start composition adds no root/component version, storage key, migration or recovery descriptor. Reload does not regenerate the player.

The New Game UI places the returned canonical Game directly into the existing application state. The established save effect writes it through `saveGame`; there is no UI-specific serializer or storage key. A bootstrap failure does not update application state and therefore cannot trigger a partial save.

Geography partition packages, Place manifests and runtime indexes are bundled runtime content rather than Game state. PopulationState v1 already persists `areaPartitionId` and `areaId` references. Once a production save can contain a partition ID, the exact immutable partition package must remain available to future builds. Geography Foundation v1 adds no root field, version, migration or recovery snapshot.

The legacy backend stored one canonical character at `turning-pages:v1`; this key is now migration input only. A successful save and a successful backup export still use the same Game codec: normalize through the ordered migrations, require finite plain JSON, validate the complete model, serialize, parse, normalize again, revalidate, and compare the canonical values without relying on object-key insertion order. The authoritative in-memory game is never mutated merely to serialize it.

## Versions and migration order

The **root version** defines membership and meaning of top-level save fields. The current complete root is version 3, which requires `people` and `population`; versions 1 and 2 are accepted only as migration inputs. Root v1 has no canonical PeopleState, while root v2 has PeopleState but no canonical PopulationState. The storage key remains `turning-pages:v1`: key naming and root schema version are independent. A **component version** governs the internal schema of Clock, RNG, Scheduler, History, People, Population, UK World, Politics, National state, institutions, or Mereford.

The Person display-name safety bound is a backward-compatible validation widening from 40 UTF-16 code units to 256 Unicode code points. It changes no persisted shape, root or component version, storage key, migration, or recovery inventory; every previously valid name remains valid.

The Clock's accepted proleptic-Gregorian range is years 1–9999 inclusive. This is an accepted-value expansion only: Clock remains v2, People and Population remain v1, calibration remains schema v1, and root remains v3. It requires no migration or recovery snapshot and does not rewrite existing save bytes.

Migration order is an invariant:

1. UK World ownership;
2. Clock;
3. deterministic RNG;
4. Scheduler;
5. History;
6. People;
7. Population;
8. final validation.

UK World ownership precedes compatibility RNG projection. Clock normalization precedes History date validation and Person construction. A valid root-v1 save first gains exactly one migrated player `person:1`; valid root-v1 and root-v2 saves then receive Population memberships and become root v3. Migration creates no cohorts, marks known country coverage partial, and leaves non-player country provenance unknown. It does not replay time, consume RNG, fabricate demographic counts, facts or unknown dates, or reset national, political, or Mereford state. Unknown root fields and unsupported future root versions are rejected.

## Recovery and failure

`save.ts` owns the single recovery descriptor inventory used for snapshot creation and UI restoration. Snapshot bytes are copied exactly from the old primary, existing snapshots are never overwritten, and failure to create a required snapshot prevents replacement of the primary. Recovery remains available from the creation/load-error screen when the primary cannot be parsed or validated.

The root-v1 to root-v2 Person migration uses the independent `turning-pages:before-person` snapshot. It neither replaces nor overwrites the Clock, RNG, Scheduler, History or earlier migration snapshots.

The root-v1/root-v2 to root-v3 Population migration uses the independent `turning-pages:before-population` snapshot. It stores the exact old primary bytes once, appears in the canonical recovery inventory, never overwrites any earlier snapshot, and must succeed before the primary save can be replaced.

Load failures are categorized as invalid JSON, unsupported version, invalid state, migration failure, or unavailable storage. Internal exceptions are not shown directly to players. The synchronous `localStorage.setItem` primary described by the earlier architecture has been superseded by the atomic IndexedDB transaction above; localStorage now supplies migration input and the non-Game authority marker only.

A confirmed backup/recovery restore also canonicalizes before its single primary write. It does not delete or overwrite the selected recovery snapshot, so a failed primary write leaves that snapshot available.

## Transaction boundary and scale

Only committed canonical simulation state may be saved. Domain Event queues/traces, Causal Traces, handler-local state, incomplete candidate transitions, and partially consumed Scheduler work are transient. Future due-work processing must interpret an occurrence, apply its domain effect, drain reactions, finalize declared causality, validate the candidate, and commit before saving or permanently consuming the occurrence.

Audit measurements were approximately 0.86 MB for one measured 79-year ordinary life and 3.5 MB for one measured 50-year political run. The synthetic Population harness stored 1,001 Persons plus membership receipts and one five-million-person cohort in 449,692 bytes. These are observations, not guarantees. Reassess capacity and operational behavior before production NPC generations or much larger histories approach the browser's reported IndexedDB quota. Durable state must never be silently truncated to fit a storage backend.

## Harness checkpoints

The deterministic simulation harness uses the same canonical serializer and parser for selected personal and political runs, then compares uninterrupted and checkpointed continuation exactly. Its metrics report UTF-8 canonical save sizes at checkpoints and observation bands at 1, 2, 4 and 8 MiB; they never alter saves or enforce a storage quota. A direct UK-world component run uses only a hardened JSON round-trip because a standalone persisted Clock/RNG world-session envelope does not yet exist.

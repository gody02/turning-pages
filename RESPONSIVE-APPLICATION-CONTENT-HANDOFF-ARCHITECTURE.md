# Responsive application-content handoff — architecture and approval

Date: 2026-10-02. **Architecture APPROVED; production service NOT IMPLEMENTED; production New Game remains v2.** Decision **B: a bounded, separate application-content Worker**. Country Start v3 remains frozen. This document authorizes a narrow host implementation and its acceptance tests; it does not grant production routing or freeze acceptance.

The blocker is repeated synchronous validation, canonical encoding, fingerprinting and copying of national reference content after the Country Start Worker returns. Rendering and relation indexes contribute little. Prepare the same immutable registries through their unchanged frozen factories in a transient application Worker, deliver owned plain canonical data, and build private read-only application lookup adapters responsively on the main thread. Do not rerun the expensive frozen runtime constructors on that thread. Prove every adapter lookup against the existing frozen runtime before accepting it.

No startup location sidecar is needed: current LifeApp displays **zero Residence, administrative-area or Settlement names**. A complete Game can be held independently of display services, but current gameplay requires synchronous content resolvers for death/Residence cleanup. Keep normal gameplay pending until those resolvers are ready. Preserve the existing content-acceptance → initial save → active Game ordering rather than adding a new partial gameplay state solely to reach a dashboard earlier.

## Evidence and limits

The preceding actual built-UI preflight failed unchanged limits: Chromium **1,462.3 ms**, WebKit **2,816 ms** maximum interaction gaps; WebKit Settlement registry preparation alone **1,174 ms**. Its temporary UI changes were restored exactly. Those failures remain authoritative historical evidence.

This review reproduced that path in a **disposable instrumented build**, without editing production source. Instrumentation wraps functions at build time and reports nested inclusive/exclusive CPU intervals. Timings include instrumentation overhead and local machine variability; they do not replace the original failure or constitute a new production acceptance run. Browser observations cover the built StrictMode app, submission, public Country Start Worker delivery, application acceptance, initial IndexedDB save and dashboard frames.

| Stage | Chromium ms | WebKit ms | Interpretation |
| --- | ---: | ---: | --- |
| Maximum observed interaction gap | 1,630.4 | 2,821 | Reproduces the main-thread failure |
| Country Start background request elapsed | 5,317.3 | 10,233 | Worker/build/network elapsed, not a main-thread CPU interval |
| Application content acceptance elapsed | 1,903.2 | 2,872 | Includes dynamic imports and synchronous preparation |
| Reference dynamic import window | 614.6 | 482 | Fetch, parsing and module evaluation combined |
| UK Settlement production registry factory | 671.9 | 1,253 | Includes validation/canonicalization/copies and internal Geography |
| Settlement runtime construction | 388.6 | 739 | Additional validation/registry reconstruction; overlaps rows below |
| Settlement runtime exclusive lookup/index glue | 4.1 | 7 | Small; moving only Maps would not solve the blocker |
| Two UK Geography factory calls, cumulative | 109.5 | 202 | Outer application plus Settlement adapter dependency |
| Two Geography runtime constructions, cumulative | 44.7 | 92 | Includes repeated validation and canonical copying |
| Five main-thread `isGame` calls, cumulative | 392.4 | 561 | Receiver, acceptance and canonical save checks |
| Maximum individual `isGame` | 95.1 | 123 | Preserved root checks, not national reference compilation |
| `validGameWithContent` | 73.4 | 107 | Almost entirely its root check |
| Residence content/reference lookup | 0.2 | <1 | Actual saved-reference resolution is small |
| Canonical initial `serializeGame` | 343.4 | 456 | Includes normalization/cloning/root checks |
| Initial save elapsed | 422.3 | 650 | Includes asynchronous hash/write and serialization |
| `setGame` scheduling | <0.1 | <1 | Publication itself is small |
| LifeApp renders, cumulative | 8.5 (4 calls) | 3 (3 calls) | First/later renders after submit, not national registry work |
| Dashboard frame observation | 37 | 108 | Scheduling/two-frame observation, not React CPU alone |

Do not add overlapping inclusive rows to infer CPU totals. The lower-level Settlement exclusive buckets are: structural package checks **297.2/406 ms**, FNV computation **324.5/1,019 ms**, canonical stringify **224.1/223 ms**, canonical package mapping/sorting **22.2/43 ms**. Registry cross-reference/identity bookkeeping exclusive time is **29.8/42 ms**. Two registry immutable-copy operations take **46.4/63 ms** including clone, with exclusive freeze/traversal **18.5/31 ms**. Other candidate-array/native clone calls are separately recorded in the raw profile and must not be counted twice. Geography exclusive structural checks take **30.6/49 ms**, FNV **53.3/150 ms**, canonical stringify **24.5/27 ms**. These are diagnostic CPU categories, not alternative whole-start measurements.

A separate **disposable content-only Worker feasibility probe** invokes the exact existing UK registration factories, transfers their plain canonical registries, terminates the Worker and cooperatively scans/freezes the owned records before building small diagnostic Maps. It does **not** implement a service, complete query adapters, receiver validation, Game activation or save/load acceptance.

| Probe observation | Chromium | WebKit |
| --- | ---: | ---: |
| Worker content import | 193.8 ms | 231 ms |
| Geography registry preparation | 56.8 ms | 90 ms |
| Settlement registry preparation | 601 ms | 1,083 ms |
| Worker reference preparation elapsed | 851.6 ms | 1,404 ms |
| Delivery observed across realms | 17.1 ms | 17 ms |
| Owned cooperative freeze, including yield waits | 12 ms | 97 ms |
| Diagnostic Map indexing | 0.8 ms | 1 ms |
| Reference-ready elapsed | 916.3 ms | 1,586 ms |
| Maximum heartbeat gap | **35.9 ms** | **32 ms** |
| Cooperative yields / owned objects | 2 /31,396 | 4 /31,396 |

Both transfer **3,112,554 serialized JSON bytes** with identical SHA-256 **4a270368d14312317c5d509dae6b0534756248a4c8d7b92b7d4b83b015f767c3**: 366 Geography nodes, 2,698 current Settlements, 2,736 relations and the complete identity/manifest inventories. Structured clone delivery preserves data, not freeze flags or function closures. This byte count is an observational JSON size, **not heap/RSS or a new runtime protocol requirement**. The probe's indexes are deliberately incomplete; it proves headroom for off-thread preparation, not lookup equivalence.

An initial WebKit blank-page navigation on port 4190 timed out before content execution; the retained failed attempts are not application failures or passes. The completed probe uses the already working port 4189 with a static built-asset server. No application assertion or timeout changed. Firefox is not newly executed in this architecture task; supported-host Firefox remains mandatory for implementation and actual routing acceptance.

Raw evidence: `research/application-content-handoff/profile.json`, `profile.log`, `worker-feasibility.json` and `worker-feasibility-known-port.log`. Diagnostic builders/probe sources remain in that directory. Prior routing evidence stays in `research/new-game-v3/` and `PRODUCTION-NEW-GAME-COUNTRY-START-V3-ROUTING-REPORT.md`.

## Approved host design

Use one application-owned reference service, outside React rendering. It prepares an **exact immutable package set**, sharing in-flight preparation and successful runtime derivatives. One transient content Worker executes the unchanged registered content factories and their full identity, fingerprint, continuity and cross-Geography validation. It returns canonical plain registry data; it never returns Game, seed, Person, placement, mutable RNG, functions, Maps or closure-private runtime objects.

The main thread checks the private response envelope, exact requested manifest identities and lifetime, then cooperatively checks/owns/freezes the received data and builds private derivative indexes. No partial result is publicly observable. Only a complete `GameContentContext` publishes into the exact-set cache. New application adapters conform to `GeographyRuntime` and `SettlementRuntime`; their construction entry is private to validated Worker delivery, never a general way to accept unvalidated caller registries. All original public constructors/validators remain unchanged and remain the differential oracle.

Expensive source validation is still mandatory, now performed in the Worker using the frozen code. A claimed fingerprint field from arbitrary caller data is never proof of validity. Trust rests on the application-owned bundled Worker executing the registered loaders, a private request/lifetime channel and checked delivery—not on FNV being cryptographic authentication. Test changed source semantics inside the Worker through the original validators; test malformed, stale, wrong-ID and wrong-manifest delivery at the host boundary. Do not create a public “trusted payload” escape hatch.

For the first implementation, use the current exact UK loader. Keep package-set/service types country-neutral and loader dispatch explicit. Multiple-country support is a future loader capability, not inferred from names, Game country or a mutable “latest” alias. A future combined registry must pass the same joint durable-identity/country/manifest checks in the Worker; independently valid registries cannot simply be concatenated.

Conceptual host API (not production implementation or a persisted schema):

```ts
import type { GameContentContext } from '../engine/gameContent';

type ExactReferenceContentSetV1 = Readonly<{
  version: 1;
  geography: readonly Readonly<{ partitionId: string; fingerprint: string }>[];
  settlements: readonly Readonly<{ packageId: string; fingerprint: string }>[];
}>;

type ApplicationReferenceContentService = Readonly<{
  prepare: (
    exactSet: ExactReferenceContentSetV1,
    options?: Readonly<{ signal?: AbortSignal }>
  ) => Promise<GameContentContext>;
  peek: (exactSet: ExactReferenceContentSetV1) => GameContentContext | undefined;
  dispose: () => void;
}>;
```

Resolve manifest pins before building keys. Normalize semantically unordered package sets by the frozen stable identifier ordering; reject duplicate/conflicting ID contracts rather than silently deduplicating contradictions. Use unambiguous canonical tuple encoding for keys. Transitive identity/continuity manifests remain inside validated canonical registries; they are not omitted to shrink transport. The protocol additionally carries a host version, request identity and Worker lifetime identity, never a Game field. No percentage progress API is required: preparing/ready/failed is sufficient and must not pretend to predict work completion.

The current set is Geography **geography.uk.primary-local-admin-2024-06-30-v1 /fnv1a64-v1:3d1a3446a16c58cb** and Settlement **settlements.uk.hybrid-2024-06-30-v2 /fnv1a64-v1:2ddc7643a1e7e4b8**. Historical Settlement identity manifests—including the 41 historical-only identities—remain present. The production v2 package has 2,698 current representations, while durable identities number 2,739.

Yield host ownership/index work through event-driven task scheduling such as MessageChannel; do not use simulation Scheduler or arbitrary sleeps. The probe's 8 ms work budget is an experimental scheduling choice, not a new frozen acceptance limit. All potentially growing loops and sorts must be included in the future bound; calling one huge `sort` or validation function inside an async function is not cooperative preparation.

On cold preparation, all subscribers to one exact set share one operation. Bound concurrent workers to one and queue distinct sets; no speculative preload. Canceling one subscriber does not cancel another's work. When the final subscriber leaves, terminate pending work and publish nothing; a fully published immutable cache entry can remain for reuse. Disposal terminates the Worker, rejects pending subscribers, invalidates callbacks and releases cache/index ownership. Failed entries are removed so retry can succeed. A Game switch cancels its subscription/publication permission, not another Game's subscription to identical static content.

The service caches only immutable reference data and its private lookup derivatives. It must not cache Game, seed, Person, Residence choice or callbacks closing over discarded Games. Release inactive entries when their owning application/content scope ends; the first implementation needs only the current active exact UK set and its shared in-flight preparation. No unbounded global multi-country cache is approved. Later simultaneously required countries belong to one explicit jointly validated set.

## Activation, loading and failure

Country Start's completed Game is valid before reference display preparation; authoritative Game state does not depend on friendly names. Current LifeApp cannot safely enable ordinary mutations before resolvers are ready: actions/time/event/political transitions can perform death synchronization, which must remove the Person from Residence through the frozen content-aware primitive. This is a lifecycle dependency, not a display dependency.

For the smallest implementation, retain **accept Game → await responsive exact content → original `validGameWithContent` → standard initial save → atomic `setGame`**. A pending form/loading state renders immediately and the browser remains interactive. Do not enable gameplay merely because the Game was delivered. Do not construct a contradictory partial Game or change canonical bytes. A read-only complete Game screen would be safe with mutation/autosave gating, but is unnecessary current UI expansion and is not selected.

Between potentially adjacent receiver checks, reference publication and initial canonical save, use host task boundaries where needed so individually subsecond work cannot accumulate into another over-limit interaction gap. Existing `isGame`, `validGameWithContent` and persistence codec checks remain; do not optimize them away as part of this approval. Initial save must still finish before the new Game replaces the current one. Autosave does not need friendly names or national registry compilation and remains unchanged.

Saved-game open/import/recovery uses the same service when root-v4 references exist. Its canonical payload is structurally validated by existing persistence first; then exact reference checks precede mutation/activation. Empty Residence/no-marker saves continue requiring no heavy content preparation. Loading never invokes Country Start, regenerates a Person or retroactively places anyone. Recovery preview, restore acceptance and an eventual future extracted Person must use the correct Game's exact context, not a stale single global UK closure.

Treat content-unavailable failure separately from invalid Game and storage failure. Keep the delivered candidate or saved Game unchanged, preserve current/recovery saves, show a recoverable host error and retry preparation for the same exact references. No Country Start rerun, new seed, v2 fallback, deletion or “corrupt save” classification solely because content cannot load. If an already active content scope becomes unavailable/disposed, keep its Game valid, disable all mutation/advance/political commands and offer retry/export/navigation. Keep export of the existing canonical Game independent of display preparation. No partial registry becomes visible after a failed or canceled operation.

## Options and ownership

| Option | Assessment |
| --- | --- |
| A: cooperative main-thread registry compilation | Would avoid a second reference Worker, but frozen validators/fingerprinters/copy factories are synchronous. Yielding around them leaves >1 second Settlement work intact; rewriting their internals or duplicating all validation logic is larger and riskier. Cooperative ownership/index construction is useful after Worker validation. |
| B: separate application-content Worker | **Selected.** Runs original full frozen factories unchanged, transfers plain canonical registries and creates small private adapters. Real probe eliminates the large main-thread interval with substantial headroom. Transient memory duplication and differential lookup proof are explicit costs. |
| C: minimal projection then delayed synchronous content | Current UI has no location display; a sidecar serves no present consumer. It merely postpones the same freeze and does not satisfy gameplay resolver needs. |
| D: projection plus asynchronous full preparation | Feasible for a future location screen, but adds an unnecessary projection schema/trust/lifetime and potentially a Country Start protocol extension now. No current requirement justifies it. |
| E: prewarm/cache only, or keep a permanent reference Worker | Warm cache already helps; prewarm leaves cold load unresolved and duplicates startup work. Permanent RPC cannot supply synchronous lifecycle lookup contracts without broader engine changes. Neither is approved. |

Country Start Worker already has private preparation, but its public protocol returns Game and its runtime closures are not cloneable. Extending that protocol or retaining it as a reference server changes frozen host ownership; no such change is needed. Its existing lifetime may remain warm until explicit disposal; do not claim it terminates after every construction. The additional content Worker must terminate after delivery/failure and not prolong Country Start's lifetime. This design does not move simulation or persistence into either Worker.

Memory comparison: A would keep reference preparation on one main realm but require substantial validator changes; C cannot supply eventual resolvers; D adds a small projection but retains B/A's full content footprint; B temporarily duplicates canonical records across one new Worker and main, then retains only one main reference set plus derivative indexes. Existing Country Start warm content is a separate frozen lifetime. The 3.11 MB transfer is not a heap estimate. This task does not measure combined peak RSS or mobile memory; no universal memory pass is claimed. Future implementation must measure transient overlap, retained main/Worker heaps where available, termination, repeated Game discard and cache release; if unacceptable, stop for review rather than keep duplicate national content permanently.

## Implementation and acceptance boundary

Only host files may be added/changed: proposed `src/ui/referenceContent/{types,service,worker,protocol,lookupAdapters}.ts`, `src/ui/gameContent.ts`, limited LifeApp/PoliticalCareer readiness handling, related host tests, browser diagnostics and documentation. Country-specific **host loader dispatch** belongs alongside the service, imports exact existing country adapters and adds no UK knowledge to generic Geography/Settlement. Use the existing build-time Worker JSON asset loader so content bytes remain identical. An explicitly reviewed host Vite target adjustment to support the already frozen Worker's top-level await may be needed; do not alter frozen source loaders or content as a workaround. Production configuration is unchanged in this design task.

Private lookup adapters must preserve the **entire** existing interfaces: Geography partition/resolve/parent/children/ancestors/within/allocation-cell; Settlement package/get/list/relations/administrative-area lookup; canonical `registry` values; partition-qualified relationships; exact unknown-ID returns/throws; strict ancestor semantics including self; array ordering, deduplication, frozen return arrays and alias safety. Country identity and durable continuity remain those validated by original factories. No schema, new public domain factory, new identity validator, new alias system or content reduction is authorized. If parity requires a frozen source change, stop and request a separate architecture decision.

Sequence: (1) service/protocol/lifetime and differential adapter tests; (2) actual frozen loaders in a transient Worker, cooperative main ownership/indexing; (3) replace the synchronous application-content preparation internally, preserving current v2 production routing; (4) same responsive load/import/recovery path and pending/error controls; (5) disposable actual built-UI v3 integration evidence, without installing a production routing switch; (6) content-handoff final review, then separately resume production routing. No Household or later domain.

Acceptance retains **interaction gap <1,000 ms** and **complete validated saved-game load <3,000 ms** through actual built UI in supported-host Chromium, Firefox and WebKit. Record cold/warm imports, Worker preparation/delivery, receiver checks, freeze/index publication, initial save and first dashboard frame separately. Country Start construction latency is distinct from saved-game validated load; do not relabel a content-only probe as a full load pass. Timing diagnostics stay out of fingerprints and Game bytes. Real timer/frame/input observation must span the whole handoff and save, not end at Worker delivery.

Parity tests cover all 366 Places/nodes, 2,698 current Settlements, all 2,736 relations, historical-only identities, unknown/cross-package/cross-country IDs, exact London and borough relations, Scotland administrative-only locations, true Settlement locations, mutation attempts and synthetic multiple versions/countries. No current location widget exists: test exact location-to-content resolution without adding a new gameplay/display feature. If a presentation formatter is later needed, separately test its minimal canonical-name policy; never invent a Settlement for an administrative-only location.

Service tests cover cold/warm exact-set reuse, conflicting fingerprints, shared pending work, one subscriber cancellation, last-subscriber termination, disposal/replacement stale callbacks, malformed Worker replies, corrupt loader input, content failure vs invalid Game, retry, no partial cache, StrictMode and repeated renders. Built browser tests must also prove standard save/load/continuation, no Game mutation when content becomes ready and equal canonical output before/after this host change. Preserve all existing assertions/timeouts, frozen tests, 687-test baseline and the ordinary simulation/integrity gates. Firefox unavailable locally is not a pass; run supported-host evidence.

## Required decision register

1. **Files reviewed.** AGENTS, ARCHITECTURE, PROJECT-STATE, MODELLING-STANDARD, VALIDATION; the v3 repeat-freeze, Worker implementation and failed-routing reports; UK-COUNTRY-START; LifeApp/New Game/PoliticalCareer and UI content acceptance/tests; engine Game content/lifecycle, Residence validation, frozen Geography/Settlement types/factories/runtimes/tests, exact UK adapters/manifests, Country Start preparation/Worker protocol/receiver/hosts; persistence payload/service/coordinator; existing browser/research profiling infrastructure. No unrelated domain review or redesign.
2. **Files changed.** This report; current-status additions in ARCHITECTURE, PROJECT-STATE, VALIDATION, CHANGELOG and UK-COUNTRY-START; diagnostic files/build outputs under `research/application-content-handoff/`; refreshed `research/new-game-v3/non-change.json`. No production source, test assertion, configuration, package, schema or workflow changed. Preexisting repository edits are not attributed to this task.
3. **Exact failed call graph.** LifeApp submit → diagnostic awaited public v3 startup API → Worker exact constructor/preparer → structured-cloned complete Game → frozen receiver `isGame`/delivery contract → `persistReplacement` → `acceptApplicationGame` → `isGame` → `applicationGameContent` dynamic imports → `createGeographyRuntime(createUkGeographyRegistry())` → `createUkSettlementContentRegistry()` (also constructs its own Geography runtime) → `createSettlementRuntime` → `validGameWithContent`/Residence references → SaveCoordinator/standard canonical payload/IndexedDB → `setGame` → dashboard. The registry work happens **before render**, not inside a display selector.
4. **Chromium breakdown.** Original gap 1,462.3 ms; attributed reproduction 1,630.4 ms. Acceptance 1,903.2 ms; registry 671.9 ms; runtime 388.6 ms; initial save 422.3 ms; rendering 8.5 ms total. See stage table for overlap rules.
5. **WebKit breakdown.** Original gap 2,816 ms; reproduction 2,821 ms. Acceptance 2,872 ms; registry 1,253 ms; runtime 739 ms; initial save 650 ms; rendering 3 ms total. National static compilation dominates.
6. **Settlement registry breakdown.** Current 2,698 representations/2,736 relations plus 2,739 durable identities. Five package validation and four registry validation passes; 10 structural package checks, 15 canonical-package calls and 10,961 FNV calls including 10,956 identity fingerprints. Factories sort/copy/deep-freeze and validate Geography/continuity; runtime adds Maps/relation ordering. No separate alias index. Most cost is checks/encoding/hashes, not indexing. Raw JSON is bundled content; module parsing is included in import observations, not a workbook parser.
7. **Geography registry breakdown.** 366 identities/nodes, 361 allocation cells. Two UK adapter calls/two runtimes, four generic registry reconstructions; 22 structural checks, 34 canonical-package calls, 3,672 FNV calls. Duplicated outer and Settlement dependency preparation; lookup/index exclusive work is <1 ms per instrumented total category.
8. **Import-time cost.** Main dynamic import windows 614.6/482 ms. Module evaluation creates bundled constants and small frozen manifests; complete registry registration is factory-demand, not a global import-time registration. Fetch/parse/evaluation are not individually separable from these measurements. Move heavy imports into the new Worker; no caller imports the full UK dataset synchronously.
9. **React/render lifecycle.** Production-built StrictMode app renders multiple times; national registry factory runs once. Existing module-level pending promise deduplicates; no measured render duplication causes the blocker. Development StrictMode effect replay remains a required test, not a new measured pass.
10. **Duplicated Worker/main work.** Frozen Country Start validates its private registries; main independently prepares the same static evidence, then the runtime factory validates/reconstructs again. Necessary main ownership is the delivered canonical data and lookup indexes, not repeating synchronous national compilation. The new Worker still performs independent exact loader validation; avoiding that duplication through Country Start protocol changes is not authorized.
11. **Immediate first-frame requirements.** Zero Geography/Settlement names or records for current dashboard rendering. Root/Person projections, current country/currency compatibility content and existing journal/stats suffice. Do not confuse later lifecycle resolver requirements with display needs.
12. **Deferred content.** All 366 geographic nodes, 2,698 Settlement representations and 2,736 relations can be prepared asynchronously outside render. Gameplay mutation waits for exact resolvers; content is never permanently omitted.
13. **Authority boundary.** Person/People/Population/Residence/Clock/RNG/History/Scheduler remain Game authority. Immutable registries supply exact reference facts; labels are presentation. Neither readiness nor labels change Game/save bytes.
14. **Projection decision.** No new sidecar; current UI has no consumer. Do not introduce a new location screen in this task.
15. **Projection source.** Not applicable. Future labels may use the prepared frozen lookup contracts in a host formatter; Country Start is not their owner.
16. **Projection schema.** None added. A future sidecar would need exact package-qualified reference identity and would remain outside Game, but no speculative schema is approved here.
17. **Projection trust.** Any future label can never override saved IDs. Wrong reference identity must discard presentation data, not mutate Game. Current design avoids a second projection trust channel entirely.
18. **Administrative-only handling.** Resolve administrative area as such; never infer a Settlement. No present UI label is invented for Scottish administrative-only homes.
19. **Full preparation decision.** One transient application Worker validates canonical registries; main cooperatively owns/freezes/indexes their complete data and publishes private read-only adapters.
20. **Cooperative option.** Selected only for host receiver ownership and small indexing. Frozen full validators cannot be made responsive by wrapping synchronous calls in promises. Reimplementing validation incrementally is rejected as larger semantic risk.
21. **Application Worker option.** Approved B. The probe supplies evidence of <36 ms gaps locally; actual service/parity/built UI acceptance remains pending.
22. **Country Start reuse.** Its closure-private runtimes cannot transfer; frozen completion carries Game, not registry sidecars. Keep its lifecycle/protocol unchanged. No permanent geographic RPC server.
23. **Memory comparison.** A avoids another realm but needs validator work; C postpones full cost; D adds sidecar state without reducing national runtime footprint; B has a bounded transient copy then one main prepared set. Combined RSS/mobile remains unmeasured and must be reported, not inferred from serialized size.
24. **Selected architecture.** B: separate application-content Worker, exact-set cache, cooperative owned lookup construction, no sidecar, normal gameplay after readiness.
25. **Exact API.** The `ApplicationReferenceContentService.prepare/peek/dispose` contract and `ExactReferenceContentSetV1` above. `prepare` returns the existing `GameContentContext`; failure rejects predictably, optional native AbortSignal cancels a subscriber, no public unvalidated-payload constructor or percentage progress.
26. **Exact identity behavior.** Match explicit partition/package IDs and fingerprints; include validated continuity inventories; reject unknown IDs or contradictory contracts. No latest/default/UK fallback. Current exact pins are listed above.
27. **Cache behavior.** Successfully owned immutable context per exact set, no Game-associated data. Inactive application scopes release their entries; no unbounded global country cache. Failure clears pending entry for retry.
28. **In-flight deduplication.** Same exact key shares one operation across consumers; distinct sets queue behind a single transient Worker. Publish only a completed owned context.
29. **Cold behavior.** Lightweight host pending state → Worker import/registration → delivery → bounded receiver ownership/indexing → ready. No main-thread national factory.
30. **Warm behavior.** Same exact set resolves the existing context immediately; per-Game root/reference checks and normal persistence still run. Different fingerprints never reuse it.
31. **First-frame behavior.** A responsive pending screen may render immediately; current gameplay dashboard appears after content acceptance and initial save. No new read-only gameplay mode is necessary, no synchronous complete registry build occurs in rendering.
32. **Content-ready transition.** Atomically publish the full context; re-evaluate only host controls/selectors. No simulation transition, Game clone, label-derived migration or save is triggered just by readiness.
33. **Activation timing.** Hold a completed authoritative candidate; activate it normally only after content checks and standard initial save. Current synchronous death/Residence cleanup explains this gate. Early read-only display is technically possible but not the smallest current implementation.
34. **Autosave.** Frozen canonical codec/coordinator does not call application content factories. Preserve it. Readiness callbacks must not create a duplicate initial save or autosave a pending candidate.
35. **Saved-game loading.** Reuse responsive service before enabling mutation for nonempty saved references. Do not run Country Start or assign old saves a home. Empty root-v4 Residence remains lightweight.
36. **Multiple Games.** Reuse static context for compatible identities; reject stale Game publication callbacks. No retained Game/seed/Person/RNG/Residence selection in the cache.
37. **Future countries.** Generic exact-set host service and private adapters; country loaders select immutable registrations explicitly. No UK source concepts in generic domain code.
38. **Multiple countries.** Jointly validate combined content/identities in the Worker with frozen validators, then index by package/partition. Do not merge independently valid incompatible identity inventories or infer countries from place names.
39. **Cancellation.** Per-subscriber abort and application-lifetime disposal. Shared work survives another subscriber's exit; last-subscriber cancellation terminates unpublished work. Lifetime-qualified messages cannot publish to a replacement.
40. **Failure behavior.** Keep candidate/current/saved Game untouched; distinct recoverable content error, retry same exact references, no overwrite/fallback/new entropy. Active mutation controls remain unavailable without their context.
41. **No partial publication.** Worker validation, envelope checks, ownership/freeze, all required indexes and facade parity conditions precede one cache publication. Discard candidates on any failure/cancellation.
42. **Render-phase result.** Existing expensive work is outside render but synchronous after import. Future render performs only `peek`/already prepared lookups and host-state reads, never Worker launch or preparation.
43. **StrictMode result.** Current factory once in actual built reproduction; no evidence of a render-triggered duplicate. Future effect replay/multiple subscribers/rerenders must still deduplicate and dispose safely.
44. **Chromium acceptance plan.** Actual built UI cold/warm creation, load, two modes, representative Settlement/admin-only homes, save/continuation, complete heartbeat/frame/input instrumentation and memory/disposal observations. Probe is not the acceptance substitute.
45. **Firefox acceptance plan.** Same actual-built matrix on supported Ubuntu/CI host; local binary launch failure or prior Worker-only pass cannot count as this gate. No skipping Firefox.
46. **WebKit acceptance plan.** Same matrix and exact larger Game on stress browser; ensure national registration is off-main, whole acceptance/save interval remains measured. Local probe 32 ms demonstrates feasibility only.
47. **Interaction requirement.** Strict **<1,000 ms** across the complete routing/handoff/content/save/first-frame boundary. Do not aim near the threshold or raise timeouts.
48. **Load requirement.** Strict **<3,000 ms** complete validated saved-game load including cold exact reference readiness. A content-only 1,586 ms probe is not a load pass. If the actual full path fails, stop for review.
49. **First-frame metric.** Record submit→first pending paint, Worker delivery→dashboard frame and submit→dashboard separately. Current attributed dashboard observation 37/108 ms begins at `setGame`, excluding previous waits; it is not total startup latency.
50. **Ready metric.** Worker/receiver/service start→full context published plus delivery→ready. Probe total 916.3/1,586 ms is diagnostic. Instrument actual UI and cold saved load with monotonic clocks; exclude metrics from semantics.
51. **Memory contract.** One transient preparation Worker, one owned main exact reference set/private derivatives, no Game retention; terminate Worker after success/failure. Measure overlap with the frozen warm startup Worker, repeated starts and release. No invented mobile/RSS limit or universal pass.
52. **Authoritative non-change.** No root/component/schema/Clock/RNG/Person/Population/Residence/History/Scheduler/save-byte change. Compare exact pinned childhood/adult outputs and frozen inventories.
53. **Frozen v3 non-change.** Exact scenario ID/fingerprint, constructor/public Worker semantics/protocol, entropy, placement and canonical output unchanged. No production source edit in this review.
54. **Geography non-change.** Frozen packages, IDs, manifests, identity validation, partition-qualified lookup behavior and source bytes unchanged. New host indexes remain derivatives.
55. **Settlement non-change.** Frozen 2,698 representations, 2,736 relations, 2,739 identities/continuity and fingerprint unchanged. No shortened inventory, alternate naming, new alias or forged administrative Settlement.
56. **Routing non-change.** Production remains LifeApp → `createProductionUkNewGame` → frozen geographic Country Start v2. This task's candidate builds do not install v3 routing.
57. **Implementation boundary.** Only proposed host service/protocol/worker/private adapters, existing UI content bridge/readiness, tests/docs and necessary host Worker build configuration. No frozen domain/content/persistence source file changes. Production routing requires its subsequent review.
58. **Performance tests.** Actual built application, not a blank probe; observe entire cold/warm delivery→acceptance→save→activation interval plus saved load, input response and frames. Event-driven yields, no threshold relaxation or arbitrary sleeps.
59. **Equivalence tests.** Differential every public runtime method against frozen constructors, exact success/unknown/error/ordering/alias behavior, multi-version/country and historical identities. Residence location resolution, London/borough and administrative-only Scotland remain exact. If equivalent adapters cannot be proven without frozen edits, stop.
60. **Saved-game tests.** Cold/warm load, import/recovery review/restore, old empty-state compatibility, missing exact content, no regeneration, byte equality and person:2/residence:2 continuation where applicable. No persisted content/readiness.
61. **Cache tests.** Same IDs/fingerprints reuse, input-order normalization, changed fingerprint rejects, no country fallback, multi-subscriber dedup, failure clears pending, inactive cache release and unknown packages fail explicitly.
62. **Failure tests.** Loader/manifest corruption, malformed/stale deliveries, Worker error/disposal, freeze/index failure, subscriber cancel and retry. No partial registry or overwritten Game/save; distinguish reference-content failure from invalid canonical state.
63. **Repeated-game tests.** Discard/create several worlds with identical and changed exact sets; only static reference retention, no Game callbacks/leaks, stale completion cannot activate another Game, warm preparation happens once.
64. **Three-browser plan.** Supported-host Chromium +Firefox +WebKit through built UI, strict existing performance/load ceilings and unchanged persistence assertions. Current architecture probe covers Chromium/WebKit only, not final acceptance.
65. **Report created.** This file contains profile/call graph, comparison, selected design, API/trust/cache/readiness/failure/memory boundaries, acceptance and all requested decisions. Research assets are diagnostic only.
66. **PROJECT-STATE result.** Architecture approved/not implemented; Country Start v3 frozen; New Game v2; production v3 routing blocked on responsive content handoff; next is the narrow host implementation, not Household.
67. **Open questions.** Exact production adapter parity, combined cold validated load/initial-save maximum gap, Firefox actual UI, peak main/Worker/RSS/mobile overlap, cross-country loader inventory and future naming formatter policy. These are explicit implementation/evidence debts; none licenses frozen semantic changes. Existing rejected `pending` promise also needs host retry repair during implementation.
68. **Final architecture decision.** **B. APPROVED — APPLICATION-CONTENT WORKER**, with unchanged frozen factories in a bounded transient Worker and a private, differentially verified cooperative main receiver/lookup layer. No sidecar or whole-simulation Worker.
69. **Exact next task.** **IMPLEMENT RESPONSIVE APPLICATION-CONTENT HANDOFF** according to this document, preserving frozen sources and production v2 routing; prove semantic parity, lifecycle/cache/failure safety and actual built-UI three-browser responsiveness/load/memory evidence before content-handoff acceptance and separately resumed production routing.

## Verification status

This is design/profiling only. No application implementation, frozen source, test assertion, timeout, production configuration or routing changed. Fresh verification passes against the preceding **324-file CI inventory** and **272-file frozen baseline**, with zero mismatches; both restored UI snapshots are byte-identical. `node --check` passes for both diagnostic builders. The immediately preceding restored-source **687/687 Vitest**, strict TypeScript, production build and **5/5 integrity gates** remain baseline evidence; this task does not mislabel them as freshly rerun service acceptance. No new CI publication, commit, push or merge is part of this task.

B. APPROVED — APPLICATION-CONTENT WORKER

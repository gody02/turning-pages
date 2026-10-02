# Responsive application-content handoff implementation

Status: implemented host infrastructure; **NOT acceptance-frozen**. Production New Game remains `country-start.uk.mid-2024-v2`. Frozen Country Start v3 is unchanged. Supported-host browser evidence and final acceptance review are distinct gates.

The user explicitly approved only `src/ui/LifeApp.tsx` and `src/ui/gameContent.ts` as exceptions to the 272-file inventory. The other **270 files remain byte-identical**. This report does not claim all 272 are unchanged. No frozen domain/content/persistence semantic source was edited.

## Implementation and trust boundary

New `src/ui/referenceContent/{types,protocol,identities,indexMaterial,ukLoader,worker,lookupAdapters,service}.ts` implements a separate transient content Worker. Original frozen factories validate/canonicalize/fingerprint registries there. The Worker emits plain canonical registry data and separate serializable offset/group tables. Main owns the structured clone, cooperatively freezes it, guards offsets and publishes complete private read-only lookup adapters atomically. The receiver is a private bundled-Worker trust boundary, **not** an alternative weaker domain validator or public unvalidated registry constructor. No functions, Maps, canonical Game, RNG, seed or mutable simulation state cross this channel.

`LifeApp.tsx` and `gameContent.ts` use that service for saved-game acceptance and content-dependent lifecycle commands. Content failure keeps the original Game/persisted bytes and offers retry/export. Initial load, retry and restore subscribers are cancelled on unmount. Existing persistence and accept → save → activate order remain intact. Warm reference readiness is host state and does not cause autosave.

New tests live in `src/ui/referenceContent/{service,parity}.test.ts` and `tests/browser/applicationContent{,Dev}.spec.ts`. The dedicated browser config/build script exercise the actual production LifeApp under `/application-content-evidence/`, instrument observations without replacing production routing, and retain prior browser/persistence assertions. Vite's explicit ES2022 target supports the existing frozen Worker JSON loader's top-level await. No source-format/content/schema changes.

## Measurement scope

The heartbeat starts at document initialization. It records the pre-application navigation/bundle gap **separately**, then resets at the actual LifeApp effect immediately before persistence open/initialize. The formal handoff/load measurements cover persistence initialization → exact content Worker → owned delivery/publication → reference validation → dashboard frames. They stop before the audit-only helper import/extra serialization. These metrics are not a claim that entire cold document navigation is under one second.

Local final built-UI reference run: Chromium 316.6 ms application gap, 993.5 ms exact content ready, 1,471.1 ms complete validated load, 17.4 ms delivery and 53.9 ms publication. WebKit: 536 ms gap, 1,783 ms content ready, 2,626 ms validated load, 19 ms delivery and 197 ms publication. Both pass strict <1,000 ms / <3,000 ms phase limits, and their real failure/retry tests pass. Separate pre-application bundle gaps were 944.2 ms Chromium and **2,905 ms WebKit**; first visible loading screens occurred at 3,740.1 /3,094 ms from navigation. The existing large eager v2 New Game graph remains startup debt and is not hidden by the phase result. Subsequent acceptance must consider that debt explicitly.

Full canonical reference-plus-index payload: **3,442,402 UTF-8 JSON bytes**. JSON encoding is diagnostic size, not a second persisted format or exact JS heap size. Chrome post-GC retained main heap was 40,991,744 bytes, then 41,063,304 after repeated activation; backing storage stayed 12,123,917 bytes. Tiny heap variation is not proof of a universal leak-free or mobile pass. New browser diagnostics also sample actual main/Worker isolates during overlap where Chromium CDP supports it; unsupported counters remain explicit. The Worker is terminated before main publication and completed jobs/callbacks are removed. One canonical main registry graph and private derivative Maps remain per cached exact set; no full retained Worker duplicate.

## Requested decisions (1–88)

1. **Files:** new host Worker/service/receiver/types/protocol/index builder/explicit UK loader and tests; two approved host files; Vite/build/browser config/scripts/workflow; this report and architecture/state/validation/changelog documentation. Existing dirty files from preceding phases are not attributed to this task.
2. **Architecture B:** separate application-content Worker; no whole-simulation Worker or Country Start Worker redesign.
3. **API:** `applicationGameContent(exactSet,{signal?})`; `acceptApplicationGame(game,injected?,{signal?})`; `lifecycleContent(game)` only peeks ready context. Service exposes prepare/peek/dispose/read-only diagnostics.
4. **Protocol:** strict version 1 prepare / ready / failed envelopes, positive host request ID, exact package set, bounded diagnostics/failure text. Unsupported shapes/stale IDs reject.
5. **Ownership:** Worker validates; owned main clone/read-only facade; no authority transfer or caches attached to canonical packages.
6. **Transfer:** canonical plain registries plus separate array offsets/group material. Native structured clone, not functions or Maps.
7. **Geography representation:** full original registry including identities/manifests/partitions/nodes; identity/node/child offsets.
8. **Settlement representation:** full identities/manifests/packages/relations; settlement/relation/administrative-area offsets.
9. **Complete lookups:** every frozen public runtime method remains available; unknown/error/order/frozen-return semantics preserved.
10. **Validation:** unchanged frozen registry factories execute in Worker. Main channel/offset/ownership checks are not substitute demographic/geographic validation.
11. **Fingerprints:** exact manifest comparison against immutable pins plus original full verification in Worker.
12. **Copies:** one owned clone of canonical data delivered; no repeated main canonicalizer/JSON/fingerprint copy. Small lookup-return arrays retain frozen API contract.
13. **Relations:** Worker builds deterministic group offsets, main privately references canonical records. London multiple-borough and other cross-boundary relations retained.
14. **Wrappers:** private frozen runtime objects with lexical private Maps; canonical data contains no cache/lazy state.
15. **Imports:** lightweight main identity/service modules contain no national reference graph; only Worker loader imports original country adapters/factories.
16. **Assets:** frozen JSON Worker plugin emits separate assets fetched in Worker; no national Settlement records in main JS. Production routing's pre-existing demographic/Human graph is unchanged.
17. **Cache key:** canonical JSON `{version:1,geography:[{partitionId,fingerprint}],settlements:[{packageId,fingerprint}]}` sorted by code-point ID; full tuple is identity, never country/latest.
18. **Dedup:** exact pending subscribers share one job/Worker. A subscriber cancellation does not cancel others.
19. **Retry:** failed jobs removed, no successful partial cache; subsequent same-set retry starts anew.
20. **Coexistence:** exact independent sets, a bounded two-entry host cache, one transient Worker at a time; combined sets can carry multiple packages. Only explicit UK loader implemented, unknown sets fail. This cache bound is retention policy, not a model/package-count limit.
21. **Readiness:** host pending/ready/recoverable content failure; no Game field or persistence readiness.
22. **First screen:** existing loading/creation chrome renders without Settlement preparation; no location display added.
23. **Gameplay pending:** loaded nonempty Residence Game remains withheld until exact content passes; command guard prevents resolver-dependent transitions against missing content.
24. **Lifecycle:** act/advance/choose/political transitions receive ready `lifecycleContent`; content-aware death/Residence cleanup retains original semantics.
25. **Sidecar:** none.
26. **Game:** acceptance returns the same object; exact canonical saved bytes and person:2/residence:2 continuation asserted.
27. **Persistence:** no implementation/schema change; original ArrayBuffer/SHA/transaction/coordinator/recovery pipeline.
28. **Autosave:** readiness doesn't set/mutate Game; initial/retry Game sets `skipAutosave` and leaves revision unchanged, asserted in real browser failure/retry.
29. **Saved game:** cold exact reference preparation before normal gameplay; no Country Start rerun/seed draw/regeneration.
30. **Production v2:** actual built form still calls frozen v2, saves geographic Population with empty Residence and person:1.
31. **Old saves:** empty Residence requires no content prep and remains empty; existing root migration behavior untouched.
32. **StrictMode:** preparation outside render; subscribers share exact jobs; effect cleanup aborts obsolete subscribers and stale callbacks cannot publish.
33. **Render:** only host flags/ready cache lookups, no national factory invocation.
34. **Geography parity:** all 366 identities/nodes, every parent/children/ancestors/allocation/self/ancestor behavior plus unknown/error cases.
35. **Settlement parity:** 2,698 active settlements, 2,739 durable identities including 41 historical-only identities; full registry and all public queries match oracle.
36. **Relation parity:** all 2,736 administrative relations; all settlement-location validation results match synchronous oracle.
37. **Area parity:** all 361 allocation cells plus administrative ancestors; no inferred settlements for unsupported areas.
38. **London:** all borough relations preserved, cross-boundary behavior matches.
39. **Bradford:** settlement distinct from district; exact relations preserved.
40. **Leeds:** exact frozen lookup/relations match.
41. **Swansea:** exact frozen lookup/relations match.
42. **Birmingham:** exact frozen lookup/relations match.
43. **Bristol:** exact frozen lookup/relations match.
44. **Scotland localities:** Glasgow/Edinburgh/other supplied active content match; no promotion of retired identities.
45. **Scotland administrative-only:** valid administrative-area Residence still valid, empty settlement query stays empty.
46. **Cross-boundary:** partition-qualified queries and multi-area settlement relations; no global-parent or administrative inference.
47. **Failures:** bad tuple/protocol/offset/cycles/accessors/Worker startup/error/cancel/dispose reject predictably; real failed module load keeps persisted Game then retries successfully.
48. **Publication:** no ready cache until full owned freeze/index build completes; cancellations/stale jobs cannot publish.
49. **Repeated activation:** five plus three warm acceptances reuse one preparation; no Game-specific cache. Repeat revision/bytes unchanged.
50. **Worker lifecycle:** one active preparation realm; terminate and detach after delivery/error/final-subscriber cancellation; service dispose clears jobs/cache/listeners.
51. **Payload:** 3,442,402 diagnostic UTF-8 bytes including offsets.
52. **Handoff:** local Chromium 17.4 ms /WebKit 19 ms, includes clone delivery/scheduling; not claimed isolated CPU time.
53. **Publication:** local Chromium 53.9 ms /WebKit 197 ms, cooperative checkpoints/event-driven MessageChannel yields; no sleeps/domain Scheduler.
54. **Largest remaining operation:** main frozen root/persistence validation and existing initial v2 bundle parsing, not a registry factory; application max gaps 316.6 /536 ms. Pre-application WebKit 2,905 ms retained as debt.
55–66. **Three browsers / first frame / ready / max gap / result:** final supported-host results recorded in accompanying machine evidence and CI section below. Local Firefox `spawn UNKNOWN` is host failure, never counted as an application pass. Local metrics above are Chromium/WebKit real built UI, not feasibility probe.
67. **Interaction:** strict application-handoff <1,000 ms assertion; separate initial-navigation gap retained, not reclassified as pass.
68. **Validated load:** strict full persistence+reference validated saved-load <3,000 ms assertion, not content-only timing. First-frame/navigation remains a separate reported metric.
69. **Combined memory:** bounded transient Worker and main/cached context overlap; actual CDP samples where supported, raw diagnostic bytes/heap/lifetime counters, no fabricated RSS/mobile result.
70. **Retained memory:** one cached canonical graph, derivative maps, no retained Worker or completed job; post-GC repeated activation observations above.
71. **Duplication:** temporary structured-clone overlap permitted; no permanent second canonical package copy. Runtime results are references/frozen small arrays, not factory canonical copies.
72. **Mobile:** unmeasured; existing Country Start transient-memory debt not reopened. No mobile-memory acceptance claimed.
73. **Base path:** actual built UI under `/application-content-evidence/`; Worker/JSON paths resolve.
74. **Dev:** real Chromium Vite dev Worker under same non-root base passes exact counts, cached reuse and Worker release.
75. **Preview:** actual production build/preview tests, no initializer substitution.
76. **Focused:** new service/parity plus existing host/New Game tests; reference unit parity is not falsely attributed to browser computation.
77. **Bounded suite:** initial complete run 702/60 PASS; final run after additional hostile/cancellation checks recorded below.
78. **Unrestricted:** separately observed; resource-sensitive failures are retained and compared, never hidden with changed fixtures/timeouts.
79. **Types:** strict TypeScript via original build.
80. **Build:** original production build plus actual UI instrumentation-only acceptance build.
81. **Integrity:** unchanged Human/Geography/geographic Population/Settlement/placement gates, all five required.
82–83. **CI:** public supported-host Chromium/Firefox/WebKit workflow, review branch only; exact run/commit/results below. Existing browser assertions/timeouts retained.
84. **Inventory:** 270 exact + two explicitly approved host exceptions. Frozen Country Start v3, production v2 New Game, domain/content/persistence sources all unchanged.
85. **Report:** this file plus `research/application-content-handoff/implementation-evidence.json` and raw browser/unit/build diagnostics.
86. **Debt:** initial eager production-v2 bundle delay, exact peak RSS/mobile evidence, future explicit country loaders, final acceptance. No Household/routing change licensed by these debts.
87. **Status:** implemented; NOT final acceptance-frozen. Supported-host gate must be actually observed before claiming three-browser pass.
88. **Exact next task:** FINAL ACCEPTANCE REVIEW — RESPONSIVE APPLICATION-CONTENT HANDOFF, before separately resumed production New Game routing to frozen Country Start v3. Do not implement Household or routing here.

## Final evidence

CI and final bounded/unrestricted evidence pending at source snapshot creation; final observed results will be appended without changing the reviewed runtime source.

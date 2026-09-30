# Causality / provenance foundation

`src/engine/core/causality.ts` records meaningful causal relationships only when an owning domain explicitly declares them. It is country-neutral, synchronous and transaction-local. It does not inspect state differences, infer causes from chronology or correlation, consume RNG, mutate the clock, mutate Scheduler state, or persist a graph.

## Trace and links

`createCausalTransaction(date)` creates one closed-after-use transaction. It accepts immutable declarations with a `caused` or `contributed` relation, a cause, an effect and a stable namespaced `declaredBy` identifier. Accepted links receive deterministic local IDs (`causal:1`, `causal:2`, …). Exactly 10,000 links are allowed; invalid declarations, duplicate declarations, safety-cap overflow, or final validation failure close the transaction without a successful trace.

References are structural values: `domain-event`, `scheduled-item`, `scheduled-occurrence`, and reserved `history-fact`. Identical relation/cause/effect/declaredBy declarations are rejected. Self-links are rejected; larger cycles are allowed. A trace is immutable and is suitable for temporary developer tooling only.

## Boundaries

A Domain Event is a transient fact. Its `causationId` is dispatch parentage, not a semantic causal claim. When finalizing against a completed Domain Event trace, causal event references must exist on the same date and event causes must precede event effects. No parentage is converted automatically.

A Scheduled Occurrence is future work becoming due. Causality may reference Scheduler item and occurrence IDs without changing their queue or treating Scheduler `source` metadata as provenance. `history-fact` remains unresolved until a future History ledger provides durable IDs; current `LifeFact` entries are not part of this model.

History persistence, cross-time promotion, traversal, causal inference, strengths, source metadata, gameplay declarations and UI explanations are deferred.

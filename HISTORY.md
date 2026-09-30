# Durable History

`LifeState.history` is Turning Pages' durable, country-neutral record of selected meaningful past reality. Version 1 is append-only:

```ts
type HistoryState = {
  readonly version: 1;
  readonly nextSequence: number;
  readonly facts: readonly HistoryFact[];
};
```

Each fact has a deterministic `history:n` ID and matching sequence, exact `SimulationDate`, stable namespaced type and source, optional ordered actor and subject IDs, and an optional finite plain-JSON payload. IDs survive save/load and are never reused. Facts cannot be deleted, corrected, superseded or backdated in version 1.

`recordHistoryFact(history, now, input)` is an immutable explicit append. The supplied authoritative date becomes `occurredAt`; callers cannot provide identity, sequence or another date. Facts must be recorded in nondecreasing date order. Same-date facts preserve call order through their sequence.

`getHistoryFact` looks up one ID. `listHistoryFacts` performs linear filtering by inclusive date bounds, exact type/source and actor/subject membership while retaining sequence order. Persisted indexes and query languages are deliberately absent.

History is selective. A Domain Event is a transient factual notification; a CausalTrace is transient declared provenance; neither is saved automatically. History v1 stores facts only and no causal links. A recorded fact can be referenced structurally as `{ kind: 'history-fact', factId }` by the existing causality vocabulary.

`LifeFact` remains the legacy semantic/gameplay memory used by current gating. Journals, news, political logs, institution minutes and other domain records remain presentation or specialist records. None are migrated into History.

Legacy saves receive an empty ledger after Clock normalization, without replay or fabricated past facts. The raw pre-migration save is preserved once at `turning-pages:before-history`; snapshot failure prevents replacement of the primary save.

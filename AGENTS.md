# Working on Turning Pages

- Read `ARCHITECTURE.md` and `PROJECT-STATE.md` before changing simulation code. Read `POLITICS-VISION.md` for the political design; do not confuse planned systems with implemented ones.
- Read `NATIONAL-MODEL.md` and `INSTITUTIONS-MODEL.md` before changing national economics or institutions. Preserve bank balance identities and prospective institution attachment; forecasts must never consume the live timeline seed. Preserve dated source provenance, separate verified UK rules from scenario assumptions, and keep national £bn separate from local/personal pounds. Do not sum the constituency satellite ledger into national totals.

- Keep all simulation rules in `src/engine` and content in `src/data`. React components render state and dispatch transitions.
- Preserve the dependency direction in `ARCHITECTURE.md`: `core/` and `systems/` are country- and career-neutral. Life-path modules consume them through `SimulationModule`; they do not own age, birthdays, ordinary careers, personal finance or relationships.
- Preserve deterministic seeded randomness. Never use `Math.random()` in engine transitions.
- Keep transitions immutable and add regression tests for progression changes.
- Every event needs a globally unique ID and at least one choice with no cash requirement.
- Keep country presets explicitly fictional. Maintain original names, writing, mechanics and visual design.
- Validate saved data at the boundary; add migrations when the save schema changes.
- Run `pnpm test` and `pnpm build` after engine changes. Check affected UI at mobile and desktop widths.
- The future expansions listed in README are design extension points, not implemented features.
- Politics belongs inside the existing life and Career tab. Preserve one character and one clock: twelve political months advance one year of age, education and work without charging cash twice. New countries implement political adapters rather than branching the life engine. Keep regression coverage for these boundaries.
- Keep the legacy standalone town archive separate and recoverable; never silently assign it to a character. Preserve `src/engine/fixtures/life-v1.json` as a fixed legacy compatibility fixture and retain pre-career recovery snapshots.
- Town money transfers must reconcile to counterparties; never alter balances as untracked bonuses. Document behavioural assumptions separately from accounting invariants.
- Checkpoint source before substantial changes and record completed work in CHANGELOG.md and PROJECT-STATE.md.

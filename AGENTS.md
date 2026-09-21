# Working on Turning Pages

- Read `PROJECT-STATE.md` for current scope, compatibility requirements and next milestone. Read `POLITICS-VISION.md` for the long-term design; do not confuse planned systems with implemented ones.

- Keep all simulation rules in `src/engine` and content in `src/data`. React components render state and dispatch transitions.
- Preserve deterministic seeded randomness. Never use `Math.random()` in engine transitions.
- Keep transitions immutable and add regression tests for progression changes.
- Every event needs a globally unique ID and at least one choice with no cash requirement.
- Keep country presets explicitly fictional. Maintain original names, writing, mechanics and visual design.
- Validate saved data at the boundary; add migrations when the save schema changes.
- Run `pnpm test` and `pnpm build` after engine changes. Check affected UI at mobile and desktop widths.
- The future expansions listed in README are design extension points, not implemented features.
- Keep life and town storage keys and clocks separate until an explicitly tested migration/integration exists. Preserve `src/engine/fixtures/life-v1.json` as a fixed legacy compatibility fixture.
- Town money transfers must reconcile to counterparties; never alter balances as untracked bonuses. Document behavioural assumptions separately from accounting invariants.
- Checkpoint source before substantial changes and record completed work in CHANGELOG.md and PROJECT-STATE.md.

# Repository Guidelines

## Project Structure

Turning Pages is a mobile-first React, TypeScript and Vite life simulation. `src/ui/` contains screens; `src/data/` holds content; `src/engine/` contains simulation logic and tests. Shared life systems currently live in `core/` and `systems/`. UK politics and world code remain grouped under current paths, including `politics/uk/`; this is current placement, not target ownership. Root forwarding modules are temporary facades.

## Build, Test, and Development

- `pnpm install` installs dependencies.
- `pnpm dev` starts the local Vite server.
- `pnpm test` runs Vitest.
- `pnpm build` type-checks and creates the production bundle.
- `pnpm preview` serves the build locally; `pnpm phone` serves it on the LAN for same-Wi-Fi phone testing.

Run tests and build after engine changes; check affected screens at phone and desktop widths.

## Coding and Testing Conventions

Use TypeScript, 2-space indentation, and nearby formatting; no formatter or linter is configured. Name React components in PascalCase, modules in lowercase, and tests `*.test.ts`. Keep simulation rules outside React and transitions immutable. Vitest tests live beside engine modules; cover behavior, migrations, deterministic outcomes and module boundaries. Preserve fixtures such as `src/engine/fixtures/life-v1.json` unless an intentional behavior change is approved. Events need unique IDs and a free choice; transfers must reconcile.

## Architecture and Persistence Rules

Country/world simulation exists independently of specialist careers. Characters of any career or employment status inhabit the same economy, households, industries, banking, housing, services, institutions, fiscal environment and national conditions. UK politics may consume and influence UK world state, but that state must not require politics to be active. Generic core systems remain country-neutral. Specialist modules may depend on core/world systems; core/world systems must not depend on a specialist political career. Preserve saves and UK behavior during ownership refactors. Compatibility facades are temporary.

One country-neutral simulation clock owns an exact Gregorian `{ year, month, day }` date; date of birth determines age. `clock.cadence` means player turn cadence, not date precision or subsystem frequency. The country-neutral scheduler stores serialisable future work and recurrence but never executes it, advances time or consumes RNG; owning domains interpret due items. Domain Events are transient, data-only notifications during a candidate-state transition: their queues and IDs are never persisted, and stable handler IDs define deterministic order. Domain counters such as political tenure, UK world month and constituency month must not become clocks or advance independently of successful time transitions. Use deterministic seeded RNG; never use `Math.random()` in transitions. Persisted schema changes require migrations and validation. Distinguish verified UK rules from assumptions and national £bn from local/personal pounds.

Follow `MODELLING-STANDARD.md` when adding evidence or calibrated inputs. Classify observations, estimates, transformations, assumptions and authored abstractions accurately; absence is not zero, forecasts are not history, and canonical precision must not be presented as source precision.

## Scope and Changes

For scoped architecture tasks, add no unrelated features; prefer small, reviewable changes. Update `PROJECT-STATE.md` after meaningful phases. Read `ARCHITECTURE.md` and `PROJECT-STATE.md` before engine work, plus `NATIONAL-MODEL.md` and `INSTITUTIONS-MODEL.md` for UK economy/institution changes. Use short imperative commit subjects. Pull requests should describe changes, report checks, link issues when available, and include phone screenshots for UI work.

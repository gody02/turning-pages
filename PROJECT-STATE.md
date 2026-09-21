# Persistent project state

Read this file and AGENTS.md before continuing development. Conversation context is helpful, but these files are the durable project record.

## Player direction

- Original text life simulation, playable on a phone.
- Develop one deep area at a time: UK politics first, law later.
- Political depth should connect people, economics, ownership, institutions, philosophy and historical change.
- Requested intellectual influences: Socrates, Adam Smith, Marx and Marxist economics, Lenin, Trotsky, dialectics and the NEP.
- Wants a shifting world, believable consequences and eventually transformative/revolutionary alternate-history paths.
- Work incrementally: make one small slice playable, let the player try it, refine it, then expand.
- Preserve earlier work; do not rely on conversational recollection as a compatibility strategy.

## Implemented

### Original life mode

Character creation; annual events; stats; relationships; education; careers; finances; death; one local save. The original engine, UI component and storage key were retained when adding town politics.

### Milestone 1: Mereford town economy

- Independent route `#town`, linked by the game-mode switcher.
- 24 monthly turns, 800 households in four cohorts, two aggregated employers, a programme fund and a wider-economy clearing account.
- Balanced cash transfers for wages, pensions/outside income, unemployment support, rents, energy, essential spending, shopping, business inputs, orders, grants and programme spending.
- Four choices: reserves, targeted relief, employer grants and delayed insulation investment.
- Scripted fictional energy and demand shocks, plus reproducible seeded variation.
- Household voices driven by current conditions; history of policy decisions, causal explanations and household outcomes.
- Philosophical reading lenses and a guiding commitment. These currently frame reflection; they do not grant stat bonuses or constitute a complete dialogue system.
- Separate versioned save with balance reconciliation, export/restore, explicit reset and restore confirmation.
- Mobile layout with a shortcut to policy choices; a 24-month summary.

## Explicitly not implemented

Calibrated live UK economy, automatic news updates, elections, party organisation, Socratic dialogue trees, independent NPC memories, national taxation/monetary systems, banking and credit, production inventories, ownership transformation, NEP mechanics, revolutions, law career, or integration of town time with character ageing.

The town is labelled a fictional laboratory. The player is making scenario interventions, not wielding powers attributed to a real UK councillor. Avoid implying that its simple monetary clearing account is a national debt or money-supply model.

## Compatibility rules

- Original life key: `turning-pages:v1`. Town key: `turning-pages:town:v1`.
- `src/engine/fixtures/life-v1.json` is a fixed compatibility fixture; do not update it merely to make a breaking change pass.
- Preserve old saves through explicit migrations before changing required state fields or scenario constants. `validTown` currently checks constants against Mereford v1; a new model requires a new scenario version and a migration policy.
- Keep the annual and monthly clocks separate until integration has explicit double-counting tests.
- Every monetary flow must have a counterparty. Reconcile opening accounts plus transactions against all current balances.
- New changes need appropriate tests and a build. Browser-check changed user flows, including a phone viewport.
- Record design changes here and in CHANGELOG.md. Keep deferred ideas in POLITICS-VISION.md.

## Next discussion

Ask the player to try 6–12 months with at least two different strategies and say which consequences feel confusing, shallow or implausible. The likely next milestone is political formation: background, values, philosophical conversations and a local organisation, built on tested economic conditions. Do not jump directly to national revolution mechanics before that foundation is reviewed.

## Local running and recovery

- Project lives in this folder under `outputs/turning-pages`.
- Phone server: port 4173 on the computer's LAN address. It must remain running; computer and phone must be on the same Wi-Fi. The observed address during setup was `192.168.0.106`; verify rather than assuming it stays fixed.
- `pnpm build`, then `pnpm phone` is the normal workflow. Refresh the phone after rebuilding.
- In this restricted Windows environment, `node node_modules/vite/bin/vite.js build --configLoader runner` and `node node_modules/vitest/vitest.mjs run --pool=threads --maxWorkers=1 --configLoader runner` avoid the config-bundling path limitation. Run `node node_modules/typescript/bin/tsc --noEmit` separately.
- Pre-politics source checkpoint: `../../work/before-politics-20260921.zip`, created before implementation. It contains source, dependency manifests/lockfile, configuration and existing documentation, not node_modules or browser saves.
- The tested Mereford milestone is also checkpointed in this folder's local Git repository. Future milestones should add separate commits after validation so individual changes can be reviewed and recovered.
- Town save exports are made from the game. Source checkpoints do not back up browser storage. Phone and desktop saves remain separate unless exported/imported.

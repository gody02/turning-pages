# Turning Pages

An original, mobile-first text life simulation built with React, TypeScript and Vite. Create a character, make a yearly choice, spend up to three activities, and see a life unfold. No copied game assets or writing.

## Run locally

Install Node.js 22 LTS or newer and pnpm. From this folder:

```sh
pnpm install
pnpm dev
```

Open the local address printed by Vite (normally http://127.0.0.1:5173). With npm, use `npm install` then `npm run dev`; pnpm's lockfile is the canonical dependency lock.

```sh
pnpm test       # engine, progression and save tests
pnpm test:sim   # bounded deterministic simulation profiles
pnpm test:sim:deep # longer manual/pre-release deterministic profiles
pnpm test:sim:banking # 20-seed, 100-year deterministic banking freeze gate
pnpm build      # strict TypeScript check and production build
pnpm preview    # serve the production build
```

The sandbox used during initial development required elevated access for dependency installation and Vite's file resolution. Normal local installations do not need this. Fonts use Google Fonts with system/Georgia fallbacks; all game logic runs locally and needs no service or API key.

## Play on your phone over Wi-Fi

On the computer, run `pnpm build` after making changes, then `pnpm phone`.
Connect your phone to the same Wi-Fi network and open the Network URL printed by Vite, using port 4173. Use the computer's LAN address, not `localhost` or `127.0.0.1`, which refer to the phone itself.

Keep the computer awake and the server running while playing. If Windows asks whether to allow the server through the firewall, allow it for your private home network. Guest Wi-Fi client isolation may prevent the phone from connecting. The computer's local address can change after reconnecting to Wi-Fi.

Phone saves are stored in that phone's browser and do not automatically sync with desktop saves. This is a local-network preview; access away from home or with the computer switched off requires web hosting.

## Playing

UK politics lives in **Career → UK politics**, inside your existing character's story. Entry requires a living UK adult, an available activity and no outstanding yearly choice. Choose a party and an intellectual influence, then enter political life. For a new story that starts immediately, choose **United Kingdom → Adult life · age 18**. Starting a new story replaces the active save; export it first if you want to keep it.

Political life advances monthly. Resolve dilemmas, spend up to three shared political/personal activities, and live the next month. Twelve months bring one birthday and ordinary life events. Family, outside employment, education, personal living costs and health continue. Organising starts unpaid, so keeping a day job matters. Campaign donations and public budgets are separate from your money.

Explore seven areas within Career: **Your work**, **Constituency**, **United Kingdom**, **Elections**, **Parliament**, **Ideas** and **Record**. Build a branch, seek selection, contest elections, serve in office and sponsor legislation. Election defeat continues your story. Constituents' wages, rents, jobs and energy costs affect hardship and support. Programme motions need collective approval; laws take effect after passage. Read the causal reports and accounts to see where money went.

**Finances** exports/restores the complete life, including politics, and can recover one-time pre-career, UK-world, simulation-clock and day-precision migration snapshots. An earlier independent town save stays separate and exportable; it is never silently assigned to your character. `/#career` and legacy `/#town` both open the unified Career tab. Saves are local to each browser and origin. Source checkpoints do not back up browser storage.

See `ARCHITECTURE.md` for system ownership, `PROJECT-STATE.md` for implemented scope and compatibility, `POLITICS-VISION.md` for future depth, and `CHANGELOG.md` for milestones. The UK world advances independently of a player's career; UK politics is optional. Mereford and its people are fictional; economic parameters, pay and electoral schedules are game assumptions. This is not a calibrated national economy or live-news service.

- Start a production UK life in Childhood or Adult mode. Leave name and gender label blank for deterministic generated identity content, or supply identity-facing overrides. Other countries remain unavailable until they have production country-start paths. Starting smarts and looks vary by seed.
- Age up to receive an event. Resolve it before taking activities or advancing again. Consequences are shown before you choose. Paid choices require cash; every event has a free option.
- Outside politics, each year has three optional activities. Inside politics, three activities are shared each month; everyday stat gains are reduced accordingly. Changing career or enrolling also uses an activity.
- School runs from 6 to 18. At 18, living expenses begin and a graduation gift supplies 3,000 currency units. Work full time or study for a three-year degree. University replaces your job and charges tuition on each of the next three age-ups.
- Ordinary careers pay annually outside politics, monthly inside it, and promote every three years with at least 40 smarts, up to six levels. Salary figures are simplified take-home amounts. MPs leave outside employment; office pay begins the next month.
- Negative balances are allowed. Debt incurs 5% yearly interest outside politics or 5%/12 on the monthly opening debt inside it, and lowers happiness. Political living costs respond to energy pressures. Countries use fictional economy presets, not real financial forecasts.
- At 65, retire for a modest pension. Health and late-life mortality eventually end the story, no later than age 100. The summary includes lifetime earnings, balance, education, relationships and choices.
- State autosaves after changes in localStorage. Manual save/load is on Finances. Saves belong to the browser and exact origin (host and port); starting a new life replaces the single save. Clearing browser data deletes it. Storage errors are shown, and play continues in memory.

## Project structure

```text
src/
  data/events.ts         # original yearly events
  data/world.ts          # country presets and outside careers
  data/politics.ts       # parties, influences, dilemmas, activities, bills
  data/town.ts           # household, employer, policy and legacy shock data
  data/national.ts       # dated sources, Budget settings, national proposals
  engine/core/           # character life cycle, canonical date, state and module contract
  engine/systems/        # careers, finance, relationships, events and character development
  engine/ukWorld.ts     # canonical UK world-state owner and transition boundary
  engine/simulation.ts   # composes a life with installed optional modules
  engine/politics/uk/    # UK politics, constituency, nation and institutions
  engine/national.ts     # compatibility facade for the UK national module
  data/institutions.ts   # additional Acts, institutional sources and stress scenarios
  engine/institutions.ts # compatibility facade for UK institutions
  engine/institutionActions.ts # compatibility facade for UK actions
  engine/institutionsSave.ts # compatibility facade for UK validation
  engine/forecast.ts     # compatibility facade for UK forecasts
  ui/InstitutionsPanel.tsx # Banking, Devolution, Factions and Forecasts
  ui/LegislationCatalogue.tsx # searchable configurable bill templates
  engine/nationalSave.ts # compatibility facade for UK national validation
  ui/NationalEconomy.tsx # Budget, briefing, sectors, accounts and legislation
  engine/types.ts        # application composition of life plus optional modules
  engine/game.ts         # compatibility facade for the simulation coordinator
  engine/politics.ts     # compatibility facade for the UK political module
  engine/politicsTypes.ts # compatibility facade for UK political contracts
  engine/town.ts         # compatibility facade for the UK constituency
  engine/save.ts         # canonical life serialization, migration and recovery
  engine/politicsSave.ts # nested career and clock validation
  engine/townSave.ts     # compatibility facade for constituency validation
  engine/*.test.ts       # simulation, progression and compatibility tests
  engine/fixtures/       # legacy save and frozen pre-refactor scenarios
  ui/GameRoot.tsx        # unified life entry point
  ui/LifeApp.tsx         # character, five life areas, saves and mobile dock
  ui/PoliticalCareer.tsx # UK career within the existing life
  ui/*.css              # responsive original journal-inspired design
  main.tsx              # React entry point
```

Persistence invariants, migration order, recovery behavior and storage scaling are documented in `PERSISTENCE.md`.

## Deterministic simulation harness

`pnpm test:sim` runs fixed-seed personal, UK-world and political simulations through the real engine. It resolves pending choices by stable choice ID, validates canonical state, records warnings and metrics, and exercises in-memory save/load checkpoints. It is test infrastructure, not gameplay or a Developer Console.

`pnpm test:sim:deep` is a longer manual/pre-release run. The former banking validation failure after roughly 65–77 years is repaired and a separate 20-seed gate replays 100 years per seed. An optional 250-year probe still finds unrelated UK-world validation debt, so the project does not claim 250-, 500- or 1,000-year support. A failure report includes profile, explicit root seed, step/date, action and compact context for replay.

## National economics and legislation

Inside **Career → United Kingdom**, inspect the monthly briefing, change a working Budget comparison, inspect representative household effects and trace public accounts. The **Budget desk** exposes 17 tax and spending settings. Working comparisons do not spend money and are not saved; submitted packages are saved. As Prime Minister, submit a package and advance it in **Parliament**. Existing rates continue until passage.

Parliament contains 72 searchable national policy templates across 16 areas. Configure scale, territorial approach, delivery speed and a five-year sunset before introducing a bill. Bills need votes and spending consent. Negotiate, offer a half-scale compromise, withdraw or risk defeat. Approved programmes spend money before their delayed benefits arrive. Your age, family, personal finances and constituency continue on the same clock.

The model starts from selected verified September 2026-era indicators and headline HMRC rules. Output/debt totals, spending envelopes, macro behaviour and legislation are explicitly scenario assumptions. Independent monetary decisions and uncertain, condition-weighted events replace a repeating shock schedule. This is an expanded simulation, not a complete calibrated UK economy. Read **NATIONAL-MODEL.md** and **INSTITUTIONS-MODEL.md** for mechanisms, sources and limitations.

New desks in **Career → United Kingdom**: **Banking** shows lenders’ balance sheets, credit, mortgage repricing and resolution; **Devolution** shows separate allocations and consent negotiations; **Factions** shows ideological caucuses, whip pressure and remembered commitments; **Forecasts** compares 24 hypothetical paths against energy or credit shocks. Its ranges are model outputs, not official forecasts. Only MPs or higher offices can take institutional actions; drafting and analysis remain available earlier. **Finances → Recover before institutions** restores the one-time pre-expansion snapshot after confirmation.

## Adding events

Add a unique ID to `src/data/events.ts` with a title, prompt, inclusive age range and at least two choices. Each choice has visible text, an original result and numeric `effects`: health, happiness, smarts, looks, money, or bond. Keep at least one choice free. Stats and bonds clamp to 0–100. Event money is in the selected country's currency. Selection avoids repeated events until the eligible pool is exhausted, then resets the seen list. The seeded generator is stored in the save, so loading cannot reroll the next event.

## Extension points

Political dilemmas belong in `src/data/politics.ts`, with unique IDs, role requirements, original choices, typed effects and optional remembered commitments. Existing intellectual influences frame questions; they do not automatically change outcomes. New political mechanics belong in pure engine transitions with explicit causal links and tests. Check `PROJECT-STATE.md` before modifying the monthly/annual boundary.

Keep simulation changes in engine transitions and data, then expose them through UI actions. The engine returns a new state and never mutates its input; refused actions return the existing state.

| Expansion | Suggested addition |
| --- | --- |
| Crime | Add risk, legal-status and consequence types; gate event eligibility and actions on them. |
| Dating | Extend relationship roles and add consent-based partner actions and eligibility. |
| Property | Add asset records, purchase/sale actions and yearly maintenance in `ageUp`. |
| Businesses | Add business state, operating cash flow and independent event pools. |
| Achievements | Evaluate milestones after successful transitions; store earned IDs. |
| Countries | Add `Country` data entries; move schooling/retirement rules into presets as complexity grows. |
| Generational play | Persist family members as characters and create a successor from the end-of-life state. |

For richer content, extend `LifeEvent` with typed predicates, weights and prerequisites rather than embedding UI logic in event text. For new save fields, increase the version and add an explicit migration before validation in `save.ts`. Write regression tests for migrations and new annual systems.

## MVP boundaries

One active local life; production new-game creation currently supports the UK, with four outside careers and an integrated UK political career. Legacy save compatibility still understands earlier country records. The UK national seat result is an aggregate model; appointments and bill stages are compressed. The 800-household economy covers cash, employment and costs, with condition-driven national pressures and uncertain incidents. Banking, national production, devolved administrations and factions now have aggregate models. Individual MPs, full banking regulation, regional fiscal frameworks, ownership transitions, NEP and revolutions remain incomplete or planned. Philosophical dilemmas are a starting layer, not exhaustive dialogues. Family members keep fixed roles and do not independently age or die. No backend, cloud saves, property purchases, crime, romance, businesses or generations yet. The journal shows the latest 50 entries and saves full history. This is a local coding project, not a publicly hosted service.

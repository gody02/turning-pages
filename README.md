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

Use **Your life** for the original annual simulation, or **Town politics** for the new independent Mereford experiment. Town politics has its own save and does not age your character. Open `/#town` to go directly to it.

In Mereford, select a monthly policy, advance one month, then inspect People, Employers, Consequences and Accounts. Try 24 months of different priorities: keep reserves, relieve households, support employers, or commission insulation with a three-month delay. The Ideas tab offers philosophical questions and sources. Policy costs, limits and model assumptions are visible in the game.

Town backups can be exported as JSON and restored on another browser or device. Restoring and restarting ask for confirmation. Damaged saves are left untouched until you explicitly replace them. Browser saves and exported game backups are separate from source-code checkpoints.

See `PROJECT-STATE.md` for current implementation and compatibility requirements, `POLITICS-VISION.md` for the long-term ambition, and `CHANGELOG.md` for completed milestones. Mereford uses fictional values; it is not yet a calibrated UK economy, election simulator or revolutionary game.

- Choose a name, gender option and one of three countries. Gender does not change opportunities or outcomes. Starting smarts and looks vary by seed.
- Age up to receive an event. Resolve it before taking activities or advancing again. Consequences are shown before you choose. Paid choices require cash; every event has a free option.
- Each year has three optional activities. Read, exercise, rest, practise self-care, study or spend time with people. Changing career or enrolling also uses an activity.
- School runs from 6 to 18. At 18, living expenses begin and a graduation gift supplies 3,000 currency units. Work full time or study for a three-year degree. University replaces your job and charges tuition on each of the next three age-ups.
- Careers pay annually and promote every three years with at least 40 smarts, up to six levels. Salary figures are simplified take-home amounts.
- Negative balances are allowed. Debt incurs 5% yearly interest and lowers happiness. Countries use fictional economy presets, not real financial forecasts.
- At 65, retire for a modest pension. Health and late-life mortality eventually end the story, no later than age 100. The summary includes lifetime earnings, balance, education, relationships and choices.
- State autosaves after changes in localStorage. Manual save/load is on Finances. Saves belong to the browser and exact origin (host and port); starting a new life replaces the single save. Clearing browser data deletes it. Storage errors are shown, and play continues in memory.

## Project structure

```text
src/
  data/events.ts      # 24 original typed events with age ranges and effects
  data/world.ts       # country economy presets and career catalogue
  engine/types.ts     # state, action and event contracts
  engine/game.ts      # pure state transitions; no UI or browser imports
  engine/save.ts      # versioned, validated storage boundary
  engine/game.test.ts # deterministic simulation and persistence tests
  ui/App.tsx         # creation, dashboard, choices and five life-area views
  ui/style.css       # responsive original journal-inspired design
  main.tsx           # React entry point
```

## Adding events

Add a unique ID to `src/data/events.ts` with a title, prompt, inclusive age range and at least two choices. Each choice has visible text, an original result and numeric `effects`: health, happiness, smarts, looks, money, or bond. Keep at least one choice free. Stats and bonds clamp to 0–100. Event money is in the selected country's currency. Selection avoids repeated events until the eligible pool is exhausted, then resets the seen list. The seeded generator is stored in the save, so loading cannot reroll the next event.

## Extension points

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

One active local save; fictional simplified economies; three countries and four careers. Family members currently keep fixed roles and do not independently age or die. No backend, accounts, cloud saves, property, crime, romance, businesses or generations yet. Gender's self-described option is a label in this MVP. The journal view shows the most recent 50 entries; the full history is saved. The app is a local coding project, not a publicly deployed service.

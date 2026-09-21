# MVP validation

## Integrated UK political career

Completed 21 September 2026, after the historical milestones below.

- Strict TypeScript check and Vite production build passed using the runner configuration loader.
- 49 tests passed: 15 original life tests, 14 town/legacy tests and 20 integrated career tests.
- Career coverage: entry requirements, shared activity/choice gating, immutable month transitions, twelve-month birthdays without duplicate cash, three-year university progression, separate personal/campaign/public funds, family and mentor consequences, continuous constituency state past 24 months, election wins/losses, preserved parliamentary nomination during council defence, role eligibility, staged laws, balanced profit-sharing/levy payments, remembered promises and death.
- A deterministic player strategy reaches Prime Minister through ordinary available actions over 48 months. This verifies playability, not realistic career timing or balanced difficulty.
- Six seeded political lives run for six years with save/account validation each month. The original suite also covers 100 annual lifetimes and 40 legacy town experiments.
- Save tests load the fixed original life fixture unchanged, preserve its exact pre-career recovery bytes, round-trip nested political state, reject malformed careers/clocks/accounts and keep the old primary save when recovery storage fails.
- Production browser flow: created an adult UK life on an isolated local test origin, took an outside job, entered a party with a philosophical influence, resolved a dilemma, organised and advanced a month. Confirmed age 18 plus one month, outside-job income and living costs, the next political choice and shared activity gating. Reload retained the career and financial state.
- Chose family time and verified resulting bonds in People alongside the added mentor/rival. Inspected constituency household consequences, locked programme motions and parliamentary eligibility requirements.
- Visually inspected the 390 × 844 phone layout and desktop career layout. Exercised the phone decision shortcut; no horizontal clipping observed. Browser captured no warnings or errors in this smoke check.
- Reloaded the original development-origin Alex Morgan save: still age 1, health 89, happiness 78, smarts 61, looks 40, original event/journal. No test character replaced it.
- Reloaded the LAN page to the unified app. The former #town URL opens the current life/Career entry, without a standalone town mode. Host request to `http://192.168.0.106:4173/` returned HTTP 200.

Limitations: no physical phone was used; real-device connectivity still depends on Wi-Fi/firewall and the running host. Complete political careers and legislation were exercised in engine tests, not by clicking every browser path. OS download/file-picker restore flows were not automated; payload validation and recovery storage were tested. The model is fictional and uncalibrated: accounting consistency does not establish economic realism. The UI/documents distinguish planned NEP/revolution/live-news systems from implemented play.

Completed 21 September 2026.

- Production command `pnpm run build`: passed (strict TypeScript plus Vite).
- Vitest: 15 tests passed, including 100 complete deterministic lifetimes, immutable transitions, stat bounds, action limits, choice gating, school and university progression, career requirements and promotions, retirement, death, relationships, save round trips, invalid saves and storage failure handling.
- The full-lifetime test identified a cash-blocked late-life event. Its second choice is now free, and the regression test checks that every event offers a no-cash choice.
- Browser smoke check: created a character, aged up, confirmed actions and age-up are blocked during an unresolved event, made a choice, and reloaded to confirm the resulting stats and journal persisted.
- Visually inspected the desktop dashboard and the People view at a 390 × 844 mobile viewport. No horizontal clipping observed.
- Browser console: no captured warnings or errors during the smoke check.

Full lifetime coverage runs at the engine level. The browser smoke check does not click through every possible event and career combination. Future systems require their own tests.

## Mereford milestone 1

Completed 21 September 2026 after the original MVP.

- Strict TypeScript check and production build passed.
- 29 tests passed across both engines: all 15 original tests plus 14 town and compatibility tests.
- Town coverage includes immutable seeded transitions, all four policy strategies, 40 mixed-policy 24-month experiments, counterparty balance reconciliation, affordability, three-month investment delay, five-project cap, energy pass-through, differing policy outcomes, analytical-lens neutrality, corrupted saves, unavailable storage, town/life save isolation and deterministic continuation after restoration.
- A fixed pre-politics life-save fixture loads and continues after a complete town experiment without changes to its stored bytes.
- Browser test on the production phone server: started a town, commissioned insulation, checked the month-4 promise and resulting fund balance, reloaded and verified month 1 persisted.
- Inspected the 390 × 844 phone layout and exercised its policy shortcut. Completed all 24 months through the browser controls, verified the ending and disabled advancement, and verified Accounts reported that balances reconciled.
- Browser console reported no captured errors or warnings during that playthrough.
- Reopened the original development origin and verified the prior Alex Morgan life still loaded at age 1 with its previous stats and event history.
- LAN endpoint `http://192.168.0.106:4173/` responded with HTTP 200 from the host. This is not a physical-phone connection test and still depends on the same Wi-Fi and host firewall.

Backup file export/restore is covered at the validation/storage layer; the operating-system download picker and browser file-selection flow were not automated. This prototype uses fictional economy parameters and has not been calibrated against real UK data.

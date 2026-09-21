# MVP validation

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

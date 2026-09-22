# Persistent project state

Read this file and AGENTS.md before continuing development. These files, source checkpoints and tests are the durable project record.

## Player direction

Original phone-friendly, persistent text life simulation. Develop one deep career at a time: UK politics first, law later. Politics is one optional module inside the existing character's life and Career tab; it is not the foundation for careers, finance, relationships, events or time.

Connect people, economics, ownership, institutions, philosophy and historical change. Requested influences: Socrates, Adam Smith, Marx, Lenin, Trotsky, dialectics and the NEP. Long-term ambition includes changing contemporary scenarios and transformative alternate histories. Expand through playable, reviewed milestones while preserving existing lives.

## Architecture refactor

- The life engine now owns age, birthdays, death, monthly/annual cadence and event resolution. Independent systems own careers and qualifications, personal finance, relationships, character development, geography, persistent facts, banking arithmetic and projections.
- `UKPoliticalSystem` is an installed country module. It contributes political restrictions, role income, monthly UK state, dilemmas and consequences through hooks. It no longer increments age, settles ordinary salary, advances jobs or charges personal living costs itself.
- The Mereford constituency, Parliament, national economy, banks, devolution and factions live behind the UK module. Compatibility facades preserve existing imports and saves.
- Important choices can create dated facts that remain eligible for consequences decades later. Generic reputation, fame, traits and skills persist between careers.
- Old saves load unchanged and acquire new generic records only when play continues. A one-time pre-architecture recovery copy protects the first overwrite.
- A frozen pre-refactor scenario and dependency tests protect gameplay parity and prevent country-specific imports from entering shared systems. See `ARCHITECTURE.md`.

## Implemented: one character, one political career

- Original life creation, stats, relationships, education, jobs, finances, yearly events, death and local save remain. New lives can begin at birth or age 18.
- UK adults enter politics through Career, choosing one of five parties and five intellectual influences. Existing money, age, job and history remain.
- Career views: Your work, Constituency, United Kingdom, Elections, Parliament, Ideas and Record. Legacy #town links now open Career in the same life; no standalone town screen.
- Monthly political choices and three shared activities: canvassing, casework, organising, studying, fundraising, family time and faction negotiation compete with ordinary life activities.
- Organiser, councillor, MP, minister and Prime Minister roles. Candidate selection, campaign expenses, seeded elections with possible defeat, national party seats, government/opposition and office eligibility.
- A branch mentor and rival join People. Personal/family choices affect bonds, health, reputation and party confidence. Promises are recorded; an impossible promise can damage trust when hardship contradicts it.
- Three legacy constituency bills retain their compressed stages. Seventy-two configurable national proposals and an editable tax/supply package use a richer Commons/Lords/assent process, at most one stage per month. Warm Homes grants, worker profit sharing and a property-income levy change subsequent constituency cash flows.
- Councillors and MPs can sponsor programme motions subject to a board vote and affordability; they cannot directly spend the public fund. Non-player board decisions continue without a sponsored motion.
- Constituency economy: 800 households in four cohorts, two aggregate employers, programme fund and external clearing account. Wages, rents, energy, demand, unemployment, relief and delayed insulation have recorded counterparties. Household conditions affect support; energy affects personal living costs.
- Monthly economy continues beyond the former 24-month limit, retaining savings and investment. In integrated careers, national economic conditions now replace the old repeating shock schedule; standalone archive behaviour remains compatible.
- Personal money, campaign funds and public accounts remain distinct. Outside work continues for organisers/councillors; entering Parliament ends the outside job. Role pay starts the next month.
- Twelve months produce one birthday, one year of education/job progression and yearly life events. Monthly income, expenses, tuition and debt charges are not charged again on birthdays.
- Original political dilemmas discuss Socratic consistency, competition, ownership/surplus, NEP compromises and international dependency. Selecting a thinker does not confer a success bonus.
- Autosave, validated export/import, explicit restore confirmation, pre-entry recovery snapshot and export of the earlier standalone town archive. Phone dock points to decisions and monthly advancement.

## National economics milestone

- United Kingdom view contains Briefing, Budget desk, Households & sectors, Public accounts and Sources & assumptions.
- Verified dated inputs: September 2026 Bank Rate, August CPI, May–July unemployment and headline 2026/27 HMRC tax rules. Other macro/fiscal opening totals and behavioural coefficients are explicitly fictional scenario assumptions, not a fully calibrated UK dataset.
- Seventeen editable tax/spending settings, representative marginal tax/NI calculations, static costing and distribution comparisons. Drafting is open to all; government submission requires the Prime Minister and Commons scrutiny. Only a submitted proposal is saved.
- Four sectors, demand, inflation, unemployment, confidence, sterling, independent monetary response, gilt yield and gradually repricing debt interest. Monthly public receipt/outlay ledger and debt/creditor identity. Investment has a six-month delivery queue.
- Seventy-two national legislation proposals with annual costs, uncertain delivery delays, government money-resolution support, negotiation, half-scale compromises, division counts, defeat and withdrawal. Original three constituency laws remain compatible.
- State-weighted uncertain incidents and fiscal reactions by non-player government replace repeating shocks. Recorded seeds preserve history on reload without scripting the outcome.
- Local money flows, living costs, support and dilemma weights now respond to national conditions. Housing programmes affect local rent pressure; effects are traceable through monthly reports.
- Optional national state attaches on the next month/action without replaying the old career. A one-time `turning-pages:before-national-economy` raw recovery copy is available in Finances; a failed snapshot write keeps the old primary save.
- Source tag `before-national-economy` preserves checkpoint `a65c95f`. Tests cover fiscal identities, different ten-year timelines, rates, votes, delays, old saves and recovery failures. See VALIDATION.md.

## Banking, devolution and parliamentary factions milestone

- Read INSTITUTIONS-MODEL.md before changing the new engine. Optional institutional state attaches prospectively; existing Acts without designs retain their original costs/effects.
- United Kingdom has Banking, Devolution, Factions and Forecasts desks. Banking tracks three fictional aggregate lenders, loans/deposits, capital, repayment, losses, liquidity borrowing, creditor conversion and public resolution outlays. Credit availability feeds the national growth target.
- Scotland, Wales and NI have separate simplified grants, own-revenue proxies, autonomous allocations, capacity and political pressure. Draft Budget consequentials use the same calculation as public accounts. Agreement bills require relevant consent; an override damages relations. Justice distinguishes England/Wales from Scotland/NI.
- Ten fictional ideological caucuses partition 650 seats. Party composition, priorities, trust, grievance, whip levels and twelve-month commitments affect divisions; broken promises and forced dissent leave remembered consequences. Committee and legal scrutiny affect support/delivery risk. Devolved pressure and caucus grievance feed political support/backing.
- 72 national templates (54 additional), original provisions/tradeoffs, search and 12-card pagination. Funding scale, territory, accelerated delivery and five-year sunsets change costs/effects. Reserved-law scope normalises to UK-wide. Original IDs and three constituency bills preserved. Expired Acts cannot yet be renewed/repealed.
- Forecasts run 24 isolated seeded paths over 12/24/36 months using the same engine, with energy/easing/credit stress choices and current/draft Budget assumptions. Chart/table report medians and sample percentiles, not calibrated real-world probabilities. They do not mutate the saved clock, seed or policies.
- Finances can recover the raw pre-institutions snapshot. Snapshot quota failure preserves the old primary save. Source tag before-institutions preserves 37832ea; source control is separate from browser storage.
- New regression coverage includes stressed bank accounting, statutory resolution costs, grant costings, consent, configurable laws, caucus memory, political feedback, pure forecasts and save recovery. See VALIDATION.md for final results and UI checks.

## Boundaries and next depth

This is a playable integrated career, not a complete UK economic or constitutional simulation. Mereford is a fictional English constituency. Election dates, pay, votes and economic parameters are game values. National seats use an aggregate formula; minister/PM progression is compressed. Party selection now changes internal caucus sizes; philosophical influences still supply framing rather than a complete alternative institutional system.

Still deferred: calibrated UK national accounts, full bank funding/regulation and household mortgages, production inventories, individual MPs and autonomous NPC lives, full philosophical dialogue trees, ownership transitions, NEP/revolution systems, live news, detailed devolved fiscal frameworks and law career. Aggregate banks, credit, monetary responses, factions and devolved administrations are implemented as described above. See POLITICS-VISION.md; keep the deferred systems distinct from completed features.

The national-economy expansion is now implemented inside Career. Read NATIONAL-MODEL.md for its sources, equations, units, assumptions and limits. Next realism work should deepen national accounts, fiscal institutions and party/faction behaviour within this life; do not add a separate game.

## Compatibility and accounting

- Life key remains `turning-pages:v1`, version 1. Optional validated `politics` extends the original shape; ordinary legacy lives load unchanged.
- Fixed fixture `src/engine/fixtures/life-v1.json` must not be changed merely to pass a breaking migration.
- Before first political overwrite, a valid existing nonpolitical life is copied verbatim to `turning-pages:before-career-integration`. If this write fails, the old primary save is kept. It is a one-time recovery copy, not a per-character backup history.
- Legacy `turning-pages:town:v1` remains untouched and exportable. Never silently attach this unrelated scenario to a character. Its engine/validation default still ends at 24 months for compatibility.
- Integrated career owns its economy and clock. Age equals entry age plus completed 12-month periods. No annual age-up shortcut while political life exists, even after resigning office.
- Every constituency cash transfer must have a counterparty. Account consistency does not prove behavioural realism. Personal and campaign accounts are separate abstractions outside the 800 households.
- Schema or scenario changes need explicit migrations and compatibility tests. No fixture edits to hide breakage.
- Source checkpoints do not back up browser saves; phone/desktop origins save independently. Export before resetting or moving devices.

## Local running and recovery

Project is this folder under `outputs/turning-pages`. The phone preview is port 4173. Observed LAN address: `192.168.0.106`; verify if networking changes. Phone and computer must share Wi-Fi, with the computer awake and server running.

Normal workflow: `pnpm install`, `pnpm test`, `pnpm build`, `pnpm phone`. In this restricted Windows environment:

```
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run --pool=threads --maxWorkers=1 --configLoader runner
node node_modules/vite/bin/vite.js build --configLoader runner
```

Pre-politics source ZIP: `../../work/before-politics-20260921.zip`. Local Git checkpoint `2cb1879` and tag `before-career-integration` preserve the earlier life/town implementation. Add tested commits for future milestones. Update this file, CHANGELOG.md and VALIDATION.md when behavior changes.

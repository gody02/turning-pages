# Persistent project state

Read this file and AGENTS.md before continuing development. These files, source checkpoints and tests are the durable project record.

## Player direction

Original phone-friendly text life simulation. Develop one deep career at a time: UK politics first, law later. Politics must be inside the existing character's life and Career tab. Do not recreate a separate politics game or mode switcher.

Connect people, economics, ownership, institutions, philosophy and historical change. Requested influences: Socrates, Adam Smith, Marx, Lenin, Trotsky, dialectics and the NEP. Long-term ambition includes changing contemporary scenarios and transformative alternate histories. Expand through playable, reviewed milestones while preserving existing lives.

## Implemented: one character, one political career

- Original life creation, stats, relationships, education, jobs, finances, yearly events, death and local save remain. New lives can begin at birth or age 18.
- UK adults enter politics through Career, choosing one of five parties and five intellectual influences. Existing money, age, job and history remain.
- Career views: Your work, Constituency, Elections, Parliament, Ideas and Record. Legacy #town links now open Career in the same life; no standalone town screen.
- Monthly political choices and three shared activities: canvassing, casework, organising, studying, fundraising, family time and faction negotiation compete with ordinary life activities.
- Organiser, councillor, MP, minister and Prime Minister roles. Candidate selection, campaign expenses, seeded elections with possible defeat, national party seats, government/opposition and office eligibility.
- A branch mentor and rival join People. Personal/family choices affect bonds, health, reputation and party confidence. Promises are recorded; an impossible promise can damage trust when hardship contradicts it.
- Bills pass through compressed Commons/Lords/assent stages, at most one stage per month. Warm Homes grants, worker profit sharing and a property-income levy change subsequent constituency cash flows.
- Councillors and MPs can sponsor programme motions subject to a board vote and affordability; they cannot directly spend the public fund. Non-player board decisions continue without a sponsored motion.
- Constituency economy: 800 households in four cohorts, two aggregate employers, programme fund and external clearing account. Wages, rents, energy, demand, unemployment, relief and delayed insulation have recorded counterparties. Household conditions affect support; energy affects personal living costs.
- Monthly economy continues beyond the former 24-month limit, retaining savings and investment. Fictional shocks cycle every 24 months.
- Personal money, campaign funds and public accounts remain distinct. Outside work continues for organisers/councillors; entering Parliament ends the outside job. Role pay starts the next month.
- Twelve months produce one birthday, one year of education/job progression and yearly life events. Monthly income, expenses, tuition and debt charges are not charged again on birthdays.
- Original political dilemmas discuss Socratic consistency, competition, ownership/surplus, NEP compromises and international dependency. Selecting a thinker does not confer a success bonus.
- Autosave, validated export/import, explicit restore confirmation, pre-entry recovery snapshot and export of the earlier standalone town archive. Phone dock points to decisions and monthly advancement.

## Boundaries and next depth

This is a playable integrated career, not a complete UK economic or constitutional simulation. Mereford is a fictional English constituency. Election dates, pay, votes and economic parameters are game values. National seats use an aggregate formula; minister/PM progression is compressed. Party and philosophical selections currently supply identity/framing, not distinct full institutional simulations.

Still deferred: calibrated UK national accounts, banks/credit/monetary policy, production inventories, detailed factions and autonomous NPC lives, full philosophical dialogue trees, ownership transitions, NEP/revolution systems, live news, devolved institutions and law career. See POLITICS-VISION.md. Do not describe these as implemented.

Next refinement should deepen political decisions and competing interests inside this career. Gather feedback after 6–12 months and an election. Improve faction/party distinctions, constituent cases and remembered consequences before adding a disconnected national dashboard.

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

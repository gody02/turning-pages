# Banking, devolution, parliamentary factions and conditional outlooks

Implemented 21 September 2026, within Turning Pages' existing UK career. Read with NATIONAL-MODEL.md. This is a playable institutional expansion with explicit simplifications, not a full replica of British government or a validated economic forecasting service.

## Research and the boundary between evidence and invention

- Bank lending creates matching deposits; capital and liquidity constrain it. [Bank of England, Money creation in the modern economy](https://www.bankofengland.co.uk/quarterly-bulletin/2014/q1/money-creation-in-the-modern-economy).
- Changes in comparable spending, population proportions and comparability inform Barnett consequentials. [HM Treasury, devolved funding and Barnett](https://www.gov.uk/government/publications/devolved-administration-funding-and-the-barnett-formula/devolved-administration-funding-and-the-barnett-formula).
- Legislative consent is part of a political convention; it is not an absolute legal veto on Westminster. [Commons Library, legislative consent](https://commonslibrary.parliament.uk/research-briefings/cbp-11016/).
- Whips organise parliamentary business and party voting. The numerical effects on rebellion used here are fictional. [UK Parliament, whips](https://www.parliament.uk/about/mps-and-lords/principal/whips/).
- Energy and financing uncertainty inform the scenario topics. Shock sizes and simulated ranges are authored assumptions, not predictions or probabilities supplied by the Bank. [September 2026 MPC statement](https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2026/september-2026).

All bank books, regional settlements, population ratios, caucus membership, behavioural coefficients and proposed Acts below are game assumptions. Sources were checked for this milestone; there is no automatic news ingestion. A saved alternate history does not silently change when real-world news changes.

## Banking

Three fictional aggregate lenders start with total mortgages £1,400bn, business credit £600bn, reserves £250bn and gilts £300bn. Assets £2,550bn equal deposits £2,300bn + wholesale funding £100bn + equity £150bn. All national amounts are £bn; the mortgage example on the screen uses ordinary pounds.

Monthly booking rules:

1. New lending adds loans and deposits by equal amounts. Desired lending depends on confidence and enacted policies; available capital constrains actual lending. The banks differ in the mortgage/business mix of new credit.
2. Repayment reduces loans and deposits. Defaults reduce loan assets and equity. Loan interest moves deposits to equity; deposit interest and operating costs move equity to deposits.
3. Cash withdrawals reduce reserves and deposits; withdrawn cash accumulates in `cashOutside`. Low liquidity can trigger collateralised central-bank borrowing, adding reserves and a matching liability.
4. If capital drops below the model's 5% threshold, wholesale creditors convert claims into equity first. Any remaining gap to the 10% resolution target is a public recapitalisation: bank reserves/equity rise and the Treasury records that month's public outlay. An asset-accounting treatment of public equity holdings is not implemented, so this conservatively increases the simplified net-debt measure.
5. Actual/desired credit supply feeds the macro financing drag. Arrears respond to unemployment and mortgage repricing. Low confidence increases credit losses and withdrawal pressure. Bank Rate remains independently determined by the national monetary rule; the player cannot order it from the banking screen.

Risk weights (35% mortgages, 80% business loans, 5% gilts), capital thresholds, collateral haircut, repayments and behavioural responses are model choices, not the full PRA/Basel regulatory regime. Mortgage-book rates adjust gradually over 24 months; business rates respond more quickly. The monthly £200,000/25-year repayment illustration is not the player's actual mortgage, a product offer or a household-level refinancing schedule.

Delivered banking laws have scaled channels: bank resilience raises target buffers; SME guarantees and mutual support raise desired lending; affordability rules restrain new credit; forbearance reduces losses; resolution preparation and fraud enforcement reduce withdrawal pressure, while fraud administration increases operating costs. Public programme costs are annual envelopes. There is no stock of individual loan guarantees or a separate funded resolution reserve. Other law effects use the national institutional indices.

Banks are linked to the macro model but their private balance sheets are not fully consolidated with Treasury bond ownership, firms, households and the external sector. Missing: interbank payments, funding maturities, wholesale interest, securities repricing, mortgage cohorts, actual deposit-insurance eligibility and limits, individual insolvencies, and detailed PRA/FCA decisions. Do not claim complete stock-flow-consistent national accounts.

## Devolution

Scotland, Wales and Northern Ireland have separate fictional opening grant/revenue envelopes, autonomous health and education allocation shares, service-capacity indices, relationship scores and political pressure. Westminster negotiates; it does not set those allocation shares.

The simplified grant calculation is an inflation-adjusted opening grant plus the region's population ratio multiplied by changes from the starting health/education budgets and 90% of transport changes. Negative consequentials are possible, with a model floor at half the opening grant. Opening grants total £89bn and replace £89bn of the earlier £190bn other-expenditure envelope, so attachment does not create double spending. Draft costings and actual public accounts use the same grant helper. Own revenue scales with national output/prices; detailed devolved tax schedules and block-grant adjustments are not present.

Devolved governments can shift their own allocations each month in response to service capacity. Real resources, service outcomes and working relationships affect pressure. High intergovernmental pressure affects incumbent public support; this is a modest game coefficient, not an empirical constitutional-risk estimate. Delivering the cooperation framework improves relationships.

New devolved-policy bills can apply to the home jurisdiction, seek agreement across affected administrations, or proceed without consent. Justice templates treat England and Wales together, seeking agreement from Scotland and Northern Ireland; other devolved templates default to England. Real reservations vary within an area, so this broad catalogue mapping is explicitly incomplete. An agreement bill is blocked before completion until relevant consents are secured; that is the player's chosen political commitment, not a claim of a legal veto. An override at introduction damages relations and increases implementation risk. Consent attempts are uncertain and depend on relationship, consultation and political pressure.

Missing: devolved elections and named parties, NI power-sharing and institutional suspension, detailed Scotland/Wales/NI fiscal frameworks, tax autonomy, borrowing limits, English combined authorities, city-region deals, public-service waiting lists and comprehensive territorial competence by clause.

## Parliamentary factions and legislation

Ten fictional caucuses partition 650 model seats: five in the player's party and five aggregate opposition groups. The player's party affects internal group sizes. These are ideological groupings, not a current real-MP database. Elections reallocate seats while preserving faction relationships and commitments.

Every division draws attendance and individual votes. Party position, policy priorities, trust, discipline, grievances, wider party backing, negotiation, controversy and a common division swing affect probabilities. Fiscal groups weigh ongoing cost; labour groups weigh protections; climate groups weigh energy exposure; liberties groups resist consent overrides; pragmatists question rushed delivery with limited capacity. The Factions screen explains the current concerns. Individual MP identities, committee memberships and geographical interests are not modelled.

The player can negotiate, promise a measure in a caucus's priority area within twelve months, commission committee evidence, seek legal review and—at minister/PM level in this career—request a whip level. Promises are checked against subsequent enactments: kept and broken commitments alter trust/grievance. A three-line whip raises support but leaves resentment among dissenters. Seat-weighted party grievance feeds wider party backing. Committee evidence helps support and delivery preparation; legal review reduces an implementation-risk index, not an independent simulated court case.

There are **72 national policy templates**, plus the three preserved earlier constituency bills. Each has original provisions, cost, delivery delay, controversy, effects and tradeoffs. Search/filter/pagination keep the catalogue manageable on a phone. A new bill may be targeted/standard/expanded (50/100/150%), standard/accelerated, home/agreement/override where applicable, ongoing/five-year sunset. Reserved proposals normalise to UK-wide scope. Faster delivery costs 25% more, shortens the initial timetable to 65% (rounded up) and raises implementation risk. Home-jurisdiction effects/costs use explicit 84% or 89% scenario weights, not precise fiscal shares.

An amended compromise fixes both the programme intensity and design scale at 50%. Five-year sunset is measured from enactment; recurring costs and ongoing market effects stop, while already-completed capacity is not deleted. The enacted record remains. Repeal, renewal and clause-by-clause amendments remain future work; a template cannot currently be enacted twice. Additional templates are not counted as hundreds of independent legal systems merely because they accept different settings.

## Conditional forecasts

Anyone can run 24 alternative paths over 12, 24 or 36 months. The engine clones the current national state, salts separate random seeds, assumes the selected current/draft Budget is in force, and advances the same macro/institution engine. It holds that Budget fixed, excludes future political choices and does not enact the pending proposal. It does not consume the real timeline's random sequence, activities or clock. Working drafts and results are temporary UI comparisons, not saved government commitments.

Scenarios: no imposed shock; imported-energy pressure; energy supply normalisation; severe credit stress. The credit stress writes off 4% of loan books against equity, adds five arrears-index points and withdraws up to 10% of deposits subject to reserves, alongside demand/confidence shocks. These are stress assumptions, not estimated likelihoods. Balance-sheet counterparts are preserved before simulated recovery/resolution.

The desk displays monthly medians and 10th–90th sample percentiles, including a chart and quarterly table. With 24 paths, these are coarse empirical quantiles, not confidence intervals or calibrated real-world probabilities. Results become visibly stale when the live state, policy assumptions or selected scenario change. Forecast paths retain lightweight metric snapshots to avoid storing dozens of full histories.

## Compatibility and extension points

`national.institutions` and bill designs are optional additions to version 1. Old lives load unchanged; institutions attach prospectively. Existing Acts without a design preserve their original full-territory costs and effects. A raw `turning-pages:before-institutions` snapshot is written once before an older national save is replaced. If that write fails, the previous primary save stays intact. Finances provides confirmed recovery. Source tag `before-institutions` preserves commit `37832ea`; browser saves and source commits are different kinds of protection.

UK simulation code lives in `engine/politics/uk/institutions.ts`, `institutionActions.ts` and `forecast.ts`; the former root paths are compatibility facades. Reusable bank accounting and projection mathematics live in `engine/systems/`. Content/source/scenario data remains in `data/institutions.ts`. Save validation checks bank accounting, IDs, bounds, factions/seats, clocks and the existing fiscal invariants. New required fields need a migration. The fixed original life fixture must remain untouched.

Next depth should build on these state machines: individual MPs and parties, confidence/supply and coalitions, real devolved mandates, richer bank funding/household mortgages, bill clauses/repeal, departmental delivery constraints and distribution by region. Historical ownership transformations, NEP and revolutionary institutions remain planned systems inside this same character's life.

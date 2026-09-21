# National economy: model contract and research record

Implemented 21 September 2026 inside Turning Pages' UK career. This is a transparent, playable macroeconomic model, not a claim to reproduce the UK to the smallest detail. Preserve the distinction between verified starting rules, scenario assumptions and simulated developments.

## Starting evidence

| Starting input | Value used | Source / reference period |
| --- | --- | --- |
| CPI inflation | 3.1% | ONS, August 2026 bulletin, released 16 September 2026 |
| Unemployment | 4.9% | ONS, May–July 2026 headline series |
| Bank Rate | 3.75% | Bank of England, September 2026 decision |
| Income Tax | 20%, 40%, 45%; allowance £12,570 | HMRC 2026/27, England/Wales/NI non-savings schedule |
| Allowance taper | £1 per £2 above £100,000 | HMRC Income Tax guidance |
| Employee NI | 8% main, 2% upper | HMRC 2026/27 standard employee category |
| Employer NI | 15% above the modelled £5,000 threshold | HMRC 2026/27 standard employer category |
| Standard VAT | 20% | HMRC VAT rates |
| Main Corporation Tax | 25% | HMRC rates; small-profits/marginal relief not modelled |

Direct sources are in `src/data/national.ts` and the in-game Sources & assumptions view. OBR March 2026 supplies fiscal context, not a forecast reproduced by this engine. The £3,050bn output and £2,950bn net debt opening totals, all spending envelopes, sector weights, earners and elasticities are explicit scenario assumptions. Do not label these official estimates.

## Units and accounting

- All national fiscal flows: **£bn per month**. Budget inputs: rates in percentage points or nominal **£bn per year**. Personal/local money remains pounds.
- Output: annualised nominal output = real output × price index; four sector outputs sum to the real-output total. Output pace is monthly growth annualised, not an official year-on-year observation.
- Fiscal identity each month: borrowing = spending − receipts; closing net debt = opening net debt + borrowing. Matching net bondholder claims move by the same amount. If repeated surpluses drive net debt below zero, this represents a net public asset position; it does not create negative interest expense.
- Receipts: marginal Income Tax and NI on four representative earnings groups, employer NI, taxable-consumption VAT proxy, corporate-profit tax proxy, and explicit other receipts.
- Spending: nine Budget envelopes, other primary spending, enacted national programme costs and debt interest. Unemployment increases welfare outlays automatically.
- The model tracks public cash flows and financing claims, **not** all private financial stocks, bank money creation, foreign balance sheets, gross debt maturities, asset valuation or ONS stock-flow adjustments.
- Constituency accounts are a representative satellite economy. Their transfers reconcile internally but are not added to national totals. Never sum the two ledgers as if they were a consolidated UK national account.

## Transmission and uncertainty

1. Draw uncertain incidents with probabilities affected by current conditions. Inflation and worker protections influence strike risk; debt/financing conditions influence credit stress. Each incident has an eight-month repeat cooldown. Quiet months remain possible.
2. Energy and overseas demand drift and respond to incidents. Sterling also changes with relative rates, confidence and uncertainty. None follows the former repeating 24-month local shock table.
3. Taxes affect a demand target; all tax inputs have effects, including higher/additional rates and the allowance. Spending envelopes and enacted programmes affect demand. These coefficients are contestable game assumptions, not estimated causal effects.
4. Four sectors respond differently to energy and trade exposure. Their output evolves with inertia and random variation. Employment, inflation and confidence respond to conditions, with explicit bounds to avoid invalid states.
5. An independent monetary-policy rule weighs inflation and activity, with quarter-point rate moves and uncertain timing. The player cannot set Bank Rate. This is not a replica of MPC deliberations or a calendar of eight scheduled meetings.
6. Gilt yields respond to rates, debt/output and confidence. Only 1/120 of the effective debt rate moves towards the new yield each month, approximating gradual refinancing.
7. Capital spending enters a six-month delivery pipeline; changing this month's budget cannot retroactively change completed investment. Education and health spending gradually affect capacity. Enacted programmes have separate 3–24 month delivery schedules that may slip with skills shortages.
8. National conditions feed local energy/orders, grants, pensions, unemployment support, tax changes and essentials. Housing capacity affects local rent pressure; stronger worker protections raise local wages as well as reducing dispute risk, increasing employer payroll costs. Delivered energy and trade reforms change persistent conditions instead of fading back to the old baseline. Personal living costs follow prices and VAT; changes in Income Tax/NI affect pay relative to the old take-home baseline using a stated gross proxy. Existing salaries are not taxed a second time.
9. National performance changes incumbent/opposition support differently and weights political dilemmas. Non-player governments may react through an abstracted fiscal adjustment. Full non-player parliamentary simulation remains deferred.

Randomness is saved and reproducible so reloads preserve continuity. A deterministic random generator is not a scripted outcome: differing seeds, decisions and conditions generate different histories. Do not promise literally unpredictable or inevitable results.

## Legislation and authority

- Budget desk: 17 settings; anyone can compare a working draft. Only the Prime Minister in a governing majority can commission and submit the package in this career. The existing housing minister role is not a Chancellor role. A working comparison is temporary; a submitted proposal is saved.
- A Budget package freezes its submitted values and passes through debate/Ways and Means, Finance Bill scrutiny, Supply/appropriation, Lords financial scrutiny and assent. In reality taxation and spending authorisation are separate procedures; this UI bundles them explicitly. Do not claim every Finance Bill is a certified Money Bill.
- 18 original national proposals supplement the 3 earlier constituency laws. They are proposed fictional Acts, not a catalogue of existing UK legislation. Each has annual cost, delivery delay, controversy and institutional effects.
- MPs need government support for a money resolution on these spending proposals. Negotiation can secure it. Introduction alone spends nothing. Ministerial appointment does not remove parliamentary scrutiny.
- Commons divisions count 650 model seats, allowing abstention and uncertain rebellion. These are aggregate MPs, not the real current membership/constituency map. Negotiation and half-scale amendments improve support without guaranteeing success.
- Ordinary bills can be delayed by Lords scrutiny. Financial scrutiny does not invent an unrestricted Lords veto over taxation. Royal Assent is not a random royal veto.
- Defeat removes the proposal; reintroducing requires another action. Withdrawal costs an action but changes no policy. Losing the seat or resigning clears the pending proposal. Enacted laws remain in the timeline.
- All political transitions use the existing character's shared activity pool and choice locks. Death freezes advancement.

## Save compatibility

The optional `politics.national` object is schema version 1, scenario `uk-2026-09`. Its `introduced` field records the existing career month at attachment. It starts on the next monthly or national legislative action, without retroactively simulating earlier years. Ordinary lives and older career saves load unchanged.

Before the first national overwrite of an older political save, `turning-pages:before-national-economy` preserves the raw previous life once. Finances can recover it after confirmation. A failed backup write prevents primary replacement. This is a one-time device recovery snapshot, not unlimited history. Source tag `before-national-economy` preserves the previous implementation.

Validation checks numeric bounds, known proposals, unique enacted laws, frozen budgets, the investment pipeline, exact chronological debt/borrowing identities, sector totals, vote totals and agreement with the career clock. Future required fields need a migration.

## Next realism work

Replace approximate national aggregates with versioned ONS/OBR data and sensitivities; add full household types and benefit eligibility, Scottish schedules, devolved budgets/Barnett mechanics, profit and investment accounting, imports/exports/current account, banks and mortgages, actual constituency/party/faction representation, Chancellor and Treasury team roles, amendment clauses, parliamentary calendar, confidence/supply and dissolution. Add repeal/expiry and maintenance of Acts. Full NEP, ownership transitions and revolutionary institutions remain separate future systems inside this career.

The current tests establish playable consequences, accounting identities and save reliability. They do not establish empirical UK calibration or political realism.


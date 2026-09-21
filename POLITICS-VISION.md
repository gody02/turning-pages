# Turning Pages: UK political simulation vision

Status: long-term proposed design, recorded from the player's requested direction. The first fictional town-economy milestone is now implemented; the national political and revolutionary systems remain proposed. See PROJECT-STATE.md for the exact implementation boundary. Build incrementally and review each playable milestone with the player.

## Experience

Live as a person embedded in a changing UK society. Develop beliefs, join or build institutions, organise politically, seek office, govern, and potentially participate in an alternate-history transformation of the political and economic order. Personal relationships, material circumstances and political commitments should shape one another.

Depth means consequential decisions, memory, institutional constraints and understandable causal relationships. It does not require every variable to directly change every other variable. Connect systems through explicit mechanisms, delays, thresholds and feedback.

## Intellectual foundations

- Socratic inquiry: dialogues test the player's commitments, definitions and consistency. Distinguish this method from an economic doctrine. NPCs can expose contradictions and the player can revise their beliefs.
- Adam Smith: division of labour, exchange, competition, moral judgement, justice and concerns about concentrated interests. Avoid presenting him as simply an advocate of unregulated selfishness.
- Marx: ownership of productive assets, wage labour, surplus appropriation, accumulation, alienation, class organisation and historical change. Distinguish Marx's own writing from subsequent, internally diverse Marxist traditions. Labour-value concepts and market prices must not be silently treated as identical.
- Lenin and the NEP: political organisation, state power and compromises during economic transition. An NEP-inspired game arrangement would allow specified private trade and production within a system retaining specified public control. It is an analogy for alternate-history play, not a claim that contemporary Britain resembles early Soviet Russia.
- Trotsky: uneven development, international dependence, permanent revolution and the relationship between domestic transformation and international conditions. Keep his arguments distinct from Lenin's rather than providing interchangeable leader bonuses.
- Dialectics: model historically changing relationships, internal tensions and how interventions alter the conditions of later decisions. Do not implement a universal thesis-antithesis-synthesis formula or guarantee an inevitable historical endpoint.

Additional schools should eventually offer serious alternatives, including Keynesian, institutionalist, social-democratic, ecological and other market-oriented approaches. No ideology receives automatic success or failure.

## Economy

Use a dated, sourced UK starting scenario. ONS national and sector accounts provide a foundation for consistent relationships between production, income, consumption, investment and wealth. Use Bank of England materials for monetary institutions and OBR material for public finances and forecast uncertainty.

Represent households in cohorts rather than millions of individual agents. Cohorts differ by region, income, tenure, employment, assets, age and other relevant characteristics. People have overlapping interests; class position does not mechanically determine beliefs or votes.

Begin with households, firms, government, banks and the foreign sector. Track stocks separately from flows: wealth versus income, debt versus deficit, productive capacity versus current output. Trace financial transactions to counterparties. Government finance must not be modelled as identical to a household budget.

Expand into energy, housing, food, manufacturing, finance and other services. Firms need inputs, workers, finance and demand. Capacity and construction take time; demand cannot instantly produce buildings, nurses or electricity infrastructure. Public, private and cooperative ownership should change governance and distribution mechanisms, not apply arbitrary productivity bonuses.

Model wages, prices, output, employment, profits, investment, taxation, transfers, borrowing, debt servicing, trade, exchange rates and public-service capacity. Start with a small documented model; add detail only when it supports a decision or explains an observed failure.

Separate accounting identities from disputed behavioural assumptions. The first must hold; the second need documented parameters, sensitivity tests and alternative interpretations. Advisors should disagree about forecasts. The player sees uncertainty and delayed consequences rather than perfect prediction.

## Politics and institutions

Build authority appropriate to the player's role. An activist cannot set the national budget, a councillor cannot set Bank Rate, and a head of government cannot assume institutions have no autonomy.

Research contemporary UK electoral systems, Parliament, Cabinet, the civil service, courts, councils, devolved administrations and the Bank of England before implementing their powers. Institutions can change in alternate history, but such changes need political processes and consequences.

Give parties, unions, businesses, civil-society groups and media organisations their own interests, memberships, finances, internal factions and institutional memories. NPCs remember promises, appointments, compromises and personal treatment. Distinguish support, legitimacy, trust, fear and compliance.

Reformist, electoral, cooperative, revolutionary and mixed paths belong in the long-term design. Represent constitutional transformation, competing claims to authority, coalition fractures and international reactions at the strategic simulation level. Include the human consequences of repression, conflict and economic disruption, without treating them as trivial efficiency modifiers.

## Current events and time

Offer two separate future modes:

1. Dated alternate history: a sourced real-world starting snapshot, after which events emerge from the simulated world.
2. Optional contemporary scenario updates: reviewed, attributed, dated external developments that the player chooses to import when compatible with their timeline.

Do not silently overwrite a player's alternate history with real-world headlines. Distinguish historical facts, model forecasts and fictional in-game news. Automated updates are a future feature, not an active service.

Political play needs monthly turns, with shorter decision sequences for crises or campaigns. Quiet life periods may still advance in larger intervals. This requires explicit integration with the current annual engine so money, education and ageing are not counted twice.

## Explainable consequences

Every major change should expose a causal history: what changed, which mechanisms contributed, when the change took effect and which groups gained or lost. Prefer decomposed indicators over a single ideological success score.

Illustrative energy scenario: higher import costs increase production costs and household bills. Responses may affect margins, wages, spending and investment. Household effects differ by income and energy exposure. Political responses depend on organisation, credibility, institutions and choices. None of these links should force a single predetermined result.

An NEP-inspired scenario could explore whether partial market reopening improves distribution, how emerging private fortunes change political influence, and whether compromises stabilise or undermine the player's coalition. Outcomes depend on modelled circumstances, not the policy's historical label.

## Build sequence and acceptance gates

1. Living economy prototype: one fictional UK town in a simplified national setting, diverse households, several firms, housing and energy costs. Run 24 monthly turns. Check accounting, bounds, delays and repeatability. Explain who gained and lost under contrasting interventions.
2. Political formation: background, values, philosophical conversations, local organisations and remembered commitments. Make economic conditions visible through people's lives.
3. Local power: campaigns, elections, lawful local authority, budgets, coalition negotiations and service delivery. Winning and losing both continue the story.
4. National government: researched UK powers and constraints, fiscal choices, independent monetary decisions, sector interactions and international shocks.
5. Institutional transformation: alternative ownership arrangements, reform and revolutionary scenarios, NEP-inspired transitions, factional conflict and international dependence. These rely on the earlier economic and institutional foundations.

For each milestone: research a bounded topic, document sources and assumptions, specify player decisions, implement a small playable scenario, test consequences, ask the player what feels shallow or missing, and revise before expanding.

## Research starting points

- Socrates and the limits of historical attribution: https://plato.stanford.edu/entries/socrates/
- Socratic questioning: https://plato.stanford.edu/entries/plato-ethics-shorter/
- Smith's moral and political philosophy: https://plato.stanford.edu/entries/smith-moral-political/
- Marx and contested interpretations: https://plato.stanford.edu/entries/marx/
- Lenin, The New Economic Policy and the Tasks of the Political Education Departments (1921): https://www.marxists.org/archive/lenin/works/1921/oct/17.htm
- Trotsky, What Is the Permanent Revolution?: https://www.marxists.org/archive/trotsky/1931/tpr/pr10.htm
- ONS national accounts: https://www.ons.gov.uk/economy/nationalaccounts
- Bank of England monetary policy: https://www.bankofengland.co.uk/monetary-policy
- OBR outlooks and forecast uncertainty: https://obr.uk/economic-and-fiscal-outlooks/

Historical political writings are primary evidence of their authors' arguments, not neutral confirmation of every empirical claim. This document is an initial design synthesis, not an exhaustive literature review or calibrated economic model.

# Life-simulation architecture

Turning Pages is a persistent life simulation. UK politics is one optional life path that uses the same character, clock, career, finances, relationships and memories as every future path.

## Dependency rule

```text
React UI
  -> simulation coordinator
       -> core life cycle + reusable systems
       -> installed life-path modules
            -> UK political system
                 -> UK nation, Parliament, constituency and institutions
```

Dependencies point down this diagram. `core/` and `systems/` cannot import the UK module, React, the application `Game` composition, or old compatibility facades. The coordinator selects modules by country and active state. A module can contribute monthly finance, action restrictions, events and consequences through `SimulationModule`; it cannot own birthdays, age, ordinary career progression or personal cash settlement.

`engine/game.ts`, `engine/politics.ts`, `engine/national.ts`, `engine/town.ts` and related files are temporary compatibility facades. They preserve existing imports and save behaviour while forwarding to the new owners.

## Audit and ownership

| Mechanic | Owner after refactor | Reason |
| --- | --- | --- |
| Age, death, annual/monthly time | `engine/core/life.ts`, `core/clock.ts` | Every life path shares one clock. |
| Character stats, traits, skills, fame, reputation | `engine/systems/character.ts` | Careers may affect these; none owns the character. |
| Jobs, pay grades, education, qualifications, unemployment | `engine/systems/careers.ts` | Shared by politics, law and ordinary lives. |
| Personal income, expenses, cash and account transfers | `engine/systems/finance.ts` | One settlement prevents duplicate salary or costs. |
| Family, friends and professional connections | `engine/systems/relationships.ts` | Relationships persist between careers. |
| Events, choices and eligibility | `engine/systems/events.ts` | Content modules supply data and predicates. |
| Decisions remembered across decades | `engine/systems/history.ts` | Persistent facts can gate later events and careers. |
| Countries and location lookup | `engine/systems/geography.ts` | Country modules consume location rather than defining it. |
| Bank accounting and conditional projections | `engine/systems/banking.ts`, `systems/projections.ts` | Reusable mathematical mechanisms with injected country policy. |
| Parties, factions, seats, elections and offices | `engine/politics/uk/` | UK political configuration. |
| Commons, Lords, bills, Budget and government formation | `engine/politics/uk/` | UK constitutional behaviour. |
| Mereford constituency and UK national institutions | `engine/politics/uk/` | Current content and rules are UK-specific. |

The national economy remains inside the UK country module because its institutions, taxes, currency assumptions and legislation are UK-specific. Reusable accounting and projection mathematics have been extracted. A later non-political UK world module may share the national state, but the generic life engine must not acquire UK concepts.

## Module contract

A life-path module implements only the hooks it needs: prepare old state, block actions, alter an action, quote monthly finances, update its own monthly state, react to birthdays, choose a pending event, or record death. Multiple modules can coexist. The coordinator rejects two modules that both try to replace a character's ordinary income, making double payment an explicit error.

The implemented registry contains only `UKPoliticalSystem`. A future `USPoliticalSystem` or `NigerianPoliticalSystem` would implement the same country-neutral political interface and bring its own institutions and content. Neither exists yet.

## Persistence and compatibility

Old saves remain valid byte-for-byte. Generic clock, finance, character-development and fact records attach prospectively when play continues. The UK adapter mirrors legacy political fields at the boundary while generic systems remain unaware of them. The first write of an older save preserves a one-time `before-life-architecture` recovery copy; a failed recovery write prevents the primary save from being replaced.

Facts store important decisions with their life month, source and tags. They are intentionally separate from the readable journal so a childhood promise can affect a career or relationship decades later without parsing prose.

## Verification boundary

The architecture suite freezes representative pre-refactor outputs for an ordinary 35-year life, four political years, an election, banks and a Budget. It also checks non-political monthly lives, mid-year political entry, save migration, decades-old facts, module conflict handling and import direction. Feature tests continue to cover detailed UK behaviour.

Current transitional debt is explicit: presentation components still read the optional `politics` state to render UK screens, old public import paths remain as facades, and UK data files remain under `src/data`. These do not reverse engine ownership and can be moved incrementally without changing saves.

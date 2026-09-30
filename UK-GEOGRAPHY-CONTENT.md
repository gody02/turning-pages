# UK Geography Content v1

`geography.uk.primary-local-admin-2024-06-30-v1` is the immutable production administrative allocation geography for the UK mid-2024 population universe. It contains 366 durable Place identities and 366 boundary-era nodes:

- one United Kingdom root;
- England, Wales, Scotland and Northern Ireland as four non-allocation children;
- 296 English, 22 Welsh, 32 Scottish and 11 Northern Irish local administrative allocation leaves.

The 361 leaves are a functional population-allocation partition. Their legal forms remain distinct through namespaced `kindId` values: English unitary authorities, non-metropolitan districts, metropolitan districts, London boroughs, City of London and Isles of Scilly; Welsh principal areas; Scottish council areas; and Northern Ireland local government districts. Greater London is not an intermediate node. Jersey, Guernsey, the Isle of Man and Overseas Territories are outside the represented UK universe.

## Evidence and integrity

The primary source is the ONS Open Geography Local Authority Districts May 2024 feature service. Only `LAD24CD`, `LAD24NM` and `LAD24NMW` attributes are pinned; geometry is deliberately excluded. Exact item and layer metadata pin the authoritative service and vintage. The ONS detailed mid-2024 population workbook is used only to prove exact equality of all 361 area codes, names and country assignments. Its population counts do not enter Geography.

Every source artifact has an expected byte length, SHA-256, schema and attribution record in `source-manifest.json`. The production integrity gate checks those values, compiled-file hashes, workbook structure and immutable package manifests before a production build. Source: Office for National Statistics, licensed under the Open Government Licence v3.0. Contains OS data © Crown copyright and database right 2024.

The geographic inventory is the official May 2024 snapshot. The partition effective date is 30 June 2024 because that is the target population reference date and the identical 361-area inventory was verified against the detailed mid-2024 workbook. This does not claim that the geography artifact itself is a June 30 boundary release.

## Identity and continuity

Local durable identities use `place.uk.local-admin.<initial-gss-code-lowercase>`. The suffix is an opaque token derived from the first accepted source code; a later code change does not automatically rewrite the Place ID. Root and constituent-country identities are explicit. Every Place has `countryId = uk`.

The reviewed continuity ledger maps each 2024 source-code instance to its durable Place ID and records all 361 mappings as new identities for this first package. Future rename or boundary updates may retain an ID only after reviewed evidence of continuing institutional identity. A split, merger or replacement creates successor IDs. Similar names or geographic overlap alone do not establish continuity. Ledger semantic fingerprint: `fnv1a64-v1:c60b905114c649e2`.

The Place identity manifest fingerprint is `fnv1a64-v1:80bb4cbc94a271ee`. The partition fingerprint is `fnv1a64-v1:3d1a3446a16c58cb`. Once persisted production state references this partition ID, later builds must retain these exact immutable contracts; changed boundaries require a new partition ID.

## Scope

This package supplies administrative allocation identity and containment only. It has no settlement meaning: for example, the City of Bradford Metropolitan District is not the Bradford settlement. It contains no geometry, coordinates, centroids, adjacency, routing, neighbourhoods, postcodes, constituencies, residence, presence or travel.

Current production population remains unchanged and geographically unallocated: `PopulationCoverage.areaPartitionId`, cohort `areaId` and membership `areaId` remain null. Candidate `uk.population.mid-2024.v3` proves exact geographic allocation against this partition, but failed its browser persistence gate and remains unregistered. No PopulationState, root, migration, recovery or Country Start semantics changed. See `UK-GEOGRAPHIC-POPULATION-ALLOCATION.md`.

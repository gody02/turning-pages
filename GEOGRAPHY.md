# Geography Foundation v1

Geography is immutable runtime content outside canonical Game state. A durable `PlaceIdentityV1` contains only `placeId` and `countryId`. Display name, opaque namespaced `kindId`, parent containment, population-allocation status and source references belong to an immutable boundary-era partition package.

`placeId` identifies a continuing conceptual or legal Place. A rename or boundary revision may retain it. A true split or merger creates successor Place IDs. A separate identity manifest fingerprints the exact durable `{ placeId, countryId }` contract without moving boundary-era properties into identity. `partitionId` identifies one exact hierarchy/boundary contract, so `partitionId + placeId` is the exact geographic area reference. Registered Place and partition IDs and their fingerprints are immutable and must remain bundled once persisted state can refer to them.

Each partition is one country-scoped rooted tree. It is connected and acyclic, has one root, and gives every other node one parent. Population allocation cells are explicitly marked leaves; an unmarked leaf is not an allocation cell. All hierarchy operations require `partitionId`, because a Place has no global parent or ancestor relationship.

Canonical packages and registries are deeply immutable plain JSON. `createGeographyRuntime` builds closure-private Maps and child indexes as disposable runtime derivatives. No Map, cache, index or lazy state is attached to canonical Geography data. Package validation uses iterative traversal and imposes no modelling cap on Place count, node count, source count or hierarchy depth; ordinary technical string and JavaScript safe-integer protections remain.

Frozen PopulationState v1 already stores `PopulationCoverage.areaPartitionId` plus cohort and membership `areaId`. Geography interprets those opaque values without changing their schema. Validation is coverage-scoped and uses only canonical Population country assignments. It never derives country from an area, partition, Person or another domain. Null country stays unassigned and a foreign country remains foreign.

Geographic rollups derive represented living population for one requested partition subtree. They combine anonymous cohorts with living instantiated memberships, exclude deceased Persons, null areas, other countries and other partitions, and reject unsafe integer arithmetic. No geographic total is persisted.

The frozen generic foundation is exercised by synthetic fixtures. Country content now also includes immutable production package `geography.uk.primary-local-admin-2024-06-30-v1`; it does not change the generic schema. See `UK-GEOGRAPHY-CONTENT.md`.

Geometry, coordinates, adjacency, crosswalks, residence, presence, movement and travel remain deferred.

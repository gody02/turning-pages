import {UK_GEOGRAPHIC_COUNTRY_START_SCENARIO} from '../../uk/countryStartGeographic';

/** Successor orchestration only. Inherited v2 generation keys remain v2 keys. */
export const UK_RESIDENCE_COUNTRY_START_SCENARIO=Object.freeze({
 ...UK_GEOGRAPHIC_COUNTRY_START_SCENARIO,
 id:'country-start.uk.mid-2024-v3' as const,
 baseScenarioId:UK_GEOGRAPHIC_COUNTRY_START_SCENARIO.id,
 settlementPackageId:'settlements.uk.hybrid-2024-06-30-v2' as const,
 settlementFingerprint:'fnv1a64-v1:2ddc7643a1e7e4b8' as const,
 placementPolicyId:'residence-placement.uk.mid-2024-v1' as const,
 placementFingerprint:'fnv1a64-v1:c0d2080b63263587' as const,
 residencePolicy:'single-player-frozen-policy-base-world-v1' as const,
});

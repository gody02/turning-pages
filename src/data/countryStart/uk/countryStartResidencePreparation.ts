import {createGeographyRuntime} from '../../../engine/geography/runtime';
import {createSettlementRuntime} from '../../../engine/geography/settlements/runtime';
import {createResidencePlacementRuntime} from '../../../engine/residencePlacement/runtime';
import {createUkGeographyRegistry} from '../../geography/uk/primary-local-admin-2024/adapter';
import {createUkSettlementContentRegistry} from '../../geography/uk/settlementRegistry';
import {createUkResidencePlacementContentRegistry,resolveUkResidencePlacementContent} from '../../residence/uk/placementRegistry';
import {createUkCountryStartRegistry,resolveUkCountryStartScenario} from './countryStartRegistry';
import {UK_RESIDENCE_COUNTRY_START_SCENARIO as scenario} from './countryStartResidenceScenario';

export type UkCountryStartResidencePreparation=Readonly<{
 identityKey:string;
 geography:ReturnType<typeof createGeographyRuntime>;
 settlements:ReturnType<typeof createSettlementRuntime>;
 placement:ReturnType<typeof createResidencePlacementRuntime>;
}>;

// This is a runtime lifetime, never canonical content, Game state, or a latest-version cache.
const identityKey=JSON.stringify([scenario.id,scenario.geographyPartitionId,scenario.geographyFingerprint,
 scenario.settlementPackageId,scenario.settlementFingerprint,scenario.placementPolicyId,scenario.placementFingerprint]);

/** A private exact-contract lifetime. Failures publish nothing and remain retryable.
 * No supplied registry/policy/context can bypass registration through a cache hit.
 * Runtime factories own immutable content and keep indexes separate from canonical packages.
 */
export function createUkCountryStartResidencePreparer():()=>UkCountryStartResidencePreparation{
 let prepared:UkCountryStartResidencePreparation|undefined;
 return ()=>{
  if(prepared)return prepared;
  const registry=createUkCountryStartRegistry();
  resolveUkCountryStartScenario(registry,scenario.id);
  const geography=createGeographyRuntime(createUkGeographyRegistry());
  const settlements=createSettlementRuntime(createUkSettlementContentRegistry(),geography);
  if(geography.partition(scenario.geographyPartitionId)?.fingerprint!==scenario.geographyFingerprint
   ||settlements.package(scenario.settlementPackageId)?.fingerprint!==scenario.settlementFingerprint)throw Error('UK Country Start Residence content mismatch.');
  const policy=resolveUkResidencePlacementContent(createUkResidencePlacementContentRegistry(),scenario.placementPolicyId);
  if(policy.fingerprint!==scenario.placementFingerprint)throw Error('UK Country Start placement fingerprint mismatch.');
  const placement=createResidencePlacementRuntime(policy,{geography,settlements});
  const candidate=Object.freeze({identityKey,geography,settlements,placement});
  prepared=candidate;
  return candidate;
 };
}

const prepare=createUkCountryStartResidencePreparer();
/** Lazy preparation only. Does not generate Persons, establish homes, consume RNG or write storage. */
export function prepareUkCountryStartResidenceContent():UkCountryStartResidencePreparation{return prepare();}

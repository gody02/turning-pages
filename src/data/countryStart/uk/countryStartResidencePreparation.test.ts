import {afterEach,describe,expect,it,vi} from 'vitest';
import * as settlements from '../../geography/uk/settlementRegistry';
import * as policies from '../../residence/uk/placementRegistry';
import {withResidencePlacementPolicyFingerprint} from '../../../engine/residencePlacement/package';
import {createUkCountryStartResidencePreparer} from './countryStartResidencePreparation';
import {UK_RESIDENCE_COUNTRY_START_SCENARIO as scenario} from './countryStartResidenceScenario';

afterEach(()=>vi.restoreAllMocks());
describe('exact immutable v3 preparation lifetime',()=>{
 it('prepares each static registry once and reuses owned frozen runtimes without Game/seed/Person data',()=>{
  const settlementCalls=vi.spyOn(settlements,'createUkSettlementContentRegistry'),policyCalls=vi.spyOn(policies,'createUkResidencePlacementContentRegistry');
  const prepare=createUkCountryStartResidencePreparer(),first=prepare(),second=prepare();
  expect(second).toBe(first);expect(settlementCalls).toHaveBeenCalledTimes(1);expect(policyCalls).toHaveBeenCalledTimes(1);
  expect(JSON.parse(first.identityKey)).toEqual([scenario.id,scenario.geographyPartitionId,scenario.geographyFingerprint,scenario.settlementPackageId,scenario.settlementFingerprint,scenario.placementPolicyId,scenario.placementFingerprint]);
  expect(Object.isFrozen(first)).toBe(true);expect(Object.isFrozen(first.placement.policy)).toBe(true);
  expect(Object.keys(first).sort()).toEqual(['geography','identityKey','placement','settlements']);
  expect(first.geography.partition(scenario.geographyPartitionId)?.fingerprint).toBe(scenario.geographyFingerprint);
  expect(first.settlements.package(scenario.settlementPackageId)?.fingerprint).toBe(scenario.settlementFingerprint);
  expect(first.placement.policy.fingerprint).toBe(scenario.placementFingerprint);
  expect(first.placement.policy).not.toHaveProperty('groupsIndex');expect(first.settlements.registry).not.toHaveProperty('index');
 });

 it('publishes no cache entry on registration failure, then can retry successfully',()=>{
  const original=policies.createUkResidencePlacementContentRegistry,lookup=vi.spyOn(policies,'createUkResidencePlacementContentRegistry').mockImplementationOnce(()=>{throw Error('Registration failed');});
  const prepare=createUkCountryStartResidencePreparer();expect(prepare).toThrow('Registration failed');
  lookup.mockImplementation(original);const accepted=prepare();expect(prepare()).toBe(accepted);expect(lookup).toHaveBeenCalledTimes(2);
 });

 it.each(['semantics','fingerprint','alternate','dependency'] as const)('rejects %s substitution before caching',variant=>{
  const registry=policies.createUkResidencePlacementContentRegistry(),originalPolicy=registry.policies[0];
  const semanticChange=structuredClone(originalPolicy);(semanticChange.groups[0].candidates[0] as {weight:number}).weight++;
  const {fingerprint:_fingerprint,...changed}=semanticChange,substituted=withResidencePlacementPolicyFingerprint(changed);
  const malformed={...originalPolicy,fingerprint:'fnv1a64-v1:0000000000000000'};
  const alternate={...originalPolicy,policyId:'residence-placement.uk.changed-v1'};
  const wrongDependency={...originalPolicy,dependencies:{...originalPolicy.dependencies,geographyPartitions:[{...originalPolicy.dependencies.geographyPartitions[0],fingerprint:'fnv1a64-v1:0000000000000000'}]}};
  const policy={semantics:substituted,fingerprint:malformed,alternate,dependency:wrongDependency}[variant];
  vi.spyOn(policies,'createUkResidencePlacementContentRegistry').mockReturnValue({...registry,policies:[policy]} as never);
  const prepare=createUkCountryStartResidencePreparer();expect(prepare).toThrow();expect(prepare).toThrow();
 });

 it('rejects mixed inventory before caching',()=>{
  const registry=policies.createUkResidencePlacementContentRegistry();
  vi.spyOn(policies,'createUkResidencePlacementContentRegistry').mockReturnValue({...registry,policies:[registry.policies[0],registry.policies[0]]});
  expect(createUkCountryStartResidencePreparer()).toThrow();
 });

 it('keeps registered runtime authority independent of mutable source aliases',()=>{
  const registry=structuredClone(policies.createUkResidencePlacementContentRegistry());
  vi.spyOn(policies,'createUkResidencePlacementContentRegistry').mockReturnValue(registry);
  const prepare=createUkCountryStartResidencePreparer(),first=prepare(),input={version:1 as const,policyId:scenario.placementPolicyId,personId:'person:1',rootSeed:73,scope:first.placement.policy.groups[0].scope};
  const before=first.placement.evaluate(input);
  (registry.policies[0].groups[0].candidates[0] as {weight:number}).weight++;
  expect(prepare()).toBe(first);expect(first.placement.evaluate(input)).toEqual(before);
  expect(()=>first.placement.evaluate({...input,policyId:'residence-placement.uk.changed-v1'})).toThrow();
  expect(()=>first.placement.evaluate({...input,scope:{...input.scope,placeId:'place.uk.missing'}})).toThrow();
  expect(createUkCountryStartResidencePreparer()).toThrow();
 });
});

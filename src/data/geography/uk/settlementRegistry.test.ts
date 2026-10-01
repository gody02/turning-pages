import {describe,expect,it} from 'vitest';
import {UK_HYBRID_SETTLEMENT_CANDIDATE_ID} from './settlements-hybrid-2024/adapter';
import {UK_HYBRID_SETTLEMENT_V2_CANDIDATE_FINGERPRINT,UK_HYBRID_SETTLEMENT_V2_PRODUCTION_ID} from './settlements-hybrid-2024-v2/adapter';
import {createUkSettlementContentRegistry,UK_SETTLEMENT_CONTENT_MANIFEST,validateUkSettlementContentManifest} from './settlementRegistry';

const registry=createUkSettlementContentRegistry();

describe('UK Settlement production content registry',()=>{
 it('registers exact v2 production content without registering the failed v1 package',()=>{
  expect(registry.packages.map(item=>item.packageId)).toEqual([UK_HYBRID_SETTLEMENT_V2_PRODUCTION_ID]);
  expect(registry.packageManifest).toEqual([{packageId:UK_HYBRID_SETTLEMENT_V2_PRODUCTION_ID,fingerprint:UK_HYBRID_SETTLEMENT_V2_CANDIDATE_FINGERPRINT}]);
  expect(registry.packages.find(item=>item.packageId===UK_HYBRID_SETTLEMENT_CANDIDATE_ID)).toBeUndefined();
  expect(registry.packages.find(item=>item.packageId==='latest')).toBeUndefined();
 });

 it('retains complete historical identity knowledge without recycling removed v1 identities',()=>{
  const represented=new Set(registry.packages[0].settlements.map(item=>item.settlementId));
  expect(registry.identities).toHaveLength(2_739);expect(represented.size).toBe(2_698);
  const historicalOnly=registry.identities.filter(item=>!represented.has(item.settlementId));expect(historicalOnly).toHaveLength(41);
  expect(historicalOnly.every(item=>item.settlementId.includes('.w06000015.')||item.settlementId.includes('.n09000003.'))).toBe(true);
 });

 it('binds immutable registration and historical status in a strict manifest',()=>{
  expect(validateUkSettlementContentManifest(UK_SETTLEMENT_CONTENT_MANIFEST)).toBe(true);expect(Object.isFrozen(UK_SETTLEMENT_CONTENT_MANIFEST)).toBe(true);
  expect(UK_SETTLEMENT_CONTENT_MANIFEST.entries).toEqual([{packageId:UK_HYBRID_SETTLEMENT_V2_PRODUCTION_ID,fingerprint:UK_HYBRID_SETTLEMENT_V2_CANDIDATE_FINGERPRINT,releaseStatus:'production'}]);
  expect(UK_SETTLEMENT_CONTENT_MANIFEST.historicalIdentitySources[0]).toMatchObject({packageId:UK_HYBRID_SETTLEMENT_CANDIDATE_ID,releaseStatus:'unregistered-historical-freeze-failed',identityCount:2_739,currentRepresentations:2_698,historicalOnly:41});
  expect(validateUkSettlementContentManifest({...UK_SETTLEMENT_CONTENT_MANIFEST,entries:[{...UK_SETTLEMENT_CONTENT_MANIFEST.entries[0],fingerprint:'fnv1a64-v1:0000000000000000'}]})).toBe(false);
 });
});

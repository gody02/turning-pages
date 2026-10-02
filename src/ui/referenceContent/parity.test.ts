import {beforeAll,describe,expect,it} from 'vitest';
import {createGeographyRuntime} from '../../engine/geography/runtime';
import {createSettlementRuntime} from '../../engine/geography/settlements/runtime';
import {validResidenceLocationContent} from '../../engine/residence/validation';
import {context} from '../../engine/testing/residenceFixture';
import {buildReferenceIndexMaterial} from './indexMaterial';
import {receiveOwnedReferenceContent} from './lookupAdapters';
import {loadRegisteredReferenceContent} from './ukLoader';
import {UK_REFERENCE_CONTENT_SET} from './identities';
import type {GameContentContext} from '../../engine/gameContent';

let sync:GameContentContext,prepared:GameContentContext;
const result=(call:()=>unknown)=>{try{return {value:call()};}catch(error){return {error:(error as Error).message};}};
beforeAll(async()=>{const {data}=await loadRegisteredReferenceContent(UK_REFERENCE_CONTENT_SET),geography=createGeographyRuntime(data.geography);sync={geography,settlements:createSettlementRuntime(data.settlements,geography)};prepared=await receiveOwnedReferenceContent(structuredClone(data),UK_REFERENCE_CONTENT_SET,()=>true);});

describe('complete synchronous vs Worker-prepared application lookup parity',()=>{
 it('preserves every Geography lookup, all 366 identities/nodes, ancestors, errors and strict self semantics',()=>{
  expect(prepared.geography.registry).toEqual(sync.geography.registry);expect(sync.geography.registry.places).toHaveLength(366);
  for(const pkg of sync.geography.registry.partitions){expect(prepared.geography.partition(pkg.partitionId)).toEqual(sync.geography.partition(pkg.partitionId));for(const node of pkg.nodes){
    const args=[pkg.partitionId,node.placeId] as const;expect(prepared.geography.resolvePlace(...args)).toEqual(sync.geography.resolvePlace(...args));expect(prepared.geography.getParent(...args)).toEqual(sync.geography.getParent(...args));expect(prepared.geography.getChildren(...args)).toEqual(sync.geography.getChildren(...args));expect(prepared.geography.getAncestors(...args)).toEqual(sync.geography.getAncestors(...args));expect(prepared.geography.isPopulationAllocationCell(...args)).toBe(sync.geography.isPopulationAllocationCell(...args));
    for(const ancestor of [node,...sync.geography.getAncestors(...args)])expect(prepared.geography.isWithin(...args,ancestor.placeId)).toBe(sync.geography.isWithin(...args,ancestor.placeId));
  }}
  for(const runtime of [sync.geography,prepared.geography]){expect(runtime.resolvePlace('geography.unknown','place.unknown')).toBeUndefined();expect(runtime.partition('geography.unknown')).toBeUndefined();expect(runtime.isPopulationAllocationCell('geography.unknown','place.unknown')).toBe(false);}
  for(const method of ['getParent','getChildren','getAncestors'] as const)expect(result(()=>prepared.geography[method]('geography.unknown','place.unknown'))).toEqual(result(()=>sync.geography[method]('geography.unknown','place.unknown')));
  expect(result(()=>prepared.geography.isWithin('geography.unknown','place.unknown','place.unknown'))).toEqual(result(()=>sync.geography.isWithin('geography.unknown','place.unknown','place.unknown')));
 });
 it('preserves all 2698 Settlement records/names, 2736 relations and 41 historical-only identities',()=>{
  expect(prepared.settlements.registry).toEqual(sync.settlements.registry);expect(sync.settlements.registry.identities).toHaveLength(2739);
  const pkg=sync.settlements.registry.packages[0];expect(pkg.settlements).toHaveLength(2698);expect(pkg.administrativeRelations).toHaveLength(2736);
  expect(prepared.settlements.package(pkg.packageId)).toEqual(sync.settlements.package(pkg.packageId));expect(prepared.settlements.listSettlements(pkg.packageId,'uk')).toEqual(sync.settlements.listSettlements(pkg.packageId,'uk'));expect(prepared.settlements.listSettlements(pkg.packageId,'foreign')).toEqual([]);
  for(const identity of sync.settlements.registry.identities){expect(prepared.settlements.getSettlement(pkg.packageId,identity.settlementId)).toEqual(sync.settlements.getSettlement(pkg.packageId,identity.settlementId));expect(result(()=>prepared.settlements.getSettlementAdministrativeRelations(pkg.packageId,identity.settlementId))).toEqual(result(()=>sync.settlements.getSettlementAdministrativeRelations(pkg.packageId,identity.settlementId)));}
  for(const relation of pkg.administrativeRelations){const location={kind:'settlement-area' as const,administrativeArea:{version:1 as const,partitionId:relation.partitionId,placeId:relation.placeId},settlement:{version:1 as const,packageId:pkg.packageId,settlementId:relation.settlementId}};expect(validResidenceLocationContent(location,prepared.geography,prepared.settlements)).toBe(validResidenceLocationContent(location,sync.geography,sync.settlements));}
 });
 it('preserves all 361 allocation-area queries and allocation-cell/admin-only distinction',()=>{
  let cells=0;for(const pkg of sync.geography.registry.partitions)for(const node of pkg.nodes){if(node.populationAllocationCell)cells++;expect(prepared.settlements.getSettlementsForAdministrativeArea(sync.settlements.registry.packages[0].packageId,pkg.partitionId,node.placeId)).toEqual(sync.settlements.getSettlementsForAdministrativeArea(sync.settlements.registry.packages[0].packageId,pkg.partitionId,node.placeId));expect(validResidenceLocationContent({kind:'administrative-area',administrativeArea:{version:1,partitionId:pkg.partitionId,placeId:node.placeId}},prepared.geography,prepared.settlements)).toBe(true);}expect(cells).toBe(361);
 });
 it('preserves every named stress case and the full cross-boundary administrative context',()=>{
  const pkg=sync.settlements.registry.packages[0];for(const name of ['London','Bradford','Leeds','Swansea','Birmingham','Bristol','Glasgow','Belfast','Cardiff']){const matches=pkg.settlements.filter(item=>item.names.some(n=>n.text===name));expect(matches.length,name).toBeGreaterThan(0);for(const item of matches){expect(prepared.settlements.getSettlement(pkg.packageId,item.settlementId)).toEqual(item);expect(prepared.settlements.getSettlementAdministrativeRelations(pkg.packageId,item.settlementId)).toEqual(sync.settlements.getSettlementAdministrativeRelations(pkg.packageId,item.settlementId));}}
  const london=pkg.settlements.find(item=>item.names.some(n=>n.text==='London'))!;expect(prepared.settlements.getSettlementAdministrativeRelations(pkg.packageId,london.settlementId).length).toBeGreaterThan(1);
  const scotland=sync.geography.registry.partitions[0].nodes.find(node=>node.populationAllocationCell&&node.placeId.includes('s120'))!;expect(scotland).toBeTruthy();expect(validResidenceLocationContent({kind:'administrative-area',administrativeArea:{version:1,partitionId:sync.geography.registry.partitions[0].partitionId,placeId:scotland.placeId}},prepared.geography,prepared.settlements)).toBe(true);
 });
 it('preserves unknown/cross-package errors, immutable outputs and fresh array contracts',()=>{
  const pkg=sync.settlements.registry.packages[0];expect(prepared.settlements.getSettlement('settlements.unknown','settlement.unknown')).toBeUndefined();expect(prepared.settlements.package('settlements.unknown')).toBeUndefined();
  for(const args of [['settlements.unknown','settlement.unknown'],[pkg.packageId,'settlement.unknown']])expect(result(()=>prepared.settlements.getSettlementAdministrativeRelations(...args as [string,string]))).toEqual(result(()=>sync.settlements.getSettlementAdministrativeRelations(...args as [string,string])));
  expect(result(()=>prepared.settlements.listSettlements('settlements.unknown','uk'))).toEqual(result(()=>sync.settlements.listSettlements('settlements.unknown','uk')));expect(result(()=>prepared.settlements.getSettlementsForAdministrativeArea(pkg.packageId,'geography.unknown','place.unknown'))).toEqual(result(()=>sync.settlements.getSettlementsForAdministrativeArea(pkg.packageId,'geography.unknown','place.unknown')));
  const first=prepared.settlements.listSettlements(pkg.packageId,'uk');expect(Object.isFrozen(first)).toBe(true);expect(first).not.toBe(prepared.settlements.listSettlements(pkg.packageId,'uk'));expect(()=>{(first[0] as any).kindId='changed';}).toThrow();
 });
 it('supports synthetic country separation and keeps hierarchy package-qualified',async()=>{
  const original=context(),data=buildReferenceIndexMaterial(original.geography.registry,original.settlements.registry),set={version:1 as const,geography:data.geography.manifest,settlements:data.settlements.packageManifest},resolved=await receiveOwnedReferenceContent(structuredClone(data),set,()=>true);
  expect(resolved.geography.registry).toEqual(original.geography.registry);for(const pkg of original.geography.registry.partitions)for(const node of pkg.nodes)expect(resolved.geography.getAncestors(pkg.partitionId,node.placeId)).toEqual(original.geography.getAncestors(pkg.partitionId,node.placeId));expect(resolved.settlements.listSettlements(set.settlements[0].packageId,'bb')).toEqual([]);
 });
});

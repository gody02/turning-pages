import type {GeographyRuntime} from '../runtime';
import {createSettlementRegistry,validateSettlementRegistry} from './package';
import type {SettlementAdministrativeRelationV1,SettlementPackageV1,SettlementRegistryV1,SettlementV1} from './types';

const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const areaKey=(partitionId:string,placeId:string)=>`${partitionId}\u0000${placeId}`;

export type SettlementRuntime=Readonly<{
 registry:SettlementRegistryV1;
 package:(packageId:string)=>SettlementPackageV1|undefined;
 getSettlement:(packageId:string,settlementId:string)=>SettlementV1|undefined;
 listSettlements:(packageId:string,countryId:string)=>readonly SettlementV1[];
 getSettlementAdministrativeRelations:(packageId:string,settlementId:string)=>readonly SettlementAdministrativeRelationV1[];
 getSettlementsForAdministrativeArea:(packageId:string,partitionId:string,placeId:string)=>readonly SettlementV1[];
}>;

/** Builds closure-private indexes once without modifying or decorating canonical Settlement content. */
export function createSettlementRuntime(registry:SettlementRegistryV1,geography:GeographyRuntime):SettlementRuntime{
 if(!validateSettlementRegistry(registry,geography))throw Error('Invalid Settlement registry.');
 const canonical=createSettlementRegistry(registry.identities,registry.packages,registry.packageManifest,registry.identityManifest,geography),packageById=new Map(canonical.packages.map(item=>[item.packageId,item])),settlementByPackage=new Map<string,Map<string,SettlementV1>>(),settlementsByCountry=new Map<string,Map<string,readonly SettlementV1[]>>(),relationsBySettlement=new Map<string,Map<string,readonly SettlementAdministrativeRelationV1[]>>(),settlementsByArea=new Map<string,Map<string,readonly SettlementV1[]>>();
 for(const pkg of canonical.packages){const byId=new Map(pkg.settlements.map(item=>[item.settlementId,item])),countryMap=new Map<string,readonly SettlementV1[]>([[pkg.countryId,Object.freeze([...pkg.settlements])]]),relationMap=new Map<string,SettlementAdministrativeRelationV1[]>(),areaMap=new Map<string,SettlementV1[]>();for(const relation of pkg.administrativeRelations){const relations=relationMap.get(relation.settlementId)??[];relations.push(relation);relationMap.set(relation.settlementId,relations);const key=areaKey(relation.partitionId,relation.placeId),settlement=byId.get(relation.settlementId)!;const items=areaMap.get(key)??[];if(!items.some(item=>item.settlementId===settlement.settlementId))items.push(settlement);areaMap.set(key,items);}for(const items of relationMap.values())items.sort((a,b)=>codePointCompare(areaKey(a.partitionId,a.placeId),areaKey(b.partitionId,b.placeId)));for(const items of areaMap.values())items.sort((a,b)=>codePointCompare(a.settlementId,b.settlementId));settlementByPackage.set(pkg.packageId,byId);settlementsByCountry.set(pkg.packageId,countryMap);relationsBySettlement.set(pkg.packageId,new Map([...relationMap].map(([id,items])=>[id,Object.freeze([...items])])));settlementsByArea.set(pkg.packageId,new Map([...areaMap].map(([key,items])=>[key,Object.freeze([...items])])));}
 const requirePackage=(packageId:string)=>{const pkg=packageById.get(packageId);if(!pkg)throw Error('Unknown Settlement package.');return pkg;};
 const packageLookup=(packageId:string)=>packageById.get(packageId);
 const getSettlement=(packageId:string,settlementId:string)=>settlementByPackage.get(packageId)?.get(settlementId);
 const listSettlements=(packageId:string,countryId:string)=>{requirePackage(packageId);return Object.freeze([...(settlementsByCountry.get(packageId)?.get(countryId)??[])]);};
 const getSettlementAdministrativeRelations=(packageId:string,settlementId:string)=>{requirePackage(packageId);if(!settlementByPackage.get(packageId)?.has(settlementId))throw Error('Unknown Settlement.');return Object.freeze([...(relationsBySettlement.get(packageId)?.get(settlementId)??[])]);};
 const getSettlementsForAdministrativeArea=(packageId:string,partitionId:string,placeId:string)=>{requirePackage(packageId);if(!geography.resolvePlace(partitionId,placeId))throw Error('Unknown administrative Geography reference.');return Object.freeze([...(settlementsByArea.get(packageId)?.get(areaKey(partitionId,placeId))??[])]);};
 return Object.freeze({registry:canonical,package:packageLookup,getSettlement,listSettlements,getSettlementAdministrativeRelations,getSettlementsForAdministrativeArea});
}

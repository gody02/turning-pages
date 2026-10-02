import {validGeographicAreaReference} from '../geography/runtime';
import {candidateKey,dense,derivationKey,fields,fingerprintShape,record,scopeKey,snapshot,stableId,versionedId} from './data';
import type {ResidencePlacementContext,ResidencePlacementLocationV1,ResidencePlacementPolicyV1,ResidencePlacementRequestV1} from './types';

export const RESIDENCE_PLACEMENT_ALGORITHM='residence-placement.weighted-integer-v1' as const;
// Hostile-input safety limits, not geographic modelling bounds; well above national content.
export const MAX_PLACEMENT_GROUPS=200_000;
export const MAX_PLACEMENT_CANDIDATES=1_000_000;
const positive=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const dependency=(value:unknown)=>record(value)&&fields(value,['id','fingerprint'])&&versionedId(value.id)&&fingerprintShape(value.fingerprint);
export function validPlacementLocation(value:unknown):value is ResidencePlacementLocationV1{
 try{
  if(!record(value)||!fields(value,value.kind==='administrative-area'?['kind','administrativeArea']:['kind','administrativeArea','settlement'])||!validGeographicAreaReference(value.administrativeArea))return false;
  if(value.kind==='administrative-area')return true;
  return value.kind==='settlement-area'&&record(value.settlement)&&fields(value.settlement,['version','packageId','settlementId'])&&value.settlement.version===1&&versionedId(value.settlement.packageId)&&stableId(value.settlement.settlementId);
 }catch{return false;}
}
/** Shape and semantic uniqueness only; permits unordered authoring input. Pass a safe snapshot. */
export function policyShape(value:unknown):value is ResidencePlacementPolicyV1{
 try{
  if(!record(value)||!fields(value,['version','policyId','fingerprint','algorithmId','dependencies','groups'])||value.version!==1||!versionedId(value.policyId)||!fingerprintShape(value.fingerprint)||value.algorithmId!==RESIDENCE_PLACEMENT_ALGORITHM||!record(value.dependencies)||!fields(value.dependencies,['geographyPartitions','settlementPackages'])||!dense(value.dependencies.geographyPartitions)||!dense(value.dependencies.settlementPackages)||!dense(value.groups)||value.groups.length===0||value.groups.length>MAX_PLACEMENT_GROUPS)return false;
  const geoPins=value.dependencies.geographyPartitions,settlementPins=value.dependencies.settlementPackages;
  if(!geoPins.every(dependency)||!settlementPins.every(dependency))return false;
  const pinIds=(pins:readonly unknown[])=>pins.map(item=>(item as {id:string}).id);
  const geoIds=new Set(pinIds(geoPins)),settlementIds=new Set(pinIds(settlementPins));
  if(geoIds.size!==geoPins.length||settlementIds.size!==settlementPins.length)return false;
  const usedGeo=new Set<string>(),usedSettlements=new Set<string>(),scopes=new Set<string>();let candidateCount=0;
  for(const group of value.groups){
   if(!record(group)||!fields(group,['scope','candidates'])||!validGeographicAreaReference(group.scope)||!dense(group.candidates)||group.candidates.length===0)return false;
   candidateCount+=group.candidates.length;if(candidateCount>MAX_PLACEMENT_CANDIDATES)return false;
   const key=scopeKey(group.scope);if(scopes.has(key)||!geoIds.has(group.scope.partitionId))return false;scopes.add(key);usedGeo.add(group.scope.partitionId);
   const base=derivationKey('residence-placement','v1',value.algorithmId,value.policyId,value.fingerprint,'person:9007199254740991',group.scope.partitionId,group.scope.placeId);
   derivationKey(base,'attempt','1023','lane','1');
   const destinations=new Set<string>();let total=0n;
   for(const candidate of group.candidates){
    if(!record(candidate)||!fields(candidate,['location','weight'])||!positive(candidate.weight)||!validPlacementLocation(candidate.location)||scopeKey(candidate.location.administrativeArea)!==key)return false;
    total+=BigInt(candidate.weight);if(total>BigInt(Number.MAX_SAFE_INTEGER))return false;
    const destination=candidateKey(candidate.location);if(destinations.has(destination))return false;destinations.add(destination);
    if(candidate.location.kind==='settlement-area'){const id=candidate.location.settlement.packageId;if(!settlementIds.has(id))return false;usedSettlements.add(id);}
   }
  }
  return usedGeo.size===geoIds.size&&usedSettlements.size===settlementIds.size;
 }catch{return false;}
}
export function validateResidencePlacementRequest(value:unknown):value is ResidencePlacementRequestV1{
 try{
  const item=snapshot(value);
  return record(item)&&fields(item,['version','policyId','personId','rootSeed','scope'])&&item.version===1&&versionedId(item.policyId)&&typeof item.personId==='string'&&/^person:[1-9]\d*$/.test(item.personId)&&Number.isSafeInteger(Number(item.personId.slice(7)))&&typeof item.rootSeed==='number'&&Number.isInteger(item.rootSeed)&&item.rootSeed>=0&&item.rootSeed<=0xffffffff&&validGeographicAreaReference(item.scope);
 }catch{return false;}
}
/** Indexed exact relations; no kind, allocation-cell or demographic interpretation. */
export function placementContentMatches(policy:ResidencePlacementPolicyV1,context:ResidencePlacementContext):boolean{
 try{
  for(const pin of policy.dependencies.geographyPartitions)if(context.geography.partition(pin.id)?.fingerprint!==pin.fingerprint)return false;
  const packages=new Map(policy.dependencies.settlementPackages.map(pin=>{const pkg=context.settlements.package(pin.id);if(!pkg||pkg.fingerprint!==pin.fingerprint)throw Error();return [pin.id,pkg] as const;}));
  const relations=new Set<string>();
  for(const pkg of packages.values())for(const relation of pkg.administrativeRelations)if(relation.relation==='contained-by'||relation.relation==='intersects')relations.add(JSON.stringify([pkg.packageId,relation.settlementId,relation.partitionId,relation.placeId]));
  for(const group of policy.groups){
   const area=context.geography.resolvePlace(group.scope.partitionId,group.scope.placeId);if(!area)return false;
   for(const candidate of group.candidates){
    if(candidate.location.kind==='administrative-area')continue;
    const ref=candidate.location.settlement,pkg=packages.get(ref.packageId);
    if(!pkg||pkg.countryId!==area.identity.countryId||!context.settlements.getSettlement(ref.packageId,ref.settlementId)||!relations.has(JSON.stringify([ref.packageId,ref.settlementId,group.scope.partitionId,group.scope.placeId])))return false;
   }
  }
  return true;
 }catch{return false;}
}

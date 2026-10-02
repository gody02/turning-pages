import {createGeographyRegistry,fingerprintPlaceIdentity,withGeographyPartitionFingerprint} from '../geography/package';
import {createGeographyRuntime} from '../geography/runtime';
import {createSettlementRegistry,fingerprintSettlementIdentity,withSettlementPackageFingerprint} from '../geography/settlements/package';
import {createSettlementRuntime} from '../geography/settlements/runtime';
import type {GeographicAreaReferenceV1,GeographyPartitionNodeV1} from '../geography/types';
import {withResidencePlacementPolicyFingerprint} from './package';
import type {ResidencePlacementContext,ResidencePlacementLocationV1,ResidencePlacementPolicyInputV1,ResidencePlacementRequestV1} from './types';
import {RESIDENCE_PLACEMENT_ALGORITHM} from './validation';

export const area=(id='alpha',country='aa'):GeographicAreaReferenceV1=>({version:1,partitionId:`geography.synthetic-${country}-v1`,placeId:`place.synthetic.${country}.${id}`});
export const admin=(scope=area()):ResidencePlacementLocationV1=>({kind:'administrative-area',administrativeArea:scope});
export const settlementArea=(id='a',scope=area(),packageId='settlements.synthetic-aa-v1'):ResidencePlacementLocationV1=>({kind:'settlement-area',administrativeArea:scope,settlement:{version:1,packageId,settlementId:`settlement.synthetic.aa.${id}`}});
export function context():ResidencePlacementContext{
 const source={version:1 as const,id:'source.synthetic-placement-v1',producer:'Synthetic',datasetId:'synthetic',releaseId:'v1',title:'Synthetic fixture',jurisdiction:'aa',referenceDate:{year:2024,month:6,day:30},classification:'authored-gameplay-abstraction' as const,methodology:'Synthetic test data only.',licence:'Synthetic fixture.'};
 const nodes=(country:string):GeographyPartitionNodeV1[]=>['alpha','beta','gamma','root'].map(id=>({placeId:`place.synthetic.${country}.${id}`,parentPlaceId:id==='root'?null:`place.synthetic.${country}.root`,displayName:id,kindId:'kind.synthetic-any',populationAllocationCell:false,sourceIds:[source.id]}));
 const partitions=['aa','bb'].map(countryId=>withGeographyPartitionFingerprint({version:1,partitionId:area('alpha',countryId).partitionId,countryId,effectiveDate:source.referenceDate,sources:[source],nodes:nodes(countryId),limitations:[]}));
 const places=partitions.flatMap(pkg=>pkg.nodes.map(node=>({placeId:node.placeId,countryId:pkg.countryId})));
 const geography=createGeographyRuntime(createGeographyRegistry(places,partitions,partitions.map(pkg=>({partitionId:pkg.partitionId,fingerprint:pkg.fingerprint})),places.map(place=>({placeId:place.placeId,fingerprint:fingerprintPlaceIdentity(place)}))));
 const make=(countryId:string,version:number)=>{
  const decision={id:'decision.synthetic-continuity-v1',classification:'manual-continuity' as const,description:'Continuation of synthetic identity.',sourceIds:[source.id]};
  return withSettlementPackageFingerprint({version:1,packageId:`settlements.synthetic-${countryId}-v${version}`,countryId,effectiveDate:{year:2024,month:6,day:version},sources:[source],settlements:['a','b','cross'].map(id=>({settlementId:`settlement.synthetic.${countryId}.${id}`,kindId:'kind.synthetic-opaque',names:[{nameId:`name.synthetic.${countryId}.${id}`,text:id,languageTag:null,role:'display' as const,sourceIds:[source.id]}],sourceIds:[source.id],decisionIds:version===2?[decision.id]:[]})),administrativeRelations:['a','b','cross'].flatMap(id=>(id==='cross'?['alpha','beta']:['alpha']).map(cell=>({settlementId:`settlement.synthetic.${countryId}.${id}`,partitionId:area(cell,countryId).partitionId,placeId:area(cell,countryId).placeId,relation:id==='cross'?'intersects' as const:'contained-by' as const,basis:'official-source' as const,sourceIds:[source.id],decisionIds:[]}))),decisions:version===2?[decision]:[],gaps:[],limitations:[]});
 };
 const packages=[make('aa',1),make('aa',2),make('bb',1)],identities=[...new Map(packages.flatMap(pkg=>pkg.settlements.map(item=>[item.settlementId,{settlementId:item.settlementId,countryId:pkg.countryId}] as const))).values()];
 return {geography,settlements:createSettlementRuntime(createSettlementRegistry(identities,packages,packages.map(pkg=>({packageId:pkg.packageId,fingerprint:pkg.fingerprint})),identities.map(item=>({settlementId:item.settlementId,fingerprint:fingerprintSettlementIdentity(item)})),geography),geography)};
}
export function input(ctx:ResidencePlacementContext):ResidencePlacementPolicyInputV1{
 return {version:1,policyId:'residence-placement.synthetic-v1',algorithmId:RESIDENCE_PLACEMENT_ALGORITHM,dependencies:{geographyPartitions:[{id:area().partitionId,fingerprint:ctx.geography.partition(area().partitionId)!.fingerprint}],settlementPackages:[{id:'settlements.synthetic-aa-v1',fingerprint:ctx.settlements.package('settlements.synthetic-aa-v1')!.fingerprint}]},groups:[{scope:area(),candidates:[{location:settlementArea('a'),weight:50},{location:settlementArea('b'),weight:10},{location:settlementArea('cross'),weight:1}]},{scope:area('beta'),candidates:[{location:settlementArea('cross',area('beta')),weight:1}]},{scope:area('gamma'),candidates:[{location:admin(area('gamma')),weight:1}]}]};
}
export const policy=(ctx:ResidencePlacementContext)=>withResidencePlacementPolicyFingerprint(input(ctx));
export const request=(personId='person:1',rootSeed=42,scope=area()):ResidencePlacementRequestV1=>({version:1,policyId:'residence-placement.synthetic-v1',personId,rootSeed,scope});

import {describe,expect,it} from 'vitest';
import {createGeographyRegistry,fingerprintPlaceIdentity,withGeographyPartitionFingerprint} from '../geography/package';
import {createGeographyRuntime} from '../geography/runtime';
import {createSettlementRegistry,fingerprintSettlementIdentity,withSettlementPackageFingerprint} from '../geography/settlements/package';
import {createSettlementRuntime} from '../geography/settlements/runtime';
import {withResidencePlacementPolicyFingerprint} from './package';
import {createResidencePlacementRuntime} from './runtime';
import {RESIDENCE_PLACEMENT_ALGORITHM} from './validation';

describe('synthetic national-scale placement policy',()=>{
 it('validates and indexes 361 scopes / 2708 candidates without decorating canonical data',()=>{
  const date={year:2024,month:6,day:30},source={version:1 as const,id:'source.synthetic-scale-v1',producer:'Synthetic',datasetId:'scale',releaseId:'v1',title:'Synthetic scale',jurisdiction:'aa',referenceDate:date,classification:'authored-gameplay-abstraction' as const,methodology:'Synthetic scale only.',licence:'Synthetic'},root='place.synthetic-scale.root',partitionId='geography.synthetic-scale-v1',packageId='settlements.synthetic-scale-v1';
  const scopes=Array.from({length:361},(_,i)=>({version:1 as const,partitionId,placeId:`place.synthetic-scale.cell${String(i).padStart(3,'0')}`}));
  const partition=withGeographyPartitionFingerprint({version:1,partitionId,countryId:'aa',effectiveDate:date,sources:[source],nodes:[...scopes.map(scope=>({placeId:scope.placeId,displayName:scope.placeId,kindId:'kind.synthetic-scale',parentPlaceId:root,populationAllocationCell:false,sourceIds:[source.id]})),{placeId:root,displayName:'Root',kindId:'kind.synthetic-scale',parentPlaceId:null,populationAllocationCell:false,sourceIds:[source.id]}],limitations:[]}),places=partition.nodes.map(node=>({placeId:node.placeId,countryId:'aa'}));
  const geography=createGeographyRuntime(createGeographyRegistry(places,[partition],[{partitionId,fingerprint:partition.fingerprint}],places.map(place=>({placeId:place.placeId,fingerprint:fingerprintPlaceIdentity(place)}))));
  const entries=scopes.flatMap((scope,i)=>Array.from({length:i<181?8:7},(_,j)=>({scope,settlementId:`settlement.synthetic-scale.c${i}.s${j}`})));
  const pkg=withSettlementPackageFingerprint({version:1,packageId,countryId:'aa',effectiveDate:date,sources:[source],settlements:entries.map(entry=>({settlementId:entry.settlementId,kindId:'kind.synthetic-scale',names:[{nameId:`name.${entry.settlementId}`,text:entry.settlementId,languageTag:null,role:'display' as const,sourceIds:[source.id]}],sourceIds:[source.id],decisionIds:[]})),administrativeRelations:entries.map(entry=>({settlementId:entry.settlementId,partitionId,placeId:entry.scope.placeId,relation:'contained-by' as const,basis:'official-source' as const,sourceIds:[source.id],decisionIds:[]})),decisions:[],gaps:[],limitations:[]});
  const identities=pkg.settlements.map(item=>({settlementId:item.settlementId,countryId:'aa'})),settlements=createSettlementRuntime(createSettlementRegistry(identities,[pkg],[{packageId,fingerprint:pkg.fingerprint}],identities.map(id=>({settlementId:id.settlementId,fingerprint:fingerprintSettlementIdentity(id)})),geography),geography);
  const grouped=new Map<string,typeof entries>();for(const entry of entries){const row=grouped.get(entry.scope.placeId)??[];row.push(entry);grouped.set(entry.scope.placeId,row);}
  const started=performance.now(),policy=withResidencePlacementPolicyFingerprint({version:1,policyId:'residence-placement.synthetic-scale-v1',algorithmId:RESIDENCE_PLACEMENT_ALGORITHM,dependencies:{geographyPartitions:[{id:partitionId,fingerprint:partition.fingerprint}],settlementPackages:[{id:packageId,fingerprint:pkg.fingerprint}]},groups:scopes.map(scope=>({scope,candidates:grouped.get(scope.placeId)!.map((entry,index)=>({weight:index+1,location:{kind:'settlement-area' as const,administrativeArea:scope,settlement:{version:1 as const,packageId,settlementId:entry.settlementId}}}))}))}),runtime=createResidencePlacementRuntime(policy,{geography,settlements}),prepared=performance.now();
  const results=scopes.map((scope,index)=>runtime.evaluate({version:1,policyId:policy.policyId,personId:`person:${index+1}`,rootSeed:2024,scope}));
  expect(entries).toHaveLength(2708);expect(results).toHaveLength(361);expect(results.every((result,index)=>result.location.administrativeArea.placeId===scopes[index].placeId)).toBe(true);expect(JSON.stringify(runtime.policy)).not.toContain('bounds');
  console.info(JSON.stringify({profile:'synthetic-residence-placement',scopes:361,candidates:2708,prepareMs:prepared-started,evaluate361Ms:performance.now()-prepared,policyUtf8Bytes:new TextEncoder().encode(JSON.stringify(policy)).length}));
 },30_000);
});

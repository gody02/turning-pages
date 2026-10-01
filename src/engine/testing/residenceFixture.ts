import {createGeographyRegistry,fingerprintPlaceIdentity,withGeographyPartitionFingerprint} from '../geography/package';
import {createGame} from '../simulation';
import {migrateGame} from '../save';
import {createLegacyPopulation} from '../human/population';
import type {CurrentGame} from '../types';
import {createGeographyRuntime} from '../geography/runtime';
import {createSettlementRegistry,fingerprintSettlementIdentity,withSettlementPackageFingerprint} from '../geography/settlements/package';
import {createSettlementRuntime} from '../geography/settlements/runtime';
import type {SettlementAdministrativeRelationV1,SettlementIdentityV1,SettlementMappingDecisionV1,SettlementPackageV1,SettlementV1} from '../geography/settlements/types';
import type {GeographyPartitionNodeV1,GeographyPartitionPackageV1,PlaceIdentityV1} from '../geography/types';
import {allocatePerson,createPeople,createPerson,replacePerson,type PeopleState,type PersonInput} from '../human/person';
import {clearNoFixedAbode,createEmptyResidenceState,establishResidence,joinResidence,leaveResidence,recordNoFixedAbode,relocateResidence,removePersonFromResidences} from '../residence/state';
import {createResidenceRuntime} from '../residence/runtime';
import type {ResidenceLocationRefV1,ResidenceStateV1} from '../residence/types';
import {validResidenceContent,validResidenceLocation,validResidenceLocationContent,validResidenceState,validResidenceWithContext,validResidenceWithPeople,type ResidenceValidationContext} from '../residence/validation';

const date={year:2024,month:6,day:30} as const;
const personInput=(name:string):PersonInput=>({name,dateOfBirth:{year:1990,month:1,day:1},genderLabel:'Unspecified',lifeStatus:'living',traits:[],temperament:{},aptitudes:{}});
export function people(count=4):PeopleState{let state=createPeople(personInput('Person 1'));for(let index=2;index<=count;index++)state=allocatePerson(state,personInput(`Person ${index}`)).state;return state;}

const geographySource={version:1 as const,id:'geography.source.synthetic-residence-v1',producer:'Synthetic producer',datasetId:'synthetic-residence',releaseId:'v1',title:'Synthetic Residence geography',jurisdiction:'aa',referenceDate:date,classification:'authored-gameplay-abstraction' as const,methodology:'Synthetic structural fixture.',licence:'Synthetic test fixture.'};
const node=(placeId:string,parentPlaceId:string|null):GeographyPartitionNodeV1=>({placeId,displayName:placeId,kindId:'geo.synthetic-residence',parentPlaceId,populationAllocationCell:parentPlaceId!==null,sourceIds:[geographySource.id]});
const aaNodes=[node('place.synthetic.aa.alpha','place.synthetic.aa.root'),node('place.synthetic.aa.beta','place.synthetic.aa.root'),node('place.synthetic.aa.rural','place.synthetic.aa.root'),node('place.synthetic.aa.root',null)];
const bbNodes=[node('place.synthetic.bb.cell','place.synthetic.bb.root'),node('place.synthetic.bb.root',null)];
const geographyPackage=(partitionId:string,countryId:string,nodes:readonly GeographyPartitionNodeV1[]):GeographyPartitionPackageV1=>withGeographyPartitionFingerprint({version:1,partitionId,countryId,effectiveDate:date,sources:[geographySource],nodes,limitations:['Synthetic only.']});
function geography(){const packages=[geographyPackage('geography.synthetic-aa-v1','aa',aaNodes),geographyPackage('geography.synthetic-bb-v1','bb',bbNodes)],places:PlaceIdentityV1[]=[...aaNodes.map(item=>({placeId:item.placeId,countryId:'aa'})),...bbNodes.map(item=>({placeId:item.placeId,countryId:'bb'}))];return createGeographyRuntime(createGeographyRegistry(places,packages,packages.map(item=>({partitionId:item.partitionId,fingerprint:item.fingerprint})),places.map(item=>({placeId:item.placeId,fingerprint:fingerprintPlaceIdentity(item)}))));}

const settlementSource={...geographySource,id:'geography.source.synthetic-residence-settlements-v1',datasetId:'synthetic-residence-settlements',title:'Synthetic Residence Settlements'};
const decision:SettlementMappingDecisionV1={id:'settlement-decision.synthetic-residence.mapping-v1',classification:'reviewed-mapping',description:'Synthetic exact-area mapping.',sourceIds:[settlementSource.id]};
const settlement=(id:string):SettlementV1=>({settlementId:`settlement.synthetic.aa.${id}`,kindId:'settlement-kind.synthetic.named-place',names:[{nameId:`settlement-name.synthetic.aa.${id}.display`,text:id,languageTag:'en',role:'display',sourceIds:[settlementSource.id]}],sourceIds:[settlementSource.id],decisionIds:[]});
const relation=(id:string,placeId:string):SettlementAdministrativeRelationV1=>({settlementId:`settlement.synthetic.aa.${id}`,partitionId:'geography.synthetic-aa-v1',placeId,relation:id==='cross'?'intersects':'contained-by',basis:'reviewed-mapping',sourceIds:[settlementSource.id],decisionIds:[decision.id]});
export function settlementPackage(packageId='settlements.synthetic-residence-2024-v1'):SettlementPackageV1{return withSettlementPackageFingerprint({version:1,packageId,countryId:'aa',effectiveDate:date,sources:[settlementSource],settlements:[settlement('authored'),settlement('cross'),settlement('village')],administrativeRelations:[relation('authored','place.synthetic.aa.alpha'),relation('cross','place.synthetic.aa.alpha'),relation('cross','place.synthetic.aa.beta'),relation('village','place.synthetic.aa.alpha')],decisions:[decision],gaps:[],limitations:['Synthetic only.']});}
export function context(peopleState=people(),pkg=settlementPackage()):ResidenceValidationContext{const geo=geography(),identities:SettlementIdentityV1[]=pkg.settlements.map(item=>({settlementId:item.settlementId,countryId:'aa'})),registry=createSettlementRegistry(identities,[pkg],[{packageId:pkg.packageId,fingerprint:pkg.fingerprint}],identities.map(item=>({settlementId:item.settlementId,fingerprint:fingerprintSettlementIdentity(item)})),geo);return {people:peopleState,geography:geo,settlements:createSettlementRuntime(registry,geo)};}

export const country:ResidenceLocationRefV1={kind:'country',countryId:'aa'};
export function syntheticResidenceGame():CurrentGame{
 const game=migrateGame(createGame('Player','Unspecified','ca',7)) as CurrentGame;
 for(let index=2;index<=5;index++)game.people=allocatePerson(game.people!,{...game.people!.people[0],name:`Person ${index}`}).state;
 game.population=createLegacyPopulation(game.people!,game.country);
 const content=context(game.people!);
 let state=establishResidence(createEmptyResidenceState(),['person:1','person:2','person:3','person:4'],country,content).state;
 state=establishResidence(state,['person:1'],admin('place.synthetic.aa.rural'),content).state;
 state=establishResidence(state,['person:2'],settlementArea('settlement.synthetic.aa.cross'),content).state;
 game.residence=recordNoFixedAbode(state,'person:5',content);
 return game;
}
export const admin=(placeId='place.synthetic.aa.alpha'):ResidenceLocationRefV1=>({kind:'administrative-area',administrativeArea:{version:1,partitionId:'geography.synthetic-aa-v1',placeId}});
export const settlementArea=(settlementId='settlement.synthetic.aa.village',placeId='place.synthetic.aa.alpha',packageId='settlements.synthetic-residence-2024-v1'):ResidenceLocationRefV1=>({kind:'settlement-area',administrativeArea:{version:1,partitionId:'geography.synthetic-aa-v1',placeId},settlement:{version:1,packageId,settlementId}});

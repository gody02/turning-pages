import {isJsonValue} from '../core/json';
import type {GeographyRuntime} from '../geography/runtime';
import {validGeographicAreaReference} from '../geography/runtime';
import type {SettlementRuntime} from '../geography/settlements/runtime';
import {validPeople,type PeopleState} from '../human/person';
import type {ResidenceLocationRefV1,ResidenceOccupantV1,ResidenceRecordV1,ResidenceStateV1,SettlementReferenceV1} from './types';

export const RESIDENCE_VERSION=1 as const;

export type ResidenceValidationContext=Readonly<{
 people:PeopleState;
 geography:GeographyRuntime;
 settlements:SettlementRuntime;
}>;

export const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const record=(value:unknown):value is Record<string,unknown>=>{try{return !!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);}catch{return false;}};
const fields=(value:Record<string,unknown>,required:readonly string[])=>{try{const keys=Reflect.ownKeys(value);return keys.length===required.length&&required.every(key=>keys.includes(key))&&keys.every(key=>typeof key==='string'&&required.includes(key)&&!!Object.getOwnPropertyDescriptor(value,key)?.enumerable&&'value' in Object.getOwnPropertyDescriptor(value,key)!);}catch{return false;}};
const dense=(value:unknown):value is readonly unknown[]=>{try{if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||Object.keys(value).length!==value.length||Reflect.ownKeys(value).length!==value.length+1)return false;for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,index);if(!descriptor?.enumerable||!('value' in descriptor))return false;}return true;}catch{return false;}};
const positiveSafeInteger=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const countryId=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=100&&/^[a-z][a-z0-9-]*$/.test(value);
const stableIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=160&&value.includes('.')&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
const versionedIdentifier=(value:unknown):value is string=>stableIdentifier(value)&&/(?:^|[._-])v[1-9]\d*$/.test(value);
const personId=(value:unknown):value is string=>typeof value==='string'&&/^person:[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value.slice(7)));
const residenceId=(value:unknown):value is string=>typeof value==='string'&&/^residence:[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value.slice(10)));

function validSettlementReference(value:unknown):value is SettlementReferenceV1{
 return record(value)&&fields(value,['version','packageId','settlementId'])&&value.version===1&&versionedIdentifier(value.packageId)&&stableIdentifier(value.settlementId);
}

export function validResidenceLocation(value:unknown):value is ResidenceLocationRefV1{
 try{
  if(!record(value)||typeof value.kind!=='string')return false;
  if(value.kind==='country')return fields(value,['kind','countryId'])&&countryId(value.countryId);
  if(value.kind==='administrative-area')return fields(value,['kind','administrativeArea'])&&validGeographicAreaReference(value.administrativeArea);
  return value.kind==='settlement-area'&&fields(value,['kind','administrativeArea','settlement'])&&validGeographicAreaReference(value.administrativeArea)&&validSettlementReference(value.settlement);
 }catch{return false;}
}

function validResidenceRecord(value:unknown):value is ResidenceRecordV1{
 return record(value)&&fields(value,['id','sequence','location'])&&residenceId(value.id)&&positiveSafeInteger(value.sequence)&&value.id===`residence:${value.sequence}`&&validResidenceLocation(value.location);
}

function validOccupant(value:unknown):value is ResidenceOccupantV1{
 return record(value)&&fields(value,['personId','residenceId'])&&personId(value.personId)&&residenceId(value.residenceId);
}

const occupantCompare=(left:ResidenceOccupantV1,right:ResidenceOccupantV1)=>codePointCompare(left.personId,right.personId)||Number(left.residenceId.slice(10))-Number(right.residenceId.slice(10));

export function validResidenceState(value:unknown):value is ResidenceStateV1{
 try{
  if(!record(value)||!fields(value,['version','nextSequence','residences','occupants','noFixedAbodePersonIds'])||value.version!==RESIDENCE_VERSION||!positiveSafeInteger(value.nextSequence)||!dense(value.residences)||!dense(value.occupants)||!dense(value.noFixedAbodePersonIds)||!isJsonValue(value))return false;
  const residences=value.residences as unknown as readonly ResidenceRecordV1[],occupants=value.occupants as unknown as readonly ResidenceOccupantV1[],noFixed=value.noFixedAbodePersonIds as unknown as readonly unknown[];
  const residenceIds=new Set<string>(),residenceSequences=new Set<number>(),occupiedResidenceIds=new Set<string>(),occupantPairs=new Set<string>(),occupiedPeople=new Set<string>();
  let previousSequence=0;
  for(const residence of residences){if(!validResidenceRecord(residence)||residence.sequence<=previousSequence||residence.sequence>=value.nextSequence||residenceIds.has(residence.id)||residenceSequences.has(residence.sequence))return false;previousSequence=residence.sequence;residenceIds.add(residence.id);residenceSequences.add(residence.sequence);}
  let previousOccupant:ResidenceOccupantV1|undefined;
  for(const occupant of occupants){if(!validOccupant(occupant)||!residenceIds.has(occupant.residenceId)||previousOccupant&&occupantCompare(previousOccupant,occupant)>=0)return false;const pair=`${occupant.personId}\u0000${occupant.residenceId}`;if(occupantPairs.has(pair))return false;occupantPairs.add(pair);occupiedResidenceIds.add(occupant.residenceId);occupiedPeople.add(occupant.personId);previousOccupant=occupant;}
  if(occupiedResidenceIds.size!==residences.length)return false;
  let previousPerson:string|undefined;
  for(const id of noFixed){if(!personId(id)||previousPerson!==undefined&&codePointCompare(previousPerson,id)>=0||occupiedPeople.has(id))return false;previousPerson=id;}
  return true;
 }catch{return false;}
}

export function validResidenceWithPeople(state:unknown,people:unknown):state is ResidenceStateV1{
 try{if(!validResidenceState(state)||!validPeople(people))return false;const living=new Set(people.people.filter(person=>person.lifeStatus==='living').map(person=>person.id));return state.occupants.every(item=>living.has(item.personId))&&state.noFixedAbodePersonIds.every(id=>living.has(id));}catch{return false;}
}

export function validResidenceLocationContent(location:unknown,geography:GeographyRuntime,settlements:SettlementRuntime):location is ResidenceLocationRefV1{
 try{
  if(!validResidenceLocation(location))return false;
  if(location.kind==='country')return true;
  const area=geography.resolvePlace(location.administrativeArea.partitionId,location.administrativeArea.placeId);if(!area)return false;
  if(location.kind==='administrative-area')return true;
  const pkg=settlements.package(location.settlement.packageId),settlement=settlements.getSettlement(location.settlement.packageId,location.settlement.settlementId);if(!pkg||!settlement||pkg.countryId!==area.identity.countryId)return false;
  return settlements.getSettlementAdministrativeRelations(location.settlement.packageId,location.settlement.settlementId).some(relation=>relation.partitionId===location.administrativeArea.partitionId&&relation.placeId===location.administrativeArea.placeId&&(relation.relation==='contained-by'||relation.relation==='intersects'));
 }catch{return false;}
}

export function validResidenceContent(state:unknown,geography:GeographyRuntime,settlements:SettlementRuntime):state is ResidenceStateV1{
 try{return validResidenceState(state)&&state.residences.every(item=>validResidenceLocationContent(item.location,geography,settlements));}catch{return false;}
}

export function validResidenceWithContext(state:unknown,context:ResidenceValidationContext):state is ResidenceStateV1{
 try{return !!context&&validResidenceWithPeople(state,context.people)&&validResidenceContent(state,context.geography,context.settlements);}catch{return false;}
}

export const compareResidenceOccupants=occupantCompare;

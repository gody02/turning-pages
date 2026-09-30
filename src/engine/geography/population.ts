import type {PeopleState} from '../human/person';
import {validPopulationWithPeople,type PopulationState} from '../human/population';
import type {GeographicPopulationTotal} from './types';
import type {GeographyRuntime} from './runtime';

const contextIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=100&&/^[a-z][a-z0-9-]*$/.test(value);
const stableIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=160&&value.includes('.')&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
function safeAdd(total:number,value:number):number{const next=total+value;if(!Number.isSafeInteger(next))throw Error('Geographic population total exceeds the safe integer range.');return next;}

export function validPopulationGeography(population:unknown,people:unknown,runtime:GeographyRuntime):boolean{
 try{
  if(!validPopulationWithPeople(population,people))return false;const state=population as PopulationState,persons=people as PeopleState,personById=new Map(persons.people.map(person=>[person.id,person]));
  for(const coverage of state.coverage){
   if(coverage.areaPartitionId===null)continue;const partition=runtime.partition(coverage.areaPartitionId);if(!partition||partition.countryId!==coverage.countryId)return false;
   for(const cohort of state.cohorts)if(cohort.countryId===coverage.countryId&&(!cohort.areaId||!runtime.isPopulationAllocationCell(coverage.areaPartitionId,cohort.areaId)))return false;
   for(const membership of state.memberships)if(membership.countryId===coverage.countryId){if(membership.areaId!==null&&!runtime.isPopulationAllocationCell(coverage.areaPartitionId,membership.areaId))return false;const person=personById.get(membership.personId);if(coverage.status==='complete'&&person?.lifeStatus==='living'&&membership.areaId===null)return false;}
  }
  return true;
 }catch{return false;}
}

export function geographyAreaExists(runtime:GeographyRuntime):(partitionId:string,areaId:string)=>boolean{return (partitionId,areaId)=>runtime.isPopulationAllocationCell(partitionId,areaId);}

export function deriveGeographicPopulation(population:PopulationState,people:PeopleState,runtime:GeographyRuntime,input:Readonly<{countryId:string;partitionId:string;placeId:string}>):GeographicPopulationTotal{
 if(!validPopulationGeography(population,people,runtime)||!contextIdentifier(input.countryId)||!stableIdentifier(input.partitionId)||!stableIdentifier(input.placeId))throw Error('Invalid geographic population query.');
 const coverage=population.coverage.find(item=>item.countryId===input.countryId);if(!coverage||coverage.areaPartitionId!==input.partitionId||runtime.partition(input.partitionId)?.countryId!==input.countryId||!runtime.resolvePlace(input.partitionId,input.placeId))throw Error('Geographic population query does not match Population coverage.');
 const inSubtree=(placeId:string)=>placeId===input.placeId||runtime.isWithin(input.partitionId,placeId,input.placeId);let knownLiving=0;
 for(const cohort of population.cohorts)if(cohort.countryId===input.countryId&&cohort.areaId!==null&&inSubtree(cohort.areaId))knownLiving=safeAdd(knownLiving,cohort.count);
 const personById=new Map(people.people.map(person=>[person.id,person]));for(const membership of population.memberships)if(membership.countryId===input.countryId&&membership.areaId!==null&&personById.get(membership.personId)?.lifeStatus==='living'&&inSubtree(membership.areaId))knownLiving=safeAdd(knownLiving,1);
 return Object.freeze({knownLiving,complete:coverage.status==='complete'});
}

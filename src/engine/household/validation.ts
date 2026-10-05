import {isJsonValue} from '../core/json';
import {validPeople} from '../human/person';
import type {HouseholdStateV1} from './types';

const positiveSafe=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const personId=(value:unknown):value is string=>typeof value==='string'&&value.length<=23&&/^person:[1-9]\d*$/.test(value)&&positiveSafe(Number(value.slice(7)))&&value===`person:${Number(value.slice(7))}`;
const householdId=(value:unknown):value is string=>typeof value==='string'&&value.length<=26&&/^household:[1-9]\d*$/.test(value)&&positiveSafe(Number(value.slice(10)))&&value===`household:${Number(value.slice(10))}`;
const compare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const fields=(value:unknown,keys:readonly string[])=>{
  if(!record(value))return false;
  const actual=Reflect.ownKeys(value);
  return actual.length===keys.length&&actual.every(key=>typeof key==='string'&&keys.includes(key)&&!!Object.getOwnPropertyDescriptor(value,key)?.enumerable&&'value' in Object.getOwnPropertyDescriptor(value,key)!);
};
const dense=(value:unknown):value is readonly unknown[]=>{
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||Reflect.ownKeys(value).length!==value.length+1)return false;
  for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,index);if(!descriptor?.enumerable||!('value' in descriptor))return false;}
  return true;
};

/** Structure-only acceptance never repairs ordering, empty records or duplicate pairs. */
export function validHouseholdState(value:unknown):value is HouseholdStateV1{
  try{
    if(!fields(value,['version','nextSequence','households','memberships'])||!isJsonValue(value))return false;
    const input=value as Record<string,unknown>;
    if(!dense(input.households)||!dense(input.memberships)||!input.households.every(item=>fields(item,['id','sequence']))||!input.memberships.every(item=>fields(item,['personId','householdId'])))return false;
    // Clone acceptance rejects proxies without making any caller-owned object authority.
    const state=structuredClone(value) as unknown as HouseholdStateV1;
    if(state.version!==1||!positiveSafe(state.nextSequence))return false;
    const ids=new Set<string>(),occupied=new Set<string>();
    let previousSequence=0;
    for(const household of state.households){
      if(!householdId(household.id)||!positiveSafe(household.sequence)||household.id!==`household:${household.sequence}`||household.sequence<=previousSequence||household.sequence>=state.nextSequence||ids.has(household.id))return false;
      previousSequence=household.sequence;ids.add(household.id);
    }
    let previous:HouseholdStateV1['memberships'][number]|undefined;
    for(const membership of state.memberships){
      if(!personId(membership.personId)||!householdId(membership.householdId)||!ids.has(membership.householdId))return false;
      if(previous&&(compare(previous.personId,membership.personId)||Number(previous.householdId.slice(10))-Number(membership.householdId.slice(10)))>=0)return false;
      previous=membership;occupied.add(membership.householdId);
    }
    return occupied.size===ids.size;
  }catch{return false;}
}

/** Living status and identity resolve only through the supplied frozen People contract. */
export function validHouseholdWithPeople(value:unknown,people:unknown):value is HouseholdStateV1{
  try{
    if(!validHouseholdState(value)||!isJsonValue(people))return false;
    const owned=structuredClone(people);
    if(!validPeople(owned))return false;
    const living=new Set(owned.people.filter(person=>person.lifeStatus==='living').map(person=>person.id));
    return value.memberships.every(membership=>living.has(membership.personId));
  }catch{return false;}
}

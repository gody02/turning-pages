import {isJsonValue} from '../core/json';
import {validPeople} from '../human/person';
import type {HouseholdCreationResultV1,HouseholdId,HouseholdPersonId,HouseholdStateV1,HouseholdValidationContext} from './types';
import {validHouseholdState,validHouseholdWithPeople} from './validation';

const compare=(left:string,right:string)=>left<right?-1:left>right?1:0;
function immutable<T>(value:T):T{
  const copy=structuredClone(value);
  const freeze=(item:unknown):void=>{if(item&&typeof item==='object'){for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(item)))if('value' in descriptor)freeze(descriptor.value);Object.freeze(item);}};
  freeze(copy);return copy;
}

function ownInputs(state:HouseholdStateV1,context:HouseholdValidationContext):{state:HouseholdStateV1;context:HouseholdValidationContext}{
  try{
    if(!validHouseholdState(state)||!context||typeof context!=='object'||Array.isArray(context)||!isJsonValue(context))throw Error();
    const keys=Reflect.ownKeys(context),descriptor=Object.getOwnPropertyDescriptor(context,'people');
    if(keys.length!==1||keys[0]!=='people'||!descriptor?.enumerable||!('value' in descriptor))throw Error();
    const owned={state:structuredClone(state),context:structuredClone(context)};
    if(!validPeople(owned.context.people))throw Error();
    return owned;
  }catch{throw Error('Invalid Household state or validation context.');}
}
function ordinaryInputs(state:HouseholdStateV1,context:HouseholdValidationContext){
  const owned=ownInputs(state,context);
  if(!validHouseholdWithPeople(owned.state,owned.context.people))throw Error('Invalid Household state or validation context.');
  return owned;
}
function commit(state:HouseholdStateV1,context:HouseholdValidationContext):HouseholdStateV1{
  const candidate:HouseholdStateV1={version:1,nextSequence:state.nextSequence,
    households:state.households.map(item=>({id:item.id,sequence:item.sequence})).sort((a,b)=>a.sequence-b.sequence),
    memberships:state.memberships.map(item=>({personId:item.personId,householdId:item.householdId})).sort((a,b)=>compare(a.personId,b.personId)||Number(a.householdId.slice(10))-Number(b.householdId.slice(10)))};
  if(!validHouseholdWithPeople(candidate,context.people))throw Error('Household transition failed validation.');
  return immutable(candidate);
}
const living=(context:HouseholdValidationContext,id:string)=>context.people.people.some(person=>person.id===id&&person.lifeStatus==='living');
const pair=(state:HouseholdStateV1,personId:string,householdId:string)=>state.memberships.some(item=>item.personId===personId&&item.householdId===householdId);
const exists=(state:HouseholdStateV1,id:string)=>state.households.some(item=>item.id===id);
function ownedMembers(value:readonly HouseholdPersonId[]):readonly HouseholdPersonId[]{
  try{
    if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length===0||!isJsonValue(value))throw Error();
    const ids=structuredClone(value);
    if(!ids.every((id):id is string=>typeof id==='string')||new Set(ids).size!==ids.length)throw Error();
    return [...ids].sort(compare);
  }catch{throw Error('Invalid Household initial members.');}
}
function prune(state:HouseholdStateV1):HouseholdStateV1{
  const occupied=new Set(state.memberships.map(item=>item.householdId));
  return {...state,households:state.households.filter(item=>occupied.has(item.id))};
}

export function createEmptyHouseholdState():HouseholdStateV1{return immutable({version:1,nextSequence:1,households:[],memberships:[]});}

export function createHousehold(state:HouseholdStateV1,personIds:readonly HouseholdPersonId[],context:HouseholdValidationContext):HouseholdCreationResultV1{
  const owned=ordinaryInputs(state,context),ids=ownedMembers(personIds);
  const livingIds=new Set(owned.context.people.people.filter(person=>person.lifeStatus==='living').map(person=>person.id));
  if(ids.some(id=>!livingIds.has(id)))throw Error('Invalid Household initial members.');
  if(owned.state.nextSequence===Number.MAX_SAFE_INTEGER)throw Error('Household sequence is exhausted.');
  const sequence=owned.state.nextSequence,household={id:`household:${sequence}`,sequence};
  const next=commit({...owned.state,nextSequence:sequence+1,households:[...owned.state.households,household],memberships:[...owned.state.memberships,...ids.map(personId=>({personId,householdId:household.id}))]},owned.context);
  return Object.freeze({state:next,household:next.households.find(item=>item.id===household.id)!});
}

export function addHouseholdMember(state:HouseholdStateV1,personId:HouseholdPersonId,householdId:HouseholdId,context:HouseholdValidationContext):HouseholdStateV1{
  const owned=ordinaryInputs(state,context);
  if(!living(owned.context,personId)||!exists(owned.state,householdId)||pair(owned.state,personId,householdId))throw Error('Invalid Household member addition.');
  return commit({...owned.state,memberships:[...owned.state.memberships,{personId,householdId}]},owned.context);
}

export function removeHouseholdMember(state:HouseholdStateV1,personId:HouseholdPersonId,householdId:HouseholdId,context:HouseholdValidationContext):HouseholdStateV1{
  const owned=ordinaryInputs(state,context);
  if(!pair(owned.state,personId,householdId))throw Error('Unknown Household membership.');
  return commit(prune({...owned.state,memberships:owned.state.memberships.filter(item=>item.personId!==personId||item.householdId!==householdId)}),owned.context);
}

/** Replaces only the specified pair; it moves no residence, Person or other membership. */
export function transferHouseholdMembership(state:HouseholdStateV1,personId:HouseholdPersonId,fromHouseholdId:HouseholdId,toHouseholdId:HouseholdId,context:HouseholdValidationContext):HouseholdStateV1{
  const owned=ordinaryInputs(state,context);
  if(fromHouseholdId===toHouseholdId||!exists(owned.state,fromHouseholdId)||!exists(owned.state,toHouseholdId)||!pair(owned.state,personId,fromHouseholdId)||pair(owned.state,personId,toHouseholdId))throw Error('Invalid Household membership transfer.');
  const memberships=[...owned.state.memberships.filter(item=>item.personId!==personId||item.householdId!==fromHouseholdId),{personId,householdId:toHouseholdId}];
  return commit(prune({...owned.state,memberships}),owned.context);
}

/** Targeted lifecycle cleanup permits this Person's new death, never unrelated corruption. */
export function removePersonFromHouseholds(state:HouseholdStateV1,personId:HouseholdPersonId,context:HouseholdValidationContext):HouseholdStateV1{
  const owned=ownInputs(state,context);
  if(!owned.context.people.people.some(person=>person.id===personId))throw Error('Unknown Household lifecycle Person.');
  const otherLiving=new Set(owned.context.people.people.filter(person=>person.id!==personId&&person.lifeStatus==='living').map(person=>person.id));
  if(owned.state.memberships.some(item=>item.personId!==personId&&!otherLiving.has(item.personId)))throw Error('Household lifecycle removal cannot repair unrelated invalid state.');
  return commit(prune({...owned.state,memberships:owned.state.memberships.filter(item=>item.personId!==personId)}),owned.context);
}

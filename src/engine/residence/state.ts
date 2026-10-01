import {validPeople} from '../human/person';
import type {ResidenceId,ResidenceLocationRefV1,ResidenceRecordV1,ResidenceStateV1} from './types';
import {RESIDENCE_VERSION,codePointCompare,compareResidenceOccupants,validResidenceContent,validResidenceLocation,validResidenceLocationContent,validResidenceState,validResidenceWithContext,type ResidenceValidationContext} from './validation';

function freezeDeep(value:unknown):void{if(!value||typeof value!=='object'||Object.isFrozen(value))return;for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(descriptor&&'value' in descriptor)freezeDeep(descriptor.value);}Object.freeze(value);}
function immutable<T>(value:T):T{const copy=structuredClone(value);freezeDeep(copy);return copy;}
const densePersonIds=(value:unknown):value is readonly string[]=>{try{if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length===0||Object.keys(value).length!==value.length||Reflect.ownKeys(value).length!==value.length+1)return false;const ids:string[]=[];for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,index);if(!descriptor?.enumerable||!('value' in descriptor)||typeof descriptor.value!=='string'||!/^person:[1-9]\d*$/.test(descriptor.value))return false;ids.push(descriptor.value);}return new Set(ids).size===ids.length;}catch{return false;}};
const personExists=(context:ResidenceValidationContext,id:string,living=true)=>context.people.people.some(person=>person.id===id&&(!living||person.lifeStatus==='living'));

function canonical(candidate:ResidenceStateV1):ResidenceStateV1{
 const state={version:RESIDENCE_VERSION,nextSequence:candidate.nextSequence,residences:[...candidate.residences].sort((a,b)=>a.sequence-b.sequence),occupants:[...candidate.occupants].sort(compareResidenceOccupants),noFixedAbodePersonIds:[...candidate.noFixedAbodePersonIds].sort(codePointCompare)};
 return immutable(state);
}
function assertState(state:ResidenceStateV1,context:ResidenceValidationContext):void{if(!validResidenceWithContext(state,context))throw Error('Invalid Residence state or validation context.');}
function assertLocation(location:ResidenceLocationRefV1,context:ResidenceValidationContext):void{if(!validResidenceLocation(location)||!validResidenceLocationContent(location,context.geography,context.settlements))throw Error('Invalid Residence location.');}
function commit(candidate:ResidenceStateV1,context:ResidenceValidationContext):ResidenceStateV1{const next=canonical(candidate);if(!validResidenceWithContext(next,context))throw Error('Residence transition failed validation.');return next;}

export function createEmptyResidenceState():ResidenceStateV1{return immutable({version:RESIDENCE_VERSION,nextSequence:1,residences:[],occupants:[],noFixedAbodePersonIds:[]});}

export function establishResidence(state:ResidenceStateV1,personIds:readonly string[],location:ResidenceLocationRefV1,context:ResidenceValidationContext):Readonly<{state:ResidenceStateV1;residence:ResidenceRecordV1}>{
 assertState(state,context);assertLocation(location,context);
 if(!densePersonIds(personIds)||personIds.some(id=>!personExists(context,id)||state.noFixedAbodePersonIds.includes(id)))throw Error('Invalid Residence occupants.');
 if(state.nextSequence===Number.MAX_SAFE_INTEGER)throw Error('Residence sequence is exhausted.');
 const sequence=state.nextSequence,residence:ResidenceRecordV1={id:`residence:${sequence}`,sequence,location},next=commit({version:RESIDENCE_VERSION,nextSequence:sequence+1,residences:[...state.residences,residence],occupants:[...state.occupants,...personIds.map(personId=>({personId,residenceId:residence.id}))],noFixedAbodePersonIds:state.noFixedAbodePersonIds},context);
 return immutable({state:next,residence:next.residences.find(item=>item.id===residence.id)!});
}

export function joinResidence(state:ResidenceStateV1,personId:string,residenceId:ResidenceId,context:ResidenceValidationContext):ResidenceStateV1{
 assertState(state,context);if(!personExists(context,personId)||state.noFixedAbodePersonIds.includes(personId)||!state.residences.some(item=>item.id===residenceId)||state.occupants.some(item=>item.personId===personId&&item.residenceId===residenceId))throw Error('Invalid Residence join.');
 return commit({...state,occupants:[...state.occupants,{personId,residenceId}]},context);
}

export function leaveResidence(state:ResidenceStateV1,personId:string,residenceId:ResidenceId,context:ResidenceValidationContext):ResidenceStateV1{
 assertState(state,context);if(!state.occupants.some(item=>item.personId===personId&&item.residenceId===residenceId))throw Error('Unknown Residence occupancy.');
 const occupants=state.occupants.filter(item=>item.personId!==personId||item.residenceId!==residenceId),residences=occupants.some(item=>item.residenceId===residenceId)?state.residences:state.residences.filter(item=>item.id!==residenceId);
 return commit({...state,residences,occupants},context);
}

export function relocateResidence(state:ResidenceStateV1,residenceId:ResidenceId,location:ResidenceLocationRefV1,context:ResidenceValidationContext):ResidenceStateV1{
 assertState(state,context);assertLocation(location,context);const index=state.residences.findIndex(item=>item.id===residenceId);if(index<0)throw Error('Unknown Residence.');const residences=[...state.residences];residences[index]={...residences[index],location};return commit({...state,residences},context);
}

export function recordNoFixedAbode(state:ResidenceStateV1,personId:string,context:ResidenceValidationContext):ResidenceStateV1{
 assertState(state,context);if(!personExists(context,personId)||state.noFixedAbodePersonIds.includes(personId)||state.occupants.some(item=>item.personId===personId))throw Error('Invalid no-fixed-abode transition.');return commit({...state,noFixedAbodePersonIds:[...state.noFixedAbodePersonIds,personId]},context);
}

export function clearNoFixedAbode(state:ResidenceStateV1,personId:string,context:ResidenceValidationContext):ResidenceStateV1{
 assertState(state,context);if(!state.noFixedAbodePersonIds.includes(personId))throw Error('No no-fixed-abode marker exists.');return commit({...state,noFixedAbodePersonIds:state.noFixedAbodePersonIds.filter(id=>id!==personId)},context);
}

/** Lifecycle composition repair: removes every current Residence fact for one Person atomically. */
export function removePersonFromResidences(state:ResidenceStateV1,personId:string,context:ResidenceValidationContext):ResidenceStateV1{
 if(!validResidenceState(state)||!validPeople(context.people)||!validResidenceContent(state,context.geography,context.settlements)||!personExists(context,personId,false))throw Error('Invalid Residence lifecycle removal.');
 const otherPeople=new Set(context.people.people.filter(person=>person.id!==personId&&person.lifeStatus==='living').map(person=>person.id));if(state.occupants.some(item=>item.personId!==personId&&!otherPeople.has(item.personId))||state.noFixedAbodePersonIds.some(id=>id!==personId&&!otherPeople.has(id)))throw Error('Residence lifecycle removal cannot repair unrelated invalid state.');
 const occupants=state.occupants.filter(item=>item.personId!==personId),occupied=new Set(occupants.map(item=>item.residenceId)),residences=state.residences.filter(item=>occupied.has(item.id)),next=canonical({...state,residences,occupants,noFixedAbodePersonIds:state.noFixedAbodePersonIds.filter(id=>id!==personId)});if(!validResidenceWithContext(next,context))throw Error('Residence lifecycle removal failed validation.');return next;
}

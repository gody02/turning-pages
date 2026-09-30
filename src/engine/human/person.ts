import {compareDates,isSimulationDate} from '../core/clock';
import type {SimulationDate} from '../core/model';
import {validPersonDisplayName} from '../shared/personDisplayName';

export const PEOPLE_VERSION=1 as const;
export type PersonLifeStatus='living'|'deceased';
export type HumanScores=Readonly<Record<string,number>>;
export type Person={
 readonly id:string;readonly sequence:number;readonly name:string;readonly dateOfBirth:Readonly<SimulationDate>;
 readonly genderLabel:string;readonly lifeStatus:PersonLifeStatus;readonly diedAt?:Readonly<SimulationDate>;
 readonly traits:readonly string[];readonly temperament:HumanScores;readonly aptitudes:HumanScores;
};
export type PeopleState={readonly version:1;readonly nextSequence:number;readonly playerId:string;readonly people:readonly Person[]};
export type PersonInput={name:string;dateOfBirth:SimulationDate;genderLabel:string;lifeStatus:PersonLifeStatus;diedAt?:SimulationDate;traits?:readonly string[];temperament?:Readonly<Record<string,number>>;aptitudes?:Readonly<Record<string,number>>};

const record=(value:unknown):value is Record<string,unknown>=>{try{return !!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);}catch{return false;}};
const fields=(value:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>{try{const allowed=new Set([...required,...optional]),keys=Reflect.ownKeys(value);if(keys.some(key=>typeof key!=='string'||!allowed.has(key))||required.some(key=>!keys.includes(key)))return false;return keys.every(key=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);return !!descriptor?.enumerable&&'value' in descriptor;});}catch{return false;}};
const safePositive=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const exactDate=(value:unknown):value is SimulationDate=>record(value)&&fields(value,['year','month','day'])&&isSimulationDate(value);
const personId=(value:unknown):value is string=>typeof value==='string'&&/^person:[1-9]\d*$/.test(value);
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&value.length<=max&&value.trim().length>0;
/** Preserves the established root gender field exactly; it is a label, not inferred biological state. */
const genderLabel=(value:unknown):value is string=>typeof value==='string'&&value.length<=40;
const traitId=(value:unknown):value is string=>text(value,100);
/** Temperament and aptitude keys are stable namespaced human-domain identifiers. */
const scoreKey=(value:string)=>value.length<=160&&value.includes('.')&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
const denseUniqueStrings=(value:unknown,predicate:(item:unknown)=>item is string):value is readonly string[]=>{try{if(!Array.isArray(value)||Object.keys(value).length!==value.length||Reflect.ownKeys(value).length!==value.length+1)return false;const seen=new Set<string>();for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,index);if(!descriptor?.enumerable||!('value' in descriptor)||!predicate(descriptor.value)||seen.has(descriptor.value))return false;seen.add(descriptor.value);}return true;}catch{return false;}};
const validScores=(value:unknown):value is HumanScores=>{try{if(!record(value))return false;return Reflect.ownKeys(value).every(key=>{if(typeof key!=='string'||!scoreKey(key))return false;const descriptor=Object.getOwnPropertyDescriptor(value,key);return !!descriptor?.enumerable&&'value' in descriptor&&typeof descriptor.value==='number'&&Number.isFinite(descriptor.value)&&descriptor.value>=0&&descriptor.value<=100;});}catch{return false;}};
function freezeDeep(value:unknown):void{if(!value||typeof value!=='object'||Object.isFrozen(value))return;for(const key of Reflect.ownKeys(value))freezeDeep((value as Record<PropertyKey,unknown>)[key]);Object.freeze(value);}
function immutable<T>(value:T):T{const copy=structuredClone(value);freezeDeep(copy);return copy;}

export function validPerson(value:unknown,expectedSequence?:number):value is Person{
 try{
  if(!record(value)||!fields(value,['id','sequence','name','dateOfBirth','genderLabel','lifeStatus','traits','temperament','aptitudes'],['diedAt']))return false;
  if(!safePositive(value.sequence)||(expectedSequence!==undefined&&value.sequence!==expectedSequence)||value.id!==`person:${value.sequence}`||!personId(value.id))return false;
  if(!validPersonDisplayName(value.name)||!genderLabel(value.genderLabel)||!exactDate(value.dateOfBirth)||!denseUniqueStrings(value.traits,traitId)||!validScores(value.temperament)||!validScores(value.aptitudes))return false;
  if(value.lifeStatus!=='living'&&value.lifeStatus!=='deceased')return false;
  if(value.lifeStatus==='living')return value.diedAt===undefined;
  return value.diedAt===undefined||exactDate(value.diedAt)&&compareDates(value.diedAt,value.dateOfBirth)>=0;
 }catch{return false;}
}

export function validPeople(value:unknown):value is PeopleState{
 try{
  if(!record(value)||!fields(value,['version','nextSequence','playerId','people'])||value.version!==PEOPLE_VERSION||!safePositive(value.nextSequence)||!personId(value.playerId)||!Array.isArray(value.people)||value.people.length===0)return false;
  if(Object.keys(value.people).length!==value.people.length||Reflect.ownKeys(value.people).length!==value.people.length+1)return false;
  let playerMatches=0;
  for(let index=0;index<value.people.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value.people,index),sequence=index+1;if(!descriptor?.enumerable||!('value' in descriptor)||!validPerson(descriptor.value,sequence))return false;if(descriptor.value.id===value.playerId)playerMatches++;}
  return value.nextSequence===value.people.length+1&&playerMatches===1;
 }catch{return false;}
}

function constructPerson(sequence:number,input:PersonInput,allowUnknownLegacyDeath:boolean):Person{
 if(input.lifeStatus==='deceased'&&input.diedAt===undefined&&!allowUnknownLegacyDeath)throw Error('A new deceased Person requires an exact death date.');
 const person={id:`person:${sequence}`,sequence,name:input.name,dateOfBirth:input.dateOfBirth,genderLabel:input.genderLabel,lifeStatus:input.lifeStatus,...(input.diedAt===undefined?{}:{diedAt:input.diedAt}),traits:input.traits??[],temperament:input.temperament??{},aptitudes:input.aptitudes??{}};
 if(!validPerson(person,sequence))throw Error('Invalid Person.');return immutable(person);
}
export function createPerson(sequence:number,input:PersonInput):Person{return constructPerson(sequence,input,false);}
/** Compatibility-only construction for a legacy death whose exact date was never stored. */
export function createLegacyPerson(sequence:number,input:PersonInput):Person{return constructPerson(sequence,input,true);}
export function createPeople(player:PersonInput):PeopleState{const person=createPerson(1,player);return immutable({version:PEOPLE_VERSION,nextSequence:2,playerId:person.id,people:[person]});}
/** Migration-only PeopleState construction; normal player creation must use createPeople. */
export function createLegacyPeople(player:PersonInput):PeopleState{const person=createLegacyPerson(1,player);return immutable({version:PEOPLE_VERSION,nextSequence:2,playerId:person.id,people:[person]});}
export function allocatePerson(state:PeopleState,input:PersonInput):{state:PeopleState;person:Person}{
 if(!validPeople(state)||state.nextSequence===Number.MAX_SAFE_INTEGER)throw Error('Invalid People state.');
 const person=createPerson(state.nextSequence,input),next=immutable({version:PEOPLE_VERSION,nextSequence:state.nextSequence+1,playerId:state.playerId,people:[...state.people,person]});return {state:next,person:next.people.at(-1)!};
}
export function replacePerson(state:PeopleState,person:Person):PeopleState{
 if(!validPeople(state)||!validPerson(person))throw Error('Invalid Person replacement.');const index=state.people.findIndex(candidate=>candidate.id===person.id);if(index<0||state.people[index].sequence!==person.sequence)throw Error('Unknown Person.');
 const people=[...state.people];people[index]=person;const next=immutable({version:PEOPLE_VERSION,nextSequence:state.nextSequence,playerId:state.playerId,people});if(!validPeople(next))throw Error('Invalid People state.');return next;
}
export function getPerson(state:PeopleState,id:string):Person|undefined{if(!validPeople(state)||!personId(id))return undefined;const sequence=Number(id.slice(7)),person=state.people[sequence-1];return person?.id===id?immutable(person):undefined;}
export function playerPerson(state:PeopleState):Person{const person=getPerson(state,state.playerId);if(!person)throw Error('People state has no player Person.');return person;}

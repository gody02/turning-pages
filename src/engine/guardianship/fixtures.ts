import {allocatePerson,createPeople,replacePerson,type PeopleState} from '../human/person';
import {withGuardianshipKindFingerprint,createGuardianshipKindRegistry} from './kinds';
import type {GuardianshipInputV1,GuardianshipValidationContext} from './types';
export const fixtureDate={year:2024,month:6,day:30};
export function fixturePeople(count=12):PeopleState{
  const input=(index:number)=>({name:'Synthetic Person '+index,genderLabel:'Unspecified',dateOfBirth:{year:index===4?2024:index===3?1950:1980,month:6,day:30},lifeStatus:'living' as const});
  let state=createPeople(input(1));for(let index=2;index<=count;index++)state=allocatePerson(state,input(index)).state;return state;
}
export const fixtureKind=withGuardianshipKindFingerprint({version:1,kindId:'synthetic.responsibility.v1',label:'Synthetic responsibility',definition:'Fixture-only recognised personal responsibility; not a jurisdictional legal rule.',jurisdictionId:null,classification:'authored-gameplay-abstraction',sourceIds:[],limitations:['Synthetic only; no legal eligibility claim.']});
export const fixtureRef={kindId:fixtureKind.kindId,fingerprint:fixtureKind.fingerprint};
export function fixtureContext():GuardianshipValidationContext{return {people:fixturePeople(),referenceDate:{...fixtureDate},kinds:createGuardianshipKindRegistry([fixtureKind],[fixtureRef])};}
export function fixtureInput():GuardianshipInputV1{return {holderId:'person:1',protectedPersonId:'person:4',authorityKind:{...fixtureRef},basis:{kind:'unspecified'},beganOn:null};}
export function deceased(people:PeopleState,id:string):PeopleState{const person=people.people.find(p=>p.id===id)!;return replacePerson(people,{...person,lifeStatus:'deceased',diedAt:{...fixtureDate}});}

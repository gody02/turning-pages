import {allocatePerson,createPeople,replacePerson,type PeopleState} from '../human/person';
import type {CareValidationContext} from './types';
export const fixtureDate={year:2024,month:6,day:30};
export function fixtureContext(count=12):CareValidationContext{
  const input={name:'Synthetic Care Person',genderLabel:'Unspecified',dateOfBirth:{year:1980,month:6,day:30},lifeStatus:'living' as const};
  let people=createPeople(input);for(let i=1;i<count;i++)people=allocatePerson(people,input).state;return {people,referenceDate:{...fixtureDate}};
}
export function deceased(people:PeopleState,id:string):PeopleState{const p=people.people.find(x=>x.id===id)!;return replacePerson(people,{...p,lifeStatus:'deceased',diedAt:{...fixtureDate}});}

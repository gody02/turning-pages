import {compareDates,isSimulationDate} from '../core/clock';
import type {LifeState,SimulationDate} from '../core/model';
import {createLegacyPeople,createLegacyPerson,createPeople,createPerson,playerPerson,replacePerson,type PeopleState,type Person} from './person';

export type PersonCompatibleState=LifeState&{people?:PeopleState};
const inputFrom=(state:PersonCompatibleState)=>({name:state.name,dateOfBirth:state.dateOfBirth!,genderLabel:state.gender,lifeStatus:state.alive?'living' as const:'deceased' as const,traits:state.development?.traits??[],temperament:{},aptitudes:{}});
export function createPlayerPeople(state:PersonCompatibleState):PeopleState{if(!isSimulationDate(state.dateOfBirth))throw Error('A canonical date of birth is required.');return createPeople(inputFrom(state));}
/** Used only after legacy Clock normalization; it preserves an unknowable historical death date. */
export function createLegacyPlayerPeople(state:PersonCompatibleState):PeopleState{if(!isSimulationDate(state.dateOfBirth))throw Error('A canonical date of birth is required.');return createLegacyPeople(inputFrom(state));}
function updatePlayer<T extends PersonCompatibleState>(state:T,change:(person:Person)=>Person):T{if(!state.people)return state;const current=playerPerson(state.people);state.people=replacePerson(state.people,change(current));return state;}
const recreate=(person:Person,overrides:Partial<{dateOfBirth:SimulationDate;lifeStatus:'living'|'deceased';diedAt:SimulationDate;traits:readonly string[]}>={})=>{
 const input={name:person.name,dateOfBirth:overrides.dateOfBirth??person.dateOfBirth as SimulationDate,genderLabel:person.genderLabel,lifeStatus:overrides.lifeStatus??person.lifeStatus,...((overrides.lifeStatus??person.lifeStatus)==='deceased'&&(overrides.diedAt??person.diedAt)?{diedAt:(overrides.diedAt??person.diedAt) as SimulationDate}:{}),traits:overrides.traits??person.traits,temperament:person.temperament,aptitudes:person.aptitudes};
 return person.lifeStatus==='deceased'&&!person.diedAt?createLegacyPerson(person.sequence,input):createPerson(person.sequence,input);
};
export function setPlayerDateOfBirth<T extends PersonCompatibleState>(state:T,dateOfBirth:SimulationDate):T{if(!isSimulationDate(dateOfBirth))throw Error('Invalid player date of birth.');state.dateOfBirth={...dateOfBirth};return updatePlayer(state,person=>recreate(person,{dateOfBirth}));}
export function addPlayerTrait<T extends PersonCompatibleState>(state:T,trait:string):T{return updatePlayer(state,person=>person.traits.includes(trait)?person:recreate(person,{traits:[...person.traits,trait]}));}
export function recordPlayerDeath<T extends PersonCompatibleState>(state:T,diedAt:SimulationDate):T{if(!isSimulationDate(diedAt))throw Error('Invalid player death date.');return updatePlayer(state,person=>person.lifeStatus==='deceased'&&person.diedAt?person:recreate(person,{lifeStatus:'deceased',diedAt}));}
export function synchronizeNewPlayerDeath<T extends PersonCompatibleState>(previous:T,next:T):T{if(previous.alive&&!next.alive&&next.clock)return recordPlayerDeath(next,next.clock.date);return next;}
export function validPlayerPersonProjection(state:PersonCompatibleState):boolean{
 try{if(!state.people||!isSimulationDate(state.dateOfBirth)||!state.clock||!isSimulationDate(state.clock.date))return false;const person=playerPerson(state.people),traits=state.development?.traits??[];if(person.name!==state.name||person.genderLabel!==state.gender||person.lifeStatus!==(state.alive?'living':'deceased'))return false;if(compareDates(person.dateOfBirth as SimulationDate,state.dateOfBirth)!==0||person.traits.length!==traits.length||person.traits.some((trait,index)=>trait!==traits[index]))return false;return person.diedAt===undefined||compareDates(person.diedAt as SimulationDate,state.clock.date)<=0;}catch{return false;}
}

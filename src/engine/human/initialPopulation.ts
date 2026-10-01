import {createPeople,type PeopleState,type Person,type PersonInput} from './person';
import {adjustPopulationCohort,createCohortMembership,validPopulation,validPopulationWithPeople,type PopulationState} from './population';

export type InitialCohortPlayerResult=Readonly<{people:PeopleState;population:PopulationState;person:Person}>;

function freezeDeep(value:unknown):void{if(!value||typeof value!=='object'||Object.isFrozen(value))return;for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(descriptor&&'value' in descriptor)freezeDeep(descriptor.value);}Object.freeze(value);}

/**
 * New-world chicken-and-egg bridge. It reuses canonical cohort adjustment and
 * receipt construction; it does not define another cohort identity or receipt.
 */
export function instantiateInitialPlayerFromCohort(input:Readonly<{population:PopulationState;cohortId:string;requestKey:string;personInput:PersonInput}>):InitialCohortPlayerResult{
 if(!validPopulation(input.population)||input.population.memberships.length!==0)throw Error('Initial cohort composition requires an uninstantiated Population.');
 const people=createPeople(input.personInput),person=people.people[0],decremented=adjustPopulationCohort(input.population,input.cohortId,-1),membership=createCohortMembership(person,input.cohortId,input.requestKey,0);
 const population:PopulationState={...decremented,memberships:[membership]};
 if(!validPopulationWithPeople(population,people))throw Error('Initial cohort composition failed validation.');
 freezeDeep(population);return Object.freeze({people,population,person});
}

// Synthetic instantiated Persons only. No production generation or legal content.
import {createPerson,createLegacyPerson} from '../human/person';
import type {PeopleState} from '../human/person';
export const referenceDate={year:2032,month:6,day:30};
export function fixturePeople(count=12,deceased:readonly number[]=[],unknownDeath=false):PeopleState{
  return {version:1,nextSequence:count+1,playerId:'person:1',people:Array.from({length:count},(_,index)=>{
    const sequence=index+1,input={name:`Synthetic Person ${sequence}`,dateOfBirth:{year:2000,month:1,day:1},genderLabel:sequence%2?'Unspecified':'Custom identity',lifeStatus:deceased.includes(sequence)?'deceased' as const:'living' as const,...(deceased.includes(sequence)&&!unknownDeath?{diedAt:{year:2030,month:2,day:28}}:{})};
    return unknownDeath?createLegacyPerson(sequence,input):createPerson(sequence,input);
  })};
}
export const fixtureContext=(count=12,deceased:readonly number[]=[])=>({people:fixturePeople(count,deceased),referenceDate});

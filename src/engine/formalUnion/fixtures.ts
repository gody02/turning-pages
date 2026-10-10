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
import {createFormalUnionKindRegistry,withFormalUnionKindFingerprint} from './kinds';
import type {FormalUnionKindInputV1} from './types';
export function fixtureKindInput(kindId='formal-union-kind.synthetic.pair-v1'):FormalUnionKindInputV1{
  return {version:1,kindId,label:'Synthetic pair contract',definition:'An authored structural pair contract; this is not jurisdictional law.',jurisdictionId:null,classification:'authored-gameplay-abstraction',sourceIds:[],limitations:['Synthetic test content only.']};
}
export function fixtureKinds(){
  const kinds=['formal-union-kind.synthetic.pair-v1','formal-union-kind.synthetic.second-v1'].map(id=>withFormalUnionKindFingerprint(fixtureKindInput(id)));
  return createFormalUnionKindRegistry(kinds,kinds.map(kind=>({kindId:kind.kindId,fingerprint:kind.fingerprint})));
}
export const fixtureContext=(count=12,deceased:readonly number[]=[],unknownDeath=false)=>({people:fixturePeople(count,deceased,unknownDeath),referenceDate,kinds:fixtureKinds()});
export const fixtureInput=(a=1,b=2,kindId='formal-union-kind.synthetic.pair-v1')=>({personIds:[`person:${a}`,`person:${b}`] as const,kindId,formedOn:{year:2024,month:6,day:30}});

import {immutable,normalizePair,pairKey,peopleView,recordCopy,requirePerson,snapshot,unionId} from './internal';
import {validFormalUnionWithContext} from './validation';
import type {FormalUnionId,FormalUnionPersonId,FormalUnionRecordV1,FormalUnionStateV1,FormalUnionValidationContext} from './types';

function own(state:FormalUnionStateV1,context:FormalUnionValidationContext){
  try{
    const owned=snapshot({state,context});if(!validFormalUnionWithContext(owned.state,owned.context))throw Error();
    const people=peopleView(owned.context.people,owned.context.referenceDate),records=new Map<string,FormalUnionRecordV1>(),byPerson=new Map<string,FormalUnionRecordV1[]>(),byPair=new Map<string,FormalUnionRecordV1[]>();
    for(const record of owned.state.unions){
      records.set(record.id,record);
      for(const id of record.personIds){const list=byPerson.get(id)??[];list.push(record);byPerson.set(id,list);}
      const key=pairKey(record.personIds),list=byPair.get(key)??[];list.push(record);byPair.set(key,list);
    }return {...owned,people,records,byPerson,byPair};
  }catch{throw Error('Invalid Formal Union query.');}
}
const ownedRecords=(records:readonly FormalUnionRecordV1[])=>immutable(records.map(recordCopy));
export function getFormalUnion(state:FormalUnionStateV1,id:FormalUnionId,context:FormalUnionValidationContext):FormalUnionRecordV1|undefined{
  const owned=own(state,context);if(!unionId(id))throw Error('Invalid Formal Union query ID.');
  const record=owned.records.get(id);return record?immutable(recordCopy(record)):undefined;
}
export function getFormalUnionsForPerson(state:FormalUnionStateV1,personId:FormalUnionPersonId,context:FormalUnionValidationContext):readonly FormalUnionRecordV1[]{
  const owned=own(state,context);requirePerson(personId,owned.people,owned.context.referenceDate);
  return ownedRecords(owned.byPerson.get(personId)??[]);
}
export function getInForceFormalUnionsForPerson(state:FormalUnionStateV1,personId:FormalUnionPersonId,context:FormalUnionValidationContext):readonly FormalUnionRecordV1[]{
  return ownedRecords(getFormalUnionsForPerson(state,personId,context).filter(record=>record.standing.kind==='in-force'));
}
export function getInForceFormalUnionsBetween(state:FormalUnionStateV1,leftId:FormalUnionPersonId,rightId:FormalUnionPersonId,context:FormalUnionValidationContext):readonly FormalUnionRecordV1[]{
  const owned=own(state,context),key=pairKey(normalizePair(leftId,rightId,owned.people,owned.context.referenceDate));
  return ownedRecords((owned.byPair.get(key)??[]).filter(record=>record.standing.kind==='in-force'));
}
export function getSurvivingFormalUnionAssociations(state:FormalUnionStateV1,personId:FormalUnionPersonId,context:FormalUnionValidationContext):readonly FormalUnionRecordV1[]{
  const owned=own(state,context);requirePerson(personId,owned.people,owned.context.referenceDate);
  if(owned.people.get(personId)!.lifeStatus!=='living')return ownedRecords([]);
  return ownedRecords((owned.byPerson.get(personId)??[]).filter(record=>record.standing.kind==='ended'&&record.standing.end.reason==='death'&&record.standing.end.deceasedPersonId!==personId));
}

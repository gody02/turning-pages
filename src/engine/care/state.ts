import {fields,immutable,peopleView,requirePerson,role,rowCompare,snapshot} from './internal';
import {validCareState,validCareWithPeople} from './validation';
import type {CarePersonId,CareRoleV1,CareStateV1,CareValidationContext} from './types';
function own(state:CareStateV1,context:CareValidationContext,cleanup=false){
  try{
    const owned=snapshot({state,context});if(!fields(owned.context,['people','referenceDate'])||!validCareState(owned.state)||!cleanup&&!validCareWithPeople(owned.state,owned.context.people,owned.context.referenceDate))throw Error();
    return {...owned,people:peopleView(owned.context.people,owned.context.referenceDate)};
  }catch{throw Error('Invalid Care state or validation context.');}
}
function pair(left:CarePersonId,right:CarePersonId,owned:ReturnType<typeof own>){
  requirePerson(left,owned.people,owned.context.referenceDate,true);requirePerson(right,owned.people,owned.context.referenceDate,true);
  if(left===right)throw Error('Self Care is invalid.');
}
function commit(state:CareStateV1,context:CareValidationContext):CareStateV1{
  const candidate={version:1 as const,responsibilities:state.responsibilities.map(row=>({caregiverId:row.caregiverId,recipientId:row.recipientId,role:row.role})).sort(rowCompare)};
  if(!validCareWithPeople(candidate,context.people,context.referenceDate))throw Error('Care transition failed validation.');
  return immutable(candidate);
}
export function createEmptyCareState():CareStateV1{return immutable({version:1,responsibilities:[]});}
export function establishCare(state:CareStateV1,caregiverId:CarePersonId,recipientId:CarePersonId,value:CareRoleV1,context:CareValidationContext):CareStateV1{
  const owned=own(state,context);pair(caregiverId,recipientId,owned);if(!role(value))throw Error('Invalid Care role.');
  const record=owned.state.responsibilities.find(x=>x.caregiverId===caregiverId&&x.recipientId===recipientId);
  if(record&&record.role!==value)throw Error('Conflicting Care role; use setCareRole.');
  return commit({version:1,responsibilities:record?owned.state.responsibilities:[...owned.state.responsibilities,{caregiverId,recipientId,role:value}]},owned.context);
}
export function setCareRole(state:CareStateV1,caregiverId:CarePersonId,recipientId:CarePersonId,value:CareRoleV1,context:CareValidationContext):CareStateV1{
  const owned=own(state,context);pair(caregiverId,recipientId,owned);if(!role(value))throw Error('Invalid Care role.');
  if(!owned.state.responsibilities.some(x=>x.caregiverId===caregiverId&&x.recipientId===recipientId))throw Error('Unknown Care responsibility.');
  return commit({version:1,responsibilities:owned.state.responsibilities.map(x=>x.caregiverId===caregiverId&&x.recipientId===recipientId?{...x,role:value}:x)},owned.context);
}
export function endCare(state:CareStateV1,caregiverId:CarePersonId,recipientId:CarePersonId,context:CareValidationContext):CareStateV1{
  const owned=own(state,context);pair(caregiverId,recipientId,owned);
  return commit({version:1,responsibilities:owned.state.responsibilities.filter(x=>x.caregiverId!==caregiverId||x.recipientId!==recipientId)},owned.context);
}
/** Explicit lifecycle/deletion preparation; only selected Person's living constraint may be stale. */
export function removePersonFromCare(state:CareStateV1,personId:CarePersonId,context:CareValidationContext):CareStateV1{
  const owned=own(state,context,true);requirePerson(personId,owned.people,owned.context.referenceDate);
  for(const row of owned.state.responsibilities)for(const id of [row.caregiverId,row.recipientId])requirePerson(id,owned.people,owned.context.referenceDate,id!==personId);
  return commit({version:1,responsibilities:owned.state.responsibilities.filter(x=>x.caregiverId!==personId&&x.recipientId!==personId)},owned.context);
}

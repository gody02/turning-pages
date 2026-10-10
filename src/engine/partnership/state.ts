import {fields,immutable,normalizePair,pairCompare,pairKey,peopleView,requirePerson,snapshot} from './internal';
import {validPartnershipState,validPartnershipWithPeople} from './validation';
import type {PartnershipPersonId,PartnershipStateV1,PartnershipValidationContext} from './types';

function own(state:PartnershipStateV1,context:PartnershipValidationContext,cleanup=false){
  try{
    const owned=snapshot({state,context});
    if(!fields(owned.context,['people','referenceDate'])||!validPartnershipState(owned.state)||
      !cleanup&&!validPartnershipWithPeople(owned.state,owned.context.people,owned.context.referenceDate))throw Error();
    return {...owned,people:peopleView(owned.context.people,owned.context.referenceDate)};
  }catch{throw Error('Invalid Partnership state or validation context.');}
}
function commit(state:PartnershipStateV1,context:PartnershipValidationContext):PartnershipStateV1{
  const candidate:PartnershipStateV1={version:1,partnerships:state.partnerships.map(record=>({personIds:[...record.personIds] as [string,string]})).sort((a,b)=>pairCompare(a.personIds,b.personIds))};
  if(!validPartnershipWithPeople(candidate,context.people,context.referenceDate))throw Error('Partnership transition failed validation.');
  return immutable(candidate);
}
export function createEmptyPartnershipState():PartnershipStateV1{return immutable({version:1,partnerships:[]});}
export function establishPartnership(state:PartnershipStateV1,leftId:PartnershipPersonId,rightId:PartnershipPersonId,context:PartnershipValidationContext):PartnershipStateV1{
  const owned=own(state,context),ids=normalizePair(leftId,rightId,owned.people,owned.context.referenceDate,true),key=pairKey(ids);
  const exists=owned.state.partnerships.some(record=>pairKey(record.personIds)===key);
  return commit({version:1,partnerships:exists?owned.state.partnerships:[...owned.state.partnerships,{personIds:ids}]},owned.context);
}
export function endPartnership(state:PartnershipStateV1,leftId:PartnershipPersonId,rightId:PartnershipPersonId,context:PartnershipValidationContext):PartnershipStateV1{
  const owned=own(state,context),key=pairKey(normalizePair(leftId,rightId,owned.people,owned.context.referenceDate));
  return commit({version:1,partnerships:owned.state.partnerships.filter(record=>pairKey(record.personIds)!==key)},owned.context);
}
/** Narrow lifecycle preparation: only the selected Person's living constraint may be stale. */
export function removePersonFromPartnerships(state:PartnershipStateV1,personId:PartnershipPersonId,context:PartnershipValidationContext):PartnershipStateV1{
  const owned=own(state,context,true);requirePerson(personId,owned.people,owned.context.referenceDate);
  for(const record of owned.state.partnerships)for(const id of record.personIds)requirePerson(id,owned.people,owned.context.referenceDate,id!==personId);
  return commit({version:1,partnerships:owned.state.partnerships.filter(record=>!record.personIds.includes(personId))},owned.context);
}

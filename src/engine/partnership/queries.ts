import {compare,fields,immutable,normalizePair,pairKey,peopleView,requirePerson,snapshot} from './internal';
import {validPartnershipWithPeople} from './validation';
import type {PartnershipPersonId,PartnershipRecordV1,PartnershipStateV1,PartnershipValidationContext} from './types';

function own(state:PartnershipStateV1,context:PartnershipValidationContext){
  try{
    const owned=snapshot({state,context});
    if(!fields(owned.context,['people','referenceDate'])||!validPartnershipWithPeople(owned.state,owned.context.people,owned.context.referenceDate))throw Error();
    const people=peopleView(owned.context.people,owned.context.referenceDate),pairs=new Map<string,PartnershipRecordV1>(),adjacent=new Map<string,string[]>();
    for(const record of owned.state.partnerships){
      pairs.set(pairKey(record.personIds),record);
      const [a,b]=record.personIds;
      for(const [id,other] of [[a,b],[b,a]]){const list=adjacent.get(id)??[];list.push(other);adjacent.set(id,list);}
    }return {...owned,people,pairs,adjacent};
  }catch{throw Error('Invalid Partnership query.');}
}
export function getPartnership(state:PartnershipStateV1,leftId:PartnershipPersonId,rightId:PartnershipPersonId,context:PartnershipValidationContext):PartnershipRecordV1|undefined{
  const owned=own(state,context),record=owned.pairs.get(pairKey(normalizePair(leftId,rightId,owned.people,owned.context.referenceDate)));
  return record?immutable({personIds:[...record.personIds] as [string,string]}):undefined;
}
export function getCurrentPartners(state:PartnershipStateV1,personId:PartnershipPersonId,context:PartnershipValidationContext):readonly PartnershipPersonId[]{
  const owned=own(state,context);requirePerson(personId,owned.people,owned.context.referenceDate);
  return immutable([...(owned.adjacent.get(personId)??[])].sort(compare));
}
export function arePartners(state:PartnershipStateV1,leftId:PartnershipPersonId,rightId:PartnershipPersonId,context:PartnershipValidationContext):boolean{
  return getPartnership(state,leftId,rightId,context)!==undefined;
}

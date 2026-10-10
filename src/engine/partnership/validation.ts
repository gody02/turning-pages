import type {PeopleState} from '../human/person';
import type {SimulationDate} from '../core/model';
import {fields,pair,pairCompare,peopleView,requirePerson,snapshot} from './internal';
import type {PartnershipStateV1} from './types';

export function validPartnershipState(value:unknown):value is PartnershipStateV1{
  try{
    const state=snapshot(value);
    if(!fields(state,['version','partnerships'])||state.version!==1||!Array.isArray(state.partnerships))return false;
    let previous:readonly [string,string]|undefined;
    for(const record of state.partnerships){
      if(!fields(record,['personIds'])||!pair(record.personIds)||previous&&pairCompare(previous,record.personIds)>=0)return false;
      previous=record.personIds;
    }return true;
  }catch{return false;}
}
export function validPartnershipWithPeople(value:unknown,people:PeopleState,referenceDate:Readonly<SimulationDate>):value is PartnershipStateV1{
  try{
    if(!validPartnershipState(value))return false;
    const owned=snapshot({state:value,people,referenceDate}),view=peopleView(owned.people,owned.referenceDate);
    for(const record of owned.state.partnerships)for(const id of record.personIds){
      requirePerson(id,view,owned.referenceDate,true);
    }return true;
  }catch{return false;}
}

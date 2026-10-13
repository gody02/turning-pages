import type {PeopleState} from '../human/person';
import type {SimulationDate} from '../core/model';
import {fields,personId,peopleView,requirePerson,role,rowCompare,snapshot} from './internal';
import type {CareStateV1} from './types';
export function validCareState(value:unknown):value is CareStateV1{
  try{
    const state=snapshot(value);if(!fields(state,['version','responsibilities'])||state.version!==1||!Array.isArray(state.responsibilities))return false;
    for(let i=0;i<state.responsibilities.length;i++){
      const r=state.responsibilities[i];if(!fields(r,['caregiverId','recipientId','role'])||!personId(r.caregiverId)||!personId(r.recipientId)||r.caregiverId===r.recipientId||!role(r.role))return false;
      if(i&&rowCompare(state.responsibilities[i-1],r as import('./types').CareRecordV1)>=0)return false;
    }return true;
  }catch{return false;}
}
export function validCareWithPeople(value:unknown,people:PeopleState,referenceDate:Readonly<SimulationDate>):value is CareStateV1{
  try{const owned=snapshot({state:value,people,referenceDate});if(!validCareState(owned.state))return false;
    const view=peopleView(owned.people,owned.referenceDate);
    for(const row of owned.state.responsibilities){requirePerson(row.caregiverId,view,owned.referenceDate,true);requirePerson(row.recipientId,view,owned.referenceDate,true);}return true;
  }catch{return false;}
}

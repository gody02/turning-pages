import {fields,immutable,peopleView,requirePerson,snapshot} from './internal';
import {validCareWithPeople} from './validation';
import type {CarePersonId,CareRecordV1,CareStateV1,CareValidationContext} from './types';
function own(state:CareStateV1,context:CareValidationContext){
  try{const owned=snapshot({state,context});if(!fields(owned.context,['people','referenceDate'])||!validCareWithPeople(owned.state,owned.context.people,owned.context.referenceDate))throw Error();
    return {...owned,people:peopleView(owned.context.people,owned.context.referenceDate)};
  }catch{throw Error('Invalid Care query context.');}
}
export function getCareResponsibility(state:CareStateV1,caregiverId:CarePersonId,recipientId:CarePersonId,context:CareValidationContext):CareRecordV1|undefined{
  const owned=own(state,context);requirePerson(caregiverId,owned.people,owned.context.referenceDate,true);requirePerson(recipientId,owned.people,owned.context.referenceDate,true);
  if(caregiverId===recipientId)throw Error('Self Care is invalid.');
  const row=owned.state.responsibilities.find(x=>x.caregiverId===caregiverId&&x.recipientId===recipientId);return row?immutable(row):undefined;
}
export function getCareProviders(state:CareStateV1,id:CarePersonId,context:CareValidationContext):readonly CareRecordV1[]{
  const owned=own(state,context);requirePerson(id,owned.people,owned.context.referenceDate,true);return immutable(owned.state.responsibilities.filter(x=>x.recipientId===id));
}
export function getCareRecipients(state:CareStateV1,id:CarePersonId,context:CareValidationContext):readonly CareRecordV1[]{
  const owned=own(state,context);requirePerson(id,owned.people,owned.context.referenceDate,true);return immutable(owned.state.responsibilities.filter(x=>x.caregiverId===id));
}

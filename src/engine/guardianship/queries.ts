import {compare,grantId,immutable,peopleView,recordCopy,requirePerson,snapshot} from './internal';
import {validGuardianshipWithContext} from './validation';
import type {GuardianshipId,GuardianshipPersonId,GuardianshipRecordV1,GuardianshipStateV1,GuardianshipValidationContext} from './types';
function own(state:GuardianshipStateV1,context:GuardianshipValidationContext){
  try{const owned=snapshot({state,context});if(!validGuardianshipWithContext(owned.state,owned.context))throw Error();return owned;}
  catch{throw Error('Invalid Guardianship query context.');}
}
function rows(state:GuardianshipStateV1,id:GuardianshipPersonId,context:GuardianshipValidationContext,holder:boolean){
  const owned=own(state,context);requirePerson(id,peopleView(owned.context.people,owned.context.referenceDate),owned.context.referenceDate);
  return owned.state.guardianships.filter(x=>(holder?x.holderId:x.protectedPersonId)===id).map(recordCopy);
}
export function getGuardianship(state:GuardianshipStateV1,id:GuardianshipId,context:GuardianshipValidationContext):GuardianshipRecordV1|undefined{
  const owned=own(state,context);if(!grantId(id))throw Error('Invalid Guardianship ID.');
  const record=owned.state.guardianships.find(x=>x.id===id);return record?immutable(recordCopy(record)):undefined;
}
export function getGuardianshipsForHolder(state:GuardianshipStateV1,id:GuardianshipPersonId,context:GuardianshipValidationContext):readonly GuardianshipRecordV1[]{return immutable(rows(state,id,context,true));}
export function getGuardianshipsForProtectedPerson(state:GuardianshipStateV1,id:GuardianshipPersonId,context:GuardianshipValidationContext):readonly GuardianshipRecordV1[]{return immutable(rows(state,id,context,false));}
export function getCurrentGuardianshipHolders(state:GuardianshipStateV1,id:GuardianshipPersonId,context:GuardianshipValidationContext):readonly GuardianshipPersonId[]{return immutable([...new Set(rows(state,id,context,false).filter(x=>x.standing.kind==='in-force').map(x=>x.holderId))].sort(compare));}
export function getCurrentGuardianshipRecipients(state:GuardianshipStateV1,id:GuardianshipPersonId,context:GuardianshipValidationContext):readonly GuardianshipPersonId[]{return immutable([...new Set(rows(state,id,context,true).filter(x=>x.standing.kind==='in-force').map(x=>x.protectedPersonId))].sort(compare));}

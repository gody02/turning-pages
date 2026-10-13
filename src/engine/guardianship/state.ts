import {fields,grantId,immutable,peopleView,recordCopy,requirePerson,snapshot} from './internal';
import {validGuardianshipWithContext} from './validation';
import type {GuardianshipCreationResultV1,GuardianshipEndV1,GuardianshipId,GuardianshipInputV1,GuardianshipPersonId,GuardianshipStateV1,GuardianshipValidationContext} from './types';
function own(state:GuardianshipStateV1,context:GuardianshipValidationContext){
  try{const owned=snapshot({state,context});if(!validGuardianshipWithContext(owned.state,owned.context))throw Error();return owned;}
  catch{throw Error('Invalid Guardianship state or validation context.');}
}
function commit(state:GuardianshipStateV1,context:GuardianshipValidationContext):GuardianshipStateV1{
  if(!validGuardianshipWithContext(state,context))throw Error('Guardianship transition failed validation.');
  return immutable({version:1,nextSequence:state.nextSequence,guardianships:state.guardianships.map(recordCopy)});
}
export function createEmptyGuardianshipState():GuardianshipStateV1{return immutable({version:1,nextSequence:1,guardianships:[]});}
export function establishGuardianship(state:GuardianshipStateV1,input:GuardianshipInputV1,context:GuardianshipValidationContext):GuardianshipCreationResultV1{
  const owned=own(state,context);let args:GuardianshipInputV1;
  try{args=snapshot(input);if(!fields(args,['holderId','protectedPersonId','authorityKind','basis','beganOn']))throw Error();}
  catch{throw Error('Invalid Guardianship establishment input.');}
  const view=peopleView(owned.context.people,owned.context.referenceDate);
  requirePerson(args.holderId,view,owned.context.referenceDate,true);requirePerson(args.protectedPersonId,view,owned.context.referenceDate,true);
  if(owned.state.nextSequence===Number.MAX_SAFE_INTEGER)throw Error('Guardianship allocator exhausted.');
  // Candidate validation checks basis/kind/date before any identity becomes authority.
  const record={id:`guardianship:${owned.state.nextSequence}`,sequence:owned.state.nextSequence,...args,standing:{kind:'in-force' as const}};
  const candidate=commit({version:1,nextSequence:owned.state.nextSequence+1,guardianships:[...owned.state.guardianships,record]},owned.context);
  return immutable({state:candidate,guardianship:candidate.guardianships.at(-1)!});
}
export function endGuardianship(state:GuardianshipStateV1,id:GuardianshipId,end:GuardianshipEndV1,context:GuardianshipValidationContext):GuardianshipStateV1{
  const owned=own(state,context);let args:GuardianshipEndV1;
  try{args=snapshot(end);if(!fields(args,['endedOn']))throw Error();}
  catch{throw Error('Invalid Guardianship termination input.');}
  if(!grantId(id))throw Error('Invalid Guardianship ID.');
  const record=owned.state.guardianships.find(x=>x.id===id);if(!record)throw Error('Unknown Guardianship.');
  const result=commit({...owned.state,guardianships:owned.state.guardianships.map(x=>x.id===id?{...x,standing:{kind:'ended',endedOn:args.endedOn}}:x)},owned.context);
  if(record.standing.kind==='ended'){
    // Compare date values rather than caller object insertion order.
    const old=record.standing.endedOn,next=args.endedOn;
    if(old===null?next!==null:next===null||old.year!==next.year||old.month!==next.month||old.day!==next.day)throw Error('Conflicting Guardianship terminal assertion.');
  }
  return result;
}
/** Permanent-deletion preparation only; death never invokes this automatically. */
export function removePersonFromGuardianships(state:GuardianshipStateV1,personId:GuardianshipPersonId,context:GuardianshipValidationContext):GuardianshipStateV1{
  const owned=own(state,context);requirePerson(personId,peopleView(owned.context.people,owned.context.referenceDate),owned.context.referenceDate);
  return commit({...owned.state,guardianships:owned.state.guardianships.filter(x=>x.holderId!==personId&&x.protectedPersonId!==personId)},owned.context);
}

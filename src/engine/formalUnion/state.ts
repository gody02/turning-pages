import {endCopy,fields,immutable,normalizePair,pairKey,peopleView,recordCopy,requirePerson,snapshot,unionId} from './internal';
import {validFormalUnionWithContext} from './validation';
import {resolveFormalUnionKind} from './kinds';
import type {FormalUnionCreationResultV1,FormalUnionEndV1,FormalUnionId,FormalUnionInputV1,FormalUnionPersonId,FormalUnionSeparationV1,FormalUnionStateV1,FormalUnionValidationContext} from './types';

function own(state:FormalUnionStateV1,context:FormalUnionValidationContext){
  try{
    const owned=snapshot({state,context});
    if(!validFormalUnionWithContext(owned.state,owned.context))throw Error();
    return {...owned,people:peopleView(owned.context.people,owned.context.referenceDate)};
  }catch{throw Error('Invalid Formal Union state or validation context.');}
}
function requireUnion(state:FormalUnionStateV1,id:string){
  const record=state.unions.find(union=>union.id===id);
  if(!unionId(id)||!record)throw Error('Unknown Formal Union.');return record;
}
function commit(state:FormalUnionStateV1,context:FormalUnionValidationContext):FormalUnionStateV1{
  const candidate:FormalUnionStateV1={version:1,nextSequence:state.nextSequence,unions:state.unions.map(recordCopy).sort((a,b)=>a.sequence-b.sequence)};
  if(!validFormalUnionWithContext(candidate,context))throw Error('Formal Union transition failed validation.');
  return immutable(candidate);
}
export function createEmptyFormalUnionState():FormalUnionStateV1{return immutable({version:1,nextSequence:1,unions:[]});}
export function createFormalUnion(state:FormalUnionStateV1,input:FormalUnionInputV1,context:FormalUnionValidationContext):FormalUnionCreationResultV1{
  const owned=own(state,context);
  let args:FormalUnionInputV1;
  try{
    args=snapshot(input);
    if(!fields(args,['personIds','kindId','formedOn'])||!Array.isArray(args.personIds)||args.personIds.length!==2)throw Error();
  }catch{throw Error('Invalid Formal Union formation input.');}
  const ids=normalizePair(args.personIds[0],args.personIds[1],owned.people,owned.context.referenceDate),kind=resolveFormalUnionKind(owned.context.kinds,args.kindId);
  if(owned.state.unions.some(record=>record.standing.kind==='in-force'&&record.kindId===kind.kindId&&pairKey(record.personIds)===pairKey(ids)))throw Error('Duplicate in-force Formal Union.');
  if(owned.state.nextSequence===Number.MAX_SAFE_INTEGER)throw Error('Formal Union allocator exhausted.');
  // Validate dates before reconstructing them; never strip an unexpected date field.
  const record={id:`formal-union:${owned.state.nextSequence}`,sequence:owned.state.nextSequence,personIds:ids,kindId:kind.kindId,formedOn:args.formedOn,standing:{kind:'in-force' as const,separation:'unknown' as const}};
  const candidate:FormalUnionStateV1={version:1,nextSequence:owned.state.nextSequence+1,unions:[...owned.state.unions,record]};
  if(!validFormalUnionWithContext(candidate,owned.context))throw Error('Invalid Formal Union formation.');
  const result=commit(candidate,owned.context);
  return immutable({state:result,union:recordCopy(result.unions.at(-1)!)});
}
export function setFormalUnionSeparation(state:FormalUnionStateV1,id:FormalUnionId,separation:FormalUnionSeparationV1,context:FormalUnionValidationContext):FormalUnionStateV1{
  const owned=own(state,context),record=requireUnion(owned.state,id);
  if(record.standing.kind!=='in-force'||!['unknown','not-separated','separated'].includes(separation))throw Error('Invalid Formal Union separation transition.');
  return commit({version:1,nextSequence:owned.state.nextSequence,unions:owned.state.unions.map(item=>item.id===id?{...item,standing:{kind:'in-force',separation}}:item)},owned.context);
}
export function endFormalUnion(state:FormalUnionStateV1,id:FormalUnionId,end:FormalUnionEndV1,context:FormalUnionValidationContext):FormalUnionStateV1{
  const owned=own(state,context),record=requireUnion(owned.state,id);
  let args:FormalUnionEndV1;
  try{args=snapshot(end);}catch{throw Error('Invalid Formal Union terminal input.');}
  const candidate:FormalUnionStateV1={version:1,nextSequence:owned.state.nextSequence,unions:owned.state.unions.map(item=>item.id===id?{...item,standing:{kind:'ended',end:args}}:item)};
  if(!validFormalUnionWithContext(candidate,owned.context))throw Error('Invalid Formal Union terminal transition.');
  if(record.standing.kind==='ended'&&JSON.stringify(endCopy(record.standing.end))!==JSON.stringify(endCopy(args)))throw Error('Conflicting Formal Union terminal assertion.');
  return commit(candidate,owned.context);
}
/** Explicit permanent-deletion preparation only; never automatic death cleanup. */
export function removePersonFromFormalUnions(state:FormalUnionStateV1,personId:FormalUnionPersonId,context:FormalUnionValidationContext):FormalUnionStateV1{
  const owned=own(state,context);requirePerson(personId,owned.people,owned.context.referenceDate);
  return commit({version:1,nextSequence:owned.state.nextSequence,unions:owned.state.unions.filter(record=>!record.personIds.includes(personId))},owned.context);
}

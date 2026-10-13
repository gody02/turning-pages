import {compareDates} from '../core/clock';
import type {PeopleState} from '../human/person';
import type {SimulationDate} from '../core/model';
import {basisKey,fingerprint,fields,nullableDate,ordered,personId,positive,peopleView,requirePerson,snapshot,stableId,versionedId} from './internal';
import {createGuardianshipKindRegistry} from './kinds';
import type {GuardianshipBasisV1,GuardianshipStateV1,GuardianshipValidationContext} from './types';

function basisShape(value:unknown):value is GuardianshipBasisV1{
  if(fields(value,['kind'])&&value.kind==='unspecified')return true;
  if(fields(value,['kind','assertionId'])&&value.kind==='authored-assertion')return stableId(value.assertionId);
  return fields(value,['kind','sourceId','recordId','instrumentId'])&&value.kind==='source-reference'&&stableId(value.sourceId)&&stableId(value.recordId)&&(value.instrumentId===null||stableId(value.instrumentId));
}
export function validGuardianshipState(value:unknown):value is GuardianshipStateV1{
  try{
    const state=snapshot(value);
    if(!fields(state,['version','nextSequence','guardianships'])||state.version!==1||!positive(state.nextSequence)||!Array.isArray(state.guardianships))return false;
    let prior=0;const assertions=new Set<string>();
    for(const record of state.guardianships){
      if(!fields(record,['id','sequence','holderId','protectedPersonId','authorityKind','basis','beganOn','standing'])||!positive(record.sequence)||record.id!==`guardianship:${record.sequence}`||record.sequence<=prior||record.sequence>=state.nextSequence||
        !personId(record.holderId)||!personId(record.protectedPersonId)||record.holderId===record.protectedPersonId||
        !fields(record.authorityKind,['kindId','fingerprint'])||!versionedId(record.authorityKind.kindId)||!fingerprint(record.authorityKind.fingerprint)||!basisShape(record.basis)||!nullableDate(record.beganOn))return false;
      prior=record.sequence;const key=basisKey(record.basis);if(key!==null){if(assertions.has(key))return false;assertions.add(key);}
      if(fields(record.standing,['kind'])&&record.standing.kind==='in-force')continue;
      if(!fields(record.standing,['kind','endedOn'])||record.standing.kind!=='ended'||!nullableDate(record.standing.endedOn))return false;
      if(record.beganOn!==null&&record.standing.endedOn!==null&&compareDates(record.standing.endedOn as SimulationDate,record.beganOn as SimulationDate)<0)return false;
    }return true;
  }catch{return false;}
}
export function validGuardianshipWithPeople(value:unknown,people:PeopleState,referenceDate:Readonly<SimulationDate>):value is GuardianshipStateV1{
  try{
    const owned=snapshot({state:value,people,referenceDate});
    if(!validGuardianshipState(owned.state))return false;
    const view=peopleView(owned.people,owned.referenceDate);
    for(const record of owned.state.guardianships){
      const members=[record.holderId,record.protectedPersonId].map(id=>requirePerson(id,view,owned.referenceDate));
      if(record.beganOn!==null&&(compareDates(record.beganOn,owned.referenceDate)>0||members.some(p=>compareDates(record.beganOn!,p.dateOfBirth)<0||p.diedAt&&compareDates(record.beganOn!,p.diedAt)>0)))return false;
      if(record.standing.kind==='ended'&&record.standing.endedOn!==null&&(compareDates(record.standing.endedOn,owned.referenceDate)>0||members.some(p=>compareDates(record.standing.kind==='ended'?record.standing.endedOn!:owned.referenceDate,p.dateOfBirth)<0)))return false;
    }return true;
  }catch{return false;}
}
export function validGuardianshipWithContext(value:unknown,context:GuardianshipValidationContext):value is GuardianshipStateV1{
  try{
    const owned=snapshot({state:value,context}),ctx=owned.context;
    if(!fields(ctx,['people','referenceDate','kinds'])||!validGuardianshipWithPeople(owned.state,ctx.people,ctx.referenceDate)||
      !fields(ctx.kinds,['version','kinds','manifest'])||ctx.kinds.version!==1||!Array.isArray(ctx.kinds.kinds)||!Array.isArray(ctx.kinds.manifest)||
      !ordered(ctx.kinds.kinds.map(x=>x.kindId))||!ordered(ctx.kinds.manifest.map(x=>x.kindId)))return false;
    const registry=createGuardianshipKindRegistry(ctx.kinds.kinds,ctx.kinds.manifest),refs=new Map(registry.manifest.map(x=>[x.kindId,x.fingerprint]));
    return owned.state.guardianships.every(record=>refs.get(record.authorityKind.kindId)===record.authorityKind.fingerprint);
  }catch{return false;}
}

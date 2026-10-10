import {compareDates} from '../core/clock';
import type {PeopleState} from '../human/person';
import type {SimulationDate} from '../core/model';
import {compare,exactDate,fields,pair,personId,positive,peopleView,requirePerson,snapshot,versionedId} from './internal';
import {createFormalUnionKindRegistry} from './kinds';
import type {FormalUnionStateV1,FormalUnionValidationContext} from './types';

const nullableDate=(value:unknown)=>value===null||exactDate(value);
function endShape(value:unknown):boolean{
  if(!value||typeof value!=='object')return false;
  const reason=(value as Record<string,unknown>).reason;
  return reason==='death'?fields(value,['reason','endedOn','deceasedPersonId'])&&nullableDate(value.endedOn)&&personId(value.deceasedPersonId):
    (reason==='dissolution'||reason==='annulment')&&fields(value,['reason','endedOn'])&&nullableDate(value.endedOn);
}
export function validFormalUnionState(value:unknown):value is FormalUnionStateV1{
  try{
    const state=snapshot(value);
    if(!fields(state,['version','nextSequence','unions'])||state.version!==1||!positive(state.nextSequence)||!Array.isArray(state.unions))return false;
    let prior=0;const active=new Set<string>();
    for(const record of state.unions){
      if(!fields(record,['id','sequence','personIds','kindId','formedOn','standing'])||!positive(record.sequence)||record.id!==`formal-union:${record.sequence}`||
        record.sequence<=prior||record.sequence>=state.nextSequence||!pair(record.personIds)||!versionedId(record.kindId)||!nullableDate(record.formedOn))return false;
      prior=record.sequence;
      const standing=record.standing;
      if(fields(standing,['kind','separation'])&&standing.kind==='in-force'&&['unknown','not-separated','separated'].includes(standing.separation as string)){
        const key=JSON.stringify([record.personIds,record.kindId]);if(active.has(key))return false;active.add(key);
      }else if(fields(standing,['kind','end'])&&standing.kind==='ended'&&endShape(standing.end)){
        const end=standing.end as {reason:string;endedOn:SimulationDate|null;deceasedPersonId?:string};
        if(end.reason==='death'&&!record.personIds.includes(end.deceasedPersonId!))return false;
        if(record.formedOn!==null&&end.endedOn!==null&&compareDates(end.endedOn,record.formedOn as SimulationDate)<0)return false;
      }else return false;
    }return true;
  }catch{return false;}
}
export function validFormalUnionWithPeople(value:unknown,people:PeopleState,referenceDate:Readonly<SimulationDate>):value is FormalUnionStateV1{
  try{
    if(!validFormalUnionState(value))return false;
    const owned=snapshot({state:value,people,referenceDate}),view=peopleView(owned.people,owned.referenceDate);
    for(const record of owned.state.unions){
      const members=record.personIds.map(id=>requirePerson(id,view,owned.referenceDate));
      if(record.formedOn!==null&&(compareDates(record.formedOn,owned.referenceDate)>0||members.some(person=>compareDates(record.formedOn!,person.dateOfBirth)<0)))return false;
      if(record.standing.kind==='ended'){
        const end=record.standing.end;
        if(end.endedOn!==null&&(compareDates(end.endedOn,owned.referenceDate)>0||members.some(person=>compareDates(end.endedOn!,person.dateOfBirth)<0)))return false;
        if(end.reason==='death'){
          const cause=view.get(end.deceasedPersonId)!;
          if(cause.lifeStatus!=='deceased'||cause.diedAt&&end.endedOn!==null&&compareDates(end.endedOn,cause.diedAt)<0)return false;
        }
      }
    }return true;
  }catch{return false;}
}
export function validFormalUnionWithContext(value:unknown,context:FormalUnionValidationContext):value is FormalUnionStateV1{
  try{
    const owned=snapshot({state:value,context}),ctx=owned.context;
    if(!fields(ctx,['people','referenceDate','kinds'])||!validFormalUnionWithPeople(owned.state,ctx.people,ctx.referenceDate)||
      !fields(ctx.kinds,['version','kinds','manifest'])||ctx.kinds.version!==1||!Array.isArray(ctx.kinds.kinds)||!Array.isArray(ctx.kinds.manifest))return false;
    const sorted=(items:readonly {kindId:string}[])=>items.every((item,index)=>index===0||compare(items[index-1].kindId,item.kindId)<0);
    if(!sorted(ctx.kinds.kinds)||!sorted(ctx.kinds.manifest))return false;
    const registry=createFormalUnionKindRegistry(ctx.kinds.kinds,ctx.kinds.manifest),ids=new Set(registry.kinds.map(kind=>kind.kindId));
    return owned.state.unions.every(record=>ids.has(record.kindId));
  }catch{return false;}
}

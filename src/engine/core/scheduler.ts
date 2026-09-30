import {addDays,addMonths,addYears,compareDates,isSimulationDate} from './clock';
import {isJsonValue} from './json';
import type {JsonValue,ScheduledItem,ScheduleRecurrence,ScheduleRecurrenceUnit,SchedulerState,SimulationDate} from './model';

export const SCHEDULER_VERSION=1 as const;
/** Prevents corrupt recurrence data from partially draining a queue. */
export const MAX_OCCURRENCES_PER_TAKE=100_000;

export type ScheduleInput={owner:string;kind:string;dueDate:SimulationDate;source?:string;payload?:JsonValue;recurrence?:{unit:ScheduleRecurrenceUnit;interval:number}};
export type ScheduleFilter={owner?:string;through?:SimulationDate};
export type ScheduledOccurrence=Omit<ScheduledItem,'recurrence'>&{occurrence:number;recurrence?:Pick<ScheduleRecurrence,'unit'|'interval'|'anchorDate'>};

const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown,max=3000):value is string=>typeof value==='string'&&value.length>0&&value.length<=max;
const positiveInteger=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const nonNegativeInteger=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
const validUnit=(value:unknown):value is ScheduleRecurrenceUnit=>value==='day'||value==='month'||value==='year';
const occurrenceDate=(recurrence:ScheduleRecurrence)=>{
 const offset=recurrence.interval*recurrence.nextOccurrence;
 if(!Number.isSafeInteger(offset))throw Error('Invalid recurrence offset.');
 const date=recurrence.unit==='day'?addDays(recurrence.anchorDate,offset):recurrence.unit==='month'?addMonths(recurrence.anchorDate,offset):addYears(recurrence.anchorDate,offset);
 if(!isSimulationDate(date))throw Error('Recurring schedule exceeds the supported calendar.');
 return date;
};
const compareItems=(left:ScheduledItem,right:ScheduledItem)=>compareDates(left.dueDate,right.dueDate)||left.sequence-right.sequence||(left.id<right.id?-1:left.id>right.id?1:0);
const copy=<T>(value:T):T=>structuredClone(value);

export function createScheduler():SchedulerState{return {version:SCHEDULER_VERSION,nextSequence:1,items:[]};}

export function validScheduler(value:unknown):value is SchedulerState{
 if(!record(value)||value.version!==SCHEDULER_VERSION||!positiveInteger(value.nextSequence)||!Array.isArray(value.items)||value.items.length>100_000)return false;
 const state=value as {nextSequence:number;items:unknown[]};
 const ids=new Set<string>(),sequences=new Set<number>();
 for(const candidate of state.items){
  if(!record(candidate))return false;const item=candidate as Partial<ScheduledItem>;
  if(!record(item)||!text(item.id,200)||!positiveInteger(item.sequence)||!text(item.owner,200)||!text(item.kind,200)||!isSimulationDate(item.dueDate)||!isSimulationDate(item.createdAt)||compareDates(item.createdAt,item.dueDate)>0)return false;
  if(item.source!==undefined&&!text(item.source,500))return false;
  if(item.payload!==undefined&&!isJsonValue(item.payload))return false;
  if(ids.has(item.id as string)||sequences.has(item.sequence as number)||item.id!==`scheduled:${item.sequence}`)return false;
  ids.add(item.id as string);sequences.add(item.sequence as number);
  if(item.recurrence!==undefined){const recurrence=item.recurrence;if(!record(recurrence)||!validUnit(recurrence.unit)||!positiveInteger(recurrence.interval)||!isSimulationDate(recurrence.anchorDate)||!nonNegativeInteger(recurrence.nextOccurrence)||compareDates(item.createdAt,recurrence.anchorDate)>=0)return false;try{if(compareDates(occurrenceDate(recurrence as ScheduleRecurrence),item.dueDate)!==0)return false;}catch{return false;}}
 }
 return [...sequences].every(sequence=>state.nextSequence>sequence);
}

function assertScheduler(state:SchedulerState){if(!validScheduler(state))throw Error('Invalid scheduler state.');}
function accepted(item:ScheduledItem,owners?:readonly string[]){return !owners||owners.includes(item.owner);}
function makeOccurrence(item:ScheduledItem):ScheduledOccurrence{return {id:item.id,sequence:item.sequence,owner:item.owner,kind:item.kind,dueDate:copy(item.dueDate),createdAt:copy(item.createdAt),source:item.source,payload:item.payload===undefined?undefined:copy(item.payload),occurrence:item.recurrence?.nextOccurrence??0,recurrence:item.recurrence?{unit:item.recurrence.unit,interval:item.recurrence.interval,anchorDate:copy(item.recurrence.anchorDate)}:undefined};}

export function schedule(state:SchedulerState,now:SimulationDate,input:ScheduleInput):{state:SchedulerState;id:string}{
 assertScheduler(state);
 if(!isSimulationDate(now)||!text(input.owner,200)||!text(input.kind,200)||!isSimulationDate(input.dueDate)||compareDates(input.dueDate,now)<=0||input.source!==undefined&&!text(input.source,500)||input.payload!==undefined&&!isJsonValue(input.payload))throw Error('Invalid scheduled item.');
 if(input.recurrence&&(!validUnit(input.recurrence.unit)||!positiveInteger(input.recurrence.interval)))throw Error('Invalid recurrence.');
 if(state.nextSequence===Number.MAX_SAFE_INTEGER)throw Error('Scheduler sequence is exhausted.');
 const sequence=state.nextSequence,item:ScheduledItem={id:`scheduled:${sequence}`,sequence,owner:input.owner,kind:input.kind,dueDate:copy(input.dueDate),createdAt:copy(now),...(input.source===undefined?{}:{source:input.source}),...(input.payload===undefined?{}:{payload:copy(input.payload)}),...(input.recurrence===undefined?{}:{recurrence:{unit:input.recurrence.unit,interval:input.recurrence.interval,anchorDate:copy(input.dueDate),nextOccurrence:0}})};
 return {state:{version:SCHEDULER_VERSION,nextSequence:sequence+1,items:[...copy(state.items),item]},id:item.id};
}

export function cancel(state:SchedulerState,id:string):{state:SchedulerState;cancelled:boolean}{
 assertScheduler(state);const items=state.items.filter(item=>item.id!==id);return {state:items.length===state.items.length?copy(state):{version:SCHEDULER_VERSION,nextSequence:state.nextSequence,items:copy(items)},cancelled:items.length!==state.items.length};
}

export function listPending(state:SchedulerState,filter:ScheduleFilter={}):readonly ScheduledItem[]{
 assertScheduler(state);if(filter.through&&!isSimulationDate(filter.through))throw Error('Invalid scheduler target date.');return state.items.filter(item=>(!filter.owner||item.owner===filter.owner)&&(!filter.through||compareDates(item.dueDate,filter.through)<=0)).sort(compareItems).map(copy);
}

export function takeDue(state:SchedulerState,through:SimulationDate,owners?:readonly string[]):{state:SchedulerState;occurrences:readonly ScheduledOccurrence[]}{
 assertScheduler(state);if(!isSimulationDate(through))throw Error('Invalid scheduler target date.');
 const working=copy(state),occurrences:ScheduledOccurrence[]=[];
 while(true){
  const eligible=working.items.filter(item=>accepted(item,owners)&&compareDates(item.dueDate,through)<=0).sort(compareItems)[0];
  if(!eligible)break;
  if(occurrences.length>=MAX_OCCURRENCES_PER_TAKE)throw Error('Scheduled occurrence safety cap exceeded.');
  occurrences.push(makeOccurrence(eligible));
  const index=working.items.findIndex(item=>item.id===eligible.id);
  if(!eligible.recurrence)working.items.splice(index,1);
  else {if(eligible.recurrence.nextOccurrence===Number.MAX_SAFE_INTEGER)throw Error('Recurring schedule occurrence is exhausted.');eligible.recurrence.nextOccurrence++;eligible.dueDate=occurrenceDate(eligible.recurrence);working.items[index]=eligible;}
 }
 return {state:working,occurrences};
}

export function peekDue(state:SchedulerState,through:SimulationDate,owners?:readonly string[]):readonly ScheduledOccurrence[]{return takeDue(state,through,owners).occurrences;}

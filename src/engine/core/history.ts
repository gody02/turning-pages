import {compareDates,isSimulationDate} from './clock';
import type {CausalReference} from './causality';
import {isJsonValue} from './json';
import type {HistoryFact,HistoryState,JsonValue,SimulationDate} from './model';

export const HISTORY_VERSION=1 as const;
/** Persistence sanity bound. Facts are never truncated to meet it. */
export const MAX_HISTORY_FACTS=100_000;

export type HistoryFactInput={
 type:string;
 source:string;
 actorIds?:readonly string[];
 subjectIds?:readonly string[];
 payload?:JsonValue;
};

export type HistoryFilter={
 from?:SimulationDate;
 through?:SimulationDate;
 type?:string;
 source?:string;
 actorId?:string;
 subjectId?:string;
};

type HistoryFactReference=Extract<CausalReference,{kind:'history-fact'}>;
const record=(value:unknown):value is Record<string,unknown>=>{
 try{return !!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);}
 catch{return false;}
};
const stableName=(value:unknown):value is string=>typeof value==='string'&&value.length<=200&&value.includes('.')&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
const entityId=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=300&&/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);
const positiveInteger=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const fields=(value:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>{
 try{
  const allowed=new Set([...required,...optional]),keys=Reflect.ownKeys(value);
  if(keys.some(key=>typeof key!=='string'||!allowed.has(key))||required.some(key=>!keys.includes(key)))return false;
  return keys.every(key=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);return !!descriptor?.enumerable&&'value' in descriptor;});
 }catch{return false;}
};
const exactDate=(value:unknown):value is SimulationDate=>{
 try{return record(value)&&fields(value,['year','month','day'])&&isSimulationDate(value);}
 catch{return false;}
};
const denseIds=(value:unknown):value is readonly string[]=>{
 try{
  if(!Array.isArray(value)||value.length===0||Object.keys(value).length!==value.length||Reflect.ownKeys(value).length!==value.length+1)return false;
  const ids:string[]=[];
  for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,index);if(!descriptor?.enumerable||!('value' in descriptor)||!entityId(descriptor.value))return false;ids.push(descriptor.value);}
  return new Set(ids).size===ids.length;
 }catch{return false;}
};

function freezeDeep(value:unknown):void{
 if(!value||typeof value!=='object'||Object.isFrozen(value))return;
 for(const key of Reflect.ownKeys(value))freezeDeep((value as Record<PropertyKey,unknown>)[key]);
 Object.freeze(value);
}
function immutable<T>(value:T):T{const copy=structuredClone(value);freezeDeep(copy);return copy;}

function validFact(value:unknown,expectedSequence?:number):value is HistoryFact{
 try{
  if(!record(value)||!fields(value,['id','sequence','occurredAt','type','source'],['actorIds','subjectIds','payload']))return false;
  if(!positiveInteger(value.sequence)||(expectedSequence!==undefined&&value.sequence!==expectedSequence)||value.id!==`history:${value.sequence}`||!exactDate(value.occurredAt)||!stableName(value.type)||!stableName(value.source))return false;
  if(value.actorIds!==undefined&&!denseIds(value.actorIds)||value.subjectIds!==undefined&&!denseIds(value.subjectIds)||value.payload!==undefined&&!isJsonValue(value.payload))return false;
  return true;
 }catch{return false;}
}

function validInput(value:unknown):value is HistoryFactInput{
 try{
  if(!record(value)||!fields(value,['type','source'],['actorIds','subjectIds','payload'])||!stableName(value.type)||!stableName(value.source))return false;
  return !(value.actorIds!==undefined&&!denseIds(value.actorIds)||value.subjectIds!==undefined&&!denseIds(value.subjectIds)||value.payload!==undefined&&!isJsonValue(value.payload));
 }catch{return false;}
}

export function createHistory():HistoryState{return immutable({version:HISTORY_VERSION,nextSequence:1,facts:[]});}

/** `through` is supplied after the canonical clock has been normalised. */
export function validHistory(value:unknown,through?:SimulationDate):value is HistoryState{
 try{
  if(!record(value)||!fields(value,['version','nextSequence','facts'])||value.version!==HISTORY_VERSION||!positiveInteger(value.nextSequence)||!Array.isArray(value.facts)||value.facts.length>MAX_HISTORY_FACTS)return false;
  if(through!==undefined&&!exactDate(through))return false;
  if(Object.keys(value.facts).length!==value.facts.length||Reflect.ownKeys(value.facts).length!==value.facts.length+1)return false;
  let previous:SimulationDate|undefined;
  for(let index=0;index<value.facts.length;index++){
   const descriptor=Object.getOwnPropertyDescriptor(value.facts,index),sequence=index+1;
   if(!descriptor?.enumerable||!('value' in descriptor)||!validFact(descriptor.value,sequence))return false;
   const date=descriptor.value.occurredAt as SimulationDate;
   if(previous&&compareDates(previous,date)>0||through&&compareDates(date,through)>0)return false;
   previous=date;
  }
  return value.nextSequence===value.facts.length+1;
 }catch{return false;}
}

export function recordHistoryFact(history:HistoryState,now:SimulationDate,input:HistoryFactInput):{history:HistoryState;fact:HistoryFact}{
 if(!validHistory(history)||!exactDate(now)||!validInput(input))throw Error('Invalid history fact.');
 if(history.facts.length>=MAX_HISTORY_FACTS)throw Error('History fact limit exceeded.');
 const latest=history.facts.at(-1);if(latest&&compareDates(now,latest.occurredAt as SimulationDate)<0)throw Error('History facts cannot be backdated.');
 const sequence=history.nextSequence,fact=immutable({id:`history:${sequence}`,sequence,occurredAt:now,type:input.type,source:input.source,...(input.actorIds===undefined?{}:{actorIds:input.actorIds}),...(input.subjectIds===undefined?{}:{subjectIds:input.subjectIds}),...(input.payload===undefined?{}:{payload:input.payload})});
 const next=immutable({version:HISTORY_VERSION,nextSequence:sequence+1,facts:[...history.facts,fact]});
 return {history:next,fact:next.facts.at(-1)!};
}

export function getHistoryFact(history:HistoryState,id:string):HistoryFact|undefined{
 if(!validHistory(history)||!/^history:[1-9]\d*$/.test(id))return undefined;
 const sequence=Number(id.slice(8));if(!Number.isSafeInteger(sequence))return undefined;
 const fact=history.facts[sequence-1];return fact?.id===id?immutable(fact):undefined;
}

export function listHistoryFacts(history:HistoryState,filter:HistoryFilter={}):readonly HistoryFact[]{
 try{
  if(!validHistory(history)||!record(filter)||!fields(filter,[],['from','through','type','source','actorId','subjectId']))throw Error();
  if(filter.from!==undefined&&!exactDate(filter.from)||filter.through!==undefined&&!exactDate(filter.through)||filter.from&&filter.through&&compareDates(filter.from,filter.through)>0||filter.type!==undefined&&!stableName(filter.type)||filter.source!==undefined&&!stableName(filter.source)||filter.actorId!==undefined&&!entityId(filter.actorId)||filter.subjectId!==undefined&&!entityId(filter.subjectId))throw Error();
  return immutable(history.facts.filter(fact=>(!filter.from||compareDates(fact.occurredAt as SimulationDate,filter.from)>=0)&&(!filter.through||compareDates(fact.occurredAt as SimulationDate,filter.through)<=0)&&(!filter.type||fact.type===filter.type)&&(!filter.source||fact.source===filter.source)&&(!filter.actorId||fact.actorIds?.includes(filter.actorId))&&(!filter.subjectId||fact.subjectIds?.includes(filter.subjectId))));
 }catch{throw Error('Invalid history query.');}
}

export function historyFactReference(fact:HistoryFact):HistoryFactReference{
 if(!validFact(fact))throw Error('Invalid history fact reference.');
 return immutable({kind:'history-fact',factId:fact.id});
}

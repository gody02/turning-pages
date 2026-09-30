import {isSimulationDate} from './clock';
import {isJsonValue} from './json';
import type {JsonValue,SimulationDate} from './model';

/** A defensive limit for one synchronous, transaction-local event queue. */
export const MAX_DOMAIN_EVENTS_PER_TRANSACTION=10_000;

export type DomainEvent={
 readonly id:string;
 readonly sequence:number;
 readonly type:string;
 readonly occurredAt:Readonly<SimulationDate>;
 readonly source:string;
 readonly actorIds?:readonly string[];
 readonly subjectIds?:readonly string[];
 readonly payload?:JsonValue;
 readonly correlationId:string;
 readonly causationId?:string;
};

export type RootDomainEventInput={
 type:string;
 source:string;
 actorIds?:readonly string[];
 subjectIds?:readonly string[];
 payload?:JsonValue;
 correlationId?:string;
 causationId?:string;
};

export type FollowUpDomainEventInput=Omit<RootDomainEventInput,'correlationId'|'causationId'>;

export type DomainEventHandler<T>={
 readonly id:string;
 readonly types:readonly string[];
 readonly handle:(candidate:T,event:DomainEvent,context:{readonly emit:(input:FollowUpDomainEventInput)=>string})=>void;
};

export type DomainEventTransaction<T>={
 emit:(input:RootDomainEventInput)=>string;
 drain:(candidate:T,validate:(candidate:T)=>boolean)=>readonly DomainEvent[];
};

const stableName=(value:unknown):value is string=>typeof value==='string'&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value)&&value.length<=200;
const eventType=(value:unknown):value is string=>stableName(value)&&value.includes('.');
const reference=(value:unknown)=>typeof value==='string'&&value.length>0&&value.length<=300;
const denseArray=(value:unknown,predicate:(item:unknown)=>boolean)=>{
 if(!Array.isArray(value)||Object.keys(value).length!==value.length||Reflect.ownKeys(value).length!==value.length+1)return false;
 for(let index=0;index<value.length;index++){
  const descriptor=Object.getOwnPropertyDescriptor(value,index);
  if(!descriptor?.enumerable||!('value' in descriptor)||!predicate(descriptor.value))return false;
 }
 return true;
};
const references=(value:unknown)=>denseArray(value,reference)&&new Set(value as unknown[]).size===(value as unknown[]).length;
const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;

function freezeDeep(value:unknown):void{
 if(!value||typeof value!=='object'||Object.isFrozen(value))return;
 for(const key of Reflect.ownKeys(value))freezeDeep((value as Record<PropertyKey,unknown>)[key]);
 Object.freeze(value);
}

function assertEventInput(input:RootDomainEventInput):void{
 if(!input||typeof input!=='object'||!eventType(input.type)||!stableName(input.source)||input.actorIds!==undefined&&!references(input.actorIds)||input.subjectIds!==undefined&&!references(input.subjectIds)||input.payload!==undefined&&!isJsonValue(input.payload)||input.correlationId!==undefined&&!reference(input.correlationId)||input.causationId!==undefined&&!reference(input.causationId))throw Error('Invalid domain event.');
}

function immutableEvent(event:Omit<DomainEvent,'id'|'sequence'|'correlationId'> & Pick<DomainEvent,'id'|'sequence'|'correlationId'>):DomainEvent{
 const copy=structuredClone(event) as DomainEvent;
 freezeDeep(copy);
 return copy;
}

function validateHandlers<T>(handlers:readonly DomainEventHandler<T>[]):readonly DomainEventHandler<T>[] {
 const ids=new Set<string>();
 for(const handler of handlers){
  if(!handler||typeof handler!=='object'||!stableName(handler.id)||ids.has(handler.id)||!denseArray(handler.types,eventType)||handler.types.length===0||new Set(handler.types).size!==handler.types.length||typeof handler.handle!=='function')throw Error('Invalid domain event handler.');
  ids.add(handler.id);
 }
 return handlers.map(handler=>Object.freeze({id:handler.id,types:Object.freeze([...handler.types]),handle:handler.handle})).sort((left,right)=>codePointCompare(left.id,right.id));
}

/**
 * Creates a transient queue for one candidate-state transition. Callers own candidate
 * state and must discard it when drain throws, preserving their existing transaction model.
 */
export function createDomainEventTransaction<T>(occurredAt:SimulationDate,handlers:readonly DomainEventHandler<T>[]=[]):DomainEventTransaction<T>{
 if(!isSimulationDate(occurredAt))throw Error('Invalid domain event occurrence date.');
 const orderedHandlers=validateHandlers(handlers);
 const queue:DomainEvent[]=[];
 let nextSequence=1,closed=false;
 const append=(input:RootDomainEventInput,parent?:DomainEvent)=>{
  assertEventInput(input);
  if(nextSequence>Number.MAX_SAFE_INTEGER)throw Error('Domain event sequence is exhausted.');
  const sequence=nextSequence++,id=`event:${sequence}`;
  const event=immutableEvent({
   id,sequence,type:input.type,occurredAt,source:input.source,
   actorIds:input.actorIds,subjectIds:input.subjectIds,payload:input.payload,
   correlationId:parent?parent.correlationId:input.correlationId??id,
   causationId:parent?parent.id:input.causationId,
  });
  queue.push(event);return id;
 };
 return {
  emit(input){
   if(closed)throw Error('Domain event transaction is closed.');
   try{return append(input);}catch(error){closed=true;queue.length=0;throw error;}
  },
  drain(candidate,validate){
   if(closed)throw Error('Domain event transaction is closed.');
   if(typeof validate!=='function')throw Error('Invalid domain event transaction validator.');
   const trace:DomainEvent[]=[];let queueIndex=0;
   try{
    while(queueIndex<queue.length){
     if(trace.length>=MAX_DOMAIN_EVENTS_PER_TRANSACTION)throw Error('Domain event safety cap exceeded.');
     const event=queue[queueIndex++];trace.push(event);
     for(const handler of orderedHandlers)if(handler.types.includes(event.type)){
      const result=handler.handle(candidate,event,{emit:(input)=>{
       if(closed)throw Error('Domain event transaction is closed.');
       return append(input as RootDomainEventInput,event);
      }});
      if(result!==undefined)throw Error('Domain event handlers must be synchronous.');
     }
    }
    if(!validate(candidate))throw Error('Domain event transaction validation failed.');
    const result=Object.freeze([...trace]);closed=true;queue.length=0;return result;
   }catch(error){closed=true;queue.length=0;throw error;}
  },
 };
}

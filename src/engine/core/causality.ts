import {compareDates,isSimulationDate} from './clock';
import type {DomainEvent} from './domainEvents';
import type {SimulationDate} from './model';

/** Prevents an invalid producer from constructing an unbounded transaction-local trace. */
export const MAX_CAUSAL_LINKS_PER_TRANSACTION=10_000;

export type CausalRelation='caused'|'contributed';

/**
 * `history-fact` is deliberately structural only until the future History ledger owns
 * occurrence-unique durable facts. It is not a reference to the current LifeFact type.
 */
export type CausalReference=
 | {readonly kind:'domain-event';readonly eventId:string}
 | {readonly kind:'scheduled-item';readonly itemId:string}
 | {readonly kind:'scheduled-occurrence';readonly itemId:string;readonly occurrence:number}
 | {readonly kind:'history-fact';readonly factId:string};

export type CausalDeclaration={
 readonly relation:CausalRelation;
 readonly cause:CausalReference;
 readonly effect:CausalReference;
 readonly declaredBy:string;
};

export type CausalLink=CausalDeclaration&{
 readonly id:string;
 readonly sequence:number;
};

export type CausalTrace={
 readonly occurredAt:Readonly<SimulationDate>;
 readonly links:readonly CausalLink[];
};

export type CausalFinalizeContext={readonly domainEvents?:readonly DomainEvent[]};

export type CausalTransaction={
 declare:(declaration:CausalDeclaration)=>string;
 finalize:(context?:CausalFinalizeContext)=>CausalTrace;
};

const stableName=(value:unknown):value is string=>typeof value==='string'&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value)&&value.length<=200;
const declaredByName=(value:unknown):value is string=>stableName(value)&&value.includes('.');
const eventId=(value:unknown):value is string=>typeof value==='string'&&/^event:[1-9]\d*$/.test(value);
const scheduledItemId=(value:unknown):value is string=>typeof value==='string'&&/^scheduled:[1-9]\d*$/.test(value);
const historyFactId=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=300;
const nonNegativeInteger=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
const positiveInteger=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const fields=(value:Record<string,unknown>,names:readonly string[])=>{
 const keys=Reflect.ownKeys(value);if(keys.length!==names.length||keys.some(key=>typeof key!=='string'||!names.includes(key)))return false;
 return names.every(name=>{const descriptor=Object.getOwnPropertyDescriptor(value,name);return !!descriptor&&descriptor.enumerable&&'value' in descriptor;});
};

function freezeDeep(value:unknown):void{
 if(!value||typeof value!=='object'||Object.isFrozen(value))return;
 for(const key of Reflect.ownKeys(value))freezeDeep((value as Record<PropertyKey,unknown>)[key]);
 Object.freeze(value);
}

function immutable<T>(value:T):T{
 const copy=structuredClone(value);
 freezeDeep(copy);
 return copy;
}

/** Returns a canonical, value-based identity used only for causal validation. */
export function causalReferenceKey(reference:CausalReference):string{
 switch(reference.kind){
  case 'domain-event':return `domain-event:${reference.eventId}`;
  case 'scheduled-item':return `scheduled-item:${reference.itemId}`;
  case 'scheduled-occurrence':return `scheduled-occurrence:${reference.itemId}:${reference.occurrence}`;
  case 'history-fact':return `history-fact:${reference.factId}`;
 }
}

export function isCausalReference(value:unknown):value is CausalReference{
 if(!record(value))return false;
 const kindDescriptor=Object.getOwnPropertyDescriptor(value,'kind');
 if(!kindDescriptor||!kindDescriptor.enumerable||!('value' in kindDescriptor)||typeof kindDescriptor.value!=='string')return false;
 switch(kindDescriptor.value){
  case 'domain-event':return fields(value,['kind','eventId'])&&eventId(value.eventId);
  case 'scheduled-item':return fields(value,['kind','itemId'])&&scheduledItemId(value.itemId);
  case 'scheduled-occurrence':return fields(value,['kind','itemId','occurrence'])&&scheduledItemId(value.itemId)&&nonNegativeInteger(value.occurrence);
  case 'history-fact':return fields(value,['kind','factId'])&&historyFactId(value.factId);
  default:return false;
 }
}

function validDeclaration(value:unknown):value is CausalDeclaration{
 return record(value)&&fields(value,['relation','cause','effect','declaredBy'])&&(value.relation==='caused'||value.relation==='contributed')&&isCausalReference(value.cause)&&isCausalReference(value.effect)&&declaredByName(value.declaredBy);
}

function eventMap(events:readonly DomainEvent[],date:SimulationDate):Map<string,DomainEvent>{
 const result=new Map<string,DomainEvent>(),sequences=new Set<number>();
 for(const event of events){
  if(!event||typeof event!=='object'||!eventId(event.id)||!positiveInteger(event.sequence)||event.id!==`event:${event.sequence}`||!isSimulationDate(event.occurredAt)||compareDates(event.occurredAt,date)!==0||result.has(event.id)||sequences.has(event.sequence))throw Error('Invalid completed Domain Event trace.');
  result.set(event.id,event);sequences.add(event.sequence);
 }
 return result;
}

function validateEventReferences(links:readonly CausalLink[],context:CausalFinalizeContext,date:SimulationDate):void{
 const needsEvents=links.some(link=>link.cause.kind==='domain-event'||link.effect.kind==='domain-event');
 if(!needsEvents)return;
 if(!context||!Array.isArray(context.domainEvents))throw Error('Domain Event references require a completed Domain Event trace.');
 const events=eventMap(context.domainEvents,date);
 for(const link of links){
  const cause=link.cause.kind==='domain-event'?events.get(link.cause.eventId):undefined;
  const effect=link.effect.kind==='domain-event'?events.get(link.effect.eventId):undefined;
  if(link.cause.kind==='domain-event'&&!cause||link.effect.kind==='domain-event'&&!effect)throw Error('Causal link references an unknown Domain Event.');
  if(cause&&effect&&cause.sequence>=effect.sequence)throw Error('Causal Domain Event causes must precede their effects.');
 }
}

/**
 * Creates an isolated, synchronous declaration transaction. It intentionally knows no
 * simulation state: domains declare meaningful links and callers decide whether to keep
 * the returned transient trace for developer tooling.
 */
export function createCausalTransaction(occurredAt:SimulationDate):CausalTransaction{
 if(!isSimulationDate(occurredAt))throw Error('Invalid causal transaction date.');
 const date=immutable(occurredAt);
 let closed=false;
 let links:CausalLink[]=[];
 const duplicates=new Set<string>();
 const close=()=>{closed=true;links=[];duplicates.clear();};
 const assertOpen=()=>{if(closed)throw Error('Causal transaction is closed.');};
 return {
  declare(declaration){
   assertOpen();
   try{
    if(!validDeclaration(declaration))throw Error('Invalid causal declaration.');
    const causeKey=causalReferenceKey(declaration.cause),effectKey=causalReferenceKey(declaration.effect);
    if(causeKey===effectKey)throw Error('Causal links cannot reference themselves.');
    if(links.length>=MAX_CAUSAL_LINKS_PER_TRANSACTION)throw Error('Causal link safety cap exceeded.');
    const duplicateKey=JSON.stringify([declaration.relation,causeKey,effectKey,declaration.declaredBy]);
    if(duplicates.has(duplicateKey))throw Error('Duplicate causal declaration.');
    const sequence=links.length+1,link=immutable({id:`causal:${sequence}`,sequence,relation:declaration.relation,cause:declaration.cause,effect:declaration.effect,declaredBy:declaration.declaredBy});
    links.push(link);duplicates.add(duplicateKey);return link.id;
   }catch(error){close();throw error;}
  },
  finalize(context={}){
   assertOpen();
   try{
    validateEventReferences(links,context,date);
    const trace=immutable({occurredAt:date,links});
    close();return trace;
   }catch(error){close();throw error;}
  },
 };
}

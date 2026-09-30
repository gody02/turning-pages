import {describe,expect,it} from 'vitest';
import {createDomainEventTransaction,MAX_DOMAIN_EVENTS_PER_TRANSACTION,type DomainEventHandler} from './domainEvents';
import {createLife,adultStart,act} from './life';
import type {LifeState} from './model';
import type {SimulationModule} from './contracts';
import {createScheduler} from './scheduler';

const today={year:2030,month:1,day:15};
type Candidate={log:string[];value:number};
const valid=(_:Candidate)=>true;
const root={type:'person.job_changed',source:'careers',payload:{previousJob:null,currentJob:'barista'}};

describe('country-neutral domain events',()=>{
 it('uses no host randomness, wall clock, scheduler, React, UK or politics dependencies',()=>{
  const source=Object.values(import.meta.glob<string>('./domainEvents.ts',{eager:true,query:'?raw',import:'default'}))[0];
  expect(source).not.toMatch(/Math\.random|Date\.now|from ['"].*rng|from ['"].*scheduler|from ['"].*(politics|ukWorld|react)/);
 });
 it('assigns deterministic transaction-local IDs and makes roots their own correlation roots',()=>{
  const tx=createDomainEventTransaction<Candidate>(today);expect(tx.emit(root)).toBe('event:1');expect(tx.emit({...root,type:'person.promoted'})).toBe('event:2');
  const trace=tx.drain({log:[],value:0},valid);expect(trace.map(event=>[event.id,event.sequence,event.correlationId,event.causationId])).toEqual([['event:1',1,'event:1',undefined],['event:2',2,'event:2',undefined]]);
  const next=createDomainEventTransaction<Candidate>(today);next.emit(root);expect(next.drain({log:[],value:0},valid)[0].id).toBe('event:1');
 });
 it('uses the shared historical calendar range without changing event semantics',()=>{
  const occurredAt={year:1,month:1,day:1},tx=createDomainEventTransaction<Candidate>(occurredAt);tx.emit({type:'history.test',source:'test'});
  expect(tx.drain({log:[],value:0},valid)[0].occurredAt).toEqual(occurredAt);expect(()=>createDomainEventTransaction<Candidate>({year:0,month:1,day:1})).toThrow('occurrence date');
 });
 it('inherits root correlation and current-event causation for nested events at the transaction date',()=>{
  const handler:DomainEventHandler<Candidate>={id:'test.follow',types:['person.job_changed'],handle:(_candidate,event,context)=>{expect(event.occurredAt).toEqual(today);context.emit({type:'household.income_changed',source:'test'});}};
  const tx=createDomainEventTransaction(today,[handler]);tx.emit({...root,correlationId:'external:case'});const trace=tx.drain({log:[],value:0},valid);
  expect(trace.map(event=>[event.id,event.type,event.correlationId,event.causationId,event.occurredAt])).toEqual([['event:1','person.job_changed','external:case',undefined,today],['event:2','household.income_changed','external:case','event:1',today]]);
 });
 it('binds retained emitters to their original parent and preserves breadth-first descendants',()=>{
  let retained:((input:{type:string;source:string})=>string)|undefined;
  const handlers:DomainEventHandler<Candidate>[]=[
   {id:'a.root',types:['test.root'],handle:(_g,_event,context)=>{retained=context.emit;context.emit({type:'test.alpha',source:'test'});}},
   {id:'z.root',types:['test.root'],handle:(_g,_event,context)=>{context.emit({type:'test.zulu',source:'test'});}},
   {id:'alpha.child',types:['test.alpha'],handle:(_g,_event,context)=>{retained!({type:'test.retained',source:'test'});context.emit({type:'test.grandchild',source:'test'});}},
  ];
  const tx=createDomainEventTransaction(today,handlers);tx.emit({type:'test.root',source:'test'});const trace=tx.drain({log:[],value:0},valid);
  expect(trace.map(event=>event.type)).toEqual(['test.root','test.alpha','test.zulu','test.retained','test.grandchild']);
  expect(trace.map(event=>[event.id,event.correlationId,event.causationId])).toEqual([['event:1','event:1',undefined],['event:2','event:1','event:1'],['event:3','event:1','event:1'],['event:4','event:1','event:1'],['event:5','event:1','event:2']]);
 });
 it('dispatches matching handlers by code-point ID and processes follow-ups breadth first',()=>{
  const handlers:DomainEventHandler<Candidate>[]=[
   {id:'z.last',types:['person.job_changed'],handle:(g,_e,context)=>{g.log.push('z root');context.emit({type:'follow.one',source:'test'});}},
   {id:'a.first',types:['person.job_changed'],handle:g=>{g.log.push('a root');}},
   {id:'m.follow',types:['follow.one'],handle:g=>{g.log.push('follow');}},
  ];
  const candidate={log:[],value:0},tx=createDomainEventTransaction(today,[...handlers].reverse());tx.emit(root);const trace=tx.drain(candidate,valid);
  expect(candidate.log).toEqual(['a root','z root','follow']);expect(trace.map(event=>event.type)).toEqual(['person.job_changed','follow.one']);
 });
 it('reaches every matching handler exactly once, filters types, and safely traces unknown types',()=>{
  const calls:string[]=[];const handlers:DomainEventHandler<Candidate>[]=[
   {id:'alpha',types:['person.job_changed'],handle:()=>{calls.push('alpha');}},
   {id:'beta',types:['person.job_changed','person.promoted'],handle:()=>{calls.push('beta');}},
  ];
  const tx=createDomainEventTransaction(today,handlers);tx.emit(root);tx.emit({type:'unknown.fact',source:'test'});const trace=tx.drain({log:[],value:0},valid);
  expect(calls).toEqual(['alpha','beta']);expect(trace.map(event=>event.type)).toEqual(['person.job_changed','unknown.fact']);
  expect(()=>createDomainEventTransaction(today,[handlers[0],{...handlers[0]}])).toThrow('handler');
 });
 it('snapshots handler definitions so later registration mutations cannot change dispatch',()=>{
  const types=['person.job_changed'];let calls=0;const handler:DomainEventHandler<Candidate>={id:'stable.handler',types,handle:()=>{calls++;}};const tx=createDomainEventTransaction(today,[handler]);
  types[0]='unknown.fact';(handler as unknown as {handle:DomainEventHandler<Candidate>['handle']}).handle=()=>{calls+=100;};tx.emit(root);tx.drain({log:[],value:0},valid);expect(calls).toBe(1);
 });
 it('delivers frozen independent envelopes and payloads to handlers',()=>{
  let received:unknown;const handler:DomainEventHandler<Candidate>={id:'freeze.check',types:['person.job_changed'],handle:(_g,event)=>{received=event;expect(Object.isFrozen(event)).toBe(true);expect(Object.isFrozen(event.payload)).toBe(true);expect(Object.isFrozen((event.payload as {nested:{x:number}}).nested)).toBe(true);expect(Object.isFrozen(event.actorIds)).toBe(true);expect(Object.isFrozen(event.subjectIds)).toBe(true);expect(()=>{(event.payload as {nested:{x:number}}).nested.x=2;}).toThrow();}};
  const payload={nested:{x:1}},actorIds=['person:1'],subjectIds=['job:barista'];const tx=createDomainEventTransaction(today,[handler]);tx.emit({type:'person.job_changed',source:'careers',payload,actorIds,subjectIds});payload.nested.x=9;actorIds[0]='person:changed';subjectIds.push('job:other');const trace=tx.drain({log:[],value:0},valid);expect(received).toBe(trace[0]);expect(trace[0].payload).toEqual({nested:{x:1}});expect(trace[0].actorIds).toEqual(['person:1']);expect(trace[0].subjectIds).toEqual(['job:barista']);
 });
 it('rejects malformed event data before dispatch',()=>{
  const rejects=(event:unknown)=>{const tx=createDomainEventTransaction<Candidate>(today);expect(()=>tx.emit(event as typeof root)).toThrow();expect(()=>tx.drain({log:[],value:0},valid)).toThrow('closed');};
  rejects({...root,payload:{amount:Infinity}});rejects({...root,payload:new Array(2)});rejects({...root,type:'Not Namespaced'});rejects({...root,type:'unnamespaced'});rejects({...root,actorIds:new Array(1)});
  let reads=0;const accessor={};Object.defineProperty(accessor,'value',{enumerable:true,get:()=>{reads++;return 1;}});rejects({...root,payload:accessor});const accessorArray=[1];Object.defineProperty(accessorArray,0,{enumerable:true,get:()=>{reads++;return 1;}});rejects({...root,payload:accessorArray});expect(reads).toBe(0);
  const hidden={safe:true};Object.defineProperty(hidden,'secret',{value:1,enumerable:false});rejects({...root,payload:hidden});rejects({...root,payload:Object.create({inherited:true})});rejects({...root,payload:{value:undefined}});rejects({...root,payload:{value:()=>1}});const {proxy,revoke}=Proxy.revocable({safe:true},{});revoke();rejects({...root,payload:proxy});
  expect(()=>createDomainEventTransaction(today,[{id:'sparse.handler',types:new Array(1),handle:()=>{}}])).toThrow('handler');
 });
 it('leaves authoritative state uncommitted when a handler or final validation fails',()=>{
  const original={log:[],value:1},handler:DomainEventHandler<Candidate>={id:'failure.handler',types:['person.job_changed'],handle:g=>{g.value=99;throw Error('failed');}};
  const failed=createDomainEventTransaction(today,[handler]);failed.emit(root);const candidate=structuredClone(original);expect(()=>failed.drain(candidate,valid)).toThrow('failed');expect(original).toEqual({log:[],value:1});
  const invalid=createDomainEventTransaction<Candidate>(today);invalid.emit(root);const invalidCandidate=structuredClone(original);expect(()=>invalid.drain(invalidCandidate,()=>false)).toThrow('validation');expect(original).toEqual({log:[],value:1});
  const asynchronous:DomainEventHandler<Candidate>={id:'async.handler',types:['person.job_changed'],handle:(async()=>{}) as DomainEventHandler<Candidate>['handle']};const asyncTx=createDomainEventTransaction(today,[asynchronous]);asyncTx.emit(root);expect(()=>asyncTx.drain(structuredClone(original),valid)).toThrow('synchronous');expect(original).toEqual({log:[],value:1});
 });
 it('processes exactly the safety cap, then fails transactionally before the next event',()=>{
  const chain=(lastEmission:number):DomainEventHandler<Candidate>=>({id:'loop',types:['loop.event'],handle:(g,event,context)=>{g.value++;if(event.sequence<lastEmission)context.emit({type:'loop.event',source:'test'});}});
  const allowed=createDomainEventTransaction(today,[chain(MAX_DOMAIN_EVENTS_PER_TRANSACTION)]);allowed.emit({type:'loop.event',source:'test'});const allowedCandidate={log:[],value:0};expect(allowed.drain(allowedCandidate,valid)).toHaveLength(MAX_DOMAIN_EVENTS_PER_TRANSACTION);expect(allowedCandidate.value).toBe(MAX_DOMAIN_EVENTS_PER_TRANSACTION);
  const tx=createDomainEventTransaction(today,[chain(MAX_DOMAIN_EVENTS_PER_TRANSACTION+1)]);tx.emit({type:'loop.event',source:'test'});const original={log:[],value:0},candidate=structuredClone(original);expect(()=>tx.drain(candidate,valid)).toThrow('safety cap');expect(candidate.value).toBe(MAX_DOMAIN_EVENTS_PER_TRANSACTION);expect(original).toEqual({log:[],value:0});expect(MAX_DOMAIN_EVENTS_PER_TRANSACTION).toBe(10_000);
  const fresh=createDomainEventTransaction<Candidate>(today);fresh.emit(root);expect(fresh.drain({log:[],value:0},valid)).toHaveLength(1);
 },15000);
 it('does not mutate clock or scheduler objects and produces identical traces from identical inputs',()=>{
  const clock={...today},scheduler=createScheduler(),handler:DomainEventHandler<Candidate>={id:'increment',types:['person.job_changed'],handle:g=>{g.value++;}};
  const run=()=>{const tx=createDomainEventTransaction(today,[handler]);tx.emit(root);const candidate={log:[],value:0};return {candidate,trace:tx.drain(candidate,valid)};};
  expect(run()).toEqual(run());expect(today).toEqual(clock);expect(createScheduler()).toEqual(scheduler);
 });
 it('emits person.job_changed only for an actual ordinary career change, after current action hooks',()=>{
  type ObservedLife=LifeState&{financeReactions:number;relationshipReactions:number;order:string[];jobChanges:{previousJob:string|null;currentJob:string|null}[]};
  const module:SimulationModule<ObservedLife>={id:'test.observers',afterAction:g=>{g.order.push('afterAction');},domainEventHandlers:[
   {id:'finance.income-observer',types:['person.job_changed'],handle:(g,event)=>{const payload=event.payload as {previousJob:string|null;currentJob:string|null};g.financeReactions++;g.jobChanges.push({...payload});g.order.push(`finance:${payload.currentJob}`);}},
   {id:'relationships.network-observer',types:['person.job_changed'],handle:g=>{g.relationshipReactions++;g.order.push('relationships');}},
  ]};
  const initial={...adultStart(createLife('Event','Person','ca',12)),financeReactions:0,relationshipReactions:0,order:[],jobChanges:[]} as ObservedLife;initial.stats.smarts=100;
  const changed=act(initial,'job:barista',[module]);expect(changed.job).toBe('barista');expect(changed.financeReactions).toBe(1);expect(changed.relationshipReactions).toBe(1);expect(changed.order).toEqual(['afterAction','finance:barista','relationships']);
  const unchanged=act(changed,'job:barista',[module]);expect(unchanged).toBe(changed);expect(unchanged.financeReactions).toBe(1);expect(unchanged.relationshipReactions).toBe(1);
  const switched=act(changed,'job:maker',[module]);expect(switched.jobChanges).toEqual([{previousJob:null,currentJob:'barista'},{previousJob:'barista',currentJob:'maker'}]);
 });
});

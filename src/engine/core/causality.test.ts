import {describe,expect,it} from 'vitest';
import {createLife} from './life';
import {createCausalTransaction,MAX_CAUSAL_LINKS_PER_TRANSACTION,causalReferenceKey,isCausalReference,type CausalReference} from './causality';
import {createDomainEventTransaction} from './domainEvents';
import {createRandomness,float} from './rng';
import {createScheduler,schedule,takeDue} from './scheduler';
import {loadGame,saveGame} from '../save';

const date={year:2032,month:2,day:29};
const event=(sequence:number,overrides:Partial<{occurredAt:typeof date;causationId:string}>={})=>({id:`event:${sequence}`,sequence,type:'test.happened',occurredAt:overrides.occurredAt??date,source:'test.domain',correlationId:'event:1',causationId:overrides.causationId});
const history=(factId:string)=>({kind:'history-fact',factId} as const);
const item=(itemId='scheduled:1')=>({kind:'scheduled-item',itemId} as const);
const occurrence=(itemId='scheduled:1',number=0)=>({kind:'scheduled-occurrence',itemId,occurrence:number} as const);
const domain=(eventId:string)=>({kind:'domain-event',eventId} as const);
const declaration=(cause:CausalReference=history('fact:a'),effect:CausalReference=history('fact:b'),relation:'caused'|'contributed'='caused',declaredBy='test.causality')=>({cause,effect,relation,declaredBy});

describe('country-neutral causality foundation',()=>{
 it('has no host randomness, wall-clock, React, UK, politics or Scheduler runtime dependency',()=>{
  const source=Object.values(import.meta.glob<string>('./causality.ts',{eager:true,query:'?raw',import:'default'}))[0];
  expect(source).not.toMatch(/Math\.random|Date\.now|from ['"].*rng|from ['"].*scheduler|from ['"].*(politics|ukWorld|react)/);
 });
 it('creates deterministic transaction-local IDs for caused and contributed links',()=>{
  const tx=createCausalTransaction(date);expect(tx.declare(declaration())).toBe('causal:1');expect(tx.declare(declaration(history('fact:c'),history('fact:d'),'contributed'))).toBe('causal:2');
  expect(tx.finalize()).toEqual({occurredAt:date,links:[{id:'causal:1',sequence:1,...declaration()},{id:'causal:2',sequence:2,...declaration(history('fact:c'),history('fact:d'),'contributed')}]});
  const restarted=createCausalTransaction(date);expect(restarted.declare(declaration())).toBe('causal:1');
 });
 it('allows many-to-one, one-to-many and global cycles while rejecting exact duplicates and self links',()=>{
  const tx=createCausalTransaction(date);tx.declare(declaration(history('a'),history('result')));tx.declare(declaration(history('b'),history('result'),'contributed'));tx.declare(declaration(history('a'),history('other'),'contributed'));
  tx.declare(declaration(history('cycle:a'),history('cycle:b')));tx.declare(declaration(history('cycle:b'),history('cycle:a')));expect(tx.finalize().links).toHaveLength(5);
  const duplicate=createCausalTransaction(date);duplicate.declare(declaration(item(),history('outcome')));expect(()=>duplicate.declare(declaration({kind:'scheduled-item',itemId:'scheduled:1'},history('outcome')))).toThrow('Duplicate');expect(()=>duplicate.finalize()).toThrow('closed');
  const self=createCausalTransaction(date);expect(()=>self.declare(declaration(history('same'),history('same')))).toThrow('themselves');expect(()=>self.declare(declaration())).toThrow('closed');
  const distinct=createCausalTransaction(date);distinct.declare(declaration(history('a'),history('b')));distinct.declare(declaration(history('a'),history('b'),'contributed'));distinct.declare({...declaration(history('a'),history('b')),declaredBy:'other.causality'});expect(distinct.finalize().links).toHaveLength(3);
 });
 it('uses an unambiguous structural duplicate key even when reserved fact IDs contain delimiters',()=>{
  const tx=createCausalTransaction(date);
  tx.declare(declaration(history('a'),history('b\u0000history-fact:c')));
  expect(tx.declare(declaration(history('a\u0000history-fact:b'),history('c')))).toBe('causal:2');
  expect(tx.finalize().links).toHaveLength(2);
 });
 it('keeps reference kinds and recurring occurrence numbers structurally distinct',()=>{
  expect(causalReferenceKey(item('scheduled:1'))).not.toBe(causalReferenceKey(occurrence('scheduled:1',0)));
  expect(causalReferenceKey(occurrence('scheduled:1',0))).not.toBe(causalReferenceKey(occurrence('scheduled:1',1)));
  expect(causalReferenceKey(domain('event:1'))).not.toBe(causalReferenceKey(history('event:1')));
  const tx=createCausalTransaction(date);tx.declare(declaration(occurrence('scheduled:1',0),history('outcome')));tx.declare(declaration(occurrence('scheduled:1',1),history('outcome')));expect(tx.finalize().links).toHaveLength(2);
 });
 it('rejects malformed references, relations and declaring-domain identifiers terminally',()=>{
  const malformedReference=createCausalTransaction(date);expect(()=>malformedReference.declare(declaration({kind:'scheduled-occurrence',itemId:'scheduled:1',occurrence:-1} as CausalReference))).toThrow('Invalid causal declaration');expect(()=>malformedReference.declare(declaration())).toThrow('closed');
  const malformedRelation=createCausalTransaction(date);expect(()=>malformedRelation.declare({...declaration(),relation:'enabled'} as never)).toThrow('Invalid causal declaration');expect(()=>malformedRelation.finalize()).toThrow('closed');
  for(const declaredBy of ['','unnamespaced','Bad.domain','bad domain']){const tx=createCausalTransaction(date);expect(()=>tx.declare({...declaration(),declaredBy})).toThrow('Invalid causal declaration');expect(()=>tx.finalize()).toThrow('closed');}
  let reads=0;const accessor={cause:history('a'),effect:history('b'),declaredBy:'test.causality'};Object.defineProperty(accessor,'relation',{enumerable:true,get:()=>{reads++;return 'caused';}});const accessorTx=createCausalTransaction(date);expect(()=>accessorTx.declare(accessor as never)).toThrow('Invalid causal declaration');expect(reads).toBe(0);
 });
 it('uses value-based canonical reference equality and freezes copied declarations',()=>{
  const cause={kind:'scheduled-occurrence' as const,itemId:'scheduled:1',occurrence:0},effect={kind:'history-fact' as const,factId:'outcome'};
  expect(causalReferenceKey(cause)).toBe(causalReferenceKey(structuredClone(cause)));expect(isCausalReference(cause)).toBe(true);expect(isCausalReference({kind:'history-fact',factId:''})).toBe(false);expect(isCausalReference({kind:'scheduled-item',itemId:'scheduled:0'})).toBe(false);expect(isCausalReference({kind:'scheduled-occurrence',itemId:'scheduled:1',occurrence:-1})).toBe(false);
  const accessor={};Object.defineProperty(accessor,'kind',{enumerable:true,get:()=> 'history-fact'});Object.defineProperty(accessor,'factId',{enumerable:true,get:()=> 'hidden'});expect(isCausalReference(accessor)).toBe(false);
  const tx=createCausalTransaction(date);tx.declare(declaration(cause,effect));cause.itemId='scheduled:2';effect.factId='changed';const trace=tx.finalize();const link=trace.links[0];expect(link.cause).toEqual(occurrence());expect(link.effect).toEqual(history('outcome'));expect(Object.isFrozen(trace)).toBe(true);expect(Object.isFrozen(trace.links)).toBe(true);expect(Object.isFrozen(link)).toBe(true);expect(Object.isFrozen(link.cause)).toBe(true);expect(()=>{(link.cause as {itemId:string}).itemId='mutated';}).toThrow();
 });
 it('validates explicit Domain Event references without promoting operational parentage to causality',()=>{
  const events=[event(1),event(2,{causationId:'event:1'})];const tx=createCausalTransaction(date);tx.declare(declaration(domain('event:1'),domain('event:2')));const trace=tx.finalize({domainEvents:events});expect(trace.links).toHaveLength(1);expect(trace.links[0].cause).toEqual(domain('event:1'));
  const missing=createCausalTransaction(date);missing.declare(declaration(domain('event:3'),history('outcome')));expect(()=>missing.finalize({domainEvents:events})).toThrow('unknown');expect(()=>missing.finalize({domainEvents:events})).toThrow('closed');
  const mismatch=createCausalTransaction(date);mismatch.declare(declaration(domain('event:1'),history('outcome')));expect(()=>mismatch.finalize({domainEvents:[event(1,{occurredAt:{year:2032,month:3,day:1}})]})).toThrow('Invalid completed');
  const forward=createCausalTransaction(date);forward.declare(declaration(domain('event:2'),domain('event:1')));expect(()=>forward.finalize({domainEvents:events})).toThrow('precede');
  const withoutTrace=createCausalTransaction(date);withoutTrace.declare(declaration(domain('event:1'),history('outcome')));expect(()=>withoutTrace.finalize()).toThrow('completed Domain Event trace');
  const corruptTrace=createCausalTransaction(date);corruptTrace.declare(declaration(domain('event:1'),history('outcome')));expect(()=>corruptTrace.finalize({domainEvents:[{...event(1),sequence:2}]})).toThrow('Invalid completed');
  const reversedTrace=createCausalTransaction(date);reversedTrace.declare(declaration(domain('event:1'),domain('event:2')));expect(reversedTrace.finalize({domainEvents:[events[1],events[0]]}).links).toHaveLength(1);
 });
 it('uses Scheduler identities structurally and leaves Scheduler state untouched across save/load',()=>{
  let scheduler=createScheduler();scheduler=schedule(scheduler,{year:2032,month:2,day:1},{owner:'future.owner',kind:'test',dueDate:date}).state;const before=structuredClone(scheduler);const due=takeDue(scheduler,date).occurrences[0];
  const tx=createCausalTransaction(date);tx.declare(declaration(item(due.id),occurrence(due.id,due.occurrence),'contributed'));expect(tx.finalize().links[0].cause).toEqual(item('scheduled:1'));expect(scheduler).toEqual(before);
  const life=createLife('Causal','Save','ca',8);life.scheduler=scheduler;const values=new Map<string,string>(),storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};expect(saveGame(storage,life)).toBeNull();const restored=loadGame(storage).game!;const restoredDue=takeDue(restored.scheduler!,date).occurrences[0];const restoredTx=createCausalTransaction(date);restoredTx.declare(declaration(occurrence(restoredDue.id,restoredDue.occurrence),history('saved')));expect(restoredTx.finalize().links[0].cause).toEqual(occurrence('scheduled:1',0));
 });
 it('treats history references as reserved structural values, never as current LifeFacts',()=>{
  const life=createLife('Not','History','ca',3);life.facts=[{id:'choice:legacy',atMonth:1,source:'life',kind:'choice',detail:'old fact',tags:[]}];
  const tx=createCausalTransaction(date);tx.declare(declaration(history('history:future:1'),history('history:future:2')));expect(tx.finalize().links[0].cause).toEqual(history('history:future:1'));
  expect(isCausalReference(life.facts[0] as unknown)).toBe(false);
 });
 it('allows exactly the safety cap, then terminally fails before link 10,001',()=>{
  const allowed=createCausalTransaction(date);for(let index=0;index<MAX_CAUSAL_LINKS_PER_TRANSACTION;index++)allowed.declare(declaration(history(`cause:${index}`),history(`effect:${index}`)));expect(allowed.finalize().links).toHaveLength(MAX_CAUSAL_LINKS_PER_TRANSACTION);
  const failed=createCausalTransaction(date);for(let index=0;index<MAX_CAUSAL_LINKS_PER_TRANSACTION;index++)failed.declare(declaration(history(`cause:${index}`),history(`effect:${index}`)));expect(()=>failed.declare(declaration(history('one-more'),history('effect')))).toThrow('safety cap');expect(()=>failed.finalize()).toThrow('closed');expect(MAX_CAUSAL_LINKS_PER_TRANSACTION).toBe(10_000);
 },15000);
 it('closes after successful or failed finalization and exposes no state ownership or persistence',()=>{
  const succeeded=createCausalTransaction(date);succeeded.declare(declaration());succeeded.finalize();expect(()=>succeeded.finalize()).toThrow('closed');expect(()=>succeeded.declare(declaration())).toThrow('closed');
  const failed=createCausalTransaction(date);failed.declare(declaration(domain('event:1'),history('outcome')));expect(()=>failed.finalize({domainEvents:[]})).toThrow();expect(()=>failed.declare(declaration())).toThrow('closed');
  const life=createLife('No','Field','ca',3);expect('causality' in life).toBe(false);
 });
 it('does not mutate the clock, Domain Events, Scheduler or RNG, and produces identical traces',()=>{
  const clock=structuredClone(date),events=[event(1),event(2)],scheduler=createScheduler(),randomness=createRandomness(9),beforeRandom=structuredClone(randomness);
  const run=()=>{const tx=createCausalTransaction(date);tx.declare(declaration(domain('event:1'),domain('event:2')));return tx.finalize({domainEvents:events});};expect(run()).toEqual(run());expect(date).toEqual(clock);expect(events).toEqual([event(1),event(2)]);expect(scheduler).toEqual(createScheduler());expect(float(randomness,'causality.check')).toBe(float(beforeRandom,'causality.check'));
 });
 it('works beside completed Domain Event traces without altering their queue semantics',()=>{
  const events=createDomainEventTransaction<{count:number}>(date,[{id:'test.follow-up',types:['test.root'],handle:(_candidate,_event,context)=>{context.emit({type:'test.child',source:'test.domain'});}}]);events.emit({type:'test.root',source:'test.domain'});const trace=events.drain({count:0},()=>true);
  const tx=createCausalTransaction(date);tx.declare(declaration(domain(trace[0].id),domain(trace[1].id)));expect(tx.finalize({domainEvents:trace}).links).toHaveLength(1);expect(trace.map(value=>value.id)).toEqual(['event:1','event:2']);
 });
});

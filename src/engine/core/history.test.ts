import {describe,expect,it} from 'vitest';
import {addDays,compareDates} from './clock';
import {createCausalTransaction} from './causality';
import {createDomainEventTransaction} from './domainEvents';
import {createHistory,getHistoryFact,HISTORY_VERSION,historyFactReference,listHistoryFacts,MAX_HISTORY_FACTS,recordHistoryFact,validHistory} from './history';
import {act,adultStart,createLife} from './life';
import type {HistoryFact,HistoryState} from './model';
import {createRandomness,float} from './rng';
import {createScheduler} from './scheduler';
import {PRE_HISTORY_SAVE_KEY,SAVE_KEY,isGame,loadGame,migrateGame,saveGame} from '../save';

const day=(day:number)=>({year:2030,month:6,day});
const input=(overrides:Record<string,unknown>={})=>({type:'person.job-started',source:'test.history',actorIds:['person:player'],subjectIds:['job:barista'],payload:{salary:20_000},...overrides});

describe('country-neutral durable History',()=>{
 it('creates an empty versioned ledger and deterministic durable IDs',()=>{
  const empty=createHistory();expect(empty).toEqual({version:HISTORY_VERSION,nextSequence:1,facts:[]});expect(Object.isFrozen(empty)).toBe(true);
  const first=recordHistoryFact(empty,day(1),input()),second=recordHistoryFact(first.history,day(1),input({type:'person.job-promoted'}));
  expect(first.fact.id).toBe('history:1');expect(second.fact.id).toBe('history:2');expect(second.history.nextSequence).toBe(3);expect(second.history.facts.map(f=>f.sequence)).toEqual([1,2]);expect(first.history.facts).toHaveLength(1);
 });
 it('preserves exact dates and explicit same-date recording order while rejecting backdating',()=>{
  const first=recordHistoryFact(createHistory(),day(15),input({type:'test.first'}));const second=recordHistoryFact(first.history,day(15),input({type:'test.second'}));
  expect(second.history.facts.map(f=>[f.id,f.type,f.occurredAt])).toEqual([['history:1','test.first',day(15)],['history:2','test.second',day(15)]]);expect(compareDates(second.fact.occurredAt as typeof day extends never?never:ReturnType<typeof day>,day(15))).toBe(0);
  expect(()=>recordHistoryFact(second.history,day(14),input())).toThrow('backdated');expect(second.history.nextSequence).toBe(3);
 });
 it('records facts across the shared historical calendar without a local modern-year floor',()=>{
  const occurredAt={year:1,month:1,day:1},recorded=recordHistoryFact(createHistory(),occurredAt,input({type:'history.earliest'}));expect(recorded.fact.occurredAt).toEqual(occurredAt);
  expect(validHistory(recorded.history,{year:9999,month:12,day:31})).toBe(true);expect(()=>recordHistoryFact(createHistory(),{year:0,month:1,day:1},input())).toThrow('Invalid history');
 });
 it('does not let callers supply identity or occurrence dates',()=>{
  expect(()=>recordHistoryFact(createHistory(),day(1),{...input(),id:'history:99'} as never)).toThrow('Invalid history fact');
  expect(()=>recordHistoryFact(createHistory(),day(1),{...input(),sequence:99} as never)).toThrow('Invalid history fact');
  expect(()=>recordHistoryFact(createHistory(),day(1),{...input(),occurredAt:day(2)} as never)).toThrow('Invalid history fact');
 });
 it('isolates and freezes fact data without freezing unrelated state',()=>{
  const actorIds=['person:player'],subjectIds=['job:barista'],payload={terms:{salary:20_000},grades:[1,2]};const unrelated={value:1};const recorded=recordHistoryFact(createHistory(),day(1),{type:'person.job-started',source:'test.history',actorIds,subjectIds,payload});
  actorIds[0]='person:changed';subjectIds.push('job:other');payload.terms.salary=0;payload.grades.push(3);
  expect(recorded.fact.actorIds).toEqual(['person:player']);expect(recorded.fact.subjectIds).toEqual(['job:barista']);expect(recorded.fact.payload).toEqual({terms:{salary:20_000},grades:[1,2]});expect(Object.isFrozen(recorded.fact)).toBe(true);expect(Object.isFrozen(recorded.fact.payload)).toBe(true);expect(()=>{(recorded.fact.payload as {terms:{salary:number}}).terms.salary=1;}).toThrow();expect(Object.isFrozen(unrelated)).toBe(false);
  const result=listHistoryFacts(recorded.history);expect(Object.isFrozen(result)).toBe(true);expect(Object.isFrozen(result[0])).toBe(true);
 });
 it('validates namespaced type/source and dense unique actor and subject IDs',()=>{
  for(const invalid of [input({type:'job'}),input({source:'history'}),input({type:'Bad.type'}),input({actorIds:[]}),input({actorIds:['person:1','person:1']}),input({subjectIds:['bad id']}),input({subjectIds:new Array(1)})])expect(()=>recordHistoryFact(createHistory(),day(1),invalid as never)).toThrow('Invalid history fact');
  const valid=recordHistoryFact(createHistory(),day(1),input({type:'unknown.valid-type',source:'module.unknown',actorIds:['Person:1','company.acme'],subjectIds:['role:1']}));expect(valid.fact.actorIds).toEqual(['Person:1','company.acme']);
 });
 it('uses the shared finite plain-JSON rules for payloads',()=>{
 for(const payload of [{amount:Infinity},{value:undefined},{value:()=>1},new Array(2),new Date(),Object.create({inherited:true})])expect(()=>recordHistoryFact(createHistory(),day(1),input({payload}) as never)).toThrow('Invalid history fact');
 let reads=0;const accessor={};Object.defineProperty(accessor,'value',{enumerable:true,get:()=>{reads++;return 1;}});expect(()=>recordHistoryFact(createHistory(),day(1),input({payload:accessor}) as never)).toThrow();expect(reads).toBe(0);
 const hidden={safe:true};Object.defineProperty(hidden,'secret',{value:1,enumerable:false});expect(()=>recordHistoryFact(createHistory(),day(1),input({payload:hidden}) as never)).toThrow();
 const symbolled=['person:1'];Object.defineProperty(symbolled,Symbol('unexpected'),{value:true});expect(()=>recordHistoryFact(createHistory(),day(1),input({actorIds:symbolled}) as never)).toThrow('Invalid history fact');
 const revokedPayload=Proxy.revocable({safe:true},{});revokedPayload.revoke();expect(()=>recordHistoryFact(createHistory(),day(1),input({payload:revokedPayload.proxy}) as never)).toThrow('Invalid history fact');
 const throwingInput=new Proxy(input(),{get:()=>{throw Error('trap');}});expect(()=>recordHistoryFact(createHistory(),day(1),throwingInput)).toThrow('Invalid history fact');
 });
 it('looks up by durable ID and applies every v1 filter in sequence order',()=>{
  let history=createHistory();
  for(const [date,type,source,actor,subject] of [[day(1),'person.job-started','career.core','person:1','job:a'],[day(1),'company.founded','business.core','person:2','company:a'],[day(2),'person.job-ended','career.core','person:1','job:a']] as const)history=recordHistoryFact(history,date,{type,source,actorIds:[actor],subjectIds:[subject]}).history;
  expect(getHistoryFact(history,'history:2')?.type).toBe('company.founded');expect(getHistoryFact(history,'history:99')).toBeUndefined();
  expect(listHistoryFacts(history,{from:day(1),through:day(1)}).map(f=>f.id)).toEqual(['history:1','history:2']);
  expect(listHistoryFacts(history,{type:'person.job-ended'}).map(f=>f.id)).toEqual(['history:3']);expect(listHistoryFacts(history,{source:'career.core'}).map(f=>f.id)).toEqual(['history:1','history:3']);
  expect(listHistoryFacts(history,{actorId:'person:1',subjectId:'job:a',from:day(2)}).map(f=>f.id)).toEqual(['history:3']);expect(()=>listHistoryFacts(history,{from:day(2),through:day(1)})).toThrow('Invalid history query');
  const throwingFilter=new Proxy({},{get:()=>{throw Error('trap');}});expect(()=>listHistoryFacts(history,throwingFilter)).toThrow('Invalid history query');
 });
 it('creates the reserved causal History reference without persisting causality',()=>{
 const recorded=recordHistoryFact(createHistory(),day(1),input()),reference=historyFactReference(recorded.fact);expect(reference).toEqual({kind:'history-fact',factId:'history:1'});expect(Object.isFrozen(reference)).toBe(true);expect(getHistoryFact(recorded.history,reference.factId)).toEqual(recorded.fact);
 const causal=createCausalTransaction(day(1));causal.declare({relation:'contributed',cause:reference,effect:{kind:'history-fact',factId:'history:future'},declaredBy:'test.history'});causal.finalize();expect(recorded.history).toEqual(recorded.history);expect('links' in recorded.history).toBe(false);
 expect(()=>historyFactReference({id:'legacy:memory',atMonth:0,source:'life',kind:'decision',detail:'Legacy LifeFact',tags:[]} as never)).toThrow('Invalid history fact reference');
 let reads=0;const malicious={...recorded.fact};Object.defineProperty(malicious,'sequence',{enumerable:true,get:()=>{reads++;return 1;}});expect(()=>historyFactReference(malicious)).toThrow();expect(reads).toBe(0);
 });
 it('does not automatically persist Domain Events, career changes, or legacy semantic memories',()=>{
  const life=adultStart(createLife('Separate','History','ca',8));life.stats.smarts=100;const journalBefore=life.journal.length;const changed=act(life,'job:barista');expect(changed.history).toEqual(createHistory());expect(changed.facts?.some(f=>f.id==='job:barista')).toBe(true);expect(changed.journal.length).toBe(journalBefore+1);
  const tx=createDomainEventTransaction(day(1));tx.emit({type:'person.job_changed',source:'careers.core'});expect(tx.drain({},()=>true)).toHaveLength(1);expect(changed.history!.facts).toEqual([]);
 });
 it('does not mutate Clock, Scheduler, or RNG',()=>{
  const clock=day(1),clockBefore={...clock},scheduler=createScheduler(),schedulerBefore=structuredClone(scheduler),randomness=createRandomness(22),randomBefore=structuredClone(randomness);recordHistoryFact(createHistory(),clock,input());expect(clock).toEqual(clockBefore);expect(scheduler).toEqual(schedulerBefore);expect(float(randomness,'history.test')).toBe(float(randomBefore,'history.test'));
 });
 it('validates strict chronology, shapes, current-date bounds, and the 100,000-fact boundary',()=>{
  const validFact=(sequence:number):HistoryFact=>({id:`history:${sequence}`,sequence,occurredAt:day(1),type:'test.fact',source:'test.history'});const facts=Array.from({length:MAX_HISTORY_FACTS},(_,index)=>validFact(index+1)),boundary:HistoryState={version:1,nextSequence:MAX_HISTORY_FACTS+1,facts};expect(validHistory(boundary,day(1))).toBe(true);expect(()=>recordHistoryFact(boundary,day(1),input())).toThrow('limit');expect(validHistory({...boundary,nextSequence:MAX_HISTORY_FACTS+2,facts:[...facts,validFact(MAX_HISTORY_FACTS+1)]},day(1))).toBe(false);
  expect(validHistory({version:1,nextSequence:2,facts:[{...validFact(1),occurredAt:day(2)}]},day(1))).toBe(false);expect(validHistory({version:1,nextSequence:3,facts:[validFact(1),{...validFact(2),occurredAt:{...day(1),extra:true}}]})).toBe(false);expect(validHistory({version:1,nextSequence:2,facts:[{...validFact(1),unexpected:true}]})).toBe(false);
 },15000);
 it('persists facts and the next identity across save/load',()=>{
  const game=createLife('Persistent','History','ca',3);game.history=recordHistoryFact(game.history!,game.clock!.date,input()).history;const data=new Map<string,string>(),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};expect(saveGame(storage,game)).toBeNull();const loaded=loadGame(storage).game!;expect(loaded.history).toEqual(game.history);expect(recordHistoryFact(loaded.history!,loaded.clock!.date,input({type:'person.job-ended'})).fact.id).toBe('history:2');
 });
 it('migrates missing History after Clock normalisation without fabricating facts',()=>{
  const legacy=createLife('Legacy','History','uk',4);delete legacy.history;legacy.facts=[{id:'legacy:memory',atMonth:0,source:'life',kind:'decision',detail:'Keep me separate.',tags:['legacy']}];legacy.journal.push({age:0,kind:'event',text:'Do not infer this.'});const migrated=migrateGame(legacy)!;expect(migrated.history).toEqual(createHistory());expect(migrated.facts).toEqual(legacy.facts);expect(migrated.journal).toEqual(legacy.journal);expect(migrateGame(migrated)).toEqual(migrated);
  const oldClock=createLife('Old clock','History','ca',5);oldClock.history=recordHistoryFact(oldClock.history!,oldClock.clock!.date,input()).history;(oldClock as unknown as {clock:unknown}).clock={version:1,date:{year:2026,month:9},cadence:'year'};(oldClock as unknown as {dateOfBirth:unknown}).dateOfBirth={year:2026,month:9};expect(migrateGame(oldClock)?.history?.facts[0].occurredAt).toEqual({year:2026,month:9,day:1});
 });
 it('protects exact legacy bytes once and aborts primary replacement if recovery fails',()=>{
  const legacy=createLife('Recovery','History','ca',6);delete legacy.history;const raw=JSON.stringify(legacy),migrated=migrateGame(legacy)!,data=new Map([[SAVE_KEY,raw]]),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};expect(saveGame(storage,migrated)).toBeNull();expect(data.get(PRE_HISTORY_SAVE_KEY)).toBe(raw);
  const preserved=new Map([[SAVE_KEY,raw],[PRE_HISTORY_SAVE_KEY,'earlier']]),existing={getItem:(key:string)=>preserved.get(key)??null,setItem:(key:string,value:string)=>{preserved.set(key,value);}};expect(saveGame(existing,migrated)).toBeNull();expect(preserved.get(PRE_HISTORY_SAVE_KEY)).toBe('earlier');
  const blocked=new Map([[SAVE_KEY,raw]]),failure={getItem:(key:string)=>blocked.get(key)??null,setItem:(key:string,value:string)=>{if(key===PRE_HISTORY_SAVE_KEY)throw Error('Quota');blocked.set(key,value);}};expect(saveGame(failure,migrated)).toBeTruthy();expect(blocked.get(SAVE_KEY)).toBe(raw);
 });
 it('rejects present corrupt History and has no React, UK, politics, RNG, or Scheduler dependency',()=>{
 const game=createLife('Corrupt','History','ca',7);expect(isGame({...game,history:{version:1,nextSequence:2,facts:[]}})).toBe(false);expect(migrateGame({...game,history:{version:1,nextSequence:2,facts:[]}})).toBeNull();
 const future=createLife('Future','History','ca',7);future.history=recordHistoryFact(future.history!,addDays(future.clock!.date,1),input()).history;expect(isGame(future)).toBe(false);expect(migrateGame(future)).toBeNull();
 let reads=0;const accessorState={facts:[]};Object.defineProperty(accessorState,'version',{enumerable:true,get:()=>{reads++;return 1;}});Object.defineProperty(accessorState,'nextSequence',{enumerable:true,value:1});expect(validHistory(accessorState)).toBe(false);expect(reads).toBe(0);
 const revoked=Proxy.revocable(createHistory(),{});revoked.revoke();expect(validHistory(revoked.proxy)).toBe(false);expect(()=>recordHistoryFact(revoked.proxy,day(1),input())).toThrow('Invalid history fact');
 const source=Object.values(import.meta.glob<string>('./history.ts',{eager:true,query:'?raw',import:'default'}))[0];expect(source).not.toMatch(/Math\.random|Date\.now|from ['"].*rng|from ['"].*scheduler|from ['"].*(politics|ukWorld|react)/);
 });
});

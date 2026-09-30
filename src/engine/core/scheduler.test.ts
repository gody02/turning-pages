import {describe,expect,it} from 'vitest';
import {addMonths,tickMonth,tickYear} from './clock';
import {createLife} from './life';
import {MAX_OCCURRENCES_PER_TAKE,cancel,createScheduler,listPending,peekDue,schedule,takeDue,validScheduler} from './scheduler';
import {createRandomness,float} from './rng';
import {PRE_SCHEDULER_SAVE_KEY,SAVE_KEY,loadGame,migrateGame,saveGame} from '../save';

const now={year:2030,month:1,day:1};
const date=(month:number,day=1)=>({year:2030,month,day});
const scheduled=(state=createScheduler(),due=date(2,1),owner='test.owner')=>schedule(state,now,{owner,kind:'test',dueDate:due});

describe('country-neutral scheduler',()=>{
 it('uses neither host randomness nor wall-clock time',()=>{
  const source=Object.values(import.meta.glob<string>('./scheduler.ts',{eager:true,query:'?raw',import:'default'}))[0];expect(source).not.toMatch(/Math\.random|Date\.now|from ['"].*rng|from ['"].*(politics|ukWorld|react)/);
 });
 it('schedules only valid future exact dates without mutating its inputs',()=>{
  const state=createScheduler(),input={owner:'life.test',kind:'appointment',dueDate:{year:2030,month:2,day:29},payload:{amount:12,labels:['a']}};
  expect(()=>schedule(state,now,input)).toThrow();
 const valid={...input,dueDate:{year:2032,month:2,day:29}};const result=schedule(state,now,valid);
  expect(state).toEqual(createScheduler());expect(result.id).toBe('scheduled:1');expect(result.state.items[0].createdAt).toEqual(now);
  expect(()=>schedule(state,now,{...valid,dueDate:now})).toThrow();expect(()=>schedule(state,now,{...valid,payload:{bad:Infinity}})).toThrow();
  const second=schedule(result.state,now,{owner:'life.test',kind:'second',dueDate:{year:2032,month:3,day:1}});second.state.items[0].kind='changed';expect(result.state.items[0].kind).toBe('appointment');
 });
 it('accepts shared historical calendar dates without a local modern-year floor',()=>{
  const created={year:1,month:1,day:1},due={year:4,month:2,day:29},result=schedule(createScheduler(),created,{owner:'history.test',kind:'anniversary',dueDate:due});
  expect(result.state.items[0].createdAt).toEqual(created);expect(result.state.items[0].dueDate).toEqual(due);expect(validScheduler(result.state)).toBe(true);
 });
 it('validates persisted dates, created-at order, serialisable payloads and monotonic allocation',()=>{
  const one=scheduled().state,bad=structuredClone(one);bad.items[0].createdAt={year:2031,month:1,day:1};expect(validScheduler(bad)).toBe(false);bad.items[0].createdAt={...now};bad.nextSequence=1;expect(validScheduler(bad)).toBe(false);
  const duplicate=structuredClone(one);duplicate.items.push(structuredClone(duplicate.items[0]));expect(validScheduler(duplicate)).toBe(false);
  const malformed=structuredClone(one) as unknown as {items:{payload:unknown}[]};malformed.items[0].payload=new Date();expect(validScheduler(malformed)).toBe(false);
  const sparse=structuredClone(one) as unknown as {items:{payload:unknown}[]};sparse.items[0].payload=new Array(2);expect(validScheduler(sparse)).toBe(false);
  const symbolPayload=structuredClone(one) as unknown as {items:{payload:unknown}[]};const payload={safe:true} as Record<PropertyKey,unknown>;payload[Symbol('hidden')]=true;symbolPayload.items[0].payload=payload;expect(validScheduler(symbolPayload)).toBe(false);
  let reads=0;const accessor={};Object.defineProperty(accessor,'value',{enumerable:true,get:()=>{reads++;return 1;}});const accessorPayload=structuredClone(one) as unknown as {items:{payload:unknown}[]};accessorPayload.items[0].payload=accessor;expect(validScheduler(accessorPayload)).toBe(false);expect(reads).toBe(0);
  for(const invalid of [{value:undefined},{value:()=>1}]){const invalidPayload=structuredClone(one) as unknown as {items:{payload:unknown}[]};invalidPayload.items[0].payload=invalid;expect(validScheduler(invalidPayload)).toBe(false);}
  const hiddenPayload=structuredClone(one) as unknown as {items:{payload:unknown}[]},hidden={safe:true};Object.defineProperty(hidden,'secret',{value:1,enumerable:false});hiddenPayload.items[0].payload=hidden;expect(validScheduler(hiddenPayload)).toBe(false);
  const prototypePayload=structuredClone(one) as unknown as {items:{payload:unknown}[]};prototypePayload.items[0].payload=Object.create({inherited:true});expect(validScheduler(prototypePayload)).toBe(false);const revokedPayload=structuredClone(one) as unknown as {items:{payload:unknown}[]},{proxy,revoke}=Proxy.revocable({safe:true},{});revoke();revokedPayload.items[0].payload=proxy;expect(validScheduler(revokedPayload)).toBe(false);
  const recurrence=structuredClone(one);recurrence.items[0].recurrence={unit:'day',interval:0,anchorDate:{...recurrence.items[0].dueDate},nextOccurrence:0};expect(validScheduler(recurrence)).toBe(false);
  recurrence.items[0].recurrence={unit:'day',interval:1,anchorDate:{year:2029,month:12,day:1},nextOccurrence:63};recurrence.items[0].dueDate={year:2030,month:2,day:2};expect(validScheduler(recurrence)).toBe(false);
  const two=scheduled(one,date(3)).state,removed=cancel(two,'scheduled:1'),three=scheduled(removed.state,date(4));expect(three.id).toBe('scheduled:3');expect(three.state.nextSequence).toBe(4);
 });
 it('orders due work by date, sequence and ID regardless of saved item array order',()=>{
  let state=createScheduler();state=scheduled(state,date(4,4),'z').state;state=scheduled(state,date(3,2),'a').state;state=scheduled(state,date(4,4),'b').state;
  const reversed={...state,items:[...state.items].reverse()};expect(peekDue(reversed,{year:2030,month:5,day:1}).map(item=>item.id)).toEqual(['scheduled:2','scheduled:1','scheduled:3']);
  expect(listPending(reversed).map(item=>item.id)).toEqual(['scheduled:2','scheduled:1','scheduled:3']);
 });
 it('cancels idempotently and preserves unknown owners when extraction is filtered',()=>{
  let state=scheduled().state;state=scheduled(state,date(3),'unknown.owner').state;
  const cancelled=cancel(state,'scheduled:1');expect(cancelled.cancelled).toBe(true);expect(cancel(cancelled.state,'scheduled:1').cancelled).toBe(false);
  const taken=takeDue(state,{year:2030,month:4,day:1},['test.owner']);expect(taken.occurrences.map(item=>item.owner)).toEqual(['test.owner']);expect(taken.state.items).toHaveLength(1);expect(taken.state.items[0].owner).toBe('unknown.owner');
 });
 it('numbers recurrence from zero and anchors daily, monthly and yearly dates',()=>{
  let state=createScheduler();
  state=schedule(state,{year:2030,month:1,day:30},{owner:'daily',kind:'x',dueDate:{year:2030,month:1,day:31},recurrence:{unit:'day',interval:2}}).state;
  state=schedule(state,{year:2030,month:1,day:30},{owner:'monthly',kind:'x',dueDate:{year:2030,month:1,day:31},recurrence:{unit:'month',interval:1}}).state;
  state=schedule(state,{year:2024,month:2,day:1},{owner:'yearly',kind:'x',dueDate:{year:2024,month:2,day:29},recurrence:{unit:'year',interval:1}}).state;
  const first=takeDue(state,{year:2024,month:2,day:29},['yearly']);expect(first.occurrences[0].occurrence).toBe(0);expect(first.state.items.find(item=>item.owner==='yearly')!.dueDate).toEqual({year:2025,month:2,day:28});
  const monthly=takeDue(first.state,{year:2030,month:3,day:31},['monthly']);expect(monthly.occurrences.map(item=>[item.occurrence,item.dueDate])).toEqual([[0,{year:2030,month:1,day:31}],[1,{year:2030,month:2,day:28}],[2,{year:2030,month:3,day:31}]]);
  const yearly=takeDue(monthly.state,{year:2032,month:3,day:1},['yearly']);expect(yearly.occurrences.map(item=>item.dueDate)).toEqual([{year:2025,month:2,day:28},{year:2026,month:2,day:28},{year:2027,month:2,day:28},{year:2028,month:2,day:29},{year:2029,month:2,day:28},{year:2030,month:2,day:28},{year:2031,month:2,day:28},{year:2032,month:2,day:29}]);
  expect(takeDue(yearly.state,{year:2030,month:2,day:10},['daily']).occurrences.map(item=>item.dueDate)).toEqual([{year:2030,month:1,day:31},{year:2030,month:2,day:2},{year:2030,month:2,day:4},{year:2030,month:2,day:6},{year:2030,month:2,day:8},{year:2030,month:2,day:10}]);
 });
 it('globally interleaves recurring and one-off work over large monthly and annual clock jumps',()=>{
  let state=createScheduler();state=schedule(state,now,{owner:'monthly',kind:'x',dueDate:{year:2030,month:1,day:31},recurrence:{unit:'month',interval:1}}).state;state=scheduled(state,{year:2030,month:2,day:15},'one').state;
  const life=createLife('Clock','Person','ca',2);life.clock!.date={...now};const monthLife=structuredClone(life),yearLife=structuredClone(life);tickMonth(monthLife);tickYear(yearLife);
  expect(monthLife.clock!.date).toEqual(addMonths(life.clock!.date,1));expect(takeDue(state,monthLife.clock!.date).occurrences.map(item=>item.owner)).toEqual(['monthly']);
  const annual=takeDue(state,yearLife.clock!.date).occurrences;expect(annual).toHaveLength(13);expect(annual.slice(0,4).map(item=>item.dueDate)).toEqual([{year:2030,month:1,day:31},{year:2030,month:2,day:15},{year:2030,month:2,day:28},{year:2030,month:3,day:31}]);expect(annual.at(-1)!.dueDate).toEqual({year:2030,month:12,day:31});
 });
 it('does not duplicate consumed work, mutate the clock, or consume RNG',()=>{
  const original=scheduled().state,first=takeDue(original,{year:2030,month:2,day:1});expect(first.occurrences).toHaveLength(1);expect(takeDue(first.state,{year:2030,month:2,day:1}).occurrences).toEqual([]);expect(original.items).toHaveLength(1);
  const life=createLife('No time','Person','ca',4),clock=structuredClone(life.clock),randomness=createRandomness(8),before=structuredClone(randomness);takeDue(scheduled().state,{year:2030,month:2,day:1});expect(life.clock).toEqual(clock);expect(randomness).toEqual(before);expect(float(randomness,'test')).toBe(float(before,'test'));
 });
 it('fails transactionally at the recurrence safety cap',()=>{
  const state=schedule(createScheduler(),{year:2026,month:1,day:1},{owner:'cap',kind:'x',dueDate:{year:2026,month:1,day:2},recurrence:{unit:'day',interval:1}}).state;
  expect(()=>takeDue(state,{year:2300,month:1,day:1})).toThrow('safety cap');expect(state.items[0].recurrence!.nextOccurrence).toBe(0);expect(MAX_OCCURRENCES_PER_TAKE).toBeGreaterThan(0);
 },15000);
 it('migrates legacy saves to an empty persisted queue once and protects the raw save',()=>{
  const legacy=createLife('Legacy scheduler','Person','uk',9);delete legacy.scheduler;const raw=JSON.stringify(legacy),data=new Map([[SAVE_KEY,raw]]),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
  const migrated=migrateGame(legacy)!;expect(migrated.scheduler).toEqual(createScheduler());expect(migrateGame(migrated)).toEqual(migrated);expect(saveGame(storage,migrated)).toBeNull();expect(data.get(PRE_SCHEDULER_SAVE_KEY)).toBe(raw);expect(loadGame(storage).game!.scheduler).toEqual(createScheduler());
  const blocked={getItem:(key:string)=>key===SAVE_KEY?raw:null,setItem:(key:string)=>{if(key===PRE_SCHEDULER_SAVE_KEY)throw Error('Quota');}};expect(saveGame(blocked,migrated)).toBeTruthy();expect(blocked.getItem(SAVE_KEY)).toBe(raw);
  const preserved=new Map([[SAVE_KEY,raw],[PRE_SCHEDULER_SAVE_KEY,'earlier snapshot']]),existing={getItem:(key:string)=>preserved.get(key)??null,setItem:(key:string,value:string)=>{preserved.set(key,value);}};expect(saveGame(existing,migrated)).toBeNull();expect(preserved.get(PRE_SCHEDULER_SAVE_KEY)).toBe('earlier snapshot');
 });
 it('preserves queued work, order and the next sequence across save and load',()=>{
  const game=createLife('Persistent scheduler','Person','ca',10);game.scheduler=schedule(game.scheduler!,game.clock!.date,{owner:'unknown.owner',kind:'late',dueDate:{year:2026,month:12,day:1}}).state;game.scheduler=schedule(game.scheduler,game.clock!.date,{owner:'unknown.owner',kind:'early',dueDate:{year:2026,month:11,day:1}}).state;game.scheduler.items.reverse();const data=new Map<string,string>(),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
  expect(saveGame(storage,game)).toBeNull();const restored=loadGame(storage).game!;expect(restored.scheduler).toEqual(game.scheduler);expect(listPending(restored.scheduler!).map(item=>item.id)).toEqual(['scheduled:2','scheduled:1']);expect(schedule(restored.scheduler!,restored.clock!.date,{owner:'later',kind:'x',dueDate:{year:2027,month:1,day:1}}).id).toBe('scheduled:3');
 });
});

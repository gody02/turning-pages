import {describe,expect,it} from 'vitest';
import {adultStart,advanceMonth,choose,createGame} from './simulation';
import {choosePoliticalEvent,advancePoliticalMonth,joinPolitics} from './politics';
import {isGame,listRecoverySnapshots,loadGame,loadRecoverySnapshot,migrateGame,parseGame,RECOVERY_SNAPSHOTS,restoreGame,saveGame,serializeGame,SAVE_KEY,PRE_DETERMINISTIC_RNG_SAVE_KEY,PRE_HISTORY_SAVE_KEY} from './save';
import type {Game} from './types';
import {schedule,takeDue} from './core/scheduler';
import {recordHistoryFact} from './core/history';
import {float} from './core/rng';
import {addMonths} from './core/clock';
import {events} from '../data/events';

const memoryStorage=(entries:Record<string,string>={})=>{
  const data=new Map(Object.entries(entries));
  return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
};

describe('save integrity regressions',()=>{
  it('rejects sparse persisted arrays before JSON can turn holes into null',()=>{
    const journal=new Array(1) as Game['journal'];
    const game={...createGame('Sparse','Woman','uk',1),journal};
    expect(isGame(game)).toBe(false);
    expect(migrateGame(game)).toBeNull();

    const nested=createGame('Nested','Man','uk',2);
    nested.relationships=new Array(1);
    expect(isGame(nested)).toBe(false);
  });

  it('rejects unknown fields at the version-1 save root',()=>{
    const future={...createGame('Future','Non-binary','uk',3),npcSystem:{version:99}};
    expect(isGame(future)).toBe(false);
    expect(migrateGame(future)).toBeNull();
    const raw=JSON.stringify(future),storage=memoryStorage({[SAVE_KEY]:raw});expect(saveGame(storage,createGame('Current','Woman','uk',30))).toBeTruthy();expect(storage.data.get(SAVE_KEY)).toBe(raw);
  });

  it('rejects unsafe persisted RNG cursors without changing the primary',()=>{
    const game=createGame('Cursor','Woman','uk',4);
    game.randomness!.streams.test={algorithm:'lcg32-v1',state:1,cursor:Number.MAX_SAFE_INTEGER+1};
    const storage=memoryStorage({[SAVE_KEY]:'previous bytes'});
    expect(saveGame(storage,game)).toBeTruthy();
    expect(storage.data.get(SAVE_KEY)).toBe('previous bytes');
  });

  it('classifies invalid JSON without replacing the stored bytes',()=>{
    const storage=memoryStorage({[SAVE_KEY]:'{not json'});
    const loaded=loadGame(storage);
    expect(loaded.game).toBeNull();
    expect(loaded.error).toBeTruthy();
    expect(loaded.reason).toBe('invalid-json');
  });

  it('rejects hostile non-JSON structures without invoking accessors',()=>{
    const game=createGame('Hostile','Woman','uk',5) as Game&Record<PropertyKey,unknown>;
    let reads=0;Object.defineProperty(game,'unexpected',{enumerable:true,get:()=>{reads++;throw Error('executed');}});
    expect(isGame(game)).toBe(false);expect(reads).toBe(0);
    const symbol=Symbol('hidden'),symbolic=createGame('Symbol','Man','uk',6) as Game&Record<PropertyKey,unknown>;symbolic[symbol]=1;expect(isGame(symbolic)).toBe(false);
    const {proxy,revoke}=Proxy.revocable(createGame('Proxy','Man','uk',7),{});revoke();expect(isGame(proxy)).toBe(false);
    for(const invalid of [undefined,Symbol('value'),()=>0,NaN,Infinity,-Infinity])expect(serializeGame({...createGame('Value','Woman','uk',31),cause:invalid}).ok).toBe(false);
    const hidden=createGame('Hidden','Woman','uk',32);Object.defineProperty(hidden,'unexpected',{value:true,enumerable:false});expect(isGame(hidden)).toBe(false);
    const unsupported=Object.assign(Object.create({prototype:true}),createGame('Prototype','Woman','uk',33));expect(isGame(unsupported)).toBe(false);
  });

  it('uses one canonical representation for saves and exports',()=>{
    const game=createGame('Canonical','Non-binary','uk',8),before=structuredClone(game),serialized=serializeGame(game);expect(serialized.ok).toBe(true);expect(game).toEqual(before);if(!serialized.ok)return;
    const storage=memoryStorage();expect(saveGame(storage,game)).toBeNull();expect(storage.data.get(SAVE_KEY)).toBe(serialized.raw);expect(parseGame(serialized.raw).game).toEqual(serialized.game);
    const sparse={...game,journal:new Array(1)};expect(serializeGame(sparse).ok).toBe(false);
    expect(serializeGame({...game,npcSystem:{version:99}}).ok).toBe(false);
  });

  it('classifies future versions and invalid canonical state separately',()=>{
    expect(parseGame(JSON.stringify({...createGame('Future','Woman','uk',9),version:4})).reason).toBe('unsupported-version');
    for(const field of ['clock','randomness','scheduler','history','people','population','ukWorld','politics'] as const){let value:Game=createGame('Component','Woman','uk',34);if(field==='politics')value=joinPolitics(adultStart(value),'labour','socratic');const game=value as unknown as Record<string,unknown>,component=structuredClone(game[field]) as Record<string,unknown>;component.version=99;game[field]=component;expect(parseGame(JSON.stringify(game)).reason,field).toBe('unsupported-version');}
    expect(parseGame(JSON.stringify({...createGame('Invalid','Woman','uk',10),age:-1})).reason).toBe('invalid-state');
    const unavailable={getItem:()=>{throw Error('denied');},setItem:()=>{}};expect(loadGame(unavailable).reason).toBe('storage-unavailable');
  });

  it('has one complete recovery inventory and can recover when the primary is corrupt',()=>{
    expect(RECOVERY_SNAPSHOTS.some(item=>item.key===PRE_DETERMINISTIC_RNG_SAVE_KEY)).toBe(true);
    expect(new Set(RECOVERY_SNAPSHOTS.map(item=>item.key)).size).toBe(RECOVERY_SNAPSHOTS.length);
    const recovery=serializeGame(createGame('Recovered','Woman','uk',11));expect(recovery.ok).toBe(true);if(!recovery.ok)return;
    const storage=memoryStorage({[SAVE_KEY]:'{broken',[PRE_HISTORY_SAVE_KEY]:recovery.raw});
    expect(loadGame(storage).reason).toBe('invalid-json');expect(listRecoverySnapshots(storage).map(item=>item.key)).toContain(PRE_HISTORY_SAVE_KEY);expect(loadRecoverySnapshot(storage,PRE_HISTORY_SAVE_KEY).game?.name).toBe('Recovered');
    const snapshot=storage.data.get(PRE_HISTORY_SAVE_KEY);expect(restoreGame(storage,recovery.game)).toBeNull();expect(loadGame(storage).game?.name).toBe('Recovered');expect(storage.data.get(PRE_HISTORY_SAVE_KEY)).toBe(snapshot);
  });

  it('defaults only missing legacy components and rejects present malformed components',()=>{
    for(const field of ['randomness','scheduler','history'] as const){const missing=createGame('Missing','Woman','uk',35) as unknown as Record<string,unknown>;delete missing[field];expect((migrateGame(missing) as unknown as Record<string,unknown>)?.[field]).toBeDefined();const malformed=createGame('Malformed','Woman','uk',36) as unknown as Record<string,unknown>;malformed[field]={};expect(migrateGame(malformed)).toBeNull();}
    for(const field of ['clock','ukWorld'] as const){const malformed=createGame('Malformed','Woman','uk',37) as unknown as Record<string,unknown>;malformed[field]={};expect(migrateGame(malformed)).toBeNull();}
  });

  it('keeps the old primary when its final write fails',()=>{
    const previous=serializeGame(createGame('Previous','Woman','uk',38));expect(previous.ok).toBe(true);if(!previous.ok)return;
    const storage={getItem:(key:string)=>key===SAVE_KEY?previous.raw:null,setItem:(key:string)=>{if(key===SAVE_KEY)throw Error('quota');}};
    expect(saveGame(storage,createGame('Replacement','Woman','uk',39))).toBeTruthy();expect(storage.getItem(SAVE_KEY)).toBe(previous.raw);
  });
});

function resolve(g:Game){if(g.pending){const event=events.find(item=>item.id===g.pending),index=event?.choices.findIndex(choice=>(choice.effects.money??0)>=-Math.max(0,g.money))??0;g=choose(g,index<0?0:index);}if(g.politics?.pending)g=choosePoliticalEvent(g,0);return g;}
function continueCombined(state:Game,political:boolean){
 let game=structuredClone(state);for(let month=0;month<4;month++){game=resolve(game);game=political?advancePoliticalMonth(game):advanceMonth(game);game=resolve(game);}
 const due=takeDue(game.scheduler!,game.clock!.date);game.scheduler=due.state;
 const repeated=takeDue(game.scheduler!,game.clock!.date);if(repeated.occurrences.length)throw Error('duplicate scheduler occurrence');
 const nextScheduled=schedule(game.scheduler!,game.clock!.date,{owner:'test.persistence',kind:'next',dueDate:addMonths(game.clock!.date,1)});game.scheduler=nextScheduled.state;
 const recorded=recordHistoryFact(game.history!,game.clock!.date,{type:'test.continued',source:'test.persistence',payload:{occurrences:due.occurrences.length}});game.history=recorded.history;
 const nextRandom=float(game.randomness!,'test.persistence');
 return {game,nextRandom,occurrences:due.occurrences,scheduledId:nextScheduled.id,historyId:recorded.fact.id};
}

describe('composite deterministic continuation',()=>{
  const prepare=(political:boolean)=>{
    let game=adultStart(createGame(political?'Political continuation':'UK continuation','Woman','uk',27));if(political)game=joinPolitics(game,'labour','socratic');game=resolve(game);
    game.scheduler=schedule(game.scheduler!,game.clock!.date,{owner:'test.persistence',kind:'monthly',dueDate:addMonths(game.clock!.date,1),recurrence:{unit:'month',interval:1}}).state;
    game.history=recordHistoryFact(game.history!,game.clock!.date,{type:'test.started',source:'test.persistence'}).history;
    float(game.randomness!,'test.persistence');return game;
  };
  for(const political of [true,false])it(`continues ${political?'political':'non-political'} UK state identically across save/load`,()=>{
    const start=prepare(political),uninterrupted=continueCombined(start,political),storage=memoryStorage();expect(saveGame(storage,start)).toBeNull();const restored=loadGame(storage).game!;const resumed=continueCombined(restored,political);
    expect(resumed).toEqual(uninterrupted);expect(resumed.occurrences.map(item=>item.occurrence)).toEqual([0,1,2,3]);expect(resumed.scheduledId).toBe('scheduled:2');expect(resumed.historyId).toBe('history:2');expect(resumed.game.clock).toEqual(uninterrupted.game.clock);expect(resumed.game.ukWorld).toEqual(uninterrupted.game.ukWorld);expect(resumed.game.politics).toEqual(uninterrupted.game.politics);expect(resumed.game.scheduler!.nextSequence).toBe(uninterrupted.game.scheduler!.nextSequence);expect(resumed.game.history!.nextSequence).toBe(uninterrupted.game.history!.nextSequence);
  });
});

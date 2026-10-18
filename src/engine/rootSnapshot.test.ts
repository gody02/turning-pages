import {describe,expect,it} from 'vitest';
import {isGame,upgradeGameToCurrent,migrateGame,upgradeGameToV6,upgradeGameToV7,serializeCurrentGame,serializeGame,serializeGameV5,serializeGameV6,serializeGameV7,parseCurrentGame,requiredRecoverySnapshotKeys} from './save';
import {syntheticGuardianshipCareGame,guardianshipCareContext} from './testing/guardianshipCareRootFixture';
import {snapshotRoot} from './rootSnapshot';
import {validGameWithContent,synchronizeGamePlayerDeath} from './gameContent';
import {acceptApplicationGame} from '../ui/gameContent';
import {syntheticRelationshipUnionGame} from './testing/relationshipUnionRootFixture';
import {GamePersistence} from '../persistence/service';
import {IDBFactory} from 'fake-indexeddb';
import {deletePersistenceDatabase} from '../persistence/indexedDb';
import type {Game} from './types';

export function versionRace(){
  const target=structuredClone(syntheticGuardianshipCareGame());
  let getters=0,traps=0;
  const hostile=new Proxy(target,{getOwnPropertyDescriptor(object,key){
    traps++;const descriptor=Reflect.getOwnPropertyDescriptor(object,key);
    if(key==='name')Object.defineProperty(object,'version',{enumerable:true,configurable:true,get(){getters++;return 8;}});
    return descriptor;
  }});
  return {hostile,counters:()=>({getters,traps})};
}
describe('root descriptor snapshot correction',()=>{
  const entries={isGame,upgradeGameToCurrent,migrateGame,upgradeGameToV6,upgradeGameToV7,serializeCurrentGame,serializeGame,serializeGameV5,serializeGameV6,serializeGameV7,validGameWithContent};
  it.each(Object.keys(entries) as (keyof typeof entries)[])('closes the original P1 race at %s',entry=>{
    const probe=versionRace(),result=entries[entry](probe.hostile);
    expect(result===false||result===null||typeof result==='object'&&'ok' in result&&!result.ok).toBe(true);
    expect(probe.counters().getters).toBe(0);expect(probe.counters().traps).toBeGreaterThan(0);
  });
  it('captures a valid Proxy representation without any value-get trap',()=>{
    const game=syntheticGuardianshipCareGame();let gets=0,traps=0;
    const hostile=new Proxy(game,{get(){gets++;throw Error('unsafe get');},getOwnPropertyDescriptor(target,key){traps++;return Reflect.getOwnPropertyDescriptor(target,key);}});
    expect(isGame(hostile)).toBe(true);const next=upgradeGameToCurrent(hostile)!;
    expect(next).toEqual(game);expect(next).not.toBe(game);expect(next.people).not.toBe(game.people);expect(gets).toBe(0);expect(traps).toBeGreaterThan(0);
  });
  it.each(['people','guardianship','care','clock'] as const)('rejects nested %s descriptor mutations without getters',field=>{
    const game=syntheticGuardianshipCareGame(),value=game[field]!;let calls=0;
    const keys=Object.keys(value),first=keys[0],last=keys.at(-1)!;
    const hostile=new Proxy(value,{getOwnPropertyDescriptor(target,key){const d=Reflect.getOwnPropertyDescriptor(target,key);if(key===last)Object.defineProperty(target,first,{enumerable:true,configurable:true,get(){calls++;return 1;}});return d;}});
    const input={...game,[field]:hostile};expect(isGame(input)).toBe(false);expect(upgradeGameToCurrent(input)).toBeNull();expect(calls).toBe(0);
  });
  it('rejects array element mutation and does not create sparse owned arrays',()=>{
    const target=[{value:1},{value:2}];let calls=0;
    const array=new Proxy(target,{getOwnPropertyDescriptor(object,key){const d=Reflect.getOwnPropertyDescriptor(object,key);if(key==='1')Object.defineProperty(object,'0',{enumerable:true,configurable:true,get(){calls++;return {};}});return d;}});
    expect(()=>snapshotRoot(array)).toThrow('snapshot');expect(calls).toBe(0);
    expect(snapshotRoot([])).toEqual([]);expect(Object.keys(snapshotRoot([1,2]))).toEqual(['0','1']);
  });
  it.each(['insert','delete'] as const)('rejects observable property %s during inspection',kind=>{
    const target:Record<string,unknown>={first:1,last:2};
    const hostile=new Proxy(target,{getOwnPropertyDescriptor(object,key){const d=Reflect.getOwnPropertyDescriptor(object,key);if(key==='last'){if(kind==='insert')object.extra=3;else delete object.first;}return d;}});
    expect(()=>snapshotRoot(hostile)).toThrow('snapshot');
  });
  const malformed:Record<string,()=>unknown>={
    sparse:()=>new Array(2),symbol:()=>({[Symbol('x')]:1}),hidden:()=>Object.defineProperty({},'x',{value:1}),
    prototype:()=>Object.create({x:1}),class:()=>new (class X{x=1})(),undefined:()=>({x:undefined}),
    function:()=>({x:()=>1}),bigint:()=>({x:1n}),nan:()=>({x:NaN}),infinity:()=>({x:Infinity}),
    cycle:()=>{const x:Record<string,unknown>={};x.x=x;return x;},
    deep:()=>{let x:unknown=1;for(let i=0;i<42;i++)x={x};return x;},
    arrayExtra:()=>Object.assign([1],{extra:2}),
    throwing:()=>new Proxy({},{getOwnPropertyDescriptor(){throw Error('trap');},ownKeys(){return ['x'];}}),
    revoked:()=>{const p=Proxy.revocable({},{});p.revoke();return p.proxy;},
    accessor:()=>Object.defineProperty({},'x',{enumerable:true,get(){throw Error('getter must not run');}}),
  };
  it.each(Object.keys(malformed))('fails predictably on %s',name=>{
    const input=malformed[name]();expect(()=>snapshotRoot(input)).toThrow('Invalid Game JSON snapshot.');expect(isGame(input)).toBe(false);expect(upgradeGameToCurrent(input)).toBeNull();expect(serializeCurrentGame(input).ok).toBe(false);
  });
  it.each([undefined,null,'8',8.5,9,-0,NaN,Infinity])('rejects malformed root version %s',version=>{
    const game={...syntheticGuardianshipCareGame(),version};expect(isGame(game)).toBe(false);expect(upgradeGameToCurrent(game)).toBeNull();
  });
  it('preserves null-prototype JSON, finite numeric semantics and special keys safely',()=>{
    const source=JSON.parse('{"__proto__":{"polluted":true},"constructor":1,"prototype":2}');
    const copy=snapshotRoot(source);expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);expect(Object.hasOwn(copy,'__proto__')).toBe(true);expect(({} as Record<string,unknown>).polluted).toBeUndefined();
    expect(snapshotRoot(Object.assign(Object.create(null),{x:1}))).toEqual({x:1});expect(Object.is(snapshotRoot(-0),-0)).toBe(true);
  });
  it('preserves historical v7, current populated state, canonical bytes and independent ownership',()=>{
    const historical=syntheticRelationshipUnionGame(),current=syntheticGuardianshipCareGame(),before=structuredClone(current),a=upgradeGameToCurrent(current)!,b=upgradeGameToCurrent(current)!;
    expect(upgradeGameToCurrent(historical)?.guardianship.guardianships).toEqual([]);expect(a).toEqual(current);expect(b).toEqual(current);
    current.care={version:1,responsibilities:[]};expect(a).toEqual(before);expect(b).toEqual(before);expect(a.care).not.toBe(b.care);expect(a.people).not.toBe(b.people);
    const encoded=serializeCurrentGame(a);if(!encoded.ok)throw Error(encoded.error);expect(parseCurrentGame(encoded.raw).game).toEqual(a);expect(serializeCurrentGame(b)).toEqual(encoded);
  });
  it('owns content-accepted output and preserves both input and previous outputs',async()=>{
    const game=syntheticGuardianshipCareGame(),before=structuredClone(game),content=guardianshipCareContext(game),a=await acceptApplicationGame(game,content),b=await acceptApplicationGame(game,content);
    expect(a).toEqual(before);expect(a).not.toBe(game);expect(a.people.people).not.toBe(game.people.people);expect(a.care).not.toBe(game.care);expect(a.care).not.toBe(b.care);
    (game.people.people[0] as {name:string}).name='Caller changed';expect(a).toEqual(before);expect(b).toEqual(before);
  });
  it('rejects the race at application acceptance, save preparation and recovery selection without publication',async()=>{
    const probe=versionRace();await expect(acceptApplicationGame(probe.hostile)).rejects.toThrow('consistency');expect(probe.counters().getters).toBe(0);
    const factory=new IDBFactory(),name='root-snapshot-failure',service=await GamePersistence.open({getItem:()=>null,setItem:()=>{throw Error('unexpected storage');}},factory,name);
    try{const race=versionRace();await expect(service.save(race.hostile,null)).rejects.toThrow();expect(await service.repository.getRecord('primary')).toBeUndefined();expect(race.counters().getters).toBe(0);
      const recovery=versionRace();expect(()=>requiredRecoverySnapshotKeys(recovery.hostile,syntheticGuardianshipCareGame())).toThrow('snapshot');expect(recovery.counters().getters).toBe(0);
    }finally{service.close();await deletePersistenceDatabase(factory,name);}
  });
  it('rejects dynamic race before death publication and leaves the previous game exact',()=>{
    const game=syntheticGuardianshipCareGame(),before=structuredClone(game),probe=versionRace();Object.defineProperty(probe.hostile,'alive',{value:false,enumerable:true,writable:true,configurable:true});
    expect(()=>synchronizeGamePlayerDeath(game,probe.hostile,guardianshipCareContext(game))).toThrow('snapshot');expect(probe.counters().getters).toBe(0);expect(game).toEqual(before);
  });
  it('rejects malformed Care and legal kind registries instead of repairing content',()=>{
    const game=syntheticGuardianshipCareGame(),content=guardianshipCareContext(game);
    const invalid={...game,care:{version:1,responsibilities:[{caregiverId:'person:1',recipientId:'person:999',role:'principal'}]}};
    expect(isGame(invalid)).toBe(false);expect(validGameWithContent(game,{...content,guardianshipKinds:{version:1,kinds:[],manifest:[]} })).toBe(false);
    let calls=0;const bad={...content};Object.defineProperty(bad,'guardianshipKinds',{get(){calls++;return content.guardianshipKinds;}});expect(validGameWithContent(game,bad)).toBe(false);expect(calls).toBe(0);
  });
  it('repeated rejection consumes no allocator/RNG/history and mutates no prior owned output',()=>{
    const game=syntheticGuardianshipCareGame(),owned=upgradeGameToCurrent(game)!,before=structuredClone(game),race=versionRace();
    for(let i=0;i<3;i++){expect(upgradeGameToCurrent(race.hostile)).toBeNull();expect(isGame(race.hostile)).toBe(false);}
    expect(race.counters().getters).toBe(0);expect(game).toEqual(before);expect(owned).toEqual(before);
  });
});

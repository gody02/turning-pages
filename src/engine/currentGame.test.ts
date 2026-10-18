import {describe,expect,it} from 'vitest';
import {createGame} from './simulation';
import {isCanonicalGamePayload,parseGame,parseGameV5,serializeGame,serializeGameV5,upgradeGameToCurrent} from './save';
import {syntheticHouseholdGame} from './testing/householdRootFixture';
import {syntheticResidenceGame} from './testing/residenceFixture';

describe('version-qualified canonical Game codecs',()=>{
 it('keeps historical root4 bytes supported while current serialization appends exactly76 empty bytes',()=>{
  const old=serializeGame(syntheticResidenceGame());if(!old.ok)throw Error(old.error);
  const current=serializeGameV5(old.game);if(!current.ok)throw Error(current.error);
  expect(current.game.version).toBe(5);expect(current.raw.endsWith('"household":{"version":1,"nextSequence":1,"households":[],"memberships":[]}}')).toBe(true);
  expect(new TextEncoder().encode(current.raw).length-new TextEncoder().encode(old.raw).length).toBe(76);
  expect(isCanonicalGamePayload(old.raw)).toBe(true);expect(isCanonicalGamePayload(current.raw)).toBe(true);
  expect(parseGame(old.raw).game).toEqual(old.game);expect(parseGameV5(old.raw).game).toEqual(current.game);
  const {household,...rest}=current.game;expect(serializeGame({...rest,version:4})).toEqual(old);expect(household.memberships).toHaveLength(0);
  expect(serializeGame(current.game)).toMatchObject({ok:false,reason:'unsupported-version'});expect(parseGame(current.raw)).toMatchObject({game:null,reason:'unsupported-version'});
 });
 it('preserves populated Household exactly through canonical current roundtrips',()=>{
  const game=syntheticHouseholdGame(),serialized=serializeGameV5(game);if(!serialized.ok)throw Error(serialized.error);
  expect(parseGameV5(serialized.raw).game).toEqual(game);expect(serialized.game.household).toEqual(game.household);expect(serializeGameV5(parseGameV5(serialized.raw).game)).toEqual(serialized);
  const household={memberships:game.household.memberships.map(item=>({householdId:item.householdId,personId:item.personId})),households:game.household.households.map(item=>({sequence:item.sequence,id:item.id})),nextSequence:game.household.nextSequence,version:1};
  expect(serializeGameV5({...game,household})).toEqual(serialized);
  expect(isCanonicalGamePayload(JSON.stringify({...game,household}))).toBe(false);
 });
 it('has predictable failures for missing/malformed5, future versions and invalid JSON',()=>{
  const result=serializeGameV5(createGame('Invalid','Unspecified','ca',20));if(!result.ok)throw Error(result.error);const game=result.game;
  for(const household of [undefined,null,{...game.household,memberships:[{personId:'person:999',householdId:'household:1'}]}]){
   expect(parseGameV5(JSON.stringify({...game,household}))).toMatchObject({game:null,reason:'invalid-state'});expect(serializeGameV5({...game,household}).ok).toBe(false);
  }
  expect(parseGameV5('{')).toMatchObject({game:null,reason:'invalid-json'});
  for(const source of [{...game,version:6},{...game,household:{...game.household,version:2}},{...game,surprise:true}])expect(serializeGameV5(source)).toMatchObject({ok:false,reason:'unsupported-version'});
 });
 it('rejects hostile new-root structures without invoking accessors or leaking low-level exceptions',()=>{
  const game=syntheticHouseholdGame();let reads=0;const accessor={...game};Object.defineProperty(accessor,'household',{enumerable:true,get:()=>{reads++;throw Error('getter');}});
  const hidden={...game};Object.defineProperty(hidden,'hidden',{value:true});const symbol={...game,[Symbol('bad')]:1};
  const revoked=Proxy.revocable(game,{});revoked.revoke();
  for(const source of [accessor,hidden,symbol,revoked.proxy,new Proxy(game,{ownKeys(){throw Error('Inspection failed');}}),{...game,household:{...game.household,nextSequence:NaN}},Object.setPrototypeOf({...game},{bad:true})]){expect(()=>serializeGameV5(source)).not.toThrow();expect(serializeGameV5(source).ok).toBe(false);expect(upgradeGameToCurrent(source)).toBeNull();}
  // Owner-approved compatible input-boundary amendment: captured valid Proxy
  // data is accepted; historical v5 encoding and current upgrade remain exact.
  const target=structuredClone(game),before=structuredClone(target),proxy=new Proxy(target,{}),ordinary=serializeGameV5(target),captured=serializeGameV5(proxy);
  expect(captured).toEqual(ordinary);if(!captured.ok)throw Error(captured.error);expect(captured.game.version).toBe(5);expect(isCanonicalGamePayload(captured.raw)).toBe(true);
  expect(captured.game).not.toBe(target);expect(captured.game.household).not.toBe(target.household);expect(captured.game.people.people).not.toBe(target.people.people);
  const upgraded=upgradeGameToCurrent(proxy)!;expect(upgraded).toEqual(upgradeGameToCurrent(before));expect(upgraded).not.toBe(target);
  target.name='Caller changed';expect(captured.game).toEqual(before);expect(upgraded.name).toBe(before.name);
  expect(serializeGameV5(new Proxy({...before,household:{...before.household,nextSequence:NaN}},{})).ok).toBe(false);
  const guarded=new Proxy(before,{get(){reads++;throw Error('Unsafe original read');}});expect(serializeGameV5(guarded)).toEqual(ordinary);
  expect(reads).toBe(0);
 });
 it('continues validating stored canonical root3 in its own schema',()=>{const game=createGame('Historic3','Unspecified','ca',23),raw=JSON.stringify(game);expect(game.version).toBe(3);expect(isCanonicalGamePayload(raw)).toBe(true);expect(parseGameV5(raw).game?.version).toBe(5);expect(JSON.parse(raw).version).toBe(3);});
});

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
  for(const source of [accessor,hidden,symbol,new Proxy(game,{}),revoked.proxy,{...game,household:{...game.household,nextSequence:NaN}},Object.setPrototypeOf({...game},{bad:true})]){expect(()=>serializeGameV5(source)).not.toThrow();expect(serializeGameV5(source).ok).toBe(false);expect(upgradeGameToCurrent(source)).toBeNull();}
  expect(reads).toBe(0);
 });
 it('continues validating stored canonical root3 in its own schema',()=>{const game=createGame('Historic3','Unspecified','ca',23),raw=JSON.stringify(game);expect(game.version).toBe(3);expect(isCanonicalGamePayload(raw)).toBe(true);expect(parseGameV5(raw).game?.version).toBe(5);expect(JSON.parse(raw).version).toBe(3);});
});

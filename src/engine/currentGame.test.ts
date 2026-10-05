import {describe,expect,it} from 'vitest';
import {createGame} from './simulation';
import {isCanonicalGamePayload,parseGame,parseCurrentGame,serializeGame,serializeCurrentGame,upgradeGameToCurrent} from './save';
import {syntheticHouseholdGame} from './testing/householdRootFixture';
import {syntheticResidenceGame} from './testing/residenceFixture';

describe('version-qualified canonical Game codecs',()=>{
 it('keeps historical root4 bytes supported while current serialization appends exactly76 empty bytes',()=>{
  const old=serializeGame(syntheticResidenceGame());if(!old.ok)throw Error(old.error);
  const current=serializeCurrentGame(old.game);if(!current.ok)throw Error(current.error);
  expect(current.game.version).toBe(5);expect(current.raw.endsWith('"household":{"version":1,"nextSequence":1,"households":[],"memberships":[]}}')).toBe(true);
  expect(new TextEncoder().encode(current.raw).length-new TextEncoder().encode(old.raw).length).toBe(76);
  expect(isCanonicalGamePayload(old.raw)).toBe(true);expect(isCanonicalGamePayload(current.raw)).toBe(true);
  expect(parseGame(old.raw).game).toEqual(old.game);expect(parseCurrentGame(old.raw).game).toEqual(current.game);
  const {household,...rest}=current.game;expect(serializeGame({...rest,version:4})).toEqual(old);expect(household.memberships).toHaveLength(0);
  expect(serializeGame(current.game)).toMatchObject({ok:false,reason:'unsupported-version'});expect(parseGame(current.raw)).toMatchObject({game:null,reason:'unsupported-version'});
 });
 it('preserves populated Household exactly through canonical current roundtrips',()=>{
  const game=syntheticHouseholdGame(),serialized=serializeCurrentGame(game);if(!serialized.ok)throw Error(serialized.error);
  expect(parseCurrentGame(serialized.raw).game).toEqual(game);expect(serialized.game.household).toEqual(game.household);expect(serializeCurrentGame(parseCurrentGame(serialized.raw).game)).toEqual(serialized);
  const household={memberships:game.household.memberships.map(item=>({householdId:item.householdId,personId:item.personId})),households:game.household.households.map(item=>({sequence:item.sequence,id:item.id})),nextSequence:game.household.nextSequence,version:1};
  expect(serializeCurrentGame({...game,household})).toEqual(serialized);
  expect(isCanonicalGamePayload(JSON.stringify({...game,household}))).toBe(false);
 });
 it('has predictable failures for missing/malformed5, future versions and invalid JSON',()=>{
  const game=upgradeGameToCurrent(createGame('Invalid','Unspecified','ca',20))!;
  for(const household of [undefined,null,{...game.household,memberships:[{personId:'person:999',householdId:'household:1'}]}]){
   expect(parseCurrentGame(JSON.stringify({...game,household}))).toMatchObject({game:null,reason:'invalid-state'});expect(serializeCurrentGame({...game,household}).ok).toBe(false);
  }
  expect(parseCurrentGame('{')).toMatchObject({game:null,reason:'invalid-json'});
  for(const source of [{...game,version:6},{...game,household:{...game.household,version:2}},{...game,surprise:true}])expect(serializeCurrentGame(source)).toMatchObject({ok:false,reason:'unsupported-version'});
 });
 it('rejects hostile new-root structures without invoking accessors or leaking low-level exceptions',()=>{
  const game=syntheticHouseholdGame();let reads=0;const accessor={...game};Object.defineProperty(accessor,'household',{enumerable:true,get:()=>{reads++;throw Error('getter');}});
  const hidden={...game};Object.defineProperty(hidden,'hidden',{value:true});const symbol={...game,[Symbol('bad')]:1};
  const revoked=Proxy.revocable(game,{});revoked.revoke();
  for(const source of [accessor,hidden,symbol,new Proxy(game,{}),revoked.proxy,{...game,household:{...game.household,nextSequence:NaN}},Object.setPrototypeOf({...game},{bad:true})]){expect(()=>serializeCurrentGame(source)).not.toThrow();expect(serializeCurrentGame(source).ok).toBe(false);expect(upgradeGameToCurrent(source)).toBeNull();}
  expect(reads).toBe(0);
 });
 it('continues validating stored canonical root3 in its own schema',()=>{const game=createGame('Historic3','Unspecified','ca',23),raw=JSON.stringify(game);expect(game.version).toBe(3);expect(isCanonicalGamePayload(raw)).toBe(true);expect(parseCurrentGame(raw).game?.version).toBe(5);expect(JSON.parse(raw).version).toBe(3);});
});

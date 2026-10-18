import {afterEach,beforeEach,describe,expect,it,vi,type MockInstance} from 'vitest';
import * as snapshotModule from './rootSnapshot';
import {snapshotRoot} from './rootSnapshot';
import * as save from './save';
import {validGameWithContent} from './gameContent';
import {acceptApplicationGame} from '../ui/gameContent';
import {syntheticGuardianshipCareGame,guardianshipCareContext} from './testing/guardianshipCareRootFixture';

let captures:MockInstance<typeof snapshotRoot>;
beforeEach(()=>{captures=vi.spyOn(snapshotModule,'snapshotRoot');});
afterEach(()=>vi.restoreAllMocks());

describe('operation-local root ownership performance contracts',()=>{
 it('captures every public boolean validation and retains no stale trust after mutation',()=>{
  const game=syntheticGuardianshipCareGame();captures.mockClear();
  expect(save.isGame(game)).toBe(true);expect(captures).toHaveBeenCalledTimes(1);
  let getters=0;Object.defineProperty(game,'version',{enumerable:true,get(){getters++;return 8;}});
  expect(save.isGame(game)).toBe(false);expect(captures).toHaveBeenCalledTimes(2);expect(getters).toBe(0);
 });
 it('captures an object upgrade exactly once and returns independent mutable data',()=>{
  const game=syntheticGuardianshipCareGame();captures.mockClear();
  const result=save.upgradeGameToCurrent(game)!;expect(captures).toHaveBeenCalledTimes(1);
  expect(result).toEqual(game);expect(result).not.toBe(game);expect(result.people).not.toBe(game.people);
  (game.people.people[0] as {name:string}).name='Caller mutation';expect(result.people.people[0].name).not.toBe('Caller mutation');
 });
 it('captures checkpoint input once and validates its fresh JSON roundtrip without recapture',()=>{
  const game=syntheticGuardianshipCareGame();captures.mockClear();
  const encoded=save.serializeCurrentGame(game);if(!encoded.ok)throw Error(encoded.error);
  expect(captures).toHaveBeenCalledTimes(1);
  const loaded=save.parseCurrentGame(encoded.raw).game!;expect(captures).toHaveBeenCalledTimes(1);
  expect(loaded).toEqual(encoded.game);expect(loaded).not.toBe(encoded.game);expect(loaded.care).not.toBe(encoded.game.care);
  expect(save.isCanonicalGamePayload(encoded.raw)).toBe(true);expect(captures).toHaveBeenCalledTimes(1);
 });
 it('still rejects malformed semantic state after fresh JSON parsing',()=>{
  const game=syntheticGuardianshipCareGame();const malformed={...game,care:{version:1,responsibilities:[{caregiverId:'person:1',recipientId:'person:999',role:'principal'}]}};
  captures.mockClear();expect(save.parseCurrentGame(JSON.stringify(malformed)).game).toBeNull();expect(captures).not.toHaveBeenCalled();
  expect(save.isCanonicalGamePayload(JSON.stringify({...game,stats:{...game.stats,health:Infinity}}))).toBe(false);
  const overflow=JSON.stringify(game).replace('"health":'+game.stats.health,'"health":1e400');
  expect(save.parseCurrentGame(overflow).game).toBeNull();
 });
 it('does not let replacement of the global parser forge private owned-JSON input',()=>{
  const game=syntheticGuardianshipCareGame(),raw=JSON.stringify(game);let getters=0;
  const hostile=Object.defineProperty({},'version',{get(){getters++;throw Error('unsafe');}});
  vi.spyOn(JSON,'parse').mockImplementation(()=>hostile);
  const loaded=save.parseCurrentGame(raw);expect(loaded.game).toEqual(game);expect(loaded.game).not.toBe(game);expect(getters).toBe(0);
 });
 it('preserves JSON depth and key bounds on the fresh parsed path',()=>{
  const game=syntheticGuardianshipCareGame();let nested:unknown=1;
  for(let i=0;i<42;i++)nested={nested};
  expect(save.parseCurrentGame(JSON.stringify({...game,extra:nested})).game).toBeNull();
  expect(save.parseCurrentGame(JSON.stringify({...game,['x'.repeat(3001)]:1})).game).toBeNull();
 });
 it('combines engine content capture and structural validation without a second copy',()=>{
  const game=syntheticGuardianshipCareGame(),content=guardianshipCareContext(game);captures.mockClear();
  expect(validGameWithContent(game,content)).toBe(true);expect(captures).toHaveBeenCalledTimes(1);
 });
 it('keeps application ownership and required content validation with two independent boundaries',async()=>{
  const game=syntheticGuardianshipCareGame(),before=structuredClone(game),content=guardianshipCareContext(game);captures.mockClear();
  const accepted=await acceptApplicationGame(game,content);expect(captures).toHaveBeenCalledTimes(2);
  expect(accepted).toEqual(before);expect(accepted).not.toBe(game);expect(accepted.people).not.toBe(game.people);
  game.care={version:1,responsibilities:[]};expect(accepted).toEqual(before);
 });
 it('rejects forged flags and symbols rather than using them as ownership provenance',()=>{
  const game=syntheticGuardianshipCareGame();captures.mockClear();
  expect(save.captureValidatedGame({...game,trusted:true})).toBeNull();
  expect(save.captureValidatedGame({...game,[Symbol('owned')]:true})).toBeNull();
  expect(captures).toHaveBeenCalledTimes(2);
  expect('normalizeOwnedGame' in save).toBe(false);expect('isOwnedGame' in save).toBe(false);
 });
 it('rejects descriptor mutation at the safe composition adapter without getter execution',()=>{
  const game=structuredClone(syntheticGuardianshipCareGame());let getters=0;
  const hostile=new Proxy(game,{getOwnPropertyDescriptor(target,key){const descriptor=Reflect.getOwnPropertyDescriptor(target,key);if(key==='name')Object.defineProperty(target,'version',{enumerable:true,configurable:true,get(){getters++;return 8;}});return descriptor;}});
  expect(save.captureValidatedGame(hostile)).toBeNull();expect(getters).toBe(0);
 });
 it('creates only own data properties without inherited setter or special-key hazards',()=>{
  let setters=0;Object.defineProperty(Object.prototype,'snapshotCopySentinel',{configurable:true,set(){setters++;}});
  try{
   const input=JSON.parse('{"snapshotCopySentinel":1,"__proto__":{"safe":true},"constructor":2}');
   const result=snapshotRoot(input);expect(setters).toBe(0);expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
   expect(Object.hasOwn(result,'__proto__')).toBe(true);expect(Object.getOwnPropertyDescriptor(result,'snapshotCopySentinel')).toMatchObject({value:1,enumerable:true,writable:true,configurable:true});
   expect(({} as {safe?:boolean}).safe).toBeUndefined();
  }finally{delete (Object.prototype as {snapshotCopySentinel?:unknown}).snapshotCopySentinel;}
 });
});

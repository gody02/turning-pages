import {afterEach,describe,expect,it,vi} from 'vitest';
import legacyV1 from './fixtures/life-v1.json';
import {createGame,ageUp} from './simulation';
import {isGame,isCanonicalGamePayload,migrateGame,parseCurrentGame,parseGame,parseGameV5,serializeGame,serializeGameV5,serializeCurrentGame,upgradeGameToCurrent} from './save';
import {addParentageBasis,createEmptyKinshipState} from './kinship/state';
import {context,syntheticResidenceGame} from './testing/residenceFixture';
import {syntheticHouseholdGame} from './testing/householdRootFixture';
import {syntheticKinshipGame} from './testing/kinshipRootFixture';
import {createPerson,replacePerson} from './human/person';
import {createEmptyResidenceState} from './residence/state';
import {validGameWithContent} from './gameContent';

afterEach(()=>vi.restoreAllMocks());
describe('current Game root6 and frozen historical codecs',()=>{
 it('adds only exact empty Kinship to valid populated5 without inference or mutable aliases',()=>{
  const source=syntheticHouseholdGame(),before=structuredClone(source),first=upgradeGameToCurrent(source)!,second=upgradeGameToCurrent(source)!;
  const {kinship,...rest}=first;
  expect(source).toEqual(before);expect({...rest,version:5}).toEqual(source);expect(first.version).toBe(6);expect(isGame(first)).toBe(true);
  expect(kinship).toEqual({version:1,parentages:[]});expect(Object.keys(kinship)).toEqual(['version','parentages']);expect(first.household).toEqual(source.household);
  expect(first).toEqual(second);expect(first.kinship).not.toBe(second.kinship);expect(first.kinship.parentages).not.toBe(second.kinship.parentages);
  expect(Object.isFrozen(first.kinship)).toBe(true);expect(Object.isFrozen(first.kinship.parentages)).toBe(true);
  expect(first.people).not.toBe(source.people);Object.assign(source.people.people[0],{name:'Caller changed'});source.clock!.date.day=2;
  expect(first.people).toEqual(before.people);expect(first.clock).toEqual(before.clock);
 });
 it('performs object migration without JSON, entropy, time, RNG or domain effects',()=>{
  const source=syntheticHouseholdGame(),before=structuredClone(source);
  const parse=vi.spyOn(JSON,'parse').mockImplementation(()=>{throw Error('Object migration must not decode JSON');});
  const encode=vi.spyOn(JSON,'stringify').mockImplementation(()=>{throw Error('Object migration must not encode JSON');});
  const random=vi.spyOn(Math,'random'),now=vi.spyOn(Date,'now'),entropy=vi.spyOn(crypto,'getRandomValues');
  const result=upgradeGameToCurrent(source)!;
  expect(parse).not.toHaveBeenCalled();expect(encode).not.toHaveBeenCalled();expect(random).not.toHaveBeenCalled();expect(now).not.toHaveBeenCalled();expect(entropy).not.toHaveBeenCalled();
  const {kinship,...rest}=result;expect(kinship).toEqual(createEmptyKinshipState());expect({...rest,version:5}).toEqual(before);
  expect(result.randomness).toEqual(before.randomness);expect(result.clock).toEqual(before.clock);expect(result.history).toEqual(before.history);expect(result.scheduler).toEqual(before.scheduler);
 });
 it('extends each supported historical chain and leaves original fixed codecs unchanged',()=>{
  const v3=createGame('Historic','Unspecified','ca',17),v2={...v3,version:2,population:undefined};delete v2.population;
  for(const source of [legacyV1,v2,v3,syntheticResidenceGame(),syntheticHouseholdGame()]){
   const before=structuredClone(source),old=serializeGameV5(source),current=upgradeGameToCurrent(source)!;
   if(!old.ok)throw Error(old.error);expect(current.version).toBe(6);expect(current.kinship).toEqual(createEmptyKinshipState());expect(current.household).toEqual(old.game.household);
   expect(parseCurrentGame(old.raw).game).toEqual(current);expect(parseGameV5(old.raw).game).toEqual(old.game);expect(isCanonicalGamePayload(old.raw)).toBe(true);expect(source).toEqual(before);
  }
 });
 it('appends exactly40 UTF-8 bytes, canonicalizes only field encoding, and never downgrades6',()=>{
  const source=syntheticHouseholdGame(),historical=serializeGameV5(source),current=serializeCurrentGame(source);if(!historical.ok||!current.ok)throw Error('Codec failure');
  expect(new TextEncoder().encode(current.raw).length-new TextEncoder().encode(historical.raw).length).toBe(40);
  expect(current.raw.endsWith(',"kinship":{"version":1,"parentages":[]}}')).toBe(true);expect(isCanonicalGamePayload(historical.raw)).toBe(true);expect(isCanonicalGamePayload(current.raw)).toBe(true);
  expect(parseGameV5(current.raw)).toMatchObject({game:null,reason:'unsupported-version'});expect(parseGame(current.raw)).toMatchObject({game:null,reason:'unsupported-version'});
  expect(serializeGameV5(current.game)).toMatchObject({ok:false,reason:'unsupported-version'});expect(serializeGame(current.game)).toMatchObject({ok:false,reason:'unsupported-version'});expect(migrateGame(current.game)).toBeNull();
  const kinship={parentages:[],version:1};expect(serializeCurrentGame({...current.game,kinship})).toEqual(current);expect(isCanonicalGamePayload(JSON.stringify({...current.game,kinship}))).toBe(false);
 });
 it('validates populated6 across distinct Households/Residences and preserves exact pair/basis continuation',()=>{
  const game=syntheticKinshipGame(),canonical=serializeCurrentGame(game);if(!canonical.ok)throw Error(canonical.error);
  expect(isGame(game)).toBe(true);expect(upgradeGameToCurrent(game)).toEqual(game);const loaded=parseCurrentGame(canonical.raw).game!;
  expect(loaded).toEqual(game);expect(loaded.kinship).toEqual(game.kinship);expect(loaded.kinship.parentages).toEqual([{parentId:'person:2',childId:'person:4',bases:['gestational']},{parentId:'person:4',childId:'person:5',bases:['genetic','legal']}]);
  const context={people:loaded.people},retry=addParentageBasis(loaded.kinship,'person:4','person:5','legal',context);expect(retry).toEqual(loaded.kinship);
  const continued=addParentageBasis(retry,'person:1','person:3','legal',context);expect(continued.parentages).toHaveLength(3);expect(isGame({...loaded,kinship:continued})).toBe(true);expect(game.kinship.parentages).toHaveLength(2);
 });
 it('requires Kinship on6 while rejecting its presence on fixed4/5',()=>{
  const game=upgradeGameToCurrent(syntheticResidenceGame())!;
  expect(isGame({...syntheticHouseholdGame(),kinship:createEmptyKinshipState()})).toBe(false);expect(isGame({...syntheticResidenceGame(),kinship:createEmptyKinshipState()})).toBe(false);
  for(const kinship of [undefined,null,{}, {version:1,parentages:[],nextSequence:1}]){expect(isGame({...game,kinship})).toBe(false);expect(upgradeGameToCurrent({...game,kinship})).toBeNull();expect(parseCurrentGame(JSON.stringify({...game,kinship})).game).toBeNull();}
  expect(serializeCurrentGame({...game,version:7})).toMatchObject({ok:false,reason:'unsupported-version'});expect(serializeCurrentGame({...game,kinship:{version:2,parentages:[]}})).toMatchObject({ok:false,reason:'unsupported-version'});
 });
 const edge=(parentId:string,childId:string,bases:readonly string[]=['legal'])=>({parentId,childId,bases});
 it.each([
  [edge('person:999','person:1')], [edge('person:1','person:999')], [edge('person:1','person:1')],
  [edge('person:1','person:2',['unknown'])], [edge('person:1','person:2',[])], [edge('person:1','person:2',['legal','legal'])],
  [edge('person:1','person:2',['legal','genetic'])], [edge('person:1','person:2'),edge('person:1','person:2')],
  [edge('person:2','person:3'),edge('person:1','person:2')],
  [edge('person:1','person:2',['genetic']),edge('person:2','person:1',['legal'])],
  [edge('person:1','person:2'),edge('person:2','person:3'),edge('person:3','person:1')],
 ])('rejects invalid persisted graph case %# without repair',(...parentages)=>{
  const value={...syntheticKinshipGame(),kinship:{version:1,parentages}},before=structuredClone(value);
  expect(isGame(value)).toBe(false);expect(upgradeGameToCurrent(value)).toBeNull();expect(serializeCurrentGame(value).ok).toBe(false);expect(parseCurrentGame(JSON.stringify(value)).game).toBeNull();expect(value).toEqual(before);
 });
 it('rejects hostile Kinship without getter execution or low-level exception leakage',()=>{
  const game=syntheticKinshipGame();let reads=0;const accessor={version:1};Object.defineProperty(accessor,'parentages',{enumerable:true,get:()=>{reads++;throw Error('Getter');}});
  const hidden={version:1,parentages:[]};Object.defineProperty(hidden,'extra',{value:1});const revocable=Proxy.revocable(game.kinship,{});revocable.revoke();
  for(const kinship of [accessor,hidden,{...game.kinship,[Symbol('extra')]:true},{version:1,parentages:new Array(1)},new Proxy(game.kinship,{}),revocable.proxy,Object.setPrototypeOf({version:1,parentages:[]},{custom:true})]){
   expect(()=>serializeCurrentGame({...game,kinship})).not.toThrow();expect(serializeCurrentGame({...game,kinship}).ok).toBe(false);expect(upgradeGameToCurrent({...game,kinship})).toBeNull();
  }expect(reads).toBe(0);
 });
 it('keeps deceased parentage while frozen Residence content and death cleanup stay active on6',()=>{
  const game=syntheticKinshipGame(),person=game.people.people[4],dead=createPerson(person.sequence,{...person,lifeStatus:'deceased',diedAt:game.clock!.date});
  const deceased={...game,people:replacePerson(game.people,dead),residence:createEmptyResidenceState()};expect(isGame(deceased)).toBe(true);expect(parseCurrentGame(JSON.stringify(deceased)).game?.kinship).toEqual(game.kinship);
  const fresh=upgradeGameToCurrent(syntheticResidenceGame())!;fresh.kinship=addParentageBasis(fresh.kinship,'person:1','person:2','legal',{people:fresh.people});
  const content=context(fresh.people);expect(validGameWithContent(fresh,content)).toBe(true);fresh.stats.health=0;
  const next=ageUp(fresh,content);expect(next.version).toBe(6);expect(isGame(next)).toBe(true);expect(next.residence!.occupants.some(item=>item.personId==='person:1')).toBe(false);expect(next).toHaveProperty('kinship',fresh.kinship);
 });
});

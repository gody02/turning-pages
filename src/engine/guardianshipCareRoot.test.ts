import {afterEach,describe,expect,it,vi} from 'vitest';
import legacy from './fixtures/life-v1.json';
import {createGame,ageUp,act,advanceMonth,choose} from './simulation';
import {isGame,isCanonicalGamePayload,parseCurrentGame,parseGameV7,PRE_GUARDIANSHIP_CARE_SAVE_KEY,requiredRecoverySnapshotKeys,serializeCurrentGame,serializeGameV7,upgradeGameToCurrent,upgradeGameToV7} from './save';
import {syntheticResidenceGame,context as residenceContext} from './testing/residenceFixture';
import {syntheticHouseholdGame} from './testing/householdRootFixture';
import {syntheticKinshipGame} from './testing/kinshipRootFixture';
import {syntheticRelationshipUnionGame} from './testing/relationshipUnionRootFixture';
import {guardianshipCareContext,syntheticGuardianshipCareGame} from './testing/guardianshipCareRootFixture';
import {createEmptyGuardianshipState,endGuardianship} from './guardianship/state';
import {createGuardianshipKindRegistry,withGuardianshipKindFingerprint} from './guardianship/kinds';
import {fixtureKind,fixtureRef} from './guardianship/fixtures';
import {createEmptyCareState,establishCare} from './care/state';
import {validGameWithContent} from './gameContent';
import {replacePerson} from './human/person';
import type {GameV8} from './types';

afterEach(()=>vi.restoreAllMocks());

describe('current root8 and pinned historical7',()=>{
 it('adds exact independently owned empty states only across every historical chain',()=>{
  const sources=[legacy,createGame('Historic','Unspecified','ca',17),syntheticResidenceGame(),syntheticHouseholdGame(),syntheticKinshipGame(),syntheticRelationshipUnionGame()];
  for(const source of sources){
   const before=structuredClone(source),random=vi.spyOn(Math,'random'),now=vi.spyOn(Date,'now'),entropy=vi.spyOn(crypto,'getRandomValues');
   const first=upgradeGameToCurrent(source)!,second=upgradeGameToCurrent(source)!;
   expect(first.version).toBe(8);expect(first.guardianship).toEqual(createEmptyGuardianshipState());expect(first.care).toEqual(createEmptyCareState());
   expect(first.guardianship).not.toBe(second.guardianship);expect(first.care).not.toBe(second.care);expect(first.people).not.toBe((source as GameV8).people);
   expect(source).toEqual(before);expect(random).not.toHaveBeenCalled();expect(now).not.toHaveBeenCalled();expect(entropy).not.toHaveBeenCalled();
   expect(first.randomness).toEqual((upgradeGameToV7(source)??first).randomness);expect(first.clock).toEqual((upgradeGameToV7(source)??first).clock);expect(first.history).toEqual((upgradeGameToV7(source)??first).history);
   vi.restoreAllMocks();
  }
 });

 it('preserves exact GameV7 semantics and retains a pinned historical codec',()=>{
  const source=syntheticRelationshipUnionGame(),before=structuredClone(source),historical=serializeGameV7(source),current=serializeCurrentGame(source);
  if(!historical.ok||!current.ok)throw Error('Codec failure');
  const {guardianship,care,...rest}=current.game;expect({...rest,version:7}).toEqual(historical.game);expect(source).toEqual(before);
  expect(guardianship).toEqual(createEmptyGuardianshipState());expect(care).toEqual(createEmptyCareState());
  expect(parseGameV7(historical.raw).game).toEqual(historical.game);expect(parseCurrentGame(historical.raw).game).toEqual(current.game);
  expect(isCanonicalGamePayload(historical.raw)).toBe(true);expect(requiredRecoverySnapshotKeys(historical.game,current.game)).toEqual([PRE_GUARDIANSHIP_CARE_SAVE_KEY]);
  expect(upgradeGameToV7(current.game)).toBeNull();expect(parseGameV7(current.raw).reason).toBe('unsupported-version');
 });

 it('requires both exact fields and preserves populated current state on repeated upgrade',()=>{
  const game=syntheticGuardianshipCareGame(),before=structuredClone(game),first=upgradeGameToCurrent(game)!,second=upgradeGameToCurrent(first)!;
  expect(first).toEqual(game);expect(second).toEqual(game);expect(first).not.toBe(game);expect(first.guardianship).not.toBe(game.guardianship);expect(first.care).not.toBe(game.care);expect(game).toEqual(before);
  for(const key of ['guardianship','care'] as const){const { [key]:_missing,...without}=game;expect(isGame(without)).toBe(false);expect(upgradeGameToCurrent(without)).toBeNull();}
  for(const invalid of [{...game,guardianship:{...game.guardianship,version:2}},{...game,care:{...game.care,version:2}},{...game,version:9}]){expect(isGame(invalid)).toBe(false);expect(serializeCurrentGame(invalid).ok).toBe(false);}
 });

 it('resolves every live and ended legal record through exact kind content',()=>{
  const game=syntheticGuardianshipCareGame(),content=guardianshipCareContext(game);expect(validGameWithContent(game,content)).toBe(true);expect(validGameWithContent(game)).toBe(false);
  const ended={...game,guardianship:endGuardianship(game.guardianship,'guardianship:1',{endedOn:null},{people:game.people,referenceDate:game.clock!.date,kinds:content.guardianshipKinds!})};
  expect(validGameWithContent(ended,content)).toBe(true);expect(validGameWithContent(ended,{...content,guardianshipKinds:createGuardianshipKindRegistry([],[])})).toBe(false);
  const {fingerprint:_fixtureFingerprint,...kindInput}=fixtureKind,changed=withGuardianshipKindFingerprint({...kindInput,label:'Changed synthetic kind'}),registry=createGuardianshipKindRegistry([changed],[{kindId:changed.kindId,fingerprint:changed.fingerprint}]);
  expect(validGameWithContent(game,{...content,guardianshipKinds:registry})).toBe(false);
  const empty=upgradeGameToCurrent(syntheticRelationshipUnionGame())!;expect(validGameWithContent(empty,{...residenceContext(empty.people),guardianshipKinds:createGuardianshipKindRegistry([],[])})).toBe(false);expect(validGameWithContent({...empty,formalUnion:{version:1,nextSequence:1,unions:[]},partnership:{version:1,partnerships:[]},residence:{version:1,nextSequence:1,residences:[],occupants:[],noFixedAbodePersonIds:[]}},{...residenceContext(empty.people),guardianshipKinds:createGuardianshipKindRegistry([],[])})).toBe(true);
 });

 it('does not infer authority or care from prior domestic states',()=>{
  const migrated=upgradeGameToCurrent(syntheticRelationshipUnionGame())!;
  expect(migrated.kinship.parentages.length).toBeGreaterThan(0);expect(migrated.household.households.length).toBeGreaterThan(0);expect(migrated.partnership.partnerships.length).toBeGreaterThan(0);expect(migrated.formalUnion.unions.length).toBeGreaterThan(0);
  expect(migrated.guardianship).toEqual(createEmptyGuardianshipState());expect(migrated.care).toEqual(createEmptyCareState());
 });

 it('rejects missing, self and deceased Care/Guardianship endpoints without repair',()=>{
  const game=syntheticGuardianshipCareGame(),dead=game.people.people.find(person=>person.id==='person:4')!,people=replacePerson(game.people,{...dead,lifeStatus:'deceased',diedAt:game.clock!.date} as typeof dead);
  expect(isGame({...game,people})).toBe(false);
  for(const guardianship of [
   {...game.guardianship,guardianships:game.guardianship.guardianships.map(row=>({...row,holderId:'person:999'}))},
   {...game.guardianship,guardianships:game.guardianship.guardianships.map(row=>({...row,holderId:row.protectedPersonId}))},
  ])expect(isGame({...game,guardianship})).toBe(false);
  for(const care of [
   {version:1,responsibilities:[{caregiverId:'person:1',recipientId:'person:999',role:'principal'}]},
   {version:1,responsibilities:[{caregiverId:'person:1',recipientId:'person:1',role:'principal'}]},
  ])expect(isGame({...game,care})).toBe(false);
 });

 it.each(['ageUp','choose'] as const)('atomically cleans selected Person Care through death-capable %s and preserves unrelated authority',operation=>{
  const game=syntheticGuardianshipCareGame(),content=guardianshipCareContext(game),before=structuredClone(game);game.stats.health=operation==='ageUp'?0:1;game.pending=operation==='choose'?'burnout':null;
  const next=operation==='ageUp'?ageUp(game,content):choose(game,1,content);
  expect(next.version).toBe(8);if(next.version!==8)throw Error('Expected GameV8');expect(next.alive).toBe(false);expect(next.people.people.find(person=>person.id==='person:1')?.lifeStatus).toBe('deceased');
  expect(next.care.responsibilities).toEqual([{caregiverId:'person:2',recipientId:'person:3',role:'principal'}]);expect(next.guardianship).toEqual(game.guardianship);expect(next.household).toEqual(game.household);expect(next.kinship).toEqual(game.kinship);expect(isGame(next)).toBe(true);expect(validGameWithContent(next,content)).toBe(true);
  expect(game).toEqual({...before,stats:{...before.stats,health:operation==='ageUp'?0:1},pending:operation==='choose'?'burnout':null});
 });

 it('preserves Care on non-death advanceMonth and act paths that still traverse the shared lifecycle seam',()=>{
  const game=syntheticGuardianshipCareGame(),content=guardianshipCareContext(game),before=structuredClone(game),monthly={...game,clock:{...game.clock!,cadence:'month' as const}};
  const advanced=advanceMonth(monthly,content),acted=act(game,'rest',content);
  expect(advanced.version).toBe(8);expect(acted.version).toBe(8);if(advanced.version!==8||acted.version!==8)throw Error('Expected GameV8');
  expect(advanced.alive).toBe(true);expect(advanced.care).toEqual(game.care);expect(acted.alive).toBe(true);expect(acted.care).toEqual(game.care);expect(game).toEqual(before);
 });

 it('rolls back a death candidate when unrelated Care is invalid',()=>{
  const game=syntheticGuardianshipCareGame(),before=structuredClone(game),content=guardianshipCareContext(game);game.stats.health=0;
  const invalid={...game,care:{version:1 as const,responsibilities:[...game.care.responsibilities,{caregiverId:'person:3',recipientId:'person:999',role:'principal' as const}]}};
  expect(()=>ageUp(invalid,content)).toThrow();expect(game).toEqual({...before,stats:{...before.stats,health:0}});
 });

 it('round-trips canonical populated state and rejects hostile root fields without getter execution',()=>{
  const game=syntheticGuardianshipCareGame(),encoded=serializeCurrentGame(game);if(!encoded.ok)throw Error(encoded.error);expect(parseCurrentGame(encoded.raw).game).toEqual(game);expect(serializeCurrentGame(parseCurrentGame(encoded.raw).game)).toEqual(encoded);expect(isCanonicalGamePayload(encoded.raw)).toBe(true);
  let reads=0;const hostile=structuredClone(game) as Record<string,unknown>;Object.defineProperty(hostile,'care',{enumerable:true,get(){reads++;return game.care;}});expect(isGame(hostile)).toBe(false);expect(upgradeGameToCurrent(hostile)).toBeNull();expect(reads).toBe(0);
  const sparse=structuredClone(game);(sparse.care.responsibilities as unknown[]).length++;expect(isGame(sparse)).toBe(false);
 });
});

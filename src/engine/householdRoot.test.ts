import {afterEach,describe,expect,it,vi} from 'vitest';
import legacyV1 from './fixtures/life-v1.json';
import {createGame,ageUp} from './simulation';
import {isGame,migrateGame,upgradeGameToCurrent} from './save';
import {createEmptyHouseholdState,createHousehold,removeHouseholdMember} from './household/state';
import {createEmptyResidenceState} from './residence/state';
import {createPerson,replacePerson} from './human/person';
import {context,syntheticResidenceGame} from './testing/residenceFixture';
import {syntheticHouseholdGame} from './testing/householdRootFixture';
import {validGameWithContent} from './gameContent';

afterEach(()=>vi.restoreAllMocks());
describe('Household current Game root v5',()=>{
 it('appends the empty stage to historical roots without changing existing migrations',()=>{
  const v3=createGame('Migration','Unspecified','ca',17),v2={...v3,version:2,population:undefined};delete v2.population;
  const v4=migrateGame(v3)!;
  for(const source of [legacyV1,v2,v3,v4]){
   const before=structuredClone(source),historical=migrateGame(source),current=upgradeGameToCurrent(source)!;
   expect(current.version).toBe(5);expect(isGame(current)).toBe(true);expect(current.household).toEqual(createEmptyHouseholdState());
   const {household,...rest}=current;expect({...rest,version:4}).toEqual(historical);expect(source).toEqual(before);
   expect(createHousehold(household,['person:1'],{people:current.people}).household.id).toBe('household:1');
  }
 });
 it('preserves the frozen constructor candidate with no deep mutable alias',()=>{
  const source=structuredClone(syntheticResidenceGame()),before=structuredClone(source),current=upgradeGameToCurrent(source)!;
  Object.assign(source.people!.people[0],{name:'Source changed'});source.clock!.date.day=2;
  expect(current.people.people[0].name).toBe(before.people!.people[0].name);expect(current.clock).toEqual(before.clock);
  current.residence={...current.residence,occupants:[]};current.population={...current.population,memberships:[]};
  expect(source.residence).toEqual(before.residence);expect(source.population).toEqual(before.population);
  expect(Object.isFrozen(current.household)).toBe(true);expect(Object.isFrozen(current.household.memberships)).toBe(true);
  const untouched=syntheticResidenceGame(),snapshot=structuredClone(untouched);upgradeGameToCurrent(untouched);expect(untouched).toEqual(snapshot);expect('household' in untouched).toBe(false);
 });
 it('is deterministic/idempotent and preserves populated current state and allocator ownership',()=>{
  const source=syntheticResidenceGame();expect(upgradeGameToCurrent(source)).toEqual(upgradeGameToCurrent(source));
  const populated=syntheticHouseholdGame(),copy=upgradeGameToCurrent(populated)!;expect(copy).toEqual(populated);
  const context={people:copy.people},first=createHousehold(copy.household,['person:4'],context);expect(first.household.id).toBe('household:3');expect(copy.household.nextSequence).toBe(3);
  let retired=removeHouseholdMember(copy.household,'person:1','household:1',context);retired=removeHouseholdMember(retired,'person:2','household:1',context);
  const round=upgradeGameToCurrent({...copy,household:retired})!;expect(round.household).toEqual(retired);expect(createHousehold(round.household,['person:2'],context).household.id).toBe('household:3');
 });
 it('requires Household in asserted5 and rejects malformed/unresolved/deceased memberships without repair',()=>{
  const game=syntheticHouseholdGame();expect(isGame(game)).toBe(true);
  for(const household of [undefined,null,{}, {...game.household,version:2},{...game.household,nextSequence:0},{...game.household,households:new Array(1)},{...game.household,memberships:[{personId:'person:999',householdId:'household:1'}]},{...game.household,memberships:[...game.household.memberships,...game.household.memberships]}, {...game.household,memberships:[...game.household.memberships].reverse()}]){
   const invalid={...game,household};expect(isGame(invalid)).toBe(false);expect(upgradeGameToCurrent(invalid)).toBeNull();
  }
  const deadPerson=createPerson(3,{...game.people.people[2],lifeStatus:'deceased',diedAt:game.clock!.date}),people=replacePerson(game.people,deadPerson);
  const dead={...game,people,residence:createEmptyResidenceState()};expect(isGame(dead)).toBe(false);expect(upgradeGameToCurrent(dead)).toBeNull();
  expect(isGame({...syntheticResidenceGame(),household:createEmptyHouseholdState()})).toBe(false);
 });
 it('permits current Household membership without any Residence fact',()=>{
  const game=upgradeGameToCurrent(createGame('Independent','Unspecified','ca',31))!;
  const household=createHousehold(game.household,['person:1'],{people:game.people}).state;
  expect(game.residence).toEqual(createEmptyResidenceState());expect(isGame({...game,household})).toBe(true);
 });
 it('adds no entropy, time, Scheduler, History or causal/event state and uses no JSON decoding',()=>{
  const source=syntheticResidenceGame(),before=structuredClone(source);
  const random=vi.spyOn(Math,'random'),time=vi.spyOn(Date,'now'),entropy=vi.spyOn(crypto,'getRandomValues'),parse=vi.spyOn(JSON,'parse').mockImplementation(()=>{throw Error('No JSON conversion allowed');});
  const result=upgradeGameToCurrent(source)!;
  expect(random).not.toHaveBeenCalled();expect(time).not.toHaveBeenCalled();expect(entropy).not.toHaveBeenCalled();expect(parse).not.toHaveBeenCalled();
  expect(result.randomness).toEqual(before.randomness);expect(result.clock).toEqual(before.clock);expect(result.scheduler).toEqual(before.scheduler);expect(result.history).toEqual(before.history);
  const {household,...rest}=result;expect(household.households).toHaveLength(0);expect({...rest,version:4}).toEqual(before);
 });
 it('keeps Residence content and existing death cleanup active for current5 with empty Household',()=>{
  const game=upgradeGameToCurrent(syntheticResidenceGame())!,content=context(game.people);
  expect(validGameWithContent(game,content)).toBe(true);const invalid={...game,residence:{...game.residence,residences:game.residence.residences.map((item,index)=>index===0?{...item,location:{kind:'administrative-area',administrativeArea:{version:1,partitionId:'geography.missing-v1',placeId:'place.missing.cell'}}}:item)}};
  expect(validGameWithContent(invalid,content)).toBe(false);
  game.stats.health=0;const next=ageUp(game,content);expect(next.version).toBe(5);expect(isGame(next)).toBe(true);expect(next.residence!.occupants.some(item=>item.personId==='person:1')).toBe(false);expect(next.household).toEqual(createEmptyHouseholdState());
 });
});

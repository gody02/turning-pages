import {describe,expect,it} from 'vitest';
import {createRandomness} from '../core/rng';
import {createGame} from '../simulation';
import {isGame,loadRecoverySnapshot,migrateGame,parseGame,PRE_POPULATION_SAVE_KEY,RECOVERY_SNAPSHOTS,saveGame,SAVE_KEY,serializeGame} from '../save';
import type {Game} from '../types';
import type {PersonGenerationProfile} from './generation';
import {allocatePerson,createPerson,replacePerson,type PersonInput} from './person';
import {
 addPartialPopulationCoverage,addPopulationCohort,adjustPopulationCohort,createCohortMembership,createLegacyPopulation,createPopulation,
 deriveCountryPopulation,deriveRepresentedLivingPopulation,initializeCompleteCountryPopulation,instantiateFromCohort,
 LEGACY_POPULATION_SOURCE,PLAYER_POPULATION_SOURCE,parsePopulationCohortId,populationCohortId,validPopulation,validPopulationWithPeople,
 type PopulationCohortInput,type PopulationState,
} from './population';

const playerInput:PersonInput={name:'Player',dateOfBirth:{year:2000,month:1,day:1},genderLabel:'Any',lifeStatus:'living',traits:[],temperament:{},aptitudes:{}};
const profile:PersonGenerationProfile={
 version:1,id:'profile.population-synthetic-v1',
 naming:{givenNames:[{id:'name.alex',text:'Alex',weight:1}],familyNames:[{id:'family.test',text:'Test',weight:1}]},
 genderLabels:[{id:'gender.any',label:'Any',weight:1}],temperament:[],aptitudes:[],
};
const cohortInput=(overrides:Partial<PopulationCohortInput>={}):PopulationCohortInput=>({countryId:'ca',areaId:null,birthYear:2000,generationProfileId:profile.id,count:10,...overrides});
const countryPopulation=(count=10)=>{
 let state=createPopulation();state=addPartialPopulationCoverage(state,{countryId:'ca',source:'population.synthetic-test',areaPartitionId:null});return addPopulationCohort(state,cohortInput({count}));
};
const rootV2=(game:Game)=>{const copy=structuredClone(game);copy.version=2;delete copy.population;return copy;};
const rootV1=(game:Game)=>{const copy=structuredClone(game) as unknown as Record<string,unknown>;copy.version=1;delete copy.people;delete copy.population;return copy;};
const memoryStorage=(entries:Record<string,string>={})=>{const data=new Map(Object.entries(entries));return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};};

describe('PopulationState v1 validation and accounting',()=>{
 it('creates an empty state and migrates the player into partial coverage',()=>{
  expect(createPopulation()).toEqual({version:1,coverage:[],cohorts:[],memberships:[]});const game=createGame('Player','Any','ca',1);
  expect(game.population).toEqual({version:1,coverage:[{countryId:'ca',status:'partial',source:PLAYER_POPULATION_SOURCE,areaPartitionId:null}],cohorts:[],memberships:[{personId:'person:1',countryId:'ca',areaId:null,origin:{kind:'explicit',source:PLAYER_POPULATION_SOURCE}}]});
  expect(validPopulationWithPeople(game.population,game.people)).toBe(true);
 });

 it('accounts for every existing Person exactly once and leaves unknown NPC countries unknown',()=>{
  const game=createGame('Player','Any','ca',2);game.people=allocatePerson(game.people!,{...playerInput,name:'NPC'}).state;const population=createLegacyPopulation(game.people,'ca');
  expect(population.memberships.map(item=>item.personId)).toEqual(['person:1','person:2']);expect(population.memberships[1].countryId).toBeNull();expect(validPopulationWithPeople(population,game.people)).toBe(true);
  expect(validPopulationWithPeople({...population,memberships:population.memberships.slice(0,1)},game.people)).toBe(false);expect(validPopulation({...population,memberships:[population.memberships[0],population.memberships[0]]})).toBe(false);
 });

 it('derives deterministic unambiguous cohort IDs and rejects tampering or duplicate cells',()=>{
  const input=cohortInput(),id=populationCohortId(input);expect(parsePopulationCohortId(id)).toEqual({countryId:'ca',areaId:null,birthYear:2000,generationProfileId:profile.id});
  expect(id).toBe('population-cohort:v1|2:ca|-|2000|31:profile.population-synthetic-v1');
  for(const [year,encoded] of [[1,'0001'],[4,'0004'],[99,'0099'],[100,'0100'],[999,'0999'],[1000,'1000'],[1899,'1899'],[1900,'1900']] as const){const historical=populationCohortId(cohortInput({birthYear:year}));expect(historical).toContain(`|${encoded}|`);expect(parsePopulationCohortId(historical)?.birthYear).toBe(year);}
  const state=countryPopulation();expect(state.cohorts[0].id).toBe(id);expect(validPopulation({...state,cohorts:[{...state.cohorts[0],id:id+'x'}]})).toBe(false);expect(()=>addPopulationCohort(state,input)).toThrow('duplicate');
  let historicalState=createPopulation();historicalState=addPartialPopulationCoverage(historicalState,{countryId:'ca',source:'population.synthetic-test',areaPartitionId:null});historicalState=addPopulationCohort(historicalState,cohortInput({birthYear:1899}));expect(validPopulation(historicalState)).toBe(true);expect(()=>addPopulationCohort(historicalState,cohortInput({birthYear:1899}))).toThrow('duplicate');
  expect(()=>populationCohortId(cohortInput({birthYear:0}))).toThrow();expect(()=>populationCohortId(cohortInput({birthYear:10000}))).toThrow();
  expect(populationCohortId({...input,countryId:'a-b'})).not.toBe(populationCohortId({...input,countryId:'a',areaId:'b.synthetic'}));
 });

 it('requires positive exact counts, removes zero cohorts and protects safe aggregation',()=>{
  const state=countryPopulation(1),id=state.cohorts[0].id,empty=adjustPopulationCohort(state,id,-1);expect(empty.cohorts).toEqual([]);expect(validPopulation({...state,cohorts:[{...state.cohorts[0],count:0}]})).toBe(false);
  expect(validPopulation({...state,cohorts:[{...state.cohorts[0],count:1.5}]})).toBe(false);expect(()=>adjustPopulationCohort(state,id,-2)).toThrow();
  let huge=createPopulation();huge=addPartialPopulationCoverage(huge,{countryId:'ca',source:'population.synthetic-test',areaPartitionId:null});huge=addPopulationCohort(huge,cohortInput({count:Number.MAX_SAFE_INTEGER}));
  expect(()=>addPopulationCohort(huge,{...cohortInput({countryId:'us',count:1}),countryId:'us'})).toThrow();
  const overflow={...huge,coverage:[...huge.coverage,{countryId:'us',status:'partial',source:'population.synthetic-test',areaPartitionId:null}],cohorts:[...huge.cohorts,{...cohortInput({countryId:'us',count:1}),id:populationCohortId(cohortInput({countryId:'us',count:1}))}]};expect(validPopulation(overflow)).toBe(false);
  const people=createGame('Overflow','Any','ca',99).people!,withMember={...huge,memberships:[{personId:'person:1',countryId:'ca',areaId:null,origin:{kind:'legacy' as const}}]};expect(validPopulation(withMember)).toBe(true);expect(validPopulationWithPeople(withMember,people)).toBe(false);
 });

 it('sorts canonical arrays and permits deliberate complete synthetic coverage only',()=>{
  let state=createPopulation();state=addPartialPopulationCoverage(state,{countryId:'us',source:'population.synthetic-test',areaPartitionId:null});state=addPartialPopulationCoverage(state,{countryId:'ca',source:'population.synthetic-test',areaPartitionId:null});expect(state.coverage.map(item=>item.countryId)).toEqual(['ca','us']);
  const game=createGame('Complete','Any','ca',2),complete=initializeCompleteCountryPopulation(game.population!,game.people!,{countryId:'ca',source:'population.calibrated-test',areaPartitionId:null,cohorts:[cohortInput({count:99})]});expect(complete.coverage[0].status).toBe('complete');expect(validPopulationWithPeople(complete,game.people)).toBe(true);expect(()=>initializeCompleteCountryPopulation(complete,game.people!,{countryId:'ca',source:'population.calibrated-test',areaPartitionId:null,cohorts:[]})).toThrow();
 });

 it('derives partial, complete, unknown-country and deceased living totals without removing identity',()=>{
  const game=createGame('Player','Any','ca',3),partial=game.population!;expect(deriveCountryPopulation(partial,game.people!,'ca')).toEqual({knownLiving:1,complete:false});
  game.people=allocatePerson(game.people!,{...playerInput,name:'Unknown'}).state;game.population=createLegacyPopulation(game.people,'ca');expect(deriveRepresentedLivingPopulation(game.population,game.people)).toEqual({knownLiving:1,unknownCountryLiving:1});
  const dead=createPerson(2,{...playerInput,name:'Unknown',lifeStatus:'deceased',diedAt:{year:2040,month:1,day:1}});game.people=replacePerson(game.people,dead);expect(deriveRepresentedLivingPopulation(game.population,game.people)).toEqual({knownLiving:1,unknownCountryLiving:0});expect(game.population.memberships).toHaveLength(2);
  const other=createGame('Other','Any','uk',4),complete=initializeCompleteCountryPopulation(other.population!,other.people!,{countryId:'uk',source:'population.calibrated-test',areaPartitionId:null,cohorts:[cohortInput({countryId:'uk',count:50})]});expect(deriveCountryPopulation(complete,other.people!,'uk')).toEqual({knownLiving:51,complete:true});
 });

 it('requires complete partitions to classify living memberships coherently',()=>{
  const game=createGame('Known','Any','ca',5);game.people=allocatePerson(game.people!,{...playerInput,name:'Unknown'}).state;game.population=createLegacyPopulation(game.people,'ca');const before=structuredClone(game.population);
  expect(()=>initializeCompleteCountryPopulation(game.population!,game.people!,{countryId:'ca',source:'population.calibrated-test',areaPartitionId:null,cohorts:[cohortInput({count:10})]})).toThrow('unknown living memberships');expect(game.population).toEqual(before);
  const partitioned={...createGame('Area','Any','ca',6).population!,coverage:[{countryId:'ca',status:'complete' as const,source:'population.calibrated-test',areaPartitionId:'area.synthetic-v1'}]};expect(validPopulation(partitioned)).toBe(true);expect(validPopulationWithPeople(partitioned,createGame('Area','Any','ca',6).people!)).toBe(false);
 });

 it('rejects malformed structures without executing accessors or exposing proxy errors',()=>{
  const state=countryPopulation();let reads=0;const hostile=structuredClone(state) as unknown as Record<string,unknown>;Object.defineProperty(hostile,'coverage',{enumerable:true,get:()=>{reads++;return [];}});expect(validPopulation(hostile)).toBe(false);expect(reads).toBe(0);
  const sparse=structuredClone(state) as unknown as {cohorts:unknown[]};sparse.cohorts=new Array(1);expect(validPopulation(sparse)).toBe(false);const revoked=Proxy.revocable(state,{});revoked.revoke();expect(()=>validPopulation(revoked.proxy)).not.toThrow();expect(validPopulation(revoked.proxy)).toBe(false);
 });
});

describe('population-backed Person instantiation',()=>{
 const setup=(cohortCount=10)=>{const game=createGame('Player','Any','ca',10),population=addPopulationCohort(game.population!,cohortInput({count:cohortCount}));return {people:game.people!,population,randomness:game.randomness!};};
 const request=(cohortCount=10,count=1)=>{const state=setup(cohortCount);return {...state,input:{people:state.people,population:state.population,rootSeed:state.randomness.rootSeed,cohortId:state.population.cohorts[0].id,requestKey:'population.test-request',count,referenceDate:{year:2030,month:6,day:15},profile}};};

 it('atomically transfers one or many humans without changing represented population',()=>{
  for(const count of [1,3]){const prepared=request(5,count),before=deriveRepresentedLivingPopulation(prepared.population,prepared.people),result=instantiateFromCohort(prepared.input),after=deriveRepresentedLivingPopulation(result.population,result.people);expect(after).toEqual(before);expect(result.persons.map(person=>person.id)).toEqual(Array.from({length:count},(_,index)=>`person:${index+2}`));expect(result.population.memberships.slice(1).map(item=>item.personId)).toEqual(result.persons.map(person=>person.id));expect(result.people.nextSequence).toBe(2+count);expect(result.reused).toBe(false);}
 });

 it('removes a depleted cohort while retaining valid historical provenance',()=>{
  const prepared=request(2,2),cohortId=prepared.input.cohortId,result=instantiateFromCohort(prepared.input);expect(result.population.cohorts).toEqual([]);expect(result.population.memberships.slice(1).every(item=>item.origin.kind==='cohort'&&item.origin.cohortId===cohortId)).toBe(true);expect(validPopulationWithPeople(result.population,result.people)).toBe(true);
 });

 it('uses exact valid dates inside the cohort year and consumes no mutable RNG',()=>{
  const prepared=request(5,3),before=structuredClone(prepared.randomness),result=instantiateFromCohort(prepared.input);expect(result.persons.every(person=>person.dateOfBirth.year===2000)).toBe(true);expect(prepared.randomness).toEqual(before);expect(result.persons.every(person=>person.lifeStatus==='living')).toBe(true);
 });

 it('shares one cohort receipt constructor and rejects Person/cohort birth-year disagreement',()=>{
  const prepared=request(2,1),result=instantiateFromCohort(prepared.input),person=result.persons[0],receipt=result.population.memberships[1];expect(receipt).toEqual(createCohortMembership(person,prepared.input.cohortId,prepared.input.requestKey,0));
  const mismatched=createPerson(person.sequence,{...playerInput,name:person.name,dateOfBirth:{year:2001,month:1,day:1}}),people=replacePerson(result.people,mismatched);expect(validPopulation(result.population)).toBe(true);expect(validPopulationWithPeople(result.population,people)).toBe(false);expect(()=>createCohortMembership(mismatched,prepared.input.cohortId,prepared.input.requestKey,0)).toThrow('Invalid cohort membership receipt');
 });

 it('is transactional for insufficient counts, profile mismatch and generation failure',()=>{
  const prepared=request(1,2),peopleBefore=structuredClone(prepared.people),populationBefore=structuredClone(prepared.population);expect(()=>instantiateFromCohort(prepared.input)).toThrow('insufficient');expect(prepared.people).toEqual(peopleBefore);expect(prepared.population).toEqual(populationBefore);expect(prepared.people.nextSequence).toBe(2);
  const one=request(2,1),mismatch={...profile,id:'profile.other-v1'};expect(()=>instantiateFromCohort({...one.input,profile:mismatch})).toThrow('does not match');expect(one.people.nextSequence).toBe(2);expect(one.population.cohorts[0].count).toBe(2);
  const invalid={...profile,naming:{givenNames:[{id:'name.none',text:'None',weight:0}],familyNames:profile.naming.familyNames}};expect(()=>instantiateFromCohort({...one.input,profile:invalid})).toThrow();expect(one.people.nextSequence).toBe(2);expect(one.population.cohorts[0].count).toBe(2);
 });

 it('uses membership receipts for idempotent retries and rejects conflicting reuse',()=>{
  const prepared=request(4,2),first=instantiateFromCohort(prepared.input),retry=instantiateFromCohort({...prepared.input,people:first.people,population:first.population});expect(retry.reused).toBe(true);expect(retry.people).toEqual(first.people);expect(retry.population).toEqual(first.population);expect(retry.persons.map(person=>person.id)).toEqual(['person:2','person:3']);
  expect(()=>instantiateFromCohort({...prepared.input,people:first.people,population:first.population,count:1})).toThrow('conflicts');const other=populationCohortId(cohortInput({birthYear:2001}));expect(()=>instantiateFromCohort({...prepared.input,people:first.people,population:first.population,cohortId:other})).toThrow('conflicts');expect(first.population.memberships.slice(1).map(item=>item.origin.kind==='cohort'?item.origin.requestIndex:-1)).toEqual([0,1]);
  const swapped=structuredClone(first.population) as unknown as {memberships:{origin:{kind:string;requestIndex:number}}[]};const left=swapped.memberships[1].origin,right=swapped.memberships[2].origin;left.requestIndex=1;right.requestIndex=0;expect(validPopulation(swapped)).toBe(false);
  const malformed={...profile,naming:{...profile.naming,givenNames:[{...profile.naming.givenNames[0],weight:-1}]}};expect(()=>instantiateFromCohort({...prepared.input,people:first.people,population:first.population,profile:malformed})).toThrow('Invalid population instantiation request.');expect(first.people.nextSequence).toBe(4);expect(first.population).toEqual(retry.population);
 });

 it('round trips and continues allocation without History, events, Scheduler or RNG effects',()=>{
  const prepared=request(4,2),result=instantiateFromCohort(prepared.input),game=createGame('Player','Any','ca',10),history=structuredClone(game.history),scheduler=structuredClone(game.scheduler),randomness=structuredClone(game.randomness);game.people=result.people;game.population=result.population;
  const saved=serializeGame(game);expect(saved.ok).toBe(true);if(!saved.ok)return;const loaded=parseGame(saved.raw).game!,nextCohort=addPopulationCohort(loaded.population!,cohortInput({birthYear:2001,count:1})),next=instantiateFromCohort({people:loaded.people!,population:nextCohort,rootSeed:loaded.randomness!.rootSeed,cohortId:nextCohort.cohorts.find(item=>item.birthYear===2001)!.id,requestKey:'population.next-request',count:1,referenceDate:{year:2030,month:6,day:15},profile});
  expect(next.persons[0].id).toBe('person:4');expect(loaded.history).toEqual(history);expect(loaded.scheduler).toEqual(scheduler);expect(loaded.randomness).toEqual(randomness);expect(loaded.facts).toEqual(game.facts);
 });
});

describe('root-v3 Population persistence and recovery',()=>{
 it('migrates root v1 and root v2 without cohorts, RNG draws, time changes or invented NPC provenance',()=>{
  const current=createGame('Legacy','Any','ca',20),v1=rootV1(current),v2=rootV2(current),randomness=structuredClone(current.randomness),clock=structuredClone(current.clock);
  for(const old of [v1,v2]){const migrated=migrateGame(old)!;expect(migrated.version).toBe(3);expect(migrated.population!.cohorts).toEqual([]);expect(migrated.population!.coverage).toEqual([{countryId:'ca',status:'partial',source:LEGACY_POPULATION_SOURCE,areaPartitionId:null}]);expect(migrated.population!.memberships).toEqual([{personId:'person:1',countryId:'ca',areaId:null,origin:{kind:'legacy'}}]);expect(migrated.randomness).toEqual(randomness);expect(migrated.clock).toEqual(clock);expect(migrateGame(migrated)).toEqual(migrated);}
 });

 it('migrates multiple pre-Population Persons with unknown non-player country',()=>{
  const game=createGame('Legacy','Any','ca',21);game.people=allocatePerson(game.people!,{...playerInput,name:'Existing NPC'}).state;const migrated=migrateGame(rootV2(game))!;expect(migrated.population!.memberships).toEqual([{personId:'person:1',countryId:'ca',areaId:null,origin:{kind:'legacy'}},{personId:'person:2',countryId:null,areaId:null,origin:{kind:'legacy'}}]);expect(isGame(migrated)).toBe(true);
 });

 it('rejects root-v3 missing or invalid Population and unsupported future roots',()=>{
  const game=createGame('Canonical','Any','ca',22),missing=structuredClone(game) as unknown as Record<string,unknown>;delete missing.population;expect(parseGame(JSON.stringify(missing)).reason).toBe('invalid-state');expect(parseGame(JSON.stringify({...game,population:{}})).reason).toBe('invalid-state');expect(parseGame(JSON.stringify({...game,version:4})).reason).toBe('unsupported-version');
 });

 it('preserves exact root-v2 bytes once and blocks primary replacement if recovery fails',()=>{
  const old=rootV2(createGame('Recovery','Any','ca',23)),raw=JSON.stringify(old),migrated=migrateGame(old)!,storage=memoryStorage({[SAVE_KEY]:raw});expect(saveGame(storage,migrated)).toBeNull();expect(storage.data.get(PRE_POPULATION_SAVE_KEY)).toBe(raw);const first=storage.data.get(PRE_POPULATION_SAVE_KEY);expect(saveGame(storage,migrated)).toBeNull();expect(storage.data.get(PRE_POPULATION_SAVE_KEY)).toBe(first);expect(RECOVERY_SNAPSHOTS.some(item=>item.key===PRE_POPULATION_SAVE_KEY)).toBe(true);const recovered=loadRecoverySnapshot(storage,PRE_POPULATION_SAVE_KEY);expect(recovered.game?.version).toBe(3);expect(recovered.game?.population?.cohorts).toEqual([]);
  const blocked={getItem:(key:string)=>key===SAVE_KEY?raw:null,setItem:(key:string)=>{if(key===PRE_POPULATION_SAVE_KEY)throw Error('Quota');}};expect(saveGame(blocked,migrated)).toBeTruthy();expect(blocked.getItem(SAVE_KEY)).toBe(raw);
 });

 it('keeps low-level People allocation independent while requiring membership in canonical root v3',()=>{
  const game=createGame('Low level','Any','ca',24);game.people=allocatePerson(game.people!,{...playerInput,name:'Unaccounted'}).state;expect(isGame(game)).toBe(false);expect(serializeGame(game).ok).toBe(false);
 });

 it('keeps Population country-neutral and free of UI, specialist and host-random dependencies',()=>{
  const source=import.meta.glob<string>('./population.ts',{eager:true,query:'?raw',import:'default'})['./population.ts'];expect(source).not.toMatch(/Math\.random|Date\.now|randomUUID/);expect(source).not.toMatch(/from\s+['"][^'"]*(?:react|ui|politics|ukWorld|national)/);
  expect(createRandomness(1)).toEqual({version:1,rootSeed:1,streams:{}});
 });
});

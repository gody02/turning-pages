import {afterEach,describe,expect,it} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {ageOn} from '../../engine/core/clock';
import {createGeographyRuntime} from '../../engine/geography/runtime';
import {validPopulationGeography} from '../../engine/geography/population';
import {instantiateFromCohortWithContent} from '../../engine/human/content/integration';
import {instantiateInitialPlayerFromCohort} from '../../engine/human/initialPopulation';
import {deriveCountryPopulation,populationCohortId,type PopulationState} from '../../engine/human/population';
import {parseGame,serializeGame,upgradeGameToCurrent} from '../../engine/save';
import {deletePersistenceDatabase} from '../../persistence/indexedDb';
import {GamePersistence,type LegacyStorage} from '../../persistence/service';
import {createUkGeographicCandidatePopulationState,loadUkGeographicPopulationCandidate,UK_GEOGRAPHIC_POPULATION_FINGERPRINT,UK_GEOGRAPHIC_POPULATION_PARTITION_ID} from '../demography/uk/geographic-mid-2024/adapter';
import {createUkGeographyRegistry} from '../geography/uk/primary-local-admin-2024/adapter';
import {createUkHumanGenerationContentRegistry,UK_HUMAN_CONTENT_PACKAGE_ID,UK_HUMAN_CONTENT_PROFILE_ID} from '../human/uk/generation/adapter';
import {createUkMid2024Game,UK_COUNTRY_START_SCENARIO} from './countryStart';
import {createUkMid2024GeographicGame,selectUkMid2024GeographicPlayerCohort,UK_GEOGRAPHIC_COUNTRY_START_SCENARIO} from './countryStartGeographic';

const request=(mode:'childhood'|'adult'='adult',rootSeed=73)=>({version:1 as const,rootSeed,mode});
const legacy:LegacyStorage={getItem:()=>null,setItem:()=>{}};
const cleanups:Array<()=>Promise<void>>=[];
afterEach(async()=>{for(const cleanup of cleanups.splice(0))await cleanup();});

describe('geographically-aware UK country-start successor',()=>{
 it('pins a separate immutable dependency contract without changing v1',()=>{
  expect(UK_GEOGRAPHIC_COUNTRY_START_SCENARIO).toMatchObject({version:1,id:'country-start.uk.mid-2024-v2',countryId:'uk',simulationStartDate:{year:2024,month:6,day:30},populationPackageId:'uk.population.mid-2024.v3',populationFingerprint:UK_GEOGRAPHIC_POPULATION_FINGERPRINT,geographyPartitionId:UK_GEOGRAPHIC_POPULATION_PARTITION_ID,humanContentPackageId:UK_HUMAN_CONTENT_PACKAGE_ID,humanProfileId:UK_HUMAN_CONTENT_PROFILE_ID,selectionPolicy:'population-weighted-keyed-v1'});
  expect(Object.isFrozen(UK_GEOGRAPHIC_COUNTRY_START_SCENARIO)).toBe(true);expect(Object.isFrozen(UK_GEOGRAPHIC_COUNTRY_START_SCENARIO.starts)).toBe(true);
  expect(UK_COUNTRY_START_SCENARIO).toMatchObject({id:'country-start.uk.mid-2024-v1',populationPackageId:'uk.population.mid-2024.v2'});
  expect(loadUkGeographicPopulationCandidate()).toMatchObject({id:'uk.population.mid-2024.v3',fingerprint:UK_GEOGRAPHIC_POPULATION_FINGERPRINT,geographyPartitionId:UK_GEOGRAPHIC_POPULATION_PARTITION_ID});
 });

 it('creates exact childhood and adult starts by transferring person:1 from one geographic cohort',()=>{
  const runtime=createGeographyRuntime(createUkGeographyRegistry()),baseline=createUkGeographicCandidatePopulationState(),contentRegistry=createUkHumanGenerationContentRegistry();
  for(const [mode,age,birthYear] of [['childhood',0,2024],['adult',18,2006]] as const){
   const selected=selectUkMid2024GeographicPlayerCohort(73,mode),before=baseline.cohorts.find(item=>item.id===selected.id)!,game=createUkMid2024GeographicGame(request(mode)),person=game.people!.people[0],membership=game.population!.memberships[0],after=game.population!.cohorts.find(item=>item.id===selected.id);
   expect(game).toMatchObject({version:4,clock:{version:2,date:{year:2024,month:6,day:30}},people:{version:1,playerId:'person:1',nextSequence:2}});expect(game.people!.people).toHaveLength(1);expect(game.age).toBe(age);expect(ageOn(person.dateOfBirth,game.clock!.date)).toBe(age);expect(person).toMatchObject({id:'person:1',sequence:1,dateOfBirth:{year:birthYear,month:6,day:30},genderLabel:'Unspecified',traits:[],temperament:{},aptitudes:{}});
   expect(membership).toEqual({personId:'person:1',countryId:'uk',areaId:selected.areaId,origin:{kind:'cohort',cohortId:selected.id,requestKey:UK_GEOGRAPHIC_COUNTRY_START_SCENARIO.starts[mode].requestKey,requestIndex:0}});expect(after?.count??0).toBe(before.count-1);expect(game.population!.cohorts.length).toBe(baseline.cohorts.length-(before.count===1?1:0));const actualById=new Map(game.population!.cohorts.map(item=>[item.id,item]));for(const original of baseline.cohorts)if(original.id!==selected.id)expect(actualById.get(original.id),original.id).toEqual(original);
   expect(runtime.isPopulationAllocationCell(UK_GEOGRAPHIC_POPULATION_PARTITION_ID,membership.areaId!)).toBe(true);expect(runtime.getAncestors(UK_GEOGRAPHIC_POPULATION_PARTITION_ID,membership.areaId!).some(item=>item.placeId.startsWith('place.uk.constituent.'))).toBe(true);expect(validPopulationGeography(game.population,game.people,runtime)).toBe(true);
   expect(game.population!.cohorts.reduce((sum,item)=>sum+item.count,0)).toBe(69_281_436);expect(deriveCountryPopulation(game.population!,game.people!,'uk')).toEqual({knownLiving:69_281_437,complete:true});expect((person as unknown as Record<string,unknown>).residence).toBeUndefined();expect((person as unknown as Record<string,unknown>).presence).toBeUndefined();
   const retry=instantiateFromCohortWithContent({people:game.people!,population:game.population!,rootSeed:73,cohortId:selected.id,requestKey:UK_GEOGRAPHIC_COUNTRY_START_SCENARIO.starts[mode].requestKey,count:1,referenceDate:UK_GEOGRAPHIC_COUNTRY_START_SCENARIO.simulationStartDate,contentRegistry});expect(retry.reused).toBe(true);expect(retry.persons.map(item=>item.id)).toEqual(['person:1']);expect(retry.people).toEqual(game.people);expect(retry.population).toEqual(game.population);
  }
 },30_000);

 it('selects by exact represented cohort weights deterministically and varies across seeds',()=>{
  const pkg=loadUkGeographicPopulationCandidate(),selected=selectUkMid2024GeographicPlayerCohort(91,'adult'),repeat=selectUkMid2024GeographicPlayerCohort(91,'adult');expect(repeat).toEqual(selected);expect(pkg.cohorts).toContainEqual(selected);expect(selected).toMatchObject({countryId:'uk',birthYear:2006,generationProfileId:UK_HUMAN_CONTENT_PROFILE_ID});expect(selected.areaId).not.toBeNull();
  const areas=new Set(Array.from({length:48},(_,seed)=>selectUkMid2024GeographicPlayerCohort(seed,'adult').areaId));expect(areas.size).toBeGreaterThan(8);
 },30_000);

 it('applies identity overrides after selection without affecting geography, population, or keyed compatibility state',()=>{
  const generated=createUkMid2024GeographicGame(request()),overridden=createUkMid2024GeographicGame({...request(),identity:{name:'  Geographic Player  ',genderLabel:'Self-described'}});expect(overridden.name).toBe('Geographic Player');expect(overridden.gender).toBe('Self-described');expect(overridden.people!.people[0]).toMatchObject({name:'Geographic Player',genderLabel:'Self-described'});expect(overridden.population).toEqual(generated.population);expect(overridden.randomness).toEqual(generated.randomness);expect(overridden.ukWorld).toEqual(generated.ukWorld);expect(overridden.clock).toEqual(generated.clock);expect(()=>createUkMid2024GeographicGame({...request(),identity:{name:'x'.repeat(257)}})).toThrow();expect(createUkMid2024GeographicGame({...request(),identity:{name:'x'.repeat(256)}}).name).toHaveLength(256);
 },30_000);

 it('supports frozen special allocation cells without inventing residence or presence',()=>{
  const runtime=createGeographyRuntime(createUkGeographyRegistry()),areas=['place.uk.local-admin.e09000001','place.uk.local-admin.e06000053','place.uk.local-admin.s12000023','place.uk.local-admin.s12000027','place.uk.local-admin.s12000013','place.uk.local-admin.n09000003'];
  for(const areaId of areas){const cell={countryId:'uk',areaId,birthYear:2006,generationProfileId:UK_HUMAN_CONTENT_PROFILE_ID,count:1},population:PopulationState={version:1,coverage:[{countryId:'uk',status:'complete',source:'population.synthetic.geographic-start-v1',areaPartitionId:UK_GEOGRAPHIC_POPULATION_PARTITION_ID}],cohorts:[{id:populationCohortId(cell),...cell}],memberships:[]},result=instantiateInitialPlayerFromCohort({population,cohortId:population.cohorts[0].id,requestKey:`country-start.synthetic.${areaId}`,personInput:{name:'Synthetic Player',dateOfBirth:{year:2006,month:6,day:30},genderLabel:'Unspecified',lifeStatus:'living',traits:[],temperament:{},aptitudes:{}}});expect(result.population.cohorts).toEqual([]);expect(result.population.memberships[0].areaId).toBe(areaId);expect(runtime.isPopulationAllocationCell(UK_GEOGRAPHIC_POPULATION_PARTITION_ID,areaId)).toBe(true);expect(validPopulationGeography(result.population,result.people,runtime)).toBe(true);}
 });

 it('preserves exact decrement semantics for production high, low, oldest, and newest cohort cells',()=>{
  const cohorts=loadUkGeographicPopulationCandidate().cohorts,targets=[cohorts.reduce((a,b)=>a.count>b.count?a:b),cohorts.reduce((a,b)=>a.count<b.count?a:b),cohorts.find(item=>item.birthYear===1906)!,cohorts.find(item=>item.birthYear===2024)!];
  for(const [index,target] of targets.entries()){const population:PopulationState={version:1,coverage:[{countryId:'uk',status:'complete',source:'population.synthetic.edge-v1',areaPartitionId:UK_GEOGRAPHIC_POPULATION_PARTITION_ID}],cohorts:[target],memberships:[]},result=instantiateInitialPlayerFromCohort({population,cohortId:target.id,requestKey:`country-start.synthetic.edge-${index}-v1`,personInput:{name:'Edge Player',dateOfBirth:{year:target.birthYear,month:6,day:30},genderLabel:'Unspecified',lifeStatus:'living',traits:[],temperament:{},aptitudes:{}}}),remaining=result.population.cohorts.find(item=>item.id===target.id);expect(remaining?.count??0).toBe(target.count-1);expect(result.population.memberships[0]).toMatchObject({areaId:target.areaId,origin:{cohortId:target.id,requestIndex:0}});}
 });

 it('is deterministic, strict, and leaves the frozen v1 meaning intact',()=>{
  const game=createUkMid2024GeographicGame(request());expect(createUkMid2024GeographicGame(request())).toEqual(game);expect(createUkMid2024Game(request()).population!.coverage[0]).toMatchObject({source:'uk.population.mid-2024.v2',areaPartitionId:null});expect(createUkMid2024Game(request()).population!.memberships[0].areaId).toBeNull();expect(()=>createUkMid2024GeographicGame({...request(),rootSeed:-1})).toThrow();expect(()=>createUkMid2024GeographicGame({...request(),mode:'other' as 'adult'})).toThrow();expect(()=>createUkMid2024GeographicGame({...request(),extra:true} as never)).toThrow();expect(()=>createUkMid2024GeographicGame({...request(),identity:{genderLabel:'   '}})).toThrow();const raw=serializeGame(game);expect(raw.ok).toBe(true);if(raw.ok)expect(parseGame(raw.raw).game).toEqual(game);
 },30_000);

 it('round-trips through frozen persistence and continues at person:2',async()=>{
  const factory=new IDBFactory(),databaseName='geographic-country-start-v2',game=createUkMid2024GeographicGame(request('adult',2024)),first=await GamePersistence.open(legacy,factory,databaseName);expect(await first.save(game,null)).toBe(1);first.close();const second=await GamePersistence.open(legacy,factory,databaseName),loaded=await second.initialize();cleanups.push(async()=>{second.close();await deletePersistenceDatabase(factory,databaseName);});expect(loaded.game).toEqual(upgradeGameToCurrent(game));expect(loaded.game?.version).toBe(6);expect(loaded.revision).toBe(1);expect(loaded.game!.population!.coverage).toEqual([{countryId:'uk',status:'complete',source:'uk.population.mid-2024.v3',areaPartitionId:UK_GEOGRAPHIC_POPULATION_PARTITION_ID}]);expect(loaded.game!.population!.memberships[0]).toEqual(game.population!.memberships[0]);const cohort=loaded.game!.population!.cohorts.find(item=>item.birthYear===2000)!,next=instantiateFromCohortWithContent({people:loaded.game!.people!,population:loaded.game!.population!,rootSeed:2024,cohortId:cohort.id,requestKey:'country-start.uk.mid-2024-v2.continuation',count:1,referenceDate:UK_GEOGRAPHIC_COUNTRY_START_SCENARIO.simulationStartDate,contentRegistry:createUkHumanGenerationContentRegistry()});expect(next.persons[0].id).toBe('person:2');expect(next.population.memberships.at(-1)?.areaId).toBe(cohort.areaId);expect(deriveCountryPopulation(next.population,next.people,'uk')).toEqual({knownLiving:69_281_437,complete:true});
 },30_000);

 it('retains historical deterministic v2 and keeps New Game on the public v3 composition boundary',()=>{const sources=import.meta.glob<string>(['./countryStartGeographic.ts','../../ui/newGame.ts','../../ui/LifeApp.tsx'],{eager:true,query:'?raw',import:'default'}),successor=Object.entries(sources).find(([path])=>path.endsWith('/countryStartGeographic.ts'))![1],uiBoundary=Object.entries(sources).find(([path])=>path.endsWith('/newGame.ts'))![1],app=Object.entries(sources).find(([path])=>path.endsWith('/LifeApp.tsx'))![1];expect(successor).not.toMatch(/Math\.random|Date\.now|getRandomValues|\bnew Date\b/);expect(uiBoundary).toContain('PRODUCTION_UK_NEW_GAME_SCENARIO');expect(uiBoundary).toContain('bootstrap:createUkMid2024GeographicResidenceGame');expect(uiBoundary).not.toContain('bootstrap:createUkMid2024Game');expect(app).toContain('createProductionUkNewGame');expect(app).not.toContain('createUkMid2024GeographicGame');});
});

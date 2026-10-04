import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {setImmediate as yieldEventLoop} from 'node:timers/promises';
import {IDBFactory} from 'fake-indexeddb';
import {ageOn} from '../../../engine/core/clock';
import {validGameWithContent} from '../../../engine/gameContent';
import * as gameContent from '../../../engine/gameContent';
import {createGeographyRuntime} from '../../../engine/geography/runtime';
import {createSettlementRuntime} from '../../../engine/geography/settlements/runtime';
import {instantiateFromCohortWithContent} from '../../../engine/human/content/integration';
import {deriveCountryPopulation} from '../../../engine/human/population';
import * as residenceApi from '../../../engine/residence/state';
import * as placementApi from '../../../engine/residencePlacement/runtime';
import * as saveApi from '../../../engine/save';
import {isGame,parseGame,serializeGame} from '../../../engine/save';
import type {CurrentGame} from '../../../engine/types';
import {deletePersistenceDatabase} from '../../../persistence/indexedDb';
import {GamePersistence} from '../../../persistence/service';
import {createProductionUkNewGame,platformRootSeed} from '../../../ui/newGame';
import {createUkGeographyRegistry} from '../../geography/uk/primary-local-admin-2024/adapter';
import {createUkSettlementContentRegistry} from '../../geography/uk/settlementRegistry';
import {createUkHumanGenerationContentRegistry} from '../../human/uk/generation/adapter';
import {createUkInitialResidencePlacementRuntime} from '../../residence/uk/initial-mid-2024/adapter';
import * as policyApi from '../../residence/uk/placementRegistry';
import * as baseApi from '../../uk/countryStartGeographic';
// Internal synchronous oracle/failure injection; actual worker API tests live separately.
import {buildUkMid2024GeographicResidenceGame as createUkMid2024GeographicResidenceGame} from './countryStartResidenceConstruction';
import * as preparationApi from './countryStartResidencePreparation';
import {UK_RESIDENCE_COUNTRY_START_SCENARIO as scenario} from './countryStartResidenceScenario';
import {createUkCountryStartRegistry,resolveUkCountryStartScenario,validateUkCountryStartRegistry,ukCountryStartScenarioFingerprint} from './countryStartRegistry';
import baseline from '../../../../research/country-start-v3/baseline-results.json';

const request=(mode:'adult'|'childhood'='adult',rootSeed=73)=>({version:1 as const,rootSeed,mode});
const canonical=(game:CurrentGame)=>{const result=serializeGame(game);if(!result.ok)throw Error(result.error);return result.raw;};
const digest=(raw:string)=>createHash('sha256').update(raw).digest('hex');
let base:CurrentGame;
let context:ReturnType<typeof makeContext>;
function makeContext(){const geography=createGeographyRuntime(createUkGeographyRegistry()),settlements=createSettlementRuntime(createUkSettlementContentRegistry(),geography);return {geography,settlements};}
beforeAll(()=>{base=baseApi.createUkMid2024GeographicGame(request()) as CurrentGame;context=makeContext();},30_000);
// Large synchronous canonical fixtures must yield so Vitest's worker can service its RPC.
afterEach(async()=>{vi.restoreAllMocks();await yieldEventLoop();});

describe('Country Start UK mid-2024 v3 initial Residence orchestration',()=>{
 it('registers exact immutable v1/v2/v3 contracts without latest substitution',()=>{
  const registry=createUkCountryStartRegistry();
  expect(validateUkCountryStartRegistry(registry)).toBe(true);
  expect(registry.manifest.map(entry=>entry.status)).toEqual(['frozen-compatibility','frozen-production','frozen-explicit']);
  expect(resolveUkCountryStartScenario(registry,scenario.id)).toBe(scenario);
  expect(resolveUkCountryStartScenario(registry,'country-start.uk.mid-2024-v2')).toBe(baseApi.UK_GEOGRAPHIC_COUNTRY_START_SCENARIO);
  expect(resolveUkCountryStartScenario(registry,'country-start.uk.mid-2024-v1').populationPackageId).toBe('uk.population.mid-2024.v2');
  expect(()=>resolveUkCountryStartScenario(registry,'latest')).toThrow();
  expect(scenario).toMatchObject({id:'country-start.uk.mid-2024-v3',baseScenarioId:'country-start.uk.mid-2024-v2',
   populationPackageId:'uk.population.mid-2024.v3',geographyPartitionId:'geography.uk.primary-local-admin-2024-06-30-v1',
   settlementPackageId:'settlements.uk.hybrid-2024-06-30-v2',placementPolicyId:'residence-placement.uk.mid-2024-v1',
   humanContentPackageId:'human-content.uk.mid-2024-v1',humanProfileId:'human.uk.pending-mid-2024-v1'});
  expect(scenario.starts).toBe(baseApi.UK_GEOGRAPHIC_COUNTRY_START_SCENARIO.starts);
  expect(Object.isFrozen(scenario)).toBe(true);
  expect(ukCountryStartScenarioFingerprint(scenario)).toBe('fnv1a64-v1:321cc64911e88c5a');
  const changed=structuredClone(registry);(changed.scenarios[2] as {placementPolicyId:string}).placementPolicyId='residence-placement.uk.mid-2024-v2';
  expect(validateUkCountryStartRegistry(changed)).toBe(false);
  expect(()=>resolveUkCountryStartScenario(changed,scenario.id)).toThrow();
  const changedScenario=structuredClone(scenario);(changedScenario as {placementFingerprint:string}).placementFingerprint='fnv1a64-v1:0000000000000000';
  expect(ukCountryStartScenarioFingerprint(changedScenario)).not.toBe(ukCountryStartScenarioFingerprint(scenario));
 });

 it('rejects mixed, duplicate and noncanonical scenario/manifest registration',()=>{
  const registry=createUkCountryStartRegistry();
  for(const change of [
   (copy:any)=>copy.scenarios.reverse(),
   (copy:any)=>copy.scenarios.push(copy.scenarios[2]),
   (copy:any)=>copy.scenarios[2]=copy.scenarios[1],
   (copy:any)=>copy.manifest.reverse(),
   (copy:any)=>copy.manifest[2].fingerprint=copy.manifest[1].fingerprint,
   (copy:any)=>copy.scenarios[2].humanContentPackageId='human-content.uk.changed-v1',
  ]){const copy=structuredClone(registry);change(copy);expect(validateUkCountryStartRegistry(copy)).toBe(false);expect(()=>resolveUkCountryStartScenario(copy,scenario.id)).toThrow();}
 });

 it('rejects hostile registry structures predictably without reading accessors',()=>{
  const registry=createUkCountryStartRegistry(),getter=vi.fn(),accessor=Object.defineProperty({...registry},'version',{enumerable:true,get:getter});
  const sparse=structuredClone(registry);delete (sparse.scenarios as any[])[1];
  const hidden=Object.defineProperty({...registry},'hidden',{value:true});
  const symbol={...registry,[Symbol('hidden')]:true};
  const revoked=Proxy.revocable(registry,{});revoked.revoke();
  for(const input of [accessor,sparse,hidden,symbol,Object.assign(Object.create({}),registry),new Proxy(registry,{}),revoked.proxy]){
   expect(validateUkCountryStartRegistry(input)).toBe(false);expect(()=>resolveUkCountryStartScenario(input as never,scenario.id)).toThrow();
  }
  expect(getter).not.toHaveBeenCalled();
 });

 it('resolves canonical immutable content rather than a caller-owned alias',()=>{
  const copy=structuredClone(createUkCountryStartRegistry()),resolved=resolveUkCountryStartScenario(copy,scenario.id);
  expect(resolved).toBe(scenario);(copy.scenarios[2] as any).placementPolicyId='residence-placement.uk.changed-v1';
  expect(resolved).toMatchObject({placementPolicyId:'residence-placement.uk.mid-2024-v1'});expect(Object.isFrozen(resolved)).toBe(true);
  expect(validateUkCountryStartRegistry(copy)).toBe(false);
 });

 it.each(['childhood','adult'] as const)('preserves the pinned v2 %s root and adds exactly one ordinary Residence',mode=>{
  const old=baseApi.createUkMid2024GeographicGame(request(mode)) as CurrentGame,pinned=baseline.samples.find(item=>item.mode===mode)!;
  expect(digest(canonical(old))).toBe(pinned.sha256);
  expect(old.residence).toEqual(residenceApi.createEmptyResidenceState());
  const game=createUkMid2024GeographicResidenceGame(request(mode)),{residence,...rest}=game;
  expect({...rest,residence:residenceApi.createEmptyResidenceState()}).toEqual(old);
  expect(game.people).toMatchObject({playerId:'person:1',nextSequence:2});expect(game.people!.people).toHaveLength(1);
  const player=game.people!.people[0];
  expect(player).toMatchObject({id:'person:1',genderLabel:'Unspecified',lifeStatus:'living',traits:[],temperament:{},aptitudes:{},dateOfBirth:{year:mode==='adult'?2006:2024,month:6,day:30}});
  expect(game.clock!.date).toEqual({year:2024,month:6,day:30});expect(ageOn(player.dateOfBirth,game.clock!.date)).toBe(mode==='adult'?18:0);
  expect(residence).toMatchObject({version:1,nextSequence:2,occupants:[{personId:'person:1',residenceId:'residence:1'}],noFixedAbodePersonIds:[]});
  expect(residence.residences).toHaveLength(1);expect(residence.residences[0]).toMatchObject({id:'residence:1',sequence:1});
  expect(residence.residences[0].location.kind).not.toBe('country');
  expect(game.population!.memberships).toHaveLength(1);expect(game.population!.memberships[0].origin.kind).toBe('cohort');
  expect(game.population!.cohorts.reduce((sum,c)=>sum+c.count,0)).toBe(69_281_436);
  expect(deriveCountryPopulation(game.population!,game.people!,'uk')).toEqual({knownLiving:69_281_437,complete:true});
  expect(isGame(game)).toBe(true);expect(validGameWithContent(game,context)).toBe(true);
  expect(game.randomness).toEqual(old.randomness);expect(game.ukWorld).toEqual(old.ukWorld);
  expect(Buffer.byteLength(canonical(old),'utf8')).toBe(pinned.bytes);
 },30_000);

 it.each(['england','wales','ni','scottish-locality','scottish-admin','london','bradford','leeds','swansea'] as const)('preserves the frozen %s placement decision and exact scope',key=>{
  const fixture=baseline.fixtures[key],game=createUkMid2024GeographicResidenceGame(request('adult',fixture.seed)),location=game.residence.residences[0].location;
  expect(game.population!.memberships[0].areaId).toBe(fixture.area);expect(location).toEqual(fixture.location);
  if(location.kind==='country')throw Error('Unexpected country-only location');
  expect(location.administrativeArea.placeId).toBe(game.population!.memberships[0].areaId);
  if(key==='scottish-admin'){expect(location.kind).toBe('administrative-area');expect(location).not.toHaveProperty('settlement');}
  if(key==='london'&&location.kind==='settlement-area'){
   expect(location.settlement.settlementId).toBe('settlement.uk.reviewed.london');
   expect(context.settlements.getSettlementAdministrativeRelations(location.settlement.packageId,location.settlement.settlementId)
    .find(item=>item.placeId===fixture.area)?.relation).toBe('intersects');
  }
 },30_000);

 it('has identical canonical repeated output and ignores identity presentation in placement',()=>{
  const normal=createUkMid2024GeographicResidenceGame(request()),repeat=createUkMid2024GeographicResidenceGame(request()),
   renamed=createUkMid2024GeographicResidenceGame({...request(),identity:{name:'  Custom Name  '}}),
   gendered=createUkMid2024GeographicResidenceGame({...request(),identity:{genderLabel:'Self-described'}});
  expect(canonical(repeat)).toBe(canonical(normal));
  for(const overridden of [renamed,gendered]){expect(overridden.population).toEqual(normal.population);expect(overridden.residence).toEqual(normal.residence);expect(overridden.randomness).toEqual(normal.randomness);}
  expect(renamed.name).toBe('Custom Name');expect(gendered.gender).toBe('Self-described');
 },30_000);

 it('does not add mode, age or date to the placement key when both modes select the same area',()=>{
  const seed=baseline.fixtures['shared-mode-area'].seed,child=createUkMid2024GeographicResidenceGame(request('childhood',seed)),adult=createUkMid2024GeographicResidenceGame(request('adult',seed));
  expect(child.population!.memberships[0].areaId).toBe(adult.population!.memberships[0].areaId);expect(child.residence).toEqual(adult.residence);
  const runtime=createUkInitialResidencePlacementRuntime(context),scope={version:1 as const,partitionId:scenario.geographyPartitionId,placeId:child.population!.memberships[0].areaId!};
  const decision=runtime.evaluate({version:1,policyId:scenario.placementPolicyId,personId:'person:1',rootSeed:seed,scope});
  expect(child.residence.residences[0].location).toEqual(decision.location);
 },30_000);

 it('uses one existing platform seed draw at the submission boundary and none in the constructor',()=>{
  const entropy=vi.spyOn(globalThis.crypto,'getRandomValues').mockImplementation(array=>{(array as Uint32Array)[0]=73;return array;});
  const game=createProductionUkNewGame({mode:'adult',name:'',genderLabel:''},{rootSeed:platformRootSeed,bootstrap:createUkMid2024GeographicResidenceGame});
  expect(entropy).toHaveBeenCalledTimes(1);expect(game.version).toBe(4);expect(game.residence!.residences).toHaveLength(1);
  expect(()=>createProductionUkNewGame({mode:'adult',name:'x'.repeat(257),genderLabel:''},{rootSeed:platformRootSeed,bootstrap:createUkMid2024GeographicResidenceGame})).toThrow();
  expect(entropy).toHaveBeenCalledTimes(1);
 },30_000);

 it('rejects invalid and hostile requests without invoking v2 or platform entropy',()=>{
  const create=vi.spyOn(baseApi,'createUkMid2024GeographicGame'),getter=vi.fn(),accessor=Object.defineProperty({...request()},'rootSeed',{enumerable:true,get:getter});
  for(const input of [accessor,new Proxy(request(),{}),{...request(),identity:{name:{bad:true}}},{...request(),rootSeed:-1},{...request(),mode:'other'},{...request(),extra:true}]){
   expect(()=>createUkMid2024GeographicResidenceGame(input as never)).toThrow();
  }
  expect(getter).not.toHaveBeenCalled();
  // Descriptor/proxy preflight rejects before v2; ordinary request schema failures remain v2-owned.
  expect(create).toHaveBeenCalledTimes(4);
 });

 it('keeps the shared 256-code-point and trimmed identity validation without fallback',()=>{
  expect(createUkMid2024GeographicResidenceGame({...request(),identity:{name:'𐐀'.repeat(256)}}).name).toBe('𐐀'.repeat(256));
  for(const identity of [{name:'𐐀'.repeat(257)},{name:'   '},{genderLabel:'   '},{genderLabel:'x'.repeat(41)}])
   expect(()=>createUkMid2024GeographicResidenceGame({...request(),identity})).toThrow();
 },30_000);

 it('fails exact policy resolution, missing scope, invalid decision and final commit atomically',()=>{
  // Exercise cold registration failures through a fresh lifetime, independently of warmed content.
  vi.spyOn(preparationApi,'prepareUkCountryStartResidenceContent').mockImplementation(()=>preparationApi.createUkCountryStartResidencePreparer()());
  vi.spyOn(baseApi,'createUkMid2024GeographicGame').mockReturnValue(base);
  const before=canonical(base),policy=policyApi.resolveUkResidencePlacementContent(policyApi.createUkResidencePlacementContentRegistry(),scenario.placementPolicyId);
  const resolver=vi.spyOn(policyApi,'resolveUkResidencePlacementContent').mockImplementation(()=>{throw Error('Unavailable exact policy');});
  expect(()=>createUkMid2024GeographicResidenceGame(request())).toThrow('Unavailable exact policy');
  resolver.mockReturnValue({...policy,fingerprint:'fnv1a64-v1:0000000000000000'});
  expect(()=>createUkMid2024GeographicResidenceGame(request())).toThrow('fingerprint');
  resolver.mockReturnValue(policy);
  const runtime=placementApi.createResidencePlacementRuntime(policy,context),evaluation=vi.fn(()=>{throw Error('Unknown Residence placement scope.');}),
   prepare=vi.spyOn(placementApi,'createResidencePlacementRuntime').mockReturnValue({...runtime,evaluate:evaluation});
  expect(()=>createUkMid2024GeographicResidenceGame(request())).toThrow('scope');
  const actual=runtime.evaluate({version:1,policyId:scenario.placementPolicyId,personId:'person:1',rootSeed:73,scope:{version:1,partitionId:scenario.geographyPartitionId,placeId:base.population!.memberships[0].areaId!}});
  prepare.mockReturnValue({...runtime,evaluate:()=>({...actual,location:{kind:'administrative-area',administrativeArea:{version:1,partitionId:scenario.geographyPartitionId,placeId:'place.uk.local-admin.e09000001'}}})});
  expect(()=>createUkMid2024GeographicResidenceGame(request())).toThrow('scope');
  prepare.mockReturnValue({...runtime,evaluate:()=>({...actual,location:{kind:'settlement-area',administrativeArea:actual.location.administrativeArea,settlement:{version:1,packageId:scenario.settlementPackageId,settlementId:'settlement.uk.missing'}}})});
  expect(()=>createUkMid2024GeographicResidenceGame(request())).toThrow('Residence location');
  prepare.mockRestore();
  const establish=vi.spyOn(residenceApi,'establishResidence').mockImplementation(()=>{throw Error('Injected Residence command failure');});
  expect(()=>createUkMid2024GeographicResidenceGame(request())).toThrow('command failure');
  establish.mockRestore();
  const validation=vi.spyOn(gameContent,'validGameWithContent').mockReturnValueOnce(true).mockReturnValue(false);
  expect(()=>createUkMid2024GeographicResidenceGame(request())).toThrow('root/content');
  validation.mockRestore();
  const commit=vi.spyOn(saveApi,'serializeGame').mockReturnValue({ok:false,reason:'invalid-state',error:'Injected canonical failure'});
  expect(()=>createUkMid2024GeographicResidenceGame(request())).toThrow('canonical');
  commit.mockRestore();expect(canonical(base)).toBe(before);expect(base.residence.nextSequence).toBe(1);expect(base.people!.nextSequence).toBe(2);
 },30_000);

 it('rejects incompatible base-world/membership/root state without repairing it',()=>{
  const construct=vi.spyOn(baseApi,'createUkMid2024GeographicGame');
  for(const altered of [
   {...base,people:{...base.people!,nextSequence:3}},
   {...base,population:{...base.population!,memberships:[]}},
   {...base,population:{...base.population!,memberships:[{...base.population!.memberships[0],areaId:null}]}},
   {...base,population:{...base.population!,coverage:[{...base.population!.coverage[0],source:'uk.population.mid-2024.v2'}]}},
   {...base,residence:{...base.residence,nextSequence:2}},
  ]){construct.mockReturnValue(altered);const before=JSON.stringify(altered);expect(()=>createUkMid2024GeographicResidenceGame(request())).toThrow();expect(JSON.stringify(altered)).toBe(before);}
  construct.mockReturnValue(base);
  vi.spyOn(gameContent,'validGameWithContent').mockReturnValue(false);
  expect(()=>createUkMid2024GeographicResidenceGame(request())).toThrow('content-bound');
 },30_000);

 it('propagates v2 construction/generation failure without returning an empty-Residence fallback',()=>{
  vi.spyOn(baseApi,'createUkMid2024GeographicGame').mockImplementation(()=>{throw Error('Injected base generation failure');});
  expect(()=>createUkMid2024GeographicResidenceGame(request())).toThrow('base generation failure');
 });

 it('preserves normal Person and Residence allocator continuation after canonical save/load and IDB reopen',async()=>{
  const game=createUkMid2024GeographicResidenceGame(request('adult',2024)),raw=canonical(game),parsed=parseGame(raw).game;
  expect(parsed).toEqual(game);expect(raw).not.toContain('country-start.uk.mid-2024-v3');expect(raw).not.toContain('residence-placement.uk.mid-2024-v1');
  const factory=new IDBFactory(),name='country-start-residence-v3',legacy={getItem:()=>null,setItem:()=>{}},first=await GamePersistence.open(legacy,factory,name);
  let second:GamePersistence|undefined;
  try{
   expect(await first.save(game,null)).toBe(1);first.close();second=await GamePersistence.open(legacy,factory,name);
   const loaded=(await second.initialize()).game as CurrentGame;expect(loaded).toEqual(game);expect(validGameWithContent(loaded,context)).toBe(true);
   const cohort=loaded.population!.cohorts.find(item=>item.birthYear===2000)!;
   const next=instantiateFromCohortWithContent({people:loaded.people!,population:loaded.population!,rootSeed:2024,cohortId:cohort.id,requestKey:'country-start.uk.mid-2024-v3.test-continuation',count:1,referenceDate:scenario.simulationStartDate,contentRegistry:createUkHumanGenerationContentRegistry()});
   expect(next.persons[0].id).toBe('person:2');expect(deriveCountryPopulation(next.population,next.people,'uk').knownLiving).toBe(69_281_437);
   const residence=residenceApi.establishResidence(loaded.residence,['person:2'],loaded.residence.residences[0].location,{...context,people:next.people});
   expect(residence.residence.id).toBe('residence:2');expect(residence.state.nextSequence).toBe(3);
   expect(loaded.residence.residences).toHaveLength(1);expect(loaded.people!.nextSequence).toBe(2);
  }finally{first.close();second?.close();await deletePersistenceDatabase(factory,name);}
 },30_000);

 it('pins New Game to the public async v3 host and keeps frozen lower domains free of reverse imports or policy rules',()=>{
  const sources=import.meta.glob<string>(['./countryStartResidence.ts','../../../ui/newGame.ts','../../../engine/residence/*.ts','../../../engine/residencePlacement/*.ts'],{eager:true,query:'?raw',import:'default'});
  const constructor=sources['./countryStartResidence.ts'],ui=sources['../../../ui/newGame.ts'];
  expect(ui).toContain('bootstrap:createUkMid2024GeographicResidenceGame');expect(ui).toContain("from '../data/countryStart/uk/countryStartResidence'");expect(ui).toContain("PRODUCTION_UK_NEW_GAME_SCENARIO='country-start.uk.mid-2024-v3'");
  expect(constructor).not.toMatch(/Math\.random|Date\.now|getRandomValues|\bnew Date\b|Bradford|London|Scottish|England|kindMass|candidateIndexForTicket/);
  for(const [path,source] of Object.entries(sources))if(path.startsWith('../../../engine/')&&!path.endsWith('.test.ts'))expect(source).not.toContain('countryStartResidence');
 });
});

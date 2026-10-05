import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {createProductionUkNewGame,PRODUCTION_UK_NEW_GAME_SCENARIO} from './newGame';
import {createNewGameSubmission} from './newGameSubmission';
import {acceptApplicationGame} from './gameContent';
import {createUkMid2024GeographicResidenceGame,disposeUkCountryStartStartup} from '../data/countryStart/uk/countryStartResidence';
import {createUkGeographyRegistry} from '../data/geography/uk/primary-local-admin-2024/adapter';
import {createUkSettlementContentRegistry} from '../data/geography/uk/settlementRegistry';
import {createGeographyRuntime} from '../engine/geography/runtime';
import {createSettlementRuntime} from '../engine/geography/settlements/runtime';
import {upgradeGameToCurrent,serializeGame,serializeCurrentGame} from '../engine/save';
import type {CurrentAuthoritativeGame,GameV4} from '../engine/types';
import {deriveCountryPopulation} from '../engine/human/population';
import {createHousehold} from '../engine/household/state';
import {GamePersistence} from '../persistence/service';
import {verifyRecord} from '../persistence/payload';
import {deletePersistenceDatabase} from '../persistence/indexedDb';

let content:Parameters<typeof acceptApplicationGame>[1];
beforeAll(()=>{const geography=createGeographyRuntime(createUkGeographyRegistry());content={geography,settlements:createSettlementRuntime(createUkSettlementContentRegistry(),geography)};},30_000);
afterAll(()=>disposeUkCountryStartStartup());
describe('production post-Country-Start root upgrade boundary',()=>{
 for(const mode of ['childhood','adult'] as const)it(`commits and activates only current6 after exact frozen ${mode} construction`,async()=>{
  const factory=new IDBFactory(),name=`production-current-root-${mode}`,legacy={getItem:()=>null,setItem:()=>{}},service=await GamePersistence.open(legacy,factory,name);
  const order:string[]=[],rootSeed=vi.fn(()=>73);let constructed:GameV4|undefined,active:CurrentAuthoritativeGame|undefined;
  const bootstrap=vi.fn(async request=>{const game=await createUkMid2024GeographicResidenceGame(request);constructed=game;order.push(`constructed:${game.version}`);return game;});
  const controller=createNewGameSubmission<CurrentAuthoritativeGame>({phase:()=>{},cancelConstruction:disposeUkCountryStartStartup});
  try{
   const success=await controller.run(async signal=>{
    const game=await createProductionUkNewGame({mode,name:'',genderLabel:''},{rootSeed,bootstrap},{signal});
    expect(game.version).toBe(4);expect(active).toBeUndefined();const current=upgradeGameToCurrent(game);if(!current)throw Error('Current-root upgrade failed');return current;
   },async current=>{order.push(`prepared:${current.version}`);expect(active).toBeUndefined();await acceptApplicationGame(current,content);},async current=>{
    order.push(`saved:${current.version}`);expect(active).toBeUndefined();expect(await service.repository.getRecord('primary')).toBeUndefined();await service.save(current,null);
    const stored=await verifyRecord(await service.repository.getRecord('primary'),'primary');expect(stored.record.declaredRootVersion).toBe(6);expect(JSON.parse(stored.raw).version).toBe(6);expect(stored.result.game).toEqual(current);expect(active).toBeUndefined();
   },current=>{order.push(`activated:${current.version}`);active=current;});
   expect(success).toBe(true);expect(order).toEqual(['constructed:4','prepared:6','saved:6','activated:6']);expect(rootSeed).toHaveBeenCalledTimes(1);expect(bootstrap).toHaveBeenCalledTimes(1);expect(PRODUCTION_UK_NEW_GAME_SCENARIO).toBe('country-start.uk.mid-2024-v3');
   if(!active||!constructed)throw Error('Expected complete active/current and historical candidates');
   expect(active.household).toEqual({version:1,nextSequence:1,households:[],memberships:[]});expect(active.people.playerId).toBe('person:1');expect(active.people.nextSequence).toBe(2);expect(active.residence.nextSequence).toBe(2);expect(active.residence.residences).toHaveLength(1);
   expect(deriveCountryPopulation(active.population,active.people,'uk').knownLiving).toBe(69_281_437);expect(active.age).toBe(mode==='adult'?18:0);expect(active.randomness).toEqual(constructed.randomness);
   const {household,kinship,...rest}=active;expect(kinship).toEqual({version:1,parentages:[]});expect(serializeGame({...rest,version:4})).toEqual(serializeGame(constructed));expect(household.memberships).toHaveLength(0);
   service.close();const reopened=await GamePersistence.open(legacy,factory,name);try{const loaded=(await reopened.initialize()).game;expect(loaded).toEqual(active);expect(serializeCurrentGame(loaded)).toEqual(serializeCurrentGame(active));expect(createHousehold(active.household,['person:1'],{people:active.people}).household.id).toBe('household:1');}finally{reopened.close();}
  }finally{service.close();await deletePersistenceDatabase(factory,name);}
 },30_000);
 it('never prepares, saves or activates a failed upgrade and leaves its prior current Game unchanged',async()=>{
  const prepare=vi.fn(),save=vi.fn(),activate=vi.fn(),controller=createNewGameSubmission<CurrentAuthoritativeGame>({phase:()=>{},cancelConstruction:()=>{}});
  await expect(controller.run(async()=>{const current=upgradeGameToCurrent({version:4});if(!current)throw Error('Upgrade failed');return current;},prepare,save,activate)).rejects.toThrow('Upgrade failed');
  expect(prepare).not.toHaveBeenCalled();expect(save).not.toHaveBeenCalled();expect(activate).not.toHaveBeenCalled();expect(controller.busy()).toBe(false);
 });
});

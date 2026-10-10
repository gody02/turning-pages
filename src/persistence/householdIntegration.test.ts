import {afterEach,describe,expect,it} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {createGame} from '../engine/simulation';
import {parseCurrentGame,PRE_HOUSEHOLD_SAVE_KEY,PRE_RESIDENCE_SAVE_KEY,serializeCurrentGame,serializeGame,upgradeGameToCurrent,SAVE_KEY} from '../engine/save';
import {createHousehold} from '../engine/household/state';
import {syntheticHouseholdGame} from '../engine/testing/householdRootFixture';
import {syntheticResidenceGame} from '../engine/testing/residenceFixture';
import {GamePersistence,exportCanonicalGame,importCanonicalGame,type LegacyStorage} from './service';
import {deletePersistenceDatabase,IndexedDbSaveRepository,PERSISTENCE_DATABASE_VERSION} from './indexedDb';
import {PRIMARY_SLOT,PREVIOUS_SLOT} from './record';
import {recordFromRaw,verifyRecord,sha256Text} from './payload';

const factory=new IDBFactory(),empty:LegacyStorage={getItem:()=>null,setItem:()=>{}},connections:GamePersistence[]=[],names:string[]=[];let sequence=0;
const name=()=>{const value=`household-root5-${++sequence}`;names.push(value);return value;};
async function open(database=name(),legacy=empty){const service=await GamePersistence.open(legacy,factory,database);connections.push(service);return service;}
afterEach(async()=>{connections.splice(0).forEach(service=>service.close());for(const database of names.splice(0))await deletePersistenceDatabase(factory,database);});
describe('current root5 persistence with frozen authority',()=>{
 it('loads historical4 in memory and snapshots its exact original bytes only on first upgraded save',async()=>{
  const old=serializeGame(syntheticResidenceGame());if(!old.ok)throw Error(old.error);
  const service=await open();await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',old.raw),null);
  const loaded=await service.initialize();expect(loaded.game).toEqual(upgradeGameToCurrent(old.game));
  const primary=await verifyRecord(await service.repository.getRecord(PRIMARY_SLOT),PRIMARY_SLOT);expect(primary.raw).toBe(old.raw);expect(primary.record.declaredRootVersion).toBe(4);
  const slot=`recovery:${PRE_HOUSEHOLD_SAVE_KEY}`;expect(await service.repository.getRecord(slot)).toBeUndefined();
  expect(await service.save(loaded.game!,1)).toBe(2);
  const recovery=await verifyRecord(await service.repository.getRecord(slot),slot),previous=await verifyRecord(await service.repository.getRecord(PREVIOUS_SLOT),PREVIOUS_SLOT);
  expect(recovery.raw).toBe(old.raw);expect(recovery.record.sha256).toBe(await sha256Text(old.raw));expect(previous.raw).toBe(old.raw);expect(previous.record.declaredRootVersion).toBe(4);
  await service.save({...loaded.game!,money:123},2);expect((await verifyRecord(await service.repository.getRecord(slot),slot)).raw).toBe(old.raw);
  expect((await verifyRecord(await service.repository.getRecord(PRIMARY_SLOT),PRIMARY_SLOT)).record.declaredRootVersion).toBe(7);
  expect(PERSISTENCE_DATABASE_VERSION).toBe(1);
 });
 it('preserves both pre-Residence and pre-Household checkpoints from the same actual root3 bytes',async()=>{
  const old=createGame('Before both','Unspecified','ca',63),raw=JSON.stringify(old),service=await open();
  await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',raw),null);
  const current=(await service.initialize()).game!;expect(current.version).toBe(7);await service.save(current,1);
  for(const key of [PRE_RESIDENCE_SAVE_KEY,PRE_HOUSEHOLD_SAVE_KEY]){const slot=`recovery:${key}`,record=await verifyRecord(await service.repository.getRecord(slot),slot);expect(record.raw).toBe(raw);expect(record.record.declaredRootVersion).toBe(3);expect(record.result.game).toEqual(current);}
  expect((await verifyRecord(await service.repository.getRecord(PREVIOUS_SLOT),PREVIOUS_SLOT)).raw).toBe(raw);
 });
 it('aborts recovery and replacement atomically and consumes no revision on failure',async()=>{
  const database=name();let fail=false;
  const repository=await IndexedDbSaveRepository.open(factory,database,{afterWrites:transaction=>{if(fail)transaction.abort();}});
  // Test-only constructor injection; no application persistence API change.
  const service=Reflect.construct(GamePersistence,[repository,empty]) as GamePersistence;connections.push(service);
  const old=serializeGame(syntheticResidenceGame());if(!old.ok)throw Error(old.error);
  await repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',old.raw),null);fail=true;
  await expect(service.save(upgradeGameToCurrent(old.game)!,1)).rejects.toThrow();
  const retained=await verifyRecord(await repository.getRecord(PRIMARY_SLOT),PRIMARY_SLOT);expect(retained.raw).toBe(old.raw);expect(retained.record.revision).toBe(1);
  expect(await repository.getRecord(`recovery:${PRE_HOUSEHOLD_SAVE_KEY}`)).toBeUndefined();expect(await repository.getRecord(PREVIOUS_SLOT)).toBeUndefined();
  fail=false;expect(await service.save(upgradeGameToCurrent(old.game)!,1)).toBe(2);
 });
 it('round-trips empty and populated5 through close/reopen, exports and imports, preserving allocator continuation',async()=>{
  for(const game of [upgradeGameToCurrent(syntheticResidenceGame())!,syntheticHouseholdGame()]){
   const database=name(),service=await open(database),canonical=serializeCurrentGame(game);if(!canonical.ok)throw Error(canonical.error);
   await service.save(game,null);service.close();const reopened=await open(database),loaded=(await reopened.initialize()).game;
   if(!loaded||loaded.version!==7)throw Error('Wrong current schema');
   expect(loaded).toEqual(canonical.game);expect(loaded.household).toEqual(game.household);expect(exportCanonicalGame(loaded)).toBe(canonical.raw);expect(importCanonicalGame(canonical.raw)).toEqual(loaded);
   const next=createHousehold(loaded.household,['person:4'],{people:loaded.people});expect(next.household.id).toBe(`household:${game.household.nextSequence}`);expect(loaded.household).toEqual(game.household);
   const verified=await verifyRecord(await reopened.repository.getRecord(PRIMARY_SLOT),PRIMARY_SLOT);expect(verified.raw).toBe(canonical.raw);expect(verified.record.sha256).toBe(await sha256Text(canonical.raw));
  }
 });
 it('does not discard invalid5 Household or silently elect a valid previous candidate',async()=>{
  const game=syntheticHouseholdGame(),service=await open(),old=serializeGame(syntheticResidenceGame());if(!old.ok)throw Error(old.error);
  await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',old.raw),null);
  const raw=JSON.stringify({...game,household:{...game.household,memberships:[{personId:'person:999',householdId:'household:1'}]}});
  await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',2,'canonical-game',raw),1);
  expect(parseCurrentGame(raw).game).toBeNull();const result=await service.initialize();expect(result.status).toBe('recovery-required');expect(result.game).toBeNull();expect(result.recoveries.some(item=>item.slotId===PREVIOUS_SLOT&&item.game.version===7)).toBe(true);
  const retained=await service.repository.getRecord(PRIMARY_SLOT) as {payload:ArrayBuffer;revision:number};expect(new TextDecoder().decode(retained.payload)).toBe(raw);expect(retained.revision).toBe(2);
 });
 it('keeps exact-byte legacy migration recovery and adds no inferred membership',async()=>{
  const old=createGame('Legacy source','Unspecified','ca',64),raw=`  ${JSON.stringify(old,null,2)}\n`,data=new Map([[SAVE_KEY,raw]]),legacy:LegacyStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},service=await open(name(),legacy);
  const loaded=await service.initialize();expect(loaded.game?.version).toBe(7);expect(loaded.game?.household?.memberships).toHaveLength(0);expect(data.get(SAVE_KEY)).toBe(raw);
  for(const key of [PRE_RESIDENCE_SAVE_KEY,PRE_HOUSEHOLD_SAVE_KEY]){const slot=`recovery:${key}`;expect((await verifyRecord(await service.repository.getRecord(slot),slot)).raw).toBe(raw);}
 });
});

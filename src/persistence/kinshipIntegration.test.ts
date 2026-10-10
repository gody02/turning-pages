import {afterEach,describe,expect,it} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import legacyV1 from '../engine/fixtures/life-v1.json';
import {PRE_KINSHIP_SAVE_KEY,PRE_HOUSEHOLD_SAVE_KEY,PRE_RESIDENCE_SAVE_KEY,SAVE_KEY,serializeGame,serializeGameV5,serializeCurrentGame,upgradeGameToCurrent} from '../engine/save';
import {syntheticHouseholdGame} from '../engine/testing/householdRootFixture';
import {syntheticResidenceGame} from '../engine/testing/residenceFixture';
import {syntheticKinshipGame} from '../engine/testing/kinshipRootFixture';
import {addParentageBasis} from '../engine/kinship/state';
import {GamePersistence,exportCanonicalGame,importCanonicalGame,type LegacyStorage} from './service';
import {IndexedDbSaveRepository,deletePersistenceDatabase,PERSISTENCE_DATABASE_VERSION} from './indexedDb';
import {PRIMARY_SLOT,PREVIOUS_SLOT,PERSISTENCE_VERSION} from './record';
import {recordFromRaw,sha256Text,verifyRecord} from './payload';

const factory=new IDBFactory(),empty:LegacyStorage={getItem:()=>null,setItem:()=>{}},connections:GamePersistence[]=[],names:string[]=[];let sequence=0;
const name=()=>{const result=`kinship-root6-${++sequence}`;names.push(result);return result;};
async function open(database=name(),legacy=empty){const service=await GamePersistence.open(legacy,factory,database);connections.push(service);return service;}
afterEach(async()=>{for(const connection of connections.splice(0))connection.close();for(const database of names.splice(0))await deletePersistenceDatabase(factory,database);});
describe('Game root6 through frozen persistence authority',()=>{
 it('opens exact populated5 without rewriting, then atomically preserves before-Kinship bytes on first6 write',async()=>{
  const source=syntheticHouseholdGame(),old=serializeGameV5(source);if(!old.ok)throw Error(old.error);const service=await open();
  await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',old.raw),null);
  const loaded=await service.initialize();expect(loaded.game).toEqual({...source,version:7,kinship:{version:1,parentages:[]},partnership:{version:1,partnerships:[]},formalUnion:{version:1,nextSequence:1,unions:[]}});expect(loaded.revision).toBe(1);expect(loaded.game?.household).toEqual(source.household);
  const slot=`recovery:${PRE_KINSHIP_SAVE_KEY}`;expect(await service.repository.getRecord(slot)).toBeUndefined();const initial=await verifyRecord(await service.repository.getRecord(PRIMARY_SLOT),PRIMARY_SLOT);expect(initial.raw).toBe(old.raw);expect(initial.record.declaredRootVersion).toBe(5);
  expect(await service.save(loaded.game!,1)).toBe(2);const recovery=await verifyRecord(await service.repository.getRecord(slot),slot),previous=await verifyRecord(await service.repository.getRecord(PREVIOUS_SLOT),PREVIOUS_SLOT);
  expect(recovery.raw).toBe(old.raw);expect(recovery.record.sha256).toBe(await sha256Text(old.raw));expect(previous.raw).toBe(old.raw);expect(previous.record.declaredRootVersion).toBe(5);
  expect(await service.repository.getRecord(`recovery:${PRE_HOUSEHOLD_SAVE_KEY}`)).toBeUndefined();
  await service.save({...loaded.game!,money:77},2);expect((await verifyRecord(await service.repository.getRecord(slot),slot)).raw).toBe(old.raw);
  expect((await verifyRecord(await service.repository.getRecord(PRIMARY_SLOT),PRIMARY_SLOT)).record.declaredRootVersion).toBe(7);expect(PERSISTENCE_DATABASE_VERSION).toBe(1);expect(PERSISTENCE_VERSION).toBe(1);
 });
 it('preserves the actual root4 bytes for both crossings rather than synthesizing intermediate5',async()=>{
  const old=serializeGame(syntheticResidenceGame());if(!old.ok)throw Error(old.error);const service=await open();await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',old.raw),null);
  const current=(await service.initialize()).game;if(current?.version!==7)throw Error('Expected current6');expect(current.version).toBe(7);expect(current.household.nextSequence).toBe(1);expect(current.kinship).toEqual({version:1,parentages:[]});await service.save(current,1);
  for(const key of [PRE_HOUSEHOLD_SAVE_KEY,PRE_KINSHIP_SAVE_KEY]){const slot=`recovery:${key}`,saved=await verifyRecord(await service.repository.getRecord(slot),slot);expect(saved.raw).toBe(old.raw);expect(saved.record.declaredRootVersion).toBe(4);}
 });
 it('preserves exact formatted legacy bytes across the complete older migration chain',async()=>{
  const raw=`  ${JSON.stringify(legacyV1,null,2)}\n`,data=new Map([[SAVE_KEY,raw]]),legacy:LegacyStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},service=await open(name(),legacy);
  const loaded=await service.initialize();if(loaded.game?.version!==7)throw Error('Expected current6');expect(loaded.game.version).toBe(7);expect(loaded.game.kinship).toEqual({version:1,parentages:[]});expect(data.get(SAVE_KEY)).toBe(raw);
  for(const key of [PRE_RESIDENCE_SAVE_KEY,PRE_HOUSEHOLD_SAVE_KEY,PRE_KINSHIP_SAVE_KEY]){const slot=`recovery:${key}`,snapshot=await verifyRecord(await service.repository.getRecord(slot),slot);expect(snapshot.raw).toBe(raw);expect(snapshot.record.sha256).toBe(await sha256Text(raw));}
 });
 it('keeps older primary authoritative over newer populated6 previous and never uses schema as priority',async()=>{
  const service=await open(),current=serializeCurrentGame(syntheticKinshipGame()),old=serializeGameV5({...syntheticHouseholdGame(),money:42});if(!current.ok||!old.ok)throw Error('Fixture');
  await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',current.raw),null);
  await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',2,'canonical-game',old.raw),1);
  const result=await service.initialize();if(result.game?.version!==7)throw Error('Expected current6');expect(result.status).toBe('loaded');expect(result.game.money).toBe(42);expect(result.game.kinship.parentages).toHaveLength(0);expect(result.revision).toBe(2);
  expect(result.recoveries.find(item=>item.slotId===PREVIOUS_SLOT)?.game).toEqual(current.game);expect((await verifyRecord(await service.repository.getRecord(PRIMARY_SLOT),PRIMARY_SLOT)).raw).toBe(old.raw);
 });
 it('refuses corrupt current6 rather than erasing Kinship or silently activating previous',async()=>{
  const service=await open(),good=serializeCurrentGame(syntheticKinshipGame());if(!good.ok)throw Error(good.error);await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',good.raw),null);
  const raw=JSON.stringify({...good.game,kinship:{version:1,parentages:[{parentId:'person:1',childId:'person:1',bases:['legal']}]}});
  await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',2,'canonical-game',raw),1);
  const result=await service.initialize();expect(result.status).toBe('recovery-required');expect(result.game).toBeNull();expect(result.recoveries.find(item=>item.slotId===PREVIOUS_SLOT)?.game).toEqual(good.game);
  const retained=await service.repository.getRecord(PRIMARY_SLOT) as {payload:ArrayBuffer;revision:number};expect(new TextDecoder().decode(retained.payload)).toBe(raw);expect(retained.revision).toBe(2);
 });
 it('aborts required recovery, previous rotation and replacement together with no consumed revision',async()=>{
  const database=name();let fail=false;const repository=await IndexedDbSaveRepository.open(factory,database,{afterWrites:tx=>{if(fail)tx.abort();}}),service=Reflect.construct(GamePersistence,[repository,empty]) as GamePersistence;connections.push(service);
  const old=serializeGameV5(syntheticHouseholdGame());if(!old.ok)throw Error(old.error);await repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',old.raw),null);fail=true;
  await expect(service.save(upgradeGameToCurrent(old.game)!,1)).rejects.toThrow();expect((await verifyRecord(await repository.getRecord(PRIMARY_SLOT),PRIMARY_SLOT)).raw).toBe(old.raw);expect(await repository.getRecord(PREVIOUS_SLOT)).toBeUndefined();expect(await repository.getRecord(`recovery:${PRE_KINSHIP_SAVE_KEY}`)).toBeUndefined();
  fail=false;expect(await service.save(upgradeGameToCurrent(old.game)!,1)).toBe(2);await expect(service.save(upgradeGameToCurrent(old.game)!,1)).rejects.toThrow();expect((await verifyRecord(await repository.getRecord(PRIMARY_SLOT),PRIMARY_SLOT)).record.revision).toBe(2);
 });
 it('never overwrites an existing before-Kinship snapshot',async()=>{
  const service=await open(),old=serializeGameV5(syntheticHouseholdGame());if(!old.ok)throw Error(old.error);const slot=`recovery:${PRE_KINSHIP_SAVE_KEY}`,original=` ${old.raw}\n`;
  await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',old.raw),null,[await recordFromRaw(slot,'recovery',null,'legacy-exact-bytes',original)]);
  await service.save(upgradeGameToCurrent(old.game)!,1);expect((await verifyRecord(await service.repository.getRecord(slot),slot)).raw).toBe(original);
 });
 it.each(['empty','populated'] as const)('preserves %s6 across close/reopen, import/export and pair/basis continuation',async kind=>{
  const game=kind==='populated'?upgradeGameToCurrent(syntheticKinshipGame())!:upgradeGameToCurrent(syntheticHouseholdGame())!,database=name(),service=await open(database),canonical=serializeCurrentGame(game);if(!canonical.ok)throw Error(canonical.error);
  await service.save(game,null);service.close();const reopened=await open(database),loaded=(await reopened.initialize()).game;if(loaded?.version!==7)throw Error('Not current6');
  expect(loaded).toEqual(game);expect(loaded.kinship).toEqual(game.kinship);expect(exportCanonicalGame(loaded)).toBe(canonical.raw);expect(importCanonicalGame(canonical.raw)).toEqual(loaded);
  const kinship=addParentageBasis(loaded.kinship,'person:1','person:3','legal',{people:loaded.people}),continued={...loaded,kinship};await reopened.save(continued,1);expect((await reopened.initialize()).game).toEqual(continued);expect(game.kinship).toEqual(canonical.game.kinship);
  expect((await verifyRecord(await reopened.repository.getRecord(PRIMARY_SLOT),PRIMARY_SLOT)).record.sha256).toBe(await sha256Text(exportCanonicalGame(continued)));
 });
});

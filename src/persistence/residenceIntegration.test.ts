import {afterEach,describe,expect,it} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {createGame} from '../engine/simulation';
import {isCanonicalGamePayload,migrateGame,PRE_RESIDENCE_SAVE_KEY,serializeGame,upgradeGameToCurrent} from '../engine/save';
import {context,syntheticResidenceGame} from '../engine/testing/residenceFixture';
import {validGameWithContent} from '../engine/gameContent';
import {recordNoFixedAbode,removePersonFromResidences} from '../engine/residence/state';
import type {CurrentGame,Game} from '../engine/types';
import {GamePersistence,exportCanonicalGame,importCanonicalGame,type LegacyStorage} from './service';
import {IndexedDbSaveRepository,deletePersistenceDatabase} from './indexedDb';
import {PRIMARY_SLOT,PREVIOUS_SLOT} from './record';
import {recordFromRaw,verifyRecord} from './payload';
import {SaveCoordinator} from './saveCoordinator';

const legacy:LegacyStorage={getItem:()=>null,setItem:()=>{}};
const factory=new IDBFactory();let sequence=0;const services:GamePersistence[]=[],names:string[]=[];
async function open(){const name=`residence-integration-${++sequence}`,service=await GamePersistence.open(legacy,factory,name);services.push(service);names.push(name);return {service,name};}
afterEach(async()=>{services.splice(0).forEach(item=>item.close());for(const name of names.splice(0))await deletePersistenceDatabase(factory,name);});
describe('Residence persistence integration',()=>{
 it('loads released canonical root3 bytes in memory, snapshots exactly once on upgrade, and preserves revision semantics',async()=>{
  const old=createGame('Old root','Unspecified','ca',44),raw=JSON.stringify(old),{service,name}=await open();expect(isCanonicalGamePayload(raw)).toBe(true);
  await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',raw),null);
  const loaded=await service.initialize();expect(loaded.revision).toBe(1);expect(loaded.game?.version).toBe(6);expect((await service.repository.getRecord(PRIMARY_SLOT) as {declaredRootVersion:number}).declaredRootVersion).toBe(3);
  const slot=`recovery:${PRE_RESIDENCE_SAVE_KEY}`;expect(await service.repository.getRecord(slot)).toBeUndefined();await service.save(loaded.game!,1);
  const recovery=await verifyRecord(await service.repository.getRecord(slot),slot),previous=await verifyRecord(await service.repository.getRecord(PREVIOUS_SLOT),PREVIOUS_SLOT);expect(recovery.raw).toBe(raw);expect(previous.raw).toBe(raw);expect(recovery.result.game).toEqual(loaded.game);expect(recovery.record.declaredRootVersion).toBe(3);
  await service.save({...loaded.game!,money:123},2);expect((await verifyRecord(await service.repository.getRecord(slot),slot)).raw).toBe(raw);expect((await service.recoveries()).some(item=>item.slotId===slot)).toBe(true);service.close();
  const reopened=await GamePersistence.open(legacy,factory,name);services.push(reopened);expect((await reopened.initialize()).game?.money).toBe(123);expect((await reopened.initialize()).revision).toBe(3);
  const restored=await reopened.restore(slot,3);expect(restored.game).toEqual(loaded.game);expect(restored.revision).toBe(4);expect((await reopened.initialize()).game).toEqual(loaded.game);expect((await verifyRecord(await reopened.repository.getRecord(slot),slot)).raw).toBe(raw);
 });
 it('aborts recovery and primary replacement together without losing pre-v4 authority',async()=>{
  const name=`residence-failure-${++sequence}`;names.push(name);let fail=false;
  const repository=await IndexedDbSaveRepository.open(factory,name,{afterWrites:tx=>{if(fail)tx.abort();}});
  const service=new (GamePersistence as unknown as {new(repository:IndexedDbSaveRepository,legacy:LegacyStorage):GamePersistence})(repository,legacy);services.push(service);
  const old=createGame('Retained','Unspecified','ca',55),raw=JSON.stringify(old);await repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',raw),null);fail=true;
  await expect(service.save(migrateGame(old)!,1)).rejects.toThrow();expect((await verifyRecord(await repository.getRecord(PRIMARY_SLOT),PRIMARY_SLOT)).raw).toBe(raw);expect(await repository.getRecord(`recovery:${PRE_RESIDENCE_SAVE_KEY}`)).toBeUndefined();expect(await repository.getRecord(PREVIOUS_SLOT)).toBeUndefined();
 });
 it('round-trips nonempty Residence with ArrayBuffer checksum, exact content qualification and export/import',async()=>{
  const game=syntheticResidenceGame(),{service,name}=await open();await service.save(game,null);const stored=await service.repository.getRecord(PRIMARY_SLOT) as {payload:ArrayBuffer};expect(stored.payload).toBeInstanceOf(ArrayBuffer);service.close();
  const second=await GamePersistence.open(legacy,factory,name);services.push(second);const loaded=(await second.initialize()).game!;expect(loaded).toEqual(upgradeGameToCurrent(game));expect(loaded.residence).toEqual(game.residence);expect(validGameWithContent(loaded,context(loaded.people!))).toBe(true);expect(importCanonicalGame(exportCanonicalGame(game))).toEqual(upgradeGameToCurrent(game));
  const corrupted={...stored,payload:stored.payload.slice(0)},originalBytes=new Uint8Array(stored.payload),raw=new TextDecoder().decode(originalBytes),residenceStart=raw.indexOf('"residence":'),sequenceStart=raw.indexOf('"nextSequence":4',residenceStart)+'"nextSequence":'.length;
  expect(residenceStart).toBeGreaterThan(0);expect(raw[sequenceStart]).toBe('4');const byteOffset=new TextEncoder().encode(raw.slice(0,sequenceStart)).byteLength;new Uint8Array(corrupted.payload)[byteOffset]='5'.charCodeAt(0);expect(new Uint8Array(stored.payload)).toEqual(originalBytes);await expect(verifyRecord(corrupted,PRIMARY_SLOT)).rejects.toMatchObject({reason:'checksum-mismatch'});
  const bad={...game,residence:null};expect(()=>importCanonicalGame(JSON.stringify(bad))).toThrow();
 });
 it('keeps newest pending nonempty Residence state through the unchanged SaveCoordinator',async()=>{
  const game=syntheticResidenceGame(),content=context(game.people!),changed={...game,residence:recordNoFixedAbode(removePersonFromResidences(game.residence,'person:2',content),'person:2',content)};
  let finish!:(revision:number)=>void;const calls:Game[]=[];const coordinator=new SaveCoordinator(async value=>{calls.push(value);return calls.length===1?await new Promise<number>(resolve=>{finish=resolve;}):2;},null);
  coordinator.request(game);coordinator.request({...game,money:20});const completed=coordinator.persist(changed);finish(1);await completed;expect(calls).toEqual([game,changed]);expect(serializeGame(calls[1])).toEqual(serializeGame(changed));expect(coordinator.snapshot).toMatchObject({revision:2,dirty:false});
 });
});

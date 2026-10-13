import {afterEach,describe,expect,it} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {GamePersistence,exportCanonicalGame,importCanonicalGame} from './service';
import {deletePersistenceDatabase,IndexedDbSaveRepository,PERSISTENCE_DATABASE_VERSION} from './indexedDb';
import {recordFromRaw,sha256Text,verifyRecord} from './payload';
import {PERSISTENCE_VERSION,PREVIOUS_SLOT,PRIMARY_SLOT} from './record';
import {PRE_GUARDIANSHIP_CARE_SAVE_KEY,serializeCurrentGame,serializeGameV7,upgradeGameToCurrent} from '../engine/save';
import {syntheticRelationshipUnionGame} from '../engine/testing/relationshipUnionRootFixture';
import {guardianshipCareContext,syntheticGuardianshipCareGame} from '../engine/testing/guardianshipCareRootFixture';
import {acceptApplicationGame} from '../ui/gameContent';
import {establishCare} from '../engine/care/state';

const factory=new IDBFactory(),legacy={getItem:()=>null,setItem:()=>{}},connections:GamePersistence[]=[],names:string[]=[];let sequence=0;
async function open(name=`guardianship-care-root8-${++sequence}`){names.push(name);const service=await GamePersistence.open(legacy,factory,name);connections.push(service);return service;}
afterEach(async()=>{for(const service of connections.splice(0))service.close();for(const name of new Set(names.splice(0)))await deletePersistenceDatabase(factory,name);});

describe('root8 through unchanged Persistence authority',()=>{
 it('keeps exact root7 bytes until the first root8 save and creates the named snapshot atomically',async()=>{
  const historical=serializeGameV7(syntheticRelationshipUnionGame());if(!historical.ok)throw Error(historical.error);const service=await open(),slot=`recovery:${PRE_GUARDIANSHIP_CARE_SAVE_KEY}`;
  await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',historical.raw),null);
  const opened=await service.initialize();expect(opened.game).toEqual(upgradeGameToCurrent(historical.game));expect((await verifyRecord(await service.repository.getRecord(PRIMARY_SLOT),PRIMARY_SLOT)).raw).toBe(historical.raw);expect(await service.repository.getRecord(slot)).toBeUndefined();
  await service.save(opened.game!,1);for(const id of [PREVIOUS_SLOT,slot]){const record=await verifyRecord(await service.repository.getRecord(id),id);expect(record.raw).toBe(historical.raw);expect(record.record.sha256).toBe(await sha256Text(historical.raw));expect(record.record.declaredRootVersion).toBe(7);}
  expect((await verifyRecord(await service.repository.getRecord(PRIMARY_SLOT),PRIMARY_SLOT)).record.declaredRootVersion).toBe(8);expect(PERSISTENCE_DATABASE_VERSION).toBe(1);expect(PERSISTENCE_VERSION).toBe(1);
 });

 it('aborts root8, previous and required recovery together without consuming revision',async()=>{
  const name=`guardianship-care-abort-${++sequence}`;names.push(name);let fail=false;const repository=await IndexedDbSaveRepository.open(factory,name,{afterWrites:transaction=>{if(fail)transaction.abort();}}),service=Reflect.construct(GamePersistence,[repository,legacy]) as GamePersistence;connections.push(service);
  const historical=serializeGameV7(syntheticRelationshipUnionGame());if(!historical.ok)throw Error(historical.error);await repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',historical.raw),null);fail=true;
  await expect(service.save(upgradeGameToCurrent(historical.game)!,1)).rejects.toThrow();expect((await verifyRecord(await repository.getRecord(PRIMARY_SLOT),PRIMARY_SLOT)).raw).toBe(historical.raw);expect(await repository.getRecord(PREVIOUS_SLOT)).toBeUndefined();expect(await repository.getRecord(`recovery:${PRE_GUARDIANSHIP_CARE_SAVE_KEY}`)).toBeUndefined();
  fail=false;expect(await service.save(upgradeGameToCurrent(historical.game)!,1)).toBe(2);await expect(service.save(upgradeGameToCurrent(historical.game)!,1)).rejects.toThrow();
 });

 it('round-trips populated legal and Care state, enforces kinds, and continues without serializing content',async()=>{
  const game=syntheticGuardianshipCareGame(),canonical=serializeCurrentGame(game);if(!canonical.ok)throw Error(canonical.error);const service=await open(),name=names.at(-1)!;await service.save(game,null);service.close();const reopened=await open(name),loaded=(await reopened.initialize()).game;
  if(loaded?.version!==8)throw Error('Expected current root8');expect(loaded).toEqual(game);expect(exportCanonicalGame(loaded)).toBe(canonical.raw);expect(importCanonicalGame(canonical.raw)).toEqual(game);await expect(acceptApplicationGame(loaded)).rejects.toThrow('unavailable');expect(await acceptApplicationGame(loaded,guardianshipCareContext(game))).toBe(loaded);
  const continued=establishCare(loaded.care,'person:3','person:4','unspecified',{people:loaded.people,referenceDate:loaded.clock!.date});await reopened.save({...loaded,care:continued},1);expect((await reopened.initialize()).game).toEqual({...loaded,care:continued});expect(canonical.raw).not.toContain('Synthetic guardianship');
 });

 it('rejects a malformed root8 primary instead of erasing authority or electing previous',async()=>{
  const service=await open(),good=serializeCurrentGame(syntheticGuardianshipCareGame());if(!good.ok)throw Error(good.error);await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',1,'canonical-game',good.raw),null);
  const malformed=JSON.stringify({...good.game,care:{version:1,responsibilities:[{caregiverId:'person:1',recipientId:'person:999',role:'principal'}]}});await service.repository.commitSave(await recordFromRaw(PRIMARY_SLOT,'primary',2,'canonical-game',malformed),1);
  const result=await service.initialize();expect(result.status).toBe('recovery-required');expect(result.game).toBeNull();expect(result.recoveries.find(item=>item.slotId===PREVIOUS_SLOT)?.game).toEqual(good.game);const retained=await service.repository.getRecord(PRIMARY_SLOT) as {payload:ArrayBuffer};expect(new TextDecoder().decode(retained.payload)).toBe(malformed);
 });
});

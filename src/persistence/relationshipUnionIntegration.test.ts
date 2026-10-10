import {afterEach,describe,expect,it} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {GamePersistence,exportCanonicalGame,importCanonicalGame} from './service';
import {IndexedDbSaveRepository,deletePersistenceDatabase} from './indexedDb';
import {recordFromRaw,verifyRecord,sha256Text} from './payload';
import {PRE_RELATIONSHIP_UNION_SAVE_KEY,serializeGameV6,serializeCurrentGame,upgradeGameToCurrent} from '../engine/save';
import {syntheticKinshipGame} from '../engine/testing/kinshipRootFixture';
import {syntheticRelationshipUnionGame,relationshipUnionContext} from '../engine/testing/relationshipUnionRootFixture';
import {createFormalUnion} from '../engine/formalUnion/state';
import {fixtureKinds,fixtureInput} from '../engine/formalUnion/fixtures';
import {acceptApplicationGame} from '../ui/gameContent';

const factory=new IDBFactory(),legacy={getItem:()=>null,setItem:()=>{}},connections:GamePersistence[]=[],names:string[]=[];let sequence=0;
async function open(name=`relationship-union-root7-${++sequence}`){names.push(name);const service=await GamePersistence.open(legacy,factory,name);connections.push(service);return service;}
afterEach(async()=>{for(const service of connections.splice(0))service.close();for(const name of new Set(names.splice(0)))await deletePersistenceDatabase(factory,name);});
describe('root7 through unchanged Persistence authority',()=>{
 it('keeps designated6 bytes until first7 save; exact write-once recovery and previous rotate atomically',async()=>{
  const old=serializeGameV6(syntheticKinshipGame());if(!old.ok)throw Error(old.error);const service=await open(),slot=`recovery:${PRE_RELATIONSHIP_UNION_SAVE_KEY}`;
  await service.repository.commitSave(await recordFromRaw('primary','primary',1,'canonical-game',old.raw),null);
  const current=(await service.initialize()).game!;expect(current).toEqual(upgradeGameToCurrent(old.game));expect((await verifyRecord(await service.repository.getRecord('primary'),'primary')).raw).toBe(old.raw);expect(await service.repository.getRecord(slot)).toBeUndefined();
  await service.save(current,1);for(const id of ['previous',slot]){const record=await verifyRecord(await service.repository.getRecord(id),id);expect(record.raw).toBe(old.raw);expect(record.record.sha256).toBe(await sha256Text(old.raw));expect(record.record.declaredRootVersion).toBe(6);}
  await service.save({...current,money:71},2);expect((await verifyRecord(await service.repository.getRecord(slot),slot)).raw).toBe(old.raw);
 });
 it('aborts required recovery, previous and primary together; retries retain exact revision',async()=>{
  const name=`relationship-union-abort-${++sequence}`;names.push(name);let fail=false;const repo=await IndexedDbSaveRepository.open(factory,name,{afterWrites:tx=>{if(fail)tx.abort();}}),service=Reflect.construct(GamePersistence,[repo,legacy]) as GamePersistence;connections.push(service);
  const old=serializeGameV6(syntheticKinshipGame());if(!old.ok)throw Error(old.error);await repo.commitSave(await recordFromRaw('primary','primary',1,'canonical-game',old.raw),null);fail=true;
  await expect(service.save(upgradeGameToCurrent(old.game)!,1)).rejects.toThrow();expect((await verifyRecord(await repo.getRecord('primary'),'primary')).raw).toBe(old.raw);expect(await repo.getRecord('previous')).toBeUndefined();expect(await repo.getRecord(`recovery:${PRE_RELATIONSHIP_UNION_SAVE_KEY}`)).toBeUndefined();
  fail=false;expect(await service.save(upgradeGameToCurrent(old.game)!,1)).toBe(2);await expect(service.save(upgradeGameToCurrent(old.game)!,1)).rejects.toThrow();
 });
 it('round-trips nonempty state and continues durable allocator without content hidden in saves',async()=>{
  const game=syntheticRelationshipUnionGame(),encoded=serializeCurrentGame(game);if(!encoded.ok)throw Error(encoded.error);const service=await open(),name=names.at(-1)!;await service.save(game,null);service.close();const reopened=await open(name),loaded=(await reopened.initialize()).game!;
  if(loaded.version!==7)throw Error('Expected current root7');
  expect(loaded).toEqual(game);expect(exportCanonicalGame(loaded)).toBe(encoded.raw);expect(importCanonicalGame(encoded.raw)).toEqual(game);
  await expect(acceptApplicationGame(loaded)).rejects.toThrow('unavailable');expect((await verifyRecord(await reopened.repository.getRecord('primary'),'primary')).raw).toBe(encoded.raw);
  expect(await acceptApplicationGame(loaded,relationshipUnionContext(game))).toBe(loaded);
  const result=createFormalUnion(loaded.formalUnion,{...fixtureInput(2,3),formedOn:loaded.clock!.date},{people:loaded.people,referenceDate:loaded.clock!.date,kinds:fixtureKinds()});expect(result.union.id).toBe('formal-union:5');
  await reopened.save({...loaded,formalUnion:result.state},1);const final=(await reopened.initialize()).game;if(final?.version!==7)throw Error('Expected continued root7');expect(final.formalUnion).toEqual(result.state);
  expect(encoded.raw).not.toContain('Synthetic pair contract');expect(game.formalUnion.nextSequence).toBe(5);
 });
 it('does not substitute newer previous for older primary or silently erase corrupt7',async()=>{
  const service=await open(),current=serializeCurrentGame(syntheticRelationshipUnionGame()),old=serializeGameV6({...syntheticKinshipGame(),money:44});if(!current.ok||!old.ok)throw Error('Codec');
  await service.repository.commitSave(await recordFromRaw('primary','primary',1,'canonical-game',current.raw),null);await service.repository.commitSave(await recordFromRaw('primary','primary',2,'canonical-game',old.raw),1);expect((await service.initialize()).game!.money).toBe(44);
  const raw=JSON.stringify({...current.game,partnership:null});await service.repository.commitSave(await recordFromRaw('primary','primary',3,'canonical-game',raw),2);const loaded=await service.initialize();expect(loaded.status).toBe('recovery-required');expect(loaded.game).toBeNull();expect(new TextDecoder().decode((await service.repository.getRecord('primary') as {payload:ArrayBuffer}).payload)).toBe(raw);
 });
});

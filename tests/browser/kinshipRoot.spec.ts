import {expect,test} from '@playwright/test';

test('root6 preserves nonempty Kinship, exact pre-Kinship recovery and pair continuation through close/reopen',async({page},testInfo)=>{
 await page.goto('/research/country-start-v3/worker-browser-blank.html');
 const result=await page.evaluate(async browser=>{
  const [fixture,oldFixture,save,service,payload,kinship]=await Promise.all([import('/src/engine/testing/kinshipRootFixture.ts'),import('/src/engine/testing/householdRootFixture.ts'),import('/src/engine/save.ts'),import('/src/persistence/service.ts'),import('/src/persistence/payload.ts'),import('/src/engine/kinship/state.ts')]);
  const name='turning-pages-kinship-root6-'+browser,legacy={getItem:()=>null,setItem:()=>{}},historical=save.serializeGameV5(oldFixture.syntheticHouseholdGame()),game=fixture.syntheticKinshipGame();if(!historical.ok)throw Error('Historical5 fixture failed');const pinned6=save.serializeGameV6(game);if(!pinned6.ok||new TextEncoder().encode(pinned6.raw).byteLength!==4118)throw Error('Pinned historical6 bytes changed');
  const pending=new Set<Promise<void>>(),native=IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction=function(...args:Parameters<IDBDatabase['transaction']>){const tx=native.apply(this,args);if(this.name===name){const done=new Promise<void>((resolve,reject)=>{tx.addEventListener('complete',()=>resolve(),{once:true});tx.addEventListener('abort',()=>reject(tx.error),{once:true});});pending.add(done);void done.then(()=>pending.delete(done),()=>pending.delete(done));}return tx;};
  let first:InstanceType<typeof service.GamePersistence>|undefined,second:InstanceType<typeof service.GamePersistence>|undefined;
  try{
   first=await service.GamePersistence.open(legacy,indexedDB,name);await first.repository.commitSave(await payload.recordFromRaw('primary','primary',1,'canonical-game',historical.raw),null);
   const opened=await first.initialize();if(opened.game?.version!==7||opened.game.kinship.parentages.length||JSON.stringify(opened.game.household)!==JSON.stringify(historical.game.household))throw Error('Historical5 upgrade changed Household or inferred parentage');
   const unchanged=await payload.verifyRecord(await first.repository.getRecord('primary'),'primary');if(unchanged.raw!==historical.raw||unchanged.record.declaredRootVersion!==5)throw Error('Initialize rewrote historical5 bytes');
   await first.save(opened.game,1);const slot='recovery:'+save.PRE_KINSHIP_SAVE_KEY,recovery=await payload.verifyRecord(await first.repository.getRecord(slot),slot);
   if(recovery.raw!==historical.raw||recovery.record.sha256!==await payload.sha256Text(historical.raw))throw Error('Pre-Kinship recovery changed original bytes');
   await first.save(game,2);await Promise.all([...pending]);first.close();second=await service.GamePersistence.open(legacy,indexedDB,name);
   const started=performance.now(),reopened=await second.initialize(),loadMs=performance.now()-started,canonical=save.serializeCurrentGame(game),loaded=save.serializeCurrentGame(reopened.game);
   if(!canonical.ok||!loaded.ok||canonical.raw!==loaded.raw||reopened.game?.version!==7||reopened.game.kinship.parentages.length!==2)throw Error('Nonempty6 roundtrip/reset failure');
   const continued=kinship.addParentageBasis(reopened.game.kinship,'person:1','person:3','legal',{people:reopened.game.people}),retry=kinship.addParentageBasis(continued,'person:1','person:3','legal',{people:reopened.game.people});
   if(JSON.stringify(retry)!==JSON.stringify(continued)||continued.parentages.length!==3)throw Error('Pair/basis continuation failed');
   await second.save({...reopened.game,kinship:continued},3);const retained=await payload.verifyRecord(await second.repository.getRecord(slot),slot);if(retained.raw!==historical.raw)throw Error('Write-once recovery overwritten');
   const final=await second.initialize();if(final.game?.version!==7||JSON.stringify(final.game.kinship)!==JSON.stringify(continued))throw Error('Continued graph save failed');
   return {browser,root:7,records:2,continuedRecords:3,revision:final.revision,householdPreserved:true,canonicalEquality:true,recoveryExact:true,byteLength:new TextEncoder().encode(canonical.raw).byteLength,loadMs};
  }finally{await Promise.all([...pending]);first?.close();second?.close();IDBDatabase.prototype.transaction=native;await new Promise<void>((resolve,reject)=>{const deletion=indexedDB.deleteDatabase(name);deletion.onsuccess=()=>resolve();deletion.onerror=()=>reject(deletion.error);deletion.onblocked=()=>reject(Error('Kinship test connection lifecycle blocked cleanup'));});}
 },testInfo.project.name);
 expect(result).toMatchObject({root:7,records:2,continuedRecords:3,revision:4,householdPreserved:true,canonicalEquality:true,recoveryExact:true,byteLength:4221});
 console.log('::notice title=Kinship root6 persistence::'+JSON.stringify({gate:'kinship-root6',...result}));await testInfo.attach('kinship-root6',{body:JSON.stringify(result,null,2),contentType:'application/json'});
});

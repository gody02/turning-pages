import {expect,test} from '@playwright/test';

test('current5 empty/populated Household roundtrips with exact historical recovery and allocator continuation',async({page},testInfo)=>{
 await page.goto('/research/country-start-v3/worker-browser-blank.html');
 const result=await page.evaluate(async browser=>{
  const [fixture,save,service,payload,household]=await Promise.all([import('/src/engine/testing/householdRootFixture.ts'),import('/src/engine/save.ts'),import('/src/persistence/service.ts'),import('/src/persistence/payload.ts'),import('/src/engine/household/state.ts')]);
  const name='turning-pages-household-root5-'+browser,legacy={getItem:()=>null,setItem:()=>{}},game=fixture.syntheticHouseholdGame(),{household:ignored,...rest}=game,historical=save.serializeGame({...rest,version:4});
  if(!historical.ok)throw Error('Historical fixture invalid');
  const pending=new Set<Promise<void>>(),original=IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction=function(...args:Parameters<IDBDatabase['transaction']>){const tx=original.apply(this,args);if(this.name===name){const done=new Promise<void>((resolve,reject)=>{tx.addEventListener('complete',()=>resolve(),{once:true});tx.addEventListener('abort',()=>reject(tx.error),{once:true});});pending.add(done);void done.then(()=>pending.delete(done),()=>pending.delete(done));}return tx;};
  let first:InstanceType<typeof service.GamePersistence>|undefined,second:InstanceType<typeof service.GamePersistence>|undefined;
  try{
   first=await service.GamePersistence.open(legacy,indexedDB,name);await first.repository.commitSave(await payload.recordFromRaw('primary','primary',1,'canonical-game',historical.raw),null);
   const loaded=await first.initialize();if(loaded.game?.version!==5||loaded.game.household.households.length||loaded.game.household.memberships.length||loaded.game.household.nextSequence!==1)throw Error('Historical upgrade inferred Household');
   await first.save(loaded.game,1);const slot='recovery:'+save.PRE_HOUSEHOLD_SAVE_KEY,recovery=await payload.verifyRecord(await first.repository.getRecord(slot),slot);if(recovery.raw!==historical.raw)throw Error('Pre-Household bytes changed');
   await first.save(game,2);await Promise.all([...pending]);first.close();second=await service.GamePersistence.open(legacy,indexedDB,name);const reopened=await second.initialize(),canonical=save.serializeCurrentGame(game),round=save.serializeCurrentGame(reopened.game);
   if(!canonical.ok||!round.ok||canonical.raw!==round.raw||reopened.game?.version!==5)throw Error('Populated Household roundtrip failed');
   const next=household.createHousehold(reopened.game.household,['person:1'],{people:reopened.game.people});const retained=await payload.verifyRecord(await second.repository.getRecord(slot),slot);
   if(retained.raw!==historical.raw)throw Error('Write-once recovery replaced');
   return {browser,version:reopened.game.version,households:reopened.game.household.households.length,memberships:reopened.game.household.memberships.length,nextHousehold:next.household.id,revision:reopened.revision,recoveryExact:true,canonicalEquality:true};
  }finally{await Promise.all([...pending]);first?.close();second?.close();IDBDatabase.prototype.transaction=original;await new Promise<void>((resolve,reject)=>{const deletion=indexedDB.deleteDatabase(name);deletion.onsuccess=()=>resolve();deletion.onerror=()=>reject(deletion.error);deletion.onblocked=()=>reject(Error('Household fixture deletion blocked'));});}
 },testInfo.project.name);
 expect(result).toMatchObject({version:5,households:2,memberships:4,nextHousehold:'household:3',revision:3,recoveryExact:true,canonicalEquality:true});
 console.log(JSON.stringify({gate:'household-root5',...result}));await testInfo.attach('household-root5',{body:JSON.stringify(result,null,2),contentType:'application/json'});
});

import {expect,test} from '@playwright/test';

test('root8 preserves populated Guardianship and Care with exact root7 recovery and continuation',async({page},testInfo)=>{
 await page.goto('/research/country-start-v3/worker-browser-blank.html');
 const result=await page.evaluate(async browser=>{
  const [fixture,oldFixture,save,service,payload,care,host]=await Promise.all([import('/src/engine/testing/guardianshipCareRootFixture.ts'),import('/src/engine/testing/relationshipUnionRootFixture.ts'),import('/src/engine/save.ts'),import('/src/persistence/service.ts'),import('/src/persistence/payload.ts'),import('/src/engine/care/state.ts'),import('/src/ui/gameContent.ts')]);
  const name='turning-pages-guardianship-care-root8-'+browser,legacy={getItem:()=>null,setItem:()=>{}},historical=save.serializeGameV7(oldFixture.syntheticRelationshipUnionGame()),game=fixture.syntheticGuardianshipCareGame();if(!historical.ok)throw Error('Historical root7 fixture failed');
  let first:InstanceType<typeof service.GamePersistence>|undefined,second:InstanceType<typeof service.GamePersistence>|undefined;
  try{
   first=await service.GamePersistence.open(legacy,indexedDB,name);await first.repository.commitSave(await payload.recordFromRaw('primary','primary',1,'canonical-game',historical.raw),null);
   const opened=await first.initialize();if(opened.game?.version!==8||opened.game.guardianship.guardianships.length||opened.game.care.responsibilities.length)throw Error('Historical root7 migration inferred authority or care');
   if((await payload.verifyRecord(await first.repository.getRecord('primary'),'primary')).raw!==historical.raw)throw Error('Initialization rewrote historical root7');
   await first.save(opened.game,1);const slot='recovery:'+save.PRE_GUARDIANSHIP_CARE_SAVE_KEY,recovery=await payload.verifyRecord(await first.repository.getRecord(slot),slot);if(recovery.raw!==historical.raw||recovery.record.sha256!==await payload.sha256Text(historical.raw))throw Error('Pre-v8 recovery changed exact bytes');
   await first.save(game,2);first.close();second=await service.GamePersistence.open(legacy,indexedDB,name);
   const started=performance.now(),reopened=await second.initialize(),loadMs=performance.now()-started,canonical=save.serializeCurrentGame(game),loaded=save.serializeCurrentGame(reopened.game);if(!canonical.ok||!loaded.ok||canonical.raw!==loaded.raw||reopened.game?.version!==8)throw Error('Populated root8 roundtrip failed');
   await host.acceptApplicationGame(reopened.game,fixture.guardianshipCareContext(game));let unavailable=false;try{await host.acceptApplicationGame(reopened.game);}catch{unavailable=true;}if(!unavailable)throw Error('Populated Guardianship accepted without exact kinds');
   const continued=care.establishCare(reopened.game.care,'person:3','person:4','unspecified',{people:reopened.game.people,referenceDate:reopened.game.clock!.date});await second.save({...reopened.game,care:continued},3);const final=await second.initialize();if(final.game?.version!==8||JSON.stringify(final.game.care)!==JSON.stringify(continued))throw Error('Care continuation failed');if((await payload.verifyRecord(await second.repository.getRecord(slot),slot)).raw!==historical.raw)throw Error('Recovery overwritten');
   return {browser,root:8,guardianships:game.guardianship.guardianships.length,careRows:game.care.responsibilities.length,continuedRows:continued.responsibilities.length,revision:final.revision,recoveryExact:true,canonicalEquality:true,kindResolution:true,byteLength:new TextEncoder().encode(canonical.raw).byteLength,sha256:await payload.sha256Text(canonical.raw),historicalSha256:await payload.sha256Text(historical.raw),loadMs};
  }finally{first?.close();second?.close();await new Promise<void>((resolve,reject)=>{const deletion=indexedDB.deleteDatabase(name);deletion.onsuccess=()=>resolve();deletion.onerror=()=>reject(deletion.error);deletion.onblocked=()=>reject(Error('Root8 test connection lifecycle blocked cleanup'));});}
 },testInfo.project.name);
 expect(result).toMatchObject({root:8,guardianships:1,careRows:3,continuedRows:4,revision:4,recoveryExact:true,canonicalEquality:true,kindResolution:true});
 console.log('::notice title=Guardianship Care root8 persistence::'+JSON.stringify({gate:'guardianship-care-root8',...result}));await testInfo.attach('guardianship-care-root8',{body:JSON.stringify(result,null,2),contentType:'application/json'});
});

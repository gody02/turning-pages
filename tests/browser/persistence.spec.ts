import {expect,test,type Page,type TestInfo} from '@playwright/test';

type StageResult<T>={durationMs:number;cumulativeMs:number;value:T};
type DiagnosticState={
  startedAt:number;
  browserName:string;
  databaseName:string;
  modules?:any;
  game?:any;
  canonicalRaw?:string;
  canonicalBytes?:Uint8Array;
  canonicalSha256?:string;
  first?:any;
  second?:any;
  third?:any;
  stored?:any;
  storedRaw?:string;
  migrated?:any;
  loaded?:any;
};

declare global {
  var __turningPagesV3Diagnostic:DiagnosticState|undefined;
}

const DIAGNOSTIC_PREFIX='[v3-diagnostic]';
const IDB_PREFIX='[v3-idb]';

test('persists nonempty root4 Residence with exact injected content and pre-Residence recovery',async({page},testInfo)=>{
 page.on('console',message=>{if(message.text().includes('residence-database-cleanup'))console.log(message.text());});
 await page.goto('/');
 const result=await page.evaluate(async browser=>{
  const [{syntheticResidenceGame,context},service,indexedDb,payload,save,content]=await Promise.all([import('/src/engine/testing/residenceFixture.ts'),import('/src/persistence/service.ts'),import('/src/persistence/indexedDb.ts'),import('/src/persistence/payload.ts'),import('/src/engine/save.ts'),import('/src/engine/gameContent.ts')]);
  const name=`turning-pages-residence-root4-${browser}`,game=syntheticResidenceGame(),started=performance.now();
  // Repository reads resolve at request success, which precedes transaction completion.
  // Drain this fixture's transactions before close/delete; close() alone is not a completion barrier.
  const pending=new Set<Promise<void>>(),originalTransaction=IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction=function(...args:Parameters<IDBDatabase['transaction']>){
   const transaction=originalTransaction.apply(this,args);
   if(this.name===name){
    const settled=new Promise<void>((resolve,reject)=>{transaction.addEventListener('complete',()=>resolve(),{once:true});transaction.addEventListener('abort',()=>reject(transaction.error??Error('Residence fixture transaction aborted.')),{once:true});});
    pending.add(settled);void settled.then(()=>pending.delete(settled),()=>pending.delete(settled));
   }
   return transaction;
  };
  const closeAndDelete=async(persistence:InstanceType<typeof service.GamePersistence>,owner:string)=>{
   console.log(JSON.stringify({gate:'residence-database-cleanup',database:name,owner,pendingTransactions:pending.size}));
   await Promise.all([...pending]);persistence.close();await indexedDb.deletePersistenceDatabase(indexedDB,name);
  };
  try{
  const first=await service.GamePersistence.open(localStorage,indexedDB,name);
  await first.save(game,null);first.close();const second=await service.GamePersistence.open(localStorage,indexedDB,name),loaded=await second.initialize();
  if(JSON.stringify(loaded.game)!==JSON.stringify(save.upgradeGameToCurrent(game))||!content.validGameWithContent(loaded.game,context(loaded.game.people)))throw Error('Nonempty root4 Residence did not round-trip.');
  const stored=await second.repository.getRecord('primary');if(!(stored.payload instanceof ArrayBuffer)||stored.declaredRootVersion!==6)throw Error('Root4 did not retain ArrayBuffer storage.');await closeAndDelete(second,'second: primary read');
  const {residence,...rest}=game,oldRaw=JSON.stringify({...rest,version:3}),third=await service.GamePersistence.open(localStorage,indexedDB,name);
  await third.repository.commitSave(await payload.recordFromRaw('primary','primary',1,'canonical-game',oldRaw),null);const migrated=await third.initialize();if(migrated.game.version!==7||migrated.game.residence.residences.length)throw Error('Root3 migration must be empty.');
  await third.save(migrated.game,1);const recoverySlot=`recovery:${save.PRE_RESIDENCE_SAVE_KEY}`,recovery=await payload.verifyRecord(await third.repository.getRecord(recoverySlot),recoverySlot);if(recovery.raw!==oldRaw)throw Error('Pre-Residence recovery bytes changed.');const householdSlot=`recovery:${save.PRE_HOUSEHOLD_SAVE_KEY}`,householdRecovery=await payload.verifyRecord(await third.repository.getRecord(householdSlot),householdSlot);if(householdRecovery.raw!==oldRaw)throw Error('Pre-Household recovery bytes changed.');await closeAndDelete(third,'third: recovery read');
  return {browser,rootVersion:loaded.game.version,residences:loaded.game.residence.residences.length,byteLength:stored.byteLength,elapsedMs:performance.now()-started};
  }finally{IDBDatabase.prototype.transaction=originalTransaction;}
 },testInfo.project.name);
 expect(result.rootVersion).toBe(7);expect(result.residences).toBe(3);console.log(JSON.stringify({gate:'residence-root4',...result}));
});

async function runStage<T>(page:Page,testInfo:TestInfo,name:string,operation:()=>Promise<StageResult<T>>):Promise<T>{
  console.log(`${DIAGNOSTIC_PREFIX} START ${name}`);
  const result=await operation();
  const measurement={stage:name,durationMs:+result.durationMs.toFixed(3),cumulativeMs:+result.cumulativeMs.toFixed(3)};
  console.log(`${DIAGNOSTIC_PREFIX} PASS ${JSON.stringify(measurement)}`);
  await testInfo.attach(`stage-${name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}`,{body:JSON.stringify(measurement,null,2),contentType:'application/json'});
  return result.value;
}

test('round-trips a one-byte ArrayBuffer after IndexedDB close and reopen',async({page},testInfo)=>{
  await page.goto('/');
  const result=await page.evaluate(async browserName=>{
    const name=`turning-pages-arraybuffer-probe-${browserName}`;
    await new Promise<void>((resolve,reject)=>{const remove=indexedDB.deleteDatabase(name);remove.onsuccess=()=>resolve();remove.onerror=()=>reject(remove.error);});
    await new Promise<void>((resolve,reject)=>{const open=indexedDB.open(name,1);open.onupgradeneeded=()=>open.result.createObjectStore('records');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('records','readwrite'),request=tx.objectStore('records').put(new Uint8Array([173]).buffer,'one');request.onerror=()=>reject(request.error);tx.onabort=()=>reject(tx.error??Error('ArrayBuffer transaction aborted.'));tx.oncomplete=()=>{db.close();resolve();};};});
    const byte=await new Promise<number>((resolve,reject)=>{const open=indexedDB.open(name,1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,request=db.transaction('records','readonly').objectStore('records').get('one');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const payload=request.result;db.close();if(!(payload instanceof ArrayBuffer)||payload.byteLength!==1){reject(Error('Stored payload was not an exact one-byte ArrayBuffer.'));return;}resolve(new Uint8Array(payload)[0]);};};});
    await new Promise<void>((resolve,reject)=>{const remove=indexedDB.deleteDatabase(name);remove.onsuccess=()=>resolve();remove.onerror=()=>reject(remove.error);});
    return byte;
  },testInfo.project.name);
  expect(result).toBe(173);
});

test('round-trips the root4 Game with frozen geographic v3 content through real IndexedDB stages',async({page},testInfo)=>{
  page.on('console',message=>{const value=message.text();if(value.startsWith(IDB_PREFIX))console.log(value);});

  const navigationStarted=performance.now();
  await page.goto('/');
  await runStage(page,testInfo,'A page loaded',()=>page.evaluate(({browserName,navigationMs})=>{
    const startedAt=performance.now();
    globalThis.__turningPagesV3Diagnostic={startedAt,browserName,databaseName:`turning-pages-browser-${browserName}`};
    return {durationMs:navigationMs,cumulativeMs:0,value:null};
  },{browserName:testInfo.project.name,navigationMs:performance.now()-navigationStarted}));

  await runStage(page,testInfo,'B required modules imported',()=>page.evaluate(async()=>{
    const state=globalThis.__turningPagesV3Diagnostic!;
    const started=performance.now();
    const [service,v3Gate,save,indexedDb,record,payload]=await Promise.all([
      import('/src/persistence/service.ts'),
      import('/src/persistence/testing/v3Gate.ts'),
      import('/src/engine/save.ts'),
      import('/src/persistence/indexedDb.ts'),
      import('/src/persistence/record.ts'),
      import('/src/persistence/payload.ts'),
    ]);
    state.modules={service,v3Gate,save,indexedDb,record,payload};
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:null};
  }));

  const construction=await runStage(page,testInfo,'C v3 package constructed',()=>page.evaluate(()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();
    const historical=state.modules.v3Gate.createV3PersistenceProbeGame(),encoded=state.modules.save.serializeGame(historical);if(!encoded.ok||historical.version!==4||new TextEncoder().encode(encoded.raw).byteLength!==9_595_405)throw Error('Frozen root4 byte contract changed');state.game=state.modules.save.upgradeGameToCurrent(historical);if(!state.game)throw Error('Current upgrade failed');
    const representedPopulation=state.modules.v3Gate.V3_PERSISTENCE_IDENTITY.total;
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:{representedPopulation}};
  }));
  expect(construction.representedPopulation).toBe(69_281_437);

  await runStage(page,testInfo,'D pre-save Game validation complete',()=>page.evaluate(()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();
    if(!state.modules.save.isGame(state.game))throw Error('Constructed v3 probe Game failed strict validation.');
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:null};
  }));

  const serialization=await runStage(page,testInfo,'E canonical serialization complete',()=>page.evaluate(()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now(),serialized=state.modules.save.serializeCurrentGame(state.game);
    if(!serialized.ok)throw Error(serialized.error);
    state.canonicalRaw=serialized.raw;
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:{characters:serialized.raw.length}};
  }));
  expect(serialization.characters).toBeGreaterThan(0);

  const stringify=await runStage(page,testInfo,'F JSON stringify and canonical byte count complete',()=>page.evaluate(()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now(),raw=JSON.stringify(state.game);
    if(raw!==state.canonicalRaw)throw Error('Direct JSON serialization differs from canonical Game JSON.');
    const byteLength=new TextEncoder().encode(raw).byteLength;
    const {partnership,formalUnion,kinship,household,residence,...preResidence}=state.game;if(state.game.version!==7||household.nextSequence!==1||household.households.length||household.memberships.length||residence.residences.length||residence.occupants.length||residence.noFixedAbodePersonIds.length)throw Error('Root v4 must contain empty Residence.');if(new TextEncoder().encode(JSON.stringify({...preResidence,version:3})).byteLength!==9_595_304)throw Error('Frozen v3 byte contract changed.');
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:{byteLength}};
  }));
  expect(stringify.byteLength).toBe(9_595_624);

  const encoded=await runStage(page,testInfo,'G UTF-8 ArrayBuffer preparation complete',()=>page.evaluate(()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now(),bytes=new TextEncoder().encode(state.canonicalRaw);
    state.canonicalBytes=bytes;
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:{byteLength:bytes.byteLength}};
  }));
  expect(encoded.byteLength).toBe(9_595_624);

  await runStage(page,testInfo,'H SHA-256 calculation complete',()=>page.evaluate(async()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();
    state.canonicalSha256=await state.modules.payload.sha256Bytes(state.canonicalBytes);
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:{sha256:state.canonicalSha256}};
  }));

  await runStage(page,testInfo,'I IndexedDB database deletion complete',()=>page.evaluate(async()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();
    await Promise.race([
      state.modules.indexedDb.deletePersistenceDatabase(indexedDB,state.databaseName),
      new Promise((_,reject)=>setTimeout(()=>reject(Error('Firefox stalled during database deletion.')),30_000)),
    ]);
    localStorage.removeItem('turning-pages:v1');
    localStorage.removeItem('turning-pages:indexeddb-authority-v1');
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:null};
  }));

  await runStage(page,testInfo,'J IndexedDB open complete',()=>page.evaluate(async()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();
    state.first=await Promise.race([
      state.modules.service.GamePersistence.open(localStorage,indexedDB,state.databaseName),
      new Promise((_,reject)=>setTimeout(()=>reject(Error('Firefox stalled during first IndexedDB open.')),30_000)),
    ]);
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:null};
  }));

  const preparation=await runStage(page,testInfo,'K first primary save preparation complete',()=>page.evaluate(async()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();
    const prepared=await state.modules.payload.prepareCanonicalRecord(state.game,state.modules.record.PRIMARY_SLOT,'primary',1);
    if(prepared.record.byteLength!==9_595_624)throw Error('Prepared primary has the wrong byte length.');
    const durationMs=performance.now()-started;
    return {durationMs,cumulativeMs:performance.now()-state.startedAt,value:{byteLength:prepared.record.byteLength,durationMs}};
  }));
  expect(preparation.byteLength).toBe(9_595_624);
  expect(preparation.durationMs).toBeLessThanOrEqual(1_000);

  await runStage(page,testInfo,'L first IndexedDB write transaction committed',()=>page.evaluate(async prefix=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now(),dbPrototype=IDBDatabase.prototype as any,storePrototype=IDBObjectStore.prototype as any,originalTransaction=dbPrototype.transaction,originalPut=storePrototype.put;
    const event=(name:string)=>console.log(`${prefix} ${JSON.stringify({save:'first',event:name,elapsedMs:+(performance.now()-started).toFixed(3),cumulativeMs:+(performance.now()-state.startedAt).toFixed(3)})}`);
    dbPrototype.transaction=function(...args:any[]){const tx=originalTransaction.apply(this,args);if(tx.mode==='readwrite'){event('transaction-created');tx.addEventListener('complete',()=>event('transaction-complete'));tx.addEventListener('abort',()=>event('transaction-abort'));tx.addEventListener('error',()=>event('transaction-error'));}return tx;};
    storePrototype.put=function(...args:any[]){const request=originalPut.apply(this,args);event('put-request-created');request.addEventListener('success',()=>event('put-request-success'));request.addEventListener('error',()=>event('put-request-error'));return request;};
    try{
      await Promise.race([state.first.save(state.game,null),new Promise((_,reject)=>setTimeout(()=>reject(Error('Firefox stalled during first save preparation or IndexedDB commit.')),90_000))]);
    }finally{dbPrototype.transaction=originalTransaction;storePrototype.put=originalPut;}
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:null};
  },IDB_PREFIX));

  await runStage(page,testInfo,'M first database close complete',()=>page.evaluate(()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();state.first.close();state.first=undefined;
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:null};
  }));

  await runStage(page,testInfo,'N database reopen complete',()=>page.evaluate(async()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();
    state.second=await Promise.race([state.modules.service.GamePersistence.open(localStorage,indexedDB,state.databaseName),new Promise((_,reject)=>setTimeout(()=>reject(Error('Firefox stalled during database reopen.')),30_000))]);
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:null};
  }));

  await runStage(page,testInfo,'O primary record read complete',()=>page.evaluate(async()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();
    state.stored=await Promise.race([state.second.repository.getRecord(state.modules.record.PRIMARY_SLOT),new Promise((_,reject)=>setTimeout(()=>reject(Error('Firefox stalled during primary record read.')),30_000))]);
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:{present:state.stored!==undefined}};
  }));

  await runStage(page,testInfo,'P byteLength verification complete',()=>page.evaluate(()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now(),payload=state.stored?.payload;
    if(!(payload instanceof ArrayBuffer)||payload.byteLength!==9_595_624||state.stored.byteLength!==9_595_624)throw Error('Stored primary is not the exact expected ArrayBuffer.');
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:{byteLength:payload.byteLength}};
  }));

  await runStage(page,testInfo,'Q SHA-256 verification complete',()=>page.evaluate(async()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now(),hash=await state.modules.payload.sha256Bytes(new Uint8Array(state.stored.payload));
    if(hash!==state.stored.sha256)throw Error('Stored primary checksum mismatch.');
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:{sha256:hash}};
  }));

  await runStage(page,testInfo,'R UTF-8 decode complete',()=>page.evaluate(()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();
    state.storedRaw=new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(state.stored.payload));
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:{characters:state.storedRaw.length}};
  }));

  await runStage(page,testInfo,'S1 JSON parse complete',()=>page.evaluate(()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();state.migrated=JSON.parse(state.storedRaw);
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:null};
  }));

  await runStage(page,testInfo,'S2 migration complete',()=>page.evaluate(()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();state.migrated=state.modules.save.upgradeGameToCurrent(state.migrated);
    if(!state.migrated)throw Error('Stored primary migration failed.');
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:null};
  }));

  await runStage(page,testInfo,'S3 post-load strict validation complete',()=>page.evaluate(()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();
    if(!state.modules.save.isGame(state.migrated))throw Error('Stored primary failed strict Game validation.');
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:null};
  }));

  await runStage(page,testInfo,'T canonical semantic equality complete',()=>page.evaluate(()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now(),serialized=state.modules.save.serializeCurrentGame(state.migrated);
    if(!serialized.ok||serialized.raw!==state.canonicalRaw)throw Error('Reopened canonical Game differs from the saved Game.');
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:null};
  }));

  const productionLoad=await runStage(page,testInfo,'T2 production canonical load complete',()=>page.evaluate(async()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();
    state.loaded=await Promise.race([state.second.initialize(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Firefox stalled during production canonical load.')),90_000))]);
    if(!state.loaded.game)throw Error(state.loaded.error??'Production load returned no Game.');
    const durationMs=performance.now()-started;
    return {durationMs,cumulativeMs:performance.now()-state.startedAt,value:{revision:state.loaded.revision,durationMs}};
  }));
  expect(productionLoad.durationMs).toBeLessThanOrEqual(3_000);

  await runStage(page,testInfo,'U second save and primary-previous rotation complete',()=>page.evaluate(async prefix=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now(),dbPrototype=IDBDatabase.prototype as any,storePrototype=IDBObjectStore.prototype as any,originalTransaction=dbPrototype.transaction,originalPut=storePrototype.put;
    const event=(name:string)=>console.log(`${prefix} ${JSON.stringify({save:'second',event:name,elapsedMs:+(performance.now()-started).toFixed(3),cumulativeMs:+(performance.now()-state.startedAt).toFixed(3)})}`);
    dbPrototype.transaction=function(...args:any[]){const tx=originalTransaction.apply(this,args);if(tx.mode==='readwrite'){event('transaction-created');tx.addEventListener('complete',()=>event('transaction-complete'));tx.addEventListener('abort',()=>event('transaction-abort'));tx.addEventListener('error',()=>event('transaction-error'));}return tx;};
    storePrototype.put=function(...args:any[]){const request=originalPut.apply(this,args);event('put-request-created');request.addEventListener('success',()=>event('put-request-success'));request.addEventListener('error',()=>event('put-request-error'));return request;};
    try{
      await Promise.race([state.second.save(state.loaded.game,state.loaded.revision),new Promise((_,reject)=>setTimeout(()=>reject(Error('Firefox stalled during primary-previous rotation.')),90_000))]);
    }finally{dbPrototype.transaction=originalTransaction;storePrototype.put=originalPut;}
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:null};
  },IDB_PREFIX));

  await runStage(page,testInfo,'V second close and reopen complete',()=>page.evaluate(async()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now();state.second.close();state.second=undefined;
    state.third=await Promise.race([state.modules.service.GamePersistence.open(localStorage,indexedDB,state.databaseName),new Promise((_,reject)=>setTimeout(()=>reject(Error('Firefox stalled during second database reopen.')),30_000))]);
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:null};
  }));

  const records=await runStage(page,testInfo,'W primary and previous verification complete',()=>page.evaluate(async()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now(),primarySlot=state.modules.record.PRIMARY_SLOT,previousSlot=state.modules.record.PREVIOUS_SLOT;
    const primary=await state.modules.payload.verifyRecord(await state.third.repository.getRecord(primarySlot),primarySlot);
    const previous=await state.modules.payload.verifyRecord(await state.third.repository.getRecord(previousSlot),previousSlot);
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:{primaryBytes:primary.record.byteLength,previousBytes:previous.record.byteLength,primaryRevision:primary.record.revision,previousRevision:previous.record.revision}};
  }));
  expect(records).toEqual({primaryBytes:9_595_624,previousBytes:9_595_624,primaryRevision:2,previousRevision:1});

  const continuation=await runStage(page,testInfo,'X deterministic continuation complete',()=>page.evaluate(()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now(),next=state.modules.v3Gate.continueV3PersistenceProbe(state.loaded.game);
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:{personId:next.persons[0]?.id,representedPopulation:state.modules.v3Gate.V3_PERSISTENCE_IDENTITY.total}};
  }));
  expect(continuation).toEqual({personId:'person:2',representedPopulation:69_281_437});

  await runStage(page,testInfo,'Y final assertions and cleanup complete',()=>page.evaluate(async()=>{
    const state=globalThis.__turningPagesV3Diagnostic!,started=performance.now(),identity=state.modules.v3Gate.V3_PERSISTENCE_IDENTITY;
    if(identity.id!=='uk.population.mid-2024.v3'||identity.fingerprint!=='fnv1a64-v1:2894f4c1b1fdd274'||identity.artifactSha256!=='c4b13eb67a1b7e231da1250b27f8e596c6535e7f260013d8a8638bda2b81188a')throw Error('V3 package identity changed.');
    state.third.close();state.third=undefined;
    await state.modules.indexedDb.deletePersistenceDatabase(indexedDB,state.databaseName);
    return {durationMs:performance.now()-started,cumulativeMs:performance.now()-state.startedAt,value:null};
  }));
});

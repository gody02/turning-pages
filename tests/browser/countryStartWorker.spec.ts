import {expect,test} from '@playwright/test';

test('startup-only built Worker preserves v3 bytes with responsive cold/warm delivery and continuation',async({page},testInfo)=>{
 await page.goto('/research/country-start-v3/worker-browser-blank.html');
 const result=await page.evaluate(async browser=>{
  const samples:any[]=[],longTasks:number[]=[];let api:any,game:any;
  const observer=typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes.includes('longtask')?new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(item=>item.duration))):null;
  observer?.observe({entryTypes:['longtask']});
  try{
   for(let cycle=0;cycle<2;cycle++){
    for(const temperature of ['cold','warm']){
     let last=performance.now(),maxGap=0,beats=0,frames=0,interaction=false;const phases:any[]=[],gaps:any[]=[];
     const pulse=()=>{const now=performance.now();if(now-last>100)gaps.push({elapsedMs:now-started,gapMs:now-last});maxGap=Math.max(maxGap,now-last);last=now;beats++;};
     const timer=setInterval(pulse,16);let frame=0,running=true;
     const paint=()=>{frames++;if(running)frame=requestAnimationFrame(paint);};frame=requestAnimationFrame(paint);
     const started=performance.now();
     try{
      api??=await import('/research/country-start-v3/worker-browser-dist/startup-profile.js');
      if(temperature==='cold')api.disposeUkCountryStartStartup();
      const mode=cycle===0?'adult':'childhood';
      const construction=api.createUkMid2024GeographicResidenceGame({version:1,rootSeed:73,mode},{onProgress:(phase:string)=>phases.push({phase,elapsedMs:performance.now()-started})});
      const channel=new MessageChannel();channel.port1.onmessage=()=>{interaction=true;channel.port1.close();channel.port2.close();};channel.port2.postMessage('host-input');
      game=await construction;pulse();
      if(!interaction||beats<2||frames<2)throw Error('Worker monopolized the main-thread interaction opportunity.');
      const elapsed=performance.now()-started,metrics=api.ukCountryStartStartupDiagnostics();
      samples.push({browser,mode,cycle,temperature,totalMs:elapsed,heartbeatCount:beats,frames,maxHeartbeatGapMs:maxGap,interaction,phases,gaps,...metrics,status:api.ukCountryStartStartupStatus()});
     }finally{running=false;clearInterval(timer);cancelAnimationFrame(frame);}
    }
   }
   // Validation/equality/persistence run after measured startup, never hidden in its handoff.
   const [save,service,geographyApi,geographyContent,settlementApi,settlementContent,content,human,extraction,population,residence]=await Promise.all([
    import('/src/engine/save.ts'),import('/src/persistence/service.ts'),import('/src/engine/geography/runtime.ts'),import('/src/data/geography/uk/primary-local-admin-2024/adapter.ts'),
    import('/src/engine/geography/settlements/runtime.ts'),import('/src/data/geography/uk/settlementRegistry.ts'),import('/src/engine/gameContent.ts'),import('/src/data/human/uk/generation/adapter.ts'),
    import('/src/engine/human/content/integration.ts'),import('/src/engine/human/population.ts'),import('/src/engine/residence/state.ts')]);
   const canonical=save.serializeGame(game);if(!canonical.ok)throw Error('Worker Game failed canonical serialization.');
   const bytes=new TextEncoder().encode(canonical.raw),sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
   if(sha256!=='6644f06ebb5aa24360f0c9f1f86c093d2eb0733c5a2661c7486f37a916c752b0')throw Error('Built Worker changed pinned childhood bytes.');
   const geography=geographyApi.createGeographyRuntime(geographyContent.createUkGeographyRegistry()),settlements=settlementApi.createSettlementRuntime(settlementContent.createUkSettlementContentRegistry(),geography),context={geography,settlements};
   if(!content.validGameWithContent(game,context))throw Error('Worker content validation failed.');
   const database='turning-pages-startup-worker-'+browser,legacy={getItem:()=>null,setItem:()=>{}},pending=new Set<Promise<void>>(),original=IDBDatabase.prototype.transaction;
   IDBDatabase.prototype.transaction=function(...args:Parameters<IDBDatabase['transaction']>){const tx=original.apply(this,args);if(this.name===database){const done=new Promise<void>((resolve,reject)=>{tx.addEventListener('complete',()=>resolve(),{once:true});tx.addEventListener('abort',()=>reject(tx.error),{once:true});});pending.add(done);void done.then(()=>pending.delete(done),()=>pending.delete(done));}return tx;};
   let first:any,second:any;
   try{
    first=await service.GamePersistence.open(legacy,indexedDB,database);let started=performance.now();await first.save(game,null);const saveMs=performance.now()-started;
    await Promise.all([...pending]);first.close();second=await service.GamePersistence.open(legacy,indexedDB,database);started=performance.now();const loaded=await second.initialize(),loadMs=performance.now()-started;
    const currentReference=save.serializeCurrentGame(save.upgradeGameToCurrent(game)),round=save.serializeCurrentGame(loaded.game);if(!currentReference.ok||!round.ok||round.raw!==currentReference.raw||!content.validGameWithContent(loaded.game!,context))throw Error('Worker IndexedDB roundtrip changed Game.');
    if(loaded.game!.version!==6||loaded.game!.household.nextSequence!==1||loaded.game!.household.households.length||loaded.game!.household.memberships.length)throw Error('Current-root Household contract failed');const {household,kinship,...rest}=loaded.game!;const projection=save.serializeGame({...rest,version:4});if(!projection.ok||projection.raw!==canonical.raw)throw Error('Historical bytes changed through persistence');const cohort=loaded.game!.population!.cohorts.find(item=>item.birthYear===2000)!;
    const next=extraction.instantiateFromCohortWithContent({people:loaded.game!.people!,population:loaded.game!.population!,rootSeed:73,cohortId:cohort.id,requestKey:'country-start.uk.mid-2024-v3.worker-browser',count:1,referenceDate:{year:2024,month:6,day:30},contentRegistry:human.createUkHumanGenerationContentRegistry()});
    const nextHome=residence.establishResidence(loaded.game!.residence!,['person:2'],loaded.game!.residence!.residences[0].location,{...context,people:next.people});
    return {browser,samples,longTasks,startupMaxGapMs:Math.max(...samples.map(s=>s.maxHeartbeatGapMs)),bytes:bytes.byteLength,sha256,saveMs,loadMs,population:population.deriveCountryPopulation(next.population,next.people,'uk').knownLiving,nextPerson:next.persons[0].id,nextResidence:nextHome.residence.id,semanticEquality:true,memory:{browserHeapUnsupported:true,boundedWorkerLifetime:api.ukCountryStartStartupStatus()}};
   }finally{
    await Promise.all([...pending]);first?.close();second?.close();IDBDatabase.prototype.transaction=original;
    await new Promise<void>((resolve,reject)=>{const deletion=indexedDB.deleteDatabase(database);deletion.onsuccess=()=>resolve();deletion.onerror=()=>reject(deletion.error);deletion.onblocked=()=>reject(Error('Worker profile database cleanup blocked.'));});
   }
  }finally{api?.disposeUkCountryStartStartup();observer?.disconnect();}
 },testInfo.project.name);
 await testInfo.attach('country-start-v3-worker-measurements',{body:JSON.stringify(result,null,2),contentType:'application/json'});
 expect(result).toMatchObject({bytes:9_595_753,population:69_281_437,nextPerson:'person:2',nextResidence:'residence:2',semanticEquality:true});
 for(const sample of result.samples){expect(sample.maxHeartbeatGapMs).toBeLessThanOrEqual(1_000);expect(sample.heartbeatCount).toBeGreaterThan(1);expect(sample.status).toMatchObject({active:false,ready:true,worker:true});}
 expect(result.loadMs).toBeLessThanOrEqual(3_000);
 console.log(JSON.stringify({gate:'country-start-v3-worker-startup',...result}));
});

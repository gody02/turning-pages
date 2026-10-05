import {expect,test} from '@playwright/test';

/** Direct frozen-constructor review, separate from actual production UI routing. */
test('reviews cold/warm Country Start v3, responsiveness and nonempty Residence persistence',async({page},testInfo)=>{
 // A source-only domain probe must not mount LifeApp's Vite HMR client. Its
 // additional cold v2 source imports can trigger dependency optimization/reload;
 // the established static probe page has no application/HMR lifetime to replace.
 await page.goto('/research/country-start-v3/worker-browser-blank.html');
 const result=await page.evaluate(async browser=>{
  const stageEvents:Array<{name:string;ms:number}>=[];
  (globalThis as any).__countryStartReviewMeasure=(name:string,operation:()=>unknown)=>{const start=performance.now();try{return operation();}finally{stageEvents.push({name,ms:performance.now()-start});}};
  const stageSummary=()=>{const events=stageEvents.splice(0);return Object.fromEntries([...new Set(events.map(e=>e.name))].sort().map(name=>{const items=events.filter(e=>e.name===name);return [name,{calls:items.length,inclusiveMs:items.reduce((total,e)=>total+e.ms,0)}];}));};
  const importsStarted=performance.now();
  const [v2,v3,save,service,geographyApi,geographyContent,settlementApi,settlementContent,content,human,extraction,population,residence]=await Promise.all([
   import('/src/data/uk/countryStartGeographic.ts'),import('/src/data/countryStart/uk/countryStartResidence.ts'),
   import('/src/engine/save.ts'),import('/src/persistence/service.ts'),
   import('/src/engine/geography/runtime.ts'),import('/src/data/geography/uk/primary-local-admin-2024/adapter.ts'),
   import('/src/engine/geography/settlements/runtime.ts'),import('/src/data/geography/uk/settlementRegistry.ts'),
   import('/src/engine/gameContent.ts'),import('/src/data/human/uk/generation/adapter.ts'),
   import('/src/engine/human/content/integration.ts'),import('/src/engine/human/population.ts'),import('/src/engine/residence/state.ts'),
  ]),moduleImportMs=performance.now()-importsStarted;
  const moduleStages=stageSummary();
  const request={version:1 as const,mode:'adult' as const,rootSeed:73},samples:Array<{version:number;temperature:string;durationMs:number;blockedHeartbeatMs:number;stages:ReturnType<typeof stageSummary>}>=[],games:any[]=[];
  let lastBeat=performance.now(),worstGap=0;
  const pulse=()=>{const now=performance.now();worstGap=Math.max(worstGap,now-lastBeat);lastBeat=now;};
  const heartbeat=setInterval(pulse,16);
  try{
   for(const [version,temperature] of [[2,'first-call'],[3,'first-call'],[2,'warm'],[3,'warm']] as const){
    await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));pulse();worstGap=0;
    const start=performance.now(),game=await (version===2?v2.createUkMid2024GeographicGame:v3.createUkMid2024GeographicResidenceGame)(request),durationMs=performance.now()-start;
    // Explicitly record the synchronous gap even if the frame callback precedes a due timer.
    pulse();await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    samples.push({version,temperature,durationMs,blockedHeartbeatMs:worstGap,stages:stageSummary()});games.push(game);
   }
  }finally{clearInterval(heartbeat);v3.disposeUkCountryStartStartup();}
  const [old,game,oldRepeat,repeat]=games,raw=save.serializeGame(game),oldRaw=save.serializeGame(old),repeatRaw=save.serializeGame(repeat);
  if(!raw.ok||!oldRaw.ok||!repeatRaw.ok||raw.raw!==repeatRaw.raw)throw Error('Country Start canonical determinism failed.');
  if(JSON.stringify({...game,residence:old.residence})!==JSON.stringify(old)||JSON.stringify(oldRepeat)!==JSON.stringify(old))throw Error('Country Start changed non-Residence state.');
  const bytes=new TextEncoder().encode(raw.raw).byteLength,oldBytes=new TextEncoder().encode(oldRaw.raw).byteLength;
  const geography=geographyApi.createGeographyRuntime(geographyContent.createUkGeographyRegistry()),settlements=settlementApi.createSettlementRuntime(settlementContent.createUkSettlementContentRegistry(),geography),context={geography,settlements};
  if(!content.validGameWithContent(game,context))throw Error('Country Start content validation failed.');
  const name='turning-pages-country-start-v3-review-'+browser,emptyLegacy={getItem:()=>null,setItem:()=>{}};
  const pending=new Set<Promise<void>>(),originalTransaction=IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction=function(...args:Parameters<IDBDatabase['transaction']>){
   const tx=originalTransaction.apply(this,args);
   if(this.name===name){const done=new Promise<void>((resolve,reject)=>{tx.addEventListener('complete',()=>resolve(),{once:true});tx.addEventListener('abort',()=>reject(tx.error),{once:true});});pending.add(done);void done.then(()=>pending.delete(done),()=>pending.delete(done));}
   return tx;
  };
  let first:any,second:any,saveMs=0,loadMs=0;
  try{
   first=await service.GamePersistence.open(emptyLegacy,indexedDB,name);
   let start=performance.now();await first.save(game,null);saveMs=performance.now()-start;
   await Promise.all([...pending]);first.close();
   second=await service.GamePersistence.open(emptyLegacy,indexedDB,name);
   start=performance.now();const loaded=await second.initialize();loadMs=performance.now()-start;
   if(!loaded.game||JSON.stringify(loaded.game)!==JSON.stringify(save.upgradeGameToCurrent(game))||!content.validGameWithContent(loaded.game,context))throw Error('Country Start real IndexedDB roundtrip failed.');
   const cohort=loaded.game.population!.cohorts.find(item=>item.birthYear===2000)!;
   const next=extraction.instantiateFromCohortWithContent({people:loaded.game.people!,population:loaded.game.population!,rootSeed:73,cohortId:cohort.id,requestKey:'country-start.uk.mid-2024-v3.browser-review',count:1,referenceDate:{year:2024,month:6,day:30},contentRegistry:human.createUkHumanGenerationContentRegistry()});
   const nextHome=residence.establishResidence(loaded.game.residence!,['person:2'],loaded.game.residence!.residences[0].location,{...context,people:next.people});
   const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw.raw)))].map(b=>b.toString(16).padStart(2,'0')).join('');
   return {browser,moduleImportMs,moduleStages,samples,bytes,oldBytes,delta:bytes-oldBytes,sha256,saveMs,loadMs,constructorVersion:game.version,rootVersion:loaded.game.version,household:loaded.game.household,residenceCount:loaded.game.residence!.residences.length,occupants:loaded.game.residence!.occupants.length,population:population.deriveCountryPopulation(next.population,next.people,'uk').knownLiving,nextPerson:next.persons[0].id,nextResidence:nextHome.residence.id};
  }finally{
   await Promise.all([...pending]);first?.close();second?.close();
   IDBDatabase.prototype.transaction=originalTransaction;
   await new Promise<void>((resolve,reject)=>{const deletion=indexedDB.deleteDatabase(name);deletion.onsuccess=()=>resolve();deletion.onerror=()=>reject(deletion.error);deletion.onblocked=()=>reject(Error('Country Start review cleanup blocked.'));});
  }
 },testInfo.project.name);
 expect(result).toMatchObject({constructorVersion:4,rootVersion:5,household:{version:1,nextSequence:1,households:[],memberships:[]},residenceCount:1,occupants:1,population:69_281_437,nextPerson:'person:2',nextResidence:'residence:2',bytes:9_595_786,oldBytes:9_595_391,delta:395});
 expect(result.sha256).toBe('e926ef8d1528356d3bc92abf23934974e9de2a14fc19ed08fb29410f51839a28');
 for(const sample of result.samples.filter(item=>item.version===3))expect(sample.blockedHeartbeatMs).toBeLessThanOrEqual(1_000);
 // Existing validated-load acceptance remains unchanged.
 expect(result.loadMs).toBeLessThanOrEqual(3_000);
 console.log(JSON.stringify({gate:'country-start-v3-browser-freeze',...result}));
 await testInfo.attach('country-start-v3-measurements',{body:JSON.stringify(result,null,2),contentType:'application/json'});
});

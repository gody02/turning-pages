import {expect,test} from '@playwright/test';

test('built LifeApp loads exact Residence content responsively and retains production v2 routing',async({page,context},testInfo)=>{
 await page.goto('testing/blank.html');
 const baseline=await page.evaluate(async()=>{
  const api=await import('/application-content-evidence/testing/testing.js'),game=await api.createUkMid2024GeographicResidenceGame({version:1,rootSeed:73,mode:'adult'});
  const raw=api.serializeGame(game);if(!raw.ok)throw Error('Fixture failed canonical save.');
  const persistence=await api.GamePersistence.open(localStorage);try{await persistence.save(game,null);}finally{persistence.close();api.disposeUkCountryStartStartup();}
  return {raw:raw.raw,name:game.name};
 });
 // Sample the active Worker and main heap via Chromium's actual isolate diagnostics.
 // Samples are near-simultaneous observations, not an invented mobile/RSS limit.
 const combined:any={supported:false,samples:[],workerTargets:0,detachedWorkers:0};let memorySession:any,timer:ReturnType<typeof setInterval>|undefined;
 if(testInfo.project.name==='chromium'){
  memorySession=await context.newCDPSession(page);const active=new Set<string>();let request=0,sampling=false;
  memorySession.on('Target.attachedToTarget',(event:any)=>{if(event.targetInfo.type==='worker'){active.add(event.sessionId);combined.workerTargets++;}});
  memorySession.on('Target.detachedFromTarget',(event:any)=>{if(active.delete(event.sessionId))combined.detachedWorkers++;});
  memorySession.on('Target.receivedMessageFromTarget',(event:any)=>{const response=JSON.parse(event.message);if(response.result&&typeof response.result.usedSize==='number')combined.samples.push({realm:'worker',at:Date.now(),...response.result});});
  await memorySession.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:false});combined.supported=true;
  timer=setInterval(()=>{if(sampling)return;sampling=true;void (async()=>{try{for(const sessionId of active)await memorySession.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id:++request,method:'Runtime.getHeapUsage'})});const heap=await memorySession.send('Runtime.getHeapUsage');combined.samples.push({realm:'main',at:Date.now(),...heap});}catch{/* A terminating transient realm has no surviving memory authority. */}finally{sampling=false;}})();},50);
 }
 await page.addInitScript(()=>{
  let last=performance.now(),maximum=0,beats=0,frames=0,firstFrameMs:number|null=null,preApplicationNavigationGapMs=0,applicationStartedMs=0,peakMainHeapBytes:number|null=null;
  const pulse=()=>{const now=performance.now();maximum=Math.max(maximum,now-last);last=now;beats++;const used=(performance as any).memory?.usedJSHeapSize;if(typeof used==='number')peakMainHeapBytes=Math.max(peakMainHeapBytes??0,used);};const timer=setInterval(pulse,16);
  const paint=()=>{frames++;if(firstFrameMs===null&&document.querySelector('.creation-card,.dashboard'))firstFrameMs=performance.now();requestAnimationFrame(paint);};requestAnimationFrame(paint);
  Object.assign(globalThis,{__handoffObservation:{start:()=>{pulse();preApplicationNavigationGapMs=maximum;maximum=0;last=performance.now();applicationStartedMs=last;},finish:()=>{pulse();clearInterval(timer);return {maxHeartbeatGapMs:maximum,preApplicationNavigationGapMs,beats,frames,firstFrameMs,applicationStartedMs,peakMainHeapBytes};}}});
 });
 await page.goto('./');await expect(page.locator('.dashboard')).toBeVisible();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 const result=await page.evaluate(async()=>{
  const global=globalThis as any,observation=global.__handoffObservation.finish(),host=global.__applicationContent,game=global.__acceptedApplicationGame,api=await import('/application-content-evidence/testing/testing.js');
  const context=host.lifecycleContent(game),raw=api.serializeGame(game);if(!raw.ok||!api.validGameWithContent(game,context))throw Error('Application content acceptance changed Game.');
  const metrics=host.applicationContentDiagnostics(),load=performance.getEntriesByName('application-validated-load').at(-1)!.duration;
  const identities=context.geography.registry.places.length,settlements=context.settlements.registry.packages[0].settlements.length,relations=context.settlements.registry.packages[0].administrativeRelations.length;
  for(let i=0;i<5;i++)await host.acceptApplicationGame(game);const repeated=host.applicationContentDiagnostics();
  const continuation=await api.continueSavedGame(game,context);
  return {...observation,metrics,loadMs:load,raw:raw.raw,identities,settlements,relations,repeated,continuation,population:api.deriveCountryPopulation(game.population,game.people,'uk').knownLiving,exhaustiveLookupParityEvidence:'separate-unit-suite'};
 });
 if(timer)clearInterval(timer);if(memorySession)await memorySession.detach();
 console.log(JSON.stringify({gate:'application-content-handoff-phase-measurements',browser:testInfo.project.name,...result,raw:undefined}));
 expect(result.raw).toBe(baseline.raw);expect(result).toMatchObject({identities:366,settlements:2698,relations:2736,population:69_281_437,continuation:{nextPerson:'person:2',nextResidence:'residence:2'}});expect(result.metrics).toMatchObject({activeWorkers:0,cachedSets:1,pendingSets:0,preparations:1});expect(result.repeated.preparations).toBe(1);
 expect(result.maxHeartbeatGapMs).toBeLessThan(1_000);expect(result.loadMs).toBeLessThan(3_000);expect(result.metrics.last.referenceContentReadyMs).toBeLessThan(3_000);
 let memory:any={heapCountersUnsupported:true,mobileNotMeasured:true};
 if(testInfo.project.name==='chromium'){
  const cdp=await context.newCDPSession(page);await cdp.send('HeapProfiler.collectGarbage');const retained=await cdp.send('Runtime.getHeapUsage');
  for(let i=0;i<3;i++){await page.evaluate(async()=>{const global=globalThis as any;await global.__applicationContent.acceptApplicationGame(global.__acceptedApplicationGame);});}
  await cdp.send('HeapProfiler.collectGarbage');const repeated=await cdp.send('Runtime.getHeapUsage');memory={retained,repeated,mobileNotMeasured:true};await cdp.detach();
 }
 // Actual production form is still v2: this test never substitutes its initializer.
 await page.getByRole('button',{name:'New life ↗'}).click();await page.getByLabel('Your name · optional').fill('Content Routing Check');await page.getByRole('button',{name:'Begin my story'}).click();await expect(page.locator('.dashboard h1')).toHaveText('Content Routing Check');
 const routing=await page.evaluate(async()=>{const api=await import('/application-content-evidence/testing/testing.js'),persistence=await api.GamePersistence.open(localStorage);try{const loaded=await persistence.initialize();return {source:loaded.game!.population!.coverage[0].source,residences:loaded.game!.version===4?loaded.game!.residence.residences.length:-1,player:loaded.game!.people!.playerId};}finally{persistence.close();}});
 expect(routing).toMatchObject({source:'uk.population.mid-2024.v3',residences:0,player:'person:1'});
 const evidence={browser:testInfo.project.name,...result,raw:undefined,canonicalEquality:true,memory:{...memory,combined},routing,productionCountryStart:'country-start.uk.mid-2024-v2'};
 await testInfo.attach('application-content-handoff',{body:JSON.stringify(evidence,null,2),contentType:'application/json'});console.log(JSON.stringify({gate:'application-content-handoff',...evidence}));
});

test('failed real content Worker preserves the saved Game and retries without replacement or seed draw',async({page})=>{
 await page.goto('testing/blank.html');
 const baseline=await page.evaluate(async()=>{
  const api=await import('/application-content-evidence/testing/testing.js'),game=await api.createUkMid2024GeographicResidenceGame({version:1,rootSeed:73,mode:'adult'}),encoded=api.serializeGame(game);
  if(!encoded.ok)throw Error('Invalid acceptance fixture');const persistence=await api.GamePersistence.open(localStorage);
  try{const first=await persistence.save(game,null),revision=await persistence.save(game,first);return {raw:encoded.raw,revision};}finally{persistence.close();api.disposeUkCountryStartStartup();}
 });
 await page.addInitScript(()=>{const native=crypto.getRandomValues.bind(crypto);Object.assign(globalThis,{__seedDraws:0});crypto.getRandomValues=(array:any)=>{(globalThis as any).__seedDraws++;return native(array);};});
 await page.route('**/assets/worker-*.js',route=>route.abort());await page.goto('./');
 await expect(page.getByRole('heading',{name:'Your saved life is safe.'})).toBeVisible();await expect(page.getByRole('button',{name:'Export saved life'})).toBeVisible();await expect(page.locator('.dashboard')).toHaveCount(0);
 const inspect=()=>page.evaluate(async()=>{const api=await import('/application-content-evidence/testing/testing.js'),p=await api.GamePersistence.open(localStorage);try{const loaded=await p.initialize(),encoded=api.serializeGame(loaded.game!);if(!encoded.ok)throw Error('Invalid persisted fixture');return {raw:encoded.raw,revision:loaded.revision,seeds:(globalThis as any).__seedDraws};}finally{p.close();}});
 expect(await inspect()).toEqual({...baseline,seeds:0});await page.unroute('**/assets/worker-*.js');await page.getByRole('button',{name:'Retry loading'}).click();await expect(page.locator('.dashboard')).toBeVisible();
 expect(await inspect()).toEqual({...baseline,seeds:0});expect(await page.evaluate(()=>{const host=(globalThis as any).__applicationContent;return host.applicationContentDiagnostics();})).toMatchObject({preparations:2,activeWorkers:0,pendingSets:0,cachedSets:1});
 await page.getByRole('button',{name:/Finances/}).click();await expect(page.getByRole('button',{name:'Restore previous successful save'})).toBeVisible();
});

test('valid backup with unavailable reference content is not mislabeled corrupt and never replaces the current life',async({page})=>{
 await page.goto('testing/blank.html');
 const backup=await page.evaluate(async()=>{const api=await import('/application-content-evidence/testing/testing.js');try{const game=await api.createUkMid2024GeographicResidenceGame({version:1,rootSeed:73,mode:'adult'}),encoded=api.serializeGame(game);if(!encoded.ok)throw Error('Invalid fixture');return encoded.raw;}finally{api.disposeUkCountryStartStartup();}});
 await page.goto('./');await page.getByLabel('Your name · optional').fill('Current Life');await page.getByRole('button',{name:'Begin my story'}).click();await expect(page.locator('.dashboard h1')).toHaveText('Current Life');
 const saved=()=>page.evaluate(async()=>{const api=await import('/application-content-evidence/testing/testing.js'),p=await api.GamePersistence.open(localStorage);try{const loaded=await p.initialize(),encoded=api.serializeGame(loaded.game!);if(!encoded.ok)throw Error('Invalid current life');return {raw:encoded.raw,revision:loaded.revision};}finally{p.close();}}),baseline=await saved();
 const file={name:'valid-life.json',mimeType:'application/json',buffer:Buffer.from(backup,'utf8')};
 await page.route('**/assets/worker-*.js',route=>route.abort());await page.locator('input[type=file]').setInputFiles(file);
 await expect(page.locator('.notice')).toContainText('Geographic reference content for this backup could not be loaded');await expect(page.locator('.town-confirm')).toHaveCount(0);await expect(page.locator('.dashboard h1')).toHaveText('Current Life');expect(await saved()).toEqual(baseline);
 await page.unroute('**/assets/worker-*.js');await page.locator('input[type=file]').setInputFiles(file);await expect(page.getByRole('button',{name:'Restore this life'})).toBeVisible();expect(await saved()).toEqual(baseline);
});

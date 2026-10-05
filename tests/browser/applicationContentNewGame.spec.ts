import {expect,test,type Page} from '@playwright/test';

async function observe(page:Page){await page.addInitScript(()=>{
 const native=crypto.getRandomValues.bind(crypto);let draws=0;
 crypto.getRandomValues=(array:any)=>{if(array instanceof Uint32Array&&array.length===1){draws++;array[0]=73;return array;}return native(array);};
 let started=0,last=0,max=0,beats=0,timer:any,finished:any;
 const pulse=()=>{const now=performance.now();max=Math.max(max,now-last);last=now;beats++;};
 document.addEventListener('submit',()=>{if(started)return;started=last=performance.now();timer=setInterval(pulse,16);},true);
 new MutationObserver(()=>{if(started&&!finished&&document.querySelector('.dashboard')){pulse();clearInterval(timer);finished={totalMs:performance.now()-started,maxInteractionGapMs:max,beats,draws};}}).observe(document,{childList:true,subtree:true});
 Object.assign(globalThis,{__freshObservation:()=>finished,__seedDraws:()=>draws});
 });}

for(const mode of ['adult','childhood'] as const)test(`actual production ${mode} Class C: one Worker request, complete first save, equality and continuation`,async({page},testInfo)=>{
 await observe(page);await page.goto('./');await page.getByLabel('Where your story begins').selectOption(mode);
 await page.getByRole('button',{name:'Begin my story'}).click();const busy=page.getByRole('button',{name:'Creating your world…'});await expect(busy).toBeDisabled();
 await page.evaluate(()=>{const form=document.querySelector('form.creation-card')!;form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 await page.getByLabel('Where your story begins').selectOption(mode==='adult'?'childhood':'adult');await page.getByLabel('Where your story begins').selectOption(mode);
 await page.evaluate(()=>document.querySelector('form.creation-card')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 await page.locator('.dashboard').waitFor({timeout:120_000});await expect(page.locator('.dashboard')).toBeVisible();
 const result=await page.evaluate(async mode=>{
  const global=globalThis as any,measurement=global.__freshObservation(),calls={...global.__newGameCalls},game=global.__acceptedApplicationGame,host=global.__applicationContent,content=host.lifecycleContent(game),api=await import('/application-content-evidence/testing/testing.js');
  const raw=api.serializeCurrentGame(game);if(!raw.ok||!api.validGameWithContent(game,content))throw Error('Invalid activated Game');
  const p=await api.GamePersistence.open(localStorage);let loaded,revision;try{const initial=await p.initialize();loaded=initial.game;revision=initial.revision;}finally{p.close();}
  const saved=api.serializeCurrentGame(loaded!);if(!saved.ok)throw Error('Invalid saved Game');
  const direct=await api.createUkMid2024GeographicResidenceGame({version:1,rootSeed:73,mode}),historical=api.serializeGame(direct),reference=api.serializeCurrentGame(api.upgradeGameToCurrent(direct));api.disposeUkCountryStartStartup();if(!reference.ok||!historical.ok||direct.version!==4)throw Error('Invalid direct reference');const {household,kinship,...preHousehold}=game,projection=api.serializeGame({...preHousehold,version:4});if(!projection.ok||projection.raw!==historical.raw)throw Error('Frozen constructor projection changed');
  return {...measurement,calls,scenario:global.__productionScenario,source:game.population.coverage[0].source,rootVersion:game.version,constructorVersion:direct.version,household:game.household,kinship:game.kinship,age:game.age,date:game.clock.date,dob:game.people.people[0].dateOfBirth,player:game.people.playerId,nextSequence:game.people.nextSequence,residences:game.residence.residences.length,occupants:game.residence.occupants.length,noFixed:game.residence.noFixedAbodePersonIds.length,population:api.deriveCountryPopulation(game.population,game.people,'uk').knownLiving,canonicalEquality:raw.raw===reference.raw,saveEquality:raw.raw===saved.raw,revision,bytes:new TextEncoder().encode(raw.raw).byteLength,content:host.applicationContentDiagnostics(),continuation:await api.continueSavedGame(loaded,content)};
 },mode);
 expect(result).toMatchObject({scenario:'country-start.uk.mid-2024-v3',source:'uk.population.mid-2024.v3',rootVersion:6,constructorVersion:4,household:{version:1,nextSequence:1,households:[],memberships:[]},kinship:{version:1,parentages:[]},age:mode==='adult'?18:0,date:{year:2024,month:6,day:30},dob:{year:mode==='adult'?2006:2024,month:6,day:30},player:'person:1',nextSequence:2,residences:1,occupants:1,noFixed:0,population:69_281_437,canonicalEquality:true,saveEquality:true,revision:1,draws:1,calls:{constructions:1,saves:1,activations:1},continuation:{nextPerson:'person:2',nextResidence:'residence:2'},content:{preparations:1,activeWorkers:0,pendingSets:0,cachedSets:1}});
 expect(result.maxInteractionGapMs).toBeLessThan(1_000);
 const evidence={gate:'production-new-game-v3-class-c',browser:testInfo.project.name,mode,...result,class:'C',busyVisible:true,classCPass:true,totalLatencyRecordedNotNormalSaveLoad:true};
 console.log(JSON.stringify(evidence));await testInfo.attach('production-new-game',{body:JSON.stringify(evidence,null,2),contentType:'application/json'});
 // Real page reload goes through persistence only, never Country Start.
 await page.reload();await expect(page.locator('.dashboard')).toBeVisible();expect(await page.evaluate(()=>(globalThis as any).__newGameCalls)).toEqual({constructions:0,saves:0,activations:0});
});

test('invalid input, real Worker failure, cancellation, navigation, retry and second world preserve host authority',async({page})=>{
 await observe(page);await page.goto('./');await page.getByLabel('Your name · optional').fill('x'.repeat(257));await page.getByRole('button',{name:'Begin my story'}).click();await expect(page.locator('.notice')).toContainText('256');expect(await page.evaluate(()=>(globalThis as any).__seedDraws())).toBe(0);
 await page.getByLabel('Your name · optional').fill('');await page.route('**/assets/countryStartResidence.worker-*.js',route=>route.abort());await page.getByRole('button',{name:'Begin my story'}).click();await expect(page.locator('.notice')).toContainText('could not be created or saved');await expect(page.locator('.dashboard')).toHaveCount(0);
 const stored=()=>page.evaluate(async()=>{const api=await import('/application-content-evidence/testing/testing.js'),p=await api.GamePersistence.open(localStorage);try{const loaded=await p.initialize();return {game:!!loaded.game,revision:loaded.revision};}finally{p.close();}});expect(await stored()).toEqual({game:false,revision:null});
 await page.unroute('**/assets/countryStartResidence.worker-*.js');await page.getByRole('button',{name:'Begin my story'}).click();await expect(page.getByRole('button',{name:'Cancel creation'})).toBeEnabled();await page.getByRole('button',{name:'Cancel creation'}).click();await expect(page.getByRole('button',{name:'Begin my story'})).toBeEnabled();expect(await stored()).toEqual({game:false,revision:null});
 await page.getByRole('button',{name:'Begin my story'}).click();await page.evaluate(()=>{location.hash='#career';});await expect(page.getByRole('button',{name:'Begin my story'})).toBeEnabled();expect(await stored()).toEqual({game:false,revision:null});
 await page.getByRole('button',{name:'Begin my story'}).click();await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await expect(page.getByRole('button',{name:'Begin my story'})).toBeEnabled();expect(await stored()).toEqual({game:false,revision:null});
 await page.getByLabel('Your name · optional').fill('First World');await page.getByRole('button',{name:'Begin my story'}).click();await page.locator('.dashboard').waitFor({timeout:120_000});await expect(page.locator('.dashboard h1')).toHaveText('First World');
 await page.getByRole('button',{name:'New life ↗'}).click();await page.getByLabel('Your name · optional').fill('Second World');await page.getByLabel('Gender label · optional').fill('Self-described');await page.getByLabel('Where your story begins').selectOption('adult');await page.getByRole('button',{name:'Begin my story'}).click();await page.locator('.dashboard').waitFor({timeout:120_000});await expect(page.locator('.dashboard h1')).toHaveText('Second World');
 const final=await page.evaluate(()=>{const global=globalThis as any,game=global.__acceptedApplicationGame;return {calls:global.__newGameCalls,draws:global.__seedDraws(),age:game.age,gender:game.people.people[0].genderLabel,residences:game.residence.residences.length,personSequence:game.people.nextSequence,residenceSequence:game.residence.nextSequence,content:global.__applicationContent.applicationContentDiagnostics()};});
 expect(final).toMatchObject({draws:6,calls:{constructions:6,saves:2,activations:2},age:18,gender:'Self-described',residences:1,personSequence:2,residenceSequence:2,content:{activeWorkers:0,pendingSets:0,cachedSets:1,preparations:1}});await page.reload();await expect(page.locator('.dashboard h1')).toHaveText('Second World');expect(await page.evaluate(()=>(globalThis as any).__newGameCalls.constructions)).toBe(0);
 console.log(JSON.stringify({gate:'production-new-game-v3-lifecycle',passed:true,final}));
});

test('migrated root3 saved world bypasses Country Start without retrospective Residence',async({page})=>{
 await page.goto('testing/blank.html');const original=await page.evaluate(async()=>{const api=await import('/application-content-evidence/testing/testing.js'),raw=await api.historicalRoot3Raw();localStorage.setItem('turning-pages:v1',raw);return JSON.parse(raw).people.people[0];});
 await observe(page);await page.goto('./');await expect(page.locator('.dashboard h1')).toHaveText('Historical Life');
 const result=await page.evaluate(async()=>{const global=globalThis as any,api=await import('/application-content-evidence/testing/testing.js'),p=await api.GamePersistence.open(localStorage);try{const initial=await p.initialize();return {calls:global.__newGameCalls,draws:global.__seedDraws(),version:initial.game!.version,player:initial.game!.people!.people[0],residences:initial.game!.version===6?initial.game!.residence.residences.length:-1,content:global.__applicationContent.applicationContentDiagnostics()};}finally{p.close();}});
 expect(result).toMatchObject({calls:{constructions:0,saves:0,activations:0},draws:0,version:6,player:original,residences:0,content:{preparations:0,activeWorkers:0,pendingSets:0}});console.log(JSON.stringify({gate:'production-new-game-v3-old-save',passed:true}));
});

test('atomic first-save failure preserves storage and a fresh legitimate retry uses the standard coordinator',async({page},testInfo)=>{
 await observe(page);await page.setViewportSize({width:390,height:844});await page.goto('./');
 await page.evaluate(()=>{const native=IDBObjectStore.prototype.put;Object.assign(globalThis,{__restorePut:()=>{IDBObjectStore.prototype.put=native;}});IDBObjectStore.prototype.put=function(value:any,...args:any[]){if(value?.slotId==='primary')throw new DOMException('Injected first-save quota failure','QuotaExceededError');return (native as any).call(this,value,...args);};});
 await page.getByRole('button',{name:'Begin my story'}).click();await expect(page.getByRole('button',{name:'Creating your world…'})).toBeDisabled();await testInfo.attach('mobile-creating-world',{body:await page.screenshot(),contentType:'image/png'});
 await expect(page.locator('.notice')).toContainText('could not be created or saved',{timeout:120_000});await expect(page.locator('.dashboard')).toHaveCount(0);
 const failed=await page.evaluate(async()=>{const api=await import('/application-content-evidence/testing/testing.js'),p=await api.GamePersistence.open(localStorage);try{const initial=await p.initialize();return {hasGame:!!initial.game,revision:initial.revision,calls:(globalThis as any).__newGameCalls};}finally{p.close();}});expect(failed).toEqual({hasGame:false,revision:null,calls:{constructions:1,saves:1,activations:0}});
 await page.evaluate(()=>(globalThis as any).__restorePut());await page.getByRole('button',{name:'Begin my story'}).click();await page.locator('.dashboard').waitFor({timeout:120_000});
 expect(await page.evaluate(()=>(globalThis as any).__newGameCalls)).toEqual({constructions:2,saves:2,activations:1});await testInfo.attach('mobile-complete-world',{body:await page.screenshot(),contentType:'image/png'});console.log(JSON.stringify({gate:'production-new-game-v3-save-failure',passed:true}));
});

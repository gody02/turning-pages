// Actual built UI preflight. Routing substitutions are diagnostic only;
// production source remains untouched until the mandatory fresh-route gate passes.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {build,preview} from 'vite';
import {chromium,firefox,webkit} from '@playwright/test';
import {startupWorkerJsonAssets} from '../../scripts/lib/startup-worker-json.ts';
const directory='research/new-game-v3-routing',base='/new-game-v3-routing/',outDir=directory+'/dist';
const sha=value=>createHash('sha256').update(value).digest('hex');
const files=['src/ui/newGame.ts','src/ui/LifeApp.tsx','src/ui/gameContent.ts'];
const sources=Object.fromEntries(files.map(file=>[file,fs.readFileSync(file,'utf8')]));
const hashes=Object.fromEntries(files.map(file=>[file,sha(fs.readFileSync(file))]));
const routing=sources[files[0]]
 .replace("import {createUkMid2024GeographicGame} from '../data/uk/countryStartGeographic';","import {createUkMid2024GeographicResidenceGame} from '../data/countryStart/uk/countryStartResidence';")
 .replace('bootstrap:(request:UkMid2024StartRequestV1)=>Game','bootstrap:(request:UkMid2024StartRequestV1)=>Promise<Game>')
 .replace('bootstrap:createUkMid2024GeographicGame','bootstrap:createUkMid2024GeographicResidenceGame')
 .replace('custom:NewGameDependencies=dependencies):Game{','custom:NewGameDependencies=dependencies):Promise<Game>{');
const app=sources[files[1]]
 .replace('const [creating,setCreating]=useState(false);','const [creating,setCreating]=useState(false);\n  const [starting,setStarting]=useState(false);const submitting=useRef(false);')
 .replace('async function beginNewGame(){try{const next=createProductionUkNewGame','async function beginNewGame(){if(submitting.current)return;submitting.current=true;setStarting(true);const mode=start;try{performance.mark("routing-construction:start");const next=await createProductionUkNewGame')
 .replace("genderLabel:gender});await persistReplacement(next,'');setTab(start===","genderLabel:gender});performance.measure('routing-construction','routing-construction:start');await persistReplacement(next,'');setTab(mode===")
 .replace("Your current life is unchanged.');}}\n  async function retryReferenceContent","Your current life is unchanged.');}finally{submitting.current=false;setStarting(false);}}\n  async function retryReferenceContent")
 .replace('const signal=referenceLifetime.current?.signal;await acceptApplicationGame(next','const signal=referenceLifetime.current?.signal;performance.mark("routing-content:start");await acceptApplicationGame(next')
 .replace('const coordinator=coordinatorRef.current,persistence=persistenceRef.current;','performance.measure("routing-content","routing-content:start");const coordinator=coordinatorRef.current,persistence=persistenceRef.current;')
 .replace('await coordinator.persist(next);if(signal?.aborted)return;','performance.mark("routing-save:start");await coordinator.persist(next);performance.measure("routing-save","routing-save:start");if(signal?.aborted)return;')
 .replace('skipAutosave.current=next;setGame(next);','skipAutosave.current=next;setGame(next);Object.assign(globalThis,{__routingGame:next});')
 .replace('<button className="primary" type="submit">Begin my story <span>→</span></button>','<button className="primary" type="submit" disabled={starting}>{starting?"Preparing your story…":"Begin my story"} <span>→</span></button>');
if(!routing.includes('bootstrap:createUkMid2024GeographicResidenceGame')||!app.includes('const next=await createProductionUkNewGame'))throw Error('Candidate substitution failed.');
fs.writeFileSync(directory+'/newGame.candidate.txt',routing);fs.writeFileSync(directory+'/LifeApp.candidate.txt',app);
const observations={name:'bounded-routing-preflight',enforce:'pre',transform(source,id){const file=id.replaceAll('\\','/').split('?')[0];if(file.endsWith('/src/ui/newGame.ts'))return routing;if(file.endsWith('/src/ui/LifeApp.tsx'))return app;if(file.endsWith('/src/ui/gameContent.ts'))return source+'\nObject.assign(globalThis,{__routingContent:{lifecycleContent,applicationContentDiagnostics}});';}};
await build({plugins:[observations],base,build:{outDir,emptyOutDir:true,manifest:true}});
await build({configFile:false,publicDir:false,base:base+'testing/',worker:{format:'es',plugins:()=>[startupWorkerJsonAssets()]},build:{target:'es2022',outDir:outDir+'/testing',emptyOutDir:true,rollupOptions:{input:'research/application-content-handoff/implementation-browser-entry.ts',preserveEntrySignatures:'strict',output:{entryFileNames:'testing.js'}}}});
const assets=fs.readdirSync(outDir+'/assets'),main=assets.find(file=>file.startsWith('index-')&&file.endsWith('.js')),mainText=fs.readFileSync(outDir+'/assets/'+main,'utf8');
const bundle={mainFile:main,mainBytes:Buffer.byteLength(mainText),heavySettlementInMain:mainText.includes('settlement.uk.'),heavyGeographicPopulationInMain:mainText.includes('uk.population.mid-2024.v3'),countryStartWorkers:assets.filter(file=>file.startsWith('countryStartResidence.worker-')),applicationWorkers:assets.filter(file=>file.startsWith('worker-'))};
if(bundle.heavySettlementInMain||bundle.heavyGeographicPopulationInMain||!bundle.countryStartWorkers.length||!bundle.applicationWorkers.length)throw Error('Main/Worker boundary failed.');
const server=await preview({base,build:{outDir},preview:{host:'127.0.0.1',port:4189,strictPort:true}}),results=[];
try{for(const [browserName,type] of [['chromium',chromium],['webkit',webkit],['firefox',firefox]]){let browser;try{
 browser=await type.launch();const page=await browser.newPage();
 await page.addInitScript(()=>{
  let draws=0;const native=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=array=>{if(array instanceof Uint32Array&&array.length===1){draws++;array[0]=73;return array;}return native(array);};
  let started=0,last=0,maximum=0,beats=0,timer,finished;
  const pulse=()=>{const now=performance.now();maximum=Math.max(maximum,now-last);last=now;beats++;};
  document.addEventListener('submit',()=>{if(started)return;started=last=performance.now();timer=setInterval(pulse,16);},true);
  new MutationObserver(()=>{if(started&&!finished&&document.querySelector('.dashboard')){pulse();clearInterval(timer);finished={totalMs:performance.now()-started,maxInteractionGapMs:maximum,beats,draws,phases:performance.getEntriesByType('measure').filter(entry=>entry.name.startsWith('routing-')).map(entry=>({name:entry.name,startMs:entry.startTime-started,durationMs:entry.duration}))};}}).observe(document,{childList:true,subtree:true});
  Object.assign(globalThis,{__routingMeasurement:()=>finished});
 });
 await page.goto('http://127.0.0.1:4189'+base);await page.getByLabel('Where your story begins').selectOption('adult');await page.getByRole('button',{name:'Begin my story'}).click();await page.locator('.dashboard').waitFor({timeout:120_000});
 const measurement=await page.evaluate(()=>globalThis.__routingMeasurement());
 // Timing ends at the actual ready dashboard, before diagnostic tool imports.
 const proof=await page.evaluate(async()=>{
  const api=await import('/new-game-v3-routing/testing/testing.js'),game=globalThis.__routingGame,content=globalThis.__routingContent,context=content.lifecycleContent(game),canonical=api.serializeGame(game);
  if(!canonical.ok||!api.validGameWithContent(game,context))throw Error('Invalid activated Game.');
  const persistence=await api.GamePersistence.open(localStorage);let loaded,revision;try{const initial=await persistence.initialize();loaded=initial.game;revision=initial.revision;}finally{persistence.close();}
  const saved=api.serializeGame(loaded);if(!saved.ok)throw Error('Invalid saved Game.');
  const direct=await api.createUkMid2024GeographicResidenceGame({version:1,rootSeed:73,mode:'adult'}),reference=api.serializeGame(direct);api.disposeUkCountryStartStartup();if(!reference.ok)throw Error('Invalid direct v3.');
  return {rootVersion:game.version,age:game.age,date:game.clock.date,dob:game.people.people[0].dateOfBirth,player:game.people.playerId,nextSequence:game.people.nextSequence,residences:game.residence.residences.length,occupants:game.residence.occupants.length,noFixed:game.residence.noFixedAbodePersonIds.length,population:api.deriveCountryPopulation(game.population,game.people,'uk').knownLiving,areaId:game.population.memberships[0].areaId,source:game.population.coverage[0].source,canonicalDirectV3Equality:canonical.raw===reference.raw,saveEquality:saved.raw===canonical.raw,revision,bytes:new TextEncoder().encode(canonical.raw).byteLength,content:content.applicationContentDiagnostics(),continuation:await api.continueSavedGame(loaded,context)};
 });
 const result={browser:browserName,...measurement,...proof,normalInteractionPass:measurement.maxInteractionGapMs<1_000,normalCompleteReadyPass:measurement.totalMs<3_000};results.push(result);console.log(JSON.stringify(result));
 }catch(error){results.push({browser:browserName,error:String(error)});console.error(browserName,String(error));}finally{await browser?.close();fs.writeFileSync(directory+'/evidence.json',JSON.stringify({version:1,diagnosticBuildOnly:true,productionRouteUnchanged:'country-start.uk.mid-2024-v2',candidateRoute:'country-start.uk.mid-2024-v3',fingerprint:'fnv1a64-v1:321cc64911e88c5a',timer:'capture-phase form submit through first actual ready dashboard, including full cold Country Start, content, save and activation',bundle,originalHashes:hashes,results},null,2)+'\n');}}}
finally{await new Promise((resolve,reject)=>server.httpServer.close(error=>error?reject(error):resolve()));}
for(const file of files)if(sha(fs.readFileSync(file))!==hashes[file])throw Error('Production source changed: '+file);
if(results.some(result=>result.error||!result.normalInteractionPass||!result.normalCompleteReadyPass))process.exitCode=1;

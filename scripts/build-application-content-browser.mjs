// Real production UI/source, with observations only. No routing substitution or source edits.
import {build} from 'vite';
import fs from 'node:fs';
import {startupWorkerJsonAssets} from './lib/startup-worker-json.ts';
const directory='research/application-content-handoff/implementation-app-dist';
const observe={name:'application-content-observations',enforce:'pre',transform(source,id){
 const file=id.replaceAll('\\','/').split('?')[0];
 if(file.endsWith('/src/ui/gameContent.ts'))return source+'\nObject.assign(globalThis,{__applicationContent:{acceptApplicationGame,lifecycleContent,applicationContentDiagnostics,disposeApplicationContent,applicationResolversReady}});';
 if(file.endsWith('/src/ui/newGame.ts'))return source.replace('return custom.bootstrap(', '(globalThis as any).__newGameCalls.constructions++;return custom.bootstrap(')+'\nObject.assign(globalThis,{__productionScenario:PRODUCTION_UK_NEW_GAME_SCENARIO,__newGameCalls:{constructions:0,saves:0,activations:0}});';
 if(file.endsWith('/src/ui/LifeApp.tsx'))return source
  .replace('opened=await GamePersistence.open(localStorage);','globalThis.__handoffObservation?.start();performance.mark("application-load:start");opened=await GamePersistence.open(localStorage);')
  .replace('setGame(accepted);skipAutosave.current=accepted;','setGame(accepted);Object.assign(globalThis,{__acceptedApplicationGame:accepted});performance.measure("application-validated-load","application-load:start");skipAutosave.current=accepted;')
  .replace('async function commitReplacement(next:Game){','async function commitReplacement(next:Game){(globalThis as any).__newGameCalls.saves++;')
  .replace('skipAutosave.current=next;setGame(next);','skipAutosave.current=next;setGame(next);(globalThis as any).__newGameCalls.activations++;Object.assign(globalThis,{__acceptedApplicationGame:next});');
}};
await build({plugins:[observe],base:'/application-content-evidence/',build:{outDir:directory,emptyOutDir:true,manifest:true}});
await build({configFile:false,publicDir:false,base:'/application-content-evidence/testing/',worker:{format:'es',plugins:()=>[startupWorkerJsonAssets()]},build:{target:'es2022',outDir:directory+'/testing',emptyOutDir:true,rollupOptions:{input:'research/application-content-handoff/implementation-browser-entry.ts',preserveEntrySignatures:'strict',output:{entryFileNames:'testing.js'}}}});
fs.writeFileSync(directory+'/testing/blank.html','<!doctype html><title>Application content acceptance setup</title>');
// Enforce no Settlement reference graph newly pulled into main by the host service.
// Actual production routing uses the frozen lightweight public v3 Worker host.
const files=fs.readdirSync(directory+'/assets'),main=files.find(file=>file.startsWith('index-')&&file.endsWith('.js')),text=fs.readFileSync(directory+'/assets/'+main,'utf8');
if(text.includes('settlement.uk.')||text.includes('compiled-settlements-candidate.json')||text.includes('uk.population.mid-2024.v3'))throw Error('Main bundle contains eager national content.');
const worker=files.find(file=>file.startsWith('worker-')&&file.endsWith('.js'));if(!worker)throw Error('Application content Worker missing.');
const startupWorker=files.find(file=>file.startsWith('countryStartResidence.worker-'));if(!startupWorker)throw Error('Country Start Worker missing.');
fs.writeFileSync('research/application-content-handoff/implementation-bundle.json',JSON.stringify({version:1,base:'/application-content-evidence/',productionRoute:'country-start.uk.mid-2024-v3',mainFile:main,mainBytes:Buffer.byteLength(text),workerFile:worker,startupWorker,settlementRecordsInMain:false,applicationServiceImportsNationalData:false,heavyNationalContentInMain:false,workerJsonAssets:files.filter(file=>file.endsWith('.json'))},null,2)+'\n');

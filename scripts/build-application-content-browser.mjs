// Real production UI/source, with observations only. No routing substitution or source edits.
import {build} from 'vite';
import fs from 'node:fs';
import {startupWorkerJsonAssets} from './lib/startup-worker-json.ts';
const directory='research/application-content-handoff/implementation-app-dist';
const observe={name:'application-content-observations',enforce:'pre',transform(source,id){
 const file=id.replaceAll('\\','/').split('?')[0];
 if(file.endsWith('/src/ui/gameContent.ts'))return source+'\nObject.assign(globalThis,{__applicationContent:{acceptApplicationGame,lifecycleContent,applicationContentDiagnostics,disposeApplicationContent,applicationResolversReady}});';
 if(file.endsWith('/src/ui/LifeApp.tsx'))return source
  .replace('opened=await GamePersistence.open(localStorage);','globalThis.__handoffObservation?.start();performance.mark("application-load:start");opened=await GamePersistence.open(localStorage);')
  .replace('setGame(accepted);skipAutosave.current=accepted;','setGame(accepted);Object.assign(globalThis,{__acceptedApplicationGame:accepted});performance.measure("application-validated-load","application-load:start");skipAutosave.current=accepted;');
}};
await build({plugins:[observe],base:'/application-content-evidence/',build:{outDir:directory,emptyOutDir:true,manifest:true}});
await build({configFile:false,publicDir:false,base:'/application-content-evidence/testing/',worker:{format:'es',plugins:()=>[startupWorkerJsonAssets()]},build:{target:'es2022',outDir:directory+'/testing',emptyOutDir:true,rollupOptions:{input:'research/application-content-handoff/implementation-browser-entry.ts',preserveEntrySignatures:'strict',output:{entryFileNames:'testing.js'}}}});
fs.writeFileSync(directory+'/testing/blank.html','<!doctype html><title>Application content acceptance setup</title>');
// Enforce no Settlement reference graph newly pulled into main by the host service.
// Frozen production v2 still statically imports its own Geography/demographic/Human
// bootstrap graph; that existing domain dependency is deliberately not rewritten.
const files=fs.readdirSync(directory+'/assets'),main=files.find(file=>file.startsWith('index-')&&file.endsWith('.js')),text=fs.readFileSync(directory+'/assets/'+main,'utf8');
if(text.includes('settlement.uk.')||text.includes('compiled-settlements-candidate.json'))throw Error('Main bundle contains eager Settlement content.');
const worker=files.find(file=>file.startsWith('worker-')&&file.endsWith('.js'));if(!worker)throw Error('Application content Worker missing.');
fs.writeFileSync('research/application-content-handoff/implementation-bundle.json',JSON.stringify({version:1,base:'/application-content-evidence/',productionRoute:'country-start.uk.mid-2024-v2',mainFile:main,mainBytes:Buffer.byteLength(text),workerFile:worker,settlementRecordsInMain:false,applicationServiceImportsNationalData:false,existingV2BootstrapGeographyImportsRetained:true,workerJsonAssets:files.filter(file=>file.endsWith('.json'))},null,2)+'\n');

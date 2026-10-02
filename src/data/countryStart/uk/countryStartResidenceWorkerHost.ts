import {buildUkMid2024GeographicResidenceGame} from './countryStartResidenceConstruction';
import {prepareUkCountryStartResidenceContent} from './countryStartResidencePreparation';
import {STARTUP_CONTRACT,validStartupCommand,type StartupReply} from './countryStartResidenceProtocol';

/** Worker-only execution: no retained Game, commands/ticks/storage or simulation loop. */
export function attachStartupWorker(listen:(handler:(value:unknown)=>void)=>void,post:(reply:StartupReply)=>void){
 let prepared=false,preparationMs=0;
 listen(value=>{
  if(!validStartupCommand(value)){post({version:1,contract:STARTUP_CONTRACT,requestId:'0',kind:'failed',code:'protocol',message:'Invalid startup worker command.'});return;}
  const envelope={version:1 as const,contract:STARTUP_CONTRACT,requestId:value.requestId};
  try{
   if(value.kind==='prepare'){
    const started=performance.now();prepareUkCountryStartResidenceContent();preparationMs=performance.now()-started;prepared=true;
    post({...envelope,kind:'ready'});return;
   }
   if(!prepared)throw Error('Startup content is not prepared.');
   post({...envelope,kind:'progress',phase:'constructing-world'});
   const started=performance.now(),game=buildUkMid2024GeographicResidenceGame(value.request),constructionMs=performance.now()-started;
   // One Game clone; no JSON/bytes/report second payload or retained per-request reference.
   const workerHeapUsed=typeof process!=='undefined'&&process.versions?.node?process.memoryUsage().heapUsed:null;
   post({...envelope,kind:'complete',game,metrics:{preparationMs,constructionMs,emittedAt:performance.timeOrigin+performance.now(),workerHeapUsed}});
  }catch(error){
   let message='UK startup construction failed.';try{if(error instanceof Error&&error.message)message=error.message.slice(0,1_000);}catch{}
   post({...envelope,kind:'failed',code:value.kind==='prepare'?'preparation':'construction',message});
  }
 });
}

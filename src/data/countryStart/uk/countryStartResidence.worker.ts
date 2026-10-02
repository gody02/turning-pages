import {STARTUP_CONTRACT} from './countryStartResidenceProtocol';

// Separate bundle; the public client never evaluates this graph.
const scope=globalThis as unknown as {onmessage:((event:MessageEvent)=>void)|null;postMessage:(value:unknown)=>void};
// Keep the initial worker script small. Heavy content is loaded by the established
// worker realm, rather than embedded in the script passed to Worker creation.
let receive:(value:unknown)=>void;
const loaded=import('./countryStartResidenceWorkerHost').then(({attachStartupWorker})=>{
 attachStartupWorker(handler=>{receive=handler;},reply=>scope.postMessage(reply));
});
scope.onmessage=event=>{
 void loaded.then(()=>receive(event.data)).catch(()=>scope.postMessage({version:1,contract:STARTUP_CONTRACT,requestId:'0',kind:'failed',code:'preparation',message:'Startup worker modules could not be loaded.'}));
};

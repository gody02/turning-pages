import {attachStartupWorker} from './countryStartResidenceWorkerHost';

// Separate bundle; the public client never evaluates this graph.
const scope=globalThis as unknown as {onmessage:((event:MessageEvent)=>void)|null;postMessage:(value:unknown)=>void};
attachStartupWorker(handler=>{scope.onmessage=event=>handler(event.data);},reply=>scope.postMessage(reply));

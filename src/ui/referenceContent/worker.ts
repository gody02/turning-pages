import {validPrepareRequest,type ContentPrepareResponse} from './protocol';
import {loadRegisteredReferenceContent} from './ukLoader';

let used=false;
globalThis.onmessage=async(event:MessageEvent<unknown>)=>{
  if(used||!validPrepareRequest(event.data)){globalThis.postMessage({version:1,kind:'failed',requestId:1,message:'Invalid application-content preparation request.'} satisfies ContentPrepareResponse);return;}
  used=true;const request=event.data;
  try{
    const {data,importMs,prepareMs}=await loadRegisteredReferenceContent(request.exactSet);
    const payloadBytes=new TextEncoder().encode(JSON.stringify(data)).byteLength;
    globalThis.postMessage({version:1,kind:'ready',requestId:request.requestId,exactSet:request.exactSet,data,metrics:{importMs,prepareMs,payloadBytes,emittedAt:performance.timeOrigin+performance.now()}} satisfies ContentPrepareResponse);
  }catch{globalThis.postMessage({version:1,kind:'failed',requestId:request.requestId,message:'Exact geographic reference content could not be prepared.'} satisfies ContentPrepareResponse);}
};

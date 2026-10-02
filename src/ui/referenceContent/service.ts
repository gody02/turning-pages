import type {GameContentContext} from '../../engine/gameContent';
import {normalizeReferenceSet,referenceSetKey,validPrepareResponse} from './protocol';
import {receiveOwnedReferenceContent,yieldReferenceHost} from './lookupAdapters';
import type {ApplicationReferenceContentService,ContentWorker,ExactReferenceContentSetV1,ReferenceContentDiagnostics} from './types';

type Subscriber={resolve:(value:GameContentContext)=>void;reject:(error:Error)=>void;signal?:AbortSignal;abort?:()=>void};
type Job={key:string;set:ExactReferenceContentSetV1;id:number;subscribers:Set<Subscriber>;worker?:ContentWorker;live:boolean;started:number};
const abortError=()=>new Error('Application reference-content preparation was cancelled.');
const nativeAborted=(signal:AbortSignal)=>Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted')!.get!.call(signal) as boolean;
const addAbort=(signal:AbortSignal,handler:()=>void)=>EventTarget.prototype.addEventListener.call(signal,'abort',handler,{once:true});
const removeAbort=(signal:AbortSignal,handler:()=>void)=>EventTarget.prototype.removeEventListener.call(signal,'abort',handler);
/** One private Worker at a time, exact-set cache and no Game ownership. */
export function createApplicationReferenceContentService(factory:()=>ContentWorker=()=>new Worker(new URL('./worker.ts',import.meta.url),{type:'module'}),yieldHost=yieldReferenceHost):ApplicationReferenceContentService{
  const cache=new Map<string,GameContentContext>(),jobs=new Map<string,Job>();let active:Job|undefined,disposed=false,sequence=0,preparations=0,last:ReferenceContentDiagnostics['last'];
  const detach=(subscriber:Subscriber)=>{if(subscriber.signal&&subscriber.abort)removeAbort(subscriber.signal,subscriber.abort);};
  const stop=(job:Job)=>{job.live=false;if(job.worker){job.worker.onmessage=null;job.worker.onerror=null;job.worker.onmessageerror=null;job.worker.terminate();job.worker=undefined;}};
  const finish=(job:Job,error?:Error,value?:GameContentContext)=>{
    if(!job.live)return;stop(job);jobs.delete(job.key);if(active===job)active=undefined;
    if(value&&!disposed){cache.set(job.key,value);while(cache.size>2)cache.delete(cache.keys().next().value!);}
    for(const subscriber of job.subscribers){detach(subscriber);if(error)subscriber.reject(error);else subscriber.resolve(value!);}job.subscribers.clear();pump();
  };
  const pump=()=>{
    if(disposed||active)return;const job=[...jobs.values()].find(item=>item.live);if(!job)return;active=job;job.started=performance.now();
    try{
      const worker=factory();job.worker=worker;preparations++;
      const failed=()=>{if(active===job&&job.live)finish(job,Error('Application reference-content Worker failed.'));};
      worker.onerror=failed;worker.onmessageerror=failed;
      worker.onmessage=event=>{
        if(active!==job||!job.live||disposed)return;
        const response:unknown=event.data;
        if(!validPrepareResponse(response)||response.requestId!==job.id){finish(job,Error('Invalid application reference-content Worker response.'));return;}
        if(response.kind==='failed'){finish(job,Error(response.message));return;}
        if(referenceSetKey(response.exactSet)!==job.key){finish(job,Error('Application reference-content identity mismatch.'));return;}
        const received=performance.now(),handoffMs=Math.max(0,performance.timeOrigin+received-response.metrics.emittedAt);
        // Delivery is complete: release the transient realm before owning/indexing its clone.
        worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;worker.terminate();job.worker=undefined;
        void receiveOwnedReferenceContent(response.data,job.set,()=>job.live&&!disposed,yieldHost).then(context=>{
          if(!job.live||disposed)return;last=Object.freeze({...response.metrics,handoffMs,resolverPublicationMs:performance.now()-received,referenceContentReadyMs:performance.now()-job.started});finish(job,undefined,context);
        },()=>{if(job.live)finish(job,Error('Prepared geographic reference content could not be accepted.'));});
      };
      worker.postMessage({version:1,kind:'prepare',requestId:job.id,exactSet:job.set});
    }catch{finish(job,Error('Application reference-content Worker could not start.'));}
  };
  return Object.freeze({
    prepare:(exactSet:ExactReferenceContentSetV1,options?:Readonly<{signal?:AbortSignal}>)=>new Promise<GameContentContext>((resolve,reject)=>{
      if(disposed){reject(Error('Application reference-content service is disposed.'));return;}
      let set:ExactReferenceContentSetV1,key:string;try{set=normalizeReferenceSet(exactSet);key=referenceSetKey(set);}catch(error){reject(error);return;}
      const signal=options?.signal;if(signal&&nativeAborted(signal)){reject(abortError());return;}
      const ready=cache.get(key);if(ready){resolve(ready);return;}
      let job=jobs.get(key);if(!job){job={key,set,id:++sequence,subscribers:new Set(),live:true,started:0};jobs.set(key,job);}
      const current=job,subscriber:Subscriber={resolve,reject,signal};
      subscriber.abort=()=>{if(!current.subscribers.delete(subscriber))return;detach(subscriber);reject(abortError());if(!current.subscribers.size){stop(current);jobs.delete(key);if(active===current)active=undefined;pump();}};
      current.subscribers.add(subscriber);
      try{if(signal)addAbort(signal,subscriber.abort);if(signal&&nativeAborted(signal)){subscriber.abort();return;}}catch{current.subscribers.delete(subscriber);reject(Error('Invalid content preparation cancellation signal.'));if(!current.subscribers.size){stop(current);jobs.delete(key);}return;}
      pump();
    }),
    peek:(set:ExactReferenceContentSetV1)=>cache.get(referenceSetKey(set)),
    dispose:()=>{if(disposed)return;disposed=true;for(const job of jobs.values()){stop(job);for(const subscriber of job.subscribers){detach(subscriber);subscriber.reject(abortError());}job.subscribers.clear();}jobs.clear();cache.clear();active=undefined;},
    diagnostics:()=>Object.freeze({activeWorkers:active?.worker?1:0,cachedSets:cache.size,pendingSets:jobs.size,preparations,...(last?{last}: {})})
  });
}

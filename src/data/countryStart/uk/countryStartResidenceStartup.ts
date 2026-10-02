import {isGame} from '../../../engine/save';
import type {CurrentGame} from '../../../engine/types';
import type {UkMid2024StartRequestV1} from '../../uk/countryStart';
import {ownStartupRequest} from './countryStartResidenceRequest';
import {STARTUP_CONTRACT,validStartupReply,type StartupOptions,type StartupPhase,type WorkerMetrics} from './countryStartResidenceProtocol';

/** Private host adapter. Neither caller input nor simulation state can supply a port. */
export type StartupPort=Readonly<{
 post:(message:unknown)=>void;
 listen:(message:(value:unknown)=>void,failure:()=>void)=>()=>void;
 terminate:()=>void|Promise<void>;
 reference?:(active:boolean)=>void;
}>;
export class StartupError extends Error{
 constructor(readonly code:'busy'|'aborted'|'unavailable'|'protocol'|'construction'|'disposed',message:string){super(message);this.name='StartupError';}
}
export type StartupDiagnostics=Readonly<WorkerMetrics&{deliveryMs:number;receiverValidationMs:number}>;
type Pending={id:string;request:UkMid2024StartRequestV1;options:StartupOptions;resolve:(game:CurrentGame)=>void;reject:(error:Error)=>void;cancelled:boolean;dispatched:boolean;unlisten:()=>void};
// Native host controls: caller-owned shadow properties cannot strand an acquired slot.
const signalAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted')!.get!;
const addSignalListener=EventTarget.prototype.addEventListener,removeSignalListener=EventTarget.prototype.removeEventListener;

/** One private worker lifetime, shared preparation, one active candidate, no queue/Game cache. */
export function createStartupService(factory:()=>Promise<StartupPort>){
 let port:StartupPort|undefined,unlisten=()=>{},ready:Promise<void>|undefined,resolveReady:(()=>void)|undefined,rejectReady:((error:Error)=>void)|undefined;
 let generation=0,sequence=0n,pending:Pending|undefined,lastDiagnostics:StartupDiagnostics|undefined;
 const progress=(phase:StartupPhase)=>{try{pending?.options.onProgress?.(phase);}catch{/* Presentation callbacks cannot affect construction. */}};
 const release=()=>{const ending=pending;pending=undefined;ending?.unlisten();if(!pending)port?.reference?.(false);};
 const fail=(error:StartupError)=>{
  generation++;unlisten();unlisten=()=>{};
  const stopped=port;port=undefined;ready=undefined;
  rejectReady?.(error);rejectReady=undefined;resolveReady=undefined;
  pending?.reject(error);release();lastDiagnostics=undefined;
  if(stopped)void Promise.resolve(stopped.terminate()).catch(()=>{});
 };
 const receive=(value:unknown)=>{
  if(!validStartupReply(value)){fail(new StartupError('protocol','Invalid startup worker reply.'));return;}
  if(value.kind==='ready'){
   if(!resolveReady){fail(new StartupError('protocol','Unexpected startup readiness.'));return;}
   const complete=resolveReady;resolveReady=undefined;rejectReady=undefined;complete();if(!pending)port?.reference?.(false);return;
  }
  if(value.requestId==='0'&&value.kind==='failed'){fail(new StartupError('unavailable','UK startup content preparation failed: '+value.message));return;}
  const current=pending;
  if(!current||value.requestId!==current.id){fail(new StartupError('protocol','Stale or mismatched startup worker reply.'));return;}
  if(value.kind==='progress'){if(!current.cancelled)progress(value.phase);return;}
  if(value.kind==='failed'){if(value.code==='protocol'){fail(new StartupError('protocol',value.message));return;}current.reject(new StartupError('construction',value.message));release();return;}
  if(current.cancelled){release();return;}
  try{
   progress('validating-delivery');if(pending!==current)return;if(current.cancelled){release();return;}
   const received=performance.timeOrigin+performance.now(),validationStarted=performance.now(),game=value.game;
   if(!isGame(game)||game.version!==4||!game.people||game.people.playerId!=='person:1'||game.people.people.length!==1||game.people.nextSequence!==2
    ||game.residence.residences.length!==1||game.residence.occupants.length!==1||game.residence.occupants[0].personId!=='person:1')throw Error('Invalid complete UK startup Game.');
   lastDiagnostics=Object.freeze({...value.metrics,deliveryMs:Math.max(0,received-value.metrics.emittedAt),receiverValidationMs:performance.now()-validationStarted});
   progress('complete');if(pending!==current)return;if(current.cancelled){release();return;}current.resolve(game as CurrentGame);release();
  }catch{fail(new StartupError('protocol','Startup Game failed receiver validation.'));}
 };
 const prepare=():Promise<void>=>{
  if(ready)return ready;
  const activeGeneration=generation;
  ready=new Promise<void>((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  // Register the promise before a host factory can resolve/fail. No rejected cache survives failure.
  void Promise.resolve().then(factory).then(created=>{
   if(activeGeneration!==generation){void Promise.resolve(created.terminate()).catch(()=>{});return;}
   port=created;unlisten=created.listen(value=>{if(activeGeneration===generation)receive(value);},()=>{
    if(activeGeneration===generation)fail(new StartupError('unavailable','Startup worker stopped unexpectedly.'));
   });
   created.reference?.(true);created.post({version:1,contract:STARTUP_CONTRACT,requestId:'0',kind:'prepare'});
  }).catch(()=>{if(activeGeneration===generation)fail(new StartupError('unavailable','Startup worker could not be initialized.'));});
  return ready;
 };
 const create=(input:UkMid2024StartRequestV1,options:StartupOptions={}):Promise<CurrentGame>=>{
  let request:UkMid2024StartRequestV1;
  try{
   request=ownStartupRequest(input);options={signal:options.signal,onProgress:options.onProgress};
   if(options.onProgress!==undefined&&typeof options.onProgress!=='function')throw Error('Invalid startup progress callback.');
   if(options.signal!==undefined){
    // Brand check before acquiring the slot. Invalid host controls cannot strand a request.
    signalAborted.call(options.signal);
   }
  }catch(error){return Promise.reject(error);}
  if(options.signal!==undefined&&signalAborted.call(options.signal))return Promise.reject(new StartupError('aborted','UK startup was cancelled.'));
  if(pending)return Promise.reject(new StartupError('busy','A UK startup is already in progress.'));
  lastDiagnostics=undefined;
  return new Promise<CurrentGame>((resolve,reject)=>{
   const current:Pending={id:String(++sequence),request,options,resolve,reject,cancelled:false,dispatched:false,unlisten:()=>{}};
   pending=current;
   const abort=()=>{current.cancelled=true;current.reject(new StartupError('aborted','UK startup was cancelled.'));};
   if(options.signal!==undefined)addSignalListener.call(options.signal,'abort',abort,{once:true});
   current.unlisten=()=>{if(options.signal!==undefined)removeSignalListener.call(options.signal,'abort',abort);};
   progress('preparing-world');if(pending!==current)return;port?.reference?.(true);
   void prepare().then(()=>{
    if(pending!==current)return;
    if(current.cancelled){release();return;}
    current.dispatched=true;port!.reference?.(true);
    try{port!.post({version:1,contract:STARTUP_CONTRACT,requestId:current.id,kind:'start',request:current.request});}
    catch{fail(new StartupError('unavailable','UK startup request could not be delivered.'));}
   }).catch(error=>{if(pending===current){current.reject(error);release();}});
  });
 };
 return Object.freeze({create,prepare,dispose:()=>fail(new StartupError('disposed','UK startup service was disposed.')),
  diagnostics:()=>lastDiagnostics,
  // Diagnostics contain no Game or content aliases; useful for retention/lifecycle tests.
  status:()=>Object.freeze({active:!!pending,ready:!!ready&&!resolveReady,worker:!!port,generation})});
}

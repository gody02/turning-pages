import type {CurrentGame} from '../../../engine/types';
import type {UkMid2024StartRequestV1} from '../../uk/countryStart';
import manifest from './country-start-manifest.json';

// Small host metadata only. Do not import the scenario/registry: those initialize frozen v2.
export const STARTUP_CONTRACT=manifest.entries.find(entry=>entry.scenarioId==='country-start.uk.mid-2024-v3')!.fingerprint;
export type StartupPhase='preparing-world'|'constructing-world'|'validating-delivery'|'complete';
export type StartupOptions=Readonly<{signal?:AbortSignal;onProgress?:(phase:StartupPhase)=>void}>;
type Envelope=Readonly<{version:1;contract:string;requestId:string}>;
export type StartupCommand=Envelope&(
 | Readonly<{kind:'prepare'}>
 | Readonly<{kind:'start';request:UkMid2024StartRequestV1}>);
export type WorkerMetrics=Readonly<{preparationMs:number;constructionMs:number;emittedAt:number;workerHeapUsed:number|null}>;
export type StartupReply=Envelope&(
 | Readonly<{kind:'ready'}>
 | Readonly<{kind:'progress';phase:'preparing-world'|'constructing-world'}>
 | Readonly<{kind:'failed';code:'preparation'|'construction'|'protocol';message:string}>
 | Readonly<{kind:'complete';game:CurrentGame;metrics:WorkerMetrics}>);

export function dataRecord(value:unknown,required:readonly string[]):value is Record<string,unknown>{
 try{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)return false;
  const keys=Reflect.ownKeys(value);
  return keys.length===required.length&&required.every(key=>keys.includes(key))&&keys.every(key=>{
   const d=Object.getOwnPropertyDescriptor(value,key);
   return typeof key==='string'&&!!d?.enumerable&&'value' in d;
  });
 }catch{return false;}
}
const baseKeys=['version','contract','requestId','kind'];
function envelope(value:Record<string,unknown>):boolean{return value.version===1&&value.contract===STARTUP_CONTRACT&&typeof value.requestId==='string'&&/^(0|[1-9]\d{0,30})$/.test(value.requestId);}
export function validStartupCommand(value:unknown):value is StartupCommand{
 try{const tag=value&&typeof value==='object'?Object.getOwnPropertyDescriptor(value,'kind')?.value:undefined;return dataRecord(value,[...baseKeys,...(tag==='start'?['request']:[])])&&envelope(value)&&(value.kind==='prepare'&&value.requestId==='0'||value.kind==='start'&&value.requestId!=='0');}catch{return false;}
}
export function validStartupReply(value:unknown):value is StartupReply{
 try{
  // Descriptor-only tag read; hostile messages must not execute a getter.
  const tag=value&&typeof value==='object'?Object.getOwnPropertyDescriptor(value,'kind')?.value:undefined;
  const extra=tag==='complete'?['game','metrics']:tag==='failed'?['code','message']:tag==='progress'?['phase']:tag==='ready'?[]:null;
  if(!extra||!dataRecord(value,[...baseKeys,...extra])||!envelope(value))return false;
  if(tag==='ready')return value.requestId==='0';
  if(tag==='progress')return value.phase==='preparing-world'||value.phase==='constructing-world';
  if(tag==='failed')return ['preparation','construction','protocol'].includes(value.code as string)&&typeof value.message==='string'&&value.message.length>0&&value.message.length<=1_000;
  const metrics=value.metrics;
  return value.requestId!=='0'&&dataRecord(metrics,['preparationMs','constructionMs','emittedAt','workerHeapUsed'])&&[metrics.preparationMs,metrics.constructionMs,metrics.emittedAt].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0)&&(metrics.workerHeapUsed===null||typeof metrics.workerHeapUsed==='number'&&Number.isSafeInteger(metrics.workerHeapUsed)&&metrics.workerHeapUsed>=0);
 }catch{return false;}
}

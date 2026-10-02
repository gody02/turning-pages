import type {CurrentGame} from '../../../engine/types';
import type {UkMid2024StartRequestV1} from '../../uk/countryStart';
import {createStartupService,type StartupPort} from './countryStartResidenceStartup';
import type {StartupOptions} from './countryStartResidenceProtocol';

export type {StartupOptions as UkCountryStartStartupOptions,StartupPhase as UkCountryStartStartupPhase} from './countryStartResidenceProtocol';
async function createPort():Promise<StartupPort>{
 if(import.meta.env.SSR){const node=await import('./countryStartResidenceStartup.node');return node.createNodeStartupPort();}
 const worker=new Worker(new URL('./countryStartResidence.worker.ts',import.meta.url),{type:'module'});
 return Object.freeze({post:(message:unknown)=>worker.postMessage(message),terminate:()=>worker.terminate(),
  listen:(message:(value:unknown)=>void,failure:()=>void)=>{
   const receive=(event:MessageEvent)=>message(event.data),failed=()=>failure();
   worker.addEventListener('message',receive);worker.addEventListener('error',failed);worker.addEventListener('messageerror',failed);
   return ()=>{worker.removeEventListener('message',receive);worker.removeEventListener('error',failed);worker.removeEventListener('messageerror',failed);};
  }});
}
// One startup worker, never normal simulation ownership.
const startup=createStartupService(createPort);
export function createUkMid2024GeographicResidenceGame(input:UkMid2024StartRequestV1,options?:StartupOptions):Promise<CurrentGame>{return startup.create(input,options);}
/** Explicit optional seedless preparation. No app/idle/UI prewarming is installed. */
export function prepareUkMid2024GeographicResidenceStartup():Promise<void>{return startup.prepare();}
export const disposeUkCountryStartStartup=()=>startup.dispose();
export const ukCountryStartStartupDiagnostics=()=>startup.diagnostics();
export const ukCountryStartStartupStatus=()=>startup.status();

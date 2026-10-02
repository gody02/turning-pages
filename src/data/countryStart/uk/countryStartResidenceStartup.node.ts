import {Worker} from 'node:worker_threads';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import type {StartupPort} from './countryStartResidenceStartup';

/** Node-only: existing Vite tooling bundles the same TS construction into an owned temporary ESM entry. */
export async function createNodeStartupPort():Promise<StartupPort>{
 const directory=await mkdtemp(join(tmpdir(),'turning-pages-startup-'));
 const cleanup=()=>rm(directory,{recursive:true,force:true});
 try{
  const {build}=await import('vite');
  await build({configFile:false,publicDir:false,logLevel:'silent',build:{target:'es2022',minify:false,outDir:directory,emptyOutDir:false,
   lib:{entry:fileURLToPath(new URL('./countryStartResidence.node-worker.ts',import.meta.url)),formats:['es'],fileName:()=> 'startup.mjs'},
   rollupOptions:{external:['node:worker_threads']}}});
  const worker=new Worker(pathToFileURL(join(directory,'startup.mjs')));
  return Object.freeze({post:(message:unknown)=>worker.postMessage(message),reference:(active:boolean)=>{if(active)worker.ref();else worker.unref();},
   listen:(message:(value:unknown)=>void,failure:()=>void)=>{
    const error=()=>failure(),exit=()=>failure();worker.on('message',message);worker.on('error',error);worker.on('messageerror',error);worker.on('exit',exit);
    return ()=>{worker.off('message',message);worker.off('error',error);worker.off('messageerror',error);worker.off('exit',exit);};
   },terminate:async()=>{await worker.terminate();await cleanup();}});
 }catch(error){await cleanup();throw error;}
}

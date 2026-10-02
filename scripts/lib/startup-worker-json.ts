import {readFileSync} from 'node:fs';
import {basename} from 'node:path';
import type {Plugin} from 'vite';

/** Worker-build only: keep large immutable JSON out of the JavaScript compiler.
 * Original module values/registration checks are unchanged; no Game or cache is added.
 */
export function startupWorkerJsonAssets():Plugin{
 return {name:'startup-worker-json-assets',enforce:'post',apply:'build',
  config:()=>({build:{target:'es2022'}}),
  transform(_code,id){
   if(!id.endsWith('.json'))return;
   const bytes=readFileSync(id);if(bytes.byteLength<50_000)return;
   const asset=this.emitFile({type:'asset',name:basename(id),source:bytes});
   return {code:`const response=await fetch(import.meta.ROLLUP_FILE_URL_${asset});
if(!response.ok)throw Error('Startup content asset could not be loaded.');
export default await response.json();`,map:null};
  }};
}

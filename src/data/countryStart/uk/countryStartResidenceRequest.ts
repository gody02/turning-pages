import type {UkMid2024StartRequestV1} from '../../uk/countryStart';

/** Reject structures that messaging would otherwise silently normalize. No heavy content import. */
export function ownStartupRequest(input:UkMid2024StartRequestV1):UkMid2024StartRequestV1{
 try{
  const preflight=(value:unknown,depth=0):void=>{
   if(!value||typeof value!=='object')return;
   if(depth>2||Array.isArray(value)||(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null))throw Error();
   for(const key of Reflect.ownKeys(value)){
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(typeof key!=='string'||!descriptor?.enumerable||!('value' in descriptor))throw Error();
    preflight(descriptor.value,depth+1);
   }
  };
  preflight(input);return structuredClone(input);
 }catch{throw Error('Invalid Residence UK country-start request.');}
}

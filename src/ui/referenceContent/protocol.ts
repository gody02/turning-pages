import type {ExactReferenceContentSetV1,PreparedReferenceData,ReferencePreparationMetrics} from './types';

const id=(v:unknown):v is string=>typeof v==='string'&&v.length<=160&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/.test(v);
const fingerprint=(v:unknown)=>typeof v==='string'&&/^fnv1a64-v1:[0-9a-f]{16}$/.test(v);
export function exactRecord(value:unknown,keys:readonly string[]):value is Record<string,unknown>{
  try{if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype)return false;const found=Reflect.ownKeys(value);return found.length===keys.length&&found.every(key=>typeof key==='string'&&keys.includes(key)&&Object.getOwnPropertyDescriptor(value,key)?.enumerable&&'value' in Object.getOwnPropertyDescriptor(value,key)!);}catch{return false;}
}
export function denseArray(value:unknown):value is unknown[]{
  try{if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||Reflect.ownKeys(value).length!==value.length+1)return false;for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d?.enumerable||!('value' in d))return false;}return true;}catch{return false;}
}
/** Owned canonical key. Input ordering is irrelevant; contradictions are rejected. */
export function normalizeReferenceSet(value:unknown):ExactReferenceContentSetV1{
  try{
    if(!exactRecord(value,['version','geography','settlements'])||value.version!==1||!denseArray(value.geography)||!denseArray(value.settlements))throw Error();
    const normalize=(items:unknown[],key:'partitionId'|'packageId')=>{
      const ids=new Set<string>();const result=items.map(item=>{if(!exactRecord(item,[key,'fingerprint'])||!id(item[key])||!fingerprint(item.fingerprint)||ids.has(item[key] as string))throw Error();ids.add(item[key] as string);return Object.freeze({[key]:item[key],fingerprint:item.fingerprint});});
      return Object.freeze(result.sort((a,b)=>(a[key] as string)<(b[key] as string)?-1:(a[key] as string)>(b[key] as string)?1:0));
    };
    return Object.freeze({version:1,geography:normalize(value.geography,'partitionId'),settlements:normalize(value.settlements,'packageId')}) as ExactReferenceContentSetV1;
  }catch{throw Error('Invalid exact application reference-content identity.');}
}
export const referenceSetKey=(set:ExactReferenceContentSetV1)=>JSON.stringify(normalizeReferenceSet(set));
export type ContentPrepareRequest=Readonly<{version:1;kind:'prepare';requestId:number;exactSet:ExactReferenceContentSetV1}>;
export type ContentPrepareResponse=
  | Readonly<{version:1;kind:'ready';requestId:number;exactSet:ExactReferenceContentSetV1;data:PreparedReferenceData;metrics:ReferencePreparationMetrics}>
  | Readonly<{version:1;kind:'failed';requestId:number;message:string}>;
export function validPrepareRequest(value:unknown):value is ContentPrepareRequest{
  try{return exactRecord(value,['version','kind','requestId','exactSet'])&&value.version===1&&value.kind==='prepare'&&Number.isSafeInteger(value.requestId)&&(value.requestId as number)>0&&!!normalizeReferenceSet(value.exactSet);}catch{return false;}
}
/** Shape checks only for the private bundled Worker channel; full frozen validation runs there. */
export function validPrepareResponse(value:unknown):value is ContentPrepareResponse{
  try{
    const kind=value&&typeof value==='object'?Object.getOwnPropertyDescriptor(value,'kind'):undefined;
    if(!kind||!('value' in kind)||!exactRecord(value,kind.value==='failed'?['version','kind','requestId','message']:['version','kind','requestId','exactSet','data','metrics'])||value.version!==1||!Number.isSafeInteger(value.requestId)||(value.requestId as number)<=0)return false;
    if(value.kind==='failed')return typeof value.message==='string'&&value.message.length>0&&value.message.length<=500;
    return value.kind==='ready'&&!!normalizeReferenceSet(value.exactSet)&&exactRecord(value.data,['geography','settlements','indexes'])&&exactRecord(value.metrics,['importMs','prepareMs','payloadBytes','emittedAt'])&&Object.values(value.metrics).every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0)&&Number.isSafeInteger(value.metrics.payloadBytes);
  }catch{return false;}
}

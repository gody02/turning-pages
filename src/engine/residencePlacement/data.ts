import {isJsonValue} from '../core/json';
import type {GeographicAreaReferenceV1} from '../geography/types';
import type {ResidencePlacementLocationV1} from './types';

export const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
export const stableId=(value:unknown):value is string=>typeof value==='string'&&value.length<=160&&value.includes('.')&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
export const versionedId=(value:unknown):value is string=>stableId(value)&&/(?:^|[._-])v[1-9]\d*$/.test(value);
export const fingerprintShape=(value:unknown):value is string=>typeof value==='string'&&/^fnv1a64-v1:[0-9a-f]{16}$/.test(value);
export const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
export const fields=(value:Record<string,unknown>,keys:readonly string[])=>{const actual=Reflect.ownKeys(value);return actual.length===keys.length&&actual.every(key=>typeof key==='string'&&keys.includes(key)&&!!Object.getOwnPropertyDescriptor(value,key)?.enumerable&&'value' in Object.getOwnPropertyDescriptor(value,key)!);};
export const dense=(value:unknown):value is readonly unknown[]=>Array.isArray(value)&&Object.getPrototypeOf(value)===Array.prototype&&Reflect.ownKeys(value).length===value.length+1&&Array.from({length:value.length},(_,index)=>Object.getOwnPropertyDescriptor(value,index)).every(item=>!!item?.enumerable&&'value' in item);

/** Preflight before cloning: never invoke getters; cloning also rejects transparent proxies. */
export function snapshot<T>(value:T):T{
 if(!isJsonValue(value))throw Error('Invalid placement JSON.');
 const visit=(item:unknown):void=>{
  if(!item||typeof item!=='object')return;
  if(Array.isArray(item)){if(Object.getPrototypeOf(item)!==Array.prototype)throw Error('Invalid placement array.');}
  else if(!record(item))throw Error('Invalid placement object.');
  for(const key of Reflect.ownKeys(item)){const descriptor=Object.getOwnPropertyDescriptor(item,key)!;if('value' in descriptor)visit(descriptor.value);}
 };
 visit(value);return structuredClone(value);
}
export function immutable<T>(value:T):T{
 const copy=snapshot(value);
 const freeze=(item:unknown):void=>{if(!item||typeof item!=='object')return;for(const key of Reflect.ownKeys(item)){const descriptor=Object.getOwnPropertyDescriptor(item,key)!;if('value' in descriptor)freeze(descriptor.value);}Object.freeze(item);};
 freeze(copy);return copy;
}
export const scopeKey=(scope:GeographicAreaReferenceV1)=>JSON.stringify([scope.partitionId,scope.placeId]);
export const candidateKey=(location:ResidencePlacementLocationV1)=>location.kind==='administrative-area'?JSON.stringify([location.kind,location.administrativeArea.partitionId,location.administrativeArea.placeId]):JSON.stringify([location.kind,location.settlement.packageId,location.settlement.settlementId,location.administrativeArea.partitionId,location.administrativeArea.placeId]);
export function derivationKey(...parts:readonly string[]):string{
 const key=parts.map(part=>`${part.length}:${part}`).join('|');
 if(!key||key.length>500)throw Error('Placement derivation key exceeds supported length.');return key;
}
export const canonicalStringify=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>compare(a,b))):item);
/** UTF-8 FNV-1a is accidental content-integrity detection, not cryptographic authentication. */
export function fnv1a64(value:string):string{
 let hash=0xcbf29ce484222325n;
 for(const byte of new TextEncoder().encode(value)){hash^=BigInt(byte);hash=BigInt.asUintN(64,hash*0x100000001b3n);}
 return `fnv1a64-v1:${hash.toString(16).padStart(16,'0')}`;
}

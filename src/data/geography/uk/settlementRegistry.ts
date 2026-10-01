import type {SettlementRegistryV1} from '../../../engine/geography/settlements/types';
import {UK_HYBRID_SETTLEMENT_CANDIDATE_FINGERPRINT,UK_HYBRID_SETTLEMENT_CANDIDATE_ID} from './settlements-hybrid-2024/adapter';
import {createUkHybridSettlementV2ProductionRegistry,UK_HYBRID_SETTLEMENT_V2_CANDIDATE_FINGERPRINT,UK_HYBRID_SETTLEMENT_V2_PRODUCTION_ID} from './settlements-hybrid-2024-v2/adapter';
import manifestJson from './settlement-content-manifest.json';

export type UkSettlementContentManifestV1=Readonly<{
  version:1;
  entries:readonly Readonly<{packageId:typeof UK_HYBRID_SETTLEMENT_V2_PRODUCTION_ID;fingerprint:typeof UK_HYBRID_SETTLEMENT_V2_CANDIDATE_FINGERPRINT;releaseStatus:'production'}>[];
  historicalIdentitySources:readonly Readonly<{packageId:typeof UK_HYBRID_SETTLEMENT_CANDIDATE_ID;fingerprint:typeof UK_HYBRID_SETTLEMENT_CANDIDATE_FINGERPRINT;releaseStatus:'unregistered-historical-freeze-failed';identityCount:2739;currentRepresentations:2698;historicalOnly:41}>[];
}>;

const record=(value:unknown):value is Record<string,unknown>=>{try{return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;}catch{return false;}};
const exact=(value:Record<string,unknown>,keys:readonly string[])=>{try{const actual=Reflect.ownKeys(value);return actual.length===keys.length&&actual.every(key=>typeof key==='string'&&keys.includes(key)&&!!Object.getOwnPropertyDescriptor(value,key)?.enumerable&&'value' in Object.getOwnPropertyDescriptor(value,key)!);}catch{return false;}};
const dense=(value:unknown):value is readonly unknown[]=>{try{if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||Reflect.ownKeys(value).length!==value.length+1)return false;for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,index);if(!descriptor?.enumerable||!('value' in descriptor))return false;}return true;}catch{return false;}};
const immutable=<T>(value:T):T=>{const copy=structuredClone(value);const freeze=(item:unknown):void=>{if(!item||typeof item!=='object'||Object.isFrozen(item))return;for(const key of Reflect.ownKeys(item)){const descriptor=Object.getOwnPropertyDescriptor(item,key);if(descriptor&&'value' in descriptor)freeze(descriptor.value);}Object.freeze(item);};freeze(copy);return copy;};

export function validateUkSettlementContentManifest(value:unknown):value is UkSettlementContentManifestV1{
 try{
  if(!record(value)||!exact(value,['version','entries','historicalIdentitySources'])||value.version!==1||!dense(value.entries)||value.entries.length!==1||!dense(value.historicalIdentitySources)||value.historicalIdentitySources.length!==1)return false;
  const entry=value.entries[0],history=value.historicalIdentitySources[0];
  return record(entry)&&exact(entry,['packageId','fingerprint','releaseStatus'])&&entry.packageId===UK_HYBRID_SETTLEMENT_V2_PRODUCTION_ID&&entry.fingerprint===UK_HYBRID_SETTLEMENT_V2_CANDIDATE_FINGERPRINT&&entry.releaseStatus==='production'&&record(history)&&exact(history,['packageId','fingerprint','releaseStatus','identityCount','currentRepresentations','historicalOnly'])&&history.packageId===UK_HYBRID_SETTLEMENT_CANDIDATE_ID&&history.fingerprint===UK_HYBRID_SETTLEMENT_CANDIDATE_FINGERPRINT&&history.releaseStatus==='unregistered-historical-freeze-failed'&&history.identityCount===2739&&history.currentRepresentations===2698&&history.historicalOnly===41;
 }catch{return false;}
}

export function createUkSettlementContentRegistry():SettlementRegistryV1{
 if(!validateUkSettlementContentManifest(manifestJson))throw Error('UK Settlement content manifest is invalid.');
 const registry=createUkHybridSettlementV2ProductionRegistry(),registration=manifestJson.entries[0],pkg=registry.packages[0];
 if(registry.packages.length!==1||pkg.packageId!==registration.packageId||pkg.fingerprint!==registration.fingerprint)throw Error('UK Settlement production registration does not match immutable package semantics.');
 return registry;
}

export const UK_SETTLEMENT_CONTENT_MANIFEST=immutable(manifestJson) as UkSettlementContentManifestV1;

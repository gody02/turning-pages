import manifestJson from './population-content-manifest.json';
import {loadUkGeographicPopulationCandidate,type UkGeographicPopulationCandidate} from './geographic-mid-2024/adapter';
import {loadUkMid2024ProductionPackage} from './ons-mid-2024/adapter';
import type {PopulationCalibrationPackageV1} from '../../../engine/human/calibration/types';

export type UkPopulationContentRegistration=Readonly<{
  packageId:'uk.population.mid-2024.v2'|'uk.population.mid-2024.v3';
  fingerprint:string;
  contentKind:'national-calibration'|'geographic-allocation';
  releaseStatus:'compatibility'|'production';
}>;
export type UkPopulationContentRegistryV1=Readonly<{version:1;entries:readonly UkPopulationContentRegistration[]}>;
export type UkPopulationContent=PopulationCalibrationPackageV1|UkGeographicPopulationCandidate;

const EXPECTED_IDS=['uk.population.mid-2024.v2','uk.population.mid-2024.v3'] as const;
const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const record=(value:unknown):value is Record<string,unknown>=>{try{return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;}catch{return false;}};
const exactFields=(value:Record<string,unknown>,expected:readonly string[])=>{try{const keys=Reflect.ownKeys(value);return keys.length===expected.length&&keys.every(key=>typeof key==='string'&&expected.includes(key)&&!!Object.getOwnPropertyDescriptor(value,key)?.enumerable&&'value' in Object.getOwnPropertyDescriptor(value,key)!);}catch{return false;}};
const dense=(value:unknown):value is readonly unknown[]=>{try{if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||Reflect.ownKeys(value).length!==value.length+1)return false;for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,index);if(!descriptor?.enumerable||!('value' in descriptor))return false;}return true;}catch{return false;}};
const immutable=<T>(value:T):T=>{const copy=structuredClone(value);const freeze=(item:unknown):void=>{if(!item||typeof item!=='object'||Object.isFrozen(item))return;for(const key of Reflect.ownKeys(item)){const descriptor=Object.getOwnPropertyDescriptor(item,key);if(descriptor&&'value' in descriptor)freeze(descriptor.value);}Object.freeze(item);};freeze(copy);return copy;};

export function validateUkPopulationContentRegistry(value:unknown):value is UkPopulationContentRegistryV1{
 try{
  if(!record(value)||!exactFields(value,['version','entries'])||value.version!==1||!dense(value.entries)||value.entries.length!==2)return false;
  const entries=value.entries as readonly unknown[];
  if(!entries.every(entry=>record(entry)&&exactFields(entry,['packageId','fingerprint','contentKind','releaseStatus'])))return false;
  const typed=entries as readonly UkPopulationContentRegistration[];
  if(typed.some((entry,index)=>entry.packageId!==EXPECTED_IDS[index]||!/^fnv1a64-v1:[0-9a-f]{16}$/.test(entry.fingerprint)||(index>0&&codePointCompare(typed[index-1].packageId,entry.packageId)>=0)))return false;
  return typed[0].fingerprint==='fnv1a64-v1:a43f874fe1fab27f'&&typed[0].contentKind==='national-calibration'&&typed[0].releaseStatus==='compatibility'&&typed[1].fingerprint==='fnv1a64-v1:2894f4c1b1fdd274'&&typed[1].contentKind==='geographic-allocation'&&typed[1].releaseStatus==='production';
 }catch{return false;}
}

export function createUkPopulationContentRegistry():UkPopulationContentRegistryV1{
 const registry=immutable(manifestJson);
 if(!validateUkPopulationContentRegistry(registry))throw Error('UK population content registry manifest is invalid.');
 const v2=loadUkMid2024ProductionPackage(),v3=loadUkGeographicPopulationCandidate();
 if(v2.id!==registry.entries[0].packageId||v2.fingerprint!==registry.entries[0].fingerprint||v3.id!==registry.entries[1].packageId||v3.fingerprint!==registry.entries[1].fingerprint)throw Error('UK population content registry does not match immutable package semantics.');
 return registry;
}

export function resolveUkPopulationContent(registry:UkPopulationContentRegistryV1,packageId:string):UkPopulationContent|undefined{
 if(!validateUkPopulationContentRegistry(registry))throw Error('UK population content registry is invalid.');
 const registration=registry.entries.find(entry=>entry.packageId===packageId);if(!registration)return undefined;
 const content=packageId==='uk.population.mid-2024.v2'?loadUkMid2024ProductionPackage():loadUkGeographicPopulationCandidate();
 if(content.fingerprint!==registration.fingerprint)throw Error('UK population package semantics changed under a registered immutable identity.');
 return content;
}

export const UK_POPULATION_CONTENT_MANIFEST=immutable(manifestJson) as UkPopulationContentRegistryV1;

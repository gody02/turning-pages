import {isSimulationDate,isSimulationYear} from '../../core/clock';
import {isJsonValue} from '../../core/json';
import {validPersonDisplayName} from '../../shared/personDisplayName';
import type {SimulationDate} from '../../core/model';
import type {
 AuthoredFamilyNameContent,CountContribution,CountWeightedGenerationNameEntry,FamilyNameContent,GenerationNameEntry,GivenNameBand,
 HumanGenerationContentGap,HumanGenerationContentManifestEntry,HumanGenerationContentPackageV1,HumanGenerationContentRegistry,NamingSourceDescriptorV1,
} from './types';

const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const stableIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=160&&value.includes('.')&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
const versionedIdentifier=(value:unknown):value is string=>stableIdentifier(value)&&/(?:^|[._-])v[1-9]\d*$/.test(value);
const contextIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=100&&/^[a-z][a-z0-9-]*$/.test(value);
const text=(value:unknown,max=3000):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const fingerprint=(value:unknown):value is string=>typeof value==='string'&&/^fnv1a64-v1:[0-9a-f]{16}$/.test(value);
const safePositive=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const object=(value:unknown):value is Record<string,unknown>=>{try{return !!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);}catch{return false;}};
const fields=(value:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>{try{const allowed=new Set([...required,...optional]),keys=Reflect.ownKeys(value);return required.every(key=>keys.includes(key))&&keys.every(key=>typeof key==='string'&&allowed.has(key)&&!!Object.getOwnPropertyDescriptor(value,key)?.enumerable&&'value' in Object.getOwnPropertyDescriptor(value,key)!);}catch{return false;}};
const dense=(value:unknown):value is readonly unknown[]=>{try{if(!Array.isArray(value)||Object.keys(value).length!==value.length||Reflect.ownKeys(value).length!==value.length+1)return false;for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,index);if(!descriptor?.enumerable||!('value' in descriptor))return false;}return true;}catch{return false;}};
const date=(value:unknown):value is SimulationDate=>object(value)&&fields(value,['year','month','day'])&&isSimulationDate(value);
const unique=(values:readonly string[])=>new Set(values).size===values.length;
const sorted=(values:readonly string[])=>values.every((value,index)=>index===0||codePointCompare(values[index-1],value)<0);
const validTextArray=(value:unknown,maxItems=1000):value is readonly string[]=>dense(value)&&value.length<=maxItems&&value.every(item=>text(item))&&unique(value);

function validSource(value:unknown):value is NamingSourceDescriptorV1{
 if(!object(value)||!fields(value,['version','id','producer','datasetId','releaseId','title','jurisdiction','coveredBirthYears','contentUniverse','classification','suppressionPolicy','transformation','licence','methodology','limitations'],['bundledArtifact','externalLocator'])||value.version!==1||!stableIdentifier(value.id)||!text(value.producer,200)||!text(value.datasetId,300)||!text(value.releaseId,200)||!text(value.title,300)||!contextIdentifier(value.jurisdiction)||!text(value.contentUniverse,1000)||!text(value.suppressionPolicy,2000)||!text(value.transformation,2000)||!text(value.licence,500)||!text(value.methodology,3000)||!validTextArray(value.limitations))return false;
 if(value.classification!=='observed'&&value.classification!=='estimated'&&value.classification!=='authored-gameplay-abstraction')return false;
 if(!object(value.coveredBirthYears)||!fields(value.coveredBirthYears,['from','through'])||!isSimulationYear(value.coveredBirthYears.from)||!isSimulationYear(value.coveredBirthYears.through)||value.coveredBirthYears.through<value.coveredBirthYears.from)return false;
 if(value.bundledArtifact!==undefined&&(!object(value.bundledArtifact)||!fields(value.bundledArtifact,['id','sha256'])||!stableIdentifier(value.bundledArtifact.id)||typeof value.bundledArtifact.sha256!=='string'||!/^sha256:[0-9a-f]{64}$/.test(value.bundledArtifact.sha256)))return false;
 return value.externalLocator===undefined||text(value.externalLocator,1000);
}

function validNameEntry(value:unknown):value is GenerationNameEntry{return object(value)&&fields(value,['id','text','weight'])&&stableIdentifier(value.id)&&validPersonDisplayName(value.text)&&safePositive(value.weight);}
function validContribution(value:unknown):value is CountContribution{return object(value)&&fields(value,['sourceId','count'])&&stableIdentifier(value.sourceId)&&safePositive(value.count);}
function validCountedEntry(value:unknown):value is CountWeightedGenerationNameEntry{
 if(!object(value)||!fields(value,['id','text','weight','contributions'])||!stableIdentifier(value.id)||!validPersonDisplayName(value.text)||!safePositive(value.weight)||!dense(value.contributions)||value.contributions.length===0||value.contributions.length>100||!value.contributions.every(validContribution))return false;
 const contributions=value.contributions as readonly CountContribution[];if(!unique(contributions.map(item=>item.sourceId)))return false;let total=0;for(const item of contributions){total+=item.count;if(!Number.isSafeInteger(total))return false;}return total===value.weight;
}
function safeWeightTotal(entries:readonly {weight:number}[]):boolean{let total=0;for(const entry of entries){total+=entry.weight;if(!Number.isSafeInteger(total))return false;}return entries.length===0||total>0;}
function validBand(value:unknown):value is GivenNameBand{
 if(!object(value)||!fields(value,['id','birthYearFrom','birthYearThrough','mode','entries','sourceIds','limitations'])||!stableIdentifier(value.id)||!isSimulationYear(value.birthYearFrom)||!isSimulationYear(value.birthYearThrough)||value.birthYearThrough<value.birthYearFrom||!validTextArray(value.limitations)||!dense(value.sourceIds)||value.sourceIds.length===0||value.sourceIds.length>100||!value.sourceIds.every(stableIdentifier)||!unique(value.sourceIds)||!dense(value.entries)||value.entries.length>10000)return false;
 if(value.mode==='published-support-uniform')return value.entries.every(validNameEntry)&&value.entries.every(entry=>(entry as GenerationNameEntry).weight===1)&&unique((value.entries as readonly GenerationNameEntry[]).map(item=>item.id))&&safeWeightTotal(value.entries as readonly GenerationNameEntry[]);
 return value.mode==='registration-count-weighted'&&value.entries.every(validCountedEntry)&&unique((value.entries as readonly CountWeightedGenerationNameEntry[]).map(item=>item.id))&&safeWeightTotal(value.entries as readonly CountWeightedGenerationNameEntry[]);
}
function validFamily(value:unknown):value is FamilyNameContent{
 if(!object(value)||typeof value.kind!=='string')return false;
 if(value.kind==='evidence-backed')return fields(value,['kind','classification','sourceIds','entries','limitations'])&&(value.classification==='observed'||value.classification==='estimated')&&dense(value.sourceIds)&&value.sourceIds.length>0&&value.sourceIds.length<=100&&value.sourceIds.every(stableIdentifier)&&unique(value.sourceIds)&&dense(value.entries)&&value.entries.length<=10000&&value.entries.every(validCountedEntry)&&unique((value.entries as readonly CountWeightedGenerationNameEntry[]).map(item=>item.id))&&safeWeightTotal(value.entries as readonly CountWeightedGenerationNameEntry[])&&validTextArray(value.limitations);
 if(value.kind!=='reviewed-authored'||!fields(value,['kind','classification','review','entries','limitations'])||value.classification!=='authored-gameplay-abstraction'||!object(value.review)||!fields(value.review,['id','status','note'])||!stableIdentifier(value.review.id)||(value.review.status!=='pending'&&value.review.status!=='approved')||!text(value.review.note,2000)||!dense(value.entries)||value.entries.length>10000||!value.entries.every(validNameEntry)||!unique((value.entries as readonly GenerationNameEntry[]).map(item=>item.id))||!validTextArray(value.limitations))return false;
 return safeWeightTotal(value.entries as readonly GenerationNameEntry[]);
}
function validGap(value:unknown):value is HumanGenerationContentGap{return object(value)&&fields(value,['id','description','blocking'])&&stableIdentifier(value.id)&&text(value.description,1000)&&typeof value.blocking==='boolean';}

const packageFields=['version','compilerId','id','fingerprint','countryId','effectiveDate','profileId','sources','givenNameBands','familyNames','genderPolicy','intrinsicPolicy','limitations','gaps'] as const;
function structurallyValid(value:unknown):value is HumanGenerationContentPackageV1{
 try{
  if(!object(value)||!fields(value,packageFields)||!isJsonValue(value)||value.version!==1||value.compilerId!=='human-generation-content.compiler-v1'||!versionedIdentifier(value.id)||!fingerprint(value.fingerprint)||!contextIdentifier(value.countryId)||!date(value.effectiveDate)||!versionedIdentifier(value.profileId)||!dense(value.sources)||value.sources.length>1000||!value.sources.every(validSource)||!unique((value.sources as unknown as readonly NamingSourceDescriptorV1[]).map(item=>item.id))||!dense(value.givenNameBands)||value.givenNameBands.length>1000||!value.givenNameBands.every(validBand)||!unique((value.givenNameBands as unknown as readonly GivenNameBand[]).map(item=>item.id))||!validFamily(value.familyNames)||!validTextArray(value.limitations)||!dense(value.gaps)||value.gaps.length>1000||!value.gaps.every(validGap)||!unique((value.gaps as readonly HumanGenerationContentGap[]).map(item=>item.id)))return false;
  if(!object(value.genderPolicy)||!fields(value.genderPolicy,['kind','label'])||value.genderPolicy.kind!=='fixed'||typeof value.genderPolicy.label!=='string'||value.genderPolicy.label.length>40||!value.genderPolicy.label.trim())return false;
  if(!object(value.intrinsicPolicy)||!fields(value.intrinsicPolicy,['traits','temperament','aptitudes'])||!dense(value.intrinsicPolicy.traits)||value.intrinsicPolicy.traits.length||!dense(value.intrinsicPolicy.temperament)||value.intrinsicPolicy.temperament.length||!dense(value.intrinsicPolicy.aptitudes)||value.intrinsicPolicy.aptitudes.length)return false;
  const sources=value.sources as unknown as readonly NamingSourceDescriptorV1[],bands=value.givenNameBands as unknown as readonly GivenNameBand[],sourceIds=new Set(sources.map(item=>item.id)),sourceById=new Map(sources.map(item=>[item.id,item]));
  const chronological=[...bands].sort((a,b)=>a.birthYearFrom-b.birthYearFrom||a.birthYearThrough-b.birthYearThrough||codePointCompare(a.id,b.id));for(let index=1;index<chronological.length;index++)if(chronological[index].birthYearFrom<=chronological[index-1].birthYearThrough)return false;
  for(const band of bands){
   if(band.sourceIds.some(id=>!sourceIds.has(id)))return false;const cited=band.sourceIds.map(id=>sourceById.get(id)!).sort((a,b)=>a.coveredBirthYears.from-b.coveredBirthYears.from||a.coveredBirthYears.through-b.coveredBirthYears.through||codePointCompare(a.id,b.id));if(cited.some(source=>source.coveredBirthYears.through<band.birthYearFrom||source.coveredBirthYears.from>band.birthYearThrough))return false;let nextYear=band.birthYearFrom;
   for(const source of cited){if(source.classification==='authored-gameplay-abstraction')return false;if(source.coveredBirthYears.through<nextYear)continue;if(source.coveredBirthYears.from>nextYear)return false;nextYear=Math.max(nextYear,source.coveredBirthYears.through+1);if(nextYear>band.birthYearThrough)break;}if(nextYear<=band.birthYearThrough)return false;
   if(band.mode==='registration-count-weighted'&&band.entries.some(entry=>entry.contributions.some(item=>!band.sourceIds.includes(item.sourceId))))return false;
  }
  const family=value.familyNames as FamilyNameContent;if(family.kind==='evidence-backed'){
   if(family.sourceIds.some(id=>!sourceIds.has(id))||family.entries.some(entry=>entry.contributions.some(item=>!family.sourceIds.includes(item.sourceId))))return false;const cited=family.sourceIds.map(id=>sourceById.get(id)!);if(cited.some(source=>source.classification==='authored-gameplay-abstraction')||family.classification==='observed'&&cited.some(source=>source.classification!=='observed'))return false;
  }
  return true;
 }catch{return false;}
}

const sortStrings=(items:readonly string[])=>[...items].sort(codePointCompare);
const sortEntries=<T extends GenerationNameEntry>(items:readonly T[])=>[...items].sort((a,b)=>codePointCompare(a.id,b.id)).map(item=>'contributions' in item?{...item,contributions:[...(item as CountWeightedGenerationNameEntry).contributions].sort((a,b)=>codePointCompare(a.sourceId,b.sourceId))}:item) as unknown as readonly T[];
function canonicalPackage(value:HumanGenerationContentPackageV1):HumanGenerationContentPackageV1{
 const sources=[...value.sources].sort((a,b)=>codePointCompare(a.id,b.id)).map(source=>({...source,limitations:sortStrings(source.limitations)}));
 const givenNameBands=[...value.givenNameBands].sort((a,b)=>a.birthYearFrom-b.birthYearFrom||a.birthYearThrough-b.birthYearThrough||codePointCompare(a.id,b.id)).map(band=>({...band,sourceIds:sortStrings(band.sourceIds),entries:sortEntries(band.entries),limitations:sortStrings(band.limitations)})) as readonly GivenNameBand[];
 const familyNames=value.familyNames.kind==='evidence-backed'?{...value.familyNames,sourceIds:sortStrings(value.familyNames.sourceIds),entries:sortEntries(value.familyNames.entries),limitations:sortStrings(value.familyNames.limitations)}:{...value.familyNames,entries:sortEntries(value.familyNames.entries),limitations:sortStrings(value.familyNames.limitations)};
 return {...value,sources,givenNameBands,familyNames,limitations:sortStrings(value.limitations),gaps:[...value.gaps].sort((a,b)=>codePointCompare(a.id,b.id))};
}
function canonicalStringify(value:unknown):string{
 if(value===null||typeof value==='boolean'||typeof value==='number'||typeof value==='string')return JSON.stringify(value);
 if(value===undefined)return '';
 if(Array.isArray(value))return `[${value.map(canonicalStringify).join(',')}]`;
 const entries=Object.entries(value as Record<string,unknown>).filter(([,item])=>item!==undefined).sort(([a],[b])=>codePointCompare(a,b));return `{${entries.map(([key,item])=>`${JSON.stringify(key)}:${canonicalStringify(item)}`).join(',')}}`;
}
function semanticProjection(value:HumanGenerationContentPackageV1):unknown{const canonical=canonicalPackage(value);return {...canonical,id:undefined,fingerprint:undefined};}
/** FNV-1a is an accidental-mutation fingerprint, not a cryptographic authenticity primitive. */
function fnv1a64(value:string):string{let hash=0xcbf29ce484222325n;for(const byte of new TextEncoder().encode(value)){hash^=BigInt(byte);hash=BigInt.asUintN(64,hash*0x100000001b3n);}return hash.toString(16).padStart(16,'0');}

export function fingerprintHumanGenerationContentPackage(value:HumanGenerationContentPackageV1):string{
 try{if(!structurallyValid(value))throw Error();return `fnv1a64-v1:${fnv1a64(canonicalStringify(semanticProjection(value)))}`;}catch{throw Error('Cannot fingerprint an invalid Human generation content package.');}
}
export function validateHumanGenerationContentPackage(value:unknown,expectedFingerprint?:string):value is HumanGenerationContentPackageV1{
 try{if(!structurallyValid(value))return false;const packageValue=value as HumanGenerationContentPackageV1,canonical=canonicalPackage(packageValue);if(canonicalStringify(packageValue)!==canonicalStringify(canonical)||fingerprintHumanGenerationContentPackage(packageValue)!==packageValue.fingerprint||expectedFingerprint!==undefined&&expectedFingerprint!==packageValue.fingerprint)return false;return true;}catch{return false;}
}
function freezeDeep(value:unknown):void{if(!value||typeof value!=='object'||Object.isFrozen(value))return;for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(descriptor&&'value' in descriptor)freezeDeep(descriptor.value);}Object.freeze(value);}
function immutable<T>(value:T):T{const copy=structuredClone(value);freezeDeep(copy);return copy;}

export function withHumanGenerationContentFingerprint(value:Omit<HumanGenerationContentPackageV1,'fingerprint'>):HumanGenerationContentPackageV1{
 try{
  if(!object(value))throw Error();const inputFields=packageFields.filter(key=>key!=='fingerprint');if(!fields(value,inputFields))throw Error();const root=Object.fromEntries(inputFields.map(key=>[key,Object.getOwnPropertyDescriptor(value,key)!.value])),candidate={...root,fingerprint:'fnv1a64-v1:0000000000000000'} as HumanGenerationContentPackageV1;
  if(!structurallyValid(candidate))throw Error();const canonical=canonicalPackage(candidate),result=immutable({...canonical,fingerprint:fingerprintHumanGenerationContentPackage(canonical)});if(!validateHumanGenerationContentPackage(result))throw Error();return result;
 }catch{throw Error('Invalid Human generation content package.');}
}

function validManifestEntry(value:unknown):value is HumanGenerationContentManifestEntry{return object(value)&&fields(value,['packageId','fingerprint'])&&versionedIdentifier(value.packageId)&&fingerprint(value.fingerprint);}
export function validateHumanGenerationContentRegistry(value:unknown):value is HumanGenerationContentRegistry{
 try{
  if(!object(value)||!fields(value,['version','packages','manifest'])||value.version!==1||!dense(value.packages)||!dense(value.manifest)||value.packages.length!==value.manifest.length||!value.packages.every(item=>validateHumanGenerationContentPackage(item))||!value.manifest.every(validManifestEntry))return false;
  const packages=value.packages as readonly HumanGenerationContentPackageV1[],manifest=value.manifest as readonly HumanGenerationContentManifestEntry[];
  if(!unique(packages.map(item=>item.id))||!unique(packages.map(item=>item.profileId))||!unique(manifest.map(item=>item.packageId)))return false;
  if(!packages.every((item,index)=>index===0||codePointCompare(packages[index-1].id,item.id)<0)||!manifest.every((item,index)=>index===0||codePointCompare(manifest[index-1].packageId,item.packageId)<0))return false;
  const manifestById=new Map(manifest.map(item=>[item.packageId,item.fingerprint]));return packages.every(item=>manifestById.get(item.id)===item.fingerprint);
 }catch{return false;}
}
export function createHumanGenerationContentRegistry(packages:readonly HumanGenerationContentPackageV1[],manifest:readonly HumanGenerationContentManifestEntry[]):HumanGenerationContentRegistry{
 try{if(!dense(packages)||!dense(manifest))throw Error();const registry=immutable({version:1 as const,packages:[...packages].sort((a,b)=>codePointCompare(a.id,b.id)),manifest:[...manifest].sort((a,b)=>codePointCompare(a.packageId,b.packageId))});if(!validateHumanGenerationContentRegistry(registry))throw Error();return registry;}catch{throw Error('Invalid Human generation content registry.');}
}

export function registeredHumanGenerationPackage(registry:HumanGenerationContentRegistry,profileId:string):HumanGenerationContentPackageV1|undefined{
 if(!validateHumanGenerationContentRegistry(registry)||!stableIdentifier(profileId))return undefined;return registry.packages.find(item=>item.profileId===profileId);
}

import {validPersonGenerationProfile,type PersonGenerationProfile,type WeightedNameEntry} from '../generation';
import {parsePopulationCohortId} from '../population';
import {MAX_PERSON_NAME_CODE_POINTS,personDisplayNameCodePointCount,validPersonDisplayName} from '../../shared/personDisplayName';
import type {GenerationNameEntry,GivenNameBand,HumanGenerationContentPackageV1,HumanGenerationContentRegistry,HumanGenerationReadiness,HumanGenerationRequirement} from './types';
import {validateHumanGenerationContentPackage,validateHumanGenerationContentRegistry} from './package';

const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;
function freezeDeep(value:unknown):void{if(!value||typeof value!=='object'||Object.isFrozen(value))return;for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(descriptor&&'value' in descriptor)freezeDeep(descriptor.value);}Object.freeze(value);}
function immutable<T>(value:T):T{const copy=structuredClone(value);freezeDeep(copy);return copy;}

export function resolveGivenNameBand(content:HumanGenerationContentPackageV1,birthYear:number):GivenNameBand|undefined{
 if(!validateHumanGenerationContentPackage(content)||!Number.isSafeInteger(birthYear))return undefined;
 const matches=content.givenNameBands.filter(band=>birthYear>=band.birthYearFrom&&birthYear<=band.birthYearThrough);
 return matches.length===1?immutable(matches[0]):undefined;
}

export type FullNamePreflight=Readonly<{
 valid:boolean;
 maximumCodePoints:number;
 givenNameId:string|null;
 familyNameId:string|null;
}>;

/** The longest given/family pair proves the bound for every Cartesian combination. */
export function preflightHumanGenerationFullNames(givenNames:readonly GenerationNameEntry[],familyNames:readonly GenerationNameEntry[]):FullNamePreflight{
 const longest=(entries:readonly GenerationNameEntry[])=>[...entries].sort((left,right)=>personDisplayNameCodePointCount(right.text)-personDisplayNameCodePointCount(left.text)||codePointCompare(left.id,right.id))[0];
 const given=longest(givenNames),family=longest(familyNames);
 if(!given||!family)return immutable({valid:false,maximumCodePoints:0,givenNameId:given?.id??null,familyNameId:family?.id??null});
 const composed=`${given.text} ${family.text}`,maximumCodePoints=personDisplayNameCodePointCount(composed);
 return immutable({valid:validPersonDisplayName(composed)&&maximumCodePoints<=MAX_PERSON_NAME_CODE_POINTS,maximumCodePoints,givenNameId:given.id,familyNameId:family.id});
}

function profileEntries(entries:readonly GenerationNameEntry[]):readonly WeightedNameEntry[]{return entries.map(entry=>({id:entry.id,text:entry.text,weight:entry.weight}));}

export function resolveHumanGenerationProfile(content:HumanGenerationContentPackageV1,birthYear:number):PersonGenerationProfile{
 if(!validateHumanGenerationContentPackage(content))throw Error('Invalid Human generation content package.');
 if(content.gaps.some(gap=>gap.blocking))throw Error('Human generation content has a blocking gap.');
 const band=resolveGivenNameBand(content,birthYear);if(!band||band.entries.length===0)throw Error('No approved given-name content covers this birth year.');
 if(content.familyNames.kind==='reviewed-authored'&&content.familyNames.review.status!=='approved')throw Error('Authored family-name content has not been approved.');
 if(content.familyNames.entries.length===0)throw Error('No approved family-name content is available.');
 const preflight=preflightHumanGenerationFullNames(band.entries,content.familyNames.entries);if(!preflight.valid)throw Error('Generated full names can exceed the Person display-name bound.');
 const profile:PersonGenerationProfile={version:1,id:content.profileId,naming:{givenNames:profileEntries(band.entries),familyNames:profileEntries(content.familyNames.entries)},genderLabels:[{id:'human.gender.fixed-v1',label:content.genderPolicy.label,weight:1}],temperament:[],aptitudes:[],traits:[]};
 if(!validPersonGenerationProfile(profile))throw Error('Resolved Human generation profile is invalid.');return immutable(profile);
}

const ownDataFields=(value:unknown,required:readonly string[]):value is Record<string,unknown>=>{try{if(!value||typeof value!=='object'||Array.isArray(value)||(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null))return false;const keys=Reflect.ownKeys(value);return keys.length===required.length&&keys.every(key=>typeof key==='string'&&required.includes(key)&&!!Object.getOwnPropertyDescriptor(value,key)?.enumerable&&'value' in Object.getOwnPropertyDescriptor(value,key)!);}catch{return false;}};
const dense=(value:unknown):value is readonly unknown[]=>{try{if(!Array.isArray(value)||Object.keys(value).length!==value.length||Reflect.ownKeys(value).length!==value.length+1)return false;for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,index);if(!descriptor?.enumerable||!('value' in descriptor))return false;}return true;}catch{return false;}};
function validRequirement(value:unknown):value is HumanGenerationRequirement{
 if(!ownDataFields(value,['id','countryId','areaId','birthYear','generationProfileId','count']))return false;const identity=parsePopulationCohortId(value.id);return !!identity&&identity.countryId===value.countryId&&identity.areaId===value.areaId&&identity.birthYear===value.birthYear&&identity.generationProfileId===value.generationProfileId&&typeof value.count==='number'&&Number.isSafeInteger(value.count)&&value.count>0;
}

export function assessHumanGenerationReadiness(requirements:readonly HumanGenerationRequirement[],registry:HumanGenerationContentRegistry):HumanGenerationReadiness{
 const reasons:string[]=[],unresolved=new Set<string>();
 if(!validateHumanGenerationContentRegistry(registry))return immutable({status:'not-ready',unresolvedProfileIds:[],blockingReasons:['content.invalid-registry']});
 if(!dense(requirements)||requirements.length===0)return immutable({status:'not-ready',unresolvedProfileIds:[],blockingReasons:['content.no-production-cohorts']});
 if(!requirements.every(validRequirement))return immutable({status:'not-ready',unresolvedProfileIds:[],blockingReasons:['content.invalid-cohorts']});
 const ordered=[...requirements].sort((a,b)=>codePointCompare(a.id,b.id)),packagesByProfile=new Map(registry.packages.map(content=>[content.profileId,content]));
 for(const requirement of ordered){
  const content=packagesByProfile.get(requirement.generationProfileId);
  if(!content){unresolved.add(requirement.generationProfileId);reasons.push(`content.unresolved-profile:${requirement.generationProfileId}`);continue;}
  if(content.countryId!==requirement.countryId){reasons.push(`content.country-mismatch:${requirement.id}`);continue;}
  try{resolveHumanGenerationProfile(content,requirement.birthYear);}catch(error){const message=error instanceof Error?error.message:'invalid content';reasons.push(`content.not-ready:${requirement.id}:${message}`);}
 }
 const blockingReasons=[...new Set(reasons)].sort(codePointCompare),unresolvedProfileIds=[...unresolved].sort(codePointCompare);
 return immutable({status:blockingReasons.length?'not-ready':'ready',unresolvedProfileIds,blockingReasons});
}

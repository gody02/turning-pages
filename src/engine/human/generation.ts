import {addDays,addYears,ageOn,compareDates,dateToOrdinal,isSimulationDate} from '../core/clock';
import type {SimulationDate} from '../core/model';
import {deriveFloat} from '../core/rng';
import {isJsonValue} from '../core/json';
import {APTITUDE_KEYS,isAptitudeKey,isTemperamentKey,TEMPERAMENT_KEYS,type AptitudeKey,type TemperamentKey} from './attributes';
import {allocatePerson,validPeople,type PeopleState,type Person,type PersonInput} from './person';
import {validPersonDisplayName} from '../shared/personDisplayName';

export const PERSON_GENERATION_VERSION=1 as const;

export type PersonGenerationContext={
 readonly version:1;
 readonly requestKey:string;
 readonly source:string;
 readonly referenceDate:SimulationDate;
 readonly countryId:string;
 readonly regionId?:string;
 readonly birth:
  | Readonly<{kind:'exact';date:SimulationDate}>
  | Readonly<{kind:'age-range';minimumAge:number;maximumAge:number}>;
 readonly namingProfileId:string;
 readonly gender:
  | Readonly<{kind:'explicit';label:string}>
  | Readonly<{kind:'profile'}>;
 readonly familyName?:string;
};

export type WeightedNameEntry=Readonly<{
 id:string;
 text:string;
 weight:number;
 genderLabels?:readonly string[];
}>;

export type WeightedGenderLabel=Readonly<{id:string;label:string;weight:number}>;

export type ScoreDistribution=
 | Readonly<{kind:'fixed';value:number}>
 | Readonly<{kind:'uniform';minimum:number;maximum:number}>
 | Readonly<{kind:'centered-average';minimum:number;maximum:number}>;

export type AttributeGenerationRule<Key extends string=string>=Readonly<{
 id:Key;
 distribution:ScoreDistribution;
}>;

export type PersonGenerationProfile=Readonly<{
 version:1;
 id:string;
 naming:Readonly<{
  givenNames:readonly WeightedNameEntry[];
  familyNames:readonly WeightedNameEntry[];
 }>;
 genderLabels:readonly WeightedGenderLabel[];
 temperament:readonly AttributeGenerationRule<TemperamentKey>[];
 aptitudes:readonly AttributeGenerationRule<AptitudeKey>[];
 traits?:readonly string[];
}>;

export type PersonGenerationIdentity=Readonly<{id:string;sequence:number}>;
export type GeneratedPersonAllocation=Readonly<{state:PeopleState;person:Person}>;

const stableIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=160&&value.includes('.')&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
const contextIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=100&&/^[a-z][a-z0-9-]*$/.test(value);
const genderLabel=(value:unknown):value is string=>typeof value==='string'&&value.length<=40;
const safeUint32=(value:unknown):value is number=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=0xffffffff;
const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;

const object=(value:unknown):value is Record<string,unknown>=>{
 try{return !!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);}catch{return false;}
};
const exactFields=(value:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>{
 try{
  const allowed=new Set([...required,...optional]),keys=Reflect.ownKeys(value);
  if(keys.some(key=>typeof key!=='string'||!allowed.has(key))||required.some(key=>!keys.includes(key)))return false;
  return keys.every(key=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);return !!descriptor?.enumerable&&'value' in descriptor;});
 }catch{return false;}
};
const exactDate=(value:unknown):value is SimulationDate=>object(value)&&exactFields(value,['year','month','day'])&&isSimulationDate(value);
const denseArray=(value:unknown):value is readonly unknown[]=>{
 try{
  if(!Array.isArray(value)||Object.keys(value).length!==value.length||Reflect.ownKeys(value).length!==value.length+1)return false;
  for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,index);if(!descriptor?.enumerable||!('value' in descriptor))return false;}
  return true;
 }catch{return false;}
};
const unique=(values:readonly string[])=>new Set(values).size===values.length;

function validWeightedName(value:unknown):value is WeightedNameEntry{
 if(!object(value)||!exactFields(value,['id','text','weight'],['genderLabels'])||!stableIdentifier(value.id)||!validPersonDisplayName(value.text)||typeof value.weight!=='number'||!Number.isFinite(value.weight)||value.weight<0)return false;
 if(value.genderLabels===undefined)return true;
 return denseArray(value.genderLabels)&&value.genderLabels.every(genderLabel)&&unique(value.genderLabels);
}

function validWeightedGender(value:unknown):value is WeightedGenderLabel{
 return object(value)&&exactFields(value,['id','label','weight'])&&stableIdentifier(value.id)&&genderLabel(value.label)&&typeof value.weight==='number'&&Number.isFinite(value.weight)&&value.weight>=0;
}

function validDistribution(value:unknown):value is ScoreDistribution{
 if(!object(value)||typeof value.kind!=='string')return false;
 if(value.kind==='fixed')return exactFields(value,['kind','value'])&&typeof value.value==='number'&&Number.isInteger(value.value)&&value.value>=0&&value.value<=100;
 if(value.kind==='uniform'||value.kind==='centered-average')return exactFields(value,['kind','minimum','maximum'])&&typeof value.minimum==='number'&&Number.isInteger(value.minimum)&&value.minimum>=0&&value.minimum<=100&&typeof value.maximum==='number'&&Number.isInteger(value.maximum)&&value.maximum>=value.minimum&&value.maximum<=100;
 return false;
}

function validRules<Key extends string>(value:unknown,keyGuard:(key:unknown)=>key is Key):value is readonly AttributeGenerationRule<Key>[] {
 if(!denseArray(value))return false;
 const ids:string[]=[];
 for(const rule of value){if(!object(rule)||!exactFields(rule,['id','distribution'])||!keyGuard(rule.id)||!validDistribution(rule.distribution))return false;ids.push(rule.id);}
 return unique(ids);
}

export function validPersonGenerationProfile(value:unknown):value is PersonGenerationProfile{
 try{
  if(!isJsonValue(value)||!object(value)||!exactFields(value,['version','id','naming','genderLabels','temperament','aptitudes'],['traits'])||value.version!==PERSON_GENERATION_VERSION||!stableIdentifier(value.id)||!object(value.naming)||!exactFields(value.naming,['givenNames','familyNames']))return false;
  if(!denseArray(value.naming.givenNames)||!value.naming.givenNames.every(validWeightedName))return false;
  const givenNames=value.naming.givenNames as unknown as readonly WeightedNameEntry[];
  if(!unique(givenNames.map(entry=>entry.id)))return false;
  if(!denseArray(value.naming.familyNames)||!value.naming.familyNames.every(validWeightedName))return false;
  const familyNames=value.naming.familyNames as unknown as readonly WeightedNameEntry[];
  if(!unique(familyNames.map(entry=>entry.id)))return false;
  if(!denseArray(value.genderLabels)||!value.genderLabels.every(validWeightedGender))return false;
  const labels=value.genderLabels as readonly WeightedGenderLabel[];
  if(!unique(labels.map(entry=>entry.id)))return false;
  if(!validRules(value.temperament,isTemperamentKey)||!validRules(value.aptitudes,isAptitudeKey))return false;
  if(value.traits!==undefined&&(!denseArray(value.traits)||!value.traits.every(stableIdentifier)||!unique(value.traits)))return false;
  return true;
 }catch{return false;}
}

export function validPersonGenerationContext(value:unknown):value is PersonGenerationContext{
 try{
  if(!isJsonValue(value)||!object(value)||!exactFields(value,['version','requestKey','source','referenceDate','countryId','birth','namingProfileId','gender'],['regionId','familyName'])||value.version!==PERSON_GENERATION_VERSION||!stableIdentifier(value.requestKey)||!stableIdentifier(value.source)||!exactDate(value.referenceDate)||!contextIdentifier(value.countryId)||!stableIdentifier(value.namingProfileId))return false;
  if(value.regionId!==undefined&&!contextIdentifier(value.regionId))return false;
  if(value.familyName!==undefined&&!validPersonDisplayName(value.familyName))return false;
  if(!object(value.gender)||typeof value.gender.kind!=='string')return false;
  if(value.gender.kind==='explicit'){if(!exactFields(value.gender,['kind','label'])||!genderLabel(value.gender.label))return false;}
  else if(value.gender.kind==='profile'){if(!exactFields(value.gender,['kind']))return false;}
  else return false;
  if(!object(value.birth)||typeof value.birth.kind!=='string')return false;
  if(value.birth.kind==='exact')return exactFields(value.birth,['kind','date'])&&exactDate(value.birth.date)&&compareDates(value.birth.date,value.referenceDate)<=0;
  if(value.birth.kind!=='age-range'||!exactFields(value.birth,['kind','minimumAge','maximumAge']))return false;
  const minimum=value.birth.minimumAge,maximum=value.birth.maximumAge;
  return typeof minimum==='number'&&typeof maximum==='number'&&Number.isSafeInteger(minimum)&&Number.isSafeInteger(maximum)&&minimum>=0&&maximum>=minimum&&maximum<=150;
 }catch{return false;}
}

/** Length-prefixing keeps generation keys unambiguous when identifiers contain separators. */
export function personGenerationKey(...parts:readonly string[]):string{
 const key=parts.map(part=>`${part.length}:${part}`).join('|');
 if(!key||key.length>500)throw Error('Invalid Person generation key.');
 return key;
}

const draw=(rootSeed:number,identity:PersonGenerationIdentity,profile:PersonGenerationProfile,attribute:string,subKey='')=>deriveFloat(rootSeed,personGenerationKey('human-generation','v1',identity.id,profile.id,attribute,subKey));

function selectWeighted<T extends {id:string;weight:number}>(entries:readonly T[],sample:number,message:string):T{
 const eligible=entries.filter(entry=>entry.weight>0).sort((left,right)=>codePointCompare(left.id,right.id));
 if(!eligible.length)throw Error(message);
 const total=eligible.reduce((sum,entry)=>sum+entry.weight,0);
 if(!Number.isFinite(total)||total<=0)throw Error(message);
 let cursor=sample*total;
 for(const entry of eligible){if(cursor<entry.weight)return entry;cursor-=entry.weight;}
 return eligible[eligible.length-1];
}

function generatedBirthDate(rootSeed:number,identity:PersonGenerationIdentity,profile:PersonGenerationProfile,context:PersonGenerationContext):SimulationDate{
 if(context.birth.kind==='exact')return {...context.birth.date};
 const latest=addYears(context.referenceDate,-context.birth.minimumAge);
 const olderBoundary=addYears(context.referenceDate,-(context.birth.maximumAge+1));
 const earliest=addDays(olderBoundary,1),span=dateToOrdinal(latest)-dateToOrdinal(earliest)+1;
 if(span<=0)throw Error('Invalid Person generation age range.');
 const date=addDays(earliest,Math.floor(draw(rootSeed,identity,profile,'birth-date')*span));
 const age=ageOn(date,context.referenceDate);
 if(age<context.birth.minimumAge||age>context.birth.maximumAge)throw Error('Generated birth date is outside the requested age range.');
 return date;
}

function generatedScore(rootSeed:number,identity:PersonGenerationIdentity,profile:PersonGenerationProfile,rule:AttributeGenerationRule):number{
 const distribution=rule.distribution;
 if(distribution.kind==='fixed')return distribution.value;
 const scale=(sample:number)=>distribution.minimum+sample*(distribution.maximum-distribution.minimum);
 if(distribution.kind==='uniform')return Math.round(scale(draw(rootSeed,identity,profile,rule.id,'uniform')));
 const first=scale(draw(rootSeed,identity,profile,rule.id,'center-a')),second=scale(draw(rootSeed,identity,profile,rule.id,'center-b'));
 return Math.round((first+second)/2);
}

function generatedScores(rootSeed:number,identity:PersonGenerationIdentity,profile:PersonGenerationProfile,rules:readonly AttributeGenerationRule[]):Record<string,number>{
 const scores:Record<string,number>={};
 for(const rule of [...rules].sort((left,right)=>codePointCompare(left.id,right.id)))scores[rule.id]=generatedScore(rootSeed,identity,profile,rule);
 return scores;
}

function validIdentity(value:unknown):value is PersonGenerationIdentity{
 return object(value)&&exactFields(value,['id','sequence'])&&Number.isSafeInteger(value.sequence)&&typeof value.sequence==='number'&&value.sequence>0&&value.id===`person:${value.sequence}`;
}

/** Pure generation from an already allocated identity. It consumes no mutable RNG stream. */
export function generatePersonInput(rootSeed:number,identity:PersonGenerationIdentity,context:PersonGenerationContext,profile:PersonGenerationProfile):PersonInput{
 if(!safeUint32(rootSeed)||!validIdentity(identity)||!validPersonGenerationContext(context)||!validPersonGenerationProfile(profile)||context.namingProfileId!==profile.id)throw Error('Invalid Person generation request.');
 const generatedGender=context.gender.kind==='explicit'?context.gender.label:selectWeighted(profile.genderLabels,draw(rootSeed,identity,profile,'gender-label'),'Generation profile has no eligible gender label.').label;
 const givenCandidates=profile.naming.givenNames.filter(entry=>entry.genderLabels===undefined||entry.genderLabels.includes(generatedGender));
 const given=selectWeighted(givenCandidates,draw(rootSeed,identity,profile,'given-name'),'Generation profile has no eligible given name.').text;
 const family=context.familyName??selectWeighted(profile.naming.familyNames,draw(rootSeed,identity,profile,'family-name'),'Generation profile has no eligible family name.').text;
 const name=`${given} ${family}`;
 if(!validPersonDisplayName(name))throw Error('Generated Person name is invalid.');
 return {
  name,
  dateOfBirth:generatedBirthDate(rootSeed,identity,profile,context),
  genderLabel:generatedGender,
  lifeStatus:'living',
  traits:[...(profile.traits??[])],
  temperament:generatedScores(rootSeed,identity,profile,profile.temperament),
  aptitudes:generatedScores(rootSeed,identity,profile,profile.aptitudes),
 };
}

/** Identity-first, transactional allocation into the existing PeopleState. */
export function generateAndAllocatePerson(state:PeopleState,rootSeed:number,context:PersonGenerationContext,profile:PersonGenerationProfile):GeneratedPersonAllocation{
 if(!validPeople(state)||state.nextSequence===Number.MAX_SAFE_INTEGER)throw Error('Invalid People state.');
 const identity={id:`person:${state.nextSequence}`,sequence:state.nextSequence};
 const input=generatePersonInput(rootSeed,identity,context,profile);
 const allocated=allocatePerson(state,input);
 if(allocated.person.id!==identity.id||allocated.person.sequence!==identity.sequence)throw Error('Person allocation identity mismatch.');
 return allocated;
}

export const HUMAN_GENERATION_CATALOGUES=Object.freeze({temperament:TEMPERAMENT_KEYS,aptitudes:APTITUDE_KEYS});

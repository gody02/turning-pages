import {addDays,daysInMonth,isSimulationDate,isSimulationYear} from '../core/clock';
import {deriveFloat} from '../core/rng';
import type {SimulationDate} from '../core/model';
import {generateAndAllocatePerson,personGenerationKey,validPersonGenerationProfile,type PersonGenerationProfile} from './generation';
import {validPeople,type PeopleState,type Person} from './person';

export const POPULATION_VERSION=1 as const;
export const LEGACY_POPULATION_SOURCE='population.legacy-membership-v1';
export const PLAYER_POPULATION_SOURCE='population.player-creation-v1';
export const COUNTRY_START_POPULATION_SOURCE='population.country-start-v1';

export type PopulationCoverage=Readonly<{
 countryId:string;
 status:'partial'|'complete';
 source:string;
 areaPartitionId:string|null;
}>;
export type PopulationCohort=Readonly<{
 id:string;
 countryId:string;
 areaId:string|null;
 birthYear:number;
 generationProfileId:string;
 count:number;
}>;
export type PopulationMembershipOrigin=
 | Readonly<{kind:'legacy'}>
 | Readonly<{kind:'explicit';source:string}>
 | Readonly<{kind:'cohort';cohortId:string;requestKey:string;requestIndex:number}>;
export type PopulationMembership=Readonly<{
 personId:string;
 countryId:string|null;
 areaId:string|null;
 origin:PopulationMembershipOrigin;
}>;
export type PopulationState=Readonly<{
 version:1;
 coverage:readonly PopulationCoverage[];
 cohorts:readonly PopulationCohort[];
 memberships:readonly PopulationMembership[];
}>;
export type CohortIdentity=Readonly<{countryId:string;areaId:string|null;birthYear:number;generationProfileId:string}>;
export type PopulationCohortInput=CohortIdentity&Readonly<{count:number}>;
export type PopulationTotals=Readonly<{knownLiving:number;complete:boolean}>;
export type RepresentedLivingPopulation=Readonly<{knownLiving:number;unknownCountryLiving:number}>;
export type CohortInstantiationRequest=Readonly<{
 people:PeopleState;
 population:PopulationState;
 rootSeed:number;
 cohortId:string;
 requestKey:string;
 count:number;
 referenceDate:SimulationDate;
 profile:PersonGenerationProfile;
}>;
export type CohortInstantiationResult=Readonly<{
 people:PeopleState;
 population:PopulationState;
 persons:readonly Person[];
 reused:boolean;
}>;

const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const stableIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=160&&value.includes('.')&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
const contextIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=100&&/^[a-z][a-z0-9-]*$/.test(value);
const areaIdentifier=(value:unknown):value is string=>stableIdentifier(value);
const personId=(value:unknown):value is string=>typeof value==='string'&&/^person:[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value.slice(7)));
const safePositive=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const safeNonnegative=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
const birthYear=(value:unknown):value is number=>isSimulationYear(value);
const record=(value:unknown):value is Record<string,unknown>=>{try{return !!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);}catch{return false;}};
const fields=(value:Record<string,unknown>,required:readonly string[])=>{try{const keys=Reflect.ownKeys(value);if(keys.length!==required.length||keys.some(key=>typeof key!=='string'||!required.includes(key))||required.some(key=>!keys.includes(key)))return false;return keys.every(key=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);return !!descriptor?.enumerable&&'value' in descriptor;});}catch{return false;}};
const dense=(value:unknown):value is readonly unknown[]=>{try{if(!Array.isArray(value)||Object.keys(value).length!==value.length||Reflect.ownKeys(value).length!==value.length+1)return false;for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,index);if(!descriptor?.enumerable||!('value' in descriptor))return false;}return true;}catch{return false;}};
function freezeDeep(value:unknown):void{if(!value||typeof value!=='object'||Object.isFrozen(value))return;for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(descriptor&&'value' in descriptor)freezeDeep(descriptor.value);}Object.freeze(value);}
function immutable<T>(value:T):T{const copy=structuredClone(value);freezeDeep(copy);return copy;}

const encodePart=(value:string)=>`${value.length}:${value}`;
const COHORT_PREFIX='population-cohort:v1|';
export function populationCohortId(identity:CohortIdentity):string{
 if(!contextIdentifier(identity.countryId)||(identity.areaId!==null&&!areaIdentifier(identity.areaId))||!birthYear(identity.birthYear)||!stableIdentifier(identity.generationProfileId))throw Error('Invalid population cohort identity.');
 return `${COHORT_PREFIX}${encodePart(identity.countryId)}|${identity.areaId===null?'-':encodePart(identity.areaId)}|${String(identity.birthYear).padStart(4,'0')}|${encodePart(identity.generationProfileId)}`;
}
function readPart(text:string,start:number):{value:string;next:number}|null{
 const colon=text.indexOf(':',start);if(colon<start+1)return null;const lengthText=text.slice(start,colon);if(!/^\d+$/.test(lengthText))return null;const length=Number(lengthText);if(!Number.isSafeInteger(length)||length<0)return null;const begin=colon+1,end=begin+length;if(end>text.length)return null;return {value:text.slice(begin,end),next:end};
}
export function parsePopulationCohortId(value:unknown):CohortIdentity|null{
 try{
  if(typeof value!=='string'||value.length>600||!value.startsWith(COHORT_PREFIX))return null;
  let cursor=COHORT_PREFIX.length;const country=readPart(value,cursor);if(!country||value[country.next]!=='|')return null;cursor=country.next+1;
  let area:string|null=null;if(value[cursor]==='-'){cursor++;}else{const parsed=readPart(value,cursor);if(!parsed)return null;area=parsed.value;cursor=parsed.next;}
  if(value[cursor]!=='|')return null;cursor++;const yearEnd=value.indexOf('|',cursor);if(yearEnd<0)return null;const yearText=value.slice(cursor,yearEnd);if(!/^\d{4}$/.test(yearText))return null;const year=Number(yearText);cursor=yearEnd+1;
  const profile=readPart(value,cursor);if(!profile||profile.next!==value.length)return null;
  const identity={countryId:country.value,areaId:area,birthYear:year,generationProfileId:profile.value};
  return populationCohortId(identity)===value?identity:null;
 }catch{return null;}
}

function validCoverage(value:unknown):value is PopulationCoverage{
 return record(value)&&fields(value,['countryId','status','source','areaPartitionId'])&&contextIdentifier(value.countryId)&&(value.status==='partial'||value.status==='complete')&&stableIdentifier(value.source)&&(value.areaPartitionId===null||areaIdentifier(value.areaPartitionId));
}
function validCohort(value:unknown):value is PopulationCohort{
 if(!record(value)||!fields(value,['id','countryId','areaId','birthYear','generationProfileId','count'])||!contextIdentifier(value.countryId)||(value.areaId!==null&&!areaIdentifier(value.areaId))||!birthYear(value.birthYear)||!stableIdentifier(value.generationProfileId)||!safePositive(value.count))return false;
 try{return value.id===populationCohortId(value as unknown as CohortIdentity);}catch{return false;}
}
function validOrigin(value:unknown):value is PopulationMembershipOrigin{
 if(!record(value)||typeof value.kind!=='string')return false;
 if(value.kind==='legacy')return fields(value,['kind']);
 if(value.kind==='explicit')return fields(value,['kind','source'])&&stableIdentifier(value.source);
 return value.kind==='cohort'&&fields(value,['kind','cohortId','requestKey','requestIndex'])&&parsePopulationCohortId(value.cohortId)!==null&&stableIdentifier(value.requestKey)&&safeNonnegative(value.requestIndex);
}
function validMembership(value:unknown):value is PopulationMembership{
 return record(value)&&fields(value,['personId','countryId','areaId','origin'])&&personId(value.personId)&&(value.countryId===null||contextIdentifier(value.countryId))&&(value.areaId===null||areaIdentifier(value.areaId))&&validOrigin(value.origin);
}
function safeAdd(total:number,value:number):number{const next=total+value;if(!Number.isSafeInteger(next))throw Error('Population count exceeds the safe integer range.');return next;}
const membershipSequence=(membership:PopulationMembership)=>Number(membership.personId.slice(7));

export function validPopulation(value:unknown):value is PopulationState{
 try{
  if(!record(value)||!fields(value,['version','coverage','cohorts','memberships'])||value.version!==POPULATION_VERSION||!dense(value.coverage)||!dense(value.cohorts)||!dense(value.memberships))return false;
  let previousCountry='',total=0;const coverageCountries=new Set<string>(),coverageByCountry=new Map<string,PopulationCoverage>();
  for(const item of value.coverage){if(!validCoverage(item)||coverageCountries.has(item.countryId)||previousCountry&&codePointCompare(previousCountry,item.countryId)>=0)return false;coverageCountries.add(item.countryId);coverageByCountry.set(item.countryId,item);previousCountry=item.countryId;}
  let previousCohort='';const cohortCells=new Set<string>();
  for(const item of value.cohorts){if(!validCohort(item))return false;const coverage=coverageByCountry.get(item.countryId);if(!coverage||coverage.areaPartitionId===null&&item.areaId!==null||coverage.areaPartitionId!==null&&item.areaId===null||previousCohort&&codePointCompare(previousCohort,item.id)>=0||cohortCells.has(item.id))return false;cohortCells.add(item.id);previousCohort=item.id;total=safeAdd(total,item.count);}
  let previousSequence=0;const memberIds=new Set<string>(),requests=new Map<string,{cohortId:string;nextIndex:number}>();
  for(const item of value.memberships){if(!validMembership(item))return false;const coverage=item.countryId===null?undefined:coverageByCountry.get(item.countryId);if(memberIds.has(item.personId)||membershipSequence(item)<=previousSequence||item.countryId===null&&item.areaId!==null||item.countryId!==null&&!coverage||coverage?.areaPartitionId===null&&item.areaId!==null)return false;memberIds.add(item.personId);previousSequence=membershipSequence(item);
   if(item.origin.kind==='cohort'){const identity=parsePopulationCohortId(item.origin.cohortId);if(!identity||identity.countryId!==item.countryId||identity.areaId!==item.areaId)return false;const receipt=requests.get(item.origin.requestKey);if(receipt&&receipt.cohortId!==item.origin.cohortId||item.origin.requestIndex!==(receipt?.nextIndex??0))return false;if(receipt)receipt.nextIndex++;else requests.set(item.origin.requestKey,{cohortId:item.origin.cohortId,nextIndex:1});}
  }
  return Number.isSafeInteger(total);
 }catch{return false;}
}

export function validPopulationWithPeople(population:unknown,people:unknown):population is PopulationState{
 if(!validPopulation(population)||!validPeople(people)||population.memberships.length!==people.people.length)return false;
 const coverageByCountry=new Map(population.coverage.map(item=>[item.countryId,item]));
 for(let index=0;index<people.people.length;index++){
  const person=people.people[index],membership=population.memberships[index];if(membership?.personId!==person.id)return false;
  if(membership.origin.kind==='cohort'&&parsePopulationCohortId(membership.origin.cohortId)?.birthYear!==person.dateOfBirth.year)return false;
  const coverage=membership.countryId===null?undefined:coverageByCountry.get(membership.countryId);
  if(person.lifeStatus==='living'&&coverage?.status==='complete'&&coverage.areaPartitionId!==null&&membership.areaId===null)return false;
 }
 if(population.memberships.filter(item=>item.personId===people.playerId).length!==1)return false;
 try{let living=0;for(const cohort of population.cohorts)living=safeAdd(living,cohort.count);for(const person of people.people)if(person.lifeStatus==='living')living=safeAdd(living,1);return Number.isSafeInteger(living);}catch{return false;}
}

/** Canonical cohort receipt construction shared by ordinary extraction and initial-world composition. */
export function createCohortMembership(person:Person,cohortId:string,requestKey:string,requestIndex:number):PopulationMembership{
 const identity=parsePopulationCohortId(cohortId);
 if(!identity||!stableIdentifier(requestKey)||!safeNonnegative(requestIndex)||person.dateOfBirth.year!==identity.birthYear)throw Error('Invalid cohort membership receipt.');
 const membership=immutable({personId:person.id,countryId:identity.countryId,areaId:identity.areaId,origin:{kind:'cohort' as const,cohortId,requestKey,requestIndex}});
 if(!validMembership(membership))throw Error('Invalid cohort membership receipt.');return membership;
}

/** Bootstrap-only bridge: accounting is completed later by calibration reservation. */
export function createInitialCohortBackedPopulation(people:PeopleState,cohortId:string,requestKey:string):PopulationState{
 if(!validPeople(people)||people.people.length!==1||people.playerId!==people.people[0].id)throw Error('Initial cohort population requires exactly one player Person.');
 const identity=parsePopulationCohortId(cohortId);if(!identity||identity.areaId!==null)throw Error('Initial cohort bootstrap supports only an unpartitioned country population.');
 const state=immutable({version:POPULATION_VERSION,coverage:[{countryId:identity.countryId,status:'partial' as const,source:COUNTRY_START_POPULATION_SOURCE,areaPartitionId:null}],cohorts:[],memberships:[createCohortMembership(people.people[0],cohortId,requestKey,0)]});
 if(!validPopulationWithPeople(state,people))throw Error('Invalid initial cohort-backed population.');return state;
}

export function createPopulation():PopulationState{return immutable({version:POPULATION_VERSION,coverage:[],cohorts:[],memberships:[]});}

/** New-world player accounting. It is explicit current creation, not legacy provenance. */
export function createPlayerPopulation(people:PeopleState,playerCountryId:string):PopulationState{
 if(!validPeople(people)||people.people.length!==1||!contextIdentifier(playerCountryId))throw Error('Invalid player population input.');
 const state=immutable({version:POPULATION_VERSION,coverage:[{countryId:playerCountryId,status:'partial' as const,source:PLAYER_POPULATION_SOURCE,areaPartitionId:null}],cohorts:[],memberships:[{personId:people.playerId,countryId:playerCountryId,areaId:null,origin:{kind:'explicit' as const,source:PLAYER_POPULATION_SOURCE}}]});
 if(!validPopulationWithPeople(state,people))throw Error('Invalid player population state.');return state;
}

/** Migration-only accounting. It creates no cohorts and asserts no complete country. */
export function createLegacyPopulation(people:PeopleState,playerCountryId:string):PopulationState{
 if(!validPeople(people)||!contextIdentifier(playerCountryId))throw Error('Invalid legacy population input.');
 const coverage:PopulationCoverage[]=[{countryId:playerCountryId,status:'partial',source:LEGACY_POPULATION_SOURCE,areaPartitionId:null}];
 const memberships=people.people.map(person=>({personId:person.id,countryId:person.id===people.playerId?playerCountryId:null,areaId:null,origin:{kind:'legacy'} as const}));
 const state=immutable({version:POPULATION_VERSION,coverage,memberships,cohorts:[]});if(!validPopulationWithPeople(state,people))throw Error('Invalid legacy population state.');return state;
}

/** Deliberate atomic initialization/replacement; COMPLETE is never inferred by migration. */
export function initializeCompleteCountryPopulation(state:PopulationState,people:PeopleState,input:Readonly<{countryId:string;source:string;areaPartitionId:string|null;cohorts:readonly PopulationCohortInput[]}>):PopulationState{
 if(!validPopulationWithPeople(state,people)||!contextIdentifier(input.countryId)||!stableIdentifier(input.source)||(input.areaPartitionId!==null&&!areaIdentifier(input.areaPartitionId)))throw Error('Invalid complete population initialization.');
 const existing=state.coverage.find(item=>item.countryId===input.countryId);if(existing?.status==='complete')throw Error('Country population is already complete.');
 for(const person of people.people){const membership=state.memberships[person.sequence-1];if(person.lifeStatus==='living'&&membership.countryId===null)throw Error('Complete population initialization cannot classify unknown living memberships.');if(person.lifeStatus==='living'&&membership.countryId===input.countryId&&input.areaPartitionId!==null&&membership.areaId===null)throw Error('Complete area partition requires known living membership areas.');}
 const coverage=[...state.coverage.filter(item=>item.countryId!==input.countryId),{countryId:input.countryId,status:'complete' as const,source:input.source,areaPartitionId:input.areaPartitionId}].sort((a,b)=>codePointCompare(a.countryId,b.countryId));
 const cohorts=[...state.cohorts.filter(item=>item.countryId!==input.countryId),...input.cohorts.map(cohort=>{if(cohort.countryId!==input.countryId)throw Error('Complete population cohorts must share a country.');return {id:populationCohortId(cohort),...cohort};})].sort((a,b)=>codePointCompare(a.id,b.id));
 const next=immutable({version:POPULATION_VERSION,coverage,cohorts,memberships:state.memberships});if(!validPopulationWithPeople(next,people))throw Error('Complete population partition is invalid.');return next;
}

export function addPartialPopulationCoverage(state:PopulationState,input:Readonly<{countryId:string;source:string;areaPartitionId:string|null}>):PopulationState{
 if(!validPopulation(state)||!contextIdentifier(input.countryId)||!stableIdentifier(input.source)||(input.areaPartitionId!==null&&!areaIdentifier(input.areaPartitionId))||state.coverage.some(item=>item.countryId===input.countryId))throw Error('Invalid partial population coverage.');
 const next=immutable({...state,coverage:[...state.coverage,{...input,status:'partial' as const}].sort((a,b)=>codePointCompare(a.countryId,b.countryId))});if(!validPopulation(next))throw Error('Invalid population state.');return next;
}

export function addPopulationCohort(state:PopulationState,input:PopulationCohortInput):PopulationState{
 if(!validPopulation(state)||!state.coverage.some(item=>item.countryId===input.countryId))throw Error('Population coverage is required before adding a cohort.');
 const id=populationCohortId(input),cohort={id,...input};if(!validCohort(cohort)||state.cohorts.some(item=>item.id===id))throw Error('Invalid or duplicate population cohort.');
 const next=immutable({...state,cohorts:[...state.cohorts,cohort].sort((a,b)=>codePointCompare(a.id,b.id))});if(!validPopulation(next))throw Error('Invalid population state.');return next;
}

export function adjustPopulationCohort(state:PopulationState,cohortId:string,delta:number):PopulationState{
 if(!validPopulation(state)||!Number.isSafeInteger(delta)||delta===0)throw Error('Invalid cohort adjustment.');const index=state.cohorts.findIndex(item=>item.id===cohortId);if(index<0)throw Error('Unknown population cohort.');
 const count=state.cohorts[index].count+delta;if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid population cohort count.');const cohorts=[...state.cohorts];if(count===0)cohorts.splice(index,1);else cohorts[index]={...cohorts[index],count};
 const next=immutable({...state,cohorts});if(!validPopulation(next))throw Error('Invalid population state.');return next;
}

export function deriveCountryPopulation(population:PopulationState,people:PeopleState,countryId:string):PopulationTotals{
 if(!validPopulationWithPeople(population,people)||!contextIdentifier(countryId))throw Error('Invalid population query.');let knownLiving=0;
 for(const cohort of population.cohorts)if(cohort.countryId===countryId)knownLiving=safeAdd(knownLiving,cohort.count);
 for(const membership of population.memberships)if(membership.countryId===countryId&&people.people[membershipSequence(membership)-1]?.lifeStatus==='living')knownLiving=safeAdd(knownLiving,1);
 return immutable({knownLiving,complete:population.coverage.some(item=>item.countryId===countryId&&item.status==='complete')});
}

export function deriveRepresentedLivingPopulation(population:PopulationState,people:PeopleState):RepresentedLivingPopulation{
 if(!validPopulationWithPeople(population,people))throw Error('Invalid population query.');let knownLiving=0,unknownCountryLiving=0;
 for(const cohort of population.cohorts)knownLiving=safeAdd(knownLiving,cohort.count);
 for(const membership of population.memberships)if(people.people[membershipSequence(membership)-1]?.lifeStatus==='living'){if(membership.countryId===null)unknownCountryLiving=safeAdd(unknownCountryLiving,1);else knownLiving=safeAdd(knownLiving,1);}
 return immutable({knownLiving,unknownCountryLiving});
}

function deterministicBirthDate(rootSeed:number,personIdValue:string,requestKey:string,requestIndex:number,cohort:PopulationCohort,referenceDate:SimulationDate):SimulationDate{
 if(!isSimulationDate(referenceDate)||cohort.birthYear>referenceDate.year)throw Error('Cohort birth year is after the reference date.');const endMonth=cohort.birthYear===referenceDate.year?referenceDate.month:12,endDay=cohort.birthYear===referenceDate.year?referenceDate.day:daysInMonth(cohort.birthYear,12);
 let available=0;for(let month=1;month<endMonth;month++)available+=daysInMonth(cohort.birthYear,month);available+=endDay;
 const key=personGenerationKey('population-instantiation','v1',personIdValue,cohort.id,requestKey,String(requestIndex),'date-of-birth'),offset=Math.floor(deriveFloat(rootSeed,key)*available);
 return addDays({year:cohort.birthYear,month:1,day:1},offset);
}

export function instantiateFromCohort(request:CohortInstantiationRequest):CohortInstantiationResult{
 const {people,population,rootSeed,cohortId,requestKey,count,referenceDate,profile}=request;
 if(!validPopulationWithPeople(population,people)||!safeNonnegative(rootSeed)||rootSeed>0xffffffff||!stableIdentifier(requestKey)||!safePositive(count)||!isSimulationDate(referenceDate)||!validPersonGenerationProfile(profile))throw Error('Invalid population instantiation request.');
 const receipts=population.memberships.filter(item=>item.origin.kind==='cohort'&&item.origin.requestKey===requestKey);
 if(receipts.length){const origins=receipts.map(item=>item.origin).filter((origin):origin is Extract<PopulationMembershipOrigin,{kind:'cohort'}>=>origin.kind==='cohort'),identity=parsePopulationCohortId(cohortId);if(!identity||profile.id!==identity.generationProfileId||origins.length!==count||origins.some((origin,index)=>origin.cohortId!==cohortId||origin.requestIndex!==index))throw Error('Population request key conflicts with an existing request.');const persons=receipts.map(item=>people.people[membershipSequence(item)-1]);if(persons.some(person=>!person))throw Error('Population request receipt is invalid.');return immutable({people,population,persons,reused:true});}
 const cohort=population.cohorts.find(item=>item.id===cohortId);if(!cohort||cohort.count<count)throw Error('Population cohort has insufficient people.');if(profile.id!==cohort.generationProfileId)throw Error('Population generation profile does not match the cohort.');
 let candidatePeople=people;const persons:Person[]=[];
 for(let index=0;index<count;index++){
  const identity=`person:${candidatePeople.nextSequence}`,dateOfBirth=deterministicBirthDate(rootSeed,identity,requestKey,index,cohort,referenceDate),allocated=generateAndAllocatePerson(candidatePeople,rootSeed,{version:1,requestKey,source:'population.cohort-instantiation',referenceDate,countryId:cohort.countryId,birth:{kind:'exact',date:dateOfBirth},namingProfileId:cohort.generationProfileId,gender:{kind:'profile'}},profile);
  candidatePeople=allocated.state;persons.push(allocated.person);
 }
 let candidatePopulation=adjustPopulationCohort(population,cohortId,-count);
 const memberships=[...candidatePopulation.memberships,...persons.map((person,index)=>createCohortMembership(person,cohortId,requestKey,index))].sort((a,b)=>membershipSequence(a)-membershipSequence(b));
 candidatePopulation=immutable({...candidatePopulation,memberships});
 if(!validPeople(candidatePeople)||!validPopulationWithPeople(candidatePopulation,candidatePeople))throw Error('Population instantiation failed validation.');
 return immutable({people:candidatePeople,population:candidatePopulation,persons,reused:false});
}

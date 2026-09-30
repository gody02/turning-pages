import candidateJson from './compiled-population-v3-candidate.json';
import reportJson from './allocation-report.json';
import {populationCohortId,validPopulation,type PopulationCohortInput,type PopulationState} from '../../../../engine/human/population';

export const UK_GEOGRAPHIC_POPULATION_CANDIDATE_ID='uk.population.mid-2024.v3' as const;
export const UK_GEOGRAPHIC_POPULATION_PARTITION_ID='geography.uk.primary-local-admin-2024-06-30-v1' as const;
export const UK_GEOGRAPHIC_POPULATION_FINGERPRINT='fnv1a64-v1:2894f4c1b1fdd274' as const;
export const UK_GEOGRAPHIC_POPULATION_TOTAL=69_281_437 as const;

export type UkGeographicPopulationCandidate=Readonly<{
 schemaVersion:1;id:typeof UK_GEOGRAPHIC_POPULATION_CANDIDATE_ID;status:'candidate';countryId:'uk';effectiveDate:Readonly<{year:2024;month:6;day:30}>;
 populationUniverseId:string;sourcePopulationPackageId:'uk.population.mid-2024.v2';sourcePopulationFingerprint:string;
 geographyPartitionId:typeof UK_GEOGRAPHIC_POPULATION_PARTITION_ID;geographyPartitionFingerprint:string;sourceArtifactSha256:string;
 generationProfileId:string;cohorts:readonly Readonly<{id:string;countryId:'uk';areaId:string;birthYear:number;generationProfileId:string;count:number}>[];fingerprint:string;
}>;

const codePointCompare=(a:string,b:string)=>a<b?-1:a>b?1:0;
const canonical=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>codePointCompare(a,b))):item);
function fingerprint(value:unknown):string{let hash=0xcbf29ce484222325n;for(const byte of new TextEncoder().encode(canonical(value))){hash^=BigInt(byte);hash=BigInt.asUintN(64,hash*0x100000001b3n);}return `fnv1a64-v1:${hash.toString(16).padStart(16,'0')}`;}
function deepFreeze(value:unknown):void{if(!value||typeof value!=='object'||Object.isFrozen(value))return;for(const key of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,key);if(d&&'value'in d)deepFreeze(d.value);}Object.freeze(value);}
const packageValue=candidateJson as unknown as UkGeographicPopulationCandidate;
deepFreeze(packageValue);deepFreeze(reportJson);

export function validateUkGeographicPopulationCandidate(value:unknown):value is UkGeographicPopulationCandidate{
 try{
  const v=value as UkGeographicPopulationCandidate;
  if(!v||typeof v!=='object'||Array.isArray(v)||v.schemaVersion!==1||v.id!==UK_GEOGRAPHIC_POPULATION_CANDIDATE_ID||v.status!=='candidate'||v.countryId!=='uk'||v.geographyPartitionId!==UK_GEOGRAPHIC_POPULATION_PARTITION_ID||v.fingerprint!==UK_GEOGRAPHIC_POPULATION_FINGERPRINT||!Array.isArray(v.cohorts)||v.cohorts.length!==38_731)return false;
  let previous='',total=0;
  for(const c of v.cohorts){if(c.countryId!=='uk'||c.areaId===null||!Number.isSafeInteger(c.count)||c.count<=0||c.id!==populationCohortId(c)||previous&&codePointCompare(previous,c.id)>=0)return false;previous=c.id;total+=c.count;if(!Number.isSafeInteger(total))return false;}
  const {fingerprint:declared,...semantics}=v;return total===UK_GEOGRAPHIC_POPULATION_TOTAL&&declared===fingerprint(semantics);
 }catch{return false;}
}

export function loadUkGeographicPopulationCandidate():UkGeographicPopulationCandidate{
 if(!validateUkGeographicPopulationCandidate(packageValue))throw Error('UK geographic population candidate failed integrity validation.');return packageValue;
}

export function ukGeographicPopulationCohortInputs():readonly PopulationCohortInput[]{
 return loadUkGeographicPopulationCandidate().cohorts.map(({id:_id,...cohort})=>Object.freeze({...cohort}));
}

export function createUkGeographicCandidatePopulationState():PopulationState{
 const pkg=loadUkGeographicPopulationCandidate();
 const state={version:1 as const,coverage:[{countryId:'uk',status:'complete' as const,source:pkg.id,areaPartitionId:pkg.geographyPartitionId}],cohorts:pkg.cohorts,memberships:[]};
 if(!validPopulation(state))throw Error('UK geographic population candidate cannot form PopulationState v1.');deepFreeze(state);return state;
}

export const UK_GEOGRAPHIC_POPULATION_ALLOCATION_REPORT=reportJson;

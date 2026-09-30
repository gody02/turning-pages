import {instantiateFromCohort,parsePopulationCohortId,type CohortInstantiationRequest,type CohortInstantiationResult} from '../population';
import type {HumanGenerationContentRegistry} from './types';
import {registeredHumanGenerationPackage,validateHumanGenerationContentRegistry} from './package';
import {resolveHumanGenerationProfile} from './resolver';

export type ContentBackedCohortInstantiationRequest=Omit<CohortInstantiationRequest,'profile'>&Readonly<{contentRegistry:HumanGenerationContentRegistry}>;

/** Resolves approved content, then delegates identity, receipts and conservation to the frozen Population transaction. */
export function instantiateFromCohortWithContent(request:ContentBackedCohortInstantiationRequest):CohortInstantiationResult{
 const names=['people','population','rootSeed','cohortId','requestKey','count','referenceDate','contentRegistry'] as const;let input:Record<string,unknown>;
 try{if(!request||typeof request!=='object'||Array.isArray(request)||(Object.getPrototypeOf(request)!==Object.prototype&&Object.getPrototypeOf(request)!==null))throw Error();const keys=Reflect.ownKeys(request);if(keys.length!==names.length||keys.some(key=>typeof key!=='string'||!names.includes(key as typeof names[number])))throw Error();input=Object.fromEntries(names.map(name=>{const descriptor=Object.getOwnPropertyDescriptor(request,name);if(!descriptor?.enumerable||!('value' in descriptor))throw Error();return [name,descriptor.value];}));}catch{throw Error('Invalid Human generation content request.');}
 const contentRegistry=input.contentRegistry as HumanGenerationContentRegistry;if(!validateHumanGenerationContentRegistry(contentRegistry))throw Error('Invalid Human generation content registry.');
 const identity=parsePopulationCohortId(input.cohortId);if(!identity)throw Error('Invalid population cohort identity.');
 const content=registeredHumanGenerationPackage(contentRegistry,identity.generationProfileId);if(!content)throw Error('No approved Human generation content resolves this cohort.');
 if(content.countryId!==identity.countryId)throw Error('Human generation content country does not match the cohort.');
 const profile=resolveHumanGenerationProfile(content,identity.birthYear);
 return instantiateFromCohort({people:input.people as CohortInstantiationRequest['people'],population:input.population as CohortInstantiationRequest['population'],rootSeed:input.rootSeed as number,cohortId:input.cohortId as string,requestKey:input.requestKey as string,count:input.count as number,referenceDate:input.referenceDate as CohortInstantiationRequest['referenceDate'],profile});
}

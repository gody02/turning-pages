import {loadUkMid2024ProductionPackage,ONS_MID_2024_PACKAGE_V2_ID} from '../demography/uk/ons-mid-2024/adapter';
import {createUkHumanGenerationContentRegistry,UK_HUMAN_CONTENT_PACKAGE_ID,UK_HUMAN_CONTENT_PROFILE_ID} from '../human/uk/generation/adapter';
import * as life from '../../engine/core/life';
import {compilePopulationCalibration} from '../../engine/human/calibration/compiler';
import {initializePopulationFromCalibration} from '../../engine/human/calibration/integration';
import {registeredHumanGenerationPackage} from '../../engine/human/content/package';
import {resolveHumanGenerationProfile} from '../../engine/human/content/resolver';
import {generatePersonInput} from '../../engine/human/generation';
import {createPeople,type PersonInput} from '../../engine/human/person';
import {createInitialCohortBackedPopulation,deriveCountryPopulation,populationCohortId} from '../../engine/human/population';
import {initializeUKWorld} from '../../engine/simulation';
import {isGame,serializeGame} from '../../engine/save';
import {validPersonDisplayName} from '../../engine/shared/personDisplayName';
import type {Game} from '../../engine/types';

export const UK_COUNTRY_START_SCENARIO=Object.freeze({version:1 as const,id:'country-start.uk.mid-2024-v1' as const,countryId:'uk' as const,simulationStartDate:Object.freeze({year:2024,month:6,day:30} as const),populationPackageId:ONS_MID_2024_PACKAGE_V2_ID,humanContentPackageId:UK_HUMAN_CONTENT_PACKAGE_ID,humanProfileId:UK_HUMAN_CONTENT_PROFILE_ID,identityPolicy:'generated-with-optional-overrides' as const,compatibilityPolicy:'legacy-life-v1' as const,starts:Object.freeze({childhood:Object.freeze({age:0 as const,dateOfBirth:Object.freeze({year:2024,month:6,day:30} as const),requestKey:'country-start.uk.mid-2024-v1.player.childhood' as const}),adult:Object.freeze({age:18 as const,dateOfBirth:Object.freeze({year:2006,month:6,day:30} as const),requestKey:'country-start.uk.mid-2024-v1.player.adult' as const})})});
export type UkCountryStartMode=keyof typeof UK_COUNTRY_START_SCENARIO.starts;
export type UkMid2024StartRequestV1=Readonly<{version:1;rootSeed:number;mode:UkCountryStartMode;identity?:Readonly<{name?:string;genderLabel?:string}>}>;

function dataObject(value:unknown,names:readonly string[],optional:readonly string[]=[]):Record<string,unknown>|null{try{if(!value||typeof value!=='object'||Array.isArray(value))return null;const prototype=Object.getPrototypeOf(value);if(prototype!==Object.prototype&&prototype!==null)return null;const allowed=new Set([...names,...optional]),keys=Reflect.ownKeys(value),copy:Record<string,unknown>={};if(!names.every(name=>keys.includes(name)))return null;for(const key of keys){if(typeof key!=='string'||!allowed.has(key))return null;const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor?.enumerable||!('value' in descriptor))return null;copy[key]=descriptor.value;}return copy;}catch{return null;}}
function validateRequest(value:unknown):UkMid2024StartRequestV1{
 const request=dataObject(value,['version','rootSeed','mode'],['identity']);if(!request||request.version!==1||typeof request.rootSeed!=='number'||!Number.isSafeInteger(request.rootSeed)||request.rootSeed<0||request.rootSeed>0xffffffff||(request.mode!=='childhood'&&request.mode!=='adult'))throw Error('Invalid UK country-start request.');
 let identity:Record<string,unknown>|undefined;if(request.identity!==undefined){identity=dataObject(request.identity,[],['name','genderLabel'])??undefined;if(!identity||identity.name!==undefined&&typeof identity.name!=='string'||identity.genderLabel!==undefined&&typeof identity.genderLabel!=='string')throw Error('Invalid UK country-start identity override.');}
 return {version:1,rootSeed:request.rootSeed,mode:request.mode,...(identity===undefined?{}:{identity:identity as UkMid2024StartRequestV1['identity']})};
}
function identityOverrides(generated:PersonInput,identity:UkMid2024StartRequestV1['identity']):PersonInput{const name=identity?.name===undefined?generated.name:identity.name.trim(),genderLabel=identity?.genderLabel===undefined?generated.genderLabel:identity.genderLabel.trim();if(!validPersonDisplayName(name)||!genderLabel||genderLabel.length>40)throw Error('Invalid UK player identity override.');return {...generated,name,genderLabel};}

/** Pure production composition. Persistence and UI commit remain outside this function. */
export function createUkMid2024Game(input:UkMid2024StartRequestV1):Game{
 const request=validateRequest(input),scenario=UK_COUNTRY_START_SCENARIO,selection=scenario.starts[request.mode],pkg=loadUkMid2024ProductionPackage(),registry=createUkHumanGenerationContentRegistry();
 if(pkg.id!==scenario.populationPackageId||pkg.countryId!==scenario.countryId)throw Error('UK country-start demographic package mismatch.');
 const content=registeredHumanGenerationPackage(registry,scenario.humanProfileId);if(!content||content.id!==scenario.humanContentPackageId||content.countryId!==scenario.countryId)throw Error('UK country-start Human content mismatch.');
 const profileExists=(id:string)=>registry.packages.some(item=>item.profileId===id),baseline=compilePopulationCalibration(pkg,{profileExists});
 if(baseline.coverage!=='complete'||baseline.generationReadiness!=='ready'||baseline.report.finalCohortSum!==69_281_437)throw Error('UK country-start population is not production-ready.');
 const cohort=baseline.cohorts.find(item=>item.countryId==='uk'&&item.areaId===null&&item.birthYear===selection.dateOfBirth.year&&item.generationProfileId===scenario.humanProfileId);if(!cohort||cohort.count<1)throw Error('UK country-start cohort is unavailable.');
 const cohortId=populationCohortId(cohort),profile=resolveHumanGenerationProfile(content,selection.dateOfBirth.year),generated=generatePersonInput(request.rootSeed,{id:'person:1',sequence:1},{version:1,requestKey:selection.requestKey,source:'human.country-start-v1',referenceDate:scenario.simulationStartDate,countryId:'uk',birth:{kind:'exact',date:selection.dateOfBirth},namingProfileId:profile.id,gender:{kind:'profile'}},profile),playerInput=identityOverrides(generated,request.identity);
 const people=createPeople(playerInput),partialPopulation=createInitialCohortBackedPopulation(people,cohortId,selection.requestKey),reserved=compilePopulationCalibration(pkg,{profileExists,livingMemberships:[{birthYear:selection.dateOfBirth.year,areaId:null,count:1}]});
 const population=initializePopulationFromCalibration(partialPopulation,people,pkg,reserved,[{personId:people.playerId,birthYear:selection.dateOfBirth.year,areaId:null}]);
 if(reserved.report.finalCohortSum!==69_281_436||deriveCountryPopulation(population,people,'uk').knownLiving!==69_281_437)throw Error('UK country-start population conservation failed.');
 const compatibility=life.createLifeAtDate(playerInput.name,playerInput.genderLabel,'uk',request.rootSeed,{mode:request.mode,dateOfBirth:playerInput.dateOfBirth,date:scenario.simulationStartDate});if(compatibility.age!==selection.age)throw Error('UK country-start age contract mismatch.');
 const candidate:Game={...compatibility,version:3,people,population};initializeUKWorld(candidate);
 if(!isGame(candidate))throw Error('UK country-start candidate failed root validation.');const serialized=serializeGame(candidate);if(!serialized.ok)throw Error('UK country-start candidate failed canonical serialization.');return serialized.game;
}

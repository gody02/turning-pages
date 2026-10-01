import * as life from '../../engine/core/life';
import {deriveFloat} from '../../engine/core/rng';
import {createGeographyRuntime} from '../../engine/geography/runtime';
import {validPopulationGeography} from '../../engine/geography/population';
import {registeredHumanGenerationPackage} from '../../engine/human/content/package';
import {resolveHumanGenerationProfile} from '../../engine/human/content/resolver';
import {generatePersonInput,personGenerationKey} from '../../engine/human/generation';
import {instantiateInitialPlayerFromCohort} from '../../engine/human/initialPopulation';
import {deriveCountryPopulation,type PopulationCohort} from '../../engine/human/population';
import {isGame,serializeGame} from '../../engine/save';
import {validPersonDisplayName} from '../../engine/shared/personDisplayName';
import {initializeUKWorld} from '../../engine/simulation';
import type {Game} from '../../engine/types';
import {createUkPopulationContentRegistry,resolveUkPopulationContent} from '../demography/uk/populationRegistry';
import {createUkGeographicCandidatePopulationState,UK_GEOGRAPHIC_POPULATION_FINGERPRINT,UK_GEOGRAPHIC_POPULATION_PARTITION_ID,UK_GEOGRAPHIC_POPULATION_TOTAL,validateUkGeographicPopulationCandidate} from '../demography/uk/geographic-mid-2024/adapter';
import {createUkGeographyRegistry} from '../geography/uk/primary-local-admin-2024/adapter';
import {createUkHumanGenerationContentRegistry,UK_HUMAN_CONTENT_PACKAGE_ID,UK_HUMAN_CONTENT_PROFILE_ID} from '../human/uk/generation/adapter';
import type {UkCountryStartMode,UkMid2024StartRequestV1} from './countryStart';

const CONSTITUENT_PLACES=new Set(['place.uk.constituent.england','place.uk.constituent.wales','place.uk.constituent.scotland','place.uk.constituent.northern-ireland']);
const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;

export const UK_GEOGRAPHIC_COUNTRY_START_SCENARIO=Object.freeze({version:1 as const,id:'country-start.uk.mid-2024-v2' as const,countryId:'uk' as const,simulationStartDate:Object.freeze({year:2024,month:6,day:30} as const),populationPackageId:'uk.population.mid-2024.v3' as const,populationFingerprint:UK_GEOGRAPHIC_POPULATION_FINGERPRINT,geographyPartitionId:UK_GEOGRAPHIC_POPULATION_PARTITION_ID,geographyFingerprint:'fnv1a64-v1:3d1a3446a16c58cb' as const,humanContentPackageId:UK_HUMAN_CONTENT_PACKAGE_ID,humanProfileId:UK_HUMAN_CONTENT_PROFILE_ID,identityPolicy:'generated-with-optional-overrides' as const,selectionPolicy:'population-weighted-keyed-v1' as const,compatibilityPolicy:'legacy-life-v1' as const,starts:Object.freeze({childhood:Object.freeze({age:0 as const,dateOfBirth:Object.freeze({year:2024,month:6,day:30} as const),requestKey:'country-start.uk.mid-2024-v2.player.childhood' as const}),adult:Object.freeze({age:18 as const,dateOfBirth:Object.freeze({year:2006,month:6,day:30} as const),requestKey:'country-start.uk.mid-2024-v2.player.adult' as const})})});

function dataObject(value:unknown,names:readonly string[],optional:readonly string[]=[]):Record<string,unknown>|null{try{if(!value||typeof value!=='object'||Array.isArray(value))return null;const prototype=Object.getPrototypeOf(value);if(prototype!==Object.prototype&&prototype!==null)return null;const allowed=new Set([...names,...optional]),keys=Reflect.ownKeys(value),copy:Record<string,unknown>={};if(!names.every(name=>keys.includes(name)))return null;for(const key of keys){if(typeof key!=='string'||!allowed.has(key))return null;const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor?.enumerable||!('value' in descriptor))return null;copy[key]=descriptor.value;}return copy;}catch{return null;}}
function validateRequest(value:unknown):UkMid2024StartRequestV1{const request=dataObject(value,['version','rootSeed','mode'],['identity']);if(!request||request.version!==1||typeof request.rootSeed!=='number'||!Number.isSafeInteger(request.rootSeed)||request.rootSeed<0||request.rootSeed>0xffffffff||(request.mode!=='childhood'&&request.mode!=='adult'))throw Error('Invalid geographic UK country-start request.');let identity:Record<string,unknown>|undefined;if(request.identity!==undefined){identity=dataObject(request.identity,[],['name','genderLabel'])??undefined;if(!identity||identity.name!==undefined&&typeof identity.name!=='string'||identity.genderLabel!==undefined&&typeof identity.genderLabel!=='string')throw Error('Invalid geographic UK country-start identity override.');}return {version:1,rootSeed:request.rootSeed,mode:request.mode,...(identity===undefined?{}:{identity:identity as UkMid2024StartRequestV1['identity']})};}
function identityOverrides<T extends Readonly<{name:string;genderLabel:string}>>(generated:T,identity:UkMid2024StartRequestV1['identity']):T{const name=identity?.name===undefined?generated.name:identity.name.trim(),genderLabel=identity?.genderLabel===undefined?generated.genderLabel:identity.genderLabel.trim();if(!validPersonDisplayName(name)||!genderLabel||genderLabel.length>40)throw Error('Invalid geographic UK player identity override.');return {...generated,name,genderLabel};}

function resolveProductionPackage(){const registry=createUkPopulationContentRegistry(),content=resolveUkPopulationContent(registry,UK_GEOGRAPHIC_COUNTRY_START_SCENARIO.populationPackageId);if(!validateUkGeographicPopulationCandidate(content)||content.fingerprint!==UK_GEOGRAPHIC_COUNTRY_START_SCENARIO.populationFingerprint||content.geographyPartitionId!==UK_GEOGRAPHIC_COUNTRY_START_SCENARIO.geographyPartitionId||content.countryId!=='uk')throw Error('Geographic UK country-start population content mismatch.');return content;}
const PRODUCTION_POPULATION_PACKAGE=resolveProductionPackage();
function productionPackage(){return PRODUCTION_POPULATION_PACKAGE;}

/** Pure diagnostic/selection boundary; weights are exact represented cohort counts. */
export function selectUkMid2024GeographicPlayerCohort(rootSeed:number,mode:UkCountryStartMode):PopulationCohort{
 if(!Number.isSafeInteger(rootSeed)||rootSeed<0||rootSeed>0xffffffff||(mode!=='childhood'&&mode!=='adult'))throw Error('Invalid geographic UK cohort-selection request.');
 const scenario=UK_GEOGRAPHIC_COUNTRY_START_SCENARIO,selection=scenario.starts[mode],pkg=productionPackage(),eligible=pkg.cohorts.filter(item=>item.birthYear===selection.dateOfBirth.year&&item.generationProfileId===scenario.humanProfileId&&item.countryId==='uk'&&item.areaId!==null).sort((a,b)=>codePointCompare(a.id,b.id));
 let total=0;for(const cohort of eligible){total+=cohort.count;if(!Number.isSafeInteger(total))throw Error('Geographic UK cohort-selection total overflow.');}if(total<=0)throw Error('Geographic UK country-start cohort is unavailable.');
 let draw=Math.floor(deriveFloat(rootSeed,personGenerationKey('country-start','v2',scenario.id,pkg.id,mode,'population-weighted-cohort'))*total);
 for(const cohort of eligible){if(draw<cohort.count)return cohort;draw-=cohort.count;}throw Error('Geographic UK cohort selection failed.');
}

/** Pure additive successor. Persistence and default-scenario routing remain outside this function. */
export function createUkMid2024GeographicGame(input:UkMid2024StartRequestV1):Game{
 const request=validateRequest(input),scenario=UK_GEOGRAPHIC_COUNTRY_START_SCENARIO,selection=scenario.starts[request.mode],pkg=productionPackage(),baseline=createUkGeographicCandidatePopulationState();
 if(pkg.cohorts!==baseline.cohorts||baseline.coverage[0]?.source!==pkg.id||baseline.coverage[0]?.areaPartitionId!==scenario.geographyPartitionId)throw Error('Geographic UK baseline Population mismatch.');
 const contentRegistry=createUkHumanGenerationContentRegistry(),content=registeredHumanGenerationPackage(contentRegistry,scenario.humanProfileId);if(!content||content.id!==scenario.humanContentPackageId||content.countryId!==scenario.countryId)throw Error('Geographic UK country-start Human content mismatch.');
 const cohort=selectUkMid2024GeographicPlayerCohort(request.rootSeed,request.mode);if(cohort.birthYear!==selection.dateOfBirth.year||cohort.areaId===null||cohort.generationProfileId!==scenario.humanProfileId)throw Error('Geographic UK country-start cohort mismatch.');
 const profile=resolveHumanGenerationProfile(content,selection.dateOfBirth.year),generated=generatePersonInput(request.rootSeed,{id:'person:1',sequence:1},{version:1,requestKey:selection.requestKey,source:'human.country-start-v2',referenceDate:scenario.simulationStartDate,countryId:'uk',birth:{kind:'exact',date:selection.dateOfBirth},namingProfileId:profile.id,gender:{kind:'profile'}},profile),playerInput=identityOverrides(generated,request.identity),initial=instantiateInitialPlayerFromCohort({population:baseline,cohortId:cohort.id,requestKey:selection.requestKey,personInput:playerInput});
 const runtime=createGeographyRuntime(createUkGeographyRegistry()),partition=runtime.partition(scenario.geographyPartitionId),resolved=runtime.resolvePlace(scenario.geographyPartitionId,cohort.areaId),ancestors=runtime.getAncestors(scenario.geographyPartitionId,cohort.areaId);if(!partition||partition.fingerprint!==scenario.geographyFingerprint||!resolved||!runtime.isPopulationAllocationCell(scenario.geographyPartitionId,cohort.areaId)||!ancestors.some(item=>CONSTITUENT_PLACES.has(item.placeId))||!validPopulationGeography(initial.population,initial.people,runtime))throw Error('Geographic UK player membership failed Geography validation.');
 if(deriveCountryPopulation(initial.population,initial.people,'uk').knownLiving!==UK_GEOGRAPHIC_POPULATION_TOTAL||initial.population.cohorts.reduce((sum,item)=>sum+item.count,0)!==UK_GEOGRAPHIC_POPULATION_TOTAL-1)throw Error('Geographic UK country-start population conservation failed.');
 const compatibility=life.createLifeAtDate(playerInput.name,playerInput.genderLabel,'uk',request.rootSeed,{mode:request.mode,dateOfBirth:playerInput.dateOfBirth,date:scenario.simulationStartDate});if(compatibility.age!==selection.age)throw Error('Geographic UK country-start age contract mismatch.');
 const candidate:Game={...compatibility,version:3,people:initial.people,population:initial.population};initializeUKWorld(candidate);if(!isGame(candidate))throw Error('Geographic UK country-start candidate failed root validation.');const serialized=serializeGame(candidate);if(!serialized.ok)throw Error('Geographic UK country-start candidate failed canonical serialization.');return serialized.game;
}

import {canonicalStringify,fnv1a64} from '../../../engine/residencePlacement/data';
import {isJsonValue} from '../../../engine/core/json';
import {UK_COUNTRY_START_SCENARIO} from '../../uk/countryStart';
import {UK_GEOGRAPHIC_COUNTRY_START_SCENARIO} from '../../uk/countryStartGeographic';
import {UK_RESIDENCE_COUNTRY_START_SCENARIO} from './countryStartResidenceScenario';
import manifestJson from './country-start-manifest.json';

export type UkCountryStartScenario=typeof UK_COUNTRY_START_SCENARIO|typeof UK_GEOGRAPHIC_COUNTRY_START_SCENARIO|typeof UK_RESIDENCE_COUNTRY_START_SCENARIO;
type ManifestEntry=Readonly<{scenarioId:string;fingerprint:string;status:'frozen-compatibility'|'frozen-production'|'frozen-explicit'}>;
export type UkCountryStartRegistryV1=Readonly<{version:1;scenarios:readonly UkCountryStartScenario[];manifest:readonly ManifestEntry[]}>;
const scenarios=Object.freeze([UK_COUNTRY_START_SCENARIO,UK_GEOGRAPHIC_COUNTRY_START_SCENARIO,UK_RESIDENCE_COUNTRY_START_SCENARIO]);
// Frozen explicit availability does not change the current production UI default.
const statuses=Object.freeze(['frozen-compatibility','frozen-production','frozen-explicit'] as const);
/** Semantic integrity only, not cryptographic authentication. Object key order is irrelevant. */
export const ukCountryStartScenarioFingerprint=(scenario:UkCountryStartScenario)=>fnv1a64(canonicalStringify(scenario));
const expectedManifest=()=>scenarios.map((scenario,index)=>({scenarioId:scenario.id,fingerprint:ukCountryStartScenarioFingerprint(scenario),status:statuses[index]}));

/** The local registry admits these exact contracts only; it cannot substitute a newer scenario. */
export function validateUkCountryStartRegistry(value:unknown):value is UkCountryStartRegistryV1{
 try{
  if(!isJsonValue(value))return false;
  const copy=structuredClone(value);
  return canonicalStringify(copy)===canonicalStringify({version:1,scenarios,manifest:expectedManifest()})
   &&canonicalStringify(manifestJson)===canonicalStringify({version:1,entries:expectedManifest()});
 }catch{return false;}
}
export function createUkCountryStartRegistry():UkCountryStartRegistryV1{
 const registry=Object.freeze({version:1 as const,scenarios,manifest:Object.freeze(expectedManifest().map(entry=>Object.freeze(entry)))});
 if(!validateUkCountryStartRegistry(registry))throw Error('Invalid immutable UK Country Start manifest.');
 return registry;
}
export function resolveUkCountryStartScenario(registry:UkCountryStartRegistryV1,scenarioId:string):UkCountryStartScenario{
 if(!validateUkCountryStartRegistry(registry))throw Error('Invalid immutable UK Country Start registry.');
 const scenario=scenarios.find(item=>item.id===scenarioId);
 if(!scenario)throw Error('Unknown UK Country Start scenario.');
 return scenario;
}

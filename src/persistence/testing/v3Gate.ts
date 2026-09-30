import {loadUkGeographicPopulationCandidate,UK_GEOGRAPHIC_POPULATION_CANDIDATE_ID,UK_GEOGRAPHIC_POPULATION_FINGERPRINT,UK_GEOGRAPHIC_POPULATION_TOTAL} from '../../data/demography/uk/geographic-mid-2024/adapter';
import {createUkHumanGenerationContentRegistry} from '../../data/human/uk/generation/adapter';
import {createUkMid2024Game} from '../../data/uk/countryStart';
import {instantiateFromCohortWithContent} from '../../engine/human/content/integration';
import {createCohortMembership,deriveCountryPopulation} from '../../engine/human/population';
import type {Game} from '../../engine/types';

export const UK_V3_CANDIDATE_ARTIFACT_SHA256='c4b13eb67a1b7e231da1250b27f8e596c6535e7f260013d8a8638bda2b81188a' as const;

export function createV3PersistenceProbeGame():Game{
  const base=createUkMid2024Game({version:1,rootSeed:73,mode:'adult'}),pkg=loadUkGeographicPopulationCandidate(),target=pkg.cohorts.find(item=>item.birthYear===2006&&item.count>0);if(!target)throw Error('V3 persistence probe cohort is missing.');
  const population={version:1 as const,coverage:[{countryId:'uk',status:'complete' as const,source:pkg.id,areaPartitionId:pkg.geographyPartitionId}],cohorts:pkg.cohorts.map(item=>item.id===target.id?{...item,count:item.count-1}:item).filter(item=>item.count>0),memberships:[createCohortMembership(base.people!.people[0],target.id,'candidate.uk-geographic-population.persistence-probe-v1',0)]};
  return {...base,population};
}

export function continueV3PersistenceProbe(game:Game){
  const cohort=game.population!.cohorts.find(item=>item.birthYear===2000&&item.count>0);if(!cohort)throw Error('V3 continuation cohort is missing.');
  const next=instantiateFromCohortWithContent({people:game.people!,population:game.population!,rootSeed:73,cohortId:cohort.id,requestKey:'candidate.uk-geographic-population.persistence-vnext-continuation-v1',count:1,referenceDate:{year:2024,month:6,day:30},contentRegistry:createUkHumanGenerationContentRegistry()});
  if(next.persons[0]?.id!=='person:2'||deriveCountryPopulation(next.population,next.people,'uk').knownLiving!==UK_GEOGRAPHIC_POPULATION_TOTAL)throw Error('V3 persistence continuation failed.');return next;
}

export const V3_PERSISTENCE_IDENTITY={id:UK_GEOGRAPHIC_POPULATION_CANDIDATE_ID,fingerprint:UK_GEOGRAPHIC_POPULATION_FINGERPRINT,artifactSha256:UK_V3_CANDIDATE_ARTIFACT_SHA256,total:UK_GEOGRAPHIC_POPULATION_TOTAL} as const;


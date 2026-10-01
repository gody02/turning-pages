import {expect,test} from 'vitest';
import {loadUkGeographicPopulationCandidate} from '../../data/demography/uk/geographic-mid-2024/adapter';
import localJson from '../../data/demography/uk/geographic-mid-2024/normalized-local-age-margins.json';
import {createUkGeographyRegistry} from '../../data/geography/uk/primary-local-admin-2024/adapter';
import {createUkMid2024Game} from '../../data/uk/countryStart';
import {createUkHumanGenerationContentRegistry} from '../../data/human/uk/generation/adapter';
import {createCohortMembership,deriveCountryPopulation} from '../human/population';
import {instantiateFromCohortWithContent} from '../human/content/integration';
import {createGeographyRuntime} from '../geography/runtime';
import {deriveGeographicPopulation} from '../geography/population';
import {parseGame,serializeGame} from '../save';

test('observes the frozen geographic package conservation and canonical round trip',()=>{
 const base=createUkMid2024Game({version:1,rootSeed:73,mode:'adult'}),pkg=loadUkGeographicPopulationCandidate(),target=pkg.cohorts.find(item=>item.birthYear===2006&&item.count>0)!;
 const population={version:1 as const,coverage:[{countryId:'uk',status:'complete' as const,source:pkg.id,areaPartitionId:pkg.geographyPartitionId}],cohorts:pkg.cohorts.map(item=>item.id===target.id?{...item,count:item.count-1}:item).filter(item=>item.count>0),memberships:[createCohortMembership(base.people!.people[0],target.id,'candidate.uk-geographic-population.persistence-probe-v1',0)]};
 const game={...base,population},saveStart=performance.now(),saved=serializeGame(game);expect(saved.ok).toBe(true);if(!saved.ok)return;const saveMs=performance.now()-saveStart,loadStart=performance.now(),loaded=parseGame(saved.raw);const loadMs=performance.now()-loadStart;expect(loaded.game).not.toBeNull();
 const cohort=loaded.game!.population!.cohorts.find(item=>item.birthYear===2000&&item.count>0)!,next=instantiateFromCohortWithContent({people:loaded.game!.people!,population:loaded.game!.population!,rootSeed:73,cohortId:cohort.id,requestKey:'candidate.uk-geographic-population.continuation-v1',count:1,referenceDate:{year:2024,month:6,day:30},contentRegistry:createUkHumanGenerationContentRegistry()});
 expect(next.persons[0].id).toBe('person:2');expect(deriveCountryPopulation(next.population,next.people,'uk').knownLiving).toBe(69_281_437);
 const runtime=createGeographyRuntime(createUkGeographyRegistry());for(const area of localJson.areas)expect(deriveGeographicPopulation(game.population,game.people!,runtime,{countryId:'uk',partitionId:pkg.geographyPartitionId,placeId:area.areaId}).knownLiving,area.areaId).toBe(area.total);
 const bytes=new TextEncoder().encode(saved.raw).byteLength;console.log(JSON.stringify({packageId:'uk.population.mid-2024.v3',cohorts:pkg.cohorts.length,populationBytes:new TextEncoder().encode(JSON.stringify({version:1,coverage:population.coverage,cohorts:pkg.cohorts,memberships:[]})).byteLength,fullGameBytes:bytes,saveMs:Number(saveMs.toFixed(3)),loadMs:Number(loadMs.toFixed(3)),legacyLocalStorage5MiB:bytes<=5*1024*1024,continuationPersonId:next.persons[0].id}));
});

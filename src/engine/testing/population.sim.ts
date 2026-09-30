import {describe,expect,it} from 'vitest';
import {createGame} from '../simulation';
import {parseGame,serializeGame} from '../save';
import type {PersonGenerationProfile} from '../human/generation';
import {addPopulationCohort,deriveRepresentedLivingPopulation,instantiateFromCohort,populationCohortId,validPopulationWithPeople} from '../human/population';

const profile:PersonGenerationProfile={
 version:1,id:'profile.population-harness-v1',
 naming:{givenNames:[{id:'name.alex',text:'Alex',weight:1},{id:'name.sam',text:'Sam',weight:1}],familyNames:[{id:'family.test',text:'Test',weight:1}]},
 genderLabels:[{id:'gender.any',label:'Any',weight:1}],temperament:[{id:'human.sociability',distribution:{kind:'centered-average',minimum:0,maximum:100}}],aptitudes:[{id:'human.verbal',distribution:{kind:'uniform',minimum:0,maximum:100}}],
};
const cohortId=populationCohortId({countryId:'ca',areaId:null,birthYear:1990,generationProfileId:profile.id});
const hash=(text:string)=>{let value=2166136261;for(let index=0;index<text.length;index++)value=Math.imul(value^text.charCodeAt(index),16777619)>>>0;return value.toString(16).padStart(8,'0');};

describe('synthetic Population conservation harness',()=>{
 it('extracts 1,000 people from millions deterministically and continues after save/load',()=>{
  const started=performance.now();let game=createGame('Population harness','Any','ca',20260923),population=addPopulationCohort(game.population!,{countryId:'ca',areaId:null,birthYear:1990,generationProfileId:profile.id,count:5_000_000});const initial=deriveRepresentedLivingPopulation(population,game.people!);
  for(let batch=0;batch<100;batch++){
   const result=instantiateFromCohort({people:game.people!,population,rootSeed:game.randomness!.rootSeed,cohortId,requestKey:`population.harness-batch-${batch}`,count:10,referenceDate:{year:2030,month:1,day:1},profile});game.people=result.people;population=result.population;
   expect(deriveRepresentedLivingPopulation(population,game.people!)).toEqual(initial);if(batch%20===0)expect(validPopulationWithPeople(population,game.people)).toBe(true);
  }
  game.population=population;const generatedMs=performance.now()-started,serialized=serializeGame(game);expect(serialized.ok).toBe(true);if(!serialized.ok)return;const loaded=parseGame(serialized.raw).game!;expect(validPopulationWithPeople(loaded.population,loaded.people)).toBe(true);expect(deriveRepresentedLivingPopulation(loaded.population!,loaded.people!)).toEqual(initial);
  const continued=instantiateFromCohort({people:loaded.people!,population:loaded.population!,rootSeed:loaded.randomness!.rootSeed,cohortId,requestKey:'population.harness-continuation',count:1,referenceDate:{year:2030,month:1,day:1},profile});expect(continued.persons[0].id).toBe('person:1002');
  console.info(JSON.stringify({persons:game.people!.people.length,representedLiving:initial.knownLiving,serializedBytes:new TextEncoder().encode(serialized.raw).length,generationAndValidationMs:Math.round(generatedMs),canonicalHash:hash(serialized.raw)}));
 });
});

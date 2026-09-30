import {describe,expect,it} from 'vitest';
import {generateAndAllocatePerson,type PersonGenerationContext,type PersonGenerationProfile} from '../human/generation';
import {validPeople} from '../human/person';
import {parseGame,serializeGame} from '../save';
import {createGame} from '../simulation';

const syntheticProfile:PersonGenerationProfile={
 version:1,id:'profile.harness-v1',
 naming:{givenNames:[{id:'name.alex',text:'Alex',weight:1},{id:'name.jamie',text:'Jamie',weight:1}],familyNames:[{id:'family.morgan',text:'Morgan',weight:1},{id:'family.singh',text:'Singh',weight:1}]},
 genderLabels:[{id:'gender.woman',label:'Woman',weight:1},{id:'gender.man',label:'Man',weight:1},{id:'gender.nonbinary',label:'Non-binary',weight:1}],
 temperament:[
  {id:'human.sociability',distribution:{kind:'centered-average',minimum:0,maximum:100}},
  {id:'human.conscientiousness',distribution:{kind:'centered-average',minimum:0,maximum:100}},
  {id:'human.risk-tolerance',distribution:{kind:'centered-average',minimum:0,maximum:100}},
  {id:'human.emotional-reactivity',distribution:{kind:'centered-average',minimum:0,maximum:100}},
 ],
 aptitudes:[
  {id:'human.verbal',distribution:{kind:'centered-average',minimum:0,maximum:100}},
  {id:'human.quantitative',distribution:{kind:'centered-average',minimum:0,maximum:100}},
  {id:'human.spatial',distribution:{kind:'centered-average',minimum:0,maximum:100}},
  {id:'human.interpersonal',distribution:{kind:'centered-average',minimum:0,maximum:100}},
 ],
};

const hash=(text:string)=>{let value=2166136261;for(let index=0;index<text.length;index++)value=Math.imul(value^text.charCodeAt(index),16777619)>>>0;return value.toString(16).padStart(8,'0');};

describe('optional deterministic Person generation harness',()=>{
 it('measures 1,000 generated people across explicit seeds and survives canonical continuation',()=>{
  const seeds=[101,202,303,404],measurements:unknown[]=[];
  for(const seed of seeds){
   const game=createGame('Harness Player','Non-binary','ca',seed),started=performance.now();
   for(let index=0;index<250;index++){
    const context:PersonGenerationContext={version:1,requestKey:`harness.request-${index}`,source:'human.harness',referenceDate:{year:2050,month:6,day:15},countryId:'ca',birth:{kind:'age-range',minimumAge:18,maximumAge:80},namingProfileId:syntheticProfile.id,gender:{kind:'profile'}};
    game.people=generateAndAllocatePerson(game.people!,game.randomness!.rootSeed,context,syntheticProfile).state;
   }
   const generationMs=performance.now()-started,validationStarted=performance.now();expect(validPeople(game.people)).toBe(true);const validationMs=performance.now()-validationStarted;
   game.version=2;delete game.population;const serialized=serializeGame(game);expect(serialized.ok).toBe(true);if(!serialized.ok)continue;const loaded=parseGame(serialized.raw).game!;
   const continuation=generateAndAllocatePerson(loaded.people!,loaded.randomness!.rootSeed,{version:1,requestKey:'harness.continuation',source:'human.harness',referenceDate:{year:2050,month:6,day:15},countryId:'ca',birth:{kind:'age-range',minimumAge:18,maximumAge:80},namingProfileId:syntheticProfile.id,gender:{kind:'profile'}},syntheticProfile);
   expect(continuation.person.id).toBe('person:252');
   measurements.push({seed,people:game.people!.people.length-1,generationMs:Number(generationMs.toFixed(2)),validationMs:Number(validationMs.toFixed(2)),serializedBytes:new TextEncoder().encode(serialized.raw).length,approximateBytesPerPerson:Math.round(new TextEncoder().encode(serialized.raw).length/game.people!.people.length),intrinsicHash:hash(JSON.stringify(game.people!.people.slice(1)))});
  }
  expect(measurements).toHaveLength(seeds.length);console.info('Person generation harness',measurements);
 });
});

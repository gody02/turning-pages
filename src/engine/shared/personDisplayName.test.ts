import {describe,expect,it} from 'vitest';
import {createLife} from '../core/life';
import {validLife} from '../core/validation';
import {generatePersonInput,validPersonGenerationContext,validPersonGenerationProfile,type PersonGenerationContext,type PersonGenerationProfile} from '../human/generation';
import {createPerson,type PersonInput} from '../human/person';
import {parseGame,serializeGame} from '../save';
import {createGame} from '../simulation';
import {MAX_PERSON_NAME_CODE_POINTS,personDisplayNameCodePointCount,validPersonDisplayName} from './personDisplayName';

const input=(name:string):PersonInput=>({name,dateOfBirth:{year:2000,month:1,day:1},genderLabel:'Unspecified',lifeStatus:'living',traits:[],temperament:{},aptitudes:{}});
const profile=(given:string,family:string):PersonGenerationProfile=>({
 version:1,id:'profile.name-bound-v1',naming:{givenNames:[{id:'name.given',text:given,weight:1}],familyNames:[{id:'name.family',text:family,weight:1}]},
 genderLabels:[{id:'gender.unspecified',label:'Unspecified',weight:1}],temperament:[],aptitudes:[],
});
const context=(familyName?:string):PersonGenerationContext=>({
 version:1,requestKey:'test.name-bound',source:'human.test',referenceDate:{year:2040,month:1,day:1},countryId:'uk',birth:{kind:'exact',date:{year:2000,month:1,day:1}},namingProfileId:'profile.name-bound-v1',gender:{kind:'profile'},...(familyName===undefined?{}:{familyName}),
});

describe('shared Person display-name safety bound',()=>{
 it('preserves empty-name semantics and accepts the ASCII boundaries',()=>{
  expect(validPersonDisplayName('')).toBe(false);expect(validPersonDisplayName('   ')).toBe(false);expect(validPersonDisplayName(null)).toBe(false);expect(validPersonDisplayName({name:'Alex'})).toBe(false);expect(validPersonDisplayName('Alex Morgan')).toBe(true);
  expect(validPersonDisplayName('a'.repeat(40))).toBe(true);expect(validPersonDisplayName('a'.repeat(41))).toBe(true);
  expect(validPersonDisplayName('a'.repeat(MAX_PERSON_NAME_CODE_POINTS))).toBe(true);expect(validPersonDisplayName('a'.repeat(MAX_PERSON_NAME_CODE_POINTS+1))).toBe(false);
  expect(createLife('   ','Woman','ca',1).name).toBe('Alex Morgan');
 });

 it('counts Unicode code points rather than UTF-16 code units',()=>{
  const astral='\u{1F642}',accepted=astral.repeat(256),rejected=astral.repeat(257),mixed=`${'a'.repeat(128)}${astral.repeat(128)}`;
  expect(astral.length).toBe(2);expect(personDisplayNameCodePointCount(astral)).toBe(1);
  expect(personDisplayNameCodePointCount(mixed)).toBe(256);expect(validPersonDisplayName(accepted)).toBe(true);expect(validPersonDisplayName(rejected)).toBe(false);expect(validPersonDisplayName(mixed)).toBe(true);
 });

 it('makes explicit Person and root-life validation share the same boundary without truncation',()=>{
  const fortyOne='n'.repeat(41),maximum='n'.repeat(256),tooLong='n'.repeat(257);
  expect(createPerson(1,input(fortyOne)).name).toBe(fortyOne);expect(createPerson(1,input(maximum)).name).toBe(maximum);expect(()=>createPerson(1,input(tooLong))).toThrow('Invalid Person');
  expect(createLife(fortyOne,'Woman','ca',2).name).toBe(fortyOne);expect(createLife(maximum,'Woman','ca',2).name).toBe(maximum);expect(()=>createLife(tooLong,'Woman','ca',2)).toThrow('Invalid Person display name');
  expect(validLife({...createLife('Valid','Woman','ca',2),name:maximum})).toBe(true);expect(validLife({...createLife('Valid','Woman','ca',2),name:tooLong})).toBe(false);
 });

 it('validates name components and the final generated display name separately',()=>{
  const maximumComponent='g'.repeat(256),tooLongComponent='g'.repeat(257);
  expect(validPersonGenerationProfile(profile(maximumComponent,'F'))).toBe(true);expect(validPersonGenerationProfile(profile(tooLongComponent,'F'))).toBe(false);
  expect(()=>generatePersonInput(1,{id:'person:2',sequence:2},context(),profile(maximumComponent,'F'))).toThrow('Generated Person name is invalid');
  const fittingProfile=profile('G','F');expect(generatePersonInput(1,{id:'person:2',sequence:2},context('f'.repeat(254)),fittingProfile).name).toHaveLength(256);
  expect(validPersonGenerationContext(context('f'.repeat(256)))).toBe(true);expect(validPersonGenerationContext(context('f'.repeat(257)))).toBe(false);
  expect(()=>generatePersonInput(1,{id:'person:2',sequence:2},context('f'.repeat(255)),fittingProfile)).toThrow('Generated Person name is invalid');
 });

 it('round trips a long canonical player name without a schema change or migration',()=>{
  const name=`${'A'.repeat(127)} ${'\u{1F642}'.repeat(128)}`,game=createGame(name,'Woman','ca',3),serialized=serializeGame(game);
  expect(personDisplayNameCodePointCount(name)).toBe(256);expect(game.version).toBe(3);expect(game.people?.version).toBe(1);expect(serialized.ok).toBe(true);if(!serialized.ok)return;
  const parsed=parseGame(serialized.raw);expect(parsed.reason).toBeNull();expect(parsed.game?.name).toBe(name);expect(parsed.game?.people?.people[0].name).toBe(name);expect(parsed.game?.version).toBe(4);expect(parsed.game?.people?.version).toBe(1);
 });

 it('keeps the player UI non-destructive and dependent on domain validation',()=>{
  const modules=import.meta.glob<string>('../../ui/LifeApp.tsx',{eager:true,query:'?raw',import:'default'}),source=Object.values(modules)[0];
  expect(source).toContain('validPersonDisplayName');expect(source).toContain('MAX_PERSON_NAME_CODE_POINTS');expect(source).not.toMatch(/maxLength=\{?40|slice\(0,\s*40\)/);
 });
});

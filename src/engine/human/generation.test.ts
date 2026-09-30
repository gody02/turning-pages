import {describe,expect,it} from 'vitest';
import {ageOn} from '../core/clock';
import {createRandomness,float} from '../core/rng';
import {createGame} from '../simulation';
import {parseGame,serializeGame} from '../save';
import {APTITUDE_KEYS,TEMPERAMENT_KEYS} from './attributes';
import {generateAndAllocatePerson,generatePersonInput,personGenerationKey,validPersonGenerationContext,validPersonGenerationProfile,type PersonGenerationContext,type PersonGenerationProfile} from './generation';
import {allocatePerson,createPeople,createPerson,playerPerson,type PersonInput} from './person';

const explicitPlayer:PersonInput={name:'Player One',dateOfBirth:{year:2000,month:1,day:1},genderLabel:'Self-described',lifeStatus:'living',traits:[],temperament:{},aptitudes:{}};
const profile=(overrides:Partial<PersonGenerationProfile>={}):PersonGenerationProfile=>({
 version:1,
 id:'profile.synthetic-v1',
 naming:{
  givenNames:[
   {id:'name.alex',text:'Alex',weight:2},
   {id:'name.jamie',text:'Jamie',weight:1,genderLabels:['Woman']},
   {id:'name.zero',text:'Never',weight:0},
  ],
  familyNames:[{id:'family.morgan',text:'Morgan',weight:1},{id:'family.smith',text:'Smith',weight:1}],
 },
 genderLabels:[{id:'gender.nonbinary',label:'Non-binary',weight:1},{id:'gender.woman',label:'Woman',weight:1}],
 temperament:[
  {id:'human.sociability',distribution:{kind:'centered-average',minimum:0,maximum:100}},
  {id:'human.risk-tolerance',distribution:{kind:'uniform',minimum:10,maximum:90}},
 ],
 aptitudes:[{id:'human.verbal',distribution:{kind:'fixed',value:75}}],
 ...overrides,
});
const context=(overrides:Partial<PersonGenerationContext>={}):PersonGenerationContext=>({
 version:1,
 requestKey:'test.colleague-1',
 source:'human.test',
 referenceDate:{year:2040,month:2,day:29},
 countryId:'uk',
 regionId:'england',
 birth:{kind:'age-range',minimumAge:20,maximumAge:40},
 namingProfileId:'profile.synthetic-v1',
 gender:{kind:'profile'},
 ...overrides,
});

describe('deterministic Person generation',()=>{
 it('repeats exactly for the same seed, allocated identity, context and profile',()=>{
  const people=createPeople(explicitPlayer),a=generateAndAllocatePerson(people,123,context(),profile()),b=generateAndAllocatePerson(people,123,context(),profile());
  expect(a).toEqual(b);expect(a.person.id).toBe('person:2');expect(a.state.nextSequence).toBe(3);
  expect(a.state.playerId).toBe(people.playerId);expect(a.state.people[0]).toEqual(people.people[0]);expect(people.nextSequence).toBe(2);
 });

 it('allocates identity before keyed attributes and keeps unrelated attributes independent',()=>{
  const people=createPeople(explicitPlayer),first=generateAndAllocatePerson(people,91,context(),profile()),second=generateAndAllocatePerson(first.state,91,context({requestKey:'test.colleague-2'}),profile());
  expect(first.person.id).toBe('person:2');expect(second.person.id).toBe('person:3');expect(second.person).not.toEqual(first.person);
  const expanded=profile({aptitudes:[{id:'human.verbal',distribution:{kind:'fixed',value:75}},{id:'human.spatial',distribution:{kind:'uniform',minimum:0,maximum:100}}]});
  const base=generatePersonInput(91,{id:'person:2',sequence:2},context(),profile()),withExtra=generatePersonInput(91,{id:'person:2',sequence:2},context(),expanded);
  expect(withExtra.temperament).toEqual(base.temperament);expect(withExtra.aptitudes?.['human.verbal']).toBe(base.aptitudes?.['human.verbal']);
  expect(personGenerationKey('a|b','c')).not.toBe(personGenerationKey('a','b|c'));
 });

 it('is independent of profile entry order wherever stable IDs define selection',()=>{
  const original=profile(),reordered=profile({
   naming:{givenNames:[...original.naming.givenNames].reverse(),familyNames:[...original.naming.familyNames].reverse()},
   genderLabels:[...original.genderLabels].reverse(),temperament:[...original.temperament].reverse(),aptitudes:[...original.aptitudes].reverse(),
  }),identity={id:'person:2',sequence:2};
  expect(generatePersonInput(901,identity,context(),reordered)).toEqual(generatePersonInput(901,identity,context(),original));
 });

 it('does not consume mutable RNG and leaves explicit construction non-probabilistic',()=>{
  const randomness=createRandomness(77),before=structuredClone(randomness),people=createPeople(explicitPlayer);
  generateAndAllocatePerson(people,randomness.rootSeed,context(),profile());createPerson(2,{...explicitPlayer,name:'Explicit'});
  expect(randomness).toEqual(before);expect(float(structuredClone(randomness),'test')).toBe(float(structuredClone(before),'test'));
 });

 it('is transactional when generation or profile content fails',()=>{
  const people=createPeople(explicitPlayer),before=structuredClone(people),allZero=profile({naming:{givenNames:[{id:'name.none',text:'Nobody',weight:0}],familyNames:[{id:'family.none',text:'Nowhere',weight:0}]}});
  expect(()=>generateAndAllocatePerson(people,1,context(),allZero)).toThrow('eligible given name');expect(people).toEqual(before);expect(people.nextSequence).toBe(2);
  expect(validPersonGenerationProfile(profile({naming:{givenNames:[{id:'name.bad',text:'Bad',weight:-1}],familyNames:[]}}))).toBe(false);
  expect(validPersonGenerationProfile(profile({genderLabels:[{id:'gender.bad',label:'Bad',weight:Infinity}]}))).toBe(false);
 });

 it('permits duplicate display names without confusing durable identity',()=>{
  const duplicate=profile({naming:{givenNames:[{id:'name.alex-a',text:'Alex',weight:1},{id:'name.alex-b',text:'Alex',weight:1}],familyNames:[{id:'family.morgan',text:'Morgan',weight:1}]},genderLabels:[{id:'gender.any',label:'Any',weight:1}]});
  let people=createPeople(explicitPlayer);const one=generateAndAllocatePerson(people,4,context({gender:{kind:'explicit',label:'Any'}}),duplicate);people=one.state;const two=generateAndAllocatePerson(people,4,context({requestKey:'test.second',gender:{kind:'explicit',label:'Any'}}),duplicate);
  expect(one.person.name).toBe('Alex Morgan');expect(two.person.name).toBe('Alex Morgan');expect(one.person.id).not.toBe(two.person.id);
 });

 it('preserves explicit gender labels and independently derives given and family names',()=>{
  const explicit=generatePersonInput(12,{id:'person:2',sequence:2},context({gender:{kind:'explicit',label:''},familyName:'Shared'}),profile());
  expect(explicit.genderLabel).toBe('');expect(explicit.name.endsWith(' Shared')).toBe(true);
  const changedFamilies=profile({naming:{...profile().naming,familyNames:[{id:'family.other',text:'Other',weight:1}]}});
  const first=generatePersonInput(12,{id:'person:2',sequence:2},context({familyName:'Shared'}),profile()),second=generatePersonInput(12,{id:'person:2',sequence:2},context({familyName:'Shared'}),changedFamilies);
  expect(second.name).toBe(first.name);expect(generatePersonInput(12,{id:'person:2',sequence:2},context(),profile()).genderLabel.length).toBeGreaterThan(0);
  expect('biologicalSex' in explicit).toBe(false);
 });

 it('uses exact DOB unchanged and generates inclusive age ranges without storing age',()=>{
  const identity={id:'person:2',sequence:2},exact={year:2004,month:2,day:29} as const;
  const exactPerson=generatePersonInput(5,identity,context({birth:{kind:'exact',date:exact}}),profile());expect(exactPerson.dateOfBirth).toEqual(exact);
  for(const [minimumAge,maximumAge] of [[0,0],[20,20],[20,40],[4,4]] as const){
   const generated=generatePersonInput(5,identity,context({birth:{kind:'age-range',minimumAge,maximumAge}}),profile()),age=ageOn(generated.dateOfBirth,context().referenceDate);
   expect(age).toBeGreaterThanOrEqual(minimumAge);expect(age).toBeLessThanOrEqual(maximumAge);expect('age' in generated).toBe(false);
  }
  expect(validPersonGenerationContext(context({referenceDate:{year:2040,month:2,day:29},birth:{kind:'exact',date:{year:2000,month:2,day:29}}}))).toBe(true);
  expect(validPersonGenerationContext(context({birth:{kind:'age-range',minimumAge:40,maximumAge:20}}))).toBe(false);
  expect(validPersonGenerationContext(context({birth:{kind:'exact',date:{year:2040,month:2,day:30}}}))).toBe(false);
  expect(validPersonGenerationContext(context({birth:{kind:'exact',date:{year:2000,month:1,day:1,calendar:'gregorian'} as never}}))).toBe(false);
 });

 it('supports historical reference dates while retaining the generation age cap',()=>{
  const identity={id:'person:2',sequence:2},historical=context({referenceDate:{year:400,month:2,day:29},birth:{kind:'age-range',minimumAge:150,maximumAge:150}}),generated=generatePersonInput(7,identity,historical,profile());
  expect(ageOn(generated.dateOfBirth,historical.referenceDate)).toBe(150);expect(generated.dateOfBirth.year).toBeGreaterThanOrEqual(249);expect(generated.dateOfBirth.year).toBeLessThanOrEqual(250);
  expect(generatePersonInput(7,identity,context({referenceDate:{year:1900,month:1,day:1},birth:{kind:'exact',date:{year:1899,month:12,day:31}}}),profile()).dateOfBirth.year).toBe(1899);
  expect(validPersonGenerationContext(context({birth:{kind:'age-range',minimumAge:0,maximumAge:151}}))).toBe(false);
  expect(validPersonGenerationContext(context({birth:{kind:'exact',date:{year:0,month:1,day:1}}}))).toBe(false);
 });

 it('limits generated maps to approved catalogue keys and score boundaries',()=>{
  const boundaryProfile=profile({temperament:[{id:'human.conscientiousness',distribution:{kind:'fixed',value:0}},{id:'human.emotional-reactivity',distribution:{kind:'fixed',value:100}}],aptitudes:[{id:'human.quantitative',distribution:{kind:'uniform',minimum:0,maximum:0}},{id:'human.interpersonal',distribution:{kind:'uniform',minimum:100,maximum:100}}]});
  const generated=generatePersonInput(2,{id:'person:2',sequence:2},context(),boundaryProfile);
  expect(generated.temperament).toEqual({'human.conscientiousness':0,'human.emotional-reactivity':100});expect(generated.aptitudes).toEqual({'human.interpersonal':100,'human.quantitative':0});
  expect(Object.keys(generated.temperament!).every(key=>(TEMPERAMENT_KEYS as readonly string[]).includes(key))).toBe(true);expect(Object.keys(generated.aptitudes!).every(key=>(APTITUDE_KEYS as readonly string[]).includes(key))).toBe(true);
  expect(validPersonGenerationProfile(profile({temperament:[{id:'human.typo' as never,distribution:{kind:'fixed',value:50}}]}))).toBe(false);
  expect(validPersonGenerationProfile(profile({aptitudes:[{id:'human.verbal',distribution:{kind:'fixed',value:101}}]}))).toBe(false);
  expect(playerPerson(createPeople(explicitPlayer)).temperament).toEqual({});expect(playerPerson(createPeople(explicitPlayer)).aptitudes).toEqual({});
 });

 it('isolates caller data and produces immutable canonical Person records',()=>{
  const mutableProfile=structuredClone(profile()) as unknown as {naming:{givenNames:{text:string}[]}},mutableContext=structuredClone(context()) as {referenceDate:{year:number;month:number;day:number}},allocated=generateAndAllocatePerson(createPeople(explicitPlayer),55,mutableContext as PersonGenerationContext,mutableProfile as unknown as PersonGenerationProfile);
  mutableProfile.naming.givenNames[0].text='Changed';mutableContext.referenceDate.year=2099;
  expect(allocated.person.name).not.toContain('Changed');expect(allocated.person.dateOfBirth.year).toBeLessThan(2099);expect(Object.isFrozen(allocated.person)).toBe(true);expect(Object.isFrozen(allocated.person.temperament)).toBe(true);
 });

 it('rejects sparse, accessor-backed, symbolic, hidden and revoked generation structures safely',()=>{
  const sparse=structuredClone(profile()) as unknown as {naming:{givenNames:unknown[]}};sparse.naming.givenNames=new Array(1);expect(validPersonGenerationProfile(sparse)).toBe(false);
  let reads=0;const accessor=structuredClone(context()) as unknown as Record<string,unknown>;Object.defineProperty(accessor,'source',{enumerable:true,get:()=>{reads++;return 'human.test';}});expect(validPersonGenerationContext(accessor)).toBe(false);expect(reads).toBe(0);
  const symbolic=structuredClone(profile()) as unknown as Record<PropertyKey,unknown>;symbolic[Symbol('hidden')]=true;expect(validPersonGenerationProfile(symbolic)).toBe(false);
  const hidden=structuredClone(context());Object.defineProperty(hidden,'hidden',{value:true});expect(validPersonGenerationContext(hidden)).toBe(false);
  const revoked=Proxy.revocable(context(),{});revoked.revoke();expect(()=>validPersonGenerationContext(revoked.proxy)).not.toThrow();expect(validPersonGenerationContext(revoked.proxy)).toBe(false);
  expect(validPersonGenerationProfile(profile({temperament:[{id:'human.sociability',distribution:{kind:'uniform',minimum:80,maximum:20}}]}))).toBe(false);
  expect(validPersonGenerationProfile(profile({aptitudes:[{id:'human.verbal',distribution:{kind:'centered-average',minimum:0,maximum:Infinity}}]}))).toBe(false);
 });
});

describe('Person generation persistence and boundaries',()=>{
 it('round trips generated people and continues permanent identity allocation',()=>{
  const game=createGame('Persistent Player','Woman','ca',31),allocated=generateAndAllocatePerson(game.people!,game.randomness!.rootSeed,context(),profile());game.people=allocated.state;game.version=2;delete game.population;
  const serialized=serializeGame(game);expect(serialized.ok).toBe(true);if(!serialized.ok)return;const loaded=parseGame(serialized.raw).game!;
  expect(loaded.people).toEqual(game.people);const next=generateAndAllocatePerson(loaded.people!,loaded.randomness!.rootSeed,context({requestKey:'test.after-load'}),profile());expect(next.person.id).toBe('person:3');expect(next.state.nextSequence).toBe(4);
 });

 it('adds no History, Scheduler or persistent event work',()=>{
  const game=createGame('No side effects','Woman','ca',41),history=structuredClone(game.history),scheduler=structuredClone(game.scheduler),facts=structuredClone(game.facts),randomness=structuredClone(game.randomness);
  game.people=generateAndAllocatePerson(game.people!,game.randomness!.rootSeed,context(),profile()).state;
  expect(game.history).toEqual(history);expect(game.scheduler).toEqual(scheduler);expect(game.facts).toEqual(facts);expect(game.randomness).toEqual(randomness);
 });

 it('keeps generation country-neutral and free of host randomness, UI and specialist dependencies',()=>{
  const sources=import.meta.glob<string>('./{attributes,generation}.ts',{eager:true,query:'?raw',import:'default'});
  for(const [path,source] of Object.entries(sources)){expect(source,path).not.toMatch(/Math\.random|Date\.now|randomUUID/);expect(source,path).not.toMatch(/from\s+['"][^'"]*(?:react|ui|politics|ukWorld|national)/);}
 });

 it('does not alter explicit allocation or require generated catalogue values',()=>{
  const people=createPeople(explicitPlayer),explicit=allocatePerson(people,{...explicitPlayer,name:'Explicit Empty'});
  expect(explicit.person.temperament).toEqual({});expect(explicit.person.aptitudes).toEqual({});expect(explicit.person.id).toBe('person:2');
 });
});

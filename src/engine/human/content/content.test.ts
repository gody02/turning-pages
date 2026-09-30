import {describe,expect,it} from 'vitest';
import {createRandomness} from '../../core/rng';
import {parseGame,serializeGame} from '../../save';
import {createGame} from '../../simulation';
import {addPopulationCohort,deriveRepresentedLivingPopulation,initializeCompleteCountryPopulation,populationCohortId,type PopulationCohortInput} from '../population';
import type {HumanGenerationContentPackageV1,NamingSourceDescriptorV1} from './types';
import {createHumanGenerationContentRegistry,fingerprintHumanGenerationContentPackage,validateHumanGenerationContentPackage,validateHumanGenerationContentRegistry,withHumanGenerationContentFingerprint} from './package';
import {assessHumanGenerationReadiness,preflightHumanGenerationFullNames,resolveHumanGenerationProfile} from './resolver';
import {instantiateFromCohortWithContent} from './integration';

const source=(overrides:Partial<NamingSourceDescriptorV1>={}):NamingSourceDescriptorV1=>({version:1,id:'names.synthetic-given-v1',producer:'Synthetic test producer',datasetId:'synthetic-given',releaseId:'release-v1',title:'Synthetic names',jurisdiction:'synthetic',coveredBirthYears:{from:1900,through:2100},contentUniverse:'Synthetic test registrations',classification:'observed',suppressionPolicy:'No suppression in synthetic fixtures.',transformation:'Counts copied exactly.',licence:'Synthetic test content.',methodology:'Synthetic test methodology.',limitations:['Synthetic evidence only.'],...overrides});
const rawPackage=(overrides:Partial<Omit<HumanGenerationContentPackageV1,'fingerprint'>>={}):Omit<HumanGenerationContentPackageV1,'fingerprint'>=>({
 version:1,compilerId:'human-generation-content.compiler-v1',id:'human.synthetic-content-v1',countryId:'ca',effectiveDate:{year:2024,month:6,day:30},profileId:'profile.synthetic-content-v1',sources:[source()],
 givenNameBands:[{id:'names.band.synthetic-v1',birthYearFrom:1900,birthYearThrough:2100,mode:'registration-count-weighted',sourceIds:['names.synthetic-given-v1'],entries:[{id:'name.alex',text:'Alex',weight:3,contributions:[{sourceId:'names.synthetic-given-v1',count:3}]},{id:'name.jamie',text:'Jamie',weight:2,contributions:[{sourceId:'names.synthetic-given-v1',count:2}]}],limitations:['Synthetic band.']}],
 familyNames:{kind:'reviewed-authored',classification:'authored-gameplay-abstraction',review:{id:'review.synthetic-family-v1',status:'approved',note:'Approved only for synthetic testing.'},entries:[{id:'family.one',text:'One',weight:1},{id:'family.two',text:'Two',weight:1}],limitations:['Authored synthetic surnames.']},
 genderPolicy:{kind:'fixed',label:'Unspecified'},intrinsicPolicy:{traits:[],temperament:[],aptitudes:[]},limitations:['Synthetic package only.'],gaps:[],...overrides,
});
const packageOf=(overrides:Partial<Omit<HumanGenerationContentPackageV1,'fingerprint'>>={})=>withHumanGenerationContentFingerprint(rawPackage(overrides));
const registryOf=(content=packageOf())=>createHumanGenerationContentRegistry([content],[{packageId:content.id,fingerprint:content.fingerprint}]);
const cohort=(overrides:Partial<PopulationCohortInput>={}):PopulationCohortInput=>({countryId:'ca',areaId:null,birthYear:2000,generationProfileId:'profile.synthetic-content-v1',count:4,...overrides});

describe('Human generation content package v1',()=>{
 it('canonicalizes unordered content and fingerprints material semantics deterministically',()=>{
  const first=packageOf(),reorderedBands=[...first.givenNameBands].map(band=>({...band,sourceIds:[...band.sourceIds].reverse(),entries:[...band.entries].reverse(),limitations:[...band.limitations].reverse()})) as unknown as HumanGenerationContentPackageV1['givenNameBands'],reordered=withHumanGenerationContentFingerprint(rawPackage({sources:[...first.sources].reverse(),givenNameBands:reorderedBands,limitations:[...first.limitations].reverse()}));
  expect(reordered).toEqual(first);expect(reordered.fingerprint).toBe(first.fingerprint);
  const changed=packageOf({genderPolicy:{kind:'fixed',label:'Another label'}});expect(changed.fingerprint).not.toBe(first.fingerprint);
  expect(fingerprintHumanGenerationContentPackage(first)).toBe(first.fingerprint);expect(validateHumanGenerationContentPackage(first)).toBe(true);expect(Object.isFrozen(first)).toBe(true);
 });

 it('rejects identity reuse with changed semantics and manifest tampering',()=>{
  const original=packageOf(),changed=packageOf({genderPolicy:{kind:'fixed',label:'Changed'}});
  expect(()=>createHumanGenerationContentRegistry([changed],[{packageId:changed.id,fingerprint:original.fingerprint}])).toThrow();
  expect(()=>createHumanGenerationContentRegistry([original,changed],[{packageId:original.id,fingerprint:original.fingerprint},{packageId:changed.id,fingerprint:changed.fingerprint}])).toThrow();
  expect(validateHumanGenerationContentRegistry(registryOf(original))).toBe(true);
  const tampered=structuredClone(registryOf(original)) as any;tampered.manifest[0].fingerprint='fnv1a64-v1:0000000000000000';expect(assessHumanGenerationReadiness([{...cohort(),id:populationCohortId(cohort())}],tampered).blockingReasons).toEqual(['content.invalid-registry']);
 });

 it('supports uniform historical evidence and exact registration-count contributions',()=>{
  const historical=packageOf({givenNameBands:[{id:'names.band.historical-v1',birthYearFrom:1900,birthYearThrough:1949,mode:'published-support-uniform',sourceIds:['names.synthetic-given-v1'],entries:[{id:'name.a',text:'A',weight:1},{id:'name.b',text:'B',weight:1}],limitations:['Published support lacks exact counts.']},{id:'names.band.modern-v1',birthYearFrom:1950,birthYearThrough:2100,mode:'registration-count-weighted',sourceIds:['names.synthetic-given-v1'],entries:[{id:'name.c',text:'C',weight:5,contributions:[{sourceId:'names.synthetic-given-v1',count:5}]}],limitations:[]} ]});
  expect(resolveHumanGenerationProfile(historical,1920).naming.givenNames.map(item=>item.weight)).toEqual([1,1]);expect(resolveHumanGenerationProfile(historical,2000).naming.givenNames[0].weight).toBe(5);
  const bad=structuredClone(rawPackage()) as any;bad.givenNameBands[0].entries[0].contributions[0].count=2;expect(()=>withHumanGenerationContentFingerprint(bad)).toThrow();
  const uncoveredSource=structuredClone(rawPackage()) as any;uncoveredSource.sources[0].coveredBirthYears={from:1900,through:1999};expect(()=>withHumanGenerationContentFingerprint(uncoveredSource)).toThrow();
  const outOfPeriod=structuredClone(rawPackage()) as any;outOfPeriod.sources.push(source({id:'names.synthetic-old-v1',coveredBirthYears:{from:1800,through:1899}}));outOfPeriod.givenNameBands[0].sourceIds.push('names.synthetic-old-v1');outOfPeriod.givenNameBands[0].entries[0].contributions.push({sourceId:'names.synthetic-old-v1',count:1});outOfPeriod.givenNameBands[0].entries[0].weight++;expect(()=>withHumanGenerationContentFingerprint(outOfPeriod)).toThrow();
 });

 it('keeps authored surnames explicitly classified and requires approval',()=>{
  const pending=packageOf({familyNames:{kind:'reviewed-authored',classification:'authored-gameplay-abstraction',review:{id:'review.pending-v1',status:'pending',note:'Not approved.'},entries:[{id:'family.test',text:'Test',weight:1}],limitations:['Authored.']}});
  expect(()=>resolveHumanGenerationProfile(pending,2000)).toThrow('not been approved');
  const missing=packageOf({familyNames:{kind:'reviewed-authored',classification:'authored-gameplay-abstraction',review:{id:'review.missing-v1',status:'approved',note:'Approved structure has no content yet.'},entries:[],limitations:['Family content missing.']}}),missingRegistry=registryOf(missing),required={...cohort(),id:populationCohortId(cohort())};expect(assessHumanGenerationReadiness([required],missingRegistry).status).toBe('not-ready');expect(assessHumanGenerationReadiness([required],missingRegistry).blockingReasons[0]).toContain('No approved family-name content');
  const ready=resolveHumanGenerationProfile(packageOf(),2000);expect(ready.temperament).toEqual([]);expect(ready.aptitudes).toEqual([]);expect(ready.traits).toEqual([]);expect(ready.genderLabels).toEqual([{id:'human.gender.fixed-v1',label:'Unspecified',weight:1}]);
 });

 it('compiles evidence-backed surnames and preserves duplicate display names with distinct identities',()=>{
  const evidence=packageOf({familyNames:{kind:'evidence-backed',classification:'observed',sourceIds:['names.synthetic-given-v1'],entries:[{id:'family.same-a',text:'Same',weight:2,contributions:[{sourceId:'names.synthetic-given-v1',count:2}]},{id:'family.same-b',text:'Same',weight:1,contributions:[{sourceId:'names.synthetic-given-v1',count:1}]}],limitations:['Synthetic evidence.']}}),profile=resolveHumanGenerationProfile(evidence,2000);
  expect(profile.naming.familyNames).toEqual([{id:'family.same-a',text:'Same',weight:2},{id:'family.same-b',text:'Same',weight:1}]);
  expect(assessHumanGenerationReadiness([{...cohort(),id:populationCohortId(cohort())}],registryOf(evidence)).status).toBe('ready');
  const malformed=structuredClone(rawPackage()) as any;malformed.sources[0].bundledArtifact={id:'artifact.synthetic-v1',sha256:'not-a-checksum'};expect(()=>withHumanGenerationContentFingerprint(malformed)).toThrow();
  const overstated=structuredClone(rawPackage({familyNames:{kind:'evidence-backed',classification:'observed',sourceIds:['names.synthetic-given-v1'],entries:[{id:'family.test',text:'Test',weight:1,contributions:[{sourceId:'names.synthetic-given-v1',count:1}]}],limitations:[]} })) as any;overstated.sources[0].classification='estimated';expect(()=>withHumanGenerationContentFingerprint(overstated)).toThrow();
 });

 it('preflights every possible full-name combination without truncation',()=>{
  const over='A'.repeat(200),family='B'.repeat(100),check=preflightHumanGenerationFullNames([{id:'name.long',text:over,weight:1}],[{id:'family.long',text:family,weight:1}]);expect(check.valid).toBe(false);expect(check.maximumCodePoints).toBe(301);
  const longPackage=packageOf({givenNameBands:[{id:'names.band.synthetic-v1',birthYearFrom:1900,birthYearThrough:2100,mode:'registration-count-weighted',sourceIds:['names.synthetic-given-v1'],entries:[{id:'name.long',text:over,weight:1,contributions:[{sourceId:'names.synthetic-given-v1',count:1}]}],limitations:[]}],familyNames:{kind:'reviewed-authored',classification:'authored-gameplay-abstraction',review:{id:'review.long-v1',status:'approved',note:'Synthetic.'},entries:[{id:'family.long',text:family,weight:1}],limitations:[]}});expect(()=>resolveHumanGenerationProfile(longPackage,2000)).toThrow('display-name bound');
  expect(assessHumanGenerationReadiness([{...cohort(),id:populationCohortId(cohort())}],registryOf(longPackage)).status).toBe('not-ready');
  const atLimit=preflightHumanGenerationFullNames([{id:'name.limit',text:'G'.repeat(127),weight:1}],[{id:'family.limit',text:'F'.repeat(128),weight:1}]),overLimit=preflightHumanGenerationFullNames([{id:'name.limit',text:'G'.repeat(128),weight:1}],[{id:'family.limit',text:'F'.repeat(128),weight:1}]);expect(atLimit.maximumCodePoints).toBe(256);expect(atLimit.valid).toBe(true);expect(overLimit.maximumCodePoints).toBe(257);expect(overLimit.valid).toBe(false);
 });

 it('rejects overlapping/uncovered bands, blocking gaps, malformed structures and hostile proxies',()=>{
  const overlap=structuredClone(rawPackage()) as any;overlap.givenNameBands.push({...overlap.givenNameBands[0],id:'names.band.overlap-v1'});expect(()=>withHumanGenerationContentFingerprint(overlap)).toThrow();
  const uncovered=packageOf({givenNameBands:[{...rawPackage().givenNameBands[0],birthYearFrom:2001}]});expect(()=>resolveHumanGenerationProfile(uncovered,2000)).toThrow('covers');
  expect(assessHumanGenerationReadiness([{...cohort(),id:populationCohortId(cohort())}],registryOf(uncovered)).status).toBe('not-ready');
  const blocked=packageOf({gaps:[{id:'gap.synthetic-v1',description:'Missing evidence.',blocking:true}]});expect(()=>resolveHumanGenerationProfile(blocked,2000)).toThrow('blocking gap');
  const sparse=structuredClone(rawPackage()) as any;sparse.sources=new Array(1);expect(()=>withHumanGenerationContentFingerprint(sparse)).toThrow();let reads=0;const accessor=structuredClone(rawPackage()) as any;Object.defineProperty(accessor,'countryId',{enumerable:true,get:()=>{reads++;return 'ca';}});expect(()=>withHumanGenerationContentFingerprint(accessor)).toThrow();expect(reads).toBe(0);
  const revoked=Proxy.revocable(rawPackage(),{});revoked.revoke();expect(()=>withHumanGenerationContentFingerprint(revoked.proxy as any)).toThrow('Invalid');
 });
});

describe('Human generation readiness and Population composition',()=>{
 it('keeps demographic coverage independent from generation-content readiness',()=>{
  const game=createGame('Player','Any','ca',41),missing=cohort({generationProfileId:'profile.missing-v1'}),complete=initializeCompleteCountryPopulation(game.population!,game.people!,{countryId:'ca',source:'population.synthetic-content-boundary-v1',areaPartitionId:null,cohorts:[missing]}),before=structuredClone(complete);
  expect(complete.coverage[0].status).toBe('complete');expect(assessHumanGenerationReadiness(complete.cohorts,registryOf()).status).toBe('not-ready');expect(complete).toEqual(before);
  const partial=addPopulationCohort(game.population!,cohort());expect(partial.coverage[0].status).toBe('partial');expect(assessHumanGenerationReadiness(partial.cohorts,registryOf()).status).toBe('ready');expect(partial.coverage[0].status).toBe('partial');
 });

 it('reports READY only when every production cohort resolves by country, profile and birth year',()=>{
  const content=packageOf(),registry=registryOf(content),requirement={...cohort(),id:populationCohortId(cohort())};expect(assessHumanGenerationReadiness([requirement],registry)).toEqual({status:'ready',unresolvedProfileIds:[],blockingReasons:[]});
  const missingInput=cohort({generationProfileId:'profile.missing-v1'}),missing={...missingInput,id:populationCohortId(missingInput)};expect(assessHumanGenerationReadiness([missing],registry).status).toBe('not-ready');expect(assessHumanGenerationReadiness([missing],registry).unresolvedProfileIds).toEqual(['profile.missing-v1']);expect(assessHumanGenerationReadiness([],registry).status).toBe('not-ready');
  const other=packageOf({id:'human.other-content-v1',profileId:'profile.other-content-v1',countryId:'yy'}),both=createHumanGenerationContentRegistry([content,other],[{packageId:content.id,fingerprint:content.fingerprint},{packageId:other.id,fingerprint:other.fingerprint}]),otherInput=cohort({countryId:'yy',generationProfileId:other.profileId}),otherRequirement={...otherInput,id:populationCohortId(otherInput)};expect(assessHumanGenerationReadiness([requirement,otherRequirement],both).status).toBe('ready');
  const hostile=structuredClone(requirement) as any;let reads=0;Object.defineProperty(hostile,'birthYear',{enumerable:true,get:()=>{reads++;return 2000;}});expect(assessHumanGenerationReadiness([hostile],registry).blockingReasons).toEqual(['content.invalid-cohorts']);expect(reads).toBe(0);
 });

 it('atomically resolves content and delegates deterministic conserved extraction and retry receipts',()=>{
  const game=createGame('Player','Any','ca',42),population=addPopulationCohort(game.population!,cohort({count:2})),content=packageOf(),contentRegistry=registryOf(content),input={people:game.people!,population,rootSeed:game.randomness!.rootSeed,cohortId:population.cohorts[0].id,requestKey:'content.synthetic-request-v1',count:2,referenceDate:{year:2024,month:6,day:30} as const,contentRegistry};
  const before=deriveRepresentedLivingPopulation(population,game.people!),randomness=structuredClone(game.randomness),clock=structuredClone(game.clock),history=structuredClone(game.history),scheduler=structuredClone(game.scheduler),facts=structuredClone(game.facts),result=instantiateFromCohortWithContent(input);expect(deriveRepresentedLivingPopulation(result.population,result.people)).toEqual(before);expect(result.persons.map(item=>item.id)).toEqual(['person:2','person:3']);expect(result.persons.every(item=>item.genderLabel==='Unspecified'&&!Object.keys(item.temperament).length&&!Object.keys(item.aptitudes).length&&!item.traits.length)).toBe(true);expect(game.randomness).toEqual(randomness);expect(game.clock).toEqual(clock);expect(game.history).toEqual(history);expect(game.scheduler).toEqual(scheduler);expect(game.facts).toEqual(facts);
  const retry=instantiateFromCohortWithContent({...input,people:result.people,population:result.population});expect(retry.reused).toBe(true);expect(retry.people).toEqual(result.people);expect(retry.population).toEqual(result.population);
 });

 it('rolls back unresolved content and continues correctly after save/load',()=>{
  const game=createGame('Player','Any','ca',43),population=addPopulationCohort(game.population!,cohort({count:2})),beforePeople=structuredClone(game.people),beforePopulation=structuredClone(population),pending=packageOf({familyNames:{kind:'reviewed-authored',classification:'authored-gameplay-abstraction',review:{id:'review.pending-v1',status:'pending',note:'Pending.'},entries:[{id:'family.test',text:'Test',weight:1}],limitations:[]}});
  expect(()=>instantiateFromCohortWithContent({people:game.people!,population,rootSeed:43,cohortId:population.cohorts[0].id,requestKey:'content.failed-request-v1',count:1,referenceDate:{year:2024,month:6,day:30},contentRegistry:registryOf(pending)})).toThrow();expect(game.people).toEqual(beforePeople);expect(population).toEqual(beforePopulation);
  const ready=registryOf(),first=instantiateFromCohortWithContent({people:game.people!,population,rootSeed:43,cohortId:population.cohorts[0].id,requestKey:'content.saved-request-v1',count:1,referenceDate:{year:2024,month:6,day:30},contentRegistry:ready});game.people=first.people;game.population=first.population;const saved=serializeGame(game);expect(saved.ok).toBe(true);if(!saved.ok)return;const loaded=parseGame(saved.raw).game!,next=instantiateFromCohortWithContent({people:loaded.people!,population:loaded.population!,rootSeed:loaded.randomness!.rootSeed,cohortId:loaded.population!.cohorts[0].id,requestKey:'content.next-request-v1',count:1,referenceDate:{year:2024,month:6,day:30},contentRegistry:ready});expect(next.persons[0].id).toBe('person:3');
 });

 it('has no production registration, mutable randomness, UK, politics or UI dependency',()=>{
  const modules=import.meta.glob<string>(['./*.ts','!./*.test.ts'],{eager:true,query:'?raw',import:'default'}),text=Object.values(modules).join('\n');expect(text).not.toMatch(/Math\.random|Date\.now|randomUUID/);expect(text).not.toMatch(/from\s+['"][^'"]*(?:react|ui|politics|ukWorld|national)/);expect(text).not.toContain('human.uk.pending-mid-2024-v1');expect(createRandomness(1)).toEqual({version:1,rootSeed:1,streams:{}});
 });
});

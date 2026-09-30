import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {compilePopulationCalibration} from '../human/calibration/compiler';
import {initializePopulationFromCalibration} from '../human/calibration/integration';
import {instantiateFromCohortWithContent} from '../human/content/integration';
import {createRandomness} from '../core/rng';
import {createPlayerPopulation,deriveCountryPopulation,type PopulationState} from '../human/population';
import {createPeople,type PeopleState} from '../human/person';
import {adaptOnsMid2024Workbook,adaptOnsVeryOld2024Csv,createUkMid2024CalibrationPackageV2} from '../../data/demography/uk/ons-mid-2024/adapter';
import {createUkHumanGenerationContentRegistry,UK_HUMAN_CONTENT_PROFILE_ID} from '../../data/human/uk/generation/adapter';

const bytes=(url:URL)=>new Uint8Array(readFileSync(url));

test('all 119 production UK cohorts extract deterministically with conservation and retry receipts',async()=>{
 const main=await adaptOnsMid2024Workbook(bytes(new URL('../../data/demography/uk/ons-mid-2024/mye24tablesuk.xlsx',import.meta.url))),old=await adaptOnsVeryOld2024Csv(bytes(new URL('../../data/demography/uk/ons-mid-2024/ukevo2024.csv',import.meta.url))),pkg=createUkMid2024CalibrationPackageV2(main,old).package,registry=createUkHumanGenerationContentRegistry(),randomness=createRandomness(2024),randomBefore=structuredClone(randomness);
 const createInitial=():{people:PeopleState;population:PopulationState}=>{const people=createPeople({name:'UK Sweep Player',dateOfBirth:{year:2000,month:1,day:1},genderLabel:'Unspecified',lifeStatus:'living',traits:[],temperament:{},aptitudes:{}}),partial=createPlayerPopulation(people,'uk'),calibration=compilePopulationCalibration(pkg,{profileExists:id=>id===UK_HUMAN_CONTENT_PROFILE_ID,livingMemberships:[{birthYear:2000,areaId:null,count:1}]});return {people,population:initializePopulationFromCalibration(partial,people,pkg,calibration,[{personId:people.playerId,birthYear:2000,areaId:null}])};};
 const sweep=(checkRetries:boolean)=>{let {people,population}=createInitial();const initialTotal=deriveCountryPopulation(population,people,'uk'),outputs:unknown[]=[];for(const original of [...population.cohorts]){const cohort=population.cohorts.find(item=>item.id===original.id)!;const request={people,population,rootSeed:2024,cohortId:cohort.id,requestKey:`human-content.uk-all-cohort.${cohort.birthYear}-v1`,count:1,referenceDate:{year:2024,month:6,day:30} as const,contentRegistry:registry},result=instantiateFromCohortWithContent(request);expect(result.reused).toBe(false);expect(result.persons).toHaveLength(1);expect(result.persons[0]).toMatchObject({genderLabel:'Unspecified',traits:[],temperament:{},aptitudes:{}});expect(result.population.memberships.at(-1)?.personId).toBe(result.persons[0].id);expect(deriveCountryPopulation(result.population,result.people,'uk')).toEqual(initialTotal);if(checkRetries){const retry=instantiateFromCohortWithContent({...request,people:result.people,population:result.population});expect(retry.reused).toBe(true);expect(retry.people).toEqual(result.people);expect(retry.population).toEqual(result.population);}people=result.people;population=result.population;outputs.push({id:result.persons[0].id,name:result.persons[0].name,dateOfBirth:result.persons[0].dateOfBirth});}return {people,population,outputs};};
 const first=sweep(true),second=sweep(false);expect(first.outputs).toEqual(second.outputs);expect(first.people.people).toHaveLength(120);expect(first.population.memberships).toHaveLength(120);expect(deriveCountryPopulation(first.population,first.people,'uk').knownLiving).toBe(69281437);expect(randomness).toEqual(randomBefore);
},300_000);

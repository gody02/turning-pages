import {describe,expect,it} from 'vitest';
import localJson from './normalized-local-age-margins.json';
import {createUkGeographicCandidatePopulationState,loadUkGeographicPopulationCandidate,UK_GEOGRAPHIC_POPULATION_ALLOCATION_REPORT,UK_GEOGRAPHIC_POPULATION_TOTAL,validateUkGeographicPopulationCandidate} from './adapter';
import {loadUkMid2024ProductionPackage} from '../ons-mid-2024/adapter';
import {createUkMid2024Game} from '../../../uk/countryStart';
import {createUkGeographyRegistry} from '../../../geography/uk/primary-local-admin-2024/adapter';
import {createGeographyRuntime} from '../../../../engine/geography/runtime';
import {deriveGeographicPopulation,validPopulationGeography} from '../../../../engine/geography/population';
import {createCohortMembership,validPopulation,validPopulationWithPeople} from '../../../../engine/human/population';
import {parseGame,saveGame,serializeGame,SAVE_KEY} from '../../../../engine/save';
import type {Game} from '../../../../engine/types';

const bySum=<T>(items:readonly T[],key:(item:T)=>string,value:(item:T)=>number)=>{const out=new Map<string,number>();for(const item of items)out.set(key(item),(out.get(key(item))??0)+value(item));return out;};
function representativeGame():Game{
 const base=createUkMid2024Game({version:1,rootSeed:73,mode:'adult'}),pkg=loadUkGeographicPopulationCandidate(),target=pkg.cohorts.find(item=>item.birthYear===2006&&item.count>0)!;
 const cohorts=pkg.cohorts.map(item=>item.id===target.id?{...item,count:item.count-1}:item).filter(item=>item.count>0);
 const membership=createCohortMembership(base.people!.people[0],target.id,'candidate.uk-geographic-population.persistence-probe-v1',0);
 const population={version:1 as const,coverage:[{countryId:'uk',status:'complete' as const,source:pkg.id,areaPartitionId:pkg.geographyPartitionId}],cohorts,memberships:[membership]};
 const game={...base,population};expect(validPopulationWithPeople(population,base.people)).toBe(true);expect(validPopulationGeography(population,base.people!,createGeographyRuntime(createUkGeographyRegistry()))).toBe(true);return game;
}

describe('UK geographic population candidate',()=>{
 it('is an unregistered immutable v3 candidate with frozen-v2 national margins',()=>{
  const pkg=loadUkGeographicPopulationCandidate(),copy=structuredClone(pkg) as any;expect(validateUkGeographicPopulationCandidate(pkg)).toBe(true);expect(Object.isFrozen(pkg)).toBe(true);expect(pkg).toMatchObject({id:'uk.population.mid-2024.v3',status:'candidate',sourcePopulationPackageId:'uk.population.mid-2024.v2',geographyPartitionId:'geography.uk.primary-local-admin-2024-06-30-v1'});expect(pkg.cohorts).toHaveLength(38_731);
  copy.cohorts[0].count++;expect(validateUkGeographicPopulationCandidate(copy)).toBe(false);
  const actual=bySum(pkg.cohorts,item=>String(item.birthYear),item=>item.count),v2=loadUkMid2024ProductionPackage(),expected=new Map(v2.measures.filter(item=>item.dimensions.kind==='birth-year').map(item=>[String((item.dimensions as {birthYear:number}).birthYear),Number(item.value)]));expect(actual).toEqual(expected);expect([...actual.values()].reduce((a,b)=>a+b,0)).toBe(UK_GEOGRAPHIC_POPULATION_TOTAL);
 });
 it('preserves all 361 local totals and constituent-country totals',()=>{
  const pkg=loadUkGeographicPopulationCandidate(),actual=bySum(pkg.cohorts,item=>item.areaId,item=>item.count),areas=(localJson as typeof localJson).areas;expect(actual.size).toBe(361);for(const area of areas)expect(actual.get(area.areaId),area.areaId).toBe(area.total);
  const codes=new Map(areas.map(area=>[area.areaId,area.countryCode])),countries=bySum(pkg.cohorts,item=>codes.get(item.areaId)!,item=>item.count);expect(Object.fromEntries(countries)).toEqual({E:58_620_101,N:1_927_855,S:5_546_900,W:3_186_581});
  expect(UK_GEOGRAPHIC_POPULATION_ALLOCATION_REPORT.checks).toMatchObject({localCompletedAgeExact:true,local90PlusExact:true,nationalBirthYearsExact:true,localAreasExact:true,nationalTotalExact:true,unsupportedEdges:0,negativeCells:0});
 });
 it('forms canonical PopulationState v1 and generic geographic rollups',()=>{
  expect(validPopulation(createUkGeographicCandidatePopulationState())).toBe(true);const game=representativeGame(),runtime=createGeographyRuntime(createUkGeographyRegistry());
  expect(deriveGeographicPopulation(game.population!,game.people!,runtime,{countryId:'uk',partitionId:'geography.uk.primary-local-admin-2024-06-30-v1',placeId:'place.uk.country.united-kingdom'})).toEqual({knownLiving:69_281_437,complete:true});
  for(const [placeId,total] of [['place.uk.constituent.england',58_620_101],['place.uk.constituent.wales',3_186_581],['place.uk.constituent.scotland',5_546_900],['place.uk.constituent.northern-ireland',1_927_855]] as const)expect(deriveGeographicPopulation(game.population!,game.people!,runtime,{countryId:'uk',partitionId:'geography.uk.primary-local-admin-2024-06-30-v1',placeId}).knownLiving).toBe(total);
 });
 it('round-trips a representative Game but fails the conservative browser-storage gate',()=>{
  const game=representativeGame(),saved=serializeGame(game);expect(saved.ok).toBe(true);if(!saved.ok)return;expect(new TextEncoder().encode(saved.raw).byteLength).toBeGreaterThan(5*1024*1024);expect(parseGame(saved.raw).game).toEqual(saved.game);
  const storage={value:null as string|null,getItem:(key:string)=>key===SAVE_KEY?storage.value:null,setItem:(_key:string,value:string)=>{if(new TextEncoder().encode(value).byteLength>5*1024*1024)throw Error('QuotaExceededError');storage.value=value;}};expect(saveGame(storage,game)).toContain('Saving is unavailable');expect(storage.value).toBeNull();
 });
});

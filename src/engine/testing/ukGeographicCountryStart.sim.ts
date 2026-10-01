import {expect,test} from 'vitest';
import {selectUkMid2024GeographicPlayerCohort} from '../../data/uk/countryStartGeographic';

test('geographic UK country-start selection is deterministic and population-weighted across explicit seeds',()=>{
 const sample=(mode:'childhood'|'adult')=>Array.from({length:2_000},(_,rootSeed)=>{const cohort=selectUkMid2024GeographicPlayerCohort(rootSeed,mode);return {cohortId:cohort.id,areaId:cohort.areaId,count:cohort.count};}),first={childhood:sample('childhood'),adult:sample('adult')},second={childhood:sample('childhood'),adult:sample('adult')};expect(second).toEqual(first);
 const report=Object.fromEntries(Object.entries(first).map(([mode,values])=>{const frequencies=new Map<string,number>();for(const value of values)frequencies.set(value.areaId!,1+(frequencies.get(value.areaId!)??0));const ranked=[...frequencies].sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:1));expect(frequencies.size).toBeGreaterThan(250);return [mode,{seeds:values.length,uniqueAreas:frequencies.size,mostSelected:ranked.slice(0,10)}];}));
 console.log(JSON.stringify({profile:'uk-geographic-country-start-selection',selection:'population-weighted-keyed-v1',...report}));
});

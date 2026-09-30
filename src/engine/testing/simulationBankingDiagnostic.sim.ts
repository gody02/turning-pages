import {describe,expect,it} from 'vitest';
import {isJsonValue} from '../core/json';
import {ukWorldProfile} from './simulationProfiles';
import {runSimulation,seedRange} from './simulationRunner';

describe('UK banking optional 250-year diagnostic',()=>{
 for(const [index,seed] of seedRange(100,1).entries())it(`probes seed ${seed} through 3,000 monthly transitions`,()=>{
  const profile=ukWorldProfile([],250,false);
  const run=runSimulation(profile,seed,index);
  expect(isJsonValue(run.state),`seed ${seed}`).toBe(true);
  expect(run.result.finalNationalMonth,`seed ${seed}`).toBeGreaterThan(1200);
  if(run.result.failure){
   expect(['uk-world','institutions']).toContain(run.result.failure.invariant);
   expect(run.result.failure.observed?.banksValid).toBe(true);
   expect(run.result.failure.observed?.bank).toBeNull();
   expect(run.result.failure.observed?.bankField).toBeNull();
  }else expect(run.result.finalNationalMonth).toBe(3000);
 },300_000);
});

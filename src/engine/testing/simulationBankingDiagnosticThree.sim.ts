import {describe,expect,it} from 'vitest';
import {isJsonValue} from '../core/json';
import {ukWorldProfile} from './simulationProfiles';
import {runSimulation} from './simulationRunner';

describe('UK banking optional 250-year diagnostic, seed 102',()=>{
 it('reports only a post-gate non-banking horizon failure',()=>{
  const run=runSimulation(ukWorldProfile([],250,false),102,2);
  expect(isJsonValue(run.state)).toBe(true);expect(run.result.finalNationalMonth).toBeGreaterThan(1200);
  if(run.result.failure){expect(['uk-world','institutions']).toContain(run.result.failure.invariant);expect(run.result.failure.observed?.banksValid).toBe(true);expect(run.result.failure.observed?.bank).toBeNull();expect(run.result.failure.observed?.bankField).toBeNull();}
  else expect(run.result.finalNationalMonth).toBe(3000);
 },300_000);
});

import {describe,expect,it} from 'vitest';
import {formatSimulationFailure} from '../diagnostics/simulation';
import {personalProfile} from './simulationProfiles';
import {runSimulationSuite,seedRange} from './simulationRunner';

const requireHealthy=(suite:ReturnType<typeof runSimulationSuite>)=>{
  const failed=suite.runs.find(run=>run.failure);expect(failed?.failure&&formatSimulationFailure(failed.failure)).toBeUndefined();
};

describe('Deep deterministic simulation profiles',()=>{
  it('runs 500 natural personal lives',()=>{
    requireHealthy(runSimulationSuite(personalProfile(seedRange(1_000,500),true)));
  },300_000);
});

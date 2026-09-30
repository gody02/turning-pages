import {describe,expect,it} from 'vitest';
import {formatSimulationFailure} from '../diagnostics/simulation';
import {politicsProfile} from './simulationProfiles';
import {runSimulationSuite,seedRange} from './simulationRunner';

describe('Deep political deterministic simulation, batch two',()=>{
  it('runs five twelve-year political lives',()=>{
    const suite=runSimulationSuite(politicsProfile(seedRange(105,5),12,false)),failed=suite.runs.find(run=>run.failure);
    expect(failed?.failure&&formatSimulationFailure(failed.failure)).toBeUndefined();
  },300_000);
});

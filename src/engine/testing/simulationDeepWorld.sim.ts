import {describe,expect,it} from 'vitest';
import {formatSimulationFailure} from '../diagnostics/simulation';
import {ukWorldProfile} from './simulationProfiles';
import {runSimulationSuite,seedRange} from './simulationRunner';

describe('Deep UK-world deterministic simulation, batch one',()=>{
  it('runs five bounded 60-year UK-world histories',()=>{
    const suite=runSimulationSuite(ukWorldProfile(seedRange(10,5),60,false)),failed=suite.runs.find(run=>run.failure);
    expect(failed?.failure&&formatSimulationFailure(failed.failure)).toBeUndefined();
  },300_000);
});

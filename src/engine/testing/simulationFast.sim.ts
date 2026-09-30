import {describe,expect,it} from 'vitest';
import {formatSimulationFailure,type SimulationSuiteResult} from '../diagnostics/simulation';
import {personalProfile,politicsProfile,ukWorldProfile} from './simulationProfiles';
import {runSimulationSuite} from './simulationRunner';

const deterministic=(suite:SimulationSuiteResult)=>suite.runs.map(run=>({terminal:run.terminal,failure:run.failure,warnings:run.warnings,steps:run.metrics.steps,months:run.metrics.simulatedMonths,initialSaveBytes:run.metrics.initialSaveBytes,finalSaveBytes:run.metrics.finalSaveBytes,maximumSaveBytes:run.metrics.maximumSaveBytes,saveSamples:run.metrics.saveSamples}));
const requireHealthy=(suite:SimulationSuiteResult)=>{
  const failed=suite.runs.find(run=>run.failure);expect(failed?.failure&&formatSimulationFailure(failed.failure)).toBeUndefined();
};

describe('Fast deterministic simulation profiles',()=>{
  it('runs the complete bounded Fast profile families',()=>{
    [runSimulationSuite(personalProfile()),runSimulationSuite(ukWorldProfile()),runSimulationSuite(politicsProfile())].forEach(requireHealthy);
  },300_000);
  it('replays representative Fast seeds with identical diagnostics',()=>{
    const replay=(first:SimulationSuiteResult,second:SimulationSuiteResult)=>{requireHealthy(first);requireHealthy(second);expect(deterministic(first)).toEqual(deterministic(second));};
    replay(runSimulationSuite(personalProfile([17])),runSimulationSuite(personalProfile([17])));
    replay(runSimulationSuite(ukWorldProfile([2])),runSimulationSuite(ukWorldProfile([2])));
    replay(runSimulationSuite(politicsProfile([4])),runSimulationSuite(politicsProfile([4])));
  },300_000);
});

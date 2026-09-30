import {describe,expect,it} from 'vitest';
import {isJsonValue} from '../core/json';
import {ukWorldProfile} from './simulationProfiles';
import {runSimulation,seedRange} from './simulationRunner';

describe('UK banking 100-year freeze gate, batch four',()=>{
 for(const [index,seed] of seedRange(15,5).entries())it(`replays seed ${seed} through 1,200 valid monthly transitions`,()=>{
  const profile=ukWorldProfile([],100,false),first=runSimulation(profile,seed,index),replay=runSimulation(profile,seed,index);
  expect(first.result.failure,`seed ${seed}`).toBeUndefined();expect(first.result.finalNationalMonth,`seed ${seed}`).toBe(1200);expect(isJsonValue(first.state),`seed ${seed}`).toBe(true);
  expect(replay.result.failure,`replay seed ${seed}`).toBeUndefined();expect(replay.state,`replay seed ${seed}`).toEqual(first.state);
 },300_000);
});

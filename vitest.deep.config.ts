import {defineConfig} from 'vitest/config';

/** Deep profiles are split by family so workers keep their reports bounded. */
export default defineConfig({test:{
  include:[
    'src/engine/testing/simulationDeep.sim.ts',
    'src/engine/testing/simulationDeepWorld.sim.ts',
    'src/engine/testing/simulationDeepPolitical.sim.ts',
  ],
  testTimeout:300_000,
  fileParallelism:true,
  minWorkers:3,
  maxWorkers:3,
}});

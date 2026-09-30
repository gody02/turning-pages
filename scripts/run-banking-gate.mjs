import {spawnSync} from 'node:child_process';

const batches=[
  'src/engine/testing/simulationBankingGate.sim.ts',
  'src/engine/testing/simulationBankingGateTwo.sim.ts',
  'src/engine/testing/simulationBankingGateThree.sim.ts',
  'src/engine/testing/simulationBankingGateFour.sim.ts',
];

for(const batch of batches){
  const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','--config','vitest.sim.config.ts',batch],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status??1);
}

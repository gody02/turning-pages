import {spawn} from 'node:child_process';

const profiles=[
  'src/engine/testing/simulationDeep.sim.ts',
  'src/engine/testing/simulationDeepWorld.sim.ts',
  'src/engine/testing/simulationDeepWorldTwo.sim.ts',
  'src/engine/testing/simulationDeepWorldThree.sim.ts',
  'src/engine/testing/simulationDeepWorldFour.sim.ts',
  'src/engine/testing/simulationDeepPolitical.sim.ts',
  'src/engine/testing/simulationDeepPoliticalTwo.sim.ts',
];

const run=(profile)=>new Promise(resolve=>{
  const child=spawn(process.execPath,['node_modules/vitest/vitest.mjs','run','--config','vitest.sim.config.ts',profile],{stdio:'inherit'});
  child.on('error',()=>resolve(1));
  child.on('close',code=>resolve(code??1));
});

const codes=await Promise.all(profiles.map(run));
if(codes.some(code=>code!==0))process.exit(1);

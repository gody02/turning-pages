import {defineConfig} from 'vitest/config';

/** Long deterministic simulations stay outside ordinary unit-test discovery. */
export default defineConfig({test:{
  include:['src/engine/testing/**/*.sim.ts'],
  testTimeout:300_000,
  maxConcurrency:20,
  pool:'forks',
}});

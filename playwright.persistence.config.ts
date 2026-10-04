import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'tests/browser',timeout:120_000,fullyParallel:false,workers:1,reporter:'line',
  // Dedicated actual-built/non-root-base tests have their own server and CI step.
  testIgnore:['**/applicationContent*.spec.ts'],
  use:{baseURL:'http://127.0.0.1:4174',trace:'retain-on-failure'},
  webServer:{command:'pnpm exec vite --config playwright.persistence.server.ts --host 127.0.0.1 --port 4174 --strictPort',url:'http://127.0.0.1:4174',reuseExistingServer:false,timeout:120_000},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'firefox',use:{...devices['Desktop Firefox']}},{name:'webkit',use:{...devices['Desktop Safari']}}],
});

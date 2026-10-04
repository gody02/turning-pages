import {defineConfig,devices} from '@playwright/test';
const dev=process.env.APPLICATION_CONTENT_DEV==='1',port=dev?4176:4175,url=`http://127.0.0.1:${port}/application-content-evidence/`;
export default defineConfig({testDir:'tests/browser',testMatch:dev?'applicationContentDev.spec.ts':['applicationContent.spec.ts','applicationContentNewGame.spec.ts'],timeout:120_000,fullyParallel:false,workers:1,reporter:'line',
 use:{baseURL:url,trace:'retain-on-failure'},
 webServer:{command:dev?`pnpm exec vite --base /application-content-evidence/ --host 127.0.0.1 --port ${port} --strictPort`:`pnpm exec vite preview --base /application-content-evidence/ --outDir research/application-content-handoff/implementation-app-dist --host 127.0.0.1 --port ${port} --strictPort`,url,reuseExistingServer:false,timeout:120_000},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'firefox',use:{...devices['Desktop Firefox']}},{name:'webkit',use:{...devices['Desktop Safari']}}]});

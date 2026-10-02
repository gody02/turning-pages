// Acceptance bundle only. Production routing/application entry stays unchanged.
import {build} from 'vite';
import fs from 'node:fs';
const result=await build({configFile:false,publicDir:false,base:'/research/country-start-v3/worker-browser-dist/',worker:{format:'es'},
 build:{outDir:'research/country-start-v3/worker-browser-dist',emptyOutDir:true,manifest:true,
 rollupOptions:{input:'research/country-start-v3/worker-browser-entry.ts',preserveEntrySignatures:'strict',output:{entryFileNames:'startup-profile.js'}}}});
const summary=result.output.map(file=>({file:file.fileName,bytes:file.type==='chunk'?Buffer.byteLength(file.code):Buffer.byteLength(file.source)}));
fs.writeFileSync('research/country-start-v3/worker-browser-bundle.json',JSON.stringify({diagnosticOnly:true,files:summary},null,2)+'\n');

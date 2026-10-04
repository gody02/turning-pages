import fs from 'node:fs';
const file=process.argv[2];if(!file||!fs.existsSync(file))throw Error('No actual browser evidence');
const report=JSON.parse(fs.readFileSync(file)),records=[];
function visit(suite){for(const spec of suite.specs??[])for(const test of spec.tests??[])for(const result of test.results??[])for(const item of result.stdout??[])for(const line of (item.text??'').split('\n')){
 try{const data=JSON.parse(line);if(data.gate?.startsWith('production-new-game-v3')){const record={...data,testStatus:result.status,browser:test.projectName,commit:process.env.GITHUB_SHA,runnerOS:process.env.RUNNER_OS};records.push(record);console.log('::notice title=Production v3 routing::'+JSON.stringify(record));}}catch{}
 }for(const child of suite.suites??[])visit(child);}
for(const suite of report.suites??[])visit(suite);
fs.writeFileSync(file.replace(/\.json$/,'.routing.json'),JSON.stringify({version:1,records},null,2)+'\n');

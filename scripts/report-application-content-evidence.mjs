import fs from 'node:fs';
const file=process.argv[2];if(!file||!fs.existsSync(file)){console.log('Application-content evidence is unavailable; no pass inferred.');process.exit(0);}
const report=JSON.parse(fs.readFileSync(file,'utf8')),records=[];
function visit(suite){for(const spec of suite.specs??[])for(const test of spec.tests??[])for(const result of test.results??[]){
 for(const output of result.stdout??[]){const text=output.text??'';for(const line of text.split('\n')){try{const parsed=JSON.parse(line.trim());if(parsed.gate==='application-content-handoff'){
  const samples=parsed.memory?.combined?.samples??[],max=realm=>Math.max(0,...samples.filter(sample=>sample.realm===realm).map(sample=>sample.usedSize));
  const evidence={...parsed,memory:{...parsed.memory,combined:{...parsed.memory?.combined,samples:undefined,workerSampleCount:samples.filter(sample=>sample.realm==='worker').length,mainSampleCount:samples.filter(sample=>sample.realm==='main').length,peakObservedMainBytes:max('main'),peakObservedWorkerBytes:max('worker'),sumOfSeparateObservedPeaks:max('main')+max('worker'),notExactSimultaneousPeak:true}},testStatus:result.status,commit:process.env.GITHUB_SHA,runnerOS:process.env.RUNNER_OS};
  records.push(evidence);console.log('::notice title=Application content '+parsed.browser+'::'+JSON.stringify(evidence));
 }}catch{/* Other browser/test output is retained in the raw artifact. */}}}
 if(result.status!=='passed')console.log('::error title=Application content assertion failure::'+JSON.stringify({title:spec.title,status:result.status,errors:result.errors,commit:process.env.GITHUB_SHA}));
 }for(const child of suite.suites??[])visit(child);}
for(const suite of report.suites??[])visit(suite);
fs.writeFileSync(file.replace(/\.json$/,'.measurements.json'),JSON.stringify({version:1,records},null,2)+'\n');

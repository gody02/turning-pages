// CI diagnostics only. An annotation makes measured evidence publicly inspectable without log credentials.
import fs from 'node:fs';
const result=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
function visit(suites){for(const suite of suites){for(const spec of suite.specs??[])for(const test of spec.tests??[]){
 if(spec.title!=='reviews cold/warm Country Start v3, responsiveness and nonempty Residence persistence')continue;
 const run=test.results.at(-1),attachment=run?.attachments?.find(item=>item.name==='country-start-v3-measurements');
 if(!attachment?.body)continue;
 const measured=JSON.parse(Buffer.from(attachment.body,'base64').toString('utf8'));
 const evidence={...measured,testStatus:run.status,commit:process.env.GITHUB_SHA,runnerOS:process.env.RUNNER_OS};
 console.log('::notice title=Country Start v3 measured browser evidence::'+JSON.stringify(evidence).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A'));
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n### Explicit Country Start v3 measured evidence\n\n```json\n'+JSON.stringify(evidence,null,2)+'\n```\n');
 }visit(suite.suites??[]);}}
visit(result.suites??[]);

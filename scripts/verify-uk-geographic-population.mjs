import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=process.cwd(),dir=resolve(root,'src/data/demography/uk/geographic-mid-2024');
const source=resolve(root,'src/data/geography/uk/primary-local-admin-2024/artifacts/ons-myeb-local-authorities-mid-2024.xlsx');
const bytes=await readFile(source),expected='321f27261c9cf110ea44ca10d198580ec3969bc1171c780cba5596184df9b04d';
if(bytes.length!==47_036_552||createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('UK geographic population workbook integrity failed.');
const pkg=JSON.parse(await readFile(resolve(dir,'compiled-population-v3-candidate.json'),'utf8'));
const report=JSON.parse(await readFile(resolve(dir,'allocation-report.json'),'utf8'));
const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a<b?-1:a>b?1:0)):item);
const fnv=value=>{let hash=0xcbf29ce484222325n;for(const byte of new TextEncoder().encode(canonical(value))){hash^=BigInt(byte);hash=BigInt.asUintN(64,hash*0x100000001b3n);}return `fnv1a64-v1:${hash.toString(16).padStart(16,'0')}`;};
const {fingerprint,...semantics}=pkg;
if(pkg.id!=='uk.population.mid-2024.v3'||pkg.status!=='candidate'||pkg.fingerprint!=='fnv1a64-v1:2894f4c1b1fdd274'||pkg.cohorts.length!==38_731)throw Error('UK geographic population candidate identity changed.');
if(fingerprint!==fnv(semantics))throw Error('UK geographic population candidate fingerprint mismatch.');
if(report.status!=='candidate-persistence-gate-failed'||report.persistenceGate?.result!=='failed'||report.checks.nationalTotal!==69_281_437||!Object.entries(report.checks).filter(([key])=>key.endsWith('Exact')).every(([,value])=>value===true))throw Error('UK geographic population allocation report failed.');
let total=0,previous='';for(const cohort of pkg.cohorts){if(cohort.id<=previous||!Number.isSafeInteger(cohort.count)||cohort.count<=0)throw Error('Candidate cohort ordering/count invalid.');previous=cohort.id;total+=cohort.count;}
if(total!==69_281_437)throw Error('Candidate population does not conserve the UK total.');
console.log(`Verified unregistered UK geographic population candidate: ${pkg.cohorts.length} cohorts, ${total} people.`);

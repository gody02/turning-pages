import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=process.cwd(),dir=resolve(root,'src/data/demography/uk/geographic-mid-2024');
const source=resolve(root,'src/data/geography/uk/primary-local-admin-2024/artifacts/ons-myeb-local-authorities-mid-2024.xlsx');
const bytes=await readFile(source),expected='321f27261c9cf110ea44ca10d198580ec3969bc1171c780cba5596184df9b04d';
if(bytes.length!==47_036_552||createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('UK geographic population workbook integrity failed.');
const pkg=JSON.parse(await readFile(resolve(dir,'compiled-population-v3-candidate.json'),'utf8'));
const report=JSON.parse(await readFile(resolve(dir,'allocation-report.json'),'utf8'));
const registry=JSON.parse(await readFile(resolve(root,'src/data/demography/uk/population-content-manifest.json'),'utf8'));
const v2=JSON.parse(await readFile(resolve(root,'src/data/demography/uk/ons-mid-2024/compiled-package-v2.json'),'utf8'));
const geography=JSON.parse(await readFile(resolve(root,'src/data/geography/uk/primary-local-admin-2024/compiled-partition.json'),'utf8'));
const local=JSON.parse(await readFile(resolve(dir,'normalized-local-age-margins.json'),'utf8'));
const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a<b?-1:a>b?1:0)):item);
const fnv=value=>{let hash=0xcbf29ce484222325n;for(const byte of new TextEncoder().encode(canonical(value))){hash^=BigInt(byte);hash=BigInt.asUintN(64,hash*0x100000001b3n);}return `fnv1a64-v1:${hash.toString(16).padStart(16,'0')}`;};
const {fingerprint,...semantics}=pkg;
if(pkg.id!=='uk.population.mid-2024.v3'||pkg.status!=='candidate'||pkg.fingerprint!=='fnv1a64-v1:2894f4c1b1fdd274'||pkg.cohorts.length!==38_731)throw Error('UK geographic population candidate identity changed.');
if(fingerprint!==fnv(semantics))throw Error('UK geographic population candidate fingerprint mismatch.');
if(createHash('sha256').update(await readFile(resolve(dir,'compiled-population-v3-candidate.json'))).digest('hex')!=='c4b13eb67a1b7e231da1250b27f8e596c6535e7f260013d8a8638bda2b81188a')throw Error('UK geographic population artifact bytes changed.');
if(report.status!=='production-frozen'||report.persistenceGate?.result!=='passed'||report.persistenceGate?.backend!=='indexeddb-arraybuffer-v1'||report.checks.nationalTotal!==69_281_437||!Object.entries(report.checks).filter(([key])=>key.endsWith('Exact')).every(([,value])=>value===true))throw Error('UK geographic population allocation report failed.');
if(report.boundary1934?.completedAge89<=0||report.boundary1934?.age90Plus<=0||report.boundary1934.completedAge89+report.boundary1934.age90Plus!==report.boundary1934.finalBirthYear)throw Error('UK geographic population 1934 boundary audit failed.');
if(registry.version!==1||registry.entries?.length!==2||registry.entries[0]?.packageId!=='uk.population.mid-2024.v2'||registry.entries[0]?.releaseStatus!=='compatibility'||registry.entries[0]?.fingerprint!==v2.fingerprint||registry.entries[1]?.packageId!==pkg.id||registry.entries[1]?.releaseStatus!=='production'||registry.entries[1]?.fingerprint!==pkg.fingerprint)throw Error('UK population content registry failed.');
if(v2.id!=='uk.population.mid-2024.v2'||v2.fingerprint!=='fnv1a64-v1:a43f874fe1fab27f'||geography.partitionId!==pkg.geographyPartitionId||geography.fingerprint!==pkg.geographyPartitionFingerprint||local.areas?.length!==361)throw Error('UK geographic population lineage failed.');
const areaIds=new Set(local.areas.map(area=>area.areaId)),actualYears=new Map(),v2Years=new Map(v2.measures.filter(measure=>measure.dimensions?.kind==='birth-year').map(measure=>[measure.dimensions.birthYear,Number(measure.value)]));
let total=0,previous='';for(const cohort of pkg.cohorts){if(cohort.id<=previous||!Number.isSafeInteger(cohort.count)||cohort.count<=0||!areaIds.has(cohort.areaId)||cohort.generationProfileId!=='human.uk.pending-mid-2024-v1')throw Error('Candidate cohort ordering/count/profile invalid.');previous=cohort.id;total+=cohort.count;actualYears.set(cohort.birthYear,(actualYears.get(cohort.birthYear)??0)+cohort.count);}
if(total!==69_281_437)throw Error('Candidate population does not conserve the UK total.');
if(actualYears.size!==119||[...v2Years].some(([year,count])=>actualYears.get(year)!==count))throw Error('Candidate birth-year margins differ from frozen v2.');
console.log(`Verified frozen UK geographic population v3: ${pkg.cohorts.length} cohorts, ${total} people; content registration leaves scenario and New Game routing independent.`);

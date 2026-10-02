/** Research only: exact one-file population join. No policy, runtime registration or simulation mutation. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(path.join(root,'package.json'));
const {unzipSync}=require('fflate');
const json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const bytes=p=>fs.readFileSync(path.join(root,p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const compare=(a,b)=>a<b?-1:a>b?1:0;
const assert=(condition,message)=>{if(!condition)throw Error('Research compatibility check stopped: '+message);};
const safe=n=>{assert(n>=0n&&n<=BigInt(Number.MAX_SAFE_INTEGER),'unsafe aggregate');return Number(n);};
const total=rows=>safe(rows.reduce((n,r)=>n+BigInt(r.population),0n));
const fraction=(n,d)=>{const gcd=(a,b)=>b?gcd(b,a%b):a;const g=gcd(n,d);return {numerator:n/g,denominator:d/g};};
const utf8=b=>new TextDecoder('utf-8',{fatal:true}).decode(b);
function csv(text){
 const rows=[];let row=[],field='',quoted=false,closed=false;
 for(let index=0;index<text.length;index++){
  const c=text[index];
  if(quoted){if(c==='"'){if(text[index+1]==='"'){field+='"';index++;}else{quoted=false;closed=true;}}else field+=c;continue;}
  if(c==='"'){assert(field===''&&!closed,'misplaced CSV quote');quoted=true;continue;}
  if(c===','||c==='\r'||c==='\n'){row.push(field);field='';closed=false;if(c!==','){if(c==='\r'&&text[index+1]==='\n')index++;rows.push(row);row=[];}continue;}
  assert(!closed,'text after CSV closing quote');field+=c;
 }
 assert(!quoted,'unterminated CSV quote');if(field!==''||row.length){row.push(field);rows.push(row);}
 assert(rows.length>1,'empty CSV');const headers=rows.shift();assert(new Set(headers).size===headers.length,'duplicate CSV header');
 return {headers,records:rows.map((r,index)=>{assert(r.length===headers.length,'CSV column count at row '+(index+2));return Object.fromEntries(headers.map((h,i)=>[h,r[i]]));})};
}
const populationPath='research/scotland-residence-2022/artifacts/outputarea2022_usualresidentpopulation.csv';
const populationBytes=bytes(populationPath),populationSha=sha(populationBytes);
assert(populationSha==='f7af756710c56f335d9332c08f95a68a5775aec4f25f17b21ab979257ed40148','population artifact SHA-256 changed');
assert(populationBytes.length===678338,'population artifact size changed');
const population=csv(utf8(populationBytes));
assert(JSON.stringify(population.headers)===JSON.stringify(['OutputArea2022','UsualResidentPopulation']),'population schema changed');
const populationRows=population.records.map(r=>{
 assert(/^S\d{8}$/.test(r.OutputArea2022),'missing/malformed population OA code');
 assert(/^(0|[1-9]\d*)$/.test(r.UsualResidentPopulation),'missing/noninteger/negative population');
 return {oaCode:r.OutputArea2022,population:safe(BigInt(r.UsualResidentPopulation))};
});
const populationMap=new Map(populationRows.map(r=>[r.oaCode,r]));
assert(populationMap.size===populationRows.length,'duplicate population OA');
const indexPath='src/data/geography/uk/settlements-2024/artifacts/census_2022_index.zip';
const indexBytes=bytes(indexPath);assert(sha(indexBytes)==='0e4096a321cba2318dc5d2e35c197bf815ac333aebdf4cb0ddce82112b57a261','index artifact changed');
const archive=unzipSync(indexBytes);
const oaMember='Census_2022_Index/OA_TO_HIGHER_AREAS.csv';
const localityMember='Census_2022_Index/Higher_Geographies_LookUps/Census Locality 2022 Lookup.csv';
const councilMember='Census_2022_Index/Higher_Geographies_LookUps/Council Area 2019 Lookup.csv';
assert([oaMember,localityMember,councilMember].every(m=>archive[m]),'missing pinned index member');
const index=csv(utf8(archive[oaMember]));
assert(['OA2022','CA2019','CLOC2022','CSETT2022'].every(k=>index.headers.includes(k)),'index required fields missing');
const indexMap=new Map(index.records.map(row=>[row.OA2022,row]));
assert(indexMap.size===index.records.length,'duplicate index OA code');
for(const row of index.records){assert(/^S\d{8}$/.test(row.OA2022),'malformed index OA');assert(/^S120\d{5}$/.test(row.CA2019),'missing/malformed council');assert(row.CLOC2022===''||/^S520\d{5}$/.test(row.CLOC2022),'unknown locality sentinel');}
// The frozen Settlement adapter explicitly decodes this name lookup as Windows-1252.
const locality=csv(new TextDecoder('windows-1252').decode(archive[localityMember]));
const council=csv(utf8(archive[councilMember]));
assert(JSON.stringify(locality.headers)===JSON.stringify(['CensusLocality2022Code','CensusLocality2022Name']),'locality lookup schema');
assert(JSON.stringify(council.headers)===JSON.stringify(['CouncilArea2019Code','CouncilArea2019Name']),'council lookup schema');
const localityMap=new Map(locality.records.map(v=>[v.CensusLocality2022Code,v]));
const councilMap=new Map(council.records.map(v=>[v.CouncilArea2019Code,v]));
assert(localityMap.size===656&&locality.records.length===656,'locality count/duplicates');assert(councilMap.size===32&&council.records.length===32,'council count/duplicates');
const unmatchedPopulation=populationRows.filter(r=>!indexMap.has(r.oaCode)).sort((a,b)=>compare(a.oaCode,b.oaCode));
const unmatchedIndex=index.records.filter(r=>!populationMap.has(r.OA2022)).map(r=>r.OA2022).sort(compare);
assert(unmatchedPopulation.length===0&&unmatchedIndex.length===0,'OA code sets differ');
const pkgPath='src/data/geography/uk/settlements-hybrid-2024-v2/compiled-settlements-candidate.json';
assert(sha(bytes(pkgPath))==='34aa659dc4ed927b70f78834c6638e58ae787ead38a9e9e68fe28886b0c359db','production Settlement artifact changed');
const pkg=json(pkgPath),localitySettlements=pkg.settlements.filter(s=>s.kindId==='settlement.uk.nrs.census-locality');
const bySettlement=new Map(localitySettlements.map(s=>[s.settlementId,s]));
const continuity=json('src/data/geography/uk/settlements-hybrid-2024-v2/continuity-ledger.json');
const continued=new Set(continuity.entries.filter(e=>e.status==='continued').map(e=>e.settlementId));
const identities=json('src/data/geography/uk/settlements-hybrid-2024-v2/settlement-identities.json');
const identityById=new Map(identities.identities.map(v=>[v.settlementId,v]));
const placeContinuity=json('src/data/geography/uk/primary-local-admin-2024/continuity-ledger.json');
const councilPlaceByCode=new Map(placeContinuity.entries.filter(e=>e.sourceCode.startsWith('S120')).map(e=>[e.sourceCode,e.placeId]));
const places=json('src/data/geography/uk/primary-local-admin-2024/place-identities.json');
const placeById=new Map(places.places.map(p=>[p.placeId,p]));
const partition=json('src/data/geography/uk/primary-local-admin-2024/compiled-partition.json');
const nodesByPlace=new Map(partition.nodes.map(n=>[n.placeId,n]));
const areaIndex=json('src/data/geography/uk/primary-local-admin-2024/population-area-index.json');
const officialCouncils=new Set(areaIndex.records.filter(a=>a.countryCode==='S').map(a=>a.officialCode));
const inventory=json('UK-INITIAL-RESIDENCE-PLACEMENT-INVENTORY.json');
const displayByPlace=new Map(inventory.areas.map(a=>[a.placeId,a.displayName]));
const relationKey=(settlementId,placeId)=>JSON.stringify([settlementId,placeId]);
const relations=new Map(pkg.administrativeRelations.filter(v=>v.settlementId.startsWith('settlement.uk.nrs-locality.')).map(v=>[relationKey(v.settlementId,v.placeId),v]));
const settlementMappings=[...localityMap].sort(([a],[b])=>compare(a,b)).map(([code,row])=>{
 const id='settlement.uk.nrs-locality.'+code.toLowerCase(),s=bySettlement.get(id);
 assert(s&&identityById.get(id)?.countryId==='uk'&&continued.has(id),'unmapped/noncontinuing production Locality '+code);
 assert(s.sourceIds.includes('geography.source.nrs.census-localities-2022-v1'),'Locality source binding');
 return {localityCode:code,settlementId:id,sourceDisplayName:row.CensusLocality2022Name,productionDisplayName:s.names.find(n=>n.role==='display').text,sourceIdentityBasis:'Exact frozen builder rule settlement.uk.nrs-locality.<lowercase CensusLocality2022Code>, retained by v1-to-v2 continuity ledger. Display names are diagnostic only.'};
});
assert(localitySettlements.length===656&&new Set(settlementMappings.map(m=>m.settlementId)).size===656,'production Locality count/duplicate mappings');
const councils=[...councilMap].sort(([a],[b])=>compare(a,b)).map(([code,row])=>{
 const placeId=councilPlaceByCode.get(code);assert(placeId&&placeById.get(placeId)?.countryId==='uk'&&officialCouncils.has(code)&&displayByPlace.has(placeId)&&nodesByPlace.get(placeId)?.populationAllocationCell===true,'unmapped/nonallocation council '+code);
 return {councilCode:code,placeId,displayName:displayByPlace.get(placeId),sourceDisplayName:row.CouncilArea2019Name,population:0,oaCount:0,insideLocalityPopulation:0,insideLocalityOaCount:0,outsideLocalityPopulation:0,outsideLocalityOaCount:0,fragments:[]};
});
assert(councils.length===32&&new Set(councils.map(c=>c.placeId)).size===32,'council mapping count');
const councilsByCode=new Map(councils.map(c=>[c.councilCode,c]));
function aggregate(rows,indexLookup=indexMap){
 const fragments=new Map(),councilAggregates=new Map(councils.map(c=>[c.councilCode,{population:0n,oaCount:0,inside:0n,insideCount:0,outside:0n,outsideCount:0}]));
 for(const p of rows){const i=indexLookup.get(p.oaCode),ca=councilAggregates.get(i.CA2019);assert(ca,'unknown index council');const count=BigInt(p.population);ca.population+=count;ca.oaCount++;
  if(i.CLOC2022===''){ca.outside+=count;ca.outsideCount++;continue;}
  assert(localityMap.has(i.CLOC2022),'index locality absent from lookup');ca.inside+=count;ca.insideCount++;
  const settlementId='settlement.uk.nrs-locality.'+i.CLOC2022.toLowerCase(),placeId=councilPlaceByCode.get(i.CA2019),key=relationKey(settlementId,placeId),rel=relations.get(key);
  assert(rel&&rel.partitionId==='geography.uk.primary-local-admin-2024-06-30-v1'&&(rel.relation==='contained-by'||rel.relation==='intersects'),'unresolved qualified locality relation '+key);
  const f=fragments.get(key)||{councilCode:i.CA2019,placeId,localityCode:i.CLOC2022,settlementId,population:0n,oaCount:0,relation:rel.relation};f.population+=count;f.oaCount++;fragments.set(key,f);
 }
 const result={councils:[...councilAggregates].sort(([a],[b])=>compare(a,b)).map(([code,c])=>({code,population:safe(c.population),oaCount:c.oaCount,inside:safe(c.inside),insideCount:c.insideCount,outside:safe(c.outside),outsideCount:c.outsideCount})),fragments:[...fragments.values()].sort((a,b)=>compare(a.placeId,b.placeId)||compare(a.settlementId,b.settlementId)).map(f=>({...f,population:safe(f.population)}))};return result;
}
const aggregation=aggregate(populationRows),reversed=aggregate([...populationRows].reverse(),new Map([...index.records].reverse().map(i=>[i.OA2022,i])));
assert(JSON.stringify(aggregation)===JSON.stringify(reversed),'aggregation depends on population row order');
assert(aggregation.fragments.length===relations.size&&aggregation.fragments.every(f=>relations.has(relationKey(f.settlementId,f.placeId))),'qualified relation inventory mismatch');
for(const c of councils){const stats=aggregation.councils.find(x=>x.code===c.councilCode);Object.assign(c,{population:stats.population,oaCount:stats.oaCount,insideLocalityPopulation:stats.inside,insideLocalityOaCount:stats.insideCount,outsideLocalityPopulation:stats.outside,outsideLocalityOaCount:stats.outsideCount,fragments:aggregation.fragments.filter(f=>f.councilCode===c.councilCode)});c.outsideLocalityShare=fraction(c.outsideLocalityPopulation,c.population);assert(c.insideLocalityPopulation+c.outsideLocalityPopulation===c.population&&total(c.fragments)===c.insideLocalityPopulation,'council conservation');}
const localities=settlementMappings.map(m=>{const f=aggregation.fragments.filter(f=>f.localityCode===m.localityCode);return {...m,population:total(f),councilFragments:f};});
const crossBoundary=localities.filter(l=>l.councilFragments.length>1);
for(const l of crossBoundary)assert(total(l.councilFragments)===l.population,'cross-boundary conservation');
const officialTableTotal=total(populationRows),inside=total(aggregation.fragments),outside=safe(councils.reduce((n,c)=>n+BigInt(c.outsideLocalityPopulation),0n));
assert(total(councils)===officialTableTotal&&inside+outside===officialTableTotal&&total(localities)===inside,'Scotland-wide conservation');
const numbers=localities.map(l=>l.population).sort((a,b)=>a-b),fragNumbers=aggregation.fragments.map(f=>f.population).sort((a,b)=>a-b);
const median=ns=>ns.length%2?{numerator:ns[(ns.length-1)/2],denominator:1}:fraction(ns[ns.length/2-1]+ns[ns.length/2],2);
const cityIds={glasgow:'S52000280',edinburgh:'S52000233',aberdeen:'S52000002',dundee:'S52000210'};
const cityCouncils={glasgow:'S12000049',edinburgh:'S12000036',aberdeen:'S12000033',dundee:'S12000042'};
const cities=Object.entries(cityIds).map(([key,code])=>{const c=councilsByCode.get(cityCouncils[key]),l=localities.find(l=>l.localityCode===code),f=c.fragments.find(f=>f.localityCode===code);return {key,council:c,majorLocality:{localityCode:code,settlementId:l.settlementId,populationInCouncil:f.population,wholeMatchedLocalityPopulation:l.population,shareOfCouncil:fraction(f.population,c.population)},otherLocalityPopulation:c.insideLocalityPopulation-f.population,otherLocalityShare:fraction(c.insideLocalityPopulation-f.population,c.population)};});
const islands=['S12000023','S12000027','S12000013'].map(code=>councilsByCode.get(code));
const source={sourceId:'research.source.nrs.oa2022-usual-resident-population-may-2024-v1',artifactId:'research.artifact.nrs.oa2022-usual-resident-population-may-2024-v1',producer:'National Records of Scotland',title:'Output Area 2022 Total Population',releasePeriod:'2024-05',releaseDay:null,publicationPageDate:'2024-11-04',referenceDate:{year:2022,month:3,day:20},referenceDateBasis:'2022 Census reference day, established by the pinned Settlement source descriptor and official census metadata.',accessDate:'2026-10-02',filename:'outputarea2022_usualresidentpopulation.csv',path:populationPath,byteLength:populationBytes.length,sha256:'sha256:'+populationSha,officialLocator:'https://www.nrscotland.gov.uk/media/owpknvgk/outputarea2022_usualresidentpopulation.csv',publicationLocator:'https://www.nrscotland.gov.uk/publications/2022-census-geography-products/',licence:'Open Government Licence v3.0 per publication page; preserve NRS/Crown attribution. Index retains its existing NRS/applicable PAF notices.',unit:'published usual-resident persons per 2022 Output Area',classification:'official-census-statistical-evidence',precisionLimitations:['Published source integer cells; not individual residence truth or a 2024 locality estimate.','Totals below mean exact sums of this table; no separately published Scotland/council headline total was acquired or forced into reconciliation.','General census disclosure-control documentation does not by itself establish the treatment of each cell in this particular CSV.']};
const indexMetadata={path:indexPath,byteLength:indexBytes.length,sha256:'sha256:'+sha(indexBytes),sourceId:'geography.source.nrs.census-localities-2022-v1',artifactId:'artifact.nrs.census-geography-index-2022-v1',referenceDate:{year:2022,month:3,day:20},localityVintage:'Census Locality 2022',councilCodeVintage:'Council Area 2019 (CA2019), exactly matched to current frozen 2024 council Places through existing code continuity entries.',members:[oaMember,localityMember,councilMember].map(m=>({path:m,byteLength:archive[m].length,sha256:'sha256:'+sha(archive[m])})),columns:index.headers,localityNameEncoding:'Windows-1252 as in frozen builder; names never join keys.',missingLocalityRepresentation:'Empty string in CLOC2022; a genuine outside-locality category, not zero population.'};
const report={version:1,status:'RESEARCH-ONLY-NOT-PRODUCTION-CONTENT-NOT-REGISTERED',decision:'A-DIRECT-EVIDENCE-ROUTE-PASSES',source,index:indexMetadata,dependencies:{settlementPackageId:pkg.packageId,settlementFingerprint:pkg.fingerprint,settlementArtifactSha256:'sha256:'+sha(bytes(pkgPath)),geographyPartitionId:'geography.uk.primary-local-admin-2024-06-30-v1',geographyFingerprint:'fnv1a64-v1:3d1a3446a16c58cb',compatibleWorldDate:{year:2024,month:6,day:30}},populationTable:{columns:population.headers,oaCodeField:'OutputArea2022',populationField:'UsualResidentPopulation',rowCount:populationRows.length,uniqueOaCount:populationMap.size,duplicateOaCount:0,missingOaCodes:[],missingPopulation:[],minimumPopulation:Math.min(...populationRows.map(p=>p.population)),maximumPopulation:Math.max(...populationRows.map(p=>p.population)),totalPublishedOaPopulation:officialTableTotal,nonnegativeSafeIntegerCounts:true},join:{key:'Population.OutputArea2022 === Index.OA2022 (exact unchanged code equality)',populationRows:populationRows.length,indexRows:index.records.length,indexUniqueOaCount:indexMap.size,indexDuplicateOaCount:0,matchedRows:populationRows.length,unmatchedPopulationOas:unmatchedPopulation,unmatchedIndexOas:unmatchedIndex,matchedPopulation:officialTableTotal,unmatchedPopulation:0,matchedPopulationShare:{numerator:1,denominator:1}},coverage:{insideLocalityOaCount:councils.reduce((n,c)=>n+c.insideLocalityOaCount,0),outsideLocalityOaCount:councils.reduce((n,c)=>n+c.outsideLocalityOaCount,0),insideLocalityPopulation:inside,outsideLocalityPopulation:outside,outsideLocalityShare:fraction(outside,officialTableTotal)},mapping:{productionLocalities:656,exactProductionLocalityMatches:settlementMappings.length,unmatchedLocalities:[],duplicateMappings:[],ambiguousMappings:[],councilCount:32,exactCouncilMatches:32,councilMappingFailures:[],qualifiedLocalityFragments:aggregation.fragments.length,relationMappingFailures:[]},councils,localities,crossBoundaryLocalities:crossBoundary,zeros:{outputAreas:populationRows.filter(p=>p.population===0),localityFragments:aggregation.fragments.filter(f=>f.population===0),productionLocalities:localities.filter(l=>l.population===0).map(l=>l.settlementId),councilsWithZeroOutsideResidual:councils.filter(c=>c.outsideLocalityPopulation===0).map(c=>c.placeId)},distribution:{wholeLocalityPopulation:{minimum:numbers[0],median:median(numbers),maximum:numbers.at(-1)},qualifiedFragmentPopulation:{minimum:fragNumbers[0],median:median(fragNumbers),maximum:fragNumbers.at(-1)}},stressCases:{cities,islands},conservation:{everyOutputAreaCountedExactlyOnce:true,everyCouncilLocalityPlusOutsideEqualsTotal:true,sumCouncilsEqualsMatchedPopulation:true,sumLocalitiesEqualsInsidePopulation:true,everyCrossBoundaryFragmentSumEqualsLocalityTotal:true,tableTotal:officialTableTotal,councilTotal:total(councils),localityPlusOutsideTotal:inside+outside,unexplainedLoss:0,unexplainedDuplication:0},compatibility:{allPositiveFragmentsResolveFrozenRelations:true,councilCandidateTotalsSafeIntegers:true,exactSourceCountsTechnicallyFitPositiveIntegerMass:true,positiveOutsideResidualFitsAdministrativeCandidate:true,noPolicyMaterialized:true,noNumericalApproval:true,noAdditionalPopulationSeries:true,noNewCrosswalk:true,noGeometry:true,sourceRowPermutationEqual:true},provenanceRecommendation:'A future reviewed selection prior may derive relative placement mass from Council × Census Locality 2022 aggregates and outside-locality residuals. These are 2022 published census cells used in mid-2024-compatible authored initialization, not 2024 Settlement population, new Population authority, or evidence of a particular Person home.'};
const serialized=JSON.stringify(report,null,2)+'\n';
const destination=path.join(root,'UK-SCOTLAND-RESIDENCE-PLACEMENT-EVIDENCE-CHECK.json');
if(process.argv.includes('--verify'))assert(fs.readFileSync(destination,'utf8')===serialized,'research report rebuild differs');else fs.writeFileSync(destination,serialized);
console.log(JSON.stringify({decision:report.decision,sourceSha256:populationSha,rows:populationRows.length,total:officialTableTotal,inside,outside,insideOas:report.coverage.insideLocalityOaCount,outsideOas:report.coverage.outsideLocalityOaCount,localities:656,fragments:aggregation.fragments.length,councils:32,crossBoundary:crossBoundary.map(l=>({name:l.productionDisplayName,code:l.localityCode,population:l.population,pieces:l.councilFragments})),zeros:report.zeros,distribution:report.distribution,reportSha256:sha(Buffer.from(serialized)),reportBytes:Buffer.byteLength(serialized)},null,2));

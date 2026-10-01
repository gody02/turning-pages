import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url),v1Folder=new URL('../src/data/geography/uk/settlements-hybrid-2024/',import.meta.url),v2Folder=new URL('../src/data/geography/uk/settlements-hybrid-2024-v2/',import.meta.url);
const readJson=(folder,name)=>JSON.parse(readFileSync(new URL(name,folder),'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const codePointCompare=(left,right)=>left<right?-1:left>right?1:0;
const canonicalStringify=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>codePointCompare(a,b))):item);
const fnv1a64=value=>{let hash=0xcbf29ce484222325n;for(const byte of new TextEncoder().encode(value)){hash^=BigInt(byte);hash=BigInt.asUintN(64,hash*0x100000001b3n);}return `fnv1a64-v1:${hash.toString(16).padStart(16,'0')}`;};
const packageFingerprint=pkg=>{const semantic={...pkg};delete semantic.packageId;delete semantic.fingerprint;return fnv1a64(canonicalStringify(semantic));};
const identityFingerprint=settlementId=>fnv1a64(canonicalStringify({version:1,settlementId,countryId:'uk'}));
const fail=message=>{throw Error(`UK hybrid Settlement integrity failure: ${message}`);};

function verifyV1(){
 const pkg=readJson(v1Folder,'compiled-settlements-candidate.json'),manifest=readJson(v1Folder,'package-manifest.json'),report=readJson(v1Folder,'build-report.json'),packageBytes=readFileSync(new URL('compiled-settlements-candidate.json',v1Folder));
 if(pkg.packageId!=='settlements.uk.hybrid-2024-06-30-v1'||pkg.fingerprint!=='fnv1a64-v1:4f25e4c5d0b241a1'||packageFingerprint(pkg)!==pkg.fingerprint)fail('v1 package identity/fingerprint');
 if(packageBytes.byteLength!==3142028||digest(packageBytes)!=='642fbaae0a02df66b29b718f1539eafade387f50fe39bc4d19ef3e22ec415db5'||manifest.artifact.sha256!==digest(packageBytes))fail('immutable v1 bytes');
 if(manifest.status!=='candidate-awaiting-final-freeze-review'||manifest.settlementCount!==2739||manifest.realCount!==712||manifest.syntheticCount!==2027||manifest.relationCount!==2777||report.zeroSettlementAdministrativeAreas.length!==0)fail('v1 historical inventory');
 return {pkg,manifest};
}

const loadV2Snapshot=()=>({
 pkg:readJson(v2Folder,'compiled-settlements-candidate.json'),
 manifest:readJson(v2Folder,'package-manifest.json'),
 report:readJson(v2Folder,'build-report.json'),
 identities:readJson(v2Folder,'settlement-identities.json'),
 identityManifest:readJson(v2Folder,'settlement-identity-manifest.json'),
 continuity:readJson(v2Folder,'continuity-ledger.json'),
});

function verifyV2(v1,snapshot=loadV2Snapshot()){
 const {pkg,manifest,report,identities,identityManifest,continuity}=snapshot;
 const packageBytes=readFileSync(new URL('compiled-settlements-candidate.json',v2Folder)),geography=readJson(new URL('../src/data/geography/uk/primary-local-admin-2024/',import.meta.url),'compiled-partition.json');
 if(pkg.packageId!=='settlements.uk.hybrid-2024-06-30-v2'||pkg.fingerprint!=='fnv1a64-v1:2ddc7643a1e7e4b8'||packageFingerprint(pkg)!==pkg.fingerprint)fail('v2 package identity/fingerprint');
 if(packageBytes.byteLength!==3269891||digest(packageBytes)!=='34aa659dc4ed927b70f78834c6638e58ae787ead38a9e9e68fe28886b0c359db'||manifest.artifact.byteLength!==packageBytes.byteLength||manifest.artifact.sha256!==digest(packageBytes))fail('v2 materialized bytes');
 if(manifest.status!=='frozen-production'||manifest.settlementCount!==2698||manifest.realCount!==712||manifest.syntheticCount!==1986||manifest.relationCount!==2736)fail('v2 manifest inventory');
 const expectedCountries={england:{real:35,synthetic:1744,total:1779},'northern-ireland':{real:11,synthetic:86,total:97},scotland:{real:656,synthetic:0,total:656},wales:{real:10,synthetic:156,total:166}};
 if(canonicalStringify(manifest.countryBreakdown)!==canonicalStringify(expectedCountries)||canonicalStringify(report.constituentCountryInventory)!==canonicalStringify(expectedCountries))fail('v2 country inventory');
 const expectedProvenance={authoredGameplayAbstractions:1986,officialNrsLocalities:656,reviewedRealAnchors:56};
 if(canonicalStringify(manifest.provenanceBreakdown)!==canonicalStringify(expectedProvenance)||canonicalStringify(report.provenanceInventory)!==canonicalStringify(expectedProvenance))fail('v2 provenance inventory');
 if(canonicalStringify(manifest.relationBreakdown)!==canonicalStringify({containedBy:2691,intersects:45,multiRelationSettlements:7,total:2736})||report.relationInventory.total!==2736)fail('v2 relation inventory');
 const sourceIds=pkg.sources.map(item=>item.id),dependencyIds=manifest.sourceDependencies.map(item=>item.sourceId);
 if(canonicalStringify(sourceIds)!==canonicalStringify(dependencyIds)||!sourceIds.includes('geography.source.turning-pages.synthetic-uk-settlements-2024-v2'))fail('v2 source dependencies');
 const sourceIdSet=new Set(sourceIds),decisionIds=new Set(pkg.decisions.map(item=>item.id)),settlementIds=new Set(pkg.settlements.map(item=>item.settlementId)),placeIds=new Set(geography.nodes.map(item=>item.placeId));
 if(settlementIds.size!==pkg.settlements.length||pkg.settlements.length!==manifest.settlementCount||pkg.administrativeRelations.length!==manifest.relationCount)fail('v2 duplicate or count mismatch');
 for(const settlement of pkg.settlements){if(!settlement.sourceIds.every(id=>sourceIdSet.has(id))||!settlement.decisionIds.every(id=>decisionIds.has(id))||!settlement.decisionIds.includes('settlement-decision.uk.hybrid.v1-to-v2-continuity-v1'))fail(`v2 settlement references: ${settlement.settlementId}`);for(const name of settlement.names)if(name.text!==name.text.normalize('NFC')||name.text.trim()!==name.text||name.sourceIds.some(id=>!sourceIdSet.has(id))||name.text.includes('Cefnnant'))fail(`v2 malformed name: ${settlement.settlementId}`);}
 for(const relation of pkg.administrativeRelations)if(!settlementIds.has(relation.settlementId)||relation.partitionId!=='geography.uk.primary-local-admin-2024-06-30-v1'||!placeIds.has(relation.placeId)||relation.sourceIds.some(id=>!sourceIdSet.has(id))||relation.decisionIds.some(id=>!decisionIds.has(id)))fail(`v2 relation: ${relation.settlementId}`);
 const synthetic=pkg.settlements.filter(item=>item.settlementId.startsWith('settlement.uk.synthetic.')),real=pkg.settlements.filter(item=>!item.settlementId.startsWith('settlement.uk.synthetic.')),syntheticSource='geography.source.turning-pages.synthetic-uk-settlements-2024-v2';
 if(synthetic.length!==1986||real.length!==712||synthetic.some(item=>item.sourceIds.length!==1||item.sourceIds[0]!==syntheticSource)||real.some(item=>item.sourceIds.includes(syntheticSource)))fail('v2 real/synthetic provenance');
 if(identities.identities.length!==2739||identityManifest.entries.length!==2739||new Set(identities.identities.map(item=>item.settlementId)).size!==2739)fail('v2 historical identity inventory');
 const identityById=new Map(identities.identities.map(item=>[item.settlementId,item])),identityFingerprintById=new Map(identityManifest.entries.map(item=>[item.settlementId,item.fingerprint]));
 for(const [settlementId,identity] of identityById)if(identity.countryId!=='uk'||identityFingerprintById.get(settlementId)!==identityFingerprint(settlementId))fail(`v2 identity manifest: ${settlementId}`);
 const continuitySemantic={version:continuity.version,fromPackageId:continuity.fromPackageId,toPackageId:continuity.toPackageId,entries:continuity.entries};
 if(continuity.fingerprint!=='fnv1a64-v1:6645f23c6de7bb1b'||fnv1a64(canonicalStringify(continuitySemantic))!==continuity.fingerprint||continuity.entries.length!==2739||continuity.entries.filter(item=>item.status==='continued').length!==2698||continuity.entries.filter(item=>item.status==='historical-only').length!==41)fail('v2 continuity ledger');
 if(continuity.entries.filter(item=>item.status==='continued').some(item=>!settlementIds.has(item.settlementId))||continuity.entries.filter(item=>item.status==='historical-only').some(item=>settlementIds.has(item.settlementId)))fail('v2 continuity presence');
 if(!v1.pkg.settlements.every(item=>identityById.has(item.settlementId))||pkg.settlements.some(item=>!v1.pkg.settlements.some(previous=>previous.settlementId===item.settlementId)))fail('v1/v2 identity continuity');
 if(report.zeroSettlementAdministrativeAreas.length!==0||report.administrativeDistribution.length!==361||report.namingDiagnostics.malformedNameCount!==0||report.namingDiagnostics.correctedWelshCefnCount!==8||report.canonicalArtifact.sha256!==manifest.artifact.sha256||report.packageFingerprint!==pkg.fingerprint)fail('v2 build report');
 if(manifest.partitionId!=='geography.uk.primary-local-admin-2024-06-30-v1'||manifest.dependencies.geographyPartitionId!==manifest.partitionId||manifest.dependencies.previousPackageId!==v1.pkg.packageId||manifest.dependencies.previousPackageFingerprint!==v1.pkg.fingerprint||manifest.dependencies.settlementFoundationVersion!==1||manifest.dependencies.settlementPackageSchemaVersion!==1||manifest.continuity.fingerprint!==continuity.fingerprint)fail('v2 manifest dependencies');
 return {pkg,manifest};
}

const nrsBytes=readFileSync(new URL('../src/data/geography/uk/settlements-2024/artifacts/census_2022_index.zip',import.meta.url));
if(nrsBytes.byteLength!==2922015||digest(nrsBytes)!=='0e4096a321cba2318dc5d2e35c197bf815ac333aebdf4cb0ddce82112b57a261')fail('NRS source bytes');
const v1=verifyV1(),snapshot=loadV2Snapshot(),v2=verifyV2(v1,snapshot);
const productionManifest=readJson(new URL('../src/data/geography/uk/',import.meta.url),'settlement-content-manifest.json');
if(productionManifest.version!==1||productionManifest.entries.length!==1||productionManifest.entries[0].packageId!==v2.pkg.packageId||productionManifest.entries[0].fingerprint!==v2.pkg.fingerprint||productionManifest.entries[0].releaseStatus!=='production'||productionManifest.entries.some(item=>item.packageId===v1.pkg.packageId)||productionManifest.historicalIdentitySources.length!==1||productionManifest.historicalIdentitySources[0].packageId!==v1.pkg.packageId||productionManifest.historicalIdentitySources[0].releaseStatus!=='unregistered-historical-freeze-failed'||productionManifest.historicalIdentitySources[0].identityCount!==2739||productionManifest.historicalIdentitySources[0].historicalOnly!==41)fail('production registration manifest');
const corruptions=[
 ['package ID',value=>{value.pkg.packageId='settlements.uk.hybrid-2024-06-30-corrupt';}],
 ['fingerprint',value=>{value.pkg.fingerprint='fnv1a64-v1:0000000000000000';}],
 ['SHA-256',value=>{value.manifest.artifact.sha256='0'.repeat(64);}],
 ['counts',value=>{value.manifest.settlementCount+=1;}],
 ['source dependency',value=>{value.manifest.sourceDependencies[0].sourceId='geography.source.corrupt';}],
 ['continuity reference',value=>{value.continuity.entries[0].decisionId='settlement-decision.corrupt';}],
 ['Place reference',value=>{value.pkg.administrativeRelations[0].placeId='place.uk.local-admin.corrupt';}],
 ['Settlement name',value=>{value.pkg.settlements[0].names[0].text+=' corrupt';}],
 ['manifest value',value=>{value.manifest.partitionId='geography.uk.corrupt';}],
];
for(const [label,mutate] of corruptions){
 const corrupt=structuredClone(snapshot);mutate(corrupt);
 let rejected=false;try{verifyV2(v1,corrupt);}catch{rejected=true;}
 if(!rejected)fail(`corruption self-test was accepted: ${label}`);
}
console.log(JSON.stringify({gate:'uk-hybrid-settlements',corruptionChecks:corruptions.length,productionRegistered:true,v1:{status:'unregistered-historical-freeze-failed',packageId:v1.pkg.packageId,fingerprint:v1.pkg.fingerprint,artifactSha256:v1.manifest.artifact.sha256},v2:{status:v2.manifest.status,packageId:v2.pkg.packageId,fingerprint:v2.pkg.fingerprint,settlements:v2.pkg.settlements.length,real:v2.manifest.realCount,synthetic:v2.manifest.syntheticCount,relations:v2.pkg.administrativeRelations.length,artifactSha256:v2.manifest.artifact.sha256,artifactPath:fileURLToPath(new URL('compiled-settlements-candidate.json',v2Folder))},root:fileURLToPath(root)}));

// UK-only build/integrity tooling. No application or simulation imports this file.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
export const ROOT=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
export const CONTENT=path.join(ROOT,'src/data/residence/uk/initial-mid-2024');
export const POLICY_ID='residence-placement.uk.mid-2024-v1';
export const FINGERPRINT='fnv1a64-v1:c0d2080b63263587';
export const APPROVAL_SHA='8e651fd6d7b8b7184604edf516e8097139d375de3f471d12920717e7c58dc734';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const assert=(ok,message)=>{if(!ok)throw Error('UK initial Residence content integrity failure: '+message);};
const encode=value=>JSON.stringify(value,null,2)+'\n';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sum=values=>{const n=values.reduce((s,v)=>s+BigInt(v),0n);assert(n<=BigInt(Number.MAX_SAFE_INTEGER),'unsafe sum');return Number(n);};
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
export async function buildApi(){
 const require=createRequire(path.join(ROOT,'package.json')),esbuild=createRequire(require.resolve('vite'))('esbuild');
 const result=await esbuild.build({stdin:{contents:`export * from './src/engine/residencePlacement/package'; export {createResidencePlacementRuntime} from './src/engine/residencePlacement/runtime'; export {createGeographyRuntime} from './src/engine/geography/runtime'; export {createSettlementRuntime} from './src/engine/geography/settlements/runtime'; export {createUkGeographyRegistry} from './src/data/geography/uk/primary-local-admin-2024/adapter'; export {createUkSettlementContentRegistry} from './src/data/geography/uk/settlementRegistry';`,resolveDir:ROOT,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
 const folder=fs.mkdtempSync(path.join(tmpdir(),'uk-initial-residence-'));
 try{const file=path.join(folder,'api.mjs');fs.writeFileSync(file,result.outputFiles[0].text);return await import(pathToFileURL(file).href);}finally{fs.rmSync(folder,{recursive:true,force:true});}
}
export function loadApproval(){
 const file='UK-INITIAL-RESIDENCE-PLACEMENT-NUMERICAL-APPROVAL.json',bytes=fs.readFileSync(path.join(ROOT,file));
 assert(digest(bytes)===APPROVAL_SHA,'approved specification bytes');const a=JSON.parse(bytes);
 assert(a.version===1&&a.approvalDecision==='APPROVED-FOR-IMPLEMENTATION'&&a.policyId===POLICY_ID&&a.proposedCanonicalPolicy.fingerprint===FINGERPRINT,'approval identity');
 return a;
}
function verifySources(a){
 for(const item of [a.sourceManifest.source,a.sourceManifest.index,a.sourceManifest.researchResult]){
  const bytes=fs.readFileSync(path.join(ROOT,item.path||item.filename));assert(bytes.length===item.byteLength&&'sha256:'+digest(bytes)===item.sha256,'pinned source '+(item.path||item.filename));
 }
 const require=createRequire(path.join(ROOT,'package.json')),{unzipSync}=require('fflate'),index=unzipSync(fs.readFileSync(path.join(ROOT,a.sourceManifest.index.path)));
 for(const member of a.sourceManifest.index.members)assert(index[member.path]?.length===member.byteLength&&'sha256:'+digest(index[member.path])===member.sha256,'index member '+member.path);
 // Reuse the existing strict original-byte CSV/index join, without rewriting its report.
 execFileSync(process.execPath,['research/scotland-residence-2022/check-evidence.mjs','--verify'],{cwd:ROOT,stdio:'pipe'});
 // A prose/spec conflict is a stop condition, not permission to recompute different weights.
 execFileSync(process.execPath,['research/uk-residence-numerical-approval/render.mjs','--verify'],{cwd:ROOT,stdio:'pipe'});
}
export function compileApprovedPolicy(api,a,input){
 const {fingerprint:_fingerprint,...approvedInput}=a.proposedCanonicalPolicy;
 const policy=api.withResidencePlacementPolicyFingerprint(input||approvedInput);
 assert(policy.policyId===POLICY_ID&&policy.fingerprint===FINGERPRINT&&equal(policy,a.proposedCanonicalPolicy),'literal approved policy mismatch');
 assert(api.validateResidencePlacementPolicy(policy),'generic structural validation');return policy;
}
export async function generateArtifacts(){
 const a=loadApproval();verifySources(a);const api=await buildApi(),policy=compileApprovedPolicy(api,a);
 const {fingerprint:_fingerprint,...input}=policy;
 const reverse=compileApprovedPolicy(api,a,{...input,groups:[...input.groups].reverse().map(g=>({...g,candidates:[...g.candidates].reverse()}))});
 const shuffle=xs=>[...xs.filter((_,i)=>i%2).reverse(),...xs.filter((_,i)=>i%2===0).reverse()];
 const shuffled=compileApprovedPolicy(api,a,{...input,groups:shuffle(input.groups).map(g=>({...g,candidates:shuffle(g.candidates)}))});
 assert(encode(policy)===encode(reverse)&&encode(policy)===encode(shuffled),'reordered artifact bytes');
 const geography=api.createGeographyRuntime(api.createUkGeographyRegistry()),settlements=api.createSettlementRuntime(api.createUkSettlementContentRegistry(),geography),context={geography,settlements};
 assert(api.validateResidencePlacementContent(policy,context),'exact dependency/content references');
 const prepareStart=performance.now(),runtime=api.createResidencePlacementRuntime(policy,context),prepareMs=performance.now()-prepareStart;
 const rr=api.createResidencePlacementRuntime(reverse,context),sr=api.createResidencePlacementRuntime(shuffled,context);
 const cells=geography.partition(policy.dependencies.geographyPartitions[0].id).nodes.filter(n=>n.populationAllocationCell).map(n=>n.placeId).sort();
 assert(equal(cells,policy.groups.map(g=>g.scope.placeId).sort()),'361 exact allocation cells');
 assert(policy.groups.length===361&&policy.groups.reduce((n,g)=>n+g.candidates.length,0)===2768,'scope/candidate count');
 const areaById=new Map(a.areas.map(r=>[r.placeId,r])),samples=new Map(a.diagnostics.samples.map(r=>[r.placeId,r]));
 const witnesses=[],scopeAudit=[];const evaluationStart=performance.now();
 for(const g of policy.groups){
  const row=areaById.get(g.scope.placeId),sample=samples.get(g.scope.placeId);assert(row&&sample,'missing approved area diagnostics');
  assert(equal(g.candidates,row.candidates.map(c=>({location:c.location,weight:c.weight}))),'area mass/precision approval');
  // Rank equal masses by frozen canonical candidate position, never locale/display name.
  const ranked=[...g.candidates].sort((a,b)=>b.weight-a.weight||g.candidates.indexOf(a)-g.candidates.indexOf(b));
  for(const c of row.candidates){
   const cell=sample.cells.find(s=>s.settlementId===c.settlementId);assert(cell?.example&&cell.weight===c.weight,'approved witness');
   const request={version:1,policyId:POLICY_ID,personId:cell.example.personId,rootSeed:cell.example.rootSeed,scope:g.scope},d=runtime.evaluate(request);
   assert(equal(d.location,c.location),'destination witness changed');assert(equal(d,rr.evaluate(request))&&equal(d,sr.evaluate(request))&&equal(d,runtime.evaluate(request)),'decision/order/retry equality');
   witnesses.push({placeId:row.placeId,settlementId:c.settlementId,personId:request.personId,rootSeed:request.rootSeed,decisionSha256:digest(JSON.stringify(d))});
  }
  const classes={};for(const c of row.candidates)classes[c.provenanceClass]=(classes[c.provenanceClass]||0)+1;
  scopeAudit.push({placeId:row.placeId,displayName:row.displayName,constituentCountry:row.constituentCountry,candidateCount:g.candidates.length,totalMass:row.totalMass,largestCandidate:ranked[0].location,largestShare:row.largestShare,secondLargestShare:row.secondLargestShare,administrativeCandidates:g.candidates.filter(c=>c.location.kind==='administrative-area').length,principalRoles:row.principalRoles,provenanceClasses:Object.fromEntries(Object.entries(classes).sort(([a],[b])=>a<b?-1:a>b?1:0)),flags:row.flags});
 }
 const witnessMs=performance.now()-evaluationStart;
 const scottish=a.areas.filter(r=>r.constituentCountry==='scotland');
 assert(sum(scottish.map(r=>r.totalMass))===5440284&&sum(scottish.flatMap(r=>r.candidates.filter(c=>c.settlementId).map(c=>c.weight)))===4957121&&sum(scottish.flatMap(r=>r.candidates.filter(c=>!c.settlementId).map(c=>c.weight)))===483163,'Scottish totals');
 const evidence=read('UK-SCOTLAND-RESIDENCE-PLACEMENT-EVIDENCE-CHECK.json');
 const councilConservation=scottish.map(r=>{const source=evidence.councils.find(c=>c.placeId===r.placeId);assert(source&&sum(r.candidates.map(c=>c.weight))===source.population,'council conservation');return {placeId:r.placeId,localityMass:source.insideLocalityPopulation,outsideMass:source.outsideLocalityPopulation,totalMass:source.population,exact:true};});
 for(const l of a.crossBoundaryScottishLocalities){for(const f of l.councilFragments)assert(areaById.get(f.placeId).candidates.find(c=>c.settlementId===l.settlementId)?.weight===f.population,'cross-boundary fragment');assert(sum(l.councilFragments.map(f=>f.population))===l.population,'cross-boundary conservation');}
 const policyBytes=encode(policy),artifact={filename:'compiled-policy.json',byteLength:Buffer.byteLength(policyBytes),sha256:digest(policyBytes)};
 const purpose='base-world-initial-residence-placement';
 const contract={purpose,compatibleDate:a.effectiveCompatibilityDate,continuousReapplication:false,equilibriumTarget:false,migrationAttractor:false,populationController:false,lateMaterialization:'Only explicit orchestration proving an unevolved compatible base-world context may reuse this policy. Evolved-world materialization requires current simulated location/population state or a future evolution-aware mechanism.',createsResidence:false,changesGame:false};
 const sourceManifest={version:1,policyId:POLICY_ID,effectiveCompatibilityDate:a.effectiveCompatibilityDate,dependencies:a.dependencies,algorithmId:a.algorithmId,authoredMethodologyId:a.authoredMethodologyId,approvalSpecification:{id:'approval.uk.initial-residence-placement.numerical-v1',filename:'UK-INITIAL-RESIDENCE-PLACEMENT-NUMERICAL-APPROVAL.json',byteLength:7879242,sha256:APPROVAL_SHA},source:a.sourceManifest.source,index:a.sourceManifest.index,evidenceResult:a.sourceManifest.researchResult,authoredKindMass:a.kindMass,kindOverrideOnly:a.kindOverrideOnly,contract,limitations:a.limitations};
 const provenance={version:1,policyId:POLICY_ID,areas:a.areas,principalOverrides:a.principalOverrides,compactSingletons:a.compactSingletonInventory,administrativeCandidates:a.administrativeInventory,attribution:a.sourceManifest.attribution};
 const packageManifest={version:1,policyId:POLICY_ID,fingerprint:FINGERPRINT,status:'frozen-production',effectiveCompatibilityDate:a.effectiveCompatibilityDate,purpose,algorithmId:a.algorithmId,dependencies:a.dependencies,artifact,approvalSpecification:sourceManifest.approvalSpecification,sourceManifestSha256:digest(encode(sourceManifest)),provenanceSha256:digest(encode(provenance))};
 const report={version:1,status:'frozen-production',policyId:POLICY_ID,fingerprint:FINGERPRINT,artifact,summary:a.summary,kindMass:a.kindMass,principalOverrides:a.principalOverrides,administrativeInventory:a.administrativeInventory,scottishSourceEvidence:{outputAreas:46363,localities:656,councils:32,fragments:662,inside:4957121,outside:483163,total:5440284,councilConservation,crossBoundary:a.crossBoundaryScottishLocalities},scopeAudit,dominanceAudit:a.dominanceAudit,reachability:{witnessCount:witnesses.length,allCandidatesWitnessed:true,approvalDiagnosticSelections:1478656,method:'Re-evaluate one exact approved request per destination through frozen runtime; independently matched repeated/reversed/shuffled decisions.'},buildValidation:{strictStructure:true,exactContentReferences:true,exactApproval:true,sourceBytesAndJoin:true,canonicalOrdering:true,reversedShuffledBytesEqual:true,pinnedDecisionsEqual:true,repeatBuildDeterministic:true},contract};
 const outputs={'policy-input.json':encode(input),'compiled-policy.json':policyBytes,'policy-manifest.json':encode([{policyId:POLICY_ID,fingerprint:FINGERPRINT}]),'package-manifest.json':encode(packageManifest),'source-manifest.json':encode(sourceManifest),'provenance.json':encode(provenance),'build-report.json':encode(report),'witness-report.json':encode({version:1,policyId:POLICY_ID,fingerprint:FINGERPRINT,witnesses})};
 return {outputs,report,observations:{prepareMs,witness2768Ms:witnessMs}};
}
export async function runBuild(verify){
 const result=await generateArtifacts();for(const [name,bytes] of Object.entries(result.outputs)){const file=path.join(CONTENT,name);if(verify)assert(fs.readFileSync(file,'utf8')===bytes,'generated artifact mismatch: '+name);else fs.writeFileSync(file,bytes);}
 console.log(JSON.stringify({gate:'uk-initial-residence-placement',policyId:POLICY_ID,fingerprint:FINGERPRINT,artifact:result.report.artifact,scopeCount:361,candidateCount:2768,scottishMass:5440284,witnessed:2768,allSourcesVerified:true,sourceOrderEquality:true,observations:result.observations,files:Object.fromEntries(Object.entries(result.outputs).map(([name,b])=>[name,Buffer.byteLength(b)]))}));
 return result;
}

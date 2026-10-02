import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {createGeographyRuntime} from '../../../../engine/geography/runtime';
import {createSettlementRuntime} from '../../../../engine/geography/settlements/runtime';
import {createUkGeographyRegistry} from '../../../geography/uk/primary-local-admin-2024/adapter';
import {createUkSettlementContentRegistry} from '../../../geography/uk/settlementRegistry';
import {createResidencePlacementRuntime} from '../../../../engine/residencePlacement/runtime';
import {createResidencePlacementRegistry,validateResidencePlacementPolicy,withResidencePlacementPolicyFingerprint} from '../../../../engine/residencePlacement/package';
import type {ResidencePlacementPolicyV1} from '../../../../engine/residencePlacement/types';
import {createUkResidencePlacementContentRegistry,resolveUkResidencePlacementContent} from '../placementRegistry';
import {createUkInitialResidencePlacementRuntime,prepareUkInitialResidencePlacementPolicy,UK_INITIAL_RESIDENCE_PLACEMENT_ARTIFACT_BYTES,UK_INITIAL_RESIDENCE_PLACEMENT_ARTIFACT_SHA256,UK_INITIAL_RESIDENCE_PLACEMENT_COMPATIBILITY_DATE,UK_INITIAL_RESIDENCE_PLACEMENT_FINGERPRINT,UK_INITIAL_RESIDENCE_PLACEMENT_ID,validateUkInitialResidencePlacementPolicy,verifyUkInitialResidencePlacementArtifact} from './adapter';
import witnessReport from './witness-report.json';
import buildReport from './build-report.json';
import sourceManifest from './source-manifest.json';

const registry=createUkResidencePlacementContentRegistry(),policy=registry.policies[0];
const geography=createGeographyRuntime(createUkGeographyRegistry()),settlements=createSettlementRuntime(createUkSettlementContentRegistry(),geography),context={geography,settlements};
const runtime=createUkInitialResidencePlacementRuntime(context);
const approval=JSON.parse(readFileSync(new URL('../../../../../UK-INITIAL-RESIDENCE-PLACEMENT-NUMERICAL-APPROVAL.json',import.meta.url),'utf8'));
const approved=approval.proposedCanonicalPolicy as ResidencePlacementPolicyV1;
type Mutable<T>=T extends readonly (infer Item)[]?Mutable<Item>[]:T extends object?{-readonly [Key in keyof T]:Mutable<T[Key]>}:T;
const mutablePolicy=()=>structuredClone(policy) as Mutable<ResidencePlacementPolicyV1>;
const scope=(code:string)=>policy.groups.find(g=>g.scope.placeId===`place.uk.local-admin.${code}`)!;
const total=(code:string)=>scope(code).candidates.reduce((n,c)=>n+c.weight,0);
const weights=(code:string)=>Object.fromEntries(scope(code).candidates.map(c=>[c.location.kind==='settlement-area'?c.location.settlement.settlementId:'administrative-only',c.weight]));

describe('immutable UK initial Residence placement production content',()=>{
 it('registers only exact approved identity, fingerprint, date and pins',()=>{
  expect(registry.policies.map(p=>p.policyId)).toEqual(['residence-placement.uk.mid-2024-v1']);
  expect(registry.manifest).toEqual([{policyId:UK_INITIAL_RESIDENCE_PLACEMENT_ID,fingerprint:UK_INITIAL_RESIDENCE_PLACEMENT_FINGERPRINT}]);
  expect(UK_INITIAL_RESIDENCE_PLACEMENT_COMPATIBILITY_DATE).toEqual({year:2024,month:6,day:30});
  expect(buildReport.status).toBe('frozen-production');
  expect(policy.dependencies).toEqual(approved.dependencies);expect(policy.algorithmId).toBe('residence-placement.weighted-integer-v1');
  expect(resolveUkResidencePlacementContent(registry,UK_INITIAL_RESIDENCE_PLACEMENT_ID)).toEqual(policy);
  for(const id of ['latest','residence-placement.uk.mid-2024-v2'])expect(()=>resolveUkResidencePlacementContent(registry,id)).toThrow();
 });
 it('matches every literal approved mass, precision and reference across 361 / 2768',()=>{
  expect(policy).toEqual(approved);expect(policy.groups).toHaveLength(361);expect(policy.groups.flatMap(g=>g.candidates)).toHaveLength(2768);
  expect(validateResidencePlacementPolicy(policy)).toBe(true);
  expect(policy.groups.map(g=>g.scope.placeId).sort()).toEqual(geography.partition(policy.dependencies.geographyPartitions[0].id)!.nodes.filter(n=>n.populationAllocationCell).map(n=>n.placeId).sort());
  for(const g of policy.groups){expect(new Set(g.candidates.map(c=>JSON.stringify(c.location))).size).toBe(g.candidates.length);expect(g.candidates.every(c=>Number.isSafeInteger(c.weight)&&c.weight>0)).toBe(true);expect(Number.isSafeInteger(g.candidates.reduce((n,c)=>n+c.weight,0))).toBe(true);expect(g.candidates.every(c=>c.location.administrativeArea.placeId===g.scope.placeId)).toBe(true);}
 });
 it('preserves exact authored kinds, sixteen principal overrides and admin inventory',()=>{
  expect(buildReport.kindMass).toEqual({'settlement.uk.reviewed.city':16,'settlement.uk.reviewed.town':16,'settlement.uk.authored.town':16,'settlement.uk.authored.village':4,'settlement.uk.authored.hamlet':1});
  expect(Object.keys(buildReport.principalOverrides)).toHaveLength(16);expect(buildReport.principalOverrides).toEqual(approval.principalOverrides);
  expect(buildReport.administrativeInventory).toEqual(approval.administrativeInventory);expect(buildReport.administrativeInventory).toHaveLength(33);
  expect(buildReport.summary.countryOnlyCandidates).toBe(0);expect(buildReport.dominanceAudit).toEqual(approval.dominanceAudit);
 });
 it('preserves Bradford exact four principals and every residual',()=>{
  expect(weights('e08000032')).toMatchObject({'settlement.uk.reviewed.bradford':1476,'settlement.uk.reviewed.keighley':738,'settlement.uk.reviewed.shipley':369,'settlement.uk.reviewed.ilkley':369});expect(total('e08000032')).toBe(3936);
  const residual=scope('e08000032').candidates.filter(c=>c.location.kind==='settlement-area'&&c.location.settlement.settlementId.includes('.synthetic.'));expect(residual.map(c=>c.weight).sort((a,b)=>a-b)).toEqual([...Array(3).fill(8),...Array(10).fill(32),...Array(5).fill(128)]);
 });
 it('preserves Leeds and Swansea exact 75-percent budgets and positive residuals',()=>{
  expect(weights('e08000035')['settlement.uk.reviewed.leeds']).toBe(591);expect(total('e08000035')).toBe(788);expect(scope('e08000035').candidates).toHaveLength(33);
  expect(weights('w06000011')['settlement.uk.reviewed.swansea']).toBe(345);expect(total('w06000011')).toBe(460);expect(scope('w06000011').candidates).toHaveLength(14);
 });
 it('retains all 33 London intersects destinations including City of London',()=>{
  for(let i=1;i<=33;i++){const g=scope('e090000'+String(i).padStart(2,'0'));expect(g.candidates).toEqual([{location:{kind:'settlement-area',administrativeArea:g.scope,settlement:{version:1,packageId:'settlements.uk.hybrid-2024-06-30-v2',settlementId:'settlement.uk.reviewed.london'}},weight:1}]);expect(settlements.getSettlementAdministrativeRelations('settlements.uk.hybrid-2024-06-30-v2','settlement.uk.reviewed.london').find(r=>r.placeId===g.scope.placeId)?.relation).toBe('intersects');}
 });
 it('preserves Cardiff, Belfast and Scilly precision without invented residuals',()=>{
  expect(weights('w06000015')).toEqual({'settlement.uk.reviewed.cardiff':1});expect(weights('n09000003')).toEqual({'settlement.uk.reviewed.belfast':1});
  expect(weights('e06000053')).toEqual({'administrative-only':1});expect(scope('e06000053').candidates[0].location.kind).toBe('administrative-area');
 });
 it('conserves all Scottish census-derived council masses without reducing them',()=>{
  const groups=policy.groups.filter(g=>g.scope.placeId.includes('.s120'));const cs=groups.flatMap(g=>g.candidates);
  expect(groups).toHaveLength(32);expect(cs.filter(c=>c.location.kind==='settlement-area')).toHaveLength(662);expect(cs.filter(c=>c.location.kind==='administrative-area')).toHaveLength(32);expect(cs).toHaveLength(694);
  expect(cs.reduce((n,c)=>n+c.weight,0)).toBe(5440284);expect(cs.filter(c=>c.location.kind==='settlement-area').reduce((n,c)=>n+c.weight,0)).toBe(4957121);expect(cs.filter(c=>c.location.kind==='administrative-area').reduce((n,c)=>n+c.weight,0)).toBe(483163);
  expect(buildReport.scottishSourceEvidence).toMatchObject({outputAreas:46363,localities:656,councils:32,fragments:662});
  for(const c of buildReport.scottishSourceEvidence.councilConservation)expect(policy.groups.find(g=>g.scope.placeId===c.placeId)!.candidates.reduce((n,v)=>n+v.weight,0)).toBe(c.totalMass);
 });
 it('retains all six cross-boundary locality fragments and exact conservation',()=>{
  expect(buildReport.scottishSourceEvidence.crossBoundary).toHaveLength(6);
  for(const l of buildReport.scottishSourceEvidence.crossBoundary){let mass=0;for(const f of l.councilFragments){const value=weights(f.placeId.split('.').at(-1)!)[l.settlementId];expect(value).toBe(f.population);mass+=value;}expect(mass).toBe(l.population);}
 });
 it.each([
  ['s12000049','s52000280',617728,620870,708],['s12000036','s52000233',493794,514591,1663],['s12000033','s52000002',192968,224015,2520],['s12000042','s52000210',146638,148718,737],
 ])('preserves exact Scottish city fragment %s',(code,locality,mass,scopeMass,outside)=>{
  expect(weights(code)[`settlement.uk.nrs-locality.${locality}`]).toBe(mass);expect(total(code)).toBe(scopeMass);expect(weights(code)['administrative-only']).toBe(outside);
 });
 it.each([['s12000023',21977,12373],['s12000027',22985,14376],['s12000013',26159,18651]])('preserves exact island precision %s',(code,mass,outside)=>{
  expect(total(code)).toBe(mass);expect(weights(code)['administrative-only']).toBe(outside);expect(scope(code).candidates.filter(c=>c.location.kind==='settlement-area')).not.toHaveLength(0);
 });
 it('witnesses every destination with the exact pinned decision and scope',()=>{
  expect(witnessReport.witnesses).toHaveLength(2768);const covered=new Set<string>();
  for(const w of witnessReport.witnesses){const g=policy.groups.find(g=>g.scope.placeId===w.placeId)!,request={version:1 as const,policyId:policy.policyId,personId:w.personId,rootSeed:w.rootSeed,scope:g.scope},d=runtime.evaluate(request);
   expect(d.location.administrativeArea).toEqual(g.scope);expect(d.location.kind==='settlement-area'?d.location.settlement.settlementId:null).toBe(w.settlementId);expect(createHash('sha256').update(JSON.stringify(d)).digest('hex')).toBe(w.decisionSha256);covered.add(JSON.stringify(d.location));
  }expect(covered.size).toBe(2768);
 });
 it('normalizes reversed/shuffled source arrays to byte-identical semantics and decisions',()=>{
  const {fingerprint:_fingerprint,...input}=policy;const reorder=<T,>(xs:readonly T[])=>[...xs.filter((_,i)=>i%2).reverse(),...xs.filter((_,i)=>i%2===0).reverse()];
  const r=withResidencePlacementPolicyFingerprint({...input,groups:[...input.groups].reverse().map(g=>({...g,candidates:[...g.candidates].reverse()}))}),s=withResidencePlacementPolicyFingerprint({...input,groups:reorder(input.groups).map(g=>({...g,candidates:reorder(g.candidates)}))});expect(JSON.stringify(r)).toBe(JSON.stringify(policy));expect(s).toEqual(policy);
  const rt=createResidencePlacementRuntime(r,context),st=createResidencePlacementRuntime(s,context);for(const g of policy.groups){const request={version:1 as const,policyId:policy.policyId,personId:'person:1',rootSeed:42,scope:g.scope};expect(rt.evaluate(request)).toEqual(st.evaluate(request));expect(rt.evaluate(request)).toEqual(runtime.evaluate(request));}
  const reverseKeys=(value:unknown):unknown=>Array.isArray(value)?value.map(reverseKeys):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reverseKeys(item)])):value;
  expect(JSON.stringify(withResidencePlacementPolicyFingerprint(reverseKeys(input) as typeof input))).toBe(JSON.stringify(policy));
 });
 it('pins exact tickets for large Scottish, authored principal and rural scope masses',()=>{
  const cases=[['s12000049',620870,'46693485e1ccf75182b70cc4a473019d3e94c87c8c17ce97446631907a1313e5'],['e08000032',3936,'37aef0c7f5ceafae5a7f3b54fd784d6f6b4518b1f15e28b5937c2cbd2da05e01'],['e06000052',125,'87b0a8ab670541b28773dd2d460c97ce3256b1f8514c2b8a94d847bd6813e7d9']] as const;
  for(const [code,mass,hash] of cases){
   const g=scope(code),draws=Array.from({length:64},(_,index)=>{
    const request={version:1 as const,policyId:policy.policyId,personId:`person:${index+1}`,rootSeed:index,scope:g.scope},d=runtime.diagnose(request),ticket=BigInt(d.ticket!);
    expect(d.totalMass).toBe(mass);expect(ticket>=0n&&ticket<BigInt(mass)).toBe(true);
    let low=0n;const selected=d.candidates.find(c=>{const high=low+BigInt(c.weight),inside=ticket>=low&&ticket<high;low=high;return inside;});
    expect(selected?.key).toBe(d.selectedCandidateKey);expect(d.decision).toEqual(runtime.evaluate(request));
    return [d.ticket,d.selectedCandidateKey,d.attempts];
   });
   expect(new Set(draws.map(d=>d[0])).size).toBeGreaterThan(4);
   expect(createHash('sha256').update(JSON.stringify(draws)).digest('hex')).toBe(hash);
  }
 });
 it('rejects semantic ID reuse, mismatch manifests, missing and duplicate registrations',()=>{
  const {fingerprint:_f,...copy}=mutablePolicy();copy.groups[0].candidates[0].weight++;const changed=withResidencePlacementPolicyFingerprint(copy);expect(validateResidencePlacementPolicy(changed)).toBe(true);expect(validateUkInitialResidencePlacementPolicy(changed)).toBe(false);expect(()=>prepareUkInitialResidencePlacementPolicy(changed)).toThrow();
  expect(()=>prepareUkInitialResidencePlacementPolicy(policy,[{policyId:policy.policyId,fingerprint:'fnv1a64-v1:0000000000000000'}])).toThrow();expect(()=>createResidencePlacementRegistry([policy,policy],registry.manifest)).toThrow();
 });
 it('rejects substituted or alternate policies through the UK lookup boundary',()=>{
  const {fingerprint:_f,...input}=mutablePolicy();input.groups[0].candidates[0].weight++;
  const changed=withResidencePlacementPolicyFingerprint(input),substituted=createResidencePlacementRegistry([changed],[{policyId:changed.policyId,fingerprint:changed.fingerprint}]);
  expect(()=>resolveUkResidencePlacementContent(substituted,policy.policyId)).toThrow();
  const alternate=withResidencePlacementPolicyFingerprint({...input,policyId:'residence-placement.uk.mid-2024-v2'}),alternateRegistry=createResidencePlacementRegistry([alternate],[{policyId:alternate.policyId,fingerprint:alternate.fingerprint}]);
  expect(()=>resolveUkResidencePlacementContent(alternateRegistry,alternate.policyId)).toThrow();
  const mixed=createResidencePlacementRegistry([policy,alternate],[...registry.manifest,{policyId:alternate.policyId,fingerprint:alternate.fingerprint}]);
  expect(()=>resolveUkResidencePlacementContent(mixed,policy.policyId)).toThrow();
  expect(resolveUkResidencePlacementContent(registry,policy.policyId)).toEqual(policy);
 });
 it('fails exact content preparation without fallback when dependency or relation is missing',()=>{
  expect(()=>createUkInitialResidencePlacementRuntime({...context,geography:{...geography,partition:()=>undefined}})).toThrow();
  expect(()=>createUkInitialResidencePlacementRuntime({...context,settlements:{...settlements,package:id=>{const pkg=settlements.package(id);return pkg?{...pkg,administrativeRelations:[]}:undefined;}}})).toThrow();
 });
 it('owns frozen policy snapshots and retains no caller mutation authority',()=>{
  const source=mutablePolicy(),prepared=prepareUkInitialResidencePlacementPolicy(source),rt=createResidencePlacementRuntime(prepared.policies[0],context),g=policy.groups[0],request={version:1 as const,policyId:policy.policyId,personId:'person:1',rootSeed:42,scope:g.scope},before=rt.evaluate(request);source.groups[0].candidates[0].weight=999;source.groups.length=0;
  expect(prepared.policies[0]).toEqual(policy);expect(rt.evaluate(request)).toEqual(before);expect(Object.isFrozen(prepared)).toBe(true);expect(Object.isFrozen(prepared.policies[0].groups[0].candidates[0].location)).toBe(true);expect(Object.isFrozen(before)).toBe(true);
 });
 it('verifies exact artifact bytes, wrong bytes, sliced views and ownership before hashing',async()=>{
  const bytes=new Uint8Array(readFileSync(new URL('./compiled-policy.json',import.meta.url)));expect(bytes.length).toBe(UK_INITIAL_RESIDENCE_PLACEMENT_ARTIFACT_BYTES);expect(createHash('sha256').update(bytes).digest('hex')).toBe(UK_INITIAL_RESIDENCE_PLACEMENT_ARTIFACT_SHA256);await verifyUkInitialResidencePlacementArtifact(bytes);
  const parent=new Uint8Array(bytes.length+11);parent.set(bytes,7);await verifyUkInitialResidencePlacementArtifact(parent.subarray(7,7+bytes.length));const pending=verifyUkInitialResidencePlacementArtifact(bytes);bytes.fill(0);await pending;await expect(verifyUkInitialResidencePlacementArtifact(bytes)).rejects.toThrow('checksum');await expect(verifyUkInitialResidencePlacementArtifact(bytes.subarray(1))).rejects.toThrow('length');
 });
 it('copies intrinsic byte content without calling attacker-provided array methods',async()=>{
  const bytes=new Uint8Array(readFileSync(new URL('./compiled-policy.json',import.meta.url)));let reads=0;
  Object.defineProperty(bytes,'slice',{get(){reads++;throw Error('Do not invoke');}});Object.defineProperty(bytes,'byteLength',{get(){reads++;throw Error('Do not invoke');}});
  await verifyUkInitialResidencePlacementArtifact(bytes);expect(reads).toBe(0);
  const proxy=Proxy.revocable(bytes,{});proxy.revoke();await expect(verifyUkInitialResidencePlacementArtifact(proxy.proxy)).rejects.toThrow('Invalid UK placement artifact');
 });
 it('rejects hostile structures through frozen validation without invoking getters',()=>{
  let calls=0;const accessor={...policy};Object.defineProperty(accessor,'groups',{enumerable:true,get(){calls++;throw Error();}});expect(validateUkInitialResidencePlacementPolicy(accessor)).toBe(false);expect(calls).toBe(0);
  const hidden={...policy};Object.defineProperty(hidden,'hidden',{value:1});const symbol={...policy,[Symbol()]:1};const custom=Object.assign(Object.create({}),policy);const revoked=Proxy.revocable(policy,{});revoked.revoke();
  for(const v of [hidden,symbol,custom,revoked.proxy,new Map(),new Set(),new Date(),()=>policy])expect(validateUkInitialResidencePlacementPolicy(v)).toBe(false);
 });
 it.each(['zero','negative','fraction','unsafe','duplicate-scope','duplicate-candidate','sparse','version','extra'])('rejects corrupt generic policy: %s',kind=>{
  const p=mutablePolicy();
  if(kind==='zero')p.groups[0].candidates[0].weight=0;if(kind==='negative')p.groups[0].candidates[0].weight=-1;if(kind==='fraction')p.groups[0].candidates[0].weight=.5;if(kind==='unsafe')p.groups[0].candidates[0].weight=Number.MAX_SAFE_INTEGER+1;
  if(kind==='duplicate-scope')p.groups.push(p.groups[0]);if(kind==='duplicate-candidate')p.groups[0].candidates.push(p.groups[0].candidates[0]);if(kind==='sparse')delete p.groups[0];if(kind==='version')(p as unknown as {version:number}).version=2;if(kind==='extra')Object.assign(p,{unexpected:true});expect(validateUkInitialResidencePlacementPolicy(p)).toBe(false);
 });
 it('keeps provenance and base-world use restrictions outside the generic policy',()=>{
  expect(sourceManifest.contract).toMatchObject({purpose:'base-world-initial-residence-placement',continuousReapplication:false,equilibriumTarget:false,migrationAttractor:false,populationController:false,createsResidence:false,changesGame:false});expect(sourceManifest.contract.lateMaterialization).toContain('unevolved compatible base-world');
  expect(Object.keys(policy).sort()).toEqual(['algorithmId','dependencies','fingerprint','groups','policyId','version']);expect(sourceManifest.source.referenceDate).toEqual({year:2022,month:3,day:20});expect(sourceManifest.source.sha256).toBe('sha256:f7af756710c56f335d9332c08f95a68a5775aec4f25f17b21ab979257ed40148');
 });
});

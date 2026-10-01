import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {createGeographyRuntime} from '../../../../engine/geography/runtime';
import {createSettlementRegistry,validateSettlementPackage,withSettlementPackageFingerprint} from '../../../../engine/geography/settlements/package';
import type {SettlementPackageV1} from '../../../../engine/geography/settlements/types';
import {createUkGeographyRegistry,UK_PRIMARY_LOCAL_ADMIN_PARTITION_ID} from '../primary-local-admin-2024/adapter';
import {loadUkHybridSettlementCandidate,UK_HYBRID_SETTLEMENT_ARTIFACT_SHA256,UK_HYBRID_SETTLEMENT_CANDIDATE_FINGERPRINT,UK_HYBRID_SETTLEMENT_CANDIDATE_ID} from '../settlements-hybrid-2024/adapter';
import {createUkHybridSettlementV2CandidateRegistry,createUkHybridSettlementV2CandidateRuntime,loadUkHybridSettlementV2Candidate,UK_HYBRID_SETTLEMENT_V2_ARTIFACT_BYTE_LENGTH,UK_HYBRID_SETTLEMENT_V2_ARTIFACT_SHA256,UK_HYBRID_SETTLEMENT_V2_CANDIDATE_FINGERPRINT,UK_HYBRID_SETTLEMENT_V2_CANDIDATE_ID,UK_HYBRID_SETTLEMENT_V2_CANDIDATE_MANIFEST,UK_HYBRID_SETTLEMENT_V2_CONTINUITY_LEDGER,UK_HYBRID_SETTLEMENT_V2_COUNT,UK_HYBRID_SETTLEMENT_V2_REAL_COUNT,UK_HYBRID_SETTLEMENT_V2_RELATION_COUNT,UK_HYBRID_SETTLEMENT_V2_SYNTHETIC_COUNT,ukHybridSettlementV2BuildReport} from './adapter';

const previous=loadUkHybridSettlementCandidate(),pkg=loadUkHybridSettlementV2Candidate(),report=ukHybridSettlementV2BuildReport(),runtime=createUkHybridSettlementV2CandidateRuntime();
const packageId=UK_HYBRID_SETTLEMENT_V2_CANDIDATE_ID;
const forArea=(code:string)=>runtime.getSettlementsForAdministrativeArea(packageId,UK_PRIMARY_LOCAL_ADMIN_PARTITION_ID,`place.uk.local-admin.${code.toLowerCase()}`);
const syntheticForArea=(code:string)=>forArea(code).filter(item=>item.settlementId.startsWith('settlement.uk.synthetic.'));
const display=(settlementId:string)=>runtime.getSettlement(packageId,settlementId)?.names.find(item=>item.role==='display')?.text;

describe('Hybrid UK Settlement Content v2 production package',()=>{
 it('preserves immutable v1 bytes and materializes a distinct frozen v2 package',()=>{
  const v1Bytes=readFileSync(new URL('../settlements-hybrid-2024/compiled-settlements-candidate.json',import.meta.url)),v2Bytes=readFileSync(new URL('./compiled-settlements-candidate.json',import.meta.url));
  expect(v1Bytes.byteLength).toBe(3_142_028);expect(createHash('sha256').update(v1Bytes).digest('hex')).toBe(UK_HYBRID_SETTLEMENT_ARTIFACT_SHA256);
  expect(previous).toMatchObject({packageId:UK_HYBRID_SETTLEMENT_CANDIDATE_ID,fingerprint:UK_HYBRID_SETTLEMENT_CANDIDATE_FINGERPRINT});
  expect(pkg).toMatchObject({packageId,fingerprint:UK_HYBRID_SETTLEMENT_V2_CANDIDATE_FINGERPRINT});expect(validateSettlementPackage(pkg)).toBe(true);
  expect(v2Bytes.byteLength).toBe(UK_HYBRID_SETTLEMENT_V2_ARTIFACT_BYTE_LENGTH);expect(createHash('sha256').update(v2Bytes).digest('hex')).toBe(UK_HYBRID_SETTLEMENT_V2_ARTIFACT_SHA256);
 });

 it('corrects Cardiff and Belfast without collapsing reviewed polycentric authorities',()=>{
  expect(forArea('W06000015').map(item=>item.names[0].text)).toEqual(['Cardiff']);expect(syntheticForArea('W06000015')).toHaveLength(0);
  expect(forArea('N09000003').map(item=>item.names[0].text)).toEqual(['Belfast']);expect(syntheticForArea('N09000003')).toHaveLength(0);
  expect(forArea('E08000035')).toHaveLength(33);expect(syntheticForArea('E08000035')).toHaveLength(32);
  expect(forArea('E08000032').map(item=>item.names[0].text)).toEqual(expect.arrayContaining(['Bradford','Keighley','Shipley','Ilkley']));expect(syntheticForArea('E08000032')).toHaveLength(18);
  for(const name of ['London','Birmingham','Manchester','Liverpool','Sheffield','Bristol','Newcastle upon Tyne','Swansea','Glasgow','Edinburgh','Aberdeen','Dundee'])expect(pkg.settlements.some(item=>item.names[0].text===name),name).toBe(true);
  const swansea=report.stressCases.majorCities.find(item=>item.displayName==='Swansea')!;expect(swansea).toMatchObject({realAnchorCount:1,syntheticCount:13,policy:'reviewed-polycentric-administrative-area'});expect(swansea.reason).toContain('not Swansea neighbourhoods');
  for(const name of ['Glasgow','Edinburgh','Aberdeen','Dundee'])expect(report.stressCases.majorCities.find(item=>item.displayName===name)?.policy).toBe('official-nrs-locality-inventory');
  expect(report.administrativeDistribution.find(item=>item.officialCode==='E06000053')?.policy).toBe('preserved-small-area-real-anchor');
 });

 it('uses the reviewed Welsh component boundary and validates a deterministic 100-name corpus',()=>{
  const welsh=pkg.settlements.filter(item=>item.settlementId.startsWith('settlement.uk.synthetic.w'));
  expect(welsh).toHaveLength(156);expect(report.namingDiagnostics.correctedWelshCefnCount).toBe(8);expect(welsh.some(item=>item.names[0].text==='Cefnnant')).toBe(false);
  expect(welsh.filter(item=>item.names[0].text.startsWith('Cefn')).every(item=>item.names[0].text.startsWith('Cefn '))).toBe(true);
  const sample=welsh.slice(0,100);expect(sample).toHaveLength(100);
  for(const item of sample){const name=item.names[0];expect(name.text).toBe(name.text.normalize('NFC'));expect(name.text.trim()).toBe(name.text);expect(name.languageTag).toBe('cy');expect([...name.text].length).toBeLessThanOrEqual(72);expect(name.text).not.toMatch(/^Cefn[^ ]/);expect(name.text).not.toMatch(/[’'-]/);}
  expect(new Set(welsh.map(item=>item.names[0].text.toLowerCase())).size).toBe(welsh.length);
 });

 it('retains every unaffected durable real identity and records explicit continuity for every reused identity',()=>{
  const previousById=new Map(previous.settlements.map(item=>[item.settlementId,item]));
  const v2Real=pkg.settlements.filter(item=>!item.settlementId.startsWith('settlement.uk.synthetic.'));expect(v2Real).toHaveLength(712);
  for(const item of v2Real){expect(previousById.get(item.settlementId)?.names[0].text).toBe(item.names[0].text);expect(item.decisionIds).toContain('settlement-decision.uk.hybrid.v1-to-v2-continuity-v1');}
  expect(UK_HYBRID_SETTLEMENT_V2_CONTINUITY_LEDGER.entries.filter(item=>item.status==='continued')).toHaveLength(2_698);
  const removed=UK_HYBRID_SETTLEMENT_V2_CONTINUITY_LEDGER.entries.filter(item=>item.status==='historical-only');expect(removed).toHaveLength(41);expect(removed.every(item=>item.settlementId.includes('.w06000015.')||item.settlementId.includes('.n09000003.'))).toBe(true);
  const registry=createUkHybridSettlementV2CandidateRegistry();expect(registry.identities).toHaveLength(2_739);expect(registry.packages.map(item=>item.packageId)).toEqual([UK_HYBRID_SETTLEMENT_CANDIDATE_ID,packageId]);
 });

 it('does not rebind authored indices and limits semantic corrections to the reviewed Welsh component boundary',()=>{
  const previousById=new Map(previous.settlements.map(item=>[item.settlementId,item])),currentIds=new Set(pkg.settlements.map(item=>item.settlementId));
  expect(pkg.settlements.every(item=>previousById.has(item.settlementId))).toBe(true);
  const changed=pkg.settlements.filter(item=>previousById.get(item.settlementId)!.names[0].text!==item.names[0].text);
  expect(changed).toHaveLength(8);expect(changed.every(item=>previousById.get(item.settlementId)!.names[0].text.startsWith('Cefn')&&item.names[0].text.startsWith('Cefn '))).toBe(true);
  const removed=previous.settlements.filter(item=>!currentIds.has(item.settlementId));expect(removed).toHaveLength(41);expect(removed.every(item=>item.settlementId.includes('.w06000015.')||item.settlementId.includes('.n09000003.'))).toBe(true);
  expect(pkg.settlements.filter(item=>item.settlementId.startsWith('settlement.uk.synthetic.')&&!changed.includes(item)).every(item=>previousById.get(item.settlementId)!.names[0].text===item.names[0].text)).toBe(true);
 });

 it('rejects cross-package identity reuse without the manual-continuity decision',()=>{
  const target=pkg.settlements.find(item=>item.settlementId==='settlement.uk.reviewed.cardiff')!;
  const {fingerprint:_fingerprint,...base}=pkg;
  void _fingerprint;
  const raw:Omit<SettlementPackageV1,'fingerprint'>={...base,settlements:pkg.settlements.map(item=>item===target?{...item,decisionIds:item.decisionIds.filter(id=>id!=='settlement-decision.uk.hybrid.v1-to-v2-continuity-v1')}:item)};
  const corrupt=withSettlementPackageFingerprint(raw),valid=createUkHybridSettlementV2CandidateRegistry(),geography=createGeographyRuntime(createUkGeographyRegistry());
  expect(()=>createSettlementRegistry(valid.identities,[previous,corrupt],[{packageId:previous.packageId,fingerprint:previous.fingerprint},{packageId:corrupt.packageId,fingerprint:corrupt.fingerprint}],valid.identityManifest,geography)).toThrow('Invalid Settlement registry.');
 });

 it('publishes complete deterministic report and manifest inventories',()=>{
  expect(pkg.settlements).toHaveLength(UK_HYBRID_SETTLEMENT_V2_COUNT);expect(pkg.administrativeRelations).toHaveLength(UK_HYBRID_SETTLEMENT_V2_RELATION_COUNT);
  expect(report).toMatchObject({packageVersion:2,settlementCount:2_698,realCount:712,syntheticCount:1_986,relationCount:2_736,zeroSettlementAdministrativeAreas:[],constituentCountryInventory:{england:{total:1_779,real:35,synthetic:1_744},wales:{total:166,real:10,synthetic:156},scotland:{total:656,real:656,synthetic:0},'northern-ireland':{total:97,real:11,synthetic:86}},provenanceInventory:{officialNrsLocalities:656,reviewedRealAnchors:56,authoredGameplayAbstractions:1_986},relationInventory:{total:2_736,containedBy:2_691,intersects:45,multiRelationSettlements:7}});
  expect(report.administrativeDistribution).toHaveLength(361);expect(report.sourceDependencies.map(item=>item.sourceId)).toEqual(pkg.sources.map(item=>item.id));
  expect(UK_HYBRID_SETTLEMENT_V2_CANDIDATE_MANIFEST).toMatchObject({status:'frozen-production',settlementCount:2_698,realCount:712,syntheticCount:1_986,relationCount:2_736,countryBreakdown:report.constituentCountryInventory,provenanceBreakdown:report.provenanceInventory,relationBreakdown:report.relationInventory});
 });

 it('keeps exact authored and official provenance separate in every record and relation',()=>{
  const syntheticSource='geography.source.turning-pages.synthetic-uk-settlements-2024-v2',synthetic=pkg.settlements.filter(item=>item.settlementId.startsWith('settlement.uk.synthetic.')),real=pkg.settlements.filter(item=>!item.settlementId.startsWith('settlement.uk.synthetic.'));
  expect(synthetic).toHaveLength(UK_HYBRID_SETTLEMENT_V2_SYNTHETIC_COUNT);expect(real).toHaveLength(UK_HYBRID_SETTLEMENT_V2_REAL_COUNT);
  expect(synthetic.every(item=>item.sourceIds.length===1&&item.sourceIds[0]===syntheticSource&&item.names.every(name=>name.sourceIds.length===1&&name.sourceIds[0]===syntheticSource))).toBe(true);
  expect(real.every(item=>!item.sourceIds.includes(syntheticSource))).toBe(true);expect(pkg.sources.find(item=>item.id===syntheticSource)?.classification).toBe('authored-gameplay-abstraction');
  expect(pkg.administrativeRelations.filter(item=>item.settlementId.startsWith('settlement.uk.synthetic.')).every(item=>item.relation==='contained-by'&&item.basis==='reviewed-mapping'&&item.sourceIds[0]===syntheticSource)).toBe(true);
  const relationCounts=new Map<string,number>();for(const relation of pkg.administrativeRelations)relationCounts.set(relation.settlementId,(relationCounts.get(relation.settlementId)??0)+1);
  const multi=[...relationCounts].filter(([,count])=>count>1).map(([id])=>id);expect(multi).toHaveLength(7);expect(multi.every(id=>!id.startsWith('settlement.uk.synthetic.'))).toBe(true);
 });

 it('canonicalizes reversed package arrays without changing v2 semantics',()=>{
  const raw:Omit<SettlementPackageV1,'fingerprint'>={version:1,packageId:pkg.packageId,countryId:pkg.countryId,effectiveDate:pkg.effectiveDate,sources:[...pkg.sources].reverse(),settlements:[...pkg.settlements].reverse().map(item=>({...item,names:[...item.names].reverse(),sourceIds:[...item.sourceIds].reverse(),decisionIds:[...item.decisionIds].reverse()})),administrativeRelations:[...pkg.administrativeRelations].reverse().map(item=>({...item,sourceIds:[...item.sourceIds].reverse(),decisionIds:[...item.decisionIds].reverse()})),decisions:[...pkg.decisions].reverse().map(item=>({...item,sourceIds:[...item.sourceIds].reverse()})),gaps:[...pkg.gaps].reverse().map(item=>({...item,sourceIds:[...item.sourceIds].reverse()})),limitations:[...pkg.limitations].reverse()};
  expect(withSettlementPackageFingerprint(raw)).toEqual(pkg);
 });

 it('keeps the corrected candidate outside Population, Country Start, New Game and persistence',()=>{
  const owners=import.meta.glob<string>(['../../../demography/**/*.ts','../../../uk/**/*.ts','../../../../ui/newGame.ts','../../../../persistence/**/*.ts'],{eager:true,query:'?raw',import:'default'});
  for(const [path,source] of Object.entries(owners)){if(path.endsWith('.test.ts'))continue;expect(source,path).not.toContain(packageId);}
  for(const item of pkg.settlements)expect(item).not.toEqual(expect.objectContaining({population:expect.anything(),residence:expect.anything(),presence:expect.anything()}));
 });
});

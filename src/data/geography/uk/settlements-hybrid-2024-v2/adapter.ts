import {createGeographyRuntime} from '../../../../engine/geography/runtime';
import {createSettlementRegistry,validateSettlementPackage,validateSettlementRegistry} from '../../../../engine/geography/settlements/package';
import {createSettlementRuntime} from '../../../../engine/geography/settlements/runtime';
import type {SettlementIdentityManifestEntry,SettlementIdentityV1,SettlementPackageV1,SettlementRegistryV1} from '../../../../engine/geography/settlements/types';
import {createUkGeographyRegistry,UK_PRIMARY_LOCAL_ADMIN_PARTITION_ID} from '../primary-local-admin-2024/adapter';
import {loadUkHybridSettlementCandidate,UK_HYBRID_SETTLEMENT_CANDIDATE_FINGERPRINT,UK_HYBRID_SETTLEMENT_CANDIDATE_ID} from '../settlements-hybrid-2024/adapter';
import reportJson from './build-report.json';
import packageJson from './compiled-settlements-candidate.json';
import continuityJson from './continuity-ledger.json';
import identityManifestJson from './settlement-identity-manifest.json';
import identitiesJson from './settlement-identities.json';
import manifestJson from './package-manifest.json';

export const UK_HYBRID_SETTLEMENT_V2_CANDIDATE_ID='settlements.uk.hybrid-2024-06-30-v2' as const;
export const UK_HYBRID_SETTLEMENT_V2_PRODUCTION_ID=UK_HYBRID_SETTLEMENT_V2_CANDIDATE_ID;
export const UK_HYBRID_SETTLEMENT_V2_CANDIDATE_FINGERPRINT='fnv1a64-v1:2ddc7643a1e7e4b8' as const;
export const UK_HYBRID_SETTLEMENT_V2_COUNT=2_698 as const;
export const UK_HYBRID_SETTLEMENT_V2_REAL_COUNT=712 as const;
export const UK_HYBRID_SETTLEMENT_V2_SYNTHETIC_COUNT=1_986 as const;
export const UK_HYBRID_SETTLEMENT_V2_RELATION_COUNT=2_736 as const;
export const UK_HYBRID_SETTLEMENT_V2_ARTIFACT_SHA256='34aa659dc4ed927b70f78834c6638e58ae787ead38a9e9e68fe28886b0c359db' as const;
export const UK_HYBRID_SETTLEMENT_V2_ARTIFACT_BYTE_LENGTH=3_269_891 as const;
export const UK_HYBRID_SETTLEMENT_V2_CONTINUITY_FINGERPRINT='fnv1a64-v1:6645f23c6de7bb1b' as const;

type CountryInventory=Readonly<Record<'england'|'wales'|'scotland'|'northern-ireland',Readonly<{total:number;real:number;synthetic:number}>>>;
export type UkHybridSettlementV2BuildReport=Readonly<{
 version:1;packageVersion:2;packageId:typeof UK_HYBRID_SETTLEMENT_V2_CANDIDATE_ID;status:'frozen-production';effectiveDate:'2024-06-30';partitionId:typeof UK_PRIMARY_LOCAL_ADMIN_PARTITION_ID;
 settlementCount:number;realCount:number;syntheticCount:number;relationCount:number;constituentCountryInventory:CountryInventory;
 administrativeAreaCount:number;zeroSettlementAdministrativeAreas:readonly string[];administrativeDistribution:readonly Readonly<{officialCode:string;displayName:string;total:number;real:number;synthetic:number;policy:string}>[];
 policyDefinitions:Readonly<Record<string,Readonly<{classification:string;reason:string}>>>;
 stressCases:Readonly<{majorCities:readonly Readonly<{displayName:string;settlementId:string;administrativeAreas:readonly string[];realAnchorCount:number;syntheticCount:number;policy:string;reason:string}>[]}>;
 provenanceInventory:Readonly<{officialNrsLocalities:number;reviewedRealAnchors:number;authoredGameplayAbstractions:number}>;
 relationInventory:Readonly<{total:number;containedBy:number;intersects:number;multiRelationSettlements:number}>;
 continuityInventory:Readonly<{continued:number;historicalOnly:number;ledgerFingerprint:string}>;
 namingDiagnostics:Readonly<{correctedWelshCefnCount:number;malformedNameCount:number;maximumDisplayNameCodePoints:number;reviewedSampleCounts:Readonly<{england:number;wales:number;'northern-ireland':number}>;nfc:true;countryLevelSyntheticUniqueness:true}>;
 sourceDependencies:readonly Readonly<{sourceId:string;bundledArtifactId?:string;sha256?:string}>[];
 packageFingerprint:string;canonicalArtifact:Readonly<{filename:string;byteLength:number;sha256:string}>;
}>;

type CandidateManifest=Readonly<{
 version:1;status:'frozen-production';packageId:string;fingerprint:string;artifact:Readonly<{filename:string;byteLength:number;sha256:string}>;
 settlementCount:number;realCount:number;syntheticCount:number;relationCount:number;countryBreakdown:CountryInventory;
 provenanceBreakdown:Readonly<{officialNrsLocalities:number;reviewedRealAnchors:number;authoredGameplayAbstractions:number}>;
 relationBreakdown:Readonly<{total:number;containedBy:number;intersects:number;multiRelationSettlements:number}>;
 sourceDependencies:readonly Readonly<{sourceId:string;bundledArtifactId?:string;sha256?:string}>[];
 dependencies:Readonly<{settlementFoundationVersion:1;settlementPackageSchemaVersion:1;geographyPartitionId:string;previousPackageId:string;previousPackageFingerprint:string}>;
 continuity:Readonly<{ledgerId:string;fingerprint:string;continued:number;historicalOnly:number}>;partitionId:string;
}>;
type ContinuityLedger=Readonly<{version:1;id:string;fingerprint:string;fromPackageId:string;toPackageId:string;entries:readonly Readonly<{settlementId:string;status:'continued';decisionId:string}|{settlementId:string;status:'historical-only';reason:string}>[]}>;

const PACKAGE=packageJson as unknown as SettlementPackageV1;
const IDENTITIES=(identitiesJson as unknown as {version:1;identities:readonly SettlementIdentityV1[]}).identities;
const IDENTITY_MANIFEST=(identityManifestJson as unknown as {version:1;entries:readonly SettlementIdentityManifestEntry[]}).entries;
const MANIFEST=manifestJson as unknown as CandidateManifest;
const REPORT=reportJson as unknown as UkHybridSettlementV2BuildReport;
const CONTINUITY=continuityJson as unknown as ContinuityLedger;
const immutable=<T>(value:T):T=>{const copy=structuredClone(value);const freeze=(item:unknown):void=>{if(!item||typeof item!=='object'||Object.isFrozen(item))return;for(const key of Reflect.ownKeys(item)){const descriptor=Object.getOwnPropertyDescriptor(item,key);if(descriptor&&'value' in descriptor)freeze(descriptor.value);}Object.freeze(item);};freeze(copy);return copy;};

function validateCandidateInputs():void{
 if(!validateSettlementPackage(PACKAGE)||PACKAGE.packageId!==UK_HYBRID_SETTLEMENT_V2_CANDIDATE_ID||PACKAGE.fingerprint!==UK_HYBRID_SETTLEMENT_V2_CANDIDATE_FINGERPRINT||PACKAGE.countryId!=='uk'||PACKAGE.settlements.length!==UK_HYBRID_SETTLEMENT_V2_COUNT||PACKAGE.administrativeRelations.length!==UK_HYBRID_SETTLEMENT_V2_RELATION_COUNT)throw Error('Invalid hybrid UK Settlement v2 candidate package.');
 if(MANIFEST.version!==1||MANIFEST.status!=='frozen-production'||MANIFEST.packageId!==PACKAGE.packageId||MANIFEST.fingerprint!==PACKAGE.fingerprint||MANIFEST.partitionId!==UK_PRIMARY_LOCAL_ADMIN_PARTITION_ID||MANIFEST.settlementCount!==UK_HYBRID_SETTLEMENT_V2_COUNT||MANIFEST.realCount!==UK_HYBRID_SETTLEMENT_V2_REAL_COUNT||MANIFEST.syntheticCount!==UK_HYBRID_SETTLEMENT_V2_SYNTHETIC_COUNT||MANIFEST.relationCount!==UK_HYBRID_SETTLEMENT_V2_RELATION_COUNT||MANIFEST.artifact.byteLength!==UK_HYBRID_SETTLEMENT_V2_ARTIFACT_BYTE_LENGTH||MANIFEST.artifact.sha256!==UK_HYBRID_SETTLEMENT_V2_ARTIFACT_SHA256||MANIFEST.dependencies.previousPackageId!==UK_HYBRID_SETTLEMENT_CANDIDATE_ID||MANIFEST.dependencies.previousPackageFingerprint!==UK_HYBRID_SETTLEMENT_CANDIDATE_FINGERPRINT)throw Error('Invalid hybrid UK Settlement v2 production manifest.');
 if(IDENTITIES.length!==2_739||IDENTITY_MANIFEST.length!==IDENTITIES.length||CONTINUITY.entries.length!==IDENTITIES.length||CONTINUITY.fingerprint!==UK_HYBRID_SETTLEMENT_V2_CONTINUITY_FINGERPRINT||CONTINUITY.entries.filter(item=>item.status==='continued').length!==UK_HYBRID_SETTLEMENT_V2_COUNT||CONTINUITY.entries.filter(item=>item.status==='historical-only').length!==41)throw Error('Invalid hybrid UK Settlement v2 continuity inventory.');
 if(REPORT.version!==1||REPORT.packageVersion!==2||REPORT.packageId!==PACKAGE.packageId||REPORT.packageFingerprint!==PACKAGE.fingerprint||REPORT.settlementCount!==PACKAGE.settlements.length||REPORT.realCount!==UK_HYBRID_SETTLEMENT_V2_REAL_COUNT||REPORT.syntheticCount!==UK_HYBRID_SETTLEMENT_V2_SYNTHETIC_COUNT||REPORT.relationCount!==PACKAGE.administrativeRelations.length||REPORT.zeroSettlementAdministrativeAreas.length!==0||Object.keys(REPORT.policyDefinitions).length!==6||REPORT.stressCases.majorCities.length!==16||REPORT.stressCases.majorCities.some(item=>item.reason.trim().length===0)||REPORT.canonicalArtifact.byteLength!==UK_HYBRID_SETTLEMENT_V2_ARTIFACT_BYTE_LENGTH||REPORT.canonicalArtifact.sha256!==UK_HYBRID_SETTLEMENT_V2_ARTIFACT_SHA256)throw Error('Invalid hybrid UK Settlement v2 build report.');
}

export function loadUkHybridSettlementV2Candidate():SettlementPackageV1{validateCandidateInputs();return immutable(PACKAGE);}

/** Historical audit registry spanning failed v1 and production v2. Production consumers use the v2-only registry below. */
export function createUkHybridSettlementV2CandidateRegistry():SettlementRegistryV1{
 validateCandidateInputs();
 const geography=createGeographyRuntime(createUkGeographyRegistry()),previous=loadUkHybridSettlementCandidate();
 const registry=createSettlementRegistry(IDENTITIES,[previous,PACKAGE],[{packageId:previous.packageId,fingerprint:previous.fingerprint},{packageId:PACKAGE.packageId,fingerprint:PACKAGE.fingerprint}],IDENTITY_MANIFEST,geography);
 if(!validateSettlementRegistry(registry,geography))throw Error('Hybrid UK Settlement v2 candidate registry failed validation.');
 return registry;
}

export function createUkHybridSettlementV2CandidateRuntime(){const geography=createGeographyRuntime(createUkGeographyRegistry());return createSettlementRuntime(createUkHybridSettlementV2CandidateRegistry(),geography);}

/** Production registry: exact v2 content plus the complete durable identity history. V1 is not a registered package. */
export function createUkHybridSettlementV2ProductionRegistry():SettlementRegistryV1{
 validateCandidateInputs();
 const geography=createGeographyRuntime(createUkGeographyRegistry());
 const registry=createSettlementRegistry(IDENTITIES,[PACKAGE],[{packageId:PACKAGE.packageId,fingerprint:PACKAGE.fingerprint}],IDENTITY_MANIFEST,geography);
 if(!validateSettlementRegistry(registry,geography))throw Error('Hybrid UK Settlement v2 production registry failed validation.');
 return registry;
}

export function createUkHybridSettlementV2ProductionRuntime(){const geography=createGeographyRuntime(createUkGeographyRegistry());return createSettlementRuntime(createUkHybridSettlementV2ProductionRegistry(),geography);}
export function ukHybridSettlementV2BuildReport():UkHybridSettlementV2BuildReport{validateCandidateInputs();return immutable(REPORT);}
export const UK_HYBRID_SETTLEMENT_V2_CANDIDATE_MANIFEST=immutable(MANIFEST);
export const UK_HYBRID_SETTLEMENT_V2_CONTINUITY_LEDGER=immutable(CONTINUITY);

import {createGeographyRuntime} from '../../../../engine/geography/runtime';
import {createSettlementRegistry,validateSettlementPackage,validateSettlementRegistry} from '../../../../engine/geography/settlements/package';
import {createSettlementRuntime} from '../../../../engine/geography/settlements/runtime';
import type {SettlementIdentityManifestEntry,SettlementIdentityV1,SettlementPackageV1,SettlementRegistryV1} from '../../../../engine/geography/settlements/types';
import {createUkGeographyRegistry,UK_PRIMARY_LOCAL_ADMIN_PARTITION_ID} from '../primary-local-admin-2024/adapter';
import reportJson from './build-report.json';
import packageJson from './compiled-settlements-candidate.json';
import identityManifestJson from './settlement-identity-manifest.json';
import identitiesJson from './settlement-identities.json';
import manifestJson from './package-manifest.json';

export const UK_HYBRID_SETTLEMENT_CANDIDATE_ID='settlements.uk.hybrid-2024-06-30-v1' as const;
export const UK_HYBRID_SETTLEMENT_CANDIDATE_FINGERPRINT='fnv1a64-v1:4f25e4c5d0b241a1' as const;
export const UK_HYBRID_SETTLEMENT_COUNT=2_739 as const;
export const UK_HYBRID_REAL_SETTLEMENT_COUNT=712 as const;
export const UK_HYBRID_SYNTHETIC_SETTLEMENT_COUNT=2_027 as const;
export const UK_HYBRID_SETTLEMENT_RELATION_COUNT=2_777 as const;
export const UK_HYBRID_SETTLEMENT_ARTIFACT_SHA256='642fbaae0a02df66b29b718f1539eafade387f50fe39bc4d19ef3e22ec415db5' as const;

export type UkHybridSettlementBuildReport=Readonly<{
 version:1;packageId:typeof UK_HYBRID_SETTLEMENT_CANDIDATE_ID;status:'candidate-awaiting-final-freeze-review';effectiveDate:'2024-06-30';partitionId:typeof UK_PRIMARY_LOCAL_ADMIN_PARTITION_ID;
 sourceArtifactChecks:readonly Readonly<{artifactId:string;byteLength:number;sha256:string;valid:true}>[];
 settlementCount:number;realCount:number;syntheticCount:number;mixedDerivedCount:number;relationCount:number;
 countByConstituentCountry:Readonly<Record<string,number>>;realByConstituentCountry:Readonly<Record<string,number>>;syntheticByConstituentCountry:Readonly<Record<string,number>>;
 administrativeAreaCount:number;zeroSettlementAdministrativeAreas:readonly string[];minimumNonzeroRelationsPerArea:number;maximumRelationsPerArea:number;
 largestAdministrativeAreas:readonly Readonly<{officialCode:string;displayName:string;settlementRelations:number}>[];
 syntheticCountByAdministrativeArea:Readonly<Record<string,number>>;
 quality:Readonly<{duplicateSettlementIds:false;duplicateRelationKeys:false;accidentalSyntheticNameCollisionsWithinArea:false;accidentalSyntheticNameCollisionsWithinCountry:false;maximumDisplayNameCodePoints:number;allRelationsResolve:true;allSyntheticRecordsUseOnlySyntheticSource:true;allRealRecordsUseOfficialSources:true}>;
 packageFingerprint:string;canonicalArtifact:Readonly<{filename:string;byteLength:number;sha256:string}>;
}>;

type CandidateManifest=Readonly<{version:1;status:'candidate-awaiting-final-freeze-review';packageId:string;fingerprint:string;artifact:Readonly<{filename:string;byteLength:number;sha256:string}>;settlementCount:number;realCount:number;syntheticCount:number;relationCount:number;partitionId:string}>;

const PACKAGE=packageJson as unknown as SettlementPackageV1;
const IDENTITIES=(identitiesJson as unknown as {version:1;identities:readonly SettlementIdentityV1[]}).identities;
const IDENTITY_MANIFEST=(identityManifestJson as unknown as {version:1;entries:readonly SettlementIdentityManifestEntry[]}).entries;
const MANIFEST=manifestJson as unknown as CandidateManifest;
const REPORT=reportJson as unknown as UkHybridSettlementBuildReport;
const immutable=<T>(value:T):T=>{const copy=structuredClone(value);const freeze=(item:unknown):void=>{if(!item||typeof item!=='object'||Object.isFrozen(item))return;for(const key of Reflect.ownKeys(item)){const descriptor=Object.getOwnPropertyDescriptor(item,key);if(descriptor&&'value' in descriptor)freeze(descriptor.value);}Object.freeze(item);};freeze(copy);return copy;};

function validateCandidateInputs():void{
 if(!validateSettlementPackage(PACKAGE)||PACKAGE.packageId!==UK_HYBRID_SETTLEMENT_CANDIDATE_ID||PACKAGE.fingerprint!==UK_HYBRID_SETTLEMENT_CANDIDATE_FINGERPRINT||PACKAGE.countryId!=='uk'||PACKAGE.settlements.length!==UK_HYBRID_SETTLEMENT_COUNT||PACKAGE.administrativeRelations.length!==UK_HYBRID_SETTLEMENT_RELATION_COUNT)throw Error('Invalid hybrid UK Settlement candidate package.');
 if(MANIFEST.version!==1||MANIFEST.status!=='candidate-awaiting-final-freeze-review'||MANIFEST.packageId!==PACKAGE.packageId||MANIFEST.fingerprint!==PACKAGE.fingerprint||MANIFEST.partitionId!==UK_PRIMARY_LOCAL_ADMIN_PARTITION_ID||MANIFEST.settlementCount!==UK_HYBRID_SETTLEMENT_COUNT||MANIFEST.realCount!==UK_HYBRID_REAL_SETTLEMENT_COUNT||MANIFEST.syntheticCount!==UK_HYBRID_SYNTHETIC_SETTLEMENT_COUNT||MANIFEST.relationCount!==UK_HYBRID_SETTLEMENT_RELATION_COUNT||MANIFEST.artifact.filename!=='compiled-settlements-candidate.json'||MANIFEST.artifact.sha256!==UK_HYBRID_SETTLEMENT_ARTIFACT_SHA256)throw Error('Invalid hybrid UK Settlement candidate manifest.');
 if(IDENTITIES.length!==PACKAGE.settlements.length||IDENTITY_MANIFEST.length!==IDENTITIES.length||REPORT.version!==1||REPORT.packageId!==PACKAGE.packageId||REPORT.packageFingerprint!==PACKAGE.fingerprint||REPORT.status!=='candidate-awaiting-final-freeze-review'||REPORT.partitionId!==UK_PRIMARY_LOCAL_ADMIN_PARTITION_ID||REPORT.settlementCount!==PACKAGE.settlements.length||REPORT.realCount!==UK_HYBRID_REAL_SETTLEMENT_COUNT||REPORT.syntheticCount!==UK_HYBRID_SYNTHETIC_SETTLEMENT_COUNT||REPORT.relationCount!==PACKAGE.administrativeRelations.length||REPORT.canonicalArtifact.sha256!==UK_HYBRID_SETTLEMENT_ARTIFACT_SHA256||REPORT.zeroSettlementAdministrativeAreas.length!==0)throw Error('Invalid hybrid UK Settlement candidate report.');
}

export function loadUkHybridSettlementCandidate():SettlementPackageV1{validateCandidateInputs();return immutable(PACKAGE);}

/** Candidate-only registry construction. This does not register production content. */
export function createUkHybridSettlementCandidateRegistry():SettlementRegistryV1{
 validateCandidateInputs();
 const geography=createGeographyRuntime(createUkGeographyRegistry()),registry=createSettlementRegistry(IDENTITIES,[PACKAGE],[{packageId:PACKAGE.packageId,fingerprint:PACKAGE.fingerprint}],IDENTITY_MANIFEST,geography);
 if(!validateSettlementRegistry(registry,geography))throw Error('Hybrid UK Settlement candidate registry failed validation.');
 return registry;
}

export function createUkHybridSettlementCandidateRuntime(){const geography=createGeographyRuntime(createUkGeographyRegistry());return createSettlementRuntime(createUkHybridSettlementCandidateRegistry(),geography);}
export function ukHybridSettlementBuildReport():UkHybridSettlementBuildReport{validateCandidateInputs();return immutable(REPORT);}
export const UK_HYBRID_SETTLEMENT_CANDIDATE_MANIFEST=immutable(MANIFEST);

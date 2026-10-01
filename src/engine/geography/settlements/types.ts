import type {SimulationDate} from '../../core/model';
import type {GeographySourceDescriptorV1} from '../types';

export type SettlementId=string;
export type SettlementKindId=string;

export type SettlementIdentityV1=Readonly<{settlementId:SettlementId;countryId:string}>;

export type SettlementNameV1=Readonly<{
 nameId:string;
 text:string;
 languageTag:string|null;
 role:'display'|'alternate';
 sourceIds:readonly string[];
}>;

export type SettlementV1=Readonly<{
 settlementId:SettlementId;
 kindId:SettlementKindId;
 names:readonly SettlementNameV1[];
 sourceIds:readonly string[];
 decisionIds:readonly string[];
}>;

export type SettlementAdministrativeRelationKind='contained-by'|'intersects';
export type SettlementRelationBasis='official-source'|'derived-spatial'|'reviewed-mapping';

export type SettlementAdministrativeRelationV1=Readonly<{
 settlementId:SettlementId;
 partitionId:string;
 placeId:string;
 relation:SettlementAdministrativeRelationKind;
 basis:SettlementRelationBasis;
 sourceIds:readonly string[];
 decisionIds:readonly string[];
}>;

export type SettlementMappingDecisionClassification='derived-transformation'|'reviewed-mapping'|'manual-continuity'|'authored-presentation';
export type SettlementMappingDecisionV1=Readonly<{
 id:string;
 classification:SettlementMappingDecisionClassification;
 description:string;
 sourceIds:readonly string[];
}>;

export type SettlementGapV1=Readonly<{
 id:string;
 description:string;
 blocking:boolean;
 sourceIds:readonly string[];
}>;

export type SettlementPackageV1=Readonly<{
 version:1;
 packageId:string;
 fingerprint:string;
 countryId:string;
 effectiveDate:Readonly<SimulationDate>;
 sources:readonly GeographySourceDescriptorV1[];
 settlements:readonly SettlementV1[];
 administrativeRelations:readonly SettlementAdministrativeRelationV1[];
 decisions:readonly SettlementMappingDecisionV1[];
 gaps:readonly SettlementGapV1[];
 limitations:readonly string[];
}>;

export type SettlementIdentityManifestEntry=Readonly<{settlementId:SettlementId;fingerprint:string}>;
export type SettlementPackageManifestEntry=Readonly<{packageId:string;fingerprint:string}>;
export type SettlementRegistryV1=Readonly<{
 version:1;
 identities:readonly SettlementIdentityV1[];
 identityManifest:readonly SettlementIdentityManifestEntry[];
 packages:readonly SettlementPackageV1[];
 packageManifest:readonly SettlementPackageManifestEntry[];
}>;

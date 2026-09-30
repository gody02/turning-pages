import type {SimulationDate} from '../core/model';

export type GeographyEvidenceClassification=
 | 'statutory-institutional'
 | 'observed-statistical-data'
 | 'estimated'
 | 'authored-gameplay-abstraction';

export type PlaceIdentityV1=Readonly<{placeId:string;countryId:string}>;

export type GeographySourceDescriptorV1=Readonly<{
 version:1;id:string;producer:string;datasetId:string;releaseId:string;title:string;jurisdiction:string;
 referenceDate:Readonly<SimulationDate>;classification:GeographyEvidenceClassification;methodology:string;licence:string;
 bundledArtifact?:Readonly<{id:string;sha256:string}>;externalLocator?:string;
}>;

export type GeographyPartitionNodeV1=Readonly<{
 placeId:string;displayName:string;kindId:string;parentPlaceId:string|null;populationAllocationCell:boolean;sourceIds:readonly string[];
}>;

export type GeographyPartitionPackageV1=Readonly<{
 version:1;partitionId:string;fingerprint:string;countryId:string;effectiveDate:Readonly<SimulationDate>;
 sources:readonly GeographySourceDescriptorV1[];nodes:readonly GeographyPartitionNodeV1[];limitations:readonly string[];
}>;

export type PlaceIdentityManifestEntry=Readonly<{placeId:string;fingerprint:string}>;
export type GeographyPartitionManifestEntry=Readonly<{partitionId:string;fingerprint:string}>;
export type GeographyRegistryV1=Readonly<{version:1;places:readonly PlaceIdentityV1[];placeManifest:readonly PlaceIdentityManifestEntry[];partitions:readonly GeographyPartitionPackageV1[];manifest:readonly GeographyPartitionManifestEntry[]}>;
export type GeographicAreaReferenceV1=Readonly<{version:1;partitionId:string;placeId:string}>;
export type ResolvedGeographicPlace=Readonly<{identity:PlaceIdentityV1;partitionId:string;node:GeographyPartitionNodeV1}>;
export type GeographicPopulationTotal=Readonly<{knownLiving:number;complete:boolean}>;

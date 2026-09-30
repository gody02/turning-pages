import type {SimulationDate} from '../../core/model';
import type {PopulationCohortInput} from '../population';

export type EvidenceClassification='observed'|'estimated'|'assumed'|'projected';
export type PublicationStatus='final'|'provisional'|'revised'|'experimental';
export type PopulationSourceDescriptorV1=Readonly<{
 version:1;id:string;organisation:string;datasetId:string;releaseId:string;title:string;
 referencePeriod:Readonly<{from:SimulationDate;through:SimulationDate}>;jurisdiction:string;publicationStatus:PublicationStatus;
 bundledArtifact?:string;externalLocator?:string;retrievedAt?:SimulationDate;methodologyNote:string;
}>;
export type PopulationUniverseDescriptor=Readonly<{id:string;description:string;exhaustive:boolean}>;
export type PopulationMeasureDimensions=
 | Readonly<{kind:'total'}>
 | Readonly<{kind:'birth-year';birthYear:number;areaId?:string|null}>
 | Readonly<{kind:'completed-age-band';minimumAge:number;maximumAge:number|null;areaId?:string|null}>;
export type PopulationMeasureV1=Readonly<{
 version:1;id:string;sourceId:string;series:string;semantic:'population-count'|'population-share';unit:'persons'|'thousand-persons'|'percent';
 referenceDate:SimulationDate;universeId:string;classification:EvidenceClassification;dimensions:PopulationMeasureDimensions;value:string;
 uncertainty?:string;roundingNote?:string;
}>;
export type DerivedPopulationTotalV1=Readonly<{id:string;operation:'sum';inputIds:readonly string[];universeId:string}>;
export type GenerationProfileBinding=Readonly<{fromBirthYear:number;throughBirthYear:number;generationProfileId:string}>;
export type CalibrationGap=Readonly<{id:string;description:string;blocking:boolean}>;
export type PopulationCalibrationPackageV1=Readonly<{
 schemaVersion:1;methodologyId:'population-calibration.method-v1';id:string;fingerprint:string;countryId:string;effectiveDate:SimulationDate;
 coverageIntent:'partial'|'complete';partition:Readonly<{areaPartitionId:string|null;birthYearFrom:number;birthYearThrough:number}>;
 universes:readonly PopulationUniverseDescriptor[];sources:readonly PopulationSourceDescriptorV1[];measures:readonly PopulationMeasureV1[];
 derivedTotals:readonly DerivedPopulationTotalV1[];authority:Readonly<{kind:'measure'|'derived';id:string}>;distributionMeasureIds:readonly string[];
 reconciliation:Readonly<{kind:'exact'}>|Readonly<{kind:'proportional-largest-remainder';maximumDiscrepancyBasisPoints:number}>;
 ageConversion:Readonly<{kind:'direct-birth-year'}>|Readonly<{kind:'uniform-birthday-by-day'}>;
 generationProfileBindings:readonly GenerationProfileBinding[];gaps:readonly CalibrationGap[];
}>;
export type CalibrationPrecision='direct-resolution'|'calibrated-from-broader-evidence'|'canonical-exact-from-rounded-source'|'calibrated-from-broader-rounded-evidence';
export type GenerationReadiness='ready'|'not-ready';
export type CalibrationReport=Readonly<{
 version:1;packageId:string;fingerprint:string;countryId:string;effectiveDate:SimulationDate;requestedCoverage:'partial'|'complete';grantedCoverage:'partial'|'complete';
 sources:readonly Readonly<{id:string;organisation:string;datasetId:string;releaseId:string;title:string;referencePeriod:Readonly<{from:SimulationDate;through:SimulationDate}>;jurisdiction:string;publicationStatus:PublicationStatus;classifications:readonly EvidenceClassification[];methodologyNote:string;bundledArtifact?:string;externalLocator?:string;retrievedAt?:SimulationDate}>[];universes:readonly string[];
 inputs:readonly Readonly<{id:string;sourceId:string;classification:EvidenceClassification;semantic:'population-count'|'population-share';unit:'persons'|'thousand-persons'|'percent';value:string;referenceDate:SimulationDate;universeId:string;resolutionNote:string}>[];
 authoritativeTotal:Readonly<{id:string;kind:'measure'|'derived';value:number;universeId:string;exhaustiveUniverse:boolean;qualifiesForCompleteness:boolean;role:'exhaustive-universe-total'|'selected-reference-total'}>;
 distributionOriginalTotal:string;absoluteDiscrepancy:string;relativeDiscrepancyBasisPoints:string;thresholdBasisPoints:number|null;scaleFactor:string|null;
 transformations:readonly string[];precision:readonly Readonly<{cohortId:string;resolution:CalibrationPrecision;note:string}>[];
 allocations:readonly Readonly<{cohortId:string;count:number}>[];membershipReservations:readonly Readonly<{birthYear:number;areaId:string|null;count:number}>[];
 residualAssignments:readonly string[];assumptions:readonly string[];uncertainty:readonly string[];unsupportedCategories:readonly string[];gaps:readonly CalibrationGap[];
 profileBindings:readonly GenerationProfileBinding[];completenessDenialReasons:readonly string[];generationReadiness:GenerationReadiness;generationReadinessDenialReasons:readonly string[];finalCohortCount:number;finalCohortSum:number;livingMembershipReservations:number;
}>;
export type CalibrationResult=Readonly<{coverage:'partial'|'complete';generationReadiness:GenerationReadiness;cohorts:readonly PopulationCohortInput[];report:CalibrationReport}>;

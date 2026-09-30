import type {SimulationDate} from '../../core/model';
import type {PopulationCohort} from '../population';

export type NamingContentClassification='observed'|'estimated'|'authored-gameplay-abstraction';
export type NamingSourceDescriptorV1=Readonly<{
 version:1;
 id:string;
 producer:string;
 datasetId:string;
 releaseId:string;
 title:string;
 jurisdiction:string;
 coveredBirthYears:Readonly<{from:number;through:number}>;
 contentUniverse:string;
 classification:NamingContentClassification;
 suppressionPolicy:string;
 transformation:string;
 licence:string;
 bundledArtifact?:Readonly<{id:string;sha256:string}>;
 externalLocator?:string;
 methodology:string;
 limitations:readonly string[];
}>;

export type GenerationNameEntry=Readonly<{id:string;text:string;weight:number}>;
export type CountContribution=Readonly<{sourceId:string;count:number}>;
export type CountWeightedGenerationNameEntry=GenerationNameEntry&Readonly<{contributions:readonly CountContribution[]}>;
type GivenNameBandBase=Readonly<{
 id:string;
 birthYearFrom:number;
 birthYearThrough:number;
 sourceIds:readonly string[];
 limitations:readonly string[];
}>;
export type GivenNameBand=
 | GivenNameBandBase&Readonly<{mode:'published-support-uniform';entries:readonly GenerationNameEntry[]}>
 | GivenNameBandBase&Readonly<{mode:'registration-count-weighted';entries:readonly CountWeightedGenerationNameEntry[]}>;

export type EvidenceBackedFamilyNameContent=Readonly<{
 kind:'evidence-backed';
 classification:'observed'|'estimated';
 sourceIds:readonly string[];
 entries:readonly CountWeightedGenerationNameEntry[];
 limitations:readonly string[];
}>;
export type AuthoredFamilyNameContent=Readonly<{
 kind:'reviewed-authored';
 classification:'authored-gameplay-abstraction';
 review:Readonly<{id:string;status:'pending'|'approved';note:string}>;
 entries:readonly GenerationNameEntry[];
 limitations:readonly string[];
}>;
export type FamilyNameContent=EvidenceBackedFamilyNameContent|AuthoredFamilyNameContent;
export type HumanGenerationContentGap=Readonly<{id:string;description:string;blocking:boolean}>;

export type HumanGenerationContentPackageV1=Readonly<{
 version:1;
 compilerId:'human-generation-content.compiler-v1';
 id:string;
 fingerprint:string;
 countryId:string;
 effectiveDate:SimulationDate;
 profileId:string;
 sources:readonly NamingSourceDescriptorV1[];
 givenNameBands:readonly GivenNameBand[];
 familyNames:FamilyNameContent;
 genderPolicy:Readonly<{kind:'fixed';label:string}>;
 intrinsicPolicy:Readonly<{traits:readonly [];temperament:readonly [];aptitudes:readonly []}>;
 limitations:readonly string[];
 gaps:readonly HumanGenerationContentGap[];
}>;

export type HumanGenerationContentManifestEntry=Readonly<{packageId:string;fingerprint:string}>;
export type HumanGenerationContentRegistry=Readonly<{
 version:1;
 packages:readonly HumanGenerationContentPackageV1[];
 manifest:readonly HumanGenerationContentManifestEntry[];
}>;
export type HumanGenerationRequirement=PopulationCohort;
export type HumanGenerationReadiness=Readonly<{
 status:'ready'|'not-ready';
 unresolvedProfileIds:readonly string[];
 blockingReasons:readonly string[];
}>;

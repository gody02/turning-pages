import type {GeographyRuntime} from '../geography/runtime';
import type {SettlementRuntime} from '../geography/settlements/runtime';
import type {GeographicAreaReferenceV1} from '../geography/types';
import type {ResidenceLocationRefV1} from '../residence/types';

export type ResidencePlacementPolicyId=string;
export type ResidencePlacementLocationV1=Exclude<ResidenceLocationRefV1,{kind:'country'}>;
export type ResidencePlacementCandidateV1=Readonly<{location:ResidencePlacementLocationV1;weight:number}>;
export type ResidencePlacementGroupV1=Readonly<{scope:GeographicAreaReferenceV1;candidates:readonly ResidencePlacementCandidateV1[]}>;
export type ResidencePlacementDependencyV1=Readonly<{id:string;fingerprint:string}>;
export type ResidencePlacementPolicyV1=Readonly<{
 version:1;policyId:ResidencePlacementPolicyId;fingerprint:string;
 algorithmId:'residence-placement.weighted-integer-v1';
 dependencies:Readonly<{geographyPartitions:readonly ResidencePlacementDependencyV1[];settlementPackages:readonly ResidencePlacementDependencyV1[]}>;
 groups:readonly ResidencePlacementGroupV1[];
}>;
export type ResidencePlacementPolicyInputV1=Omit<ResidencePlacementPolicyV1,'fingerprint'>;
export type ResidencePlacementManifestEntryV1=Readonly<{policyId:ResidencePlacementPolicyId;fingerprint:string}>;
export type ResidencePlacementRegistryV1=Readonly<{version:1;policies:readonly ResidencePlacementPolicyV1[];manifest:readonly ResidencePlacementManifestEntryV1[]}>;
export type ResidencePlacementContext=Readonly<{geography:GeographyRuntime;settlements:SettlementRuntime}>;
/** Durable request identity only; Person existence/living checks belong to external orchestration. */
export type ResidencePlacementRequestV1=Readonly<{version:1;policyId:ResidencePlacementPolicyId;personId:string;rootSeed:number;scope:GeographicAreaReferenceV1}>;
export type ResidencePlacementDecisionV1=Readonly<{version:1;policyId:ResidencePlacementPolicyId;policyFingerprint:string;requestKey:string;location:ResidencePlacementLocationV1}>;
/** Disposable explanation, never Game authority. Exact tickets use decimal strings. */
export type ResidencePlacementDiagnosticsV1=Readonly<{
 version:1;decision:ResidencePlacementDecisionV1;scope:GeographicAreaReferenceV1;
 candidates:readonly Readonly<{key:string;location:ResidencePlacementLocationV1;weight:number}>[];
 totalMass:number;ticket:string|null;attempts:number;selectedCandidateKey:string;
}>;

import type {SimulationDate} from '../core/model';
import type {Person, PeopleState, PersonLifeStatus} from '../human/person';
import type {ParentageBasis, ParentageRecordV1, KinshipStateV1} from '../kinship/types';
import type {CompositionBirthConstraintV1} from '../householdComposition/types';

export type FamilyCompositionPolicyId = string;
export type FamilyCompositionFingerprint = `fnv1a64-v1:${string}`;
export type FamilySubjectScopeId = string;
export type FamilySubjectSlotId = string;
export type FamilyBindingId = string;
export type FamilyBirthConstraintV1 = CompositionBirthConstraintV1;
export type ExistingPersonSubjectV1 = Readonly<{kind:'existing'; personId:Person['id']}>;
export type TransientPersonSubjectV1 = Readonly<{
  kind:'future'; scopeId:FamilySubjectScopeId; slotId:FamilySubjectSlotId;
}>;
export type FamilySubjectRefV1 = ExistingPersonSubjectV1 | TransientPersonSubjectV1;
export type FamilyPersonFactV1 = Readonly<{
  personId:Person['id']; dateOfBirth:SimulationDate; lifeStatus:PersonLifeStatus;
}>; // derived internally, never trusted instead of supplied valid People
export type FamilyBorrowedSubjectInventoryV1 = Readonly<{
  scopeId:FamilySubjectScopeId;
  producerId:string;
  planFingerprint:FamilyCompositionFingerprint;
  subjects:readonly Readonly<{slotId:FamilySubjectSlotId; birth:FamilyBirthConstraintV1}>[];
}>;
export type FamilyCompositionContextV1 = Readonly<{
  people:PeopleState; kinship:KinshipStateV1;
  borrowedSubjects:readonly FamilyBorrowedSubjectInventoryV1[];
}>;
export type FamilyTemplateSubjectV1 =
  | Readonly<{kind:'binding'; bindingId:FamilyBindingId}>
  | Readonly<{kind:'additional'; slotId:FamilySubjectSlotId}>;
export type FamilyTemplatePredicateV1 =
  | Readonly<{kind:'completed-age-range'; bindingId:FamilyBindingId;
      minimumAge:number; maximumAge:number}>
  | Readonly<{kind:'life-status'; bindingId:FamilyBindingId; lifeStatus:PersonLifeStatus}>;
export type FamilyPolicyProvenanceV1 = Readonly<{
  id:string;
  classification:'observed'|'estimated'|'calibrated'|'assumed'|'authored-gameplay-abstraction';
  sourceIds:readonly string[];
  note:string;
}>; // content lineage; calibrated is not a primary evidence classification
export type FamilyCompositionTemplateV1 = Readonly<{
  id:string; weight:number;
  when:readonly FamilyTemplatePredicateV1[];
  additionalSubjects:readonly Readonly<{slotId:FamilySubjectSlotId; birth:FamilyBirthConstraintV1}>[];
  parentages:readonly Readonly<{
    parent:FamilyTemplateSubjectV1; child:FamilyTemplateSubjectV1;
    bases:readonly ParentageBasis[];
  }>[];
  provenanceIds:readonly string[];
}>;
export type FamilyCompositionPolicyV1 = Readonly<{
  version:1; policyId:FamilyCompositionPolicyId; fingerprint:FamilyCompositionFingerprint;
  algorithmId:'family-composition.weighted-integer-v1';
  eligibility:'declared-facts-and-kinship-union-dag-v1';
  scope:Readonly<{countryId:string|null; effectiveFrom:SimulationDate; effectiveThrough:SimulationDate}>;
  bindings:readonly Readonly<{bindingId:FamilyBindingId; accepts:'existing'|'subject'}>[];
  templates:readonly FamilyCompositionTemplateV1[];
  provenance:readonly FamilyPolicyProvenanceV1[];
  limitations:readonly string[];
}>;
export type FamilyCompositionPolicyInputV1 = Omit<FamilyCompositionPolicyV1,'fingerprint'>;
export type FamilyCompositionManifestEntryV1 = Readonly<{
  policyId:FamilyCompositionPolicyId; fingerprint:FamilyCompositionFingerprint;
}>;
export type FamilyCompositionRegistryV1 = Readonly<{
  version:1; policies:readonly FamilyCompositionPolicyV1[];
  manifest:readonly FamilyCompositionManifestEntryV1[];
}>;
export type FamilyCompositionRequestV1 = Readonly<{
  version:1; policyId:FamilyCompositionPolicyId; requestKey:string; rootSeed:number;
  referenceDate:SimulationDate; countryId:string|null; familyScopeId:FamilySubjectScopeId;
  bindings:readonly Readonly<{bindingId:FamilyBindingId; subject:FamilySubjectRefV1}>[];
}>;
export type PlannedParentageV1 = Readonly<{
  parent:FamilySubjectRefV1; child:FamilySubjectRefV1; bases:readonly ParentageBasis[];
}>;
export type FamilyMaterializationRequirementV1 = Readonly<{
  subject:TransientPersonSubjectV1; birth:FamilyBirthConstraintV1;
  origin:
    | Readonly<{kind:'borrowed'; producerId:string; planFingerprint:FamilyCompositionFingerprint}>
    | Readonly<{kind:'family'; templateId:string}>;
}>;
export type FamilyCompositionPlanV1 = Readonly<{
  version:1; request:FamilyCompositionRequestV1;
  policyFingerprint:FamilyCompositionFingerprint;
  evaluationFingerprint:FamilyCompositionFingerprint;
  templateId:string;
  materializationRequirements:readonly FamilyMaterializationRequirementV1[];
  parentages:readonly PlannedParentageV1[];
}>;
export type FamilyPlanReadinessV1 = Readonly<{
  materialization:Readonly<{
    status:'READY'|'NOT_READY';
    requirements:readonly Readonly<{subject:TransientPersonSubjectV1; status:'unproven'}>[];
    reasons:readonly string[];
  }>;
  application:Readonly<{status:'COMPATIBLE'|'UNRESOLVED'|'INCOMPATIBLE'; reasons:readonly string[]}>;
}>;
export type FamilyCompositionDiagnosticsV1 = Readonly<{
  version:1; plan:FamilyCompositionPlanV1;
  eligibleTemplateIds:readonly string[];
  excludedTemplates:readonly Readonly<{templateId:string; reasons:readonly string[]}>[];
  eligibleMass:number; ticket:string|null; attempts:number;
}>;
export type FamilySubjectResolutionV1 = Readonly<{
  subject:TransientPersonSubjectV1; personId:Person['id'];
}>;
export type ResolvedFamilyPlanV1 = Readonly<{
  version:1; policyId:FamilyCompositionPolicyId;
  policyFingerprint:FamilyCompositionFingerprint;
  evaluationFingerprint:FamilyCompositionFingerprint;
  referenceDate:SimulationDate;
  desiredParentages:readonly ParentageRecordV1[];
  missingParentages:readonly ParentageRecordV1[];
}>; // pure desired/missing truth, no authoritative next state

import type {SimulationDate} from '../core/model';
import type {Person, PeopleState} from '../human/person';
import type {CompositionBirthConstraintV1, HouseholdCompositionPlanV1,
  HouseholdCompositionPolicyV1, HouseholdCompositionContextV1} from '../householdComposition/types';
import type {FamilySubjectRefV1, TransientPersonSubjectV1, ExistingPersonSubjectV1,
  FamilyBorrowedSubjectInventoryV1, FamilyTemplateSubjectV1, FamilyTemplatePredicateV1,
  FamilyPolicyProvenanceV1, FamilySubjectResolutionV1, FamilyCompositionPlanV1,
  FamilyCompositionPolicyV1, FamilyCompositionContextV1} from '../familyComposition/types';
import type {PartnershipRecordV1, PartnershipStateV1} from '../partnership/types';
import type {FormalUnionId, FormalUnionStateV1, FormalUnionKindManifestEntryV1,
  FormalUnionKindRegistryV1, FormalUnionSeparationV1} from '../formalUnion/types';

export type RelationshipSubjectRefV1 = FamilySubjectRefV1;
export type RelationshipExistingSubjectV1 = ExistingPersonSubjectV1;
export type RelationshipFutureSubjectV1 = TransientPersonSubjectV1;
export type RelationshipBirthConstraintV1 = CompositionBirthConstraintV1;
export type RelationshipBorrowedInventoryV1 = FamilyBorrowedSubjectInventoryV1;
export type RelationshipTemplateSubjectV1 = FamilyTemplateSubjectV1;
export type RelationshipTemplatePredicateV1 = FamilyTemplatePredicateV1;
export type RelationshipPolicyProvenanceV1 = FamilyPolicyProvenanceV1;
export type RelationshipSubjectResolutionV1 = FamilySubjectResolutionV1;
export type RelationshipUnionKindRefV1 = FormalUnionKindManifestEntryV1;
export type RelationshipUnionCompositionFingerprint = `fnv1a64-v1:${string}`;
export type RelationshipSubjectPairV1 = readonly [RelationshipSubjectRefV1, RelationshipSubjectRefV1];
export type RelationshipTemplatePairV1 = readonly [RelationshipTemplateSubjectV1, RelationshipTemplateSubjectV1];
export type TransientFormalUnionIdentityV1 = Readonly<{scopeId:string; contractSlotId:string}>;
export type PlannedPartnershipV1 = Readonly<{subjects:RelationshipSubjectPairV1}>;
export type PlannedFormalUnionV1 =
  | Readonly<{kind:'create-contract'; contract:TransientFormalUnionIdentityV1;
      subjects:RelationshipSubjectPairV1; unionKind:RelationshipUnionKindRefV1;
      formedOn:Readonly<SimulationDate>|null; separation:FormalUnionSeparationV1}>
  | Readonly<{kind:'assert-existing'; unionId:FormalUnionId;
      subjects:RelationshipSubjectPairV1; unionKind:RelationshipUnionKindRefV1;
      separation:FormalUnionSeparationV1}>;
export type RelationshipFormalUnionTemplateV1 =
  | Readonly<{kind:'create-contract'; contractSlotId:string; subjects:RelationshipTemplatePairV1;
      unionKind:RelationshipUnionKindRefV1; formedOn:Readonly<SimulationDate>|null;
      separation:FormalUnionSeparationV1}>
  | Readonly<{kind:'assert-existing'; unionBindingId:string; subjects:RelationshipTemplatePairV1;
      unionKind:RelationshipUnionKindRefV1; separation:FormalUnionSeparationV1}>;
export type RelationshipUnionCompositionTemplateV1 = Readonly<{
  id:string; weight:number; when:readonly RelationshipTemplatePredicateV1[];
  additionalSubjects:readonly Readonly<{slotId:string; birth:RelationshipBirthConstraintV1}>[];
  partnerships:readonly Readonly<{subjects:RelationshipTemplatePairV1}>[];
  formalUnions:readonly RelationshipFormalUnionTemplateV1[];
  provenanceIds:readonly string[];
}>;
export type RelationshipUnionCompositionPolicyV1 = Readonly<{
  version:1; policyId:string; fingerprint:RelationshipUnionCompositionFingerprint;
  algorithmId:'relationship-union-composition.weighted-integer-v1';
  eligibility:'declared-person-facts-v1';
  scope:Readonly<{countryId:string|null; effectiveFrom:SimulationDate; effectiveThrough:SimulationDate}>;
  bindings:readonly Readonly<{bindingId:string; accepts:'existing'|'subject'}>[];
  unionBindings:readonly string[];
  templates:readonly RelationshipUnionCompositionTemplateV1[];
  provenance:readonly RelationshipPolicyProvenanceV1[];
  limitations:readonly string[];
}>;
export type RelationshipUnionCompositionPolicyInputV1 = Omit<RelationshipUnionCompositionPolicyV1,'fingerprint'>;
export type RelationshipUnionCompositionManifestEntryV1 = Readonly<{
  policyId:string; fingerprint:RelationshipUnionCompositionFingerprint;
}>;
export type RelationshipUnionCompositionRegistryV1 = Readonly<{
  version:1; policies:readonly RelationshipUnionCompositionPolicyV1[];
  manifest:readonly RelationshipUnionCompositionManifestEntryV1[];
}>;
export type RelationshipUnionCompositionRequestV1 = Readonly<{
  version:1; policyId:string; requestKey:string; rootSeed:number;
  referenceDate:SimulationDate; countryId:string|null; relationshipScopeId:string;
  bindings:readonly Readonly<{bindingId:string; subject:RelationshipSubjectRefV1}>[];
  unionBindings:readonly Readonly<{unionBindingId:string; unionId:FormalUnionId}>[];
}>;
export type RelationshipUnionCompositionContextV1 = Readonly<{
  people:PeopleState; borrowedSubjects:readonly RelationshipBorrowedInventoryV1[];
}>;
export type RelationshipMaterializationRequirementV1 = Readonly<{
  subject:RelationshipFutureSubjectV1; birth:RelationshipBirthConstraintV1;
  origin:
    | Readonly<{kind:'borrowed'; producerId:string; planFingerprint:RelationshipUnionCompositionFingerprint}>
    | Readonly<{kind:'relationship'; templateId:string}>;
}>;
export type RelationshipUnionCompositionPlanV1 = Readonly<{
  version:1; request:RelationshipUnionCompositionRequestV1;
  policyFingerprint:RelationshipUnionCompositionFingerprint;
  evaluationFingerprint:RelationshipUnionCompositionFingerprint;
  planFingerprint:RelationshipUnionCompositionFingerprint;
  templateId:string;
  materializationRequirements:readonly RelationshipMaterializationRequirementV1[];
  partnerships:readonly PlannedPartnershipV1[];
  formalUnions:readonly PlannedFormalUnionV1[];
}>;
export type RelationshipUnionCompositionDiagnosticsV1 = Readonly<{
  version:1; plan:RelationshipUnionCompositionPlanV1; eligibleTemplateIds:readonly string[];
  excludedTemplates:readonly Readonly<{templateId:string; reasons:readonly string[]}>[];
  eligibleMass:number; ticket:string|null; attempts:number;
}>;
export type RelationshipUnionBorrowedSourceV1 =
  | Readonly<{kind:'household'; scopeId:string; plan:HouseholdCompositionPlanV1;
      policy:HouseholdCompositionPolicyV1; context:HouseholdCompositionContextV1}>
  | Readonly<{kind:'family'; plan:FamilyCompositionPlanV1;
      policy:FamilyCompositionPolicyV1; context:FamilyCompositionContextV1}>;
export type RelationshipPartnershipContextV1 = Readonly<{
  people:PeopleState; partnership:PartnershipStateV1; referenceDate:SimulationDate;
}>;
export type RelationshipFormalUnionContextV1 = Readonly<{
  people:PeopleState; formalUnion:FormalUnionStateV1; referenceDate:SimulationDate;
}>;
export type RelationshipUnionCurrentContextV1 = RelationshipPartnershipContextV1 & RelationshipFormalUnionContextV1;
export type RelationshipContractBindingV1 = Readonly<{
  contract:TransientFormalUnionIdentityV1; planFingerprint:RelationshipUnionCompositionFingerprint;
  unionId:FormalUnionId;
}>;
export type RelationshipCompatibilityV1 = Readonly<{
  status:'COMPATIBLE'|'UNRESOLVED'|'INCOMPATIBLE'; reasons:readonly string[];
}>;
export type RelationshipKindResolutionV1 = Readonly<{
  status:'RESOLVED'|'UNRESOLVED'; reasons:readonly string[];
}>;
export type RelationshipUnionCompositionReadinessV1 = Readonly<{
  materialization:Readonly<{status:'READY'|'NOT_READY';
    requirements:readonly Readonly<{subject:RelationshipFutureSubjectV1; status:'unproven'}>[];
    reasons:readonly string[]}>;
  compatibility:Readonly<{partnership:RelationshipCompatibilityV1; formalUnion:RelationshipCompatibilityV1}>;
  kinds:RelationshipKindResolutionV1;
}>;
export type ResolvedFormalUnionIntentV1 =
  | Readonly<{kind:'create-contract'; contract:TransientFormalUnionIdentityV1;
      personIds:readonly [Person['id'],Person['id']]; unionKind:RelationshipUnionKindRefV1;
      formedOn:Readonly<SimulationDate>|null; separation:FormalUnionSeparationV1}>
  | Readonly<{kind:'assert-existing'; unionId:FormalUnionId;
      personIds:readonly [Person['id'],Person['id']]; unionKind:RelationshipUnionKindRefV1;
      separation:FormalUnionSeparationV1}>;
export type RelationshipSatisfiedUnionV1 = Readonly<{
  target:
    | Readonly<{kind:'create-contract'; contract:TransientFormalUnionIdentityV1}>
    | Readonly<{kind:'assert-existing'; unionId:FormalUnionId}>;
  unionId:FormalUnionId;
}>;
export type ResolvedRelationshipUnionPlanV1 = Readonly<{
  version:1; policyId:string; policyFingerprint:RelationshipUnionCompositionFingerprint;
  evaluationFingerprint:RelationshipUnionCompositionFingerprint;
  planFingerprint:RelationshipUnionCompositionFingerprint; referenceDate:SimulationDate;
  desiredPartnerships:readonly PartnershipRecordV1[];
  missingPartnerships:readonly PartnershipRecordV1[];
  desiredFormalUnions:readonly ResolvedFormalUnionIntentV1[];
  missingFormalUnions:readonly Extract<ResolvedFormalUnionIntentV1,{kind:'create-contract'}>[];
  satisfiedFormalUnions:readonly RelationshipSatisfiedUnionV1[];
}>;
export type RelationshipOriginalPlanV1 = Readonly<{
  plan:RelationshipUnionCompositionPlanV1;
  policy:RelationshipUnionCompositionPolicyV1;
  context:RelationshipUnionCompositionContextV1;
}>;

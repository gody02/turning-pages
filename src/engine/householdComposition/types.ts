import type {SimulationDate} from '../core/model';
import type {Person, PeopleState} from '../human/person';
import type {HouseholdStateV1} from '../household/types';

export type HouseholdCompositionPolicyId = string;
export type CompositionBindingId = string;
export type CompositionMemberSlotId = string;
export type CompositionHouseholdSlotId = string;
export type CompositionFingerprint = `fnv1a64-v1:${string}`;
export type CompositionAgeRangeV1 = Readonly<{minimumAge:number; maximumAge:number}>;
export type CompositionBirthConstraintV1 =
  | Readonly<{kind:'any-living'}>
  | Readonly<{kind:'birth-year-range'; minimumYear:number; maximumYear:number}>
  | Readonly<{kind:'completed-age-range'; minimumAge:number; maximumAge:number}>;
export type ExistingPersonAssignmentV1 = Readonly<{bindingId:CompositionBindingId; personId:Person['id']}>;
export type HouseholdMemberRequirementV1 = Readonly<{slotId:CompositionMemberSlotId; birth:CompositionBirthConstraintV1}>;
export type CompositionTemplateMemberRefV1 =
  | Readonly<{kind:'anchor'; bindingId:CompositionBindingId}>
  | Readonly<{kind:'materialize'; slotId:CompositionMemberSlotId}>;
export type CompositionPlanMemberRefV1 =
  | Readonly<{kind:'existing'; personId:Person['id']}>
  | Readonly<{kind:'materialize'; slotId:CompositionMemberSlotId}>;
export type HouseholdCompositionTemplateV1 = Readonly<{
  id:string;
  weight:number;
  when:readonly Readonly<{bindingId:CompositionBindingId; completedAge:CompositionAgeRangeV1}>[];
  additionalMembers:readonly HouseholdMemberRequirementV1[];
  households:readonly Readonly<{householdSlotId:CompositionHouseholdSlotId; members:readonly CompositionTemplateMemberRefV1[]}>[];
}>;
export type HouseholdCompositionPolicyV1 = Readonly<{
  version:1;
  policyId:HouseholdCompositionPolicyId;
  fingerprint:CompositionFingerprint;
  algorithmId:'household-composition.weighted-integer-v1';
  scope:Readonly<{countryId:string|null; effectiveFrom:SimulationDate; effectiveThrough:SimulationDate}>;
  anchorBindings:readonly CompositionBindingId[];
  templates:readonly HouseholdCompositionTemplateV1[];
}>;
export type HouseholdCompositionPolicyInputV1 = Omit<HouseholdCompositionPolicyV1,'fingerprint'>;
export type HouseholdCompositionManifestEntryV1 = Readonly<{policyId:HouseholdCompositionPolicyId; fingerprint:CompositionFingerprint}>;
export type HouseholdCompositionRegistryV1 = Readonly<{
  version:1;
  policies:readonly HouseholdCompositionPolicyV1[];
  manifest:readonly HouseholdCompositionManifestEntryV1[];
}>;
export type HouseholdCompositionRequestV1 = Readonly<{
  version:1;
  policyId:HouseholdCompositionPolicyId;
  requestKey:string;
  rootSeed:number;
  referenceDate:SimulationDate;
  countryId:string|null;
  anchors:readonly ExistingPersonAssignmentV1[];
}>;
export type HouseholdCompositionContextV1 = Readonly<{people:PeopleState; household:HouseholdStateV1}>;
export type HouseholdCompositionPlanV1 = Readonly<{
  version:1;
  request:HouseholdCompositionRequestV1;
  policyFingerprint:CompositionFingerprint;
  requestFingerprint:CompositionFingerprint;
  templateId:string;
  additionalMembers:readonly HouseholdMemberRequirementV1[];
  households:readonly Readonly<{householdSlotId:CompositionHouseholdSlotId; members:readonly CompositionPlanMemberRefV1[]}>[];
}>;
export type HouseholdCompositionDiagnosticsV1 = Readonly<{
  version:1;
  plan:HouseholdCompositionPlanV1;
  eligibleTemplateIds:readonly string[];
  eligibleMass:number;
  ticket:string|null;
  attempts:number;
}>;
/** Boundary metadata only: v1 accepts no materialization proof or inventory. */
export type HouseholdCompositionReadinessV1 = Readonly<{
  status:'READY'|'NOT_READY';
  requirements:readonly Readonly<{slotId:CompositionMemberSlotId; status:'unproven'}>[];
  reasons:readonly string[];
}>;

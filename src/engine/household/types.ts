import type {Person,PeopleState} from '../human/person';

export type HouseholdId=string;
export type HouseholdPersonId=Person['id'];
export type HouseholdRecordV1=Readonly<{id:HouseholdId;sequence:number}>;
export type HouseholdMembershipV1=Readonly<{personId:HouseholdPersonId;householdId:HouseholdId}>;
export type HouseholdStateV1=Readonly<{
  version:1;
  nextSequence:number;
  households:readonly HouseholdRecordV1[];
  memberships:readonly HouseholdMembershipV1[];
}>;
export type HouseholdValidationContext=Readonly<{people:PeopleState}>;
export type HouseholdCreationResultV1=Readonly<{state:HouseholdStateV1;household:HouseholdRecordV1}>;

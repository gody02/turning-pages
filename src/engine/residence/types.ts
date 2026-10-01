import type {GeographicAreaReferenceV1} from '../geography/types';
import type {Person} from '../human/person';

export type ResidenceId=string;
export type PersonId=Person['id'];

export type SettlementReferenceV1=Readonly<{
 version:1;
 packageId:string;
 settlementId:string;
}>;

export type ResidenceLocationRefV1=
 | Readonly<{kind:'country';countryId:string}>
 | Readonly<{kind:'administrative-area';administrativeArea:GeographicAreaReferenceV1}>
 | Readonly<{kind:'settlement-area';administrativeArea:GeographicAreaReferenceV1;settlement:SettlementReferenceV1}>;

export type ResidenceRecordV1=Readonly<{
 id:ResidenceId;
 sequence:number;
 location:ResidenceLocationRefV1;
}>;

export type ResidenceOccupantV1=Readonly<{
 personId:PersonId;
 residenceId:ResidenceId;
}>;

export type ResidenceStateV1=Readonly<{
 version:1;
 nextSequence:number;
 residences:readonly ResidenceRecordV1[];
 occupants:readonly ResidenceOccupantV1[];
 noFixedAbodePersonIds:readonly PersonId[];
}>;

import type {Person,PeopleState} from '../human/person';
import type {SimulationDate} from '../core/model';
export type CarePersonId = Person['id'];
export type CareRoleV1 = 'unspecified' | 'principal';
export type CareRecordV1 = Readonly<{
  caregiverId: CarePersonId;
  recipientId: CarePersonId;
  role: CareRoleV1;
}>;
export type CareStateV1 = Readonly<{
  version: 1;
  responsibilities: readonly CareRecordV1[];
}>;
export type CareValidationContext = Readonly<{
  people: PeopleState;
  referenceDate: Readonly<SimulationDate>;
}>;

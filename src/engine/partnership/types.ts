import type {Person, PeopleState} from '../human/person';
import type {SimulationDate} from '../core/model';

export type PartnershipPersonId = Person['id'];
export type PartnershipRecordV1 = Readonly<{
  personIds: readonly [PartnershipPersonId, PartnershipPersonId];
}>;
export type PartnershipStateV1 = Readonly<{
  version: 1;
  partnerships: readonly PartnershipRecordV1[];
}>;
export type PartnershipValidationContext = Readonly<{
  people: PeopleState;
  referenceDate: Readonly<SimulationDate>;
}>;

import type {Person,PeopleState} from '../human/person';
import type {SimulationDate} from '../core/model';
export type GuardianshipPersonId = Person['id'];
export type GuardianshipId = string; // canonical guardianship:n, positive safe n
export type GuardianshipKindId = string; // namespaced, immutable, versioned
export type GuardianshipKindFingerprint = `fnv1a64-v1:${string}`;
export type GuardianshipKindDefinitionV1 = Readonly<{
  version: 1;
  kindId: GuardianshipKindId;
  fingerprint: GuardianshipKindFingerprint;
  label: string;
  definition: string;
  jurisdictionId: string | null;
  classification: 'statutory-institutional-rule' | 'authored-gameplay-abstraction';
  sourceIds: readonly string[];
  limitations: readonly string[];
}>;
export type GuardianshipKindInputV1 = Omit<GuardianshipKindDefinitionV1, 'fingerprint'>;
export type GuardianshipKindManifestEntryV1 = Readonly<{
  kindId: GuardianshipKindId;
  fingerprint: GuardianshipKindFingerprint;
}>;
export type GuardianshipKindRegistryV1 = Readonly<{
  version: 1;
  kinds: readonly GuardianshipKindDefinitionV1[];
  manifest: readonly GuardianshipKindManifestEntryV1[];
}>;
export type GuardianshipBasisV1 =
  | Readonly<{kind: 'unspecified'}>
  | Readonly<{
      kind: 'source-reference'; sourceId: string; recordId: string;
      instrumentId: string | null;
    }>
  | Readonly<{kind: 'authored-assertion'; assertionId: string}>;
export type GuardianshipStandingV1 =
  | Readonly<{kind: 'in-force'}>
  | Readonly<{kind: 'ended'; endedOn: Readonly<SimulationDate> | null}>;
export type GuardianshipRecordV1 = Readonly<{
  id: GuardianshipId;
  sequence: number;
  holderId: GuardianshipPersonId;
  protectedPersonId: GuardianshipPersonId;
  authorityKind: GuardianshipKindManifestEntryV1;
  basis: GuardianshipBasisV1;
  beganOn: Readonly<SimulationDate> | null;
  standing: GuardianshipStandingV1;
}>;
export type GuardianshipStateV1 = Readonly<{
  version: 1;
  nextSequence: number;
  guardianships: readonly GuardianshipRecordV1[];
}>;
export type GuardianshipInputV1 = Readonly<{
  holderId: GuardianshipPersonId;
  protectedPersonId: GuardianshipPersonId;
  authorityKind: GuardianshipKindManifestEntryV1;
  basis: GuardianshipBasisV1;
  beganOn: Readonly<SimulationDate> | null;
}>;
export type GuardianshipEndV1 = Readonly<{endedOn: Readonly<SimulationDate> | null}>;
export type GuardianshipValidationContext = Readonly<{
  people: PeopleState;
  referenceDate: Readonly<SimulationDate>;
  kinds: GuardianshipKindRegistryV1;
}>;
export type GuardianshipCreationResultV1 = Readonly<{
  state: GuardianshipStateV1;
  guardianship: GuardianshipRecordV1;
}>;

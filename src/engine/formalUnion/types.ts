import type {Person, PeopleState} from '../human/person';
import type {SimulationDate} from '../core/model';

export type FormalUnionPersonId = Person['id'];
export type FormalUnionId = string;
export type FormalUnionKindId = string;
export type FormalUnionKindFingerprint = `fnv1a64-v1:${string}`;
export type FormalUnionKindDefinitionV1 = Readonly<{
  version: 1;
  kindId: FormalUnionKindId;
  fingerprint: FormalUnionKindFingerprint;
  label: string;
  definition: string;
  jurisdictionId: string | null;
  classification: 'statutory-institutional-rule' | 'authored-gameplay-abstraction';
  sourceIds: readonly string[];
  limitations: readonly string[];
}>;
export type FormalUnionKindInputV1 = Omit<FormalUnionKindDefinitionV1, 'fingerprint'>;
export type FormalUnionKindManifestEntryV1 = Readonly<{
  kindId: FormalUnionKindId;
  fingerprint: FormalUnionKindFingerprint;
}>;
export type FormalUnionKindRegistryV1 = Readonly<{
  version: 1;
  kinds: readonly FormalUnionKindDefinitionV1[];
  manifest: readonly FormalUnionKindManifestEntryV1[];
}>;
export type FormalUnionSeparationV1 = 'unknown' | 'not-separated' | 'separated';
export type FormalUnionEndV1 =
  | Readonly<{reason: 'dissolution' | 'annulment'; endedOn: Readonly<SimulationDate> | null}>
  | Readonly<{
      reason: 'death'; endedOn: Readonly<SimulationDate> | null;
      deceasedPersonId: FormalUnionPersonId;
    }>;
export type FormalUnionStandingV1 =
  | Readonly<{kind: 'in-force'; separation: FormalUnionSeparationV1}>
  | Readonly<{kind: 'ended'; end: FormalUnionEndV1}>;
export type FormalUnionRecordV1 = Readonly<{
  id: FormalUnionId;
  sequence: number;
  personIds: readonly [FormalUnionPersonId, FormalUnionPersonId];
  kindId: FormalUnionKindId;
  formedOn: Readonly<SimulationDate> | null;
  standing: FormalUnionStandingV1;
}>;
export type FormalUnionStateV1 = Readonly<{
  version: 1;
  nextSequence: number;
  unions: readonly FormalUnionRecordV1[];
}>;
export type FormalUnionInputV1 = Readonly<{
  personIds: readonly [FormalUnionPersonId, FormalUnionPersonId];
  kindId: FormalUnionKindId;
  formedOn: Readonly<SimulationDate> | null;
}>;
export type FormalUnionValidationContext = Readonly<{
  people: PeopleState;
  referenceDate: Readonly<SimulationDate>;
  kinds: FormalUnionKindRegistryV1;
}>;
export type FormalUnionCreationResultV1 = Readonly<{
  state: FormalUnionStateV1;
  union: FormalUnionRecordV1;
}>;

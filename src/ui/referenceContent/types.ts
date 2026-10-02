import type {GameContentContext} from '../../engine/gameContent';
import type {GeographyRegistryV1} from '../../engine/geography/types';
import type {SettlementRegistryV1} from '../../engine/geography/settlements/types';

export type ExactReferenceContentSetV1=Readonly<{
  version:1;
  geography:readonly Readonly<{partitionId:string;fingerprint:string}>[];
  settlements:readonly Readonly<{packageId:string;fingerprint:string}>[];
}>;
/** Offset tables are plain runtime derivatives, never fields on canonical packages. */
export type OffsetTable=readonly (readonly [string,number])[];
export type GroupTable=readonly (readonly [string,readonly number[]])[];
export type PreparedReferenceData=Readonly<{
  geography:GeographyRegistryV1;
  settlements:SettlementRegistryV1;
  indexes:Readonly<{
    identities:OffsetTable;
    geography:readonly Readonly<{partitionId:string;nodes:OffsetTable;children:GroupTable}>[];
    settlements:readonly Readonly<{packageId:string;nodes:OffsetTable;relations:GroupTable;areas:GroupTable}>[];
  }>;
}>;
export type ReferencePreparationMetrics=Readonly<{
  importMs:number;prepareMs:number;payloadBytes:number;emittedAt:number;
}>;
export type ReferenceContentDiagnostics=Readonly<{
  activeWorkers:number;cachedSets:number;pendingSets:number;preparations:number;
  last?:Readonly<ReferencePreparationMetrics&{handoffMs:number;resolverPublicationMs:number;referenceContentReadyMs:number}>;
}>;
export type ApplicationReferenceContentService=Readonly<{
  prepare:(exactSet:ExactReferenceContentSetV1,options?:Readonly<{signal?:AbortSignal}>)=>Promise<GameContentContext>;
  peek:(exactSet:ExactReferenceContentSetV1)=>GameContentContext|undefined;
  dispose:()=>void;
  diagnostics:()=>ReferenceContentDiagnostics;
}>;
export type ContentWorker={
  postMessage:Worker['postMessage'];terminate:()=>void;
  onmessage:OmitThisParameter<NonNullable<Worker['onmessage']>>|null;
  onerror:OmitThisParameter<NonNullable<Worker['onerror']>>|null;
  onmessageerror:OmitThisParameter<NonNullable<Worker['onmessageerror']>>|null;
};

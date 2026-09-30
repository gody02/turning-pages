import type {SimulationDate} from '../core/model';

export type SimulationRunKind='personal'|'world'|'political'|'kernel-fixture';
export type SimulationFailureCode='invariant'|'transition'|'stall'|'step-limit'|'checkpoint'|'autopilot';
export type SimulationWarningCode='boundary-saturation'|'banking-distress'|'growth'|'political-stagnation'|'save-size';

export type SimulationInvariantFailure={
  code:SimulationFailureCode;
  invariant:string;
  message:string;
  profileId:string;
  runKind:SimulationRunKind;
  rootSeed:number;
  runIndex:number;
  step:number;
  date?:SimulationDate;
  nationalMonth?:number;
  politicalMonth?:number;
  lastAction?:string;
  checkpointId?:string;
  observed?:Readonly<Record<string,number|string|boolean|null>>;
};

export type SimulationWarning={
  code:SimulationWarningCode;
  message:string;
  step:number;
  date?:SimulationDate;
  observed?:Readonly<Record<string,number|string|boolean|null>>;
};

export type SimulationMetrics={
  steps:number;
  simulatedMonths:number;
  durationMs:number;
  millisecondsPerStep:number;
  initialSaveBytes?:number;
  finalSaveBytes?:number;
  maximumSaveBytes?:number;
  saveSamples:readonly {readonly checkpointId:string;readonly step:number;readonly bytes:number}[];
};

export type SimulationRunResult={
  profileId:string;
  runKind:SimulationRunKind;
  rootSeed:number;
  runIndex:number;
  terminal:'completed'|'failed';
  finalDate?:SimulationDate;
  finalNationalMonth?:number;
  finalPoliticalMonth?:number;
  failure?:SimulationInvariantFailure;
  warnings:readonly SimulationWarning[];
  metrics:SimulationMetrics;
};

export type SimulationSuiteResult={
  profileId:string;
  runKind:SimulationRunKind;
  runs:readonly SimulationRunResult[];
  metrics:{readonly durationMs:number;readonly slowestSeed:number|undefined;readonly slowestDurationMs:number};
};

export const formatSimulationFailure=(failure:SimulationInvariantFailure)=>[
  `Profile: ${failure.profileId}`,
  `Kind: ${failure.runKind}`,
  `Seed: ${failure.rootSeed} (run ${failure.runIndex})`,
  `Step: ${failure.step}`,
  ...(failure.date?[`Date: ${failure.date.year}-${String(failure.date.month).padStart(2,'0')}-${String(failure.date.day).padStart(2,'0')}`]:[]),
  ...(failure.nationalMonth===undefined?[]:[`National month: ${failure.nationalMonth}`]),
  ...(failure.politicalMonth===undefined?[]:[`Political month: ${failure.politicalMonth}`]),
  ...(failure.lastAction?[`Last action: ${failure.lastAction}`]:[]),
  ...(failure.checkpointId?[`Checkpoint: ${failure.checkpointId}`]:[]),
  `Failure: ${failure.invariant} — ${failure.message}`,
  ...(failure.observed?[`Observed: ${JSON.stringify(failure.observed)}`]:[]),
].join('\n');

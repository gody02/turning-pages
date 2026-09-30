import type {SimulationDate} from '../core/model';
import type {SimulationInvariantFailure,SimulationRunKind,SimulationRunResult,SimulationSuiteResult,SimulationWarning} from '../diagnostics/simulation';

export type SimulationRunContext={readonly profileId:string;readonly runKind:SimulationRunKind;readonly rootSeed:number;readonly runIndex:number;readonly step:number;readonly lastAction?:string;readonly checkpointId?:string};
export type SimulationStepResult<State>={state:State;actionId:string};
export type SimulationCheckpoint<State>={state:State;id:string;bytes?:number};
export type SimulationProfile<State>={
  id:string;
  runKind:SimulationRunKind;
  seeds:readonly number[];
  maxSteps:number;
  validationEvery:number;
  checkpointEvery?:number;
  shouldCheckpoint?:(state:State,context:SimulationRunContext)=>boolean;
  create:(seed:number)=>State;
  step:(state:State,context:SimulationRunContext)=>SimulationStepResult<State>;
  terminal:(state:State)=>boolean;
  date?:(state:State)=>SimulationDate|undefined;
  months?:(state:State)=>number;
  location?:(state:State)=>{nationalMonth?:number;politicalMonth?:number};
  validate:(state:State,context:SimulationRunContext)=>readonly Omit<SimulationInvariantFailure,'profileId'|'runKind'|'rootSeed'|'runIndex'|'step'|'date'|'checkpointId'|'lastAction'>[];
  observe?:(state:State,context:SimulationRunContext)=>readonly SimulationWarning[];
  checkpoint?:(state:State,context:SimulationRunContext)=>SimulationCheckpoint<State>;
};

export type SimulationExecution<State>={result:SimulationRunResult;state:State};
const now=()=>performance.now();
const contextFor=(profileId:string,runKind:SimulationRunKind,rootSeed:number,runIndex:number,step:number,lastAction?:string,checkpointId?:string):SimulationRunContext=>({profileId,runKind,rootSeed,runIndex,step,lastAction,checkpointId});
const failureFor=(profileId:string,runKind:SimulationRunKind,rootSeed:number,runIndex:number,step:number,invariant:string,message:string,code:SimulationInvariantFailure['code'],stateDate?:SimulationDate,lastAction?:string,checkpointId?:string,observed?:SimulationInvariantFailure['observed']):SimulationInvariantFailure=>({profileId,runKind,rootSeed,runIndex,step,invariant,message,code,date:stateDate,lastAction,checkpointId,observed});

export const seedRange=(start:number,count:number):readonly number[]=>{
  if(!Number.isInteger(start)||start<0||start>0xffffffff||!Number.isInteger(count)||count<0||count>0x100000000-start)throw Error('Invalid simulation seed range.');
  return Array.from({length:count},(_,index)=>(start+index)>>>0);
};

export function runSimulation<State>(profile:SimulationProfile<State>,rootSeed:number,runIndex=0):SimulationExecution<State>{
  const started=now();let state=profile.create(rootSeed),step=0,lastAction:string|undefined,checkpointId:string|undefined;
  let initialSaveBytes:number|undefined,maximumSaveBytes:number|undefined,finalSaveBytes:number|undefined;
  const samples:{checkpointId:string;step:number;bytes:number}[]=[];const warnings:SimulationWarning[]=[];
  const complete=(terminal:SimulationRunResult['terminal'],failure?:SimulationInvariantFailure):SimulationExecution<State>=>{
    const durationMs=now()-started,metrics={steps:step,simulatedMonths:profile.months?.(state)??step,durationMs,millisecondsPerStep:step?durationMs/step:0,...(initialSaveBytes===undefined?{}:{initialSaveBytes}),...(finalSaveBytes===undefined?{}:{finalSaveBytes}),...(maximumSaveBytes===undefined?{}:{maximumSaveBytes}),saveSamples:samples};
    const location=profile.location?.(state),reportedFailure=failure?{...failure,...location}:undefined;
    return {state,result:{profileId:profile.id,runKind:profile.runKind,rootSeed,runIndex,terminal,finalDate:profile.date?.(state),...(location?.nationalMonth===undefined?{}:{finalNationalMonth:location.nationalMonth}),...(location?.politicalMonth===undefined?{}:{finalPoliticalMonth:location.politicalMonth}),...(reportedFailure?{failure:reportedFailure}:{}),warnings,metrics}};
  };
  const validate=()=>{
    const context=contextFor(profile.id,profile.runKind,rootSeed,runIndex,step,lastAction,checkpointId),issues=profile.validate(state,context);
    if(!issues.length)return undefined;
    const issue=issues[0];return failureFor(profile.id,profile.runKind,rootSeed,runIndex,step,issue.invariant,issue.message,issue.code,profile.date?.(state),lastAction,checkpointId,issue.observed);
  };
  const collect=()=>{warnings.push(...(profile.observe?.(state,contextFor(profile.id,profile.runKind,rootSeed,runIndex,step,lastAction,checkpointId))??[]));};
  const checkpoint=(force=false):SimulationInvariantFailure|undefined=>{
    const checkpointContext=contextFor(profile.id,profile.runKind,rootSeed,runIndex,step,lastAction,checkpointId),due=force||(profile.shouldCheckpoint?.(state,checkpointContext)??!!(profile.checkpointEvery&&step%profile.checkpointEvery===0));
    if(!profile.checkpoint||!due)return undefined;
    try{const saved=profile.checkpoint(state,checkpointContext);state=saved.state;checkpointId=saved.id;if(saved.bytes!==undefined){const priorMaximum=maximumSaveBytes??0;initialSaveBytes??=saved.bytes;finalSaveBytes=saved.bytes;maximumSaveBytes=Math.max(priorMaximum,saved.bytes);samples.push({checkpointId,step,bytes:saved.bytes});for(const band of [1,2,4,8])if(priorMaximum<band*1024*1024&&saved.bytes>=band*1024*1024)warnings.push({code:'save-size',message:`Canonical save crossed the ${band} MiB observation band.`,step,date:profile.date?.(state),observed:{bytes:saved.bytes,bandMiB:band}});}}
    catch(error){return failureFor(profile.id,profile.runKind,rootSeed,runIndex,step,'checkpoint',error instanceof Error?error.message:'Checkpoint failed.','checkpoint',profile.date?.(state),lastAction,checkpointId);}
    return undefined;
  };
  const initialFailure=validate()??checkpoint(true);if(initialFailure)return complete('failed',initialFailure);collect();
  while(!profile.terminal(state)){
    if(step>=profile.maxSteps)return complete('failed',failureFor(profile.id,profile.runKind,rootSeed,runIndex,step,'step-limit','The simulation did not reach an allowed terminal state before its step limit.','step-limit',profile.date?.(state),lastAction,checkpointId));
    try{const next=profile.step(state,contextFor(profile.id,profile.runKind,rootSeed,runIndex,step,lastAction,checkpointId));if(next.state===state)return complete('failed',failureFor(profile.id,profile.runKind,rootSeed,runIndex,step,'progression-stall','A simulation transition returned the same state without reaching a terminal condition.','stall',profile.date?.(state),next.actionId,checkpointId));state=next.state;lastAction=next.actionId;step++;}
    catch(error){return complete('failed',failureFor(profile.id,profile.runKind,rootSeed,runIndex,step,'transition',error instanceof Error?error.message:'Unknown transition failure.','transition',profile.date?.(state),lastAction,checkpointId));}
    if(step%profile.validationEvery===0){const issue=validate();if(issue)return complete('failed',issue);collect();}
    const checkpointFailure=checkpoint();if(checkpointFailure)return complete('failed',checkpointFailure);
  }
  const finalFailure=validate()??checkpoint(true);if(finalFailure)return complete('failed',finalFailure);if(step>0&&step%profile.validationEvery!==0)collect();return complete('completed');
}

export function runSimulationSuite<State>(profile:SimulationProfile<State>):SimulationSuiteResult{
  const started=now(),runs=profile.seeds.map((seed,index)=>runSimulation(profile,seed,index).result),slowest=runs.reduce<SimulationRunResult|undefined>((current,run)=>!current||run.metrics.durationMs>current.metrics.durationMs?run:current,undefined);
  return {profileId:profile.id,runKind:profile.runKind,runs,metrics:{durationMs:now()-started,slowestSeed:slowest?.rootSeed,slowestDurationMs:slowest?.metrics.durationMs??0}};
}

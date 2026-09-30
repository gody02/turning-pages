import {describe,expect,it} from 'vitest';
import {events} from '../../data/events';
import {politicalEvents} from '../../data/politics';
import {SIMULATION_START_DATE} from '../core/clock';
import {recordHistoryFact,createHistory} from '../core/history';
import {createScheduler,schedule,takeDue} from '../core/scheduler';
import {serializeGame} from '../save';
import {bankingRepairRegressionProfile,personalProfile,politicsProfile,selectStableChoice,ukWorldProfile} from './simulationProfiles';
import {runSimulation,runSimulationSuite,seedRange,type SimulationProfile} from './simulationRunner';

describe('deterministic simulation harness',()=>{
  it('gives every life and political choice a stable unique identity',()=>{
    for(const event of [...events,...politicalEvents]){const ids=event.choices.map(choice=>choice.id);expect(ids.every(Boolean)).toBe(true);expect(new Set(ids).size).toBe(ids.length);}
  });

  it('chooses by stable ID rather than presentation order and consumes no simulation RNG',()=>{
    const event=events.find(candidate=>candidate.id==='ordinary')!,before=structuredClone(event.choices),selected=selectStableChoice(event.choices,0),reversed=selectStableChoice([...event.choices].reverse(),0);
    expect(selected?.id).toBe(reversed?.id);expect(event.choices).toEqual(before);
  });

  it('has deterministic explicit seed ranges',()=>{
    expect(seedRange(7,4)).toEqual([7,8,9,10]);expect(()=>seedRange(-1,1)).toThrow();expect(()=>seedRange(0xffffffff,2)).toThrow();
  });

  it('reports limit, warning and terminal behavior without treating warnings as failures',()=>{
    const profile:SimulationProfile<number>={
      id:'test.runner',runKind:'kernel-fixture',seeds:[3],maxSteps:3,validationEvery:1,create:()=>0,
      step:state=>({state:state+1,actionId:'test.step'}),terminal:state=>state===2,
      validate:()=>[],observe:(_state,context)=>context.step===1?[{code:'growth',message:'Test warning.',step:context.step}]:[],
    };
    const passed=runSimulation(profile,3).result;expect(passed.terminal).toBe('completed');expect(passed.warnings).toHaveLength(1);
    const limited=runSimulation({...profile,maxSteps:1,terminal:()=>false},3).result;expect(limited.failure?.code).toBe('step-limit');
    const observed=runSimulation({...profile,terminal:state=>state===1,observe:(_state,context)=>[{code:'growth',message:'Observed once per visited state.',step:context.step}]},3).result;
    expect(observed.warnings).toHaveLength(2);
    expect(personalProfile(seedRange(0,101),false).id).toBe('personal-deep');
  });

  it('preserves personal checkpoint continuation and deterministic save metrics',()=>{
    const uninterrupted=runSimulation(personalProfile([17],false),17),checkpointed=runSimulation(personalProfile([17],true),17);
    expect(uninterrupted.result.terminal).toBe('completed');expect(checkpointed.result.terminal).toBe('completed');
    const a=serializeGame(uninterrupted.state),b=serializeGame(checkpointed.state);expect(a.ok&&b.ok).toBe(true);if(a.ok&&b.ok)expect(b.raw).toBe(a.raw);
    expect(checkpointed.result.metrics.maximumSaveBytes).toBeGreaterThan(0);
  },15000);

  it('replays the same political seed with the same result and does not create a second world progression path',()=>{
    const profile=politicsProfile([4],1,true),one=runSimulation(profile,4),two=runSimulation(profile,4);
    expect(one.result.terminal).toBe('completed');expect(two.result.terminal).toBe('completed');
    const a=serializeGame(one.state),b=serializeGame(two.state);expect(a.ok&&b.ok).toBe(true);if(a.ok&&b.ok)expect(a.raw).toBe(b.raw);
    expect(one.state.ukWorld!.national.month).toBe(one.state.politics!.months);
  },15000);

  it('runs the bounded UK-world profile through the real monthly transition',()=>{
    const result=runSimulation(ukWorldProfile([2],1,true),2).result;
    expect(result.terminal).toBe('completed');expect(result.finalNationalMonth).toBe(12);expect(result.metrics.maximumSaveBytes).toBeGreaterThan(0);
  });

  it('keeps Scheduler recurrence and History identity deterministic in isolated test-only fixtures',()=>{
    let scheduler=createScheduler();scheduler=schedule(scheduler,SIMULATION_START_DATE,{owner:'test.harness',kind:'recurrence',dueDate:{year:2026,month:10,day:1},recurrence:{unit:'month',interval:1}}).state;
    const due=takeDue(scheduler,{year:2026,month:12,day:1});expect(due.occurrences.map(item=>item.occurrence)).toEqual([0,1,2]);
    const history=recordHistoryFact(createHistory(),SIMULATION_START_DATE,{type:'test.fixture',source:'test.harness'}).history;expect(history.facts[0].id).toBe('history:1');
  });

  it('keeps the repaired banking horizon valid beyond the former failure',()=>{
    const result=runSimulation(bankingRepairRegressionProfile(),4_829_914).result;
    expect(result.terminal).toBe('completed');expect(result.failure).toBeUndefined();expect(result.finalNationalMonth).toBe(900);
  },15000);

  it('returns compact suite metrics without adding output to saves',()=>{
    const suite=runSimulationSuite(ukWorldProfile([0,1],1,false));expect(suite.runs.every(run=>run.terminal==='completed')).toBe(true);expect(suite.metrics.slowestSeed).toBeDefined();
  });
});

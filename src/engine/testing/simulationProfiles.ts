import {events} from '../../data/events';
import {politicalEvents} from '../../data/politics';
import {compareDates,addMonths,addYears,ageOn,isSimulationDate,SIMULATION_START_DATE} from '../core/clock';
import type {SimulationDate} from '../core/model';
import {validHistory} from '../core/history';
import {isJsonValue} from '../core/json';
import {validRandomness} from '../core/rng';
import {validScheduler} from '../core/scheduler';
import {validLife} from '../core/validation';
import type {SimulationInvariantFailure,SimulationWarning} from '../diagnostics/simulation';
import {advanceMonth,adultStart,ageUp,choose,createGame} from '../simulation';
import {isGame,parseGame,serializeGame} from '../save';
import type {Game} from '../types';
import {advanceUKWorldMonth,createUKWorld,validUKWorld,type UKWorldState} from '../ukWorld';
import {advanceNational,createNational,type NationalState} from '../politics/uk/national';
import {validNational} from '../politics/uk/nationalSave';
import {ensureInstitutions} from '../politics/uk/institutions';
import {validInstitutions} from '../politics/uk/institutionsSave';
import {bankAssets,bankLiabilities,type Bank} from '../systems/banking';
import {choosePoliticalEvent,joinPolitics,politicalTask} from '../politics';
import {validPolitics} from '../politicsSave';
import {validTown} from '../townSave';
import type {SimulationProfile,SimulationRunContext,SimulationStepResult} from './simulationRunner';
import {seedRange} from './simulationRunner';

type Issue=Omit<SimulationInvariantFailure,'profileId'|'runKind'|'rootSeed'|'runIndex'|'step'|'date'|'checkpointId'|'lastAction'>;
const issue=(invariant:string,message:string,observed?:Issue['observed']):Issue=>({code:'invariant',invariant,message,observed});
const codePoint=(left:string,right:string)=>left<right?-1:left>right?1:0;
const affordable=(money:number,effects:{money?:number})=>(effects.money??0)>=-Math.max(0,money);

export const selectStableChoice=<Choice extends {id:string;effects:{money?:number}}>(choices:readonly Choice[],money:number):{id:string;index:number}|undefined=>{
  const indexed=choices.map((choice,index)=>({choice,index})).filter(({choice})=>affordable(money,choice.effects)).sort((left,right)=>codePoint(left.choice.id,right.choice.id));
  return indexed[0]&&{id:indexed[0].choice.id,index:indexed[0].index};
};

const choiceStep=(game:Game):SimulationStepResult<Game>|undefined=>{
  if(game.pending){const event=events.find(candidate=>candidate.id===game.pending),selected=event&&selectStableChoice(event.choices,game.money);if(!event||!selected)throw Error(`No eligible stable life choice for ${game.pending}.`);const next=choose(game,selected.index);if(next===game)throw Error(`Life choice ${selected.id} was rejected.`);return {state:next,actionId:`life-choice:${event.id}:${selected.id}`};}
  if(game.politics?.pending){const event=politicalEvents.find(candidate=>candidate.id===game.politics!.pending),selected=event&&selectStableChoice(event.choices,game.money);if(!event||!selected)throw Error(`No eligible stable political choice for ${game.politics.pending}.`);const next=choosePoliticalEvent(game,selected.index);if(next===game)throw Error(`Political choice ${selected.id} was rejected.`);return {state:next,actionId:`political-choice:${event.id}:${selected.id}`};}
  return undefined;
};

const noCursorRegression=(before:Game,after:Game)=>Object.entries(before.randomness?.streams??{}).every(([name,stream])=>(after.randomness?.streams[name]?.cursor??-1)>=stream.cursor);
const assertDate=(before:Game,after:Game,expected:'month'|'year')=>{
  const target=expected==='month'?addMonths(before.clock!.date,1):addYears(before.clock!.date,1);
  if(compareDates(after.clock!.date,target)!==0)throw Error(`Clock did not advance by one ${expected}.`);
  if(ageOn(after.dateOfBirth!,after.clock!.date)!==after.age)throw Error('Age is no longer derived from date of birth and Clock.');
  if(!noCursorRegression(before,after))throw Error('A deterministic RNG cursor regressed.');
};

const gameIssues=(game:Game):readonly Issue[]=>{
  const failures:Issue[]=[];
  if(!isJsonValue(game))failures.push(issue('plain-json','The game contains unsupported or non-finite persisted data.'));
  if(!validLife(game))failures.push(issue('life','LifeState validation failed.'));
  if(!isGame(game))failures.push(issue('game','Combined game validation failed.'));
  if(!isSimulationDate(game.clock?.date)||!isSimulationDate(game.dateOfBirth)||ageOn(game.dateOfBirth,game.clock.date)!==game.age)failures.push(issue('clock','The canonical Clock/date-of-birth relationship is invalid.'));
  if(game.randomness&&!validRandomness(game.randomness))failures.push(issue('rng','Randomness validation failed.'));
  if(game.scheduler&&!validScheduler(game.scheduler))failures.push(issue('scheduler','Scheduler validation failed.'));
  if(game.history&&!validHistory(game.history,game.clock?.date))failures.push(issue('history','History validation failed.'));
  if(game.ukWorld&&!validUKWorld(game.ukWorld,validNational))failures.push(issue('uk-world','UK world validation failed.'));
  if(game.ukWorld?.national.institutions&&!validInstitutions(game.ukWorld.national.institutions,game.ukWorld.national.month))failures.push(issue('institutions','Institution validation failed.'));
  if(game.politics&&(!validPolitics(game.politics,game.age,game.country)||!validTown(game.politics.economy,1200)))failures.push(issue('politics','Political or Mereford validation failed.'));
  return failures;
};

const warningForNation=(national:NationalState,step:number,date?:SimulationDate):readonly SimulationWarning[]=>{
  const warnings:SimulationWarning[]=[];
  if(national.institutions?.credit===0)warnings.push({code:'banking-distress',message:'UK credit is pinned at zero; this is a diagnostic warning, not a structural failure.',step,date});
  if(national.inflation===-2||national.inflation===20||national.unemployment===2||national.unemployment===20)warnings.push({code:'boundary-saturation',message:'A national indicator is pinned to a model validation boundary.',step,date,observed:{inflation:national.inflation,unemployment:national.unemployment}});
  const debtToGdp=national.debt/(national.realGDP*national.prices);if(Math.abs(debtToGdp)>=5)warnings.push({code:'growth',message:'Debt-to-GDP is outside the heuristic observation band.',step,date,observed:{debtToGdp}});
  return warnings;
};

const gameCheckpoint=(game:Game,context:SimulationRunContext)=>{
  const serialized=serializeGame(game);if(!serialized.ok)throw Error(serialized.error);
  const loaded=parseGame(serialized.raw);if(!loaded.game)throw Error(loaded.error??'Canonical save could not reload.');
  return {state:loaded.game,id:`${context.profileId}:${context.rootSeed}:step:${context.step}`,bytes:new TextEncoder().encode(serialized.raw).byteLength};
};

export const personalProfile=(seeds=seedRange(0,100),checkpoints=true):SimulationProfile<Game>=>({
  id:seeds.length>100?'personal-deep':'personal-fast',runKind:'personal',seeds,maxSteps:250,validationEvery:1,checkpointEvery:undefined,
  create:seed=>createGame('Harness Person','Non-binary','nz',seed),
  step:game=>{
    const resolved=choiceStep(game);if(resolved)return resolved;
    const next=ageUp(game);if(next===game)throw Error('Annual personal advancement was rejected.');assertDate(game,next,'year');return {state:next,actionId:'advance-year'};
  },
  terminal:game=>!game.alive||game.age>=100,
  date:game=>game.clock?.date,
  months:game=>game.clock&&game.dateOfBirth?Math.max(0,game.age*12):0,
  validate:game=>gameIssues(game),
  checkpoint:checkpoints?gameCheckpoint:undefined,
  shouldCheckpoint:checkpoints?game=>game.pending===null&&game.clock?.date.month===9&&game.age>0&&game.age%10===0:undefined,
});

export type UKWorldHarnessState={world:UKWorldState;date:SimulationDate;targetMonths:number};
const bankingFailure=(banks:readonly Bank[])=>{
  const fields=['mortgages','business','reserves','gilts','deposits','wholesale','central','equity','newCredit','losses'] as const;
  for(const bank of banks){
    for(const field of fields)if(!Number.isFinite(bank[field])||bank[field]<0||bank[field]>1e12)return {bank:bank.id,bankField:field,bankValue:bank[field],bankBalanceGap:bankAssets(bank)-bankLiabilities(bank)};
    for(const field of ['mortgageRate','loanRate'] as const)if(!Number.isFinite(bank[field])||bank[field]<0||bank[field]>50)return {bank:bank.id,bankField:field,bankValue:bank[field],bankBalanceGap:bankAssets(bank)-bankLiabilities(bank)};
    if(!Number.isFinite(bank.arrears)||bank.arrears<0||bank.arrears>20)return {bank:bank.id,bankField:'arrears',bankValue:bank.arrears,bankBalanceGap:bankAssets(bank)-bankLiabilities(bank)};
    const gap=bankAssets(bank)-bankLiabilities(bank);if(Math.abs(gap)>.001)return {bank:bank.id,bankField:'balance',bankValue:gap,bankBalanceGap:gap};
  }
  return {bank:null,bankField:null,bankValue:null,bankBalanceGap:null};
};
const worldIssues=(state:UKWorldHarnessState):readonly Issue[]=>{
  if(!isJsonValue(state.world))return [issue('plain-json','UK world contains unsupported or non-finite persisted data.')];
  if(validUKWorld(state.world as unknown,validNational))return [];
  const n=state.world.national,institutionsValid=!n.institutions||validInstitutions(n.institutions,n.month),banking=n.institutions?bankingFailure(n.institutions.banks):{bank:null,bankField:null,bankValue:null,bankBalanceGap:null};
  return [issue(institutionsValid?'uk-world':'institutions',institutionsValid?'UK world validation failed outside institutional state.':'Institution validation failed.',{month:n.month,institutionsValid,banksValid:banking.bank===null,...banking,credit:n.institutions?.credit??null})];
};
const worldCheckpoint=(state:UKWorldHarnessState,context:SimulationRunContext)=>{
  const raw=JSON.stringify(state.world),world=JSON.parse(raw) as UKWorldState;if(!isJsonValue(world)||!validUKWorld(world,validNational))throw Error('UK world component JSON round-trip failed.');
  return {state:{...state,world},id:`${context.profileId}:${context.rootSeed}:month:${world.national.month}`,bytes:new TextEncoder().encode(raw).byteLength};
};
export const ukWorldProfile=(seeds=seedRange(0,10),years=50,checkpoints=true):SimulationProfile<UKWorldHarnessState>=>({
  id:years>50?'uk-world-deep':'uk-world-fast',runKind:'world',seeds,maxSteps:years*12,validationEvery:1,
  create:seed=>{const national=createNational(seed);ensureInstitutions(national);return {world:createUKWorld(national),date:{...SIMULATION_START_DATE},targetMonths:years*12};},
  step:state=>{const next=advanceUKWorldMonth(state.world,advanceNational,false);if(next.national.month!==state.world.national.month+1)throw Error('UK world did not advance exactly one national month.');return {state:{...state,world:next,date:addMonths(state.date,1)},actionId:'world:uk.advance-month'};},
  terminal:state=>state.world.national.month>=state.targetMonths,
  date:state=>state.date,
  months:state=>state.world.national.month,
  location:state=>({nationalMonth:state.world.national.month}),
  validate:state=>worldIssues(state),
  observe:state=>warningForNation(state.world.national, state.world.national.month,state.date),
  checkpoint:checkpoints?worldCheckpoint:undefined,
  shouldCheckpoint:checkpoints?state=>state.world.national.month>0&&state.world.national.month%120===0:undefined,
});

export const politicsProfile=(seeds=seedRange(0,6),years=6,checkpoints=true):SimulationProfile<Game>=>({
  id:years>6?'political-deep':'political-fast',runKind:'political',seeds,maxSteps:years*12*6,validationEvery:1,
  create:seed=>joinPolitics(adultStart(createGame('Harness Politician','Woman','uk',seed)),'labour','socratic'),
  step:game=>{
    const resolved=choiceStep(game);if(resolved)return resolved;
    if(game.actions>0){const action=game.stats.health<75?'family':game.politics!.months%2?'casework':'study',next=politicalTask(game,action);if(next===game)throw Error(`Deterministic political action ${action} was rejected.`);return {state:next,actionId:`political-action:${action}`};}
    const beforeNational=game.ukWorld!.national.month,beforeTenure=game.politics!.months,next=advanceMonth(game);if(next===game)throw Error('Political monthly advancement was rejected.');assertDate(game,next,'month');if(next.ukWorld!.national.month!==beforeNational+1||next.politics!.months!==beforeTenure+1)throw Error('Political progression did not advance world and tenure exactly once.');return {state:next,actionId:'advance-month'};
  },
  terminal:game=>!game.alive||game.politics!.months>=years*12,
  date:game=>game.clock?.date,
  months:game=>game.politics?.months??0,
  location:game=>({nationalMonth:game.ukWorld?.national.month,politicalMonth:game.politics?.months}),
  validate:game=>gameIssues(game),
  observe:game=>game.ukWorld?warningForNation(game.ukWorld.national,game.politics?.months??0,game.clock?.date):[],
  checkpoint:checkpoints?gameCheckpoint:undefined,
  shouldCheckpoint:checkpoints?game=>!!game.politics&&game.politics.months>0&&game.politics.months%12===0:undefined,
});

/** Exercises the repaired banking horizon beyond its former month-781 failure. */
export const bankingRepairRegressionProfile=():SimulationProfile<UKWorldHarnessState>=>ukWorldProfile([4_829_914],75,false);

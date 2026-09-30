/** Application composition root. Feature modules depend on core ports, never the reverse. */
import type {Game,Action} from './types';
import * as life from './core/life';
import {cadence,monthOfYear,monthsBetween} from './core/clock';
import {activePoliticalSystems} from './politics/engine';
import {UKPoliticalSystem} from './politics/uk/politics';
import {createUKWorld,advanceUKWorldMonth} from './ukWorld';
import {createNational,advanceNational} from './politics/uk/national';
import {ensureInstitutions} from './politics/uk/institutions';
import {lifeMonth as elapsedLifeMonth} from './core/clock';
import {COMPATIBILITY_NATIONAL_STREAM,hydrateCompatibilitySeed,recordCompatibilitySeed} from './core/rng';
import {createPlayerPeople,setPlayerDateOfBirth,synchronizeNewPlayerDeath} from './human/playerPerson';
import {createPlayerPopulation} from './human/population';
export const politicalSystems=[UKPoliticalSystem] as const;
const modules=(g:Game)=>activePoliticalSystems(g,politicalSystems).map(s=>s.hooks);
function newUKWorld(seed:number,month=0){const n=createNational(seed,month);ensureInstitutions(n);return createUKWorld(n);}
/** Shared initial UK-world composition; it remains independent of player identity and Population. */
export function initializeUKWorld(g:Game):Game{if(g.country!=='uk')throw Error('UK World requires the UK country context.');if(g.ukWorld)return g;g.ukWorld=newUKWorld(g.seed);g.ukWorld.national.seed=recordCompatibilitySeed(g,COMPATIBILITY_NATIONAL_STREAM,g.ukWorld.national.seed);return g;}
function tickUKWorld(g:Game){if(g.ukWorld){g.ukWorld.national.seed=hydrateCompatibilitySeed(g,COMPATIBILITY_NATIONAL_STREAM,g.ukWorld.national.seed);g.ukWorld=advanceUKWorldMonth(g.ukWorld,advanceNational,!!g.politics?.active&&g.politics.inGovernment&&g.politics.role==='premier');g.ukWorld.national.seed=recordCompatibilitySeed(g,COMPATIBILITY_NATIONAL_STREAM,g.ukWorld.national.seed);}}
function elapsedMonths(previous:Game,next:Game){return previous.clock&&next.clock?monthsBetween(previous.clock.date,next.clock.date):0;}
export function createGame(...args:Parameters<typeof life.createLife>):Game{const g:Game=life.createLife(...args);g.people=createPlayerPeople(g);g.population=createPlayerPopulation(g.people,g.country);g.version=3;if(g.country==='uk')initializeUKWorld(g);return g;}
export function adultStart(state:Game):Game{const next=life.adultStart(state);if(next===state)return state;return setPlayerDateOfBirth(next,next.dateOfBirth!);}
export function isMonthly(g:Game){return cadence(g)==='month'||modules(g).length>0;}
export function monthOfLife(g:Game){return g.clock?monthOfYear(g):(g.politics?((g.politics.startMonth??0)+g.politics.months)%12:0);}
export function currentFinance(g:Game){return g.finances??(g.politics?{lastIncome:g.politics.lastIncome,lastExpenses:g.politics.lastExpenses,yearIncome:g.politics.yearIncome,yearExpenses:g.politics.yearExpenses}:{lastIncome:g.lastIncome,lastExpenses:g.lastExpenses,yearIncome:0,yearExpenses:0});}
export function ageUp(g:Game):Game{
 if(isMonthly(g))return g;
 let next=life.advanceYear(g);if(next===g)return g;next=synchronizeNewPlayerDeath(g,next);
 if(next.country==='uk'&&!next.politics?.active){const months=elapsedMonths(g,next);if(!next.ukWorld)next.ukWorld=newUKWorld(next.seed,elapsedLifeMonth(next)-months);for(let i=0;i<months;i++)tickUKWorld(next);}
 return next;
}
export function advanceMonth(g:Game):Game{
 const active=modules(g);let next=life.advanceMonth(g,active);
 if(next===g)return g;
 next=synchronizeNewPlayerDeath(g,next);
 if(next.country==='uk'&&!next.politics?.active){const months=elapsedMonths(g,next);if(!next.ukWorld)next.ukWorld=newUKWorld(next.seed,elapsedLifeMonth(next)-months);for(let i=0;i<months;i++)tickUKWorld(next);}
 return next;
}
export function advanceTime(g:Game):Game{return isMonthly(g)?advanceMonth(g):ageUp(g);}
export function actionReason(g:Game,a:Action){return life.actionReason(g,a,modules(g));}
export function act(g:Game,a:Action):Game{return synchronizeNewPlayerDeath(g,life.act(g,a,modules(g)));}
export function choose(g:Game,index:number):Game{let next=life.chooseLifeEvent(g,index);if(next===g)return g;next=synchronizeNewPlayerDeath(g,next);for(const m of modules(next)){m.prepare?.(next);if(!next.alive)m.onDeath?.(next);}return next;}

export function advanceReason(g:Game){if(!g.alive)return 'This life has ended.';if(g.pending)return 'Resolve your life choice first.';return modules(g).map(m=>m.pending?.(g)).find(Boolean)??null;}

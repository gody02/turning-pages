/** Application composition root. Feature modules depend on core ports, never the reverse. */
import type {Game,Action} from './types';
import * as life from './core/life';
import {cadence} from './core/clock';
import {activePoliticalSystems} from './politics/engine';
import {UKPoliticalSystem} from './politics/uk/politics';
export const politicalSystems=[UKPoliticalSystem] as const;
const modules=(g:Game)=>activePoliticalSystems(g,politicalSystems).map(s=>s.hooks);
export const createGame=life.createLife;
export const adultStart=life.adultStart;
export function isMonthly(g:Game){return cadence(g)==='month'||modules(g).length>0;}
export function monthOfLife(g:Game){return g.clock?.monthOfYear??(g.politics?((g.politics.startMonth??0)+g.politics.months)%12:0);}
export function currentFinance(g:Game){return g.finances??(g.politics?{lastIncome:g.politics.lastIncome,lastExpenses:g.politics.lastExpenses,yearIncome:g.politics.yearIncome,yearExpenses:g.politics.yearExpenses}:{lastIncome:g.lastIncome,lastExpenses:g.lastExpenses,yearIncome:0,yearExpenses:0});}
export function ageUp(g:Game):Game{return isMonthly(g)?g:life.advanceYear(g);}
export function advanceMonth(g:Game):Game{return life.advanceMonth(g,modules(g));}
export function advanceTime(g:Game):Game{return isMonthly(g)?advanceMonth(g):ageUp(g);}
export function actionReason(g:Game,a:Action){return life.actionReason(g,a,modules(g));}
export function act(g:Game,a:Action):Game{return life.act(g,a,modules(g));}
export function choose(g:Game,index:number):Game{const next=life.chooseLifeEvent(g,index);if(next===g)return g;for(const m of modules(next)){m.prepare?.(next);if(!next.alive)m.onDeath?.(next);}return next;}

export function advanceReason(g:Game){if(!g.alive)return 'This life has ended.';if(g.pending)return 'Resolve your life choice first.';return modules(g).map(m=>m.pending?.(g)).find(Boolean)??null;}

import type {LifeState} from './model';
export const monthOfYear=(g:LifeState)=>g.clock?.monthOfYear??0;
export const lifeMonth=(g:LifeState)=>g.clock?.totalMonths??g.age*12;
export const cadence=(g:LifeState)=>g.clock?.cadence??'year';
/** Mutating helpers are private transaction operations on an already-cloned draft. */
export function initialiseClock(g:LifeState,month=0,mode:'year'|'month'='year'){g.clock??={monthOfYear:month,totalMonths:g.age*12+month,cadence:mode};}
export function tickMonth(g:LifeState){initialiseClock(g);g.clock!.cadence='month';g.clock!.totalMonths++;g.clock!.monthOfYear=(g.clock!.monthOfYear+1)%12;return g.clock!.monthOfYear===0;}

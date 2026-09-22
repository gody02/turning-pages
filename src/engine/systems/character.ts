import type {LifeState,Stats} from '../core/model';
import {clamp} from '../core/random';
export const statKeys=['health','happiness','smarts','looks'] as const;
export function changeAttributes(g:LifeState,e:Partial<Stats>){for(const k of statKeys)g.stats[k]=clamp(g.stats[k]+(e[k]??0));}
export function development(g:LifeState){return g.development??={traits:[],skills:{},reputation:{},fame:0};}
export function setSkill(g:LifeState,id:string,value:number){development(g).skills[id]=clamp(value);}
export function setReputation(g:LifeState,audience:string,value:number){development(g).reputation[audience]=clamp(value);}
export function reputation(g:LifeState,audience:string){return g.development?.reputation[audience]??0;}
export function changeFame(g:LifeState,delta:number){const d=development(g);d.fame=clamp(d.fame+delta);}
export function addTrait(g:LifeState,id:string){const d=development(g);if(!d.traits.includes(id))d.traits.push(id);}
export function averageStats(g:LifeState){return Math.round(Object.values(g.stats).reduce((a,b)=>a+b,0)/4);}

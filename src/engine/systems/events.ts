import type {LifeState,Effects} from '../core/model';
import {random} from '../core/random';
import {changeAttributes} from './character';
import {changeBonds} from './relationships';
import {changeMoney,canAfford} from './finance';
/** Modules supply eligibility and effect vocabularies; selection/resolution is shared. */
export function eventPool<T extends {id:string}>(all:readonly T[],eligible:(e:T)=>boolean,recent:readonly string[]){const eligibleEvents=all.filter(eligible),fresh=eligibleEvents.filter(e=>!recent.includes(e.id));return {pool:fresh.length?fresh:eligibleEvents,reset:!fresh.length};}
export function pickEvent<T>(state:{seed:number},pool:readonly T[],weight?:(e:T)=>number):T|undefined{if(!pool.length)return undefined;if(!weight)return pool[Math.floor(random(state)*pool.length)];const weights=pool.map(e=>Math.max(0,weight(e)));let draw=random(state)*weights.reduce((a,b)=>a+b,0),i=0;while(i<pool.length-1&&draw>weights[i])draw-=weights[i++];return pool[i];}
export function affordableChoice<E extends {money?:number},C extends {effects:E}>(g:LifeState,choices:readonly C[]|undefined,index:number){if(!Number.isInteger(index)||index<0)return undefined;const c=choices?.[index];return c&&canAfford(g,c.effects.money)?c:undefined;}
export function applyEffects(g:LifeState,e:Effects){changeAttributes(g,e);changeMoney(g,e.money??0);changeBonds(g,e.bond??0);}

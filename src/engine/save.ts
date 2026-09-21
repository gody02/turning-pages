import type { Game } from './types';
import { countries, jobs } from '../data/world';
import { events } from '../data/events';
export const SAVE_KEY='turning-pages:v1';
export interface StorageLike { getItem(key:string):string|null; setItem(key:string,value:string):void }
const record=(x:unknown):x is Record<string,unknown>=>typeof x==='object' && x!==null;
const num=(x:unknown)=>typeof x==='number' && Number.isFinite(x);
const bounded=(x:unknown,min:number,max:number)=>num(x) && (x as number)>=min && (x as number)<=max;
export function isGame(x: unknown): x is Game {
  if(!record(x)||x.version!==1||typeof x.name!=='string'||!x.name.trim()||x.name.length>40||typeof x.gender!=='string'||x.gender.length>40||!countries.some(c=>c.id===x.country))return false;
  if(!bounded(x.age,0,100)||!Number.isInteger(x.age)||typeof x.alive!=='boolean'||typeof x.retired!=='boolean'||!bounded(x.seed,0,4294967295)||!Number.isInteger(x.seed)||!bounded(x.actions,0,3)||!Number.isInteger(x.actions))return false;
  if(!record(x.stats)||!['health','happiness','smarts','looks'].every(k=>bounded((x.stats as Record<string,unknown>)[k],0,100)))return false;
  if(!['money','earned','lastIncome','lastExpenses'].every(k=>num(x[k]))||!bounded(x.level,0,5)||!bounded(x.studyYears,0,3)||!bounded(x.jobYears,0,100))return false;
  if(!['preschool','school','secondary','university','degree'].includes(x.education as string)||!(x.job===null||jobs.some(j=>j.id===x.job)))return false;
  if(!(x.pending===null||events.some(e=>e.id===x.pending && (x.age as number)>=e.min && (x.age as number)<=e.max))||(!x.alive && x.pending!==null))return false;
  if(x.cause!==undefined && typeof x.cause!=='string')return false;
  if(!Array.isArray(x.seen)||!x.seen.every(id=>typeof id==='string'&&events.some(e=>e.id===id)))return false;
  if(!Array.isArray(x.relationships)||!x.relationships.every(r=>record(r)&&typeof r.id==='string'&&typeof r.name==='string'&&typeof r.role==='string'&&bounded(r.bond,0,100)))return false;
  return Array.isArray(x.journal)&&x.journal.every(e=>record(e)&&bounded(e.age,0,100)&&typeof e.text==='string'&&['milestone','event','action','finance'].includes(e.kind as string));
}
export function loadGame(storage: StorageLike): {game:Game|null; error:string|null} {
  try { const raw=storage.getItem(SAVE_KEY);if(!raw)return {game:null,error:null};const value:unknown=JSON.parse(raw);if(!isGame(value))throw Error();return {game:value,error:null}; }
  catch{return {game:null,error:'This save could not be loaded. It may be damaged or from another version.'};}
}
export function saveGame(storage: StorageLike, game: Game): string|null {try{storage.setItem(SAVE_KEY,JSON.stringify(game));return null;}catch{return 'Saving is unavailable. Keep this tab open to continue your life.';} }

import type {LifeState,JournalEntry,LifeFact} from '../core/model';
import {lifeMonth} from '../core/clock';
export function log(g:LifeState,text:string,kind:JournalEntry['kind']='action'){g.journal.unshift({age:g.age,text,kind});}
export function remember(g:LifeState,id:string,kind:string,detail:string,source='life',tags:string[]=[]){g.facts??=[];g.facts.push({id,kind,detail,source,tags:[...tags],atMonth:lifeMonth(g)});}
export function hasFact(g:LifeState,id:string){return g.facts?.some(f=>f.id===id)??false;}
export function factsMatching(g:LifeState,predicate:(f:LifeFact)=>boolean){return (g.facts??[]).filter(predicate);}

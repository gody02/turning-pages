import type {LifeState,Relationship} from '../core/model';
import {clamp} from '../core/random';
export function changeBonds(g:LifeState,delta:number,select:(r:Relationship)=>boolean=()=>true){for(const r of g.relationships)if(select(r))r.bond=clamp(r.bond+delta);}
export function connect(g:LifeState,id:string,delta=12){changeBonds(g,delta,r=>r.id===id);}
export function addConnection(g:LifeState,relationship:Relationship){if(!g.relationships.some(r=>r.id===relationship.id))g.relationships.push({...relationship});}
export const isPersonal=(r:Relationship)=>r.kind!== 'professional';

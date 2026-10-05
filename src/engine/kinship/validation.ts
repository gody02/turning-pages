import {isJsonValue} from '../core/json';
import {validPeople} from '../human/person';
import type {KinshipStateV1} from './types';

const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
const personId=(value:unknown):value is string=>typeof value==='string'&&value.length<=23&&/^person:[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value.slice(7)))&&value===`person:${Number(value.slice(7))}`;
const fields=(value:unknown,keys:readonly string[])=>{
  if(!value||typeof value!=='object'||Array.isArray(value)||(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null))return false;
  const actual=Reflect.ownKeys(value);
  return actual.length===keys.length&&actual.every(key=>{
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    return typeof key==='string'&&keys.includes(key)&&!!descriptor?.enumerable&&'value' in descriptor;
  });
};
const dense=(value:unknown):value is readonly unknown[]=>{
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||Reflect.ownKeys(value).length!==value.length+1)return false;
  for(let index=0;index<value.length;index++){
    const descriptor=Object.getOwnPropertyDescriptor(value,index);
    if(!descriptor?.enumerable||!('value' in descriptor))return false;
  }
  return true;
};
/** One directed edge per pair, including pairs with several bases. Iterative O(V+E). */
function acyclic(state:KinshipStateV1):boolean{
  const incoming=new Map<string,number>(),children=new Map<string,string[]>();
  for(const edge of state.parentages){
    if(!incoming.has(edge.parentId))incoming.set(edge.parentId,0);
    incoming.set(edge.childId,(incoming.get(edge.childId)??0)+1);
    const list=children.get(edge.parentId)??[];list.push(edge.childId);children.set(edge.parentId,list);
  }
  const queue=[...incoming].filter(([,count])=>count===0).map(([id])=>id);
  let visited=0;
  for(let index=0;index<queue.length;index++){
    visited++;
    for(const child of children.get(queue[index])??[]){
      const count=incoming.get(child)!-1;incoming.set(child,count);
      if(count===0)queue.push(child);
    }
  }
  return visited===incoming.size;
}
/** Strict shape/canonical graph acceptance; never repairs caller data. */
export function validKinshipState(value:unknown):value is KinshipStateV1{
  try{
    if(!fields(value,['version','parentages'])||!isJsonValue(value))return false;
    const input=value as Record<string,unknown>;
    if(!dense(input.parentages))return false;
    for(const edge of input.parentages)if(!fields(edge,['parentId','childId','bases'])||!dense((edge as Record<string,unknown>).bases))return false;
    // Clone acceptance also rejects non-cloneable proxies predictably.
    const state=structuredClone(value) as unknown as KinshipStateV1;
    if(state.version!==1)return false;
    let previous:KinshipStateV1['parentages'][number]|undefined;
    for(const edge of state.parentages){
      if(!personId(edge.parentId)||!personId(edge.childId)||edge.parentId===edge.childId||edge.bases.length===0||edge.bases.length>3)return false;
      if(previous&&(compare(previous.parentId,edge.parentId)||compare(previous.childId,edge.childId))>=0)return false;
      let prior:string|undefined;
      for(const basis of edge.bases){
        if(basis!=='genetic'&&basis!=='gestational'&&basis!=='legal'||prior!==undefined&&compare(prior,basis)>=0)return false;
        prior=basis;
      }
      previous=edge;
    }
    return acyclic(state);
  }catch{return false;}
}
/** Person identity is external; death does not invalidate parentage. */
export function validKinshipWithPeople(value:unknown,people:unknown):value is KinshipStateV1{
  try{
    if(!validKinshipState(value)||!isJsonValue(people))return false;
    const state=structuredClone(value),owned=structuredClone(people);
    if(!validPeople(owned))return false;
    const ids=new Set(owned.people.map(person=>person.id));
    return state.parentages.every(edge=>ids.has(edge.parentId)&&ids.has(edge.childId));
  }catch{return false;}
}

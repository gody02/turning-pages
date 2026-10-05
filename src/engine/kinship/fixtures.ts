// Synthetic test setup only; no production content or domain materialization.
import {createPerson} from '../human/person';
import type {KinshipStateV1,KinshipValidationContext,ParentageBasis} from './types';
export function fixtureContext(count=6):KinshipValidationContext{
  return {people:{version:1,nextSequence:count+1,playerId:'person:1',people:Array.from({length:count},(_,index)=>createPerson(index+1,{name:`Synthetic Person ${index+1}`,dateOfBirth:{year:2000,month:1,day:1},genderLabel:'Unspecified',lifeStatus:'living'}))}};
}
export function fixtureState(edges:readonly (readonly [number,number,ParentageBasis?])[]):KinshipStateV1{
  const pairs=new Map<string,{parentId:string;childId:string;bases:ParentageBasis[]}>();
  for(const [parent,child,basis='genetic'] of edges){
    const key=JSON.stringify([parent,child]),edge=pairs.get(key)??{parentId:`person:${parent}`,childId:`person:${child}`,bases:[]};
    if(!edge.bases.includes(basis))edge.bases.push(basis);
    pairs.set(key,edge);
  }
  const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
  return {version:1,parentages:[...pairs.values()].map(edge=>({...edge,bases:edge.bases.sort(compare)})).sort((a,b)=>compare(a.parentId,b.parentId)||compare(a.childId,b.childId))};
}

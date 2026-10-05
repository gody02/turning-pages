import {isJsonValue} from '../core/json';
import type {KinshipPersonId,KinshipStateV1,KinshipValidationContext,KinshipTraversalResultV1,ParentageBasis,ParentageRecordV1,SiblingParentageOverlapV1} from './types';
import {validKinshipWithPeople} from './validation';

const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
function immutable<T>(value:T):T{
  const copy=structuredClone(value);
  const freeze=(item:unknown):void=>{
    if(item&&typeof item==='object'){
      for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(item)))if('value' in descriptor)freeze(descriptor.value);
      Object.freeze(item);
    }
  };
  freeze(copy);return copy;
}
function ownInputs(state:KinshipStateV1,context:KinshipValidationContext):{state:KinshipStateV1;ids:Set<string>}{
  try{
    if(!context||typeof context!=='object'||Array.isArray(context)||!isJsonValue(context)||(Object.getPrototypeOf(context)!==Object.prototype&&Object.getPrototypeOf(context)!==null))throw Error();
    const keys=Reflect.ownKeys(context),descriptor=Object.getOwnPropertyDescriptor(context,'people');
    if(keys.length!==1||keys[0]!=='people'||!descriptor?.enumerable||!('value' in descriptor)||!validKinshipWithPeople(state,descriptor.value))throw Error();
    const owned=structuredClone(context);
    return {state:structuredClone(state),ids:new Set(owned.people.people.map(person=>person.id))};
  }catch{throw Error('Invalid Kinship state or validation context.');}
}
function requirePerson(id:KinshipPersonId,ids:Set<string>):void{
  if(typeof id!=='string'||!ids.has(id))throw Error('Unknown Kinship Person.');
}
function adjacency(state:KinshipStateV1,basis:ParentageBasis,reverse:boolean):Map<string,string[]>{
  if(basis!=='genetic'&&basis!=='gestational'&&basis!=='legal')throw Error('Invalid parentage basis.');
  const index=new Map<string,string[]>();
  for(const edge of state.parentages)if(edge.bases.includes(basis)){
    const from=reverse?edge.childId:edge.parentId,to=reverse?edge.parentId:edge.childId;
    const list=index.get(from)??[];list.push(to);index.set(from,list);
  }
  return index;
}
function direct(state:KinshipStateV1,id:KinshipPersonId,basis:ParentageBasis,context:KinshipValidationContext,reverse:boolean):readonly KinshipPersonId[]{
  const owned=ownInputs(state,context);requirePerson(id,owned.ids);
  return immutable([...(adjacency(owned.state,basis,reverse).get(id)??[])].sort(compare));
}
function twoSteps(state:KinshipStateV1,id:KinshipPersonId,basis:ParentageBasis,context:KinshipValidationContext,reverse:boolean):readonly KinshipPersonId[]{
  const owned=ownInputs(state,context);requirePerson(id,owned.ids);
  const index=adjacency(owned.state,basis,reverse),result=new Set<string>();
  for(const middle of index.get(id)??[])for(const target of index.get(middle)??[])result.add(target);
  return immutable([...result].sort(compare));
}
function traverse(state:KinshipStateV1,id:KinshipPersonId,basis:ParentageBasis,maxDepth:number,context:KinshipValidationContext,reverse:boolean):KinshipTraversalResultV1{
  const owned=ownInputs(state,context);requirePerson(id,owned.ids);
  if(!Number.isSafeInteger(maxDepth)||maxDepth<=0)throw Error('Invalid Kinship traversal depth.');
  const index=adjacency(owned.state,basis,reverse),distances=new Map<string,number>([[id,0]]),queue=[id];
  for(let position=0;position<queue.length;position++){
    const current=queue[position],distance=distances.get(current)!;
    if(distance===maxDepth)continue;
    for(const next of index.get(current)??[])if(!distances.has(next)){
      distances.set(next,distance+1);queue.push(next);
    }
  }
  const truncated=queue.some(current=>distances.get(current)===maxDepth&&(index.get(current)??[]).some(next=>!distances.has(next)));
  const relatives=[...distances].filter(([personId])=>personId!==id).map(([personId,minimumDistance])=>({personId,minimumDistance})).sort((a,b)=>a.minimumDistance-b.minimumDistance||compare(a.personId,b.personId));
  return immutable({basis,maxDepth,relatives,truncated});
}
export function getParentage(state:KinshipStateV1,parentId:KinshipPersonId,childId:KinshipPersonId,context:KinshipValidationContext):ParentageRecordV1|undefined{
  const owned=ownInputs(state,context);requirePerson(parentId,owned.ids);requirePerson(childId,owned.ids);
  const edge=owned.state.parentages.find(item=>item.parentId===parentId&&item.childId===childId);
  return edge===undefined?undefined:immutable(edge);
}
export function getParents(state:KinshipStateV1,personId:KinshipPersonId,basis:ParentageBasis,context:KinshipValidationContext):readonly KinshipPersonId[]{return direct(state,personId,basis,context,true);}
export function getChildren(state:KinshipStateV1,personId:KinshipPersonId,basis:ParentageBasis,context:KinshipValidationContext):readonly KinshipPersonId[]{return direct(state,personId,basis,context,false);}
export function getSiblingRelationship(state:KinshipStateV1,leftId:KinshipPersonId,rightId:KinshipPersonId,basis:ParentageBasis,context:KinshipValidationContext):SiblingParentageOverlapV1{
  const owned=ownInputs(state,context);requirePerson(leftId,owned.ids);requirePerson(rightId,owned.ids);
  if(leftId===rightId)throw Error('Sibling comparison requires distinct Persons.');
  const index=adjacency(owned.state,basis,true),leftKnownParentIds=[...(index.get(leftId)??[])].sort(compare),rightKnownParentIds=[...(index.get(rightId)??[])].sort(compare),right=new Set(rightKnownParentIds);
  const sharedParentIds=leftKnownParentIds.filter(id=>right.has(id));
  return immutable({basis,leftKnownParentIds,rightKnownParentIds,sharedParentIds,sameNonemptyParentSet:leftKnownParentIds.length>0&&leftKnownParentIds.length===rightKnownParentIds.length&&sharedParentIds.length===leftKnownParentIds.length});
}
export function getGrandparents(state:KinshipStateV1,personId:KinshipPersonId,basis:ParentageBasis,context:KinshipValidationContext):readonly KinshipPersonId[]{return twoSteps(state,personId,basis,context,true);}
export function getGrandchildren(state:KinshipStateV1,personId:KinshipPersonId,basis:ParentageBasis,context:KinshipValidationContext):readonly KinshipPersonId[]{return twoSteps(state,personId,basis,context,false);}
export function getAncestors(state:KinshipStateV1,personId:KinshipPersonId,basis:ParentageBasis,maxDepth:number,context:KinshipValidationContext):KinshipTraversalResultV1{return traverse(state,personId,basis,maxDepth,context,true);}
export function getDescendants(state:KinshipStateV1,personId:KinshipPersonId,basis:ParentageBasis,maxDepth:number,context:KinshipValidationContext):KinshipTraversalResultV1{return traverse(state,personId,basis,maxDepth,context,false);}

import {isJsonValue} from '../core/json';
import type {KinshipPersonId,KinshipStateV1,KinshipValidationContext,ParentageBasis} from './types';
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
function ownInputs(state:KinshipStateV1,context:KinshipValidationContext):{state:KinshipStateV1;context:KinshipValidationContext}{
  try{
    if(!context||typeof context!=='object'||Array.isArray(context)||!isJsonValue(context)||(Object.getPrototypeOf(context)!==Object.prototype&&Object.getPrototypeOf(context)!==null))throw Error();
    const keys=Reflect.ownKeys(context),descriptor=Object.getOwnPropertyDescriptor(context,'people');
    if(keys.length!==1||keys[0]!=='people'||!descriptor?.enumerable||!('value' in descriptor)||!validKinshipWithPeople(state,descriptor.value))throw Error();
    return {state:structuredClone(state),context:structuredClone(context)};
  }catch{throw Error('Invalid Kinship state or validation context.');}
}
function requirePerson(id:KinshipPersonId,context:KinshipValidationContext):void{
  if(typeof id!=='string'||!context.people.people.some(person=>person.id===id))throw Error('Unknown Kinship Person.');
}
function requireBasis(basis:ParentageBasis):void{
  if(basis!=='genetic'&&basis!=='gestational'&&basis!=='legal')throw Error('Invalid parentage basis.');
}
function commit(state:KinshipStateV1,context:KinshipValidationContext):KinshipStateV1{
  const candidate:KinshipStateV1={version:1,parentages:state.parentages.map(edge=>({parentId:edge.parentId,childId:edge.childId,bases:[...edge.bases].sort(compare)})).sort((a,b)=>compare(a.parentId,b.parentId)||compare(a.childId,b.childId))};
  if(!validKinshipWithPeople(candidate,context.people))throw Error('Kinship transition failed validation.');
  return immutable(candidate);
}
export function createEmptyKinshipState():KinshipStateV1{return immutable({version:1,parentages:[]});}
export function addParentageBasis(state:KinshipStateV1,parentId:KinshipPersonId,childId:KinshipPersonId,basis:ParentageBasis,context:KinshipValidationContext):KinshipStateV1{
  const owned=ownInputs(state,context);requirePerson(parentId,owned.context);requirePerson(childId,owned.context);requireBasis(basis);
  if(parentId===childId)throw Error('Self parentage is invalid.');
  const existing=owned.state.parentages.find(edge=>edge.parentId===parentId&&edge.childId===childId);
  if(existing?.bases.includes(basis))return immutable(owned.state);
  const parentages=existing?owned.state.parentages.map(edge=>edge===existing?{...edge,bases:[...edge.bases,basis]}:edge):[...owned.state.parentages,{parentId,childId,bases:[basis]}];
  return commit({version:1,parentages},owned.context);
}
/** Mechanical truth correction; owning policy decides whether removal is appropriate. */
export function removeParentageBasis(state:KinshipStateV1,parentId:KinshipPersonId,childId:KinshipPersonId,basis:ParentageBasis,context:KinshipValidationContext):KinshipStateV1{
  const owned=ownInputs(state,context);requirePerson(parentId,owned.context);requirePerson(childId,owned.context);requireBasis(basis);
  const parentages=owned.state.parentages.flatMap(edge=>{
    if(edge.parentId!==parentId||edge.childId!==childId)return [edge];
    const bases=edge.bases.filter(item=>item!==basis);
    return bases.length?[{...edge,bases}]:[];
  });
  return commit({version:1,parentages},owned.context);
}
/** Explicit cleanup BEFORE a coordinated future deletion, never automatic death cleanup. */
export function removePersonFromKinship(state:KinshipStateV1,personId:KinshipPersonId,context:KinshipValidationContext):KinshipStateV1{
  const owned=ownInputs(state,context);requirePerson(personId,owned.context);
  return commit({version:1,parentages:owned.state.parentages.filter(edge=>edge.parentId!==personId&&edge.childId!==personId)},owned.context);
}

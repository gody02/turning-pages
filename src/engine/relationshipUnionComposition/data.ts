import {ageOn,dateToOrdinal,dateFromOrdinal} from '../core/clock';
import type {SimulationDate} from '../core/model';
import {isJsonValue} from '../core/json';
import type {RelationshipUnionCompositionFingerprint, RelationshipSubjectRefV1} from './types';

export const compare = (a:string,b:string) => {
  // IDs are ASCII; policy limitation text can also contain supplementary Unicode.
  let left=0,right=0;
  while(left<a.length&&right<b.length){
    const l=a.codePointAt(left)!,r=b.codePointAt(right)!;if(l!==r)return l<r?-1:1;
    left+=l>0xffff?2:1;right+=r>0xffff?2:1;
  }
  return left<a.length?1:right<b.length?-1:0;
};
export const stableId = (value:unknown):value is string => typeof value==='string' && value.length<=160 && value.includes('.') && /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
export const versionedId = (value:unknown):value is string => stableId(value) && /(?:^|[._-])v[1-9]\d*$/.test(value);
export const countryId = (value:unknown):value is string|null => value===null || typeof value==='string' && value.length<=160 && /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
export const personId = (value:unknown):value is string => typeof value==='string' && value.length<=23 && /^person:[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value.slice(7))) && value===`person:${Number(value.slice(7))}`;
export const fingerprintShape = (value:unknown):value is RelationshipUnionCompositionFingerprint => typeof value==='string' && /^fnv1a64-v1:[0-9a-f]{16}$/.test(value);
export const record = (value:unknown):value is Record<string,unknown> => !!value && typeof value==='object' && !Array.isArray(value) && (Object.getPrototypeOf(value)===Object.prototype || Object.getPrototypeOf(value)===null);
export const fields = (value:unknown,keys:readonly string[]):value is Record<string,unknown> => {
  if(!record(value))return false;
  const actual=Reflect.ownKeys(value);
  return actual.length===keys.length && actual.every(key=>typeof key==='string' && keys.includes(key) && !!Object.getOwnPropertyDescriptor(value,key)?.enumerable && 'value' in Object.getOwnPropertyDescriptor(value,key)!);
};
export const dense = (value:unknown):value is readonly unknown[] => {
  if(!Array.isArray(value) || Object.getPrototypeOf(value)!==Array.prototype || Reflect.ownKeys(value).length!==value.length+1)return false;
  for(let index=0;index<value.length;index++){
    const descriptor=Object.getOwnPropertyDescriptor(value,index);
    if(!descriptor?.enumerable || !('value' in descriptor))return false;
  }
  return true;
};
// Technical hostile-input limits, not household size/age modelling restrictions.
// One million visited values and 128 Mi UTF-16 units; shared JSON depth convention is 40.
const MAX_VALUES=1_000_000, MAX_TEXT_UNITS=128*1024*1024;
export function snapshot<T>(value:T):T{
  try{
    let count=0,text=0;
    const ancestors=new Set<object>();
    const visit=(item:unknown,depth:number):void=>{
      if(++count>MAX_VALUES || depth>40)throw Error();
      if(typeof item==='string'){text+=item.length;if(text>MAX_TEXT_UNITS)throw Error();return;}
      if(!item || typeof item!=='object')return;
      if(ancestors.has(item))throw Error();
      ancestors.add(item);
      if(Array.isArray(item)){if(item.length>MAX_VALUES || !dense(item))throw Error();}
      else if(!record(item))throw Error();
      for(const key of Reflect.ownKeys(item)){
        if(Array.isArray(item) && key==='length')continue;
        if(typeof key!=='string')throw Error();
        const descriptor=Object.getOwnPropertyDescriptor(item,key);
        if(!descriptor?.enumerable || !('value' in descriptor))throw Error();
        text+=key.length;if(text>MAX_TEXT_UNITS)throw Error();
        visit(descriptor.value,depth+1);
      }
      ancestors.delete(item);
    };
    visit(value,0);
    if(!isJsonValue(value))throw Error();
    // Clone rejects even transparent proxies. No caller-owned object becomes authority.
    return structuredClone(value);
  }catch{throw Error('Invalid Relationship/Union composition JSON.');}
}
export function immutable<T>(value:T):T{
  const copy=snapshot(value);
  const freeze=(item:unknown):void=>{
    if(!item || typeof item!=='object')return;
    for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(item)))if('value' in descriptor)freeze(descriptor.value);
    Object.freeze(item);
  };
  freeze(copy);return copy;
}
export const canonicalStringify = (value:unknown):string => JSON.stringify(value,(_key,item)=>item && typeof item==='object' && !Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>compare(a,b))):item);
/** Deterministic UTF-8 semantic-integrity detection, not cryptographic security. */
export function fnv1a64(value:string):RelationshipUnionCompositionFingerprint{
  let hash=0xcbf29ce484222325n;
  for(const byte of new TextEncoder().encode(value)){hash^=BigInt(byte);hash=BigInt.asUintN(64,hash*0x100000001b3n);}
  return `fnv1a64-v1:${hash.toString(16).padStart(16,'0')}`;
}
export const subjectKey = (ref:RelationshipSubjectRefV1):string => JSON.stringify(ref.kind==='existing'?['family-subject',1,'existing',ref.personId]:['family-subject',1,'future',ref.scopeId,ref.slotId]);
export const derivationKey = (...parts:readonly string[]):string => {
  const key=parts.map(part=>`${part.length}:${part}`).join('|');
  if(!key || key.length>500)throw Error('Composition derivation key exceeds supported length.');
  return key;
};


export const unionId=(value:unknown):value is string=>typeof value==='string'&&/^formal-union:[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value.slice(13)))&&value===`formal-union:${Number(value.slice(13))}`;
export const contractKey=(value:{scopeId:string;contractSlotId:string})=>JSON.stringify(['relationship-union-contract',1,value.scopeId,value.contractSlotId]);
export const intentKey=(value:import('./types').PlannedFormalUnionV1)=>value.kind==='create-contract'?JSON.stringify(['create',contractKey(value.contract)]):JSON.stringify(['existing',value.unionId]);
export const normalizeSubjects=(pair:readonly [RelationshipSubjectRefV1,RelationshipSubjectRefV1]):readonly [RelationshipSubjectRefV1,RelationshipSubjectRefV1]=>compare(subjectKey(pair[0]),subjectKey(pair[1]))<0?pair:[pair[1],pair[0]];
export const subjectsKey=(pair:readonly [RelationshipSubjectRefV1,RelationshipSubjectRefV1])=>JSON.stringify(normalizeSubjects(pair).map(subjectKey));
export const reasons=(items:readonly string[])=>[...new Set(items)].sort(compare);

/** Earliest compatible DOB is a representability bound, not a materialization proof. */
export function earliestBirth(birth:import('./types').RelationshipBirthConstraintV1,date:SimulationDate):SimulationDate{
  if(birth.kind==='any-living')return {year:1,month:1,day:1};
  if(birth.kind==='birth-year-range')return {year:birth.minimumYear,month:1,day:1};
  let low=dateToOrdinal({year:1,month:1,day:1}),high=dateToOrdinal(date);
  while(low<high){const middle=Math.floor((low+high)/2);if(ageOn(dateFromOrdinal(middle),date)>birth.maximumAge)low=middle+1;else high=middle;}
  const result=dateFromOrdinal(low);if(ageOn(result,date)<birth.minimumAge)throw Error('Unsupported birth constraint at reference date.');return result;
}

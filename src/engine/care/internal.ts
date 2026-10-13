// Private implementation utilities; not part of the Foundation public API.
import {isJsonValue} from '../core/json';
import {compareDates,isSimulationDate} from '../core/clock';
import {validPeople} from '../human/person';
import type {PeopleState,Person} from '../human/person';
import type {SimulationDate} from '../core/model';

export const compare=(a:string,b:string):number=>{
  let l=0,r=0;
  while(l<a.length&&r<b.length){const x=a.codePointAt(l)!,y=b.codePointAt(r)!;
    if(x!==y)return x<y?-1:1;l+=x>0xffff?2:1;r+=y>0xffff?2:1;}
  return l<a.length?1:r<b.length?-1:0;
};
export const fields=(value:unknown,keys:readonly string[]):value is Record<string,unknown>=>{
  if(!value||typeof value!=='object'||Array.isArray(value)||
    (Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null))return false;
  const actual=Reflect.ownKeys(value);
  return actual.length===keys.length&&actual.every(key=>{
    const d=Object.getOwnPropertyDescriptor(value,key);
    return typeof key==='string'&&keys.includes(key)&&!!d?.enumerable&&'value' in d;
  });
};
export const positive=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
export const personId=(value:unknown):value is string=>typeof value==='string'&&value.length<=23&&/^person:[1-9]\d*$/.test(value)&&positive(Number(value.slice(7)))&&value===`person:${Number(value.slice(7))}`;
export const stableId=(value:unknown):value is string=>typeof value==='string'&&value.length<=160&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
export const versionedId=(value:unknown):value is string=>stableId(value)&&value.includes('.')&&/(?:^|[._-])v[1-9]\d*$/.test(value);
export const exactDate=(value:unknown):value is SimulationDate=>fields(value,['year','month','day'])&&isSimulationDate(value);
export const pair=(value:unknown):value is readonly [string,string]=>Array.isArray(value)&&value.length===2&&personId(value[0])&&personId(value[1])&&compare(value[0],value[1])<0;
export const pairKey=(ids:readonly [string,string]):string=>JSON.stringify(ids);
export const pairCompare=(a:readonly [string,string],b:readonly [string,string]):number=>compare(a[0],b[0])||compare(a[1],b[1]);
export const dateCopy=(date:Readonly<SimulationDate>|null):Readonly<SimulationDate>|null=>date===null?null:{year:date.year,month:date.month,day:date.day};
// Technical hostile-input protection, not a relationship-count or eligibility rule.
// 1,000,000 visited values, 128 Mi UTF-16 units, and shared JSON depth 40.
export function snapshot<T>(value:T):T{
  try{
    let count=0,text=0;const ancestors=new Set<object>();
    const visit=(item:unknown,depth:number):unknown=>{
      if(++count>1_000_000||depth>40)throw Error();
      if(typeof item==='string'){text+=item.length;if(text>128*1024*1024)throw Error();return item;}
      if(item===null||typeof item==='boolean'||typeof item==='number'&&Number.isFinite(item))return item;
      if(typeof item!=='object'||ancestors.has(item))throw Error();
      ancestors.add(item);
      const array=Array.isArray(item),prototype=Object.getPrototypeOf(item),keys=Reflect.ownKeys(item);
      if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)throw Error();
      if(keys.length>1_000_000-count+(array?1:0))throw Error();
      const descriptors=new Map<string,PropertyDescriptor>();
      // Capture data through descriptors only. Proxy inspection may trap; value gets never follow it.
      for(const key of keys){
        if(typeof key!=='string'||key.length>3000)throw Error();
        if(!array||key!=='length'){text+=key.length;if(text>128*1024*1024)throw Error();}
        const d=Object.getOwnPropertyDescriptor(item,key);
        if(!d||!('value' in d)||(!array||key!=='length')&&!d.enumerable)throw Error();
        descriptors.set(key,d);
      }
      const length=array?descriptors.get('length'):undefined;
      if(array&&(!length||length.enumerable||length.configurable||!Number.isSafeInteger(length.value)||
        length.value<0||length.value>1_000_000||keys.length!==length.value+1))throw Error();
      const copy:Record<string,unknown>|unknown[]=array?new Array(length!.value):{};
      if(array)for(let i=0;i<length!.value;i++)if(!descriptors.has(String(i)))throw Error();
      for(const [key,d] of descriptors){
        if(array&&key==='length')continue;
        Object.defineProperty(copy,key,{value:visit(d.value,depth+1),enumerable:true,writable:true,configurable:true});
      }
      // Detect observable descriptor/shape mutation during construction without reading property values.
      const finalKeys=Reflect.ownKeys(item);
      if(Object.getPrototypeOf(item)!==prototype||finalKeys.length!==keys.length||
        finalKeys.some(key=>typeof key!=='string'||!descriptors.has(key)))throw Error();
      for(const [key,d] of descriptors){
        const next=Object.getOwnPropertyDescriptor(item,key);
        if(!next||!('value' in next)||next.enumerable!==d.enumerable||next.configurable!==d.configurable||
          next.writable!==d.writable||!Object.is(next.value,d.value))throw Error();
      }
      ancestors.delete(item);return copy;
    };
    const owned=visit(value,0);if(!isJsonValue(owned))throw Error();return owned as T;
  }catch{throw Error('Invalid Foundation JSON.');}
}
export function immutable<T>(value:T):T{
  const copy=snapshot(value);
  const freeze=(item:unknown):void=>{if(item&&typeof item==='object'){
    for(const d of Object.values(Object.getOwnPropertyDescriptors(item)))if('value' in d)freeze(d.value);
    Object.freeze(item);
  }};
  freeze(copy);return copy;
}
export function peopleView(people:PeopleState,referenceDate:Readonly<SimulationDate>):Map<string,Person>{
  if(!validPeople(people)||!exactDate(referenceDate))throw Error('Invalid People or reference date.');
  return new Map(people.people.map(person=>[person.id,person]));
}
export function requirePerson(id:string,people:Map<string,Person>,referenceDate:Readonly<SimulationDate>,living=false):Person{
  const person=people.get(id);
  if(!personId(id)||!person||compareDates(person.dateOfBirth,referenceDate)>0||
    person.diedAt&&compareDates(person.diedAt,referenceDate)>0||living&&person.lifeStatus!=='living')throw Error('Invalid Foundation Person reference.');
  return person;
}
export function normalizePair(left:string,right:string,people:Map<string,Person>,date:Readonly<SimulationDate>,living=false):readonly [string,string]{
  requirePerson(left,people,date,living);requirePerson(right,people,date,living);
  if(left===right)throw Error('Self reference is invalid.');
  return compare(left,right)<0?[left,right]:[right,left];
}

export const role=(value:unknown):value is import('./types').CareRoleV1=>value==='unspecified'||value==='principal';
export const rowCompare=(a:import('./types').CareRecordV1,b:import('./types').CareRecordV1)=>compare(a.caregiverId,b.caregiverId)||compare(a.recipientId,b.recipientId);

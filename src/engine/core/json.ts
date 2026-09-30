import type {JsonValue} from './model';

const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const plainRecord=(value:unknown):value is Record<string,unknown>=>record(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);

/** Validates the finite, plain JSON subset that can be faithfully persisted. */
export const isJsonValue=(value:unknown,depth=0):value is JsonValue=>{
 try{
  if(depth>40||value===null||typeof value==='boolean'||typeof value==='string')return depth<=40;
  if(typeof value==='number')return Number.isFinite(value);
  if(Array.isArray(value)){
   if(Object.keys(value).length!==value.length||Reflect.ownKeys(value).length!==value.length+1)return false;
   for(let index=0;index<value.length;index++){
    const descriptor=Object.getOwnPropertyDescriptor(value,index);
    if(!descriptor?.enumerable||!('value' in descriptor)||!isJsonValue(descriptor.value,depth+1))return false;
   }
   return true;
  }
  if(!plainRecord(value))return false;
  const keys=Reflect.ownKeys(value);
  return keys.every(key=>{
   if(typeof key!=='string'||key.length>3000)return false;
   const descriptor=Object.getOwnPropertyDescriptor(value,key);
   return !!descriptor?.enumerable&&'value' in descriptor&&isJsonValue(descriptor.value,depth+1);
  });
 }catch{return false;}
};

/** Compares validated JSON values without depending on object insertion order. */
export const equalJson=(left:JsonValue,right:JsonValue):boolean=>{
 if(left===right)return true;
 if(left===null||right===null||typeof left!==typeof right)return false;
 if(Array.isArray(left)||Array.isArray(right))return Array.isArray(left)&&Array.isArray(right)&&left.length===right.length&&left.every((value,index)=>equalJson(value,right[index]));
 if(typeof left!=='object'||typeof right!=='object')return false;
 const leftKeys=Object.keys(left).sort(),rightKeys=Object.keys(right).sort();
 return leftKeys.length===rightKeys.length&&leftKeys.every((key,index)=>key===rightKeys[index]&&equalJson(left[key],right[key]));
};

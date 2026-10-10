import {compare,fields,immutable,snapshot,stableId,versionedId} from './internal';
import type {FormalUnionKindDefinitionV1,FormalUnionKindFingerprint,FormalUnionKindId,FormalUnionKindInputV1,FormalUnionKindManifestEntryV1,FormalUnionKindRegistryV1} from './types';

const shape=['version','kindId','label','definition','jurisdictionId','classification','sourceIds','limitations'] as const;
const fingerprint=(value:unknown):value is FormalUnionKindFingerprint=>typeof value==='string'&&/^fnv1a64-v1:[0-9a-f]{16}$/.test(value);
const text=(value:unknown):value is string=>{
  if(typeof value!=='string'||!value.trim())return false;
  // UTF-8 must not collapse distinct malformed UTF-16 strings to replacement characters.
  for(let i=0;i<value.length;i++){const n=value.charCodeAt(i);
    if(n>=0xd800&&n<=0xdbff){const next=value.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))return false;}
    else if(n>=0xdc00&&n<=0xdfff)return false;
  }return true;
};
function inputShape(value:unknown):value is FormalUnionKindInputV1{
  if(!fields(value,shape)||value.version!==1||!versionedId(value.kindId)||!text(value.label)||!text(value.definition)||
    value.jurisdictionId!==null&&!stableId(value.jurisdictionId)||
    value.classification!=='statutory-institutional-rule'&&value.classification!=='authored-gameplay-abstraction'||
    !Array.isArray(value.sourceIds)||!value.sourceIds.every(stableId)||!Array.isArray(value.limitations)||!value.limitations.every(text))return false;
  if(new Set(value.sourceIds).size!==value.sourceIds.length||new Set(value.limitations).size!==value.limitations.length)return false;
  return value.classification==='statutory-institutional-rule'?value.sourceIds.length>0:value.limitations.length>0;
}
function canonical(value:FormalUnionKindInputV1):FormalUnionKindInputV1{
  return {version:1,kindId:value.kindId,label:value.label,definition:value.definition,jurisdictionId:value.jurisdictionId,classification:value.classification,sourceIds:[...value.sourceIds].sort(compare),limitations:[...value.limitations].sort(compare)};
}
const ordered=(values:readonly string[])=>values.every((value,index)=>index===0||compare(values[index-1],value)<0);
/** FNV-1a UTF-8 semantic integrity only; not cryptographic authenticity/security. */
function digest(input:FormalUnionKindInputV1):FormalUnionKindFingerprint{
  const raw=JSON.stringify(canonical(input),(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>compare(a,b))):value);
  let hash=0xcbf29ce484222325n;
  for(const byte of new TextEncoder().encode(raw)){hash^=BigInt(byte);hash=BigInt.asUintN(64,hash*0x100000001b3n);}
  return `fnv1a64-v1:${hash.toString(16).padStart(16,'0')}`;
}
export function withFormalUnionKindFingerprint(input:FormalUnionKindInputV1):FormalUnionKindDefinitionV1{
  try{
    const owned=snapshot(input);if(!inputShape(owned))throw Error();
    const c=canonical(owned);
    return immutable({version:1,kindId:c.kindId,fingerprint:digest(c),label:c.label,definition:c.definition,jurisdictionId:c.jurisdictionId,classification:c.classification,sourceIds:c.sourceIds,limitations:c.limitations});
  }catch{throw Error('Invalid Formal Union kind input.');}
}
export function validFormalUnionKind(value:unknown):value is FormalUnionKindDefinitionV1{
  try{
    const owned=snapshot(value);
    if(!fields(owned,[...shape,'fingerprint'])||!fingerprint(owned.fingerprint))return false;
    const {fingerprint:hash,...input}=owned;
    return inputShape(input)&&ordered(input.sourceIds)&&ordered(input.limitations)&&hash===digest(input);
  }catch{return false;}
}
export function createFormalUnionKindRegistry(kinds:readonly FormalUnionKindDefinitionV1[],manifest:readonly FormalUnionKindManifestEntryV1[]):FormalUnionKindRegistryV1{
  try{
    const owned=snapshot({kinds,manifest});
    if(!Array.isArray(owned.kinds)||!Array.isArray(owned.manifest)||owned.kinds.length!==owned.manifest.length||!owned.kinds.every(validFormalUnionKind)||
      !owned.manifest.every(entry=>fields(entry,['kindId','fingerprint'])&&versionedId(entry.kindId)&&fingerprint(entry.fingerprint)))throw Error();
    const sortedKinds=[...owned.kinds].sort((a,b)=>compare(a.kindId,b.kindId)),sortedManifest=[...owned.manifest].sort((a,b)=>compare(a.kindId,b.kindId));
    if(!ordered(sortedKinds.map(kind=>kind.kindId))||!ordered(sortedManifest.map(entry=>entry.kindId))||
      sortedKinds.some((kind,index)=>kind.kindId!==sortedManifest[index].kindId||kind.fingerprint!==sortedManifest[index].fingerprint))throw Error();
    return immutable({version:1,kinds:sortedKinds.map(kind=>withFormalUnionKindFingerprint((({fingerprint:_hash,...input})=>input)(kind))),manifest:sortedManifest.map(entry=>({kindId:entry.kindId,fingerprint:entry.fingerprint}))});
  }catch{throw Error('Invalid Formal Union kind registry or immutable manifest.');}
}
export function resolveFormalUnionKind(registry:FormalUnionKindRegistryV1,kindId:FormalUnionKindId):FormalUnionKindDefinitionV1{
  try{
    const owned=snapshot(registry);
    if(!fields(owned,['version','kinds','manifest'])||owned.version!==1||!Array.isArray(owned.kinds)||!Array.isArray(owned.manifest)||
      !ordered(owned.kinds.map(kind=>kind.kindId))||!ordered(owned.manifest.map(entry=>entry.kindId))||!versionedId(kindId))throw Error();
    const valid=createFormalUnionKindRegistry(owned.kinds,owned.manifest),kind=valid.kinds.find(entry=>entry.kindId===kindId);
    if(!kind)throw Error();return immutable(kind);
  }catch{throw Error('Unresolved or invalid Formal Union kind.');}
}

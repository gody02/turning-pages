export const PERSISTENCE_VERSION=1 as const;
export const PERSISTENCE_ENCODING='canonical-json-utf8-v1' as const;
export const PRIMARY_SLOT='primary' as const;
export const PREVIOUS_SLOT='previous' as const;
export const LEGACY_PRIMARY_RECOVERY_SLOT='recovery:legacy-localstorage-primary-v1' as const;
export const RECOVERY_SLOT_PREFIX='recovery:' as const;

export type SaveRecordRole='primary'|'previous'|'recovery';
export type SavePayloadKind='canonical-game'|'legacy-exact-bytes';

export interface StoredSaveRecordV1 {
  persistenceVersion:1;
  slotId:string;
  role:SaveRecordRole;
  revision:number|null;
  payloadKind:SavePayloadKind;
  encoding:typeof PERSISTENCE_ENCODING;
  declaredRootVersion:number|null;
  byteLength:number;
  sha256:`sha256:${string}`;
  payload:ArrayBuffer;
}

const FIELDS=['persistenceVersion','slotId','role','revision','payloadKind','encoding','declaredRootVersion','byteLength','sha256','payload'] as const;
const SHA256=/^sha256:[0-9a-f]{64}$/;
const safePositive=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const safeNonnegative=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;

function plainDataRecord(value:unknown):value is Record<string,unknown>{
  if(typeof value!=='object'||value===null||Array.isArray(value))return false;
  try{
    if(Object.getPrototypeOf(value)!==Object.prototype)return false;
    const keys=Reflect.ownKeys(value);
    if(keys.some(key=>typeof key!=='string')||keys.length!==FIELDS.length||!FIELDS.every(field=>keys.includes(field)))return false;
    return keys.every(key=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);return !!descriptor&&'value' in descriptor&&descriptor.enumerable;});
  }catch{return false;}
}

export function expectedRoleForSlot(slotId:string):SaveRecordRole|null{
  if(slotId===PRIMARY_SLOT)return 'primary';
  if(slotId===PREVIOUS_SLOT)return 'previous';
  if(slotId.startsWith(RECOVERY_SLOT_PREFIX)&&slotId.length>RECOVERY_SLOT_PREFIX.length)return 'recovery';
  return null;
}

export function isStoredSaveRecordV1(value:unknown,expectedSlotId?:string):value is StoredSaveRecordV1{
  if(!plainDataRecord(value))return false;
  try{
    const role=typeof value.slotId==='string'?expectedRoleForSlot(value.slotId):null;
    if(value.persistenceVersion!==PERSISTENCE_VERSION||typeof value.slotId!=='string'||role===null||value.role!==role)return false;
    if(expectedSlotId!==undefined&&value.slotId!==expectedSlotId)return false;
    if(value.payloadKind!=='canonical-game'&&value.payloadKind!=='legacy-exact-bytes')return false;
    if(value.encoding!==PERSISTENCE_ENCODING||!safeNonnegative(value.byteLength)||typeof value.sha256!=='string'||!SHA256.test(value.sha256))return false;
    if(!(value.payload instanceof ArrayBuffer)||Object.getPrototypeOf(value.payload)!==ArrayBuffer.prototype||value.payload.byteLength!==value.byteLength)return false;
    try{new Uint8Array(value.payload);}catch{return false;}
    if(value.declaredRootVersion!==null&&!safePositive(value.declaredRootVersion))return false;
    if(role==='recovery')return value.revision===null;
    return safePositive(value.revision)&&value.payloadKind==='canonical-game';
  }catch{return false;}
}

export function asPreviousRecord(primary:StoredSaveRecordV1):StoredSaveRecordV1{
  if(!isStoredSaveRecordV1(primary,PRIMARY_SLOT))throw Error('Invalid primary save record.');
  return Object.freeze({...primary,slotId:PREVIOUS_SLOT,role:'previous' as const});
}

import {isCanonicalGamePayload,parseGame,serializeGame,type LoadGameResult} from '../engine/save';
import type {Game} from '../engine/types';
import {isStoredSaveRecordV1,PERSISTENCE_ENCODING,PERSISTENCE_VERSION,type SavePayloadKind,type SaveRecordRole,type StoredSaveRecordV1} from './record';

export type PersistenceDataFailure='invalid-envelope'|'unsupported-persistence-version'|'unsupported-encoding'|'byte-length-mismatch'|'checksum-mismatch'|'invalid-game';

export class PersistenceDataError extends Error{
  constructor(readonly reason:PersistenceDataFailure,message:string){super(message);this.name='PersistenceDataError';}
}

const encoder=new TextEncoder();
const decoder=new TextDecoder('utf-8',{fatal:true});
const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');
export async function sha256Bytes(bytes:Uint8Array):Promise<`sha256:${string}`>{return `sha256:${hex(await crypto.subtle.digest('SHA-256',bytes))}`;}
export async function sha256Text(value:string):Promise<`sha256:${string}`>{return sha256Bytes(encoder.encode(value));}
export function exactOwnedArrayBuffer(bytes:Uint8Array):ArrayBuffer{const owned=new ArrayBuffer(bytes.byteLength);new Uint8Array(owned).set(bytes);return owned;}

function declaredRootVersion(raw:string):number|null{
  try{const parsed:unknown=JSON.parse(raw);if(typeof parsed==='object'&&parsed!==null&&!Array.isArray(parsed)){const version=(parsed as Record<string,unknown>).version;return typeof version==='number'&&Number.isSafeInteger(version)&&version>0?version:null;}}catch{}
  return null;
}

export async function recordFromRaw(slotId:string,role:SaveRecordRole,revision:number|null,payloadKind:SavePayloadKind,raw:string):Promise<StoredSaveRecordV1>{
  const encoded=encoder.encode(raw),payload=exactOwnedArrayBuffer(encoded),bytes=new Uint8Array(payload),record:StoredSaveRecordV1={persistenceVersion:PERSISTENCE_VERSION,slotId,role,revision,payloadKind,encoding:PERSISTENCE_ENCODING,declaredRootVersion:declaredRootVersion(raw),byteLength:bytes.byteLength,sha256:await sha256Bytes(bytes),payload};
  if(!isStoredSaveRecordV1(record,slotId))throw Error('Prepared save record is invalid.');
  return Object.freeze(record);
}

export async function prepareCanonicalRecord(game:Game,slotId:string,role:Extract<SaveRecordRole,'primary'|'previous'>,revision:number):Promise<{record:StoredSaveRecordV1;game:Game;raw:string}>{
  const serialized=serializeGame(game);if(!serialized.ok)throw new PersistenceDataError('invalid-game',serialized.error);
  return {record:await recordFromRaw(slotId,role,revision,'canonical-game',serialized.raw),game:serialized.game,raw:serialized.raw};
}

export async function verifyRecord(record:unknown,expectedSlotId:string):Promise<{record:StoredSaveRecordV1;raw:string;result:LoadGameResult}>{
  try{if(typeof record==='object'&&record!==null&&!Array.isArray(record)){
    const version=Object.getOwnPropertyDescriptor(record,'persistenceVersion'),encoding=Object.getOwnPropertyDescriptor(record,'encoding'),payload=Object.getOwnPropertyDescriptor(record,'payload'),length=Object.getOwnPropertyDescriptor(record,'byteLength');
    if(version&&'value' in version&&version.value!==PERSISTENCE_VERSION)throw new PersistenceDataError('unsupported-persistence-version','This save uses an unsupported persistence version.');
    if(encoding&&'value' in encoding&&encoding.value!==PERSISTENCE_ENCODING)throw new PersistenceDataError('unsupported-encoding','This save uses an unsupported encoding.');
    if(payload&&'value' in payload&&payload.value instanceof ArrayBuffer&&length&&'value' in length&&typeof length.value==='number'&&payload.value.byteLength!==length.value)throw new PersistenceDataError('byte-length-mismatch','The saved payload length is incorrect.');
  }}catch(error){if(error instanceof PersistenceDataError)throw error;}
  if(!isStoredSaveRecordV1(record,expectedSlotId))throw new PersistenceDataError('invalid-envelope','The saved record envelope is invalid.');
  let bytes:Uint8Array;try{bytes=new Uint8Array(record.payload);}catch{throw new PersistenceDataError('invalid-envelope','The saved binary payload is invalid.');}
  if(bytes.byteLength!==record.byteLength)throw new PersistenceDataError('byte-length-mismatch','The saved payload length is incorrect.');
  if(await sha256Bytes(bytes)!==record.sha256)throw new PersistenceDataError('checksum-mismatch','The saved payload checksum does not match.');
  let raw:string;try{raw=decoder.decode(bytes);}catch{throw new PersistenceDataError('invalid-game','The saved payload is not valid UTF-8.');}
  const result=parseGame(raw);if(!result.game)throw new PersistenceDataError('invalid-game',result.error??'The saved Game is invalid.');
  if(record.payloadKind==='canonical-game'){
    if(!isCanonicalGamePayload(raw))throw new PersistenceDataError('invalid-game','The saved canonical payload is not canonical.');
  }
  return {record,raw,result};
}

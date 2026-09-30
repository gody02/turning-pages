import {asPreviousRecord,isStoredSaveRecordV1,PRIMARY_SLOT,type StoredSaveRecordV1} from './record';
import {sha256Bytes} from './payload';

export const PERSISTENCE_DATABASE_NAME='turning-pages';
export const PERSISTENCE_DATABASE_VERSION=1;
export const SAVE_RECORDS_STORE='save-records';
export const PERSISTENCE_META_STORE='persistence-meta';
export const LOCAL_STORAGE_MIGRATION_META_KEY='local-storage-migration-v1';

export type RepositoryFailure='backend-unavailable'|'transaction-aborted'|'quota'|'conflict'|'invalid-record'|'revision-overflow';
export class PersistenceRepositoryError extends Error{
  constructor(readonly reason:RepositoryFailure,message:string){super(message);this.name='PersistenceRepositoryError';}
}
export interface IndexedDbFaults { beforeWrites?():void; afterWrites?(transaction:IDBTransaction):void }
export interface MigrationReceiptV1 {key:typeof LOCAL_STORAGE_MIGRATION_META_KEY;version:1;legacySha256:`sha256:${string}`}

const request=<T>(value:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{value.onsuccess=()=>resolve(value.result);value.onerror=()=>reject(value.error??Error('IndexedDB request failed.'));});
function repositoryError(error:unknown):PersistenceRepositoryError{
  if(error instanceof PersistenceRepositoryError)return error;
  if(error instanceof DOMException&&error.name==='QuotaExceededError')return new PersistenceRepositoryError('quota','Browser storage quota was exceeded.');
  const detail=error instanceof Error?` ${error.name}: ${error.message}`:'';return new PersistenceRepositoryError('transaction-aborted',`The browser storage transaction was aborted.${detail}`);
}
function readwrite(db:IDBDatabase,stores:string|string[]):IDBTransaction{return db.transaction(stores,'readwrite');}
function snapshotRecord(record:StoredSaveRecordV1):StoredSaveRecordV1{return Object.freeze({...record,payload:record.payload.slice(0)});}
async function integrityCheckedRecord(record:StoredSaveRecordV1):Promise<StoredSaveRecordV1>{
  let snapshot:StoredSaveRecordV1;try{snapshot=snapshotRecord(record);}catch{throw new PersistenceRepositoryError('invalid-record','The prepared binary payload is invalid.');}
  if(await sha256Bytes(new Uint8Array(snapshot.payload))!==snapshot.sha256)throw new PersistenceRepositoryError('invalid-record','The prepared binary payload changed after integrity calculation.');
  return snapshot;
}

export class IndexedDbSaveRepository {
  private constructor(private readonly db:IDBDatabase,private readonly faults?:IndexedDbFaults){}

  static open(factory:IDBFactory=globalThis.indexedDB,name=PERSISTENCE_DATABASE_NAME,faults?:IndexedDbFaults):Promise<IndexedDbSaveRepository>{
    return new Promise((resolve,reject)=>{
      let open:IDBOpenDBRequest;try{open=factory.open(name,PERSISTENCE_DATABASE_VERSION);}catch{reject(new PersistenceRepositoryError('backend-unavailable','IndexedDB is unavailable.'));return;}
      open.onupgradeneeded=()=>{const db=open.result;if(!db.objectStoreNames.contains(SAVE_RECORDS_STORE))db.createObjectStore(SAVE_RECORDS_STORE,{keyPath:'slotId'});if(!db.objectStoreNames.contains(PERSISTENCE_META_STORE))db.createObjectStore(PERSISTENCE_META_STORE,{keyPath:'key'});};
      open.onerror=()=>reject(new PersistenceRepositoryError('backend-unavailable','IndexedDB could not be opened.'));
      open.onblocked=()=>reject(new PersistenceRepositoryError('backend-unavailable','IndexedDB is blocked by another tab.'));
      open.onsuccess=()=>resolve(new IndexedDbSaveRepository(open.result,faults));
    });
  }

  close(){this.db.close();}
  async getRecord(slotId:string):Promise<unknown>{try{return await request(this.db.transaction(SAVE_RECORDS_STORE,'readonly').objectStore(SAVE_RECORDS_STORE).get(slotId));}catch{throw new PersistenceRepositoryError('backend-unavailable','The saved record could not be read.');}}
  async getMigrationReceipt():Promise<MigrationReceiptV1|undefined>{try{return await request(this.db.transaction(PERSISTENCE_META_STORE,'readonly').objectStore(PERSISTENCE_META_STORE).get(LOCAL_STORAGE_MIGRATION_META_KEY)) as MigrationReceiptV1|undefined;}catch{throw new PersistenceRepositoryError('backend-unavailable','Persistence metadata could not be read.');}}
  async listRecordKeys():Promise<readonly string[]>{try{return (await request(this.db.transaction(SAVE_RECORDS_STORE,'readonly').objectStore(SAVE_RECORDS_STORE).getAllKeys())).filter((key):key is string=>typeof key==='string').sort();}catch{throw new PersistenceRepositoryError('backend-unavailable','Recovery records could not be listed.');}}

  async commitSave(candidateInput:StoredSaveRecordV1,expectedRevision:number|null,recoveryInputs:readonly StoredSaveRecordV1[]=[]):Promise<number>{
    const candidate=await integrityCheckedRecord(candidateInput),recoveries=await Promise.all(recoveryInputs.map(integrityCheckedRecord));
    if(!isStoredSaveRecordV1(candidate,PRIMARY_SLOT)||candidate.role!=='primary')return Promise.reject(new PersistenceRepositoryError('invalid-record','The candidate primary record is invalid.'));
    if(candidate.revision!==(expectedRevision===null?1:expectedRevision+1))return Promise.reject(new PersistenceRepositoryError('invalid-record','The candidate revision is invalid.'));
    if(recoveries.some(record=>!isStoredSaveRecordV1(record,record.slotId)||record.role!=='recovery'))return Promise.reject(new PersistenceRepositoryError('invalid-record','A recovery record is invalid.'));
    return new Promise((resolve,reject)=>{
      const tx=readwrite(this.db,SAVE_RECORDS_STORE),store=tx.objectStore(SAVE_RECORDS_STORE),primaryRequest=store.get(PRIMARY_SLOT),recoveryRequests=recoveries.map(record=>({record,request:store.get(record.slotId)}));
      let pending=1+recoveryRequests.length,failure:PersistenceRepositoryError|null=null,wrote=false;
      const fail=(error:PersistenceRepositoryError)=>{failure=error;try{tx.abort();}catch{};};
      const track=(value:IDBRequest)=>{value.onerror=()=>{if(!failure)failure=repositoryError(value.error);};return value;};
      const ready=()=>{if(--pending!==0||failure)return;try{
        const current=primaryRequest.result as unknown,actualRevision=current===undefined?null:isStoredSaveRecordV1(current,PRIMARY_SLOT)?current.revision:null;
        if(current!==undefined&&actualRevision===null){fail(new PersistenceRepositoryError('invalid-record','The current primary record is invalid.'));return;}
        if(actualRevision!==expectedRevision){fail(new PersistenceRepositoryError('conflict','Another tab changed the current save.'));return;}
        if(actualRevision===Number.MAX_SAFE_INTEGER){fail(new PersistenceRepositoryError('revision-overflow','The persistence revision cannot advance safely.'));return;}
        this.faults?.beforeWrites?.();
        recoveryRequests.forEach(({record,request:existing})=>{if(existing.result===undefined)track(store.add(record));});
        if(current!==undefined)track(store.put(asPreviousRecord(current as StoredSaveRecordV1)));
        track(store.put(candidate));wrote=true;this.faults?.afterWrites?.(tx);
      }catch(error){fail(repositoryError(error));}};
      primaryRequest.onsuccess=ready;primaryRequest.onerror=()=>fail(repositoryError(primaryRequest.error));
      recoveryRequests.forEach(({request:value})=>{value.onsuccess=ready;value.onerror=()=>fail(repositoryError(value.error));});
      tx.oncomplete=()=>wrote?resolve(candidate.revision!):reject(failure??new PersistenceRepositoryError('transaction-aborted','No save was written.'));
      tx.onabort=()=>reject(failure??repositoryError(tx.error));tx.onerror=()=>{if(!failure)failure=repositoryError(tx.error);};
    });
  }

  async commitInitialMigration(primaryInput:StoredSaveRecordV1,recoveryInputs:readonly StoredSaveRecordV1[],receipt:MigrationReceiptV1):Promise<void>{
    const primary=await integrityCheckedRecord(primaryInput),recoveries=await Promise.all(recoveryInputs.map(integrityCheckedRecord));
    if(!isStoredSaveRecordV1(primary,PRIMARY_SLOT)||primary.revision!==1||recoveries.some(record=>!isStoredSaveRecordV1(record,record.slotId)||record.role!=='recovery'))return Promise.reject(new PersistenceRepositoryError('invalid-record','Migration records are invalid.'));
    return new Promise((resolve,reject)=>{
      const tx=readwrite(this.db,[SAVE_RECORDS_STORE,PERSISTENCE_META_STORE]),records=tx.objectStore(SAVE_RECORDS_STORE),meta=tx.objectStore(PERSISTENCE_META_STORE),primaryRequest=records.get(PRIMARY_SLOT),recoveryRequests=recoveries.map(record=>({record,request:records.get(record.slotId)}));
      let pending=1+recoveryRequests.length,failure:PersistenceRepositoryError|null=null,wrote=false;
      const fail=(error:PersistenceRepositoryError)=>{failure=error;try{tx.abort();}catch{};};
      const track=(value:IDBRequest)=>{value.onerror=()=>{if(!failure)failure=repositoryError(value.error);};return value;};
      const ready=()=>{if(--pending!==0||failure)return;try{
        if(primaryRequest.result!==undefined){fail(new PersistenceRepositoryError('conflict','An IndexedDB primary already exists.'));return;}
        this.faults?.beforeWrites?.();
        recoveryRequests.forEach(({record,request:existing})=>{if(existing.result===undefined)track(records.add(record));});
        track(records.add(primary));track(meta.put(receipt));wrote=true;this.faults?.afterWrites?.(tx);
      }catch(error){fail(repositoryError(error));}};
      primaryRequest.onsuccess=ready;primaryRequest.onerror=()=>fail(repositoryError(primaryRequest.error));
      recoveryRequests.forEach(({request:value})=>{value.onsuccess=ready;value.onerror=()=>fail(repositoryError(value.error));});
      tx.oncomplete=()=>wrote?resolve():reject(failure??new PersistenceRepositoryError('transaction-aborted','Migration wrote no records.'));
      tx.onabort=()=>reject(failure??repositoryError(tx.error));tx.onerror=()=>{if(!failure)failure=repositoryError(tx.error);};
    });
  }
}

export function deletePersistenceDatabase(factory:IDBFactory=globalThis.indexedDB,name=PERSISTENCE_DATABASE_NAME):Promise<void>{return new Promise((resolve,reject)=>{const value=factory.deleteDatabase(name);value.onsuccess=()=>resolve();value.onerror=()=>reject(value.error);value.onblocked=()=>reject(Error('IndexedDB deletion was blocked.'));});}

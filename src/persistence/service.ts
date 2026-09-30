import {isGame,parseGame,RECOVERY_SNAPSHOTS,requiredRecoverySnapshotKeys,SAVE_KEY,serializeGame,type RecoveryDescriptor} from '../engine/save';
import type {Game} from '../engine/types';
import {IndexedDbSaveRepository,LOCAL_STORAGE_MIGRATION_META_KEY,type MigrationReceiptV1} from './indexedDb';
import {prepareCanonicalRecord,recordFromRaw,sha256Text,verifyRecord} from './payload';
import {LEGACY_PRIMARY_RECOVERY_SLOT,PREVIOUS_SLOT,PRIMARY_SLOT,RECOVERY_SLOT_PREFIX,type StoredSaveRecordV1} from './record';

export const INDEXEDDB_AUTHORITY_MARKER_KEY='turning-pages:indexeddb-authority-v1';
export const MAX_IMPORT_BYTES=128*1024*1024;
export interface LegacyStorage {getItem(key:string):string|null;setItem(key:string,value:string):void}
export interface ConsumedLegacyMarkerV1 {version:1;consumedLegacySha256:`sha256:${string}`}
export type StartupStatus='loaded'|'no-save'|'recovery-required'|'backend-unavailable';
export interface RecoveryChoice extends RecoveryDescriptor {slotId:string;game:Game}
export interface StaleLegacyChoice {kind:'consumed'|'changed';sha256:`sha256:${string}`;game:Game|null;error:string|null}
export interface PersistenceStartupResult {status:StartupStatus;game:Game|null;revision:number|null;recoveries:readonly RecoveryChoice[];staleLegacy:StaleLegacyChoice|null;error:string|null;markerWarning:string|null}

function marker(value:string|null):ConsumedLegacyMarkerV1|null{
  if(value===null)return null;
  try{const parsed:unknown=JSON.parse(value);if(typeof parsed!=='object'||parsed===null||Array.isArray(parsed)||Object.getPrototypeOf(parsed)!==Object.prototype)return null;const keys=Reflect.ownKeys(parsed);if(keys.length!==2||!keys.includes('version')||!keys.includes('consumedLegacySha256'))return null;const result=parsed as Record<string,unknown>;return result.version===1&&typeof result.consumedLegacySha256==='string'&&/^sha256:[0-9a-f]{64}$/.test(result.consumedLegacySha256)?result as unknown as ConsumedLegacyMarkerV1:null;}catch{return null;}
}
const recoverySlot=(legacyKey:string)=>`${RECOVERY_SLOT_PREFIX}${legacyKey}`;
const recoveryLabel=(slotId:string)=>slotId===PREVIOUS_SLOT?'Restore previous successful save':slotId===LEGACY_PRIMARY_RECOVERY_SLOT?'Recover original localStorage save':RECOVERY_SNAPSHOTS.find(item=>recoverySlot(item.key)===slotId)?.label??'Recover saved life';

export class GamePersistence {
  private constructor(readonly repository:IndexedDbSaveRepository,private readonly legacy:LegacyStorage){}
  static async open(legacy:LegacyStorage,factory:IDBFactory=globalThis.indexedDB,name?:string):Promise<GamePersistence>{return new GamePersistence(await IndexedDbSaveRepository.open(factory,name),legacy);}
  close(){this.repository.close();}

  private async validatedRecoveries():Promise<readonly RecoveryChoice[]>{
    const keys=await this.repository.listRecordKeys(),choices:RecoveryChoice[]=[];
    for(const slotId of [PREVIOUS_SLOT,...keys.filter(key=>key.startsWith(RECOVERY_SLOT_PREFIX)).sort()]){
      if(choices.some(item=>item.slotId===slotId))continue;
      const record=await this.repository.getRecord(slotId);if(record===undefined)continue;
      try{const verified=await verifyRecord(record,slotId);if(verified.result.game)choices.push({slotId,key:slotId,label:recoveryLabel(slotId),game:verified.result.game});}catch{}
    }
    return choices;
  }

  private async ensureAuthorityMarkerFromReceipt():Promise<string|null>{
    const receipt=await this.repository.getMigrationReceipt();if(!receipt)return null;
    const current=marker(this.legacy.getItem(INDEXEDDB_AUTHORITY_MARKER_KEY));if(current?.consumedLegacySha256===receipt.legacySha256)return null;
    try{this.legacy.setItem(INDEXEDDB_AUTHORITY_MARKER_KEY,JSON.stringify({version:1,consumedLegacySha256:receipt.legacySha256} satisfies ConsumedLegacyMarkerV1));return null;}catch{return 'The migrated save is safe in IndexedDB, but the stale-save protection marker could not be refreshed.';}
  }

  async initialize():Promise<PersistenceStartupResult>{
    let primary:unknown;try{primary=await this.repository.getRecord(PRIMARY_SLOT);}catch(error){return {status:'backend-unavailable',game:null,revision:null,recoveries:[],staleLegacy:null,error:error instanceof Error?error.message:'Browser storage is unavailable.',markerWarning:null};}
    if(primary!==undefined){
      try{const verified=await verifyRecord(primary,PRIMARY_SLOT),recoveries=await this.validatedRecoveries(),markerWarning=await this.ensureAuthorityMarkerFromReceipt();return {status:'loaded',game:verified.result.game,revision:verified.record.revision,recoveries,staleLegacy:null,error:null,markerWarning};}
      catch(error){return {status:'recovery-required',game:null,revision:null,recoveries:await this.validatedRecoveries(),staleLegacy:null,error:error instanceof Error?error.message:'The primary save is invalid.',markerWarning:null};}
    }
    let raw:string|null,markerRaw:string|null;try{raw=this.legacy.getItem(SAVE_KEY);markerRaw=this.legacy.getItem(INDEXEDDB_AUTHORITY_MARKER_KEY);}catch{return {status:'backend-unavailable',game:null,revision:null,recoveries:[],staleLegacy:null,error:'Legacy browser storage is unavailable.',markerWarning:null};}
    if(raw===null)return {status:'no-save',game:null,revision:null,recoveries:await this.validatedRecoveries(),staleLegacy:null,error:null,markerWarning:null};
    const legacyHash=await sha256Text(raw),consumed=marker(markerRaw);
    if(markerRaw!==null&&!consumed){const parsed=parseGame(raw);return {status:'recovery-required',game:null,revision:null,recoveries:await this.validatedRecoveries(),staleLegacy:{kind:'changed',sha256:legacyHash,game:parsed.game,error:parsed.error},error:'IndexedDB authority is missing and its localStorage authority marker is invalid. The legacy save is available only as an explicit recovery.',markerWarning:null};}
    if(consumed){
      const parsed=parseGame(raw);return {status:'recovery-required',game:null,revision:null,recoveries:await this.validatedRecoveries(),staleLegacy:{kind:consumed.consumedLegacySha256===legacyHash?'consumed':'changed',sha256:legacyHash,game:parsed.game,error:parsed.error},error:'IndexedDB authority is missing. An earlier localStorage save is available only as an explicit recovery.',markerWarning:null};
    }
    return this.migrateLegacy(raw,legacyHash);
  }

  private async migrateLegacy(raw:string,legacyHash:`sha256:${string}`):Promise<PersistenceStartupResult>{
    const parsed=parseGame(raw);if(!parsed.game)return {status:'recovery-required',game:null,revision:null,recoveries:await this.validatedRecoveries(),staleLegacy:{kind:'changed',sha256:legacyHash,game:null,error:parsed.error},error:parsed.error,markerWarning:null};
    const prepared=await prepareCanonicalRecord(parsed.game,PRIMARY_SLOT,'primary',1),records=new Map<string,StoredSaveRecordV1>();
    records.set(LEGACY_PRIMARY_RECOVERY_SLOT,await recordFromRaw(LEGACY_PRIMARY_RECOVERY_SLOT,'recovery',null,'legacy-exact-bytes',raw));
    for(const descriptor of RECOVERY_SNAPSHOTS){const legacyRecovery=this.legacy.getItem(descriptor.key);if(legacyRecovery!==null){const slotId=recoverySlot(descriptor.key);records.set(slotId,await recordFromRaw(slotId,'recovery',null,'legacy-exact-bytes',legacyRecovery));}}
    try{
      const rawValue:unknown=JSON.parse(raw);if(typeof rawValue==='object'&&rawValue!==null&&!Array.isArray(rawValue))for(const key of requiredRecoverySnapshotKeys(rawValue as Game,prepared.game)){const slotId=recoverySlot(key);if(!records.has(slotId))records.set(slotId,await recordFromRaw(slotId,'recovery',null,'legacy-exact-bytes',raw));}
    }catch{}
    const receipt:MigrationReceiptV1={key:LOCAL_STORAGE_MIGRATION_META_KEY,version:1,legacySha256:legacyHash};
    await this.repository.commitInitialMigration(prepared.record,[...records.values()],receipt);
    const reread=await this.repository.getRecord(PRIMARY_SLOT),verified=await verifyRecord(reread,PRIMARY_SLOT);if(!verified.result.game)throw Error('Migrated primary verification failed.');
    let markerWarning:string|null=null;try{this.legacy.setItem(INDEXEDDB_AUTHORITY_MARKER_KEY,JSON.stringify({version:1,consumedLegacySha256:legacyHash} satisfies ConsumedLegacyMarkerV1));}catch{markerWarning='The save migrated, but the stale-save protection marker could not be written.';}
    return {status:'loaded',game:verified.result.game,revision:1,recoveries:await this.validatedRecoveries(),staleLegacy:null,error:null,markerWarning};
  }

  async save(game:Game,expectedRevision:number|null):Promise<number>{
    const nextRevision=expectedRevision===null?1:expectedRevision+1;if(!Number.isSafeInteger(nextRevision))throw Error('Persistence revision overflow.');
    const prepared=await prepareCanonicalRecord(game,PRIMARY_SLOT,'primary',nextRevision),recoveries:StoredSaveRecordV1[]=[];
    const previous=await this.repository.getRecord(PRIMARY_SLOT);
    if(previous!==undefined){const verified=await verifyRecord(previous,PRIMARY_SLOT),previousValue:unknown=JSON.parse(verified.raw);if(isGame(previousValue))for(const key of requiredRecoverySnapshotKeys(previousValue,prepared.game)){const slotId=recoverySlot(key);recoveries.push(await recordFromRaw(slotId,'recovery',null,'legacy-exact-bytes',verified.raw));}}
    return this.repository.commitSave(prepared.record,expectedRevision,recoveries);
  }

  async restore(slotId:string,expectedRevision:number|null):Promise<{game:Game;revision:number}>{const stored=await this.repository.getRecord(slotId),verified=await verifyRecord(stored,slotId);if(!verified.result.game)throw Error('Recovery Game is unavailable.');return {game:verified.result.game,revision:await this.save(verified.result.game,expectedRevision)};}
  async recoverLegacyExplicit(choice:StaleLegacyChoice,expectedRevision:number|null):Promise<{game:Game;revision:number}>{if(!choice.game)throw Error(choice.error??'The legacy save is invalid.');return {game:choice.game,revision:await this.save(choice.game,expectedRevision)};}
  async recoveries(){return this.validatedRecoveries();}
}

export function exportCanonicalGame(game:Game):string{const result=serializeGame(game);if(!result.ok)throw Error(result.error);return result.raw;}
export function importCanonicalGame(raw:string):Game{const bytes=new TextEncoder().encode(raw).byteLength;if(bytes>MAX_IMPORT_BYTES)throw Error('The backup exceeds the 128 MiB technical import limit.');const result=parseGame(raw);if(!result.game)throw Error(result.error??'The backup is invalid.');return result.game;}

export type StoragePersistenceState='persistent'|'best-effort'|'unavailable';
export async function storageEstimate():Promise<StorageEstimate|null>{try{return await navigator.storage?.estimate?.()??null;}catch{return null;}}
export async function storagePersistenceState():Promise<StoragePersistenceState>{try{return await navigator.storage?.persisted?.()?'persistent':'best-effort';}catch{return 'unavailable';}}
export async function requestPersistentStorage():Promise<StoragePersistenceState>{try{if(!navigator.storage?.persist)return 'unavailable';return await navigator.storage.persist()?'persistent':'best-effort';}catch{return 'unavailable';}}


import {isSimulationDate} from '../core/clock';
import {isJsonValue} from '../core/json';
import type {SimulationDate} from '../core/model';
import type {GeographyPartitionManifestEntry,GeographyPartitionNodeV1,GeographyPartitionPackageV1,GeographyRegistryV1,GeographySourceDescriptorV1,PlaceIdentityManifestEntry,PlaceIdentityV1} from './types';

const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const stableIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=160&&value.includes('.')&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
const versionedIdentifier=(value:unknown):value is string=>stableIdentifier(value)&&/(?:^|[._-])v[1-9]\d*$/.test(value);
const contextIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=100&&/^[a-z][a-z0-9-]*$/.test(value);
const text=(value:unknown,max=3000):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const fingerprint=(value:unknown):value is string=>typeof value==='string'&&/^fnv1a64-v1:[0-9a-f]{16}$/.test(value);
const record=(value:unknown):value is Record<string,unknown>=>{try{return !!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);}catch{return false;}};
const fields=(value:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>{try{const allowed=new Set([...required,...optional]),keys=Reflect.ownKeys(value);return required.every(key=>keys.includes(key))&&keys.every(key=>typeof key==='string'&&allowed.has(key)&&!!Object.getOwnPropertyDescriptor(value,key)?.enumerable&&'value' in Object.getOwnPropertyDescriptor(value,key)!);}catch{return false;}};
const dense=(value:unknown):value is readonly unknown[]=>{try{if(!Array.isArray(value)||Object.keys(value).length!==value.length||Reflect.ownKeys(value).length!==value.length+1)return false;for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,index);if(!descriptor?.enumerable||!('value' in descriptor))return false;}return true;}catch{return false;}};
const unique=(items:readonly string[])=>new Set(items).size===items.length;
const sorted=(items:readonly string[])=>items.every((item,index)=>index===0||codePointCompare(items[index-1],item)<0);
const exactDate=(value:unknown):value is SimulationDate=>record(value)&&fields(value,['year','month','day'])&&isSimulationDate(value);
const stringArray=(value:unknown):value is readonly string[]=>dense(value)&&value.every(item=>text(item))&&unique(value)&&sorted(value);
function freezeDeep(value:unknown):void{if(!value||typeof value!=='object'||Object.isFrozen(value))return;for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(descriptor&&'value' in descriptor)freezeDeep(descriptor.value);}Object.freeze(value);}
function immutable<T>(value:T):T{const copy=structuredClone(value);freezeDeep(copy);return copy;}

function validPlace(value:unknown):value is PlaceIdentityV1{return record(value)&&fields(value,['placeId','countryId'])&&stableIdentifier(value.placeId)&&contextIdentifier(value.countryId);}
function validPlaceManifestEntry(value:unknown):value is PlaceIdentityManifestEntry{return record(value)&&fields(value,['placeId','fingerprint'])&&stableIdentifier(value.placeId)&&fingerprint(value.fingerprint);}
function validSource(value:unknown):value is GeographySourceDescriptorV1{
 if(!record(value)||!fields(value,['version','id','producer','datasetId','releaseId','title','jurisdiction','referenceDate','classification','methodology','licence'],['bundledArtifact','externalLocator'])||value.version!==1||!stableIdentifier(value.id)||!text(value.producer,300)||!text(value.datasetId,300)||!text(value.releaseId,300)||!text(value.title,500)||!contextIdentifier(value.jurisdiction)||!exactDate(value.referenceDate)||!text(value.methodology)||!text(value.licence,1000))return false;
 if(typeof value.classification!=='string'||!['statutory-institutional','observed-statistical-data','estimated','authored-gameplay-abstraction'].includes(value.classification))return false;
 if(value.bundledArtifact!==undefined&&(!record(value.bundledArtifact)||!fields(value.bundledArtifact,['id','sha256'])||!stableIdentifier(value.bundledArtifact.id)||typeof value.bundledArtifact.sha256!=='string'||!/^sha256:[0-9a-f]{64}$/.test(value.bundledArtifact.sha256)))return false;
 return value.externalLocator===undefined||text(value.externalLocator,1000);
}
function validNode(value:unknown):value is GeographyPartitionNodeV1{return record(value)&&fields(value,['placeId','displayName','kindId','parentPlaceId','populationAllocationCell','sourceIds'])&&stableIdentifier(value.placeId)&&text(value.displayName,500)&&stableIdentifier(value.kindId)&&(value.parentPlaceId===null||stableIdentifier(value.parentPlaceId))&&typeof value.populationAllocationCell==='boolean'&&dense(value.sourceIds)&&value.sourceIds.length>0&&value.sourceIds.every(stableIdentifier)&&unique(value.sourceIds)&&sorted(value.sourceIds);}
function validManifestEntry(value:unknown):value is GeographyPartitionManifestEntry{return record(value)&&fields(value,['partitionId','fingerprint'])&&versionedIdentifier(value.partitionId)&&fingerprint(value.fingerprint);}

const packageFields=['version','partitionId','fingerprint','countryId','effectiveDate','sources','nodes','limitations'] as const;
function structurallyValidPackage(value:unknown):value is GeographyPartitionPackageV1{
 try{
  if(!record(value)||!fields(value,packageFields)||!isJsonValue(value)||value.version!==1||!versionedIdentifier(value.partitionId)||!fingerprint(value.fingerprint)||!contextIdentifier(value.countryId)||!exactDate(value.effectiveDate)||!dense(value.sources)||value.sources.length===0||!value.sources.every(validSource)||!dense(value.nodes)||value.nodes.length===0||!value.nodes.every(validNode)||!stringArray(value.limitations))return false;
  const sources=value.sources as unknown as readonly GeographySourceDescriptorV1[],nodes=value.nodes as unknown as readonly GeographyPartitionNodeV1[];
  if(!unique(sources.map(item=>item.id))||!sorted(sources.map(item=>item.id))||!unique(nodes.map(item=>item.placeId))||!sorted(nodes.map(item=>item.placeId)))return false;
  const sourceIds=new Set(sources.map(item=>item.id)),nodeIds=new Set(nodes.map(item=>item.placeId));if(nodes.some(node=>node.sourceIds.some(id=>!sourceIds.has(id))||node.parentPlaceId!==null&&!nodeIds.has(node.parentPlaceId)||node.parentPlaceId===node.placeId))return false;
  const roots=nodes.filter(node=>node.parentPlaceId===null);if(roots.length!==1)return false;
  const children=new Map<string,string[]>();for(const node of nodes)if(node.parentPlaceId!==null){const list=children.get(node.parentPlaceId)??[];list.push(node.placeId);children.set(node.parentPlaceId,list);}
  if(nodes.some(node=>node.populationAllocationCell&&(children.get(node.placeId)?.length??0)>0))return false;
  const visited=new Set<string>(),queue=[roots[0].placeId];for(let cursor=0;cursor<queue.length;cursor++){const id=queue[cursor];if(visited.has(id))return false;visited.add(id);for(const child of children.get(id)??[])queue.push(child);}
  return visited.size===nodes.length;
 }catch{return false;}
}

function canonicalSource(source:GeographySourceDescriptorV1):GeographySourceDescriptorV1{return {version:1,id:source.id,producer:source.producer,datasetId:source.datasetId,releaseId:source.releaseId,title:source.title,jurisdiction:source.jurisdiction,referenceDate:{...source.referenceDate},classification:source.classification,methodology:source.methodology,licence:source.licence,...(source.bundledArtifact===undefined?{}:{bundledArtifact:{...source.bundledArtifact}}),...(source.externalLocator===undefined?{}:{externalLocator:source.externalLocator})};}
function canonicalPackage(value:GeographyPartitionPackageV1):GeographyPartitionPackageV1{return {version:1,partitionId:value.partitionId,fingerprint:value.fingerprint,countryId:value.countryId,effectiveDate:{...value.effectiveDate},sources:value.sources.map(canonicalSource).sort((a,b)=>codePointCompare(a.id,b.id)),nodes:value.nodes.map(node=>({...node,sourceIds:[...node.sourceIds].sort(codePointCompare)})).sort((a,b)=>codePointCompare(a.placeId,b.placeId)),limitations:[...value.limitations].sort(codePointCompare)};}
const canonicalStringify=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>codePointCompare(a,b))):item);
/** FNV-1a detects accidental semantic mutation; it is not a cryptographic authenticity primitive. */
function fnv1a64(value:string):string{let hash=0xcbf29ce484222325n;for(const byte of new TextEncoder().encode(value)){hash^=BigInt(byte);hash=BigInt.asUintN(64,hash*0x100000001b3n);}return hash.toString(16).padStart(16,'0');}
function semanticProjection(value:GeographyPartitionPackageV1):unknown{const canonical=canonicalPackage(value);return {...canonical,partitionId:undefined,fingerprint:undefined};}

export function fingerprintPlaceIdentity(value:PlaceIdentityV1):string{if(!validPlace(value))throw Error('Cannot fingerprint an invalid Place identity.');return `fnv1a64-v1:${fnv1a64(canonicalStringify({version:1,placeId:value.placeId,countryId:value.countryId}))}`;}
export function fingerprintGeographyPartition(value:GeographyPartitionPackageV1):string{if(!structurallyValidPackage(canonicalPackage(value)))throw Error('Cannot fingerprint an invalid Geography partition package.');return `fnv1a64-v1:${fnv1a64(canonicalStringify(semanticProjection(value)))}`;}
export function validateGeographyPartitionPackage(value:unknown):value is GeographyPartitionPackageV1{try{if(!structurallyValidPackage(value))return false;const pkg=value as GeographyPartitionPackageV1;return canonicalStringify(pkg)===canonicalStringify(canonicalPackage(pkg))&&fingerprintGeographyPartition(pkg)===pkg.fingerprint;}catch{return false;}}
export function withGeographyPartitionFingerprint(value:Omit<GeographyPartitionPackageV1,'fingerprint'>):GeographyPartitionPackageV1{
 try{if(!record(value)||!fields(value,packageFields.filter(key=>key!=='fingerprint')))throw Error();const candidate=canonicalPackage({...structuredClone(value),fingerprint:'fnv1a64-v1:0000000000000000'} as GeographyPartitionPackageV1),result=canonicalPackage({...candidate,fingerprint:fingerprintGeographyPartition(candidate)});if(!validateGeographyPartitionPackage(result))throw Error();return immutable(result);}catch{throw Error('Invalid Geography partition package.');}
}

export function validateGeographyRegistry(value:unknown):value is GeographyRegistryV1{
 try{
  if(!record(value)||!fields(value,['version','places','placeManifest','partitions','manifest'])||value.version!==1||!dense(value.places)||!dense(value.placeManifest)||!dense(value.partitions)||!dense(value.manifest)||!value.places.every(validPlace)||!value.placeManifest.every(validPlaceManifestEntry)||!value.partitions.every(validateGeographyPartitionPackage)||!value.manifest.every(validManifestEntry))return false;
  const places=value.places as readonly PlaceIdentityV1[],placeManifest=value.placeManifest as readonly PlaceIdentityManifestEntry[],partitions=value.partitions as readonly GeographyPartitionPackageV1[],manifest=value.manifest as readonly GeographyPartitionManifestEntry[];
  if(!unique(places.map(item=>item.placeId))||!sorted(places.map(item=>item.placeId))||!unique(placeManifest.map(item=>item.placeId))||!sorted(placeManifest.map(item=>item.placeId))||placeManifest.length!==places.length||!unique(partitions.map(item=>item.partitionId))||!sorted(partitions.map(item=>item.partitionId))||!unique(manifest.map(item=>item.partitionId))||!sorted(manifest.map(item=>item.partitionId))||manifest.length!==partitions.length)return false;
  const identityById=new Map(places.map(item=>[item.placeId,item])),placeFingerprintById=new Map(placeManifest.map(item=>[item.placeId,item.fingerprint])),fingerprintById=new Map(manifest.map(item=>[item.partitionId,item.fingerprint]));
  for(const place of places)if(placeFingerprintById.get(place.placeId)!==fingerprintPlaceIdentity(place))return false;
  for(const pkg of partitions){if(fingerprintById.get(pkg.partitionId)!==pkg.fingerprint)return false;for(const node of pkg.nodes)if(identityById.get(node.placeId)?.countryId!==pkg.countryId)return false;}
  return true;
 }catch{return false;}
}

export function createGeographyRegistry(places:readonly PlaceIdentityV1[],partitions:readonly GeographyPartitionPackageV1[],manifest:readonly GeographyPartitionManifestEntry[],placeManifest:readonly PlaceIdentityManifestEntry[]):GeographyRegistryV1{
 try{const candidate={version:1 as const,places:[...structuredClone(places)].sort((a,b)=>codePointCompare(a.placeId,b.placeId)),placeManifest:[...structuredClone(placeManifest)].sort((a,b)=>codePointCompare(a.placeId,b.placeId)),partitions:[...structuredClone(partitions)].sort((a,b)=>codePointCompare(a.partitionId,b.partitionId)),manifest:[...structuredClone(manifest)].sort((a,b)=>codePointCompare(a.partitionId,b.partitionId))};if(!validateGeographyRegistry(candidate))throw Error();return immutable(candidate);}catch{throw Error('Invalid Geography registry.');}
}

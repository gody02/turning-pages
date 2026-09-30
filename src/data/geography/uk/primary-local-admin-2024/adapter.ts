import {strFromU8,unzipSync} from 'fflate';
import {createGeographyRegistry,fingerprintGeographyPartition,fingerprintPlaceIdentity,validateGeographyPartitionPackage,validateGeographyRegistry} from '../../../../engine/geography/package';
import type {GeographyPartitionPackageV1,GeographyRegistryV1,PlaceIdentityManifestEntry,PlaceIdentityV1} from '../../../../engine/geography/types';
import buildReportJson from './build-report.json';
import compiledPartitionJson from './compiled-partition.json';
import continuityLedgerJson from './continuity-ledger.json';
import normalizedJson from './normalized-local-authorities.json';
import packageManifestJson from './package-manifest.json';
import placeIdentitiesJson from './place-identities.json';
import placeManifestJson from './place-manifest.json';
import populationIndexJson from './population-area-index.json';
import sourceManifestJson from './source-manifest.json';

export const UK_PRIMARY_LOCAL_ADMIN_PARTITION_ID='geography.uk.primary-local-admin-2024-06-30-v1' as const;
export const UK_GEOGRAPHY_PLACE_COUNT=366 as const;
export const UK_GEOGRAPHY_ALLOCATION_CELL_COUNT=361 as const;

export type UkGeographyArtifact=Readonly<{
 id:string;producer:string;product:string;releaseId:string;referenceDate:string;filename:string;mediaType:string;size:number;sha256:string;
 sourceLocator:string;purpose:string;expectedSchema:string;
}>;
export type UkGeographySourceManifest=Readonly<{
 version:1;bundleId:string;retrievalDate:string;licence:string;licenceLocator:string;attribution:string;artifacts:readonly UkGeographyArtifact[];
}>;
export type UkLocalAuthorityRecord=Readonly<{
 officialCode:string;displayName:string;welshDisplayName:string|null;countryBranch:'england'|'wales'|'scotland'|'northern-ireland';kindId:string;placeId:string;parentPlaceId:string;
}>;
export type UkGeographyContinuityLedger=Readonly<{
 version:1;id:string;fingerprint:string;entries:readonly Readonly<{sourceArtifactId:string;sourceCode:string;placeId:string;decision:'new-place';reviewBasis:string}>[];
}>;
export type UkGeographyBuildReport=Readonly<{
 version:1;packageId:string;effectiveDate:string;sourceArtifacts:readonly Readonly<{filename:string;size:number;sha256:string}>[];placeCount:number;nodeCount:number;allocationCellCount:number;
 countByCountry:Readonly<Record<string,number>>;countByKindId:Readonly<Record<string,number>>;missingCodes:readonly string[];unexpectedCodes:readonly string[];duplicateCodes:readonly string[];
 populationWorkbookComparison:Readonly<{codeSetEqual:boolean;nameMismatchCount:number;countryMismatchCount:number;areaCount:number}>;
 continuityLedgerFingerprint:string;placeManifestFingerprint:string;partitionFingerprint:string;packageSerializedSize:number;
}>;

const SOURCE_MANIFEST=sourceManifestJson as unknown as UkGeographySourceManifest;
const NORMALIZED=normalizedJson as unknown as Readonly<{version:1;sourceArtifactId:string;normalization:string;records:readonly UkLocalAuthorityRecord[]}>;
const CONTINUITY=continuityLedgerJson as unknown as UkGeographyContinuityLedger;
const PLACE_IDENTITIES=placeIdentitiesJson as unknown as Readonly<{version:1;places:readonly PlaceIdentityV1[]}>;
const PLACE_MANIFEST=placeManifestJson as unknown as Readonly<{version:1;fingerprint:string;entries:readonly PlaceIdentityManifestEntry[]}>;
const PARTITION=compiledPartitionJson as unknown as GeographyPartitionPackageV1;
const PACKAGE_MANIFEST=packageManifestJson as unknown as Readonly<Record<string,string>>;
const POPULATION_INDEX=populationIndexJson as unknown as Readonly<{version:1;sourceArtifactId:string;workbookSha256:string;sheet:string;records:readonly Readonly<{officialCode:string;displayName:string;countryCode:string}>[]}>;
const BUILD_REPORT=buildReportJson as unknown as UkGeographyBuildReport;
const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const record=(value:unknown):value is Record<string,unknown>=>{try{return !!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);}catch{return false;}};
const fields=(value:Record<string,unknown>,expected:readonly string[])=>{try{const keys=Reflect.ownKeys(value);return keys.length===expected.length&&expected.every(key=>keys.includes(key))&&keys.every(key=>typeof key==='string'&&expected.includes(key)&&!!Object.getOwnPropertyDescriptor(value,key)?.enumerable&&'value' in Object.getOwnPropertyDescriptor(value,key)!);}catch{return false;}};
const dense=(value:unknown):value is readonly unknown[]=>{try{if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||Object.keys(value).length!==value.length||Reflect.ownKeys(value).length!==value.length+1)return false;for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,index);if(!descriptor?.enumerable||!('value' in descriptor))return false;}return true;}catch{return false;}};
const stable=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=160&&value.includes('.')&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
const hash=(value:unknown):value is string=>typeof value==='string'&&/^fnv1a64-v1:[0-9a-f]{16}$/.test(value);
const sha=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const isoDate=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const immutable=<T>(value:T):T=>{const copy=structuredClone(value);const freeze=(item:unknown):void=>{if(!item||typeof item!=='object'||Object.isFrozen(item))return;for(const key of Reflect.ownKeys(item)){const descriptor=Object.getOwnPropertyDescriptor(item,key);if(descriptor&&'value' in descriptor)freeze(descriptor.value);}Object.freeze(item);};freeze(copy);return copy;};
const canonicalStringify=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>codePointCompare(a,b))):item);
function fnv1a64(value:unknown):string{let result=0xcbf29ce484222325n;for(const byte of new TextEncoder().encode(canonicalStringify(value))){result^=BigInt(byte);result=BigInt.asUintN(64,result*0x100000001b3n);}return `fnv1a64-v1:${result.toString(16).padStart(16,'0')}`;}
function safeUnicode(value:string):boolean{for(let index=0;index<value.length;index++){const code=value.charCodeAt(index);if(code>=0xd800&&code<=0xdbff){if(index+1>=value.length)return false;const low=value.charCodeAt(++index);if(low<0xdc00||low>0xdfff)return false;}else if(code>=0xdc00&&code<=0xdfff)return false;}return true;}
const clean=(value:string)=>value.trim().normalize('NFC');
const country=(code:string):UkLocalAuthorityRecord['countryBranch']|undefined=>({E:'england',W:'wales',S:'scotland',N:'northern-ireland'} as const)[code[0] as 'E'|'W'|'S'|'N'];
function unitKind(code:string):string|undefined{if(code==='E09000001')return 'geography.uk.england.city-of-london';if(code==='E06000053')return 'geography.uk.england.isles-of-scilly';return ({E06:'geography.uk.england.unitary-authority',E07:'geography.uk.england.non-metropolitan-district',E08:'geography.uk.england.metropolitan-district',E09:'geography.uk.england.london-borough',W06:'geography.uk.wales.principal-area',S12:'geography.uk.scotland.council-area',N09:'geography.uk.northern-ireland.local-government-district'} as const)[code.slice(0,3) as 'E06'];}
const parent=(branch:UkLocalAuthorityRecord['countryBranch'])=>`place.uk.constituent.${branch}`;
function hex(bytes:ArrayBuffer):string{return [...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');}
export async function sha256(bytes:Uint8Array):Promise<string>{return hex(await crypto.subtle.digest('SHA-256',bytes.slice().buffer));}

function validArtifact(value:unknown):value is UkGeographyArtifact{return record(value)&&fields(value,['id','producer','product','releaseId','referenceDate','filename','mediaType','size','sha256','sourceLocator','purpose','expectedSchema'])&&stable(value.id)&&typeof value.producer==='string'&&value.producer.length>0&&typeof value.product==='string'&&value.product.length>0&&typeof value.releaseId==='string'&&value.releaseId.length>0&&isoDate(value.referenceDate)&&typeof value.filename==='string'&&value.filename.length>0&&typeof value.mediaType==='string'&&value.mediaType.length>0&&Number.isSafeInteger(value.size)&&Number(value.size)>0&&sha(value.sha256)&&typeof value.sourceLocator==='string'&&value.sourceLocator.startsWith('https://')&&typeof value.purpose==='string'&&value.purpose.length>0&&typeof value.expectedSchema==='string'&&value.expectedSchema.length>0;}
export function validateUkGeographySourceManifest(value:unknown):value is UkGeographySourceManifest{
 try{if(!record(value)||!fields(value,['version','bundleId','retrievalDate','licence','licenceLocator','attribution','artifacts'])||value.version!==1||value.bundleId!=='evidence.uk-geography.primary-local-admin-2024-v1'||!isoDate(value.retrievalDate)||typeof value.licence!=='string'||typeof value.licenceLocator!=='string'||typeof value.attribution!=='string'||!dense(value.artifacts)||value.artifacts.length!==4||!value.artifacts.every(validArtifact))return false;const artifacts=value.artifacts as readonly UkGeographyArtifact[];return new Set(artifacts.map(item=>item.id)).size===artifacts.length&&artifacts.every((item,index)=>index===0||codePointCompare(artifacts[index-1].id,item.id)<0);}catch{return false;}
}
function artifact(id:string):UkGeographyArtifact{const found=SOURCE_MANIFEST.artifacts.find(item=>item.id===id);if(!found)throw Error('UK Geography source manifest is missing a required artifact.');return found;}
export async function verifyUkGeographyArtifact(bytes:Uint8Array,id:string):Promise<UkGeographyArtifact>{if(!(bytes instanceof Uint8Array)||!validateUkGeographySourceManifest(SOURCE_MANIFEST))throw Error('Invalid UK Geography artifact request.');const expected=artifact(id);if(bytes.byteLength!==expected.size||await sha256(bytes)!==expected.sha256)throw Error(`UK Geography artifact failed integrity validation: ${expected.filename}.`);return immutable(expected);}

export function normalizeUkLocalAuthorityArtifact(value:unknown):readonly UkLocalAuthorityRecord[]{
 try{
  if(!record(value)||!fields(value,['objectIdFieldName','uniqueIdField','globalIdFieldName','serverGens','geometryType','spatialReference','fields','features'])||value.objectIdFieldName!=='FID'||value.globalIdFieldName!=='GlobalID'||value.geometryType!=='esriGeometryPolygon'||!dense(value.fields)||!dense(value.features))throw Error();
  const names=(value.fields as readonly unknown[]).map(item=>record(item)&&typeof item.name==='string'?item.name:'');if(names.join('|')!=='LAD24CD|LAD24NM|LAD24NMW'||value.features.length!==361)throw Error();
  const result:UkLocalAuthorityRecord[]=[];for(const feature of value.features){if(!record(feature)||!fields(feature,['attributes'])||!record(feature.attributes)||!fields(feature.attributes,['LAD24CD','LAD24NM','LAD24NMW']))throw Error();const code=feature.attributes.LAD24CD,name=feature.attributes.LAD24NM,welsh=feature.attributes.LAD24NMW;if(typeof code!=='string'||typeof name!=='string'||typeof welsh!=='string'||!safeUnicode(name)||!safeUnicode(welsh)||!keyCode(code))throw Error();const branch=country(code),kindId=unitKind(code);if(!branch||!kindId)throw Error();const displayName=clean(name),welshDisplayName=clean(welsh)||null;if(!displayName)throw Error();result.push({officialCode:code,displayName,welshDisplayName,countryBranch:branch,kindId,placeId:`place.uk.local-admin.${code.toLowerCase()}`,parentPlaceId:parent(branch)});}
  result.sort((a,b)=>codePointCompare(a.officialCode,b.officialCode));if(new Set(result.map(item=>item.officialCode)).size!==361)throw Error();const counts=result.reduce<Record<string,number>>((all,item)=>(all[item.countryBranch]=(all[item.countryBranch]??0)+1,all),{}),kinds=result.reduce<Record<string,number>>((all,item)=>(all[item.kindId]=(all[item.kindId]??0)+1,all),{});if(counts.england!==296||counts.wales!==22||counts.scotland!==32||counts['northern-ireland']!==11||canonicalStringify(kinds)!==canonicalStringify({'geography.uk.england.city-of-london':1,'geography.uk.england.isles-of-scilly':1,'geography.uk.england.london-borough':32,'geography.uk.england.metropolitan-district':36,'geography.uk.england.non-metropolitan-district':164,'geography.uk.england.unitary-authority':62,'geography.uk.northern-ireland.local-government-district':11,'geography.uk.scotland.council-area':32,'geography.uk.wales.principal-area':22}))throw Error();return immutable(result);
 }catch{throw Error('Invalid UK Local Authority District source artifact.');}
}
const keyCode=(value:string)=>/^[EWSN][0-9]{8}$/.test(value);
function workbookMarkers(bytes:Uint8Array):boolean{const files=unzipSync(bytes,{filter:file=>file.name==='xl/workbook.xml'}),workbook=files['xl/workbook.xml'];if(!workbook)return false;const names=[...strFromU8(workbook).matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)].map(match=>match[1]);return names.join('|')==='Cover sheet|Contents|Notes|Related publications|MYEB1|MYEB2|MYEB3|MYEB4|MYEB5';}
export async function validateUkGeographyArtifactSchema(bytes:Uint8Array,id:string):Promise<boolean>{try{await verifyUkGeographyArtifact(bytes,id);if(id==='artifact.ons.lad-may-2024-attributes-v1')return normalizeUkLocalAuthorityArtifact(JSON.parse(new TextDecoder().decode(bytes))).length===361;if(id==='artifact.ons.lad-may-2024-item-v1'){const item=JSON.parse(new TextDecoder().decode(bytes));return record(item)&&item.id==='f3528c2d6d454edab74f2648cc6a45f6'&&item.owner==='ONSGeography_data'&&item.title==='Local Authority Districts (May 2024) Boundaries UK BGC'&&item.type==='Feature Service'&&item.contentStatus==='public_authoritative';}if(id==='artifact.ons.lad-may-2024-layer-v1'){const layer=JSON.parse(new TextDecoder().decode(bytes));return record(layer)&&layer.name==='LAD_MAY_2024_UK_BGC'&&layer.type==='Feature Layer'&&record(layer.editingInfo)&&layer.editingInfo.dataLastEditDate===1719925309918;}if(id==='artifact.ons.myeb-local-authorities-mid-2024-v1')return workbookMarkers(bytes);return false;}catch{return false;}}

function validNormalized():boolean{try{if(NORMALIZED.version!==1||NORMALIZED.sourceArtifactId!=='artifact.ons.lad-may-2024-attributes-v1'||!dense(NORMALIZED.records)||NORMALIZED.records.length!==361)return false;return NORMALIZED.records.every((item,index)=>record(item)&&fields(item as unknown as Record<string,unknown>,['officialCode','displayName','welshDisplayName','countryBranch','kindId','placeId','parentPlaceId'])&&keyCode(item.officialCode)&&item.displayName===item.displayName.normalize('NFC')&&safeUnicode(item.displayName)&&stable(item.kindId)&&item.placeId===`place.uk.local-admin.${item.officialCode.toLowerCase()}`&&item.parentPlaceId===parent(item.countryBranch)&&(index===0||codePointCompare(NORMALIZED.records[index-1].officialCode,item.officialCode)<0));}catch{return false;}}
export function validateUkGeographyContinuityLedger(value:unknown):value is UkGeographyContinuityLedger{try{if(!record(value)||!fields(value,['version','id','fingerprint','entries'])||value.version!==1||value.id!=='geography.uk.place-continuity-2024-v1'||!hash(value.fingerprint)||!dense(value.entries)||value.entries.length!==361)return false;const entries=value.entries as UkGeographyContinuityLedger['entries'];if(!entries.every((entry,index)=>record(entry)&&fields(entry as unknown as Record<string,unknown>,['sourceArtifactId','sourceCode','placeId','decision','reviewBasis'])&&entry.sourceArtifactId==='artifact.ons.lad-may-2024-attributes-v1'&&keyCode(entry.sourceCode)&&entry.placeId===`place.uk.local-admin.${entry.sourceCode.toLowerCase()}`&&entry.decision==='new-place'&&entry.reviewBasis.length>0&&(index===0||codePointCompare(entries[index-1].sourceCode,entry.sourceCode)<0)))return false;return value.fingerprint===fnv1a64({version:1,entries});}catch{return false;}}
function validateProductionInputs():void{
 if(!validateUkGeographySourceManifest(SOURCE_MANIFEST)||!validNormalized()||!validateUkGeographyContinuityLedger(CONTINUITY)||PLACE_IDENTITIES.version!==1||PLACE_IDENTITIES.places.length!==366||PLACE_MANIFEST.version!==1||PLACE_MANIFEST.entries.length!==366||!hash(PLACE_MANIFEST.fingerprint)||POPULATION_INDEX.version!==1||POPULATION_INDEX.records.length!==361||POPULATION_INDEX.workbookSha256!==artifact('artifact.ons.myeb-local-authorities-mid-2024-v1').sha256)throw Error('Invalid compiled UK Geography content.');
 const normalizedByCode=new Map(NORMALIZED.records.map(item=>[item.officialCode,item]));if(POPULATION_INDEX.records.some(item=>normalizedByCode.get(item.officialCode)?.displayName!==item.displayName||item.countryCode!==item.officialCode[0]))throw Error('UK Geography/population workbook identity mismatch.');
 if(PLACE_IDENTITIES.places.some((item,index)=>item.countryId!=='uk'||fingerprintPlaceIdentity(item)!==PLACE_MANIFEST.entries[index]?.fingerprint||item.placeId!==PLACE_MANIFEST.entries[index]?.placeId)||PLACE_MANIFEST.fingerprint!==fnv1a64({version:1,entries:PLACE_MANIFEST.entries}))throw Error('UK Geography Place manifest mismatch.');
 if(!validateGeographyPartitionPackage(PARTITION)||PACKAGE_MANIFEST[UK_PRIMARY_LOCAL_ADMIN_PARTITION_ID]!==PARTITION.fingerprint||fingerprintGeographyPartition(PARTITION)!==PARTITION.fingerprint||BUILD_REPORT.partitionFingerprint!==PARTITION.fingerprint||BUILD_REPORT.continuityLedgerFingerprint!==CONTINUITY.fingerprint||BUILD_REPORT.placeManifestFingerprint!==PLACE_MANIFEST.fingerprint)throw Error('UK Geography partition manifest mismatch.');
}
export function createUkPrimaryLocalAdminPartition():GeographyPartitionPackageV1{validateProductionInputs();return immutable(PARTITION);}
export function createUkGeographyRegistry():GeographyRegistryV1{validateProductionInputs();const registry=createGeographyRegistry(PLACE_IDENTITIES.places,[PARTITION],[{partitionId:PARTITION.partitionId,fingerprint:PARTITION.fingerprint}],PLACE_MANIFEST.entries);if(!validateGeographyRegistry(registry))throw Error('UK Geography registry failed validation.');return registry;}
export function ukGeographyBuildReport():UkGeographyBuildReport{validateProductionInputs();return immutable(BUILD_REPORT);}
export const UK_GEOGRAPHY_SOURCE_MANIFEST=immutable(SOURCE_MANIFEST);
export const UK_GEOGRAPHY_CONTINUITY_LEDGER=immutable(CONTINUITY);
export const UK_GEOGRAPHY_PACKAGE_MANIFEST=immutable(PACKAGE_MANIFEST);
export const UK_GEOGRAPHY_PLACE_MANIFEST=immutable(PLACE_MANIFEST);

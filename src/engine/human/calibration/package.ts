import {compareDates,isSimulationDate,isSimulationYear} from '../../core/clock';
import type {SimulationDate} from '../../core/model';
import {isJsonValue} from '../../core/json';
import {parseExactDecimal} from './arithmetic';
import type {CalibrationGap,DerivedPopulationTotalV1,EvidenceClassification,GenerationProfileBinding,PopulationCalibrationPackageV1,PopulationMeasureV1,PopulationSourceDescriptorV1,PopulationUniverseDescriptor} from './types';

const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const stableIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=160&&value.includes('.')&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
const versionedPackageIdentifier=(value:unknown):value is string=>stableIdentifier(value)&&/(?:^|[._-])v[1-9]\d*$/.test(value);
const contextIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=100&&/^[a-z][a-z0-9-]*$/.test(value);
const text=(value:unknown,max=1000):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const object=(value:unknown):value is Record<string,unknown>=>{try{return !!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);}catch{return false;}};
const fields=(value:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>{try{const allowed=new Set([...required,...optional]),keys=Reflect.ownKeys(value);return required.every(key=>keys.includes(key))&&keys.every(key=>typeof key==='string'&&allowed.has(key)&&!!Object.getOwnPropertyDescriptor(value,key)?.enumerable&&'value' in Object.getOwnPropertyDescriptor(value,key)!);}catch{return false;}};
const dense=(value:unknown):value is readonly unknown[]=>{try{if(!Array.isArray(value)||Object.keys(value).length!==value.length||Reflect.ownKeys(value).length!==value.length+1)return false;for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,index);if(!descriptor?.enumerable||!('value' in descriptor))return false;}return true;}catch{return false;}};
const date=(value:unknown):value is SimulationDate=>object(value)&&fields(value,['year','month','day'])&&isSimulationDate(value);
const unique=(values:readonly string[])=>new Set(values).size===values.length;
const safeYear=(value:unknown):value is number=>isSimulationYear(value);
const classification=(value:unknown):value is EvidenceClassification=>value==='observed'||value==='estimated'||value==='assumed'||value==='projected';
const packageFields=['schemaVersion','methodologyId','id','fingerprint','countryId','effectiveDate','coverageIntent','partition','universes','sources','measures','derivedTotals','authority','distributionMeasureIds','reconciliation','ageConversion','generationProfileBindings','gaps'] as const;
const boundedPackageArrays=(value:Record<string,unknown>)=>{try{const limits:Readonly<Record<string,number>>={universes:100,sources:1000,measures:10000,derivedTotals:1000,distributionMeasureIds:10000,generationProfileBindings:10000,gaps:1000};return Object.entries(limits).every(([key,limit])=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);return !!descriptor&&'value' in descriptor&&Array.isArray(descriptor.value)&&descriptor.value.length<=limit;});}catch{return false;}};

function validSource(value:unknown):value is PopulationSourceDescriptorV1{
 if(!object(value)||!fields(value,['version','id','organisation','datasetId','releaseId','title','referencePeriod','jurisdiction','publicationStatus','methodologyNote'],['bundledArtifact','externalLocator','retrievedAt'])||value.version!==1||!stableIdentifier(value.id)||!text(value.organisation,200)||!text(value.datasetId,200)||!text(value.releaseId,200)||!text(value.title,300)||!contextIdentifier(value.jurisdiction)||!text(value.methodologyNote,2000))return false;
 if(value.publicationStatus!=='final'&&value.publicationStatus!=='provisional'&&value.publicationStatus!=='revised'&&value.publicationStatus!=='experimental')return false;
 if(!object(value.referencePeriod)||!fields(value.referencePeriod,['from','through'])||!date(value.referencePeriod.from)||!date(value.referencePeriod.through)||compareDates(value.referencePeriod.from,value.referencePeriod.through)>0)return false;
 return (value.bundledArtifact===undefined||text(value.bundledArtifact,500))&&(value.externalLocator===undefined||text(value.externalLocator,1000))&&(value.retrievedAt===undefined||date(value.retrievedAt));
}
function validUniverse(value:unknown):value is PopulationUniverseDescriptor{return object(value)&&fields(value,['id','description','exhaustive'])&&stableIdentifier(value.id)&&text(value.description,500)&&typeof value.exhaustive==='boolean';}
function validDimensions(value:unknown):boolean{
 if(!object(value)||typeof value.kind!=='string')return false;
 if(value.kind==='total')return fields(value,['kind']);
 if(value.kind==='birth-year')return fields(value,['kind','birthYear'],['areaId'])&&safeYear(value.birthYear)&&(value.areaId===undefined||value.areaId===null||stableIdentifier(value.areaId));
 return value.kind==='completed-age-band'&&fields(value,['kind','minimumAge','maximumAge'],['areaId'])&&typeof value.minimumAge==='number'&&Number.isSafeInteger(value.minimumAge)&&value.minimumAge>=0&&value.minimumAge<=150&&(value.maximumAge===null||typeof value.maximumAge==='number'&&Number.isSafeInteger(value.maximumAge)&&value.maximumAge>=value.minimumAge&&value.maximumAge<=150)&&(value.areaId===undefined||value.areaId===null||stableIdentifier(value.areaId));
}
function validMeasure(value:unknown):value is PopulationMeasureV1{
 if(!object(value)||!fields(value,['version','id','sourceId','series','semantic','unit','referenceDate','universeId','classification','dimensions','value'],['uncertainty','roundingNote'])||value.version!==1||!stableIdentifier(value.id)||!stableIdentifier(value.sourceId)||!text(value.series,300)||!date(value.referenceDate)||!stableIdentifier(value.universeId)||!classification(value.classification)||!validDimensions(value.dimensions)||typeof value.value!=='string')return false;
 if(value.semantic!=='population-count'&&value.semantic!=='population-share'||value.unit!=='persons'&&value.unit!=='thousand-persons'&&value.unit!=='percent')return false;
 if(value.semantic==='population-count'&&value.unit==='percent'||value.semantic==='population-share'&&value.unit!=='percent')return false;
 try{parseExactDecimal(value.value);}catch{return false;}
 return (value.uncertainty===undefined||text(value.uncertainty,1000))&&(value.roundingNote===undefined||text(value.roundingNote,1000));
}
function validDerived(value:unknown):value is DerivedPopulationTotalV1{return object(value)&&fields(value,['id','operation','inputIds','universeId'])&&stableIdentifier(value.id)&&value.operation==='sum'&&dense(value.inputIds)&&value.inputIds.length>0&&value.inputIds.every(stableIdentifier)&&unique(value.inputIds)&&stableIdentifier(value.universeId);}
function validBinding(value:unknown):value is GenerationProfileBinding{return object(value)&&fields(value,['fromBirthYear','throughBirthYear','generationProfileId'])&&safeYear(value.fromBirthYear)&&safeYear(value.throughBirthYear)&&value.throughBirthYear>=value.fromBirthYear&&stableIdentifier(value.generationProfileId);}
function validGap(value:unknown):value is CalibrationGap{return object(value)&&fields(value,['id','description','blocking'])&&stableIdentifier(value.id)&&text(value.description,1000)&&typeof value.blocking==='boolean';}

function structurallyValid(value:unknown):value is PopulationCalibrationPackageV1{
 try{
  if(!object(value)||!fields(value,packageFields)||!boundedPackageArrays(value)||!isJsonValue(value)||value.schemaVersion!==1||value.methodologyId!=='population-calibration.method-v1'||!versionedPackageIdentifier(value.id)||typeof value.fingerprint!=='string'||!/^fnv1a64-v1:[0-9a-f]{16}$/.test(value.fingerprint)||!contextIdentifier(value.countryId)||!date(value.effectiveDate)||(value.coverageIntent!=='partial'&&value.coverageIntent!=='complete'))return false;
  if(!object(value.partition)||!fields(value.partition,['areaPartitionId','birthYearFrom','birthYearThrough'])||(value.partition.areaPartitionId!==null&&!stableIdentifier(value.partition.areaPartitionId))||!safeYear(value.partition.birthYearFrom)||!safeYear(value.partition.birthYearThrough)||value.partition.birthYearThrough<value.partition.birthYearFrom||value.partition.birthYearThrough>value.effectiveDate.year)return false;
  if(!dense(value.universes)||value.universes.length===0||value.universes.length>100||!value.universes.every(validUniverse)||!unique((value.universes as unknown as PopulationUniverseDescriptor[]).map(item=>item.id)))return false;
  if(!dense(value.sources)||value.sources.length===0||value.sources.length>1000||!value.sources.every(validSource)||!unique((value.sources as unknown as PopulationSourceDescriptorV1[]).map(item=>item.id)))return false;
  if(!dense(value.measures)||value.measures.length===0||value.measures.length>10000||!value.measures.every(validMeasure)||!unique((value.measures as unknown as PopulationMeasureV1[]).map(item=>item.id)))return false;
  if(!dense(value.derivedTotals)||value.derivedTotals.length>1000||!value.derivedTotals.every(validDerived)||!unique((value.derivedTotals as unknown as DerivedPopulationTotalV1[]).map(item=>item.id)))return false;
  if(!object(value.authority)||!fields(value.authority,['kind','id'])||(value.authority.kind!=='measure'&&value.authority.kind!=='derived')||!stableIdentifier(value.authority.id)||!dense(value.distributionMeasureIds)||value.distributionMeasureIds.length===0||value.distributionMeasureIds.length>10000||!value.distributionMeasureIds.every(stableIdentifier)||!unique(value.distributionMeasureIds))return false;
  if(!object(value.reconciliation)||typeof value.reconciliation.kind!=='string')return false;
  if(value.reconciliation.kind==='exact'){if(!fields(value.reconciliation,['kind']))return false;}else if(value.reconciliation.kind==='proportional-largest-remainder'){if(!fields(value.reconciliation,['kind','maximumDiscrepancyBasisPoints'])||typeof value.reconciliation.maximumDiscrepancyBasisPoints!=='number'||!Number.isSafeInteger(value.reconciliation.maximumDiscrepancyBasisPoints)||value.reconciliation.maximumDiscrepancyBasisPoints<0||value.reconciliation.maximumDiscrepancyBasisPoints>10000)return false;}else return false;
  if(!object(value.ageConversion)||!fields(value.ageConversion,['kind'])||(value.ageConversion.kind!=='direct-birth-year'&&value.ageConversion.kind!=='uniform-birthday-by-day'))return false;
  return dense(value.generationProfileBindings)&&value.generationProfileBindings.length>0&&value.generationProfileBindings.length<=10000&&value.generationProfileBindings.every(validBinding)&&dense(value.gaps)&&value.gaps.length<=1000&&value.gaps.every(validGap)&&unique(value.gaps.map(item=>item.id));
 }catch{return false;}
}

const sortById=<T extends {id:string}>(items:readonly T[])=>[...items].sort((a,b)=>codePointCompare(a.id,b.id));
function semanticProjection(value:PopulationCalibrationPackageV1):unknown{
 return {...value,id:undefined,fingerprint:undefined,
  universes:sortById(value.universes),sources:sortById(value.sources),measures:sortById(value.measures),
  derivedTotals:sortById(value.derivedTotals).map(item=>({...item,inputIds:[...item.inputIds].sort(codePointCompare)})),
  distributionMeasureIds:[...value.distributionMeasureIds].sort(codePointCompare),generationProfileBindings:[...value.generationProfileBindings].sort((a,b)=>a.fromBirthYear-b.fromBirthYear||a.throughBirthYear-b.throughBirthYear||codePointCompare(a.generationProfileId,b.generationProfileId)),gaps:sortById(value.gaps)};
}
function canonicalStringify(value:unknown):string{
 if(value===null||typeof value==='boolean'||typeof value==='number'||typeof value==='string')return JSON.stringify(value);
 if(value===undefined)return '';
 if(Array.isArray(value))return `[${value.map(canonicalStringify).join(',')}]`;
 const entries=Object.entries(value as Record<string,unknown>).filter(([,item])=>item!==undefined).sort(([a],[b])=>codePointCompare(a,b));return `{${entries.map(([key,item])=>`${JSON.stringify(key)}:${canonicalStringify(item)}`).join(',')}}`;
}
function fnv1a64(textValue:string):string{let hash=0xcbf29ce484222325n;for(const byte of new TextEncoder().encode(textValue)){hash^=BigInt(byte);hash=BigInt.asUintN(64,hash*0x100000001b3n);}return hash.toString(16).padStart(16,'0');}

export function fingerprintPopulationCalibrationPackage(value:PopulationCalibrationPackageV1):string{
 try{if(!structurallyValid(value))throw Error();return `fnv1a64-v1:${fnv1a64(canonicalStringify(semanticProjection(value)))}`;}catch{throw Error('Cannot fingerprint an invalid calibration package.');}
}

export function validatePopulationCalibrationPackage(value:unknown,identityManifest?:Readonly<Record<string,string>>):value is PopulationCalibrationPackageV1{
 if(!structurallyValid(value))return false;const packageValue=value as PopulationCalibrationPackageV1;
 try{
  if(fingerprintPopulationCalibrationPackage(packageValue)!==packageValue.fingerprint)return false;
  if(identityManifest){if(!object(identityManifest))return false;const descriptor=Object.getOwnPropertyDescriptor(identityManifest,packageValue.id);if(!descriptor?.enumerable||!('value' in descriptor)||descriptor.value!==packageValue.fingerprint)return false;}
  const sourceIds=new Set(packageValue.sources.map(item=>item.id)),universeIds=new Set(packageValue.universes.map(item=>item.id)),measureIds=new Set(packageValue.measures.map(item=>item.id)),derivedIds=new Set(packageValue.derivedTotals.map(item=>item.id));
  const sourcesById=new Map(packageValue.sources.map(item=>[item.id,item]));
  if([...measureIds].some(id=>derivedIds.has(id))||packageValue.measures.some(item=>{const source=sourcesById.get(item.sourceId);return !source||!universeIds.has(item.universeId)||compareDates(item.referenceDate,source.referencePeriod.from)<0||compareDates(item.referenceDate,source.referencePeriod.through)>0;})||packageValue.derivedTotals.some(item=>!universeIds.has(item.universeId)||item.inputIds.some(id=>!measureIds.has(id)&&!derivedIds.has(id))))return false;
  const derivedById=new Map(packageValue.derivedTotals.map(item=>[item.id,item])),visited=new Set<string>(),active=new Set<string>();const visit=(id:string):boolean=>{if(active.has(id))return false;if(visited.has(id))return true;active.add(id);for(const input of derivedById.get(id)!.inputIds)if(derivedIds.has(input)&&!visit(input))return false;active.delete(id);visited.add(id);return true;};if([...derivedIds].some(id=>!visit(id)))return false;
  if(packageValue.authority.kind==='measure'&&!measureIds.has(packageValue.authority.id)||packageValue.authority.kind==='derived'&&!derivedIds.has(packageValue.authority.id)||packageValue.distributionMeasureIds.some(id=>!measureIds.has(id)))return false;
  return true;
 }catch{return false;}
}

export function validateCalibrationRegistry(packages:readonly PopulationCalibrationPackageV1[],manifest:Readonly<Record<string,string>>):boolean{
 try{if(!dense(packages)||!object(manifest)||!unique(packages.map(item=>item.id)))return false;const manifestKeys=Reflect.ownKeys(manifest);if(manifestKeys.length!==packages.length||manifestKeys.some(key=>typeof key!=='string'))return false;for(const key of manifestKeys){const descriptor=Object.getOwnPropertyDescriptor(manifest,key);if(!descriptor?.enumerable||!('value' in descriptor)||typeof descriptor.value!=='string'||!/^fnv1a64-v1:[0-9a-f]{16}$/.test(descriptor.value))return false;}return packages.every(item=>validatePopulationCalibrationPackage(item,manifest));}catch{return false;}
}

export function withCalibrationFingerprint(value:Omit<PopulationCalibrationPackageV1,'fingerprint'>):PopulationCalibrationPackageV1{
 try{if(!object(value))throw Error();const inputFields=packageFields.filter(key=>key!=='fingerprint');if(!fields(value,inputFields))throw Error();const root=Object.fromEntries(inputFields.map(key=>[key,Object.getOwnPropertyDescriptor(value,key)!.value])),candidate={...root,fingerprint:'fnv1a64-v1:0000000000000000'} as PopulationCalibrationPackageV1,fingerprinted={...candidate,fingerprint:fingerprintPopulationCalibrationPackage(candidate)},copy=structuredClone(fingerprinted) as PopulationCalibrationPackageV1;
 const freeze=(item:unknown):void=>{if(!item||typeof item!=='object'||Object.isFrozen(item))return;for(const key of Reflect.ownKeys(item)){const descriptor=Object.getOwnPropertyDescriptor(item,key);if(descriptor&&'value' in descriptor)freeze(descriptor.value);}Object.freeze(item);};freeze(copy);if(!validatePopulationCalibrationPackage(copy))throw Error();return copy;}catch{throw Error('Invalid calibration package.');}
}

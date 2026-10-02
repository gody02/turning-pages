import type {GameContentContext} from '../../engine/gameContent';
import type {GeographyRuntime} from '../../engine/geography/runtime';
import type {GeographyPartitionNodeV1,ResolvedGeographicPlace} from '../../engine/geography/types';
import type {SettlementRuntime} from '../../engine/geography/settlements/runtime';
import type {SettlementV1} from '../../engine/geography/settlements/types';
import {areaKey} from './indexMaterial';
import {denseArray,exactRecord} from './protocol';
import type {ExactReferenceContentSetV1,GroupTable,OffsetTable,PreparedReferenceData} from './types';

export function yieldReferenceHost():Promise<void>{
  return new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=()=>{channel.port1.close();channel.port2.close();resolve();};channel.port2.postMessage(null);});
}
/** Private receiver adapter for owned bundled-Worker delivery, NOT a replacement domain validator.
 * Frozen factories validate identity/fingerprints/continuity inside the Worker. This receiver
 * guards the channel/offset material and freezes its owned data; it never rehashes national content.
 */
export async function receiveOwnedReferenceContent(data:PreparedReferenceData,set:ExactReferenceContentSetV1,alive:()=>boolean,yieldHost=yieldReferenceHost):Promise<GameContentContext>{
  let budget=performance.now(),objects=0,ticks=0;
  const check=():Promise<void>|undefined=>{if(++ticks%128!==0)return;if(!alive())throw Error('Application reference-content preparation was cancelled.');if(performance.now()-budget>=8)return yieldHost().then(()=>{budget=performance.now();if(!alive())throw Error('Application reference-content preparation was cancelled.');});};
  if(!exactRecord(data,['geography','settlements','indexes']))throw Error('Malformed prepared reference content.');
  // Generous technical guard (not a Place count or hierarchy modelling limit): a private
  // message may contain at most five million objects, far beyond this package's ~50k.
  const stack:Array<[unknown,boolean]>=[[data,false]],seen=new Set<object>(),ancestors=new Set<object>();
  while(stack.length){
    {const pause=check();if(pause)await pause;}
    const [value,leaving]=stack.pop()!;if(leaving){ancestors.delete(value as object);seen.add(value as object);Object.freeze(value);continue;}if(value===null||typeof value==='string'||typeof value==='boolean')continue;
    if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Invalid reference payload number.');continue;}
    if(!value||typeof value!=='object')throw Error('Non-JSON reference payload.');
    if(ancestors.has(value))throw Error('Cyclic reference payload.');if(seen.has(value))continue;ancestors.add(value);if(++objects>5_000_000)throw Error('Reference payload resource limit exceeded.');
    const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
    if(prototype!==(array?Array.prototype:Object.prototype))throw Error('Invalid reference payload prototype.');
    const keys=Reflect.ownKeys(value);if(array&&keys.length!==(value as unknown[]).length+1)throw Error('Sparse reference payload.');
    stack.push([value,true]);for(const key of keys){if(array&&key==='length')continue;const descriptor=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!descriptor?.enumerable||!('value' in descriptor))throw Error('Invalid reference payload property.');stack.push([descriptor.value,false]);{const pause=check();if(pause)await pause;}}{const pause=check();if(pause)await pause;}
  }
  if(!exactRecord(data.geography,['version','places','placeManifest','partitions','manifest'])||data.geography.version!==1||!exactRecord(data.settlements,['version','identities','identityManifest','packages','packageManifest'])||data.settlements.version!==1||!exactRecord(data.indexes,['identities','geography','settlements'])||!denseArray(data.geography.partitions)||!denseArray(data.settlements.packages)||!denseArray(data.indexes.geography)||!denseArray(data.indexes.settlements))throw Error('Invalid reference registry envelope.');
  if(JSON.stringify(data.geography.manifest)!==JSON.stringify(set.geography)||JSON.stringify(data.settlements.packageManifest)!==JSON.stringify(set.settlements)||data.indexes.geography.length!==data.geography.partitions.length||data.indexes.settlements.length!==data.settlements.packages.length)throw Error('Exact reference manifest mismatch.');
  const offsets=async<T>(table:OffsetTable,values:readonly T[],id:(value:T)=>string)=>{
    if(!denseArray(table)||!denseArray(values)||table.length!==values.length)throw Error('Invalid reference offsets.');const result=new Map<string,T>();
    for(const entry of table){if(!denseArray(entry)||entry.length!==2||typeof entry[0]!=='string'||!Number.isSafeInteger(entry[1])||entry[1]<0||entry[1]>=values.length||id(values[entry[1]])!==entry[0]||result.has(entry[0]))throw Error('Invalid reference offset.');result.set(entry[0],values[entry[1]]);{const pause=check();if(pause)await pause;}}return result;
  };
  const groups=async<T>(table:GroupTable,values:readonly T[],key:(value:T)=>string,order:(value:T)=>string,eligible:(value:T)=>boolean=()=>true)=>{
    if(!denseArray(table))throw Error('Invalid grouped reference offsets.');const result=new Map<string,readonly T[]>();let count=0,expected=0;
    for(const value of values){if(eligible(value))expected++;{const pause=check();if(pause)await pause;}}
    for(const entry of table){if(!denseArray(entry)||entry.length!==2||typeof entry[0]!=='string'||!denseArray(entry[1])||!entry[1].length||result.has(entry[0]))throw Error('Invalid grouped reference offset.');const items:T[]=[],seenIndexes=new Set<number>();let previous:string|undefined,previousIndex=-1;for(const index of entry[1]){if(!Number.isSafeInteger(index)||index<0||index>=values.length||seenIndexes.has(index)||!eligible(values[index])||key(values[index])!==entry[0])throw Error('Invalid grouped reference target.');const current=order(values[index]);if(previous!==undefined&&(current<previous||current===previous&&index<previousIndex))throw Error('Invalid grouped reference ordering.');previous=current;previousIndex=index;seenIndexes.add(index);items.push(values[index]);count++;{const pause=check();if(pause)await pause;}}result.set(entry[0],Object.freeze(items));{const pause=check();if(pause)await pause;}}if(count!==expected)throw Error('Incomplete grouped reference offsets.');return result;
  };
  const identities=await offsets(data.indexes.identities,data.geography.places,item=>item.placeId),partitions=new Map(data.geography.partitions.map(item=>[item.partitionId,item])),nodes=new Map<string,Map<string,GeographyPartitionNodeV1>>(),children=new Map<string,Map<string,readonly GeographyPartitionNodeV1[]>>();
  for(const material of data.indexes.geography){if(!exactRecord(material,['partitionId','nodes','children'])||nodes.has(material.partitionId))throw Error('Invalid Geography index.');const pkg=partitions.get(material.partitionId);if(!pkg||pkg.fingerprint!==set.geography.find(item=>item.partitionId===pkg.partitionId)?.fingerprint)throw Error('Invalid Geography index identity.');nodes.set(pkg.partitionId,await offsets(material.nodes,pkg.nodes,item=>item.placeId));children.set(pkg.partitionId,await groups(material.children,pkg.nodes,item=>item.parentPlaceId??'',item=>item.placeId,item=>item.parentPlaceId!==null));}
  const node=(partitionId:string,placeId:string)=>nodes.get(partitionId)?.get(placeId);
  const requireNode=(partitionId:string,placeId:string)=>{const found=node(partitionId,placeId);if(!found)throw Error('Unknown Geography partition or Place.');return found;};
  const getAncestors=(partitionId:string,placeId:string)=>{let current=requireNode(partitionId,placeId);const result:GeographyPartitionNodeV1[]=[];while(current.parentPlaceId!==null){current=requireNode(partitionId,current.parentPlaceId);result.push(current);}return Object.freeze(result);};
  const geography:GeographyRuntime=Object.freeze({registry:data.geography,partition:(id:string)=>partitions.get(id),
    resolvePlace:(partitionId:string,placeId:string):ResolvedGeographicPlace|undefined=>{const found=node(partitionId,placeId),identity=identities.get(placeId);return found&&identity?Object.freeze({identity,partitionId,node:found}):undefined;},
    getParent:(partitionId:string,placeId:string)=>{const found=requireNode(partitionId,placeId);return found.parentPlaceId===null?null:requireNode(partitionId,found.parentPlaceId);},
    getChildren:(partitionId:string,placeId:string)=>{requireNode(partitionId,placeId);return Object.freeze([...(children.get(partitionId)?.get(placeId)??[])]);},getAncestors,
    isWithin:(partitionId:string,placeId:string,ancestorPlaceId:string)=>{requireNode(partitionId,ancestorPlaceId);return getAncestors(partitionId,placeId).some(item=>item.placeId===ancestorPlaceId);},
    isPopulationAllocationCell:(partitionId:string,placeId:string)=>node(partitionId,placeId)?.populationAllocationCell===true});
  const packages=new Map(data.settlements.packages.map(pkg=>[pkg.packageId,pkg])),settlementNodes=new Map<string,Map<string,SettlementV1>>(),relationMaps=new Map<string,Map<string,readonly typeof data.settlements.packages[number]['administrativeRelations'][number][]>>(),areaMaps=new Map<string,Map<string,readonly SettlementV1[]>>();
  for(const material of data.indexes.settlements){
    if(!exactRecord(material,['packageId','nodes','relations','areas'])||settlementNodes.has(material.packageId))throw Error('Invalid Settlement index.');const pkg=packages.get(material.packageId);if(!pkg||pkg.fingerprint!==set.settlements.find(item=>item.packageId===pkg.packageId)?.fingerprint)throw Error('Invalid Settlement index identity.');
    settlementNodes.set(pkg.packageId,await offsets(material.nodes,pkg.settlements,item=>item.settlementId));relationMaps.set(pkg.packageId,await groups(material.relations,pkg.administrativeRelations,item=>item.settlementId,item=>areaKey(item.partitionId,item.placeId)));
    // Area groups target settlements via relations; their sorting/deduplication was performed in Worker.
    const byArea=new Map<string,readonly SettlementV1[]>(),areaMembers=new Map<string,Set<string>>();if(!denseArray(material.areas))throw Error('Invalid area offsets.');
    for(const entry of material.areas){if(!denseArray(entry)||entry.length!==2||typeof entry[0]!=='string'||!denseArray(entry[1])||!entry[1].length||byArea.has(entry[0]))throw Error('Invalid area offset.');const items:SettlementV1[]=[],members=new Set<string>();let previous:string|undefined;for(const index of entry[1]){if(!Number.isSafeInteger(index)||index<0||index>=pkg.settlements.length||members.has(pkg.settlements[index].settlementId)||!relationMaps.get(pkg.packageId)?.get(pkg.settlements[index].settlementId)?.some(relation=>areaKey(relation.partitionId,relation.placeId)===entry[0]))throw Error('Invalid area target.');const id=pkg.settlements[index].settlementId;if(previous!==undefined&&id<previous)throw Error('Invalid area ordering.');previous=id;members.add(id);items.push(pkg.settlements[index]);{const pause=check();if(pause)await pause;}}areaMembers.set(entry[0],members);byArea.set(entry[0],Object.freeze(items));{const pause=check();if(pause)await pause;}}
    for(const relation of pkg.administrativeRelations){if(!areaMembers.get(areaKey(relation.partitionId,relation.placeId))?.has(relation.settlementId))throw Error('Incomplete area offsets.');{const pause=check();if(pause)await pause;}}areaMaps.set(pkg.packageId,byArea);
  }
  const requirePackage=(id:string)=>{const pkg=packages.get(id);if(!pkg)throw Error('Unknown Settlement package.');return pkg;};
  const settlements:SettlementRuntime=Object.freeze({registry:data.settlements,package:(id:string)=>packages.get(id),getSettlement:(packageId:string,id:string)=>settlementNodes.get(packageId)?.get(id),
    listSettlements:(packageId:string,countryId:string)=>{const pkg=requirePackage(packageId);return Object.freeze([...(pkg.countryId===countryId?pkg.settlements:[])]);},
    getSettlementAdministrativeRelations:(packageId:string,id:string)=>{requirePackage(packageId);if(!settlementNodes.get(packageId)?.has(id))throw Error('Unknown Settlement.');return Object.freeze([...(relationMaps.get(packageId)?.get(id)??[])]);},
    getSettlementsForAdministrativeArea:(packageId:string,partitionId:string,placeId:string)=>{requirePackage(packageId);if(!geography.resolvePlace(partitionId,placeId))throw Error('Unknown administrative Geography reference.');return Object.freeze([...(areaMaps.get(packageId)?.get(areaKey(partitionId,placeId))??[])]);}});
  {const pause=check();if(pause)await pause;}return Object.freeze({geography,settlements});
}
